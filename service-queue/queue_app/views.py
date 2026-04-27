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

class QueueEnterView(APIView):
    """
    POST /api/v1/queue/{event_id}/enter/
    Verifica si el usuario puede acceder a la selección de asientos o debe ir a la cola.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, event_id):
        user_id = str(request.user.id)
        event_id = str(event_id)

        try:
            config = QueueConfig.objects.get(event_id=event_id)
        except QueueConfig.DoesNotExist:
            # Si no hay config, se permite acceso libre
            register_user_activity(event_id, user_id)
            return Response({"queued": False, "message": "Acceso libre permitido"}, status=200)

        # Buscar si el usuario ya tiene una entrada en la cola
        try:
            entry = QueueEntry.objects.get(event_id=event_id, user_id=user_id)
            
            # Si ya fue admitido, verificar si expiró su tiempo total (selección + pago)
            if entry.status == 'admitted':
                if entry.accessed_at:
                    elapsed = (timezone.now() - entry.accessed_at).total_seconds() / 60.0
                    if elapsed > config.payment_timeout_minutes:
                        # Expiró su tiempo máximo!
                        entry.status = 'expired'
                        entry.save()
                        remove_user_activity(event_id, user_id)
                        return Response({
                            "error": "Tu tiempo máximo para seleccionar y comprar ha expirado. Debes volver a hacer la fila."
                        }, status=403)
                
                # Sigue válido
                register_user_activity(event_id, user_id)
                return Response({"queued": False, "message": "Sigues admitido"}, status=200)
            
            elif entry.status == 'waiting':
                # Sigue en espera
                # Refrescar posición
                position = QueueEntry.objects.filter(
                    event_id=event_id,
                    status='waiting',
                    joined_at__lt=entry.joined_at
                ).count() + 1
                entry.position = position
                entry.save()
                return Response({
                    "queued": True,
                    "position": position,
                    "queue_entry_id": str(entry.id),
                    "estimated_wait_minutes": position * 2  # simple ETA
                }, status=200)
            
            elif entry.status in ['expired', 'left']:
                # Eliminar y recrear para que reintente
                entry.delete()
                entry = QueueEntry(event_id=event_id, user_id=user_id)

        except QueueEntry.DoesNotExist:
            entry = QueueEntry(event_id=event_id, user_id=user_id)

        # Determinar si hay espacio
        active_count = get_active_users_count(event_id)
        if active_count < config.max_concurrent_users:
            # Hay espacio! Admitir
            entry.status = 'admitted'
            entry.accessed_at = timezone.now()
            entry.save()
            register_user_activity(event_id, user_id)
            
            return Response({"queued": False, "message": "Admitido automáticamente"}, status=200)
        else:
            # No hay espacio! Enviar a la cola
            entry.status = 'waiting'
            entry.joined_at = timezone.now()
            entry.save()
            
            position = QueueEntry.objects.filter(
                event_id=event_id,
                status='waiting',
                joined_at__lt=entry.joined_at
            ).count() + 1
            entry.position = position
            entry.save()
            
            # Activar bandera de la cola
            if not config.is_queue_active:
                config.is_queue_active = True
                config.save()
                
            return Response({
                "queued": True,
                "position": position,
                "queue_entry_id": str(entry.id),
                "estimated_wait_minutes": position * 2
            }, status=200)


class QueueStatusView(APIView):
    """
    GET /api/v1/queue/{event_id}/status/
    Retorna el estado de la cola para que el frontend decida qué mostrar.
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
