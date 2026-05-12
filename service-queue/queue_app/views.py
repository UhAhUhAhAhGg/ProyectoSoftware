"""
views.py — Endpoints de service-queue.

US14: Configuración de umbral de cola virtual por evento.
  GET  /api/v1/queue-config/{event_id}/   → obtener config actual
  POST /api/v1/queue-config/{event_id}/   → crear o actualizar config (solo Promotores)
"""

import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import QueueConfig
from .serializers import QueueConfigSerializer, QueueConfigWriteSerializer


def _get_event_capacity(event_id: str, token: str) -> int | None:
    """
    Consulta la capacidad del evento en service-events.
    Retorna la capacidad como entero, o None si no puede consultarla.
    """
    try:
        url = f"{settings.EVENTS_SERVICE_URL}/api/v1/events/{event_id}/"
        resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=5)
        if resp.status_code == 200:
            return resp.json().get('capacity')
    except requests.RequestException:
        pass
    return None


class QueueConfigView(APIView):
    """
    GET  /api/v1/queue-config/{event_id}/
        Retorna la configuración de cola para el evento.
        Si no existe, retorna la configuración por defecto (no persistida).

    POST /api/v1/queue-config/{event_id}/
        Crea o actualiza la configuración de cola para el evento.
        Solo permitido para usuarios con role='promoter' o 'admin'.

    Criterios de Aceptación (TIC-14):
        - PA: El promotor puede ver el umbral y timeout actual de su evento.
        - PA: El promotor puede guardar un umbral válido y se persiste correctamente.
        - PA: Si el umbral supera la capacidad del evento → error 400.
        - PA: Si el umbral es 0 o negativo → error 400.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id):
        try:
            config = QueueConfig.objects.get(event_id=event_id)
            serializer = QueueConfigSerializer(config)
            return Response(serializer.data, status=200)
        except QueueConfig.DoesNotExist:
            # Retornar configuración por defecto (no persistida aún)
            return Response({
                "event_id": str(event_id),
                "max_concurrent_users": 100,
                "payment_timeout_minutes": 15,
                "is_queue_active": False,
                "updated_by": None,
                "created_at": None,
                "updated_at": None,
                "info": "No existe configuración para este evento. Se muestran los valores por defecto."
            }, status=200)

    def post(self, request, event_id):
        # Solo promotores y admins pueden configurar la cola
        user = request.user
        if user.role not in ('promoter', 'admin'):
            return Response(
                {"error": "Solo los promotores pueden configurar la cola de espera."},
                status=403
            )

        serializer = QueueConfigWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        max_users = serializer.validated_data['max_concurrent_users']

        # Extraer el token del header para consultarle a service-events
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()

        # Validar que el umbral no supere la capacidad del evento
        capacity = _get_event_capacity(str(event_id), token)
        if capacity is not None and max_users > capacity:
            return Response(
                {"error": f"El umbral ({max_users}) no puede superar la capacidad del evento ({capacity})."},
                status=400
            )

        # Crear o actualizar la configuración (upsert)
        config, created = QueueConfig.objects.update_or_create(
            event_id=event_id,
            defaults={
                **serializer.validated_data,
                'updated_by': user.id,
            }
        )

        response_serializer = QueueConfigSerializer(config)
        return Response(
            {
                "message": "Configuración de cola guardada correctamente.",
                "data": response_serializer.data,
            },
            status=201 if created else 200
        )


class QueueHealthView(APIView):
    """
    GET /api/v1/health/
    Endpoint de salud del microservicio (no requiere autenticación).
    Útil para verificar que el servicio levantó correctamente en Docker.
    """
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        return Response({
            "service": "service-queue",
            "status": "healthy",
            "version": "1.0.0",
        }, status=200)

from django.utils import timezone
from .models import QueueEntry
from .active_users import get_active_users_count, register_user_activity, remove_user_activity


def _calculate_avg_transaction_time(event_id: str) -> float:
    """
    TIC-311: Calcula el tiempo promedio (en minutos) que tardan los últimos
    20 usuarios admitidos en completar su transacción para este evento.
    Si no hay historial suficiente, usa payment_timeout_minutes/2 como fallback.
    """
    try:
        config = QueueConfig.objects.get(event_id=event_id)
        default_minutes = config.payment_timeout_minutes / 2.0
    except QueueConfig.DoesNotExist:
        default_minutes = 7.5

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
            avg = sum(times) / len(times)
            return max(1.0, avg)

    return default_minutes


class QueueEnterView(APIView):
    """
    POST /api/v1/queue/{event_id}/enter/
    Verifica si el usuario puede acceder a la selección de asientos o debe ir a la cola.
    """

from django.utils import timezone
from .models import QueueEntry


def _calculate_avg_transaction_time(event_id: str) -> float:
    """
    TIC-311: Calcula el tiempo promedio (en minutos) que tardan los últimos
    20 usuarios admitidos en completar su transacción para este evento.
    Si no hay historial suficiente, usa payment_timeout_minutes/2 como fallback.
    """
    # Fallback desde la configuración del evento
    try:
        config = QueueConfig.objects.get(event_id=event_id)
        default_minutes = config.payment_timeout_minutes / 2.0  # ej. 7.5 min si timeout=15
    except QueueConfig.DoesNotExist:
        default_minutes = 7.5

    # Calcular promedio real con las últimas 20 admisiones completadas
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
            avg = sum(times) / len(times)
            return max(1.0, avg)  # Mínimo 1 minuto por usuario

    return default_minutes


class QueueStatusView(APIView):
    """
    GET /api/v1/queue/{event_id}/status/
    Retorna el estado actual de la cola para que el frontend decida qué mostrar.
    No requiere que el usuario esté en la cola — es informativo.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id):
        event_id = str(event_id)

        try:
            config = QueueConfig.objects.get(event_id=event_id)
        except QueueConfig.DoesNotExist:
            return Response({"is_queue_active": False, "users_waiting": 0}, status=200)

        users_waiting = QueueEntry.objects.filter(event_id=event_id, status='waiting').count()
        active_count = get_active_users_count(event_id)

        return Response({
            "is_queue_active": config.is_queue_active or active_count >= config.max_concurrent_users,
            "users_waiting": users_waiting,
            "users_admitted": active_count,
            "max_concurrent_users": config.max_concurrent_users
        }, status=200)


class QueuePositionView(APIView):
    """
    TIC-309: GET /api/v1/queue/{event_id}/position/
    Retorna la posición actual del usuario en la cola y el ETA calculado dinámicamente.
    Si el usuario no está en cola, retorna queued=False.
    Si fue admitido, lo indica para que el frontend lo redirija.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id):
        user_id = str(request.user.id)
        event_id_str = str(event_id)

        try:
            my_entry = QueueEntry.objects.get(
                user_id=user_id,
                event_id=event_id_str,
            )
        except QueueEntry.DoesNotExist:
            return Response({"queued": False, "message": "No estás en la cola."}, status=200)

        if my_entry.status == 'admitted':
            if my_entry.accessed_at:
                try:
                    config = QueueConfig.objects.get(event_id=event_id_str)
                    elapsed = (timezone.now() - my_entry.accessed_at).total_seconds() / 60.0
                    if elapsed > config.payment_timeout_minutes:
                        my_entry.status = 'expired'
                        my_entry.save()
                        return Response({
                            "queued": False,
                            "status": "expired",
                            "error": "Tu tiempo para comprar ha expirado."
                        }, status=200)
                except QueueConfig.DoesNotExist:
                    pass
            return Response({
                "queued": False,
                "status": "admitted",
                "message": "¡Eres el siguiente! Ya puedes seleccionar tus asientos.",
            }, status=200)

        if my_entry.status in ('expired', 'left'):
            return Response({
                "queued": False,
                "status": my_entry.status,
            }, status=200)

        position = QueueEntry.objects.filter(
            event_id=event_id_str,
            status='waiting',
            joined_at__lt=my_entry.joined_at,
        ).count() + 1

        avg_minutes = _calculate_avg_transaction_time(event_id_str)
        eta_minutes = round(position * avg_minutes)

        total_waiting = QueueEntry.objects.filter(
            event_id=event_id_str,
            status='waiting',
        ).count()

        return Response({
            "queued": True,
            "status": "waiting",
            "position": position,
            "total_waiting": total_waiting,
            "estimated_wait_minutes": eta_minutes,
            "joined_at": my_entry.joined_at.isoformat(),
        }, status=200)


class QueueLeaveView(APIView):
    """
    DELETE /api/v1/queue/{event_id}/leave/
    Permite al usuario salir voluntariamente de la cola.
    Marca su QueueEntry como 'left' y libera su cupo.
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
            return Response({"message": "Has salido de la cola exitosamente."}, status=200)
        except QueueEntry.DoesNotExist:
            return Response({"error": "No se encontró una entrada activa en la cola."}, status=404)
