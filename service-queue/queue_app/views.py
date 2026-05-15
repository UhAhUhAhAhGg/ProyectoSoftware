"""
views.py — service-queue

US14: Configuración de umbral y timeout por evento (QueueConfigView)
US18: Cola virtual automática (QueueEnterView)
US19: Posición y ETA en cola (QueuePositionView)
"""

import requests
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import QueueConfig, QueueEntry
from .serializers import QueueConfigSerializer, QueueConfigWriteSerializer
from .active_users import get_active_users_count, register_user_activity, remove_user_activity, clear_event_activity


# ─────────────────────────────────────────────────────────────────
# Helpers internos
# ─────────────────────────────────────────────────────────────────

def _get_event_capacity(event_id: str, token: str):
    """Consulta la capacidad total del evento en service-events."""
    try:
        url = f"{settings.EVENTS_SERVICE_URL}/api/v1/events/{event_id}/"
        resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=5)
        if resp.status_code == 200:
            return resp.json().get('capacity')
    except requests.RequestException:
        pass
    return None


def _sync_timeout_to_events(event_id: str, payment_timeout_minutes: int, token: str):
    """
    Sincroniza payment_timeout_minutes al Event de service-events usando el
    endpoint PATCH /api/v1/events/{event_id}/ con el campo payment_timeout_minutes.
    Falla silenciosamente: si service-events no está disponible la compra
    usará el valor que ya tenga el evento en su propia BD.
    """
    try:
        url = f"{settings.EVENTS_SERVICE_URL}/api/v1/events/{event_id}/"
        requests.patch(
            url,
            json={"payment_timeout_minutes": payment_timeout_minutes},
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=3,
        )
    except Exception:
        pass


def _get_payment_timeout(event_id_str: str) -> int:
    """Retorna el timeout de pago configurado para el evento. Fallback: 15 min."""
    try:
        return QueueConfig.objects.get(event_id=event_id_str).payment_timeout_minutes
    except QueueConfig.DoesNotExist:
        return 15


def _calculate_avg_transaction_time(event_id: str) -> float:
    """
    TIC-311: Promedio de minutos que tardaron los últimos 20 usuarios admitidos.
    Fallback: payment_timeout / 2 (mínimo 1 min).
    """
    default_minutes = max(1.0, _get_payment_timeout(event_id) / 2.0)

    admitted = QueueEntry.objects.filter(
        event_id=event_id,
        status='admitted',
        accessed_at__isnull=False,
        notified_at__isnull=False,
    ).order_by('-accessed_at')[:20]

    if admitted.exists():
        times = [
            (e.accessed_at - e.notified_at).total_seconds() / 60.0
            for e in admitted
            if e.accessed_at and e.notified_at and e.accessed_at > e.notified_at
        ]
        if times:
            return max(1.0, sum(times) / len(times))

    return default_minutes


def _count_admitted(event_id_str: str) -> int:
    """Cuenta usuarios admitidos vía QueueEntry (más confiable que active_sessions)."""
    return QueueEntry.objects.filter(
        event_id=event_id_str,
        status='admitted',
    ).count()


def _expire_stale_admitted(event_id_str: str):
    """
    Marca como 'expired' los QueueEntries 'admitted' cuyo tiempo
    de selección+pago ya venció (accessed_at + payment_timeout <= now).
    Libera el cupo Y admite automáticamente al siguiente en la cola.
    """
    try:
        config = QueueConfig.objects.get(event_id=event_id_str)
        timeout_minutes = config.payment_timeout_minutes
        max_users = config.max_concurrent_users
    except QueueConfig.DoesNotExist:
        return

    # __lte para evitar ventana off-by-one: si accessed_at == cutoff, ya venció
    cutoff = timezone.now() - timedelta(minutes=timeout_minutes)
    expired = list(QueueEntry.objects.filter(
        event_id=event_id_str,
        status='admitted',
        accessed_at__lte=cutoff,
    ))
    if not expired:
        return

    for entry in expired:
        entry.status = 'expired'
        entry.save()
        remove_user_activity(event_id_str, str(entry.user_id))

    # Admitir tantos usuarios de la cola como slots libres haya (basado en BD, no memoria)
    admitted_count = _count_admitted(event_id_str)
    slots_libres = max(0, max_users - admitted_count)
    for _ in range(slots_libres):
        _admit_next_from_queue(event_id_str)
        if _count_admitted(event_id_str) >= max_users:
            break


def _seconds_until_next_slot(event_id_str: str) -> int:
    """
    Segundos hasta que se libere el próximo slot:
    deadline del usuario admitido más antiguo - ahora.
    Si no hay admitidos, retorna 0.
    """
    try:
        config = QueueConfig.objects.get(event_id=event_id_str)
        timeout_minutes = config.payment_timeout_minutes
    except QueueConfig.DoesNotExist:
        timeout_minutes = 15

    oldest = QueueEntry.objects.filter(
        event_id=event_id_str,
        status='admitted',
        accessed_at__isnull=False,
    ).order_by('accessed_at').first()

    if not oldest or not oldest.accessed_at:
        return 0

    deadline = oldest.accessed_at + timedelta(minutes=timeout_minutes)
    delta = (deadline - timezone.now()).total_seconds()
    return max(0, int(delta))


def _admit_next_from_queue(event_id_str: str):
    """
    Admite al siguiente usuario en espera (el más antiguo con status='waiting').
    Lo marca como 'admitted', anota el timestamp y lo registra como activo.
    """
    next_entry = QueueEntry.objects.filter(
        event_id=event_id_str,
        status='waiting',
    ).order_by('joined_at').first()

    if next_entry:
        now = timezone.now()
        next_entry.status = 'admitted'
        next_entry.notified_at = now
        next_entry.accessed_at = now
        next_entry.save()
        register_user_activity(event_id_str, str(next_entry.user_id))


# ─────────────────────────────────────────────────────────────────
# Vistas
# ─────────────────────────────────────────────────────────────────

class QueueHealthView(APIView):
    """GET /api/v1/health/  — sin autenticación."""
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        return Response({"service": "service-queue", "status": "healthy", "version": "1.0.0"})


class QueueConfigView(APIView):
    """
    US14 — Configuración de umbral y timeout de cola por evento.
    GET  /api/v1/queue-config/{event_id}/
    POST /api/v1/queue-config/{event_id}/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id):
        try:
            config = QueueConfig.objects.get(event_id=event_id)
            return Response(QueueConfigSerializer(config).data)
        except QueueConfig.DoesNotExist:
            return Response({
                "event_id": str(event_id),
                "max_concurrent_users": 100,
                "payment_timeout_minutes": 15,
                "is_queue_active": False,
                "updated_by": None,
                "created_at": None,
                "updated_at": None,
                "info": "Configuración por defecto (no persistida aún).",
            })

    def post(self, request, event_id):
        user = request.user
        if user.role not in ('promoter', 'admin'):
            return Response({"error": "Solo los promotores pueden configurar la cola."}, status=403)

        serializer = QueueConfigWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        max_users = serializer.validated_data['max_concurrent_users']

        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()

        # TIC-349 / TIC-355: Umbral no puede superar capacidad del evento
        capacity = _get_event_capacity(str(event_id), token)
        if capacity is not None and max_users > capacity:
            return Response(
                {"error": f"El umbral ({max_users}) no puede superar la capacidad del evento ({capacity})."},
                status=400,
            )

        config, created = QueueConfig.objects.update_or_create(
            event_id=event_id,
            defaults={**serializer.validated_data, 'updated_by': user.id},
        )

        # Paso 2: Sincronizar payment_timeout_minutes → service-events
        # para que PurchaseView use el timeout correcto al calcular expires_at.
        payment_timeout = serializer.validated_data.get('payment_timeout_minutes', 15)
        _sync_timeout_to_events(str(event_id), payment_timeout, token)

        return Response(
            {"message": "Configuración guardada correctamente.", "data": QueueConfigSerializer(config).data},
            status=201 if created else 200,
        )


class QueueEnterView(APIView):
    """
    US18 — Verificar acceso a la selección de asientos o encolar al usuario.
    POST /api/v1/queue/{event_id}/enter/

    El frontend llama este endpoint cuando el comprador hace clic en
    'Seleccionar asientos'. La respuesta decide si puede continuar (queued=false)
    o debe esperar en la cola virtual (queued=true).

    Flujo de decisión:
      1. Si el usuario ya fue admitido y su tiempo no expiró → queued=false
      2. Si el usuario ya fue admitido y su tiempo expiró → 403, admite siguiente
      3. Si el usuario ya está en cola (waiting) → devuelve posición actualizada
      4. Si hay cupo disponible (active < max) → admite directamente, queued=false
      5. Si no hay cupo → encola, queued=true
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, event_id):
        user_id = str(request.user.id)
        event_id_str = str(event_id)

        # Limpiar admitidos expirados antes de cualquier cálculo
        _expire_stale_admitted(event_id_str)

        try:
            config = QueueConfig.objects.get(event_id=event_id_str)
            max_users = config.max_concurrent_users
            payment_timeout = config.payment_timeout_minutes
        except QueueConfig.DoesNotExist:
            # Sin configuración → sin restricción de cola
            max_users = 9999
            payment_timeout = 15

        # ── Caso 1 / 2: el usuario ya fue admitido anteriormente ──
        try:
            admitted_entry = QueueEntry.objects.get(
                user_id=user_id, event_id=event_id_str, status='admitted'
            )
            if admitted_entry.accessed_at:
                elapsed = (timezone.now() - admitted_entry.accessed_at).total_seconds() / 60.0
                if elapsed > payment_timeout:
                    # Tiempo expirado → liberar cupo y admitir siguiente
                    admitted_entry.status = 'expired'
                    admitted_entry.save()
                    remove_user_activity(event_id_str, user_id)
                    _admit_next_from_queue(event_id_str)
                    return Response(
                        {"error": "Tu tiempo para seleccionar asientos ha expirado."},
                        status=403,
                    )
            # Aún válido → refrescar heartbeat y dejar pasar
            register_user_activity(event_id_str, user_id)
            return Response({
                "queued": False,
                "status": "admitted",
                "accessed_at": admitted_entry.accessed_at.isoformat() if admitted_entry.accessed_at else None,
            }, status=200)
        except QueueEntry.DoesNotExist:
            pass

        # ── Caso 3: ya está esperando en cola ──
        try:
            waiting_entry = QueueEntry.objects.get(
                user_id=user_id, event_id=event_id_str, status='waiting'
            )
            # Si hay cupo (alguien salió/expiró), promover a admitido
            # Usar conteo basado en BD para evitar desincronización con active_sessions
            admitted_count = _count_admitted(event_id_str)
            if admitted_count < max_users:
                now = timezone.now()
                waiting_entry.status = 'admitted'
                waiting_entry.notified_at = now
                waiting_entry.accessed_at = now
                waiting_entry.save()
                register_user_activity(event_id_str, user_id)
                return Response({
                    "queued": False,
                    "status": "admitted",
                    "accessed_at": now.isoformat(),
                }, status=200)

            position = QueueEntry.objects.filter(
                event_id=event_id_str,
                status='waiting',
                joined_at__lt=waiting_entry.joined_at,
            ).count() + 1
            next_slot_seconds = _seconds_until_next_slot(event_id_str)
            avg_transaction_seconds = round(_calculate_avg_transaction_time(event_id_str) * 60)
            eta_seconds = next_slot_seconds + max(0, position - 1) * avg_transaction_seconds
            return Response({
                "queued": True,
                "position": position,
                "estimated_wait_seconds": eta_seconds,
                "estimated_wait_minutes": round(eta_seconds / 60),
                "next_slot_seconds": next_slot_seconds,
                "queue_entry_id": str(waiting_entry.id),
            }, status=200)
        except QueueEntry.DoesNotExist:
            pass

        # ── Caso 4 / 5: intento nuevo ──
        # Limpiar entradas anteriores terminadas del mismo usuario para este evento
        QueueEntry.objects.filter(
            user_id=user_id, event_id=event_id_str, status__in=['expired', 'left']
        ).delete()

        # Usar conteo basado en BD para evitar desincronización con active_sessions
        admitted_count = _count_admitted(event_id_str)

        if admitted_count < max_users:
            # Cupo libre → admitir directamente y registrar accessed_at
            now = timezone.now()
            entry, _ = QueueEntry.objects.update_or_create(
                user_id=user_id,
                event_id=event_id_str,
                defaults={
                    'status': 'admitted',
                    'notified_at': now,
                    'accessed_at': now,
                },
            )
            register_user_activity(event_id_str, user_id)
            return Response({
                "queued": False,
                "status": "admitted",
                "accessed_at": now.isoformat(),
            }, status=200)
        else:
            # Sin cupo → encolar (no se registra como activo todavía)
            entry, _ = QueueEntry.objects.get_or_create(
                user_id=user_id,
                event_id=event_id_str,
                defaults={'status': 'waiting'},
            )
            if entry.status != 'waiting':
                entry.status = 'waiting'
                entry.save()

            position = QueueEntry.objects.filter(
                event_id=event_id_str,
                status='waiting',
                joined_at__lt=entry.joined_at,
            ).count() + 1
            next_slot_seconds = _seconds_until_next_slot(event_id_str)
            avg_transaction_seconds = round(_calculate_avg_transaction_time(event_id_str) * 60)
            eta_seconds = next_slot_seconds + max(0, position - 1) * avg_transaction_seconds

            return Response({
                "queued": True,
                "position": position,
                "estimated_wait_seconds": eta_seconds,
                "estimated_wait_minutes": round(eta_seconds / 60),
                "next_slot_seconds": next_slot_seconds,
                "queue_entry_id": str(entry.id),
            }, status=200)


class QueueStatusView(APIView):
    """GET /api/v1/queue/{event_id}/status/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id):
        event_id_str = str(event_id)
        try:
            config = QueueConfig.objects.get(event_id=event_id_str)
        except QueueConfig.DoesNotExist:
            return Response({"is_queue_active": False, "users_waiting": 0})

        users_waiting = QueueEntry.objects.filter(event_id=event_id_str, status='waiting').count()
        admitted_count = _count_admitted(event_id_str)

        return Response({
            "is_queue_active": admitted_count >= config.max_concurrent_users,
            "users_waiting": users_waiting,
            "users_admitted": admitted_count,
            "max_concurrent_users": config.max_concurrent_users,
        })


class QueuePositionView(APIView):
    """
    US19 — TIC-309: Posición actual y ETA del usuario en cola.
    GET /api/v1/queue/{event_id}/position/

    Usado por ColaEspera.jsx (polling cada 5 s).
    Retorna queued=true mientras espera, queued=false cuando es admitido.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id):
        user_id = str(request.user.id)
        event_id_str = str(event_id)

        # Expirar admitidos vencidos antes de evaluar la posición
        _expire_stale_admitted(event_id_str)

        try:
            entry = QueueEntry.objects.get(user_id=user_id, event_id=event_id_str)
        except QueueEntry.DoesNotExist:
            return Response({"queued": False, "message": "No estás en la cola."})

        if entry.status == 'admitted':
            # Verificar si el tiempo de selección/pago expiró
            if entry.accessed_at:
                try:
                    config = QueueConfig.objects.get(event_id=event_id_str)
                    elapsed = (timezone.now() - entry.accessed_at).total_seconds() / 60.0
                    if elapsed > config.payment_timeout_minutes:
                        entry.status = 'expired'
                        entry.save()
                        remove_user_activity(event_id_str, user_id)
                        _admit_next_from_queue(event_id_str)
                        return Response({
                            "queued": False,
                            "status": "expired",
                            "error": "Tu tiempo para comprar ha expirado.",
                        })
                except QueueConfig.DoesNotExist:
                    pass
            return Response({
                "queued": False,
                "status": "admitted",
                "accessed_at": entry.accessed_at.isoformat() if entry.accessed_at else None,
                "message": "¡Es tu turno! Ya puedes seleccionar tus asientos.",
            })

        if entry.status in ('expired', 'left'):
            return Response({"queued": False, "status": entry.status})

        # Status == 'waiting': si hay cupo, admitir al usuario directamente
        try:
            config = QueueConfig.objects.get(event_id=event_id_str)
            max_users = config.max_concurrent_users
        except QueueConfig.DoesNotExist:
            max_users = 9999

        # Usar conteo basado en BD para evitar desincronización con active_sessions
        admitted_count = _count_admitted(event_id_str)
        # Solo admitir si el usuario es el primero en la cola (más antiguo)
        is_first = not QueueEntry.objects.filter(
            event_id=event_id_str,
            status='waiting',
            joined_at__lt=entry.joined_at,
        ).exists()

        if is_first and admitted_count < max_users:
            now = timezone.now()
            entry.status = 'admitted'
            entry.notified_at = now
            entry.accessed_at = now
            entry.save()
            register_user_activity(event_id_str, user_id)
            return Response({
                "queued": False,
                "status": "admitted",
                "accessed_at": now.isoformat(),
                "message": "¡Es tu turno! Ya puedes seleccionar tus asientos.",
            })

        # Sigue esperando: calcular posición y ETA exacto
        position = QueueEntry.objects.filter(
            event_id=event_id_str,
            status='waiting',
            joined_at__lt=entry.joined_at,
        ).count() + 1
        total_waiting = QueueEntry.objects.filter(event_id=event_id_str, status='waiting').count()
        next_slot_seconds = _seconds_until_next_slot(event_id_str)
        avg_transaction_seconds = round(_calculate_avg_transaction_time(event_id_str) * 60)
        eta_seconds = next_slot_seconds + max(0, position - 1) * avg_transaction_seconds

        return Response({
            "queued": True,
            "status": "waiting",
            "position": position,
            "total_waiting": total_waiting,
            "estimated_wait_seconds": eta_seconds,
            "estimated_wait_minutes": round(eta_seconds / 60),
            "next_slot_seconds": next_slot_seconds,
            "joined_at": entry.joined_at.isoformat(),
        })


class QueueLeaveView(APIView):
    """
    DELETE /api/v1/queue/{event_id}/leave/
    Salir voluntariamente de la cola o liberar el cupo de selección de asientos.
    Admite automáticamente al siguiente en la cola.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, event_id):
        user_id = str(request.user.id)
        event_id_str = str(event_id)

        try:
            entry = QueueEntry.objects.get(
                user_id=user_id,
                event_id=event_id_str,
                status__in=['waiting', 'admitted'],
            )
            entry.status = 'left'
            entry.save()
        except QueueEntry.DoesNotExist:
            pass  # Si no hay entrada, igual liberamos el cupo en memoria

        remove_user_activity(event_id_str, user_id)
        _admit_next_from_queue(event_id_str)
        return Response({"message": "Has salido de la cola. Tu cupo fue liberado."})


class InternalAccessTimeView(APIView):
    """
    GET /api/v1/internal/access-time/<event_id>/<user_id>/
    Endpoint INTERNO. service-events lo llama para saber cuándo el usuario
    fue admitido al evento (accessed_at) y así calcular el expires_at del
    Purchase tomando como punto de partida el momento de "Seleccionar Asientos".
    """
    permission_classes = []
    authentication_classes = []

    def get(self, request, event_id, user_id):
        try:
            entry = QueueEntry.objects.get(
                event_id=event_id, user_id=user_id, status='admitted'
            )
            return Response({
                "user_id": str(entry.user_id),
                "event_id": str(entry.event_id),
                "accessed_at": entry.accessed_at.isoformat() if entry.accessed_at else None,
            })
        except QueueEntry.DoesNotExist:
            return Response({"error": "no admitted entry"}, status=404)


class InternalQueueConfigSyncView(APIView):
    """
    POST /api/v1/internal/sync-queue-config/{event_id}/
    Endpoint INTERNO (sin autenticación JWT). Solo accesible dentro de la red Docker.
    service-events llama aquí cuando el promotor guarda la configuración de cola.
    Guarda max_concurrent_users y payment_timeout_minutes directamente, sin llamar
    de vuelta a service-events (evita deadlock circular).

    Body: { "max_concurrent_users": N, "payment_timeout_minutes": M }
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request, event_id):
        try:
            max_concurrent = int(request.data.get('max_concurrent_users', 0))
            payment_timeout = int(request.data.get('payment_timeout_minutes', 0))
        except (TypeError, ValueError):
            return Response({"error": "Valores numéricos inválidos."}, status=400)

        if max_concurrent <= 0 or payment_timeout <= 0:
            return Response({"error": "Se requieren max_concurrent_users y payment_timeout_minutes mayores a 0."}, status=400)

        QueueConfig.objects.update_or_create(
            event_id=event_id,
            defaults={
                'max_concurrent_users': max_concurrent,
                'payment_timeout_minutes': payment_timeout,
            },
        )
        # Limpiar usuarios activos fantasma del evento para que el nuevo umbral
        # sea efectivo de inmediato (sin esperar el timeout de 2 min)
        clear_event_activity(str(event_id))
        return Response({"ok": True, "max_concurrent_users": max_concurrent, "payment_timeout_minutes": payment_timeout})


class ReleaseUserView(APIView):
    """
    POST /api/v1/internal/release-user/
    Endpoint INTERNO (sin autenticación JWT). Solo accesible dentro de la red Docker.
    service-events llama aquí cuando una compra se completa, cancela o expira.

    Body: { "event_id": "<uuid>", "user_id": "<uuid>" }

    Efecto:
      1. Marca el QueueEntry del usuario como 'left' (si estaba admitted)
      2. Elimina al usuario de active_users
      3. Admite automáticamente al siguiente en la cola
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        event_id = str(request.data.get('event_id', ''))
        user_id = str(request.data.get('user_id', ''))

        if not event_id or not user_id:
            return Response({"error": "Se requieren event_id y user_id."}, status=400)

        QueueEntry.objects.filter(
            user_id=user_id,
            event_id=event_id,
            status='admitted',
        ).update(status='left')

        remove_user_activity(event_id, user_id)
        _admit_next_from_queue(event_id)

        return Response({"ok": True})
