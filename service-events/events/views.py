# pyright: reportAttributeAccessIssue=false
# pyright: reportOptionalMemberAccess=false
# pyright: reportArgumentType=false
# pyright: reportUndefinedVariable=false
from rest_framework import viewsets, status
from django.db import transaction
from rest_framework.decorators import action
from django.db import transaction
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import transaction, IntegrityError
from django.utils import timezone
import qrcode
import io
import base64
import io
import math
import qrcode
import secrets
import uuid
from io import BytesIO

import requests as http_requests
from datetime import timedelta
from django.conf import settings as django_settings
from django.db import transaction, IntegrityError
from django.db.models import Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, pagination, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from rest_framework.generics import ListAPIView
from .models import Event, EventAuditLog
from .serializers import EventSerializer
from .permissions import IsAdministrador, IsPromotor, IsComprador, IsAdminWithAudit, HasAdminCapability, IsSuperadmin
from .services import TicketGenerationService, send_ticket_email, CommissionService
from .models import (
    Category, Event, TicketType, Purchase, Waitlist, BlacklistedToken, Seat,
    UserBehavior, UserPreference, UserFavorite, Notification, NotificationPreference,
    RecommendationEngine, registrar_comportamiento, generar_notificaciones_match,
    PlatformCommission, PromoCode,
)
from .serializers import (
    CategorySerializer,
    EventSerializer,
    EventCreateSerializer,
    EventUpdateSerializer,
    TicketTypeSerializer,
    TicketTypeCreateSerializer,
    QueueConfigSerializer,
    PromoCodeReadSerializer,
    PromoCodeCreateSerializer,
    PromoCodeStatsSerializer,
    ValidateCodeSerializer,
)


def _notify_queue_release(event_id: str, user_id: str):
    """Notifica a service-queue que un usuario liberâ”œâ”‚ su cupo (compra completa/cancelada/expirada)."""
    try:
        url = f"{django_settings.QUEUE_SERVICE_URL}/api/v1/internal/release-user/"
        http_requests.post(url, json={"event_id": event_id, "user_id": user_id}, timeout=3)
    except Exception:
        pass


def _get_queue_access_time(event_id: str, user_id: str):
    """
    Consulta service-queue para obtener cuâ”œÃ­ndo el usuario fue admitido al evento.
    Retorna un datetime o None. Permite que el timer del Purchase empiece desde
    'Seleccionar Asientos' y no desde la generaciâ”œâ”‚n del QR.
    """
    try:
        from django.utils.dateparse import parse_datetime
        url = f"{django_settings.QUEUE_SERVICE_URL}/api/v1/internal/access-time/{event_id}/{user_id}/"
        resp = http_requests.get(url, timeout=3)
        if resp.status_code == 200:
            data = resp.json()
            accessed_at_str = data.get('accessed_at')
            if accessed_at_str:
                return parse_datetime(accessed_at_str)
    except Exception:
        pass
    return None


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer

    def get_permissions(self):
        action = getattr(self, 'action', None)
        if action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdministrador()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Obtener solo categorias activas"""
        categories = Category.objects.filter(is_active=True)
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)


class EventViewSet(viewsets.ModelViewSet):

    def get_queryset(self):
        from django.utils import timezone as _tz
        # Auto-marcar como 'completed' eventos cuya fecha ya paso (lazy, una vez por request).
        # Esto cubre el caso en que no hay un cron corriendo: cualquier lista refresca el estado.
        try:
            hoy = _tz.localdate()
            Event.objects.filter(status='published', event_date__lt=hoy).update(status='completed')
        except Exception:
            pass  # nunca rompemos el endpoint por esto

        queryset = Event.objects.all().select_related('category').prefetch_related('ticket_types')

        if self.action == 'list':
            queryset = queryset.exclude(admin_status='dado_de_baja')

            incluir_bajas = self.request.query_params.get('incluir_bajas', 'false')
            es_admin = (
                self.request.user.is_authenticated and
                (
                    getattr(self.request.user, 'is_staff', False) or
                    (
                        getattr(self.request.user, 'role', None) and
                        getattr(self.request.user.role, 'name', '').lower() in ['administrador', 'admin', 'superadmin']
                    )
                )
            )

            if incluir_bajas.lower() == 'true' and es_admin:
                queryset = Event.objects.all().select_related('category').prefetch_related('ticket_types')
            else:
                queryset = queryset.filter(status='published')
                # El comprador no ve eventos cuya fecha ya paso.
                # Los admins ven todo (la tabla admin muestra estados, finalizados incluidos).
                if not es_admin:
                    queryset = queryset.filter(event_date__gte=_tz.localdate())

        status_param = self.request.query_params.get('status', None)
        if status_param:
            queryset = queryset.filter(status=status_param)

        category_param = self.request.query_params.get('category', None)
        if category_param:
            queryset = queryset.filter(category__name__icontains=category_param)

        location_param = self.request.query_params.get('location', None)
        if location_param:
            queryset = queryset.filter(location__icontains=location_param)

        return queryset

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'category', 'event_date']
    search_fields = ['name', 'location', 'description']
    ordering_fields = ['event_date', 'created_at', 'name']
    ordering = ['-event_date']

    def get_permissions(self):
        action = getattr(self, 'action', None)
        if action in ['create', 'update', 'partial_update', 'destroy', 'cancel']:
            return [IsAuthenticated(), IsPromotor()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return EventCreateSerializer
        elif self.action in ['partial_update', 'update']:
            return EventUpdateSerializer
        return EventSerializer

    def retrieve(self, request, *args, **kwargs):
        """GET /events/{id}/ Ã”Ã‡Ã¶ registra la visualizaciâ”œâ”‚n como comportamiento"""
        instance = self.get_object()

        # Registrar automâ”œÃ­ticamente la interacciâ”œâ”‚n 'view'
        registrar_comportamiento(
            user_id=request.user.id,
            event=instance,
            action_type='view'
        )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        """GET /events/{id}/ Ã”Ã‡Ã¶ registra la visualizaciâ”œâ”‚n como comportamiento"""
        instance = self.get_object()

        # Registrar automâ”œÃ­ticamente la interacciâ”œâ”‚n 'view'
        registrar_comportamiento(
            user_id=request.user.id,
            event=instance,
            action_type='view'
        )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        """Editar un evento validando permisos y estado (PUT/PATCH)"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        if str(instance.promoter_id) != str(request.user.id):
            return Response({
                "status": "error",
                "message": "No tienes permisos. Solo el promotor que creo el evento puede editarlo."
            }, status=status.HTTP_403_FORBIDDEN)

        if instance.status in ['cancelled', 'completed']:
            return Response({
                "status": "error",
                "message": f"Accion denegada. No se puede editar un evento que ya esta '{instance.status}'."
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        if serializer.is_valid():
            self.perform_update(serializer)
            return Response({
                "status": "success",
                "message": "Evento actualizado correctamente.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        return Response({
            "status": "error",
            "message": "Error al validar los datos enviados.",
            "details": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """Eliminacion logica de un evento (Soft Delete para proteger compras)"""
        instance = self.get_object()

        if str(instance.promoter_id) != str(request.user.id):
            return Response({
                "status": "error",
                "message": "No tienes permisos. Solo el promotor que creo el evento puede eliminarlo."
            }, status=status.HTTP_403_FORBIDDEN)

        if instance.status in ['cancelled', 'completed']:
            return Response({
                "status": "error",
                "message": f"El evento ya se encuentra en estado '{instance.status}'."
            }, status=status.HTTP_400_BAD_REQUEST)

        instance.status = 'cancelled'
        instance.save()

        tickets = instance.tickettype_set.all()
        for ticket in tickets:
            ticket.status = 'inactive'
            ticket.save()

        return Response({
            "status": "success",
            "message": "El evento ha sido eliminado logicamente. El historial de compras previas se mantiene intacto."
        }, status=status.HTTP_200_OK)
    @action(detail=False, methods=['get'], url_path='estado_orden/(?P<order_id>[^/.]+)', permission_classes=[IsAuthenticated])
    def estado_orden(self, request, order_id=None):
        try:
            orden = PaymentOrder.objects.get(id=order_id, buyer_id=request.user.id)
            return Response({"status": orden.status}, status=status.HTTP_200_OK)
        except PaymentOrder.DoesNotExist:
            return Response({"error": "Orden no encontrada"}, status=status.HTTP_404_NOT_FOUND)
        
    @action(detail=True, methods=['get'], url_path='queue-status')
    def queue_status(self, request, pk=None):
        """
        HU: Asignar lugar y mostrar tiempo estimado de espera.
        GET /events/{id}/queue-status/
        Calcula la posiciâ”œâ”‚n en tiempo real y el promedio dinâ”œÃ­mico de espera (max 15 min).
        """
        event = self.get_object()
        user_id = request.user.id

        # 1. Verificar si el usuario realmente estâ”œÃ­ en la fila
        waitlist_entry = Waitlist.objects.filter(event=event, user_id=user_id).first()
        
        if not waitlist_entry:
            return Response({
                "status": "error",
                "message": "No te encuentras en la fila virtual para este evento."
            }, status=status.HTTP_404_NOT_FOUND)

        if waitlist_entry.status != 'waiting':
            return Response({
                "status": "success",
                "message": f"Tu estado en la fila es: {waitlist_entry.status}. Ya puedes proceder a comprar.",
                "data": {"queue_status": waitlist_entry.status}
            }, status=status.HTTP_200_OK)

        # 2. Calcular cuâ”œÃ­ntas personas estâ”œÃ­n estrictamente delante de este usuario
        people_ahead = Waitlist.objects.filter(
            event=event,
            status='waiting',
            position__lt=waitlist_entry.position
        ).count()
        # Tomamos una muestra de las â”œâ•‘ltimas 20 compras confirmadas del evento
        recent_purchases = list(Purchase.objects.filter(
            event=event, 
            status='active'
        ).order_by('-created_at')[:20])

        average_time_minutes = 5.0  # Tiempo por defecto si no hay data histâ”œâ”‚rica suficiente

        if len(recent_purchases) >= 2:
            # Diferencia de tiempo entre la compra mâ”œÃ­s reciente y la mâ”œÃ­s antigua de la muestra
            newest_purchase = recent_purchases[0].created_at
            oldest_purchase = recent_purchases[-1].created_at
            
            time_diff_seconds = (newest_purchase - oldest_purchase).total_seconds()
            
            if time_diff_seconds > 0:
                # Calculamos cuâ”œÃ­nto toma en promedio despachar 1 compra (en minutos)
                calc_average = (time_diff_seconds / 60.0) / len(recent_purchases)
                
                # Regla de Negocio: Mâ”œÂ¡nimo 1 minuto, Mâ”œÃ­ximo 15 minutos (por expiraciâ”œâ”‚n del QR)
                average_time_minutes = min(max(calc_average, 1.0), 15.0)

        estimated_wait_time = int(people_ahead * average_time_minutes)

        return Response({
            "status": "success",
            "data": {
                "event_id": str(event.id),
                "queue_status": waitlist_entry.status,
                "your_position": waitlist_entry.position,
                "people_ahead": people_ahead,
                "dynamic_average_per_purchase": round(average_time_minutes, 2),
                "estimated_wait_time_minutes": estimated_wait_time
            }
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Obtener eventos proximos (no pasados)"""
        from django.utils import timezone
        upcoming = Event.objects.filter(event_date__gte=timezone.now().date())
        serializer = EventSerializer(upcoming, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_promoter(self, request):
        """Obtener eventos de un promotor"""
        promoter_id = request.query_params.get('promoter_id')
        if not promoter_id:
            return Response(
                {'error': 'promoter_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        events = Event.objects.filter(promoter_id=promoter_id)
        serializer = EventSerializer(events, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def tickets(self, request, pk=None):
        """Obtener tickets de un evento"""
        event = self.get_object()
        tickets = TicketType.objects.filter(event=event)
        serializer = TicketTypeSerializer(tickets, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publicar un evento"""
        event = self.get_object()
        event.status = 'published'
        event.save()
        
        # NUEVO Ã”Ã‡Ã¶ disparar notificaciones de match en < 5 minutos
        generar_notificaciones_match(event)
        
        
        # NUEVO Ã”Ã‡Ã¶ disparar notificaciones de match en < 5 minutos
        generar_notificaciones_match(event)
        
        return Response({'success': 'Event published'})
    
    @action(detail=True, methods=['get', 'put'], url_path='queue-config')
    def queue_config(self, request, pk=None):
        """
        HU: Configurar umbral de usuarios simultâ”œÃ­neos.
        GET: Obtener la configuraciâ”œâ”‚n actual.
        PUT: Actualizar la configuraciâ”œâ”‚n con validaciones estrictas.
        """
        event = self.get_object()

        # 1. Seguridad base para ambos mâ”œÂ®todos
        if str(event.promoter_id) != str(request.user.id):
            return Response({
                "status": "error",
                "message": "No tienes permisos. Solo el promotor de este evento puede gestionar la fila virtual."
            }, status=status.HTTP_403_FORBIDDEN)

        # 2. Manejo de la peticiâ”œâ”‚n GET (Lo que hicimos en la subtarea anterior)
        if request.method == 'GET':
            return Response({
                "status": "success",
                "data": {
                    "event_id": str(event.id),
                    "waitlist_threshold": event.waitlist_threshold,
                    "waitlist_active": event.waitlist_active,
                    "queue_timeout": event.queue_timeout,
                    "event_capacity": event.capacity # â”œÃœtil para que el Frontend valide tambiâ”œÂ®n
                }
            }, status=status.HTTP_200_OK)

        # 3. Manejo de la peticiâ”œâ”‚n PUT (La nueva subtarea de validaciâ”œâ”‚n)
        elif request.method == 'PUT':
            threshold_input = request.data.get('waitlist_threshold')
            is_active_input = request.data.get('waitlist_active', event.waitlist_active)
            timeout_input = request.data.get('queue_timeout', event.queue_timeout)

            # Validaciâ”œâ”‚n A: Que el dato exista
            if threshold_input is None:
                return Response({
                    "status": "error",
                    "message": "El campo 'waitlist_threshold' es obligatorio."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validaciâ”œâ”‚n B: Que sea un nâ”œâ•‘mero entero
            try:
                threshold = int(threshold_input)
            except ValueError:
                return Response({
                    "status": "error",
                    "message": "El umbral debe ser un nâ”œâ•‘mero entero vâ”œÃ­lido."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validaciâ”œâ”‚n C: Entero positivo (> 0)
            if threshold <= 0:
                return Response({
                    "status": "error",
                    "message": "El umbral debe ser un nâ”œâ•‘mero entero positivo mayor a cero."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validaciâ”œâ”‚n D: <= capacidad del evento (El Core de tu ticket)
            if threshold > event.capacity:
                return Response({
                    "status": "error",
                    "message": f"El umbral ({threshold}) no puede superar la capacidad mâ”œÃ­xima del evento ({event.capacity} personas)."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validaciâ”œâ”‚n para queue_timeout
            try:
                q_timeout = int(timeout_input)
                if q_timeout <= 0:
                    return Response({
                        "status": "error",
                        "message": "El tiempo de espera (timeout) debe ser mayor a cero."
                    }, status=status.HTTP_400_BAD_REQUEST)
            except ValueError:
                return Response({
                    "status": "error",
                    "message": "El tiempo de espera (timeout) debe ser un nâ”œâ•‘mero entero vâ”œÃ­lido."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Manejo seguro del booleano para 'waitlist_active'
            if isinstance(is_active_input, str):
                is_active = is_active_input.lower() == 'true'
            else:
                is_active = bool(is_active_input)

            # Guardado final
            event.waitlist_threshold = threshold
            event.waitlist_active = is_active
            event.queue_timeout = q_timeout
            event.save()

            return Response({
                "status": "success",
                "message": "Configuraciâ”œâ”‚n de la fila virtual actualizada y validada correctamente.",
                "data": {
                    "waitlist_threshold": event.waitlist_threshold,
                    "waitlist_active": event.waitlist_active,
                    "queue_timeout": event.queue_timeout
                }
            }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancelar un evento validando todas las condiciones de negocio"""
        event = self.get_object()

        # Condiciâ”œÃ¢â”¬â”‚n 1: Permisos (Solo el promotor dueâ”œÃ¢â”¬â–’o puede cancelar)
        if str(event.promoter_id) != str(request.user.id):
            return Response({
                "status": "error",
                "message": "No tienes permisos. Solo el promotor que creâ”œÃ¢â”¬â”‚ el evento puede cancelarlo."
            }, status=status.HTTP_403_FORBIDDEN)

        # Condiciâ”œÃ¢â”¬â”‚n 2: Estado del evento (Evitar doble cancelaciâ”œÃ¢â”¬â”‚n)
        if event.status in ['cancelled', 'completed']:
            return Response({
                "status": "error",
                "message": f"Acciâ”œÃ¢â”¬â”‚n denegada. El evento ya se encuentra '{event.status}'."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Condiciâ”œÃ¢â”¬â”‚n 3: Validar temporalidad (No cancelar eventos pasados)
        if not event.is_upcoming:
            return Response({
                "status": "error",
                "message": "No se puede cancelar un evento cuya fecha ya pasâ”œÃ¢â”¬â”‚ o estâ”œÃ¢â”¬Ã­ en curso."
            }, status=status.HTTP_400_BAD_REQUEST)

        tickets = event.ticket_types.all()
        total_sold = sum(ticket.current_sold for ticket in tickets)

        # Registrar metadata de cancelaciâ”œâ”‚n (TIC-210/TIC-229)
        event.status = 'cancelled'
        event.cancelled_at = timezone.now()
        event.cancelled_by = request.user.id
        event.cancellation_reason = request.data.get('cancellation_reason', '')
        event.save()

        # Detenemos la comercializaciâ”œâ”‚n desactivando los tickets
        for ticket in tickets:
            ticket.status = 'inactive'
            ticket.save()

        # Preparamos una respuesta inteligente basada en las ventas
        if total_sold > 0:
            mensaje = f"Evento cancelado. ATENCIâ”œÃ´N: Se registraron {total_sold} entradas vendidas. Se debe notificar a los compradores y gestionar reembolsos."
        else:
            mensaje = "Evento cancelado exitosamente. La comercializaciâ”œâ”‚n fue detenida (0 entradas vendidas)."

        return Response({
            "status": "success",
            "message": mensaje,
            "tickets_sold": total_sold,
            "cancelled_at": event.cancelled_at.isoformat(),
            "cancelled_by": str(event.cancelled_by),
            "cancellation_reason": event.cancellation_reason,
        }, status=status.HTTP_200_OK)
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def webhook_banco(self, request):
        """
        Este endpoint NO lo llama el frontend de React. 
        Lo llama el servidor del Banco (ej: Banco Mercantil, BNB, Simple) cuando el pago es exitoso.
        """
        # 1. Seguridad: Verificar que quien llama es realmente el banco.
        # Normalmente el banco te manda un token o firma en los headers.
        token_banco = request.headers.get('X-Bank-Secret')
        
        # En producciâ”œâ”‚n, 'mi_secreto_super_seguro' debe estar en un archivo .env
        if token_banco != 'mi_secreto_super_seguro': 
            return Response({"error": "No autorizado. Firma invâ”œÃ­lida."}, status=status.HTTP_403_FORBIDDEN)

        # 2. Leer los datos que manda el banco
        order_id = request.data.get('order_id')
        estado_transaccion = request.data.get('status') # El banco suele mandar 'EXITOSO', 'RECHAZADO', etc.

        try:
            orden = PaymentOrder.objects.get(id=order_id)
        except PaymentOrder.DoesNotExist:
            return Response({"error": "Orden no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        # 3. Idempotencia: â”¬â”Quâ”œÂ® pasa si el banco manda el mismo mensaje dos veces por error?
        if orden.status == 'paid':
            return Response({"mensaje": "Esta orden ya fue procesada y pagada anteriormente"}, status=status.HTTP_200_OK)

        # 4. Validar si la orden ya expirâ”œâ”‚ en nuestro sistema
        if orden.is_expired:
            orden.status = 'expired'
            orden.save()
            return Response({"error": "La orden ya expirâ”œâ”‚"}, status=status.HTTP_400_BAD_REQUEST)

        # 5. EL MOMENTO DE LA VERDAD: Procesar el pago exitoso
        if estado_transaccion == 'EXITOSO':
            
            # Usamos transaction.atomic(). Esto significa que o se hace TODO, o no se hace NADA.
            # Evita que el usuario pague pero por un error de BD se quede sin su entrada.
            with transaction.atomic():
                
                # A) Marcar la orden como pagada
                orden.status = 'paid'
                orden.save()

                # B) Actualizar la cantidad de entradas vendidas en el TicketType
                ticket_type = orden.ticket_type
                ticket_type.current_sold += orden.quantity
                ticket_type.save()

                # C) Generar la(s) entrada(s) real(es) para el usuario (TicketInstance)
                entradas_generadas = []
                for _ in range(orden.quantity):
                    # Este es el QR que el usuario mostrarâ”œÃ­ EN LA PUERTA del evento
                    qr_puerta = f"TICKETGO-{uuid.uuid4()}" 
                    codigo_emergencia = str(uuid.uuid4())[:8].upper() # Ej: 4A8F9B2C

                    nueva_entrada = TicketInstance.objects.create(
                        ticket_type=ticket_type,
                        qr_code_data=qr_puerta,
                        emergency_code=codigo_emergencia,
                        buyer_id=orden.buyer_id
                    )
                    entradas_generadas.append(str(nueva_entrada.id))

            # Respondemos al banco con un 200 OK para que sepa que recibimos el pago bien
            return Response({
                "mensaje": "Pago procesado correctamente. Entradas generadas.",
                "entradas_ids": entradas_generadas
            }, status=status.HTTP_200_OK)

        # Si el banco manda 'RECHAZADO' u otro estado
        return Response({"error": "Transacciâ”œâ”‚n no exitosa"}, status=status.HTTP_400_BAD_REQUEST)


# US24: AdminEventoBajaView/ModificarView/AdminAuditLogView reemplazadas por AdminEventEditView, AdminEventDeactivateView y AdminAuditLogListView (TIC-406/407/421)

class TicketTypeViewSet(viewsets.ModelViewSet):
    queryset = TicketType.objects.all()
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['event', 'status']
    search_fields = ['name', 'description']

    def get_permissions(self):
        action = getattr(self, 'action', None)
        if action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsPromotor()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return TicketTypeCreateSerializer
        if self.action in ['update', 'partial_update']:
            return TicketTypeCreateSerializer
        return TicketTypeSerializer

    def create(self, request, *args, **kwargs):
        """Crear tipo de entrada validando propiedad del evento y capacidad maxima"""
        event_id = request.data.get('event')

        try:
            new_capacity = int(request.data.get('max_capacity', 0))
        except (ValueError, TypeError):
            new_capacity = 0

        if not event_id:
            return Response({
                "status": "error",
                "message": "El ID del evento es requerido."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response({
                "status": "error",
                "message": "El evento especificado no existe."
            }, status=status.HTTP_404_NOT_FOUND)

        if str(event.promoter_id) != str(request.user.id):
            return Response({
                "status": "error",
                "message": "Acceso denegado. No puedes crear entradas para un evento que no te pertenece."
            }, status=status.HTTP_403_FORBIDDEN)

        from django.db.models import Sum
        current_tickets = TicketType.objects.filter(event=event).aggregate(
            total=Sum('max_capacity')
        )['total'] or 0

        if (current_tickets + new_capacity) > event.capacity:
            capacidad_disponible = event.capacity - current_tickets
            return Response({
                "status": "error",
                "message": f"La capacidad solicitada supera el limite del evento. Solo te queda espacio para {capacidad_disponible} entradas mas."
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response({
                "status": "success",
                "message": "Tipo de entrada creado exitosamente.",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "status": "error",
            "message": "Error al validar los datos de la entrada.",
            "details": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """Editar tipo de entrada validando que no exceda la capacidad total del evento"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        event = instance.event

        if str(event.promoter_id) != str(request.user.id):
            return Response({
                "status": "error",
                "message": "Acceso denegado. No puedes editar entradas de un evento que no te pertenece."
            }, status=status.HTTP_403_FORBIDDEN)

        try:
            new_capacity = request.data.get('max_capacity')
            new_capacity = int(new_capacity) if new_capacity is not None else instance.max_capacity
        except (ValueError, TypeError):
            return Response({
                "status": "error",
                "message": "La capacidad debe ser un numero entero valido."
            }, status=status.HTTP_400_BAD_REQUEST)

        from django.db.models import Sum
        current_other_tickets = TicketType.objects.filter(event=event).exclude(id=instance.id).aggregate(
            total=Sum('max_capacity')
        )['total'] or 0

        if (current_other_tickets + new_capacity) > event.capacity:
            capacidad_disponible = event.capacity - current_other_tickets
            return Response({
                "status": "error",
                "message": f"Error: Superas la capacidad del evento. Solo puedes aumentar esta entrada hasta un maximo de {capacidad_disponible} cupos."
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            self.perform_update(serializer)
            return Response({
                "status": "success",
                "message": "Entrada actualizada correctamente respetando el cupo del evento.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        return Response({
            "status": "error",
            "message": "Error en los datos enviados.",
            "details": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def by_event(self, request):
        """Obtener tipos de tickets de un evento"""
        event_id = request.query_params.get('event_id')
        if not event_id:
            return Response(
                {'error': 'event_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            tickets = TicketType.objects.filter(event_id=event_id)
            serializer = TicketTypeSerializer(tickets, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activar la venta de tickets"""
        ticket = self.get_object()
        ticket.status = 'active'
        ticket.save()
        return Response({'success': 'Ticket type activated'})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Desactivar la venta de tickets"""
        ticket = self.get_object()
        ticket.status = 'inactive'
        ticket.save()
        return Response({'success': 'Ticket type deactivated'})


class PurchaseView(APIView):
    """
    POST /api/v1/purchase/
    Inicia el proceso de compra: crea una Purchase con status='pending' y devuelve
    un QR de pago (contiene el purchase_id) con 15 minutos de expiraciâ”œâ”‚n.
    Si el evento supera el umbral, redirige a la fila virtual.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.user.id
        event_id = request.data.get("event_id")
        ticket_type_id = request.data.get("ticket_type_id")

        try:
            quantity = int(request.data.get("quantity", 1))
        except (ValueError, TypeError):
            return Response({"error": "Cantidad invalida"}, status=status.HTTP_400_BAD_REQUEST)

        if quantity <= 0:
            return Response({"error": "Cantidad debe ser mayor a 0"}, status=status.HTTP_400_BAD_REQUEST)

        event = get_object_or_404(Event, id=event_id)
        ticket = get_object_or_404(TicketType, id=ticket_type_id)
        # 1. Calculamos el total de entradas vendidas actualmente
        total_sold = sum(t.current_sold for t in event.ticket_types.all())

        # 2. Evaluamos si el evento tiene la fila activa Y superâ”œâ”‚ el umbral
        if event.waitlist_active and (total_sold + quantity) >= event.waitlist_threshold:
            
            with transaction.atomic():
                # Verificamos si el usuario ya estâ”œÃ­ en la fila
                waitlist_entry = Waitlist.objects.filter(event=event, user_id=user_id).first()
                
                if not waitlist_entry:
                    # Buscamos la â”œâ•‘ltima posiciâ”œâ”‚n asignada para darle la siguiente
                    last_position = Waitlist.objects.filter(event=event).aggregate(Max('position'))['position__max'] or 0
                    
                    waitlist_entry = Waitlist.objects.create(
                        event=event,
                        user_id=user_id,
                        position=last_position + 1,
                        status='waiting' # Estado "en_cola" segâ”œâ•‘n el ticket
                    )
                    
                    mensaje = "El evento ha superado el umbral de capacidad simultâ”œÃ­nea. Has sido colocado en la fila virtual."
                    status_code = status.HTTP_202_ACCEPTED
                else:
                    mensaje = "Ya te encuentras en la fila virtual para este evento."
                    status_code = status.HTTP_200_OK

            return Response({
                "status": "queue",
                "message": mensaje,
                "data": {
                    "event_id": str(event.id),
                    "queue_position": waitlist_entry.position,
                    "queue_status": waitlist_entry.status
                }
            }, status=status_code)
        # --- FIN Lâ”œÃ´GICA DE FILA VIRTUAL ---

        # Validaciones estâ”œÃ­ndar de compra
        if event.status == 'cancelled':
            return Response({"error": "No puedes comprar entradas para un evento cancelado"}, status=status.HTTP_400_BAD_REQUEST)

        if event.status != 'published':
            return Response({"error": "El evento no esta disponible para compra"}, status=status.HTTP_400_BAD_REQUEST)

        if ticket.status != 'active':
            return Response({"error": "Este tipo de entrada no esta disponible"}, status=status.HTTP_400_BAD_REQUEST)

        if ticket.available_capacity < quantity:
            return Response({"error": "No hay suficientes entradas disponibles"}, status=status.HTTP_400_BAD_REQUEST)

        existing_purchase = Purchase.objects.filter(
            user_id=user_id,
            event=event,
            status__in=['active', 'pending']
        ).exists()

        if existing_purchase:
            return Response({
                "error": "Ya tienes una entrada para este evento. Revisa tu historial de compras.",
                "error_code": "DUPLICATE_PURCHASE"
            }, status=status.HTTP_409_CONFLICT)

        total_price = ticket.price * quantity
        # El timer empieza desde 'Seleccionar Asientos' (accessed_at en service-queue),
        # no desde la generaciâ”œâ”‚n del QR. Fallback: ahora si no hay registro.
        start_time = _get_queue_access_time(str(event.id), str(user_id)) or timezone.now()
        expires_at = start_time + timedelta(minutes=event.payment_timeout_minutes)

        purchase = Purchase.objects.create(
            user_id=user_id,
            event=event,
            ticket_type=ticket,
            quantity=quantity,
            total_price=total_price,
            status='pending'
        )
        # Sobrescribir created_at para que SimularPagoView y PurchaseStatusView
        # (que calculan expires_at = created_at + timeout) usen el tiempo de admisiâ”œâ”‚n
        # a la cola en vez del tiempo de creaciâ”œâ”‚n de la orden.
        Purchase.objects.filter(id=purchase.id).update(created_at=start_time)
        purchase.refresh_from_db()

        payment_qr_base64 = None
        try:
            qr_content = f"TICKETPAY:{purchase.id}:{float(total_price)}"
            qr = qrcode.make(qr_content)
            buffer = io.BytesIO()
            qr.save(buffer, 'PNG')
            payment_qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        except Exception as e:
            print(f"Error generando QR de pago: {str(e)}")

        return Response({
            "status": "pending",
            "message": "Orden de pago creada. Escanea el QR para completar el pago.",
            "data": {
                "purchase_id": str(purchase.id),
                "total": float(total_price),
                "payment_qr": payment_qr_base64,
                "expires_at": expires_at.isoformat(),
                "event_name": event.name,
                "ticket_type_name": ticket.name,
            }
        }, status=status.HTTP_201_CREATED)

class SimularPagoView(APIView):
    """
    POST /api/v1/purchase/<purchase_id>/simular_pago/
    SOLO PARA DESARROLLO/TESTING.
    Simula la confirmaciâ”œâ”‚n de pago bancario, activa la compra y genera el QR/backup_code de la entrada.
    En producciâ”œâ”‚n este endpoint no existirâ”œÂ¡a; se reemplaza por un webhook del banco.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, purchase_id):
        purchase = get_object_or_404(Purchase, id=purchase_id)

        if str(purchase.user_id) != str(request.user.id):
            return Response({"error": "No autorizado"}, status=403)

        if purchase.status == 'active':
            return Response({"error": "Esta compra ya fue confirmada"}, status=400)

        if purchase.status == 'cancelled':
            return Response({"error": "Esta orden fue cancelada"}, status=400)

        # Usar accessed_at del queue como inicio del timer (no purchase.created_at)
        start_time = _get_queue_access_time(str(purchase.event.id), str(purchase.user_id)) or purchase.created_at
        expires_at = start_time + timedelta(minutes=purchase.event.payment_timeout_minutes)
        if timezone.now() > expires_at:
            purchase.status = 'cancelled'
            purchase.save()
            _notify_queue_release(str(purchase.event.id), str(purchase.user_id))
            return Response({"error": "El tiempo de pago expirâ”œâ”‚. Genera una nueva orden."}, status=410)

        backup_code = secrets.token_hex(5).upper()
        qr_code_base64 = None
        try:
            qr = qrcode.make(backup_code)
            buffer = io.BytesIO()
            qr.save(buffer, 'PNG')
            qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
        except Exception as e:
            print(f"Error generando QR de entrada: {str(e)}")

        purchase.status = 'active'
        purchase.backup_code = backup_code
        purchase.qr_code = qr_code_base64
        purchase.save()

        # TIC-569 (US-31): Calcular y persistir comisiâ”œâ”‚n de plataforma
        CommissionService.aplicar(purchase)

        # Registrar comportamiento de compra
        registrar_comportamiento(
            user_id=purchase.user_id,
            event=purchase.event,
            action_type='purchase'
        )

        # Marcar los asientos reservados por este usuario como vendidos
        Seat.objects.filter(
            ticket_type=purchase.ticket_type,
            reserved_by=purchase.user_id,
            status='reserved'
        ).update(status='sold')

        ticket = purchase.ticket_type
        ticket.current_sold += purchase.quantity
        ticket.save()

        event = purchase.event
        total_sold = sum(t.current_sold for t in event.ticket_types.all())
        if event.capacity > 0 and (total_sold / event.capacity) * 100 >= event.waitlist_threshold:
            event.waitlist_active = True
            event.save()

        print(f"[PAGO SIMULADO] Compra {purchase.id} confirmada para usuario {purchase.user_id}")

        # Liberar cupo en service-queue (compra completada exitosamente)
        _notify_queue_release(str(event.id), str(purchase.user_id))

        # Enviar email con ticket al comprador
        user_email = request.user.email
        user_name = getattr(request.user, 'username', '') or user_email.split('@')[0]
        email_sent = False
        if user_email:
            try:
                email_sent = send_ticket_email(user_email, purchase, user_name)
            except Exception as email_err:
                print(f"[EMAIL] No se pudo enviar el ticket: {email_err}")

        return Response({
            "status": "success",
            "message": "Pago confirmado. Tu entrada ha sido generada.",
            "data": {
                "purchase_id": str(purchase.id),
                "backup_code": backup_code,
                "total": float(purchase.total_price),
                "qr_code": qr_code_base64,
                "event_name": event.name,
                "ticket_type_name": ticket.name,
                "email_sent": email_sent,
                "email_sent_to": user_email if email_sent else None,
            }
        }, status=200)


class PurchaseStatusView(APIView):
    """
    GET /api/v1/purchase/<purchase_id>/status/
    Consulta el estado actual de una compra (usado por polling del frontend).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, purchase_id):
        purchase = get_object_or_404(Purchase, id=purchase_id)

        if str(purchase.user_id) != str(request.user.id):
            return Response({"error": "No autorizado"}, status=403)

        # Usar accessed_at del queue como inicio del timer (no purchase.created_at)
        start_time = _get_queue_access_time(str(purchase.event.id), str(purchase.user_id)) or purchase.created_at
        expires_at = start_time + timedelta(minutes=purchase.event.payment_timeout_minutes)

        if purchase.status == 'pending' and timezone.now() > expires_at:
            purchase.status = 'cancelled'
            purchase.save()

            # Liberar asientos si la compra expirâ”œâ”‚ por tiempo
            Seat.objects.filter(
                ticket_type=purchase.ticket_type,
                reserved_by=purchase.user_id,
                status='reserved'
            ).update(status='available', reserved_by=None, reserved_at=None)

            _notify_queue_release(str(purchase.event.id), str(purchase.user_id))

        data = {
            "purchase_id": str(purchase.id),
            "status": purchase.status,
            "expires_at": expires_at.isoformat(),
        }

        if purchase.status == 'active':
            data["backup_code"] = purchase.backup_code
            data["qr_code"] = purchase.qr_code
            data["event_name"] = purchase.event.name
            data["ticket_type_name"] = purchase.ticket_type.name
            data["total"] = float(purchase.total_price)

        return Response(data, status=200)


class SeatConfigurationView(APIView):
    """
    GET  /api/v1/events/<event_id>/seat-config/  Ã”Ã‡Ã¶ Devuelve zonas + disponibilidad
    POST /api/v1/events/<event_id>/seat-config/  Ã”Ã‡Ã¶ Crea/reemplaza zonas del evento
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id):
        """Retorna las zonas (TicketType) del evento con sus campos de asiento."""
        event = get_object_or_404(Event, id=event_id)
        tickets = TicketType.objects.filter(event=event).order_by('zone_type', 'name')

        data = []
        for t in tickets:
            data.append({
                "id": str(t.id),
                "name": t.name,
                "description": t.description,
                "price": float(t.price),
                "max_capacity": t.max_capacity,
                "current_sold": t.current_sold,
                "available_capacity": t.available_capacity,
                "zone_type": t.zone_type,
                "is_vip": t.is_vip,
                "seat_rows": t.seat_rows,
                "seats_per_row": t.seats_per_row,
                "configured_seats": t.configured_seats,
                "status": t.status,
            })

        return Response({
            "status": "success",
            "event_id": str(event.id),
            "event_name": event.name,
            "event_capacity": event.capacity,
            "zones": data,
        }, status=200)

    def post(self, request, event_id):
        """Crea o reemplaza la configuraciâ”œâ”‚n de zonas. Protege zonas con ventas."""
        event = get_object_or_404(Event, id=event_id)

        zones = request.data.get("zones", [])
        errors = []

        for i, zone in enumerate(zones):
            if not zone.get("name"):
                errors.append(f"Zona[{i}] sin nombre")
            if not zone.get("price"):
                errors.append(f"Zona[{i}] sin precio")
            if not zone.get("max_capacity"):
                errors.append(f"Zona[{i}] sin capacidad")
            if not zone.get("zone_type"):
                errors.append(f"Zona[{i}] sin tipo")

        zone_names = [z.get("name") for z in zones]
        if len(zone_names) != len(set(zone_names)):
            errors.append("Existen zonas duplicadas")

        general_prices = [z["price"] for z in zones if z.get("zone_type") == "general"]
        vip_prices = [z["price"] for z in zones if z.get("zone_type") == "vip"]

        if general_prices and vip_prices:
            if min(vip_prices) <= max(general_prices):
                errors.append("Las zonas VIP deben tener mayor precio que las generales")

        for i, z in enumerate(zones):
            if z.get("price", 0) <= 0:
                errors.append(f"Zona[{i}] tiene precio invâ”œÃ­lido")

        total_capacity = sum([z.get("max_capacity", 0) for z in zones])
        if total_capacity > event.capacity:
            errors.append("La suma de capacidades supera el aforo del evento")

        if errors:
            return Response({"status": "error", "errors": errors}, status=422)

        # Advertencia A2: Proteger zonas con ventas activas
        tickets_con_ventas = TicketType.objects.filter(
            event=event, current_sold__gt=0
        )
        if tickets_con_ventas.exists():
            nombres = [t.name for t in tickets_con_ventas]
            return Response({
                "status": "error",
                "message": "No se puede reconfigurar el recinto porque hay zonas con entradas vendidas.",
                "zones_with_sales": nombres,
            }, status=409)

        with transaction.atomic():
            TicketType.objects.filter(event=event).delete()

            for z in zones:
                TicketType.objects.create(
                    event=event,
                    name=z["name"],
                    description=z.get("description", ""),
                    price=z["price"],
                    max_capacity=z["max_capacity"],
                    zone_type=z["zone_type"],
                    seat_rows=z.get("seat_rows"),
                    seats_per_row=z.get("seats_per_row"),
                    is_vip=z.get("is_vip", z.get("zone_type") == "vip"),
                    status='active',
                )

        return Response({
            "status": "success",
            "message": "Configuraciâ”œâ”‚n de asientos guardada correctamente"
        }, status=201)


class ValidateTicketView(APIView):
    """
    Endpoint para validar entradas en la puerta del evento.
    Acepta tanto câ”œÃ¢â”¬â”‚digo QR como câ”œÃ¢â”¬â”‚digo alfanumâ”œÃ¢â”¬Â®rico.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        codigo = request.data.get("codigo", "").strip()

        if not codigo:
            return Response({
                "status": "error",
                "message": "El câ”œÃ¢â”¬â”‚digo es requerido"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            purchase = Purchase.objects.get(backup_code=codigo)
        except Purchase.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Entrada no encontrada"
            }, status=status.HTTP_404_NOT_FOUND)

        if purchase.status == 'used':
            return Response({
                "status": "error",
                "message": "Esta entrada ya fue utilizada"
            }, status=status.HTTP_409_CONFLICT)

        if purchase.status == 'cancelled':
            return Response({
                "status": "error",
                "message": "Esta entrada fue cancelada"
            }, status=status.HTTP_410_GONE)

        # Marcar como usada
        purchase.status = 'used'
        purchase.used_at = timezone.now()
        purchase.validated_by = request.user.id
        purchase.save()

        return Response({
            "status": "success",
            "message": "Entrada validada correctamente",
            "data": {
                "purchase_id": str(purchase.id),
                "event": purchase.event.name,
                "ticket_type": purchase.ticket_type.name,
                "validated_at": purchase.used_at.isoformat()
            }
        }, status=status.HTTP_200_OK)




class SeatListView(APIView):
    """
    GET /api/v1/seats/?ticket_type_id=<uuid>
    Devuelve todos los asientos de una zona con su estado actual.
    Si la zona no tiene asientos generados aâ”œâ•‘n, los genera automâ”œÃ­ticamente.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ticket_type_id = request.query_params.get('ticket_type_id')
        if not ticket_type_id:
            return Response(
                {'error': 'ticket_type_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        ticket_type = get_object_or_404(TicketType, id=ticket_type_id)

        # Si no hay asientos generados y el TicketType tiene layout configurado,
        # los generamos automâ”œÃ­ticamente (una sola vez).
        if not Seat.objects.filter(ticket_type=ticket_type).exists():
            if ticket_type.seat_rows and ticket_type.seats_per_row:
                seats_to_create = []
                for row_idx in range(ticket_type.seat_rows):
                    row_label = chr(65 + row_idx)  # A, B, C...
                    for seat_num in range(1, ticket_type.seats_per_row + 1):
                        seats_to_create.append(Seat(
                            ticket_type=ticket_type,
                            seat_code=f"{row_label}-{seat_num}",
                            row_label=row_label,
                            seat_number=seat_num,
                            status='available',
                        ))
                Seat.objects.bulk_create(seats_to_create)

        seats = Seat.objects.filter(ticket_type=ticket_type).order_by('row_label', 'seat_number')

        data = [{
            'id': str(s.id),
            'seat_code': s.seat_code,
            'row_label': s.row_label,
            'seat_number': s.seat_number,
            'status': s.status,
            'reserved_at': s.reserved_at.isoformat() if s.reserved_at else None,
        } for s in seats]

        return Response({
            'ticket_type_id': str(ticket_type.id),
            'ticket_type_name': ticket_type.name,
            'zone_type': ticket_type.zone_type,
            'total': len(data),
            'available': sum(1 for s in seats if s.status == 'available'),
            'reserved': sum(1 for s in seats if s.status == 'reserved'),
            'sold': sum(1 for s in seats if s.status == 'sold'),
            'seats': data,
        }, status=200)


class SeatReserveView(APIView):
    """
    POST /api/v1/seats/<seat_id>/reserve/
    Reserva un asiento de forma atâ”œâ”‚mica (select_for_update evita doble reserva).
    La reserva expira si no se confirma el pago (ver TIC-20 para el scheduler).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, seat_id):
        user_id = request.user.id

        with transaction.atomic():
            # select_for_update: bloquea la fila mientras la transacciâ”œâ”‚n estâ”œÃ­ activa
            # garantizando que dos usuarios simultâ”œÃ­neos no reserven el mismo asiento
            try:
                seat = Seat.objects.select_for_update(nowait=True).get(id=seat_id)
            except Seat.DoesNotExist:
                return Response({'error': 'Asiento no encontrado'}, status=404)
            except Exception:
                # nowait=True lanza error si el registro estâ”œÃ­ bloqueado
                return Response(
                    {'error': 'El asiento estâ”œÃ­ siendo reservado por otro usuario. Intenta de nuevo.'},
                    status=409
                )

            if seat.status == 'sold':
                return Response({'error': 'Este asiento ya fue vendido.'}, status=409)

            if seat.status == 'reserved':
                # Verificar si la reserva expirâ”œâ”‚ (mâ”œÃ­s de 15 min)
                if seat.reserved_at:
                    expiracion = seat.reserved_at + timedelta(minutes=15)
                    if timezone.now() < expiracion:
                        return Response(
                            {'error': 'Este asiento ya estâ”œÃ­ reservado. Intenta con otro.'},
                            status=409
                        )
                    # Reserva expirada: liberar y tomar
                seat.status = 'available'

            if seat.status != 'available':
                return Response({'error': 'El asiento no estâ”œÃ­ disponible.'}, status=409)

            seat.status = 'reserved'
            seat.reserved_at = timezone.now()
            seat.reserved_by = user_id
            seat.save()

        return Response({
            'status': 'success',
            'message': 'Asiento reservado. Tienes 15 minutos para completar el pago.',
            'seat': {
                'id': str(seat.id),
                'seat_code': seat.seat_code,
                'row_label': seat.row_label,
                'seat_number': seat.seat_number,
                'status': seat.status,
                'reserved_at': seat.reserved_at.isoformat(),
            }
        }, status=200)

class SeatBulkReserveView(APIView):
    """
    POST /api/v1/seats/bulk-reserve/
    body: {"seat_ids": [uuid1, uuid2]}
    Reserva mâ”œâ•‘ltiples asientos de forma atâ”œâ”‚mica. Si uno falla, toda la transacciâ”œâ”‚n se revierte.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.user.id
        seat_ids = request.data.get('seat_ids', [])

        if not seat_ids or not isinstance(seat_ids, list):
            return Response({'error': 'se requiere una lista de seat_ids'}, status=400)

        with transaction.atomic():
            # select_for_update bloquea todos los asientos de la lista de forma atâ”œâ”‚mica
            try:
                # order_by('id') previene deadlocks al bloquear mâ”œâ•‘ltiples filas
                seats = Seat.objects.select_for_update(nowait=True).filter(id__in=seat_ids).order_by('id')
                if len(seats) != len(seat_ids):
                    return Response({'error': 'Algunos asientos no fueron encontrados'}, status=404)
            except Exception:
                return Response({'error': 'Algunos asientos estâ”œÃ­n siendo reservados por otro usuario. Intenta de nuevo.'}, status=409)

            for seat in seats:
                if seat.status == 'sold':
                    return Response({'error': f'El asiento {seat.seat_code} ya fue vendido.'}, status=409)
                if seat.status == 'reserved':
                    if seat.reserved_at:
                        expiracion = seat.reserved_at + timedelta(minutes=15)
                        if timezone.now() < expiracion:
                            return Response({'error': f'El asiento {seat.seat_code} ya estâ”œÃ­ reservado.'}, status=409)
                    # Expirâ”œâ”‚, podemos tomarlo
                elif seat.status != 'available':
                    return Response({'error': f'El asiento {seat.seat_code} no estâ”œÃ­ disponible.'}, status=409)

            now = timezone.now()
            for seat in seats:
                seat.status = 'reserved'
                seat.reserved_at = now
                seat.reserved_by = user_id
                seat.save()

        return Response({'status': 'success', 'message': f'{len(seats)} asientos reservados.'}, status=200)

class WaitlistView(APIView):
    """Endpoint para gestionar lista de espera."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        event_id = request.data.get("event_id")
        event = get_object_or_404(Event, id=event_id)
        user_id = request.user.id

        if Waitlist.objects.filter(event=event, user_id=user_id).exists():
            return Response({"error": "Ya estâ”œÃ­s en la lista de espera"}, status=400)

        max_pos = Waitlist.objects.filter(event=event).aggregate(Max('position'))['position__max'] or 0
        entry = Waitlist.objects.create(
            event=event,
            user_id=user_id,
            position=max_pos + 1
        )
        return Response({
            "status": "waitlist",
            "position": entry.position,
            "message": f"Estâ”œÃ­s en la posiciâ”œâ”‚n {entry.position} de la lista de espera."
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    """Endpoint para cerrar sesiâ”œâ”‚n (blacklist token)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if token:
            BlacklistedToken.objects.get_or_create(
                token=token,
                defaults={'expires_at': timezone.now() + timedelta(days=1)}
            )
        return Response({"message": "Sesiâ”œâ”‚n cerrada correctamente"}, status=200)


class PurchaseHistoryView(APIView):
    """
    Endpoint para consultar historial de compras del usuario.
    
    Parâ”œÃ­metros de consulta soportados:
      - page (int): Nâ”œâ•‘mero de pâ”œÃ­gina (default: 1)
      - page_size (int): Cantidad por pâ”œÃ­gina (default: 10, max: 100)
      - status (str): Filtrar por estado (active, used, pending, cancelled)
      - sortBy (str): Campo de ordenaciâ”œâ”‚n (created_at, total_price, event_date, status)
      - sortType (str): Direcciâ”œâ”‚n de orden (ASC o DESC, default: DESC)
      - minPrice (decimal): Precio mâ”œÂ¡nimo del total
      - maxPrice (decimal): Precio mâ”œÃ­ximo del total
    
    Ejemplo:
      GET /api/v1/purchases/history/?page=1&page_size=10&status=active&sortBy=total_price&sortType=ASC&minPrice=100
    """
    permission_classes = [IsAuthenticated]

    ALLOWED_SORT_FIELDS = {
        'created_at': 'created_at',
        'total_price': 'total_price',
        'event_date': 'event__event_date',
        'status': 'status',
        'event_name': 'event__name',
    }

    def get(self, request):
        user_id = request.user.id
        qs = Purchase.objects.filter(user_id=user_id).select_related('event', 'ticket_type')

        # Ã”Ã¶Ã‡Ã”Ã¶Ã‡ Filtro por status Ã”Ã¶Ã‡Ã”Ã¶Ã‡
        status_filter = request.query_params.get('status')
        if status_filter and status_filter in ('active', 'used', 'pending', 'cancelled'):
            qs = qs.filter(status=status_filter)

        # Ã”Ã¶Ã‡Ã”Ã¶Ã‡ Filtro por evento Ã”Ã¶Ã‡Ã”Ã¶Ã‡
        event_filter = request.query_params.get('event_id')
        if event_filter:
            qs = qs.filter(event_id=event_filter)

        # Ã”Ã¶Ã‡Ã”Ã¶Ã‡ Filtro por rango de precio Ã”Ã¶Ã‡Ã”Ã¶Ã‡
        min_price = request.query_params.get('minPrice')
        max_price = request.query_params.get('maxPrice')
        if min_price:
            try:
                qs = qs.filter(total_price__gte=float(min_price))
            except ValueError:
                pass
        if max_price:
            try:
                qs = qs.filter(total_price__lte=float(max_price))
            except ValueError:
                pass

        # Ã”Ã¶Ã‡Ã”Ã¶Ã‡ Ordenaciâ”œâ”‚n Ã”Ã¶Ã‡Ã”Ã¶Ã‡
        sort_by = request.query_params.get('sortBy', 'created_at')
        sort_type = request.query_params.get('sortType', 'DESC').upper()
        db_field = self.ALLOWED_SORT_FIELDS.get(sort_by, 'created_at')
        if sort_type == 'ASC':
            qs = qs.order_by(db_field)
        else:
            qs = qs.order_by(f'-{db_field}')

        # Ã”Ã¶Ã‡Ã”Ã¶Ã‡ Paginaciâ”œâ”‚n Ã”Ã¶Ã‡Ã”Ã¶Ã‡
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        total = qs.count()
        start = (page - 1) * page_size
        purchases = qs[start:start + page_size]

        data = []
        for p in purchases:
            data.append({
                "id": str(p.id),
                "event_id": str(p.event.id),
                "event_name": p.event.name,
                "event_date": str(p.event.event_date),
                "event_time": str(p.event.event_time) if p.event.event_time else None,
                "event_location": p.event.location,
                "event_image": p.event.image.url if p.event.image else None,
                "ticket_type": p.ticket_type.name,
                "zone_type": p.ticket_type.zone_type,
                "quantity": p.quantity,
                "total_price": str(p.total_price),
                "status": p.status,
                "backup_code": p.backup_code,
                "qr_code": p.qr_code,
                "created_at": p.created_at.isoformat(),
                "used_at": p.used_at.isoformat() if p.used_at else None,
            })

        return Response({
            "results": data,
            "count": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
            "sort_by": sort_by,
            "sort_type": sort_type,
            "filters_applied": {
                "status": status_filter,
                "minPrice": min_price,
                "maxPrice": max_price,
            }
        }, status=200)


class PurchaseDetailView(APIView):
    """Endpoint para obtener detalle de una compra individual."""
    permission_classes = [IsAuthenticated]

    def get(self, request, purchase_id):
        user_id = request.user.id
        purchase = get_object_or_404(Purchase, id=purchase_id)

        if str(purchase.user_id) != str(user_id):
            return Response({"error": "No tienes permiso para ver esta compra."}, status=403)

        return Response({
            "id": str(purchase.id),
            "event_id": str(purchase.event.id),
            "event_name": purchase.event.name,
            "event_date": str(purchase.event.event_date),
            "event_time": str(purchase.event.event_time) if purchase.event.event_time else None,
            "event_location": purchase.event.location,
            "event_image": purchase.event.image.url if purchase.event.image else None,
            "event_status": purchase.event.status,
            "ticket_type": purchase.ticket_type.name,
            "zone_type": purchase.ticket_type.zone_type,
            "is_vip": purchase.ticket_type.is_vip,
            "quantity": purchase.quantity,
            "total_price": str(purchase.total_price),
            # TIC-526/US-31: Campos de comisiâ”œâ”‚n
            "commission_percentage": str(purchase.commission_percentage) if purchase.commission_percentage else None,
            "commission_amount": str(purchase.commission_amount) if purchase.commission_amount else None,
            "net_amount": str(purchase.net_amount) if purchase.net_amount else None,
            "status": purchase.status,
            "backup_code": purchase.backup_code,
            "qr_code": purchase.qr_code,
            "created_at": purchase.created_at.isoformat(),
            "used_at": purchase.used_at.isoformat() if purchase.used_at else None,
        }, status=200)


class PurchaseDownloadPDFView(APIView):
    """Endpoint para descargar el PDF de una entrada."""
    permission_classes = [IsAuthenticated]

    def get(self, request, purchase_id):
        from .services import generate_ticket_pdf
        from django.http import HttpResponse

        user_id = request.user.id
        purchase = get_object_or_404(Purchase, id=purchase_id)

        if str(purchase.user_id) != str(user_id):
            return Response({"error": "No tienes permiso para descargar esta entrada."}, status=403)

        if purchase.status == 'cancelled':
            return Response({"error": "No se puede descargar una entrada cancelada."}, status=400)

        try:
            pdf_content = generate_ticket_pdf(purchase)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            filename = f"entrada_{purchase.event.name.replace(' ', '_')}_{purchase.backup_code}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response({"error": f"Error generando el PDF: {str(e)}"}, status=500)


class PurchaseCancelView(APIView):
    """
    POST /api/v1/purchase/<purchase_id>/cancel/
    Cancela una compra pendiente iniciada por el usuario.
    Solo se puede cancelar si el estado es 'pending' y pertenece al usuario autenticado.

    Body (opcional):
      { "keep_queue": true }  Ã”Ã¥Ã†  cancela la compra y libera asientos pero NO libera
                                  el cupo en service-queue (â”œâ•‘til para "volver atrâ”œÃ­s"
                                  y re-seleccionar asientos sin perder el turno).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, purchase_id):
        user_id = request.user.id
        purchase = get_object_or_404(Purchase, id=purchase_id)

        if str(purchase.user_id) != str(user_id):
            return Response({"error": "No tienes permiso para cancelar esta compra."}, status=403)

        if purchase.status == 'cancelled':
            return Response({"message": "La compra ya estaba cancelada."}, status=200)

        if purchase.status != 'pending':
            return Response(
                {"error": f"No se puede cancelar una compra con estado '{purchase.status}'. Solo se pueden cancelar compras pendientes."},
                status=400
            )

        purchase.status = 'cancelled'
        purchase.save()

        # Liberar los asientos reservados por este usuario para esta compra cancelada
        Seat.objects.filter(
            ticket_type=purchase.ticket_type,
            reserved_by=purchase.user_id,
            status='reserved'
        ).update(status='available', reserved_by=None, reserved_at=None)

        # Si keep_queue=true, NO liberar el cupo en la cola (el usuario vuelve
        # a seleccionar asientos pero sigue siendo su turno).
        keep_queue = request.data.get('keep_queue', False)
        if not keep_queue:
            _notify_queue_release(str(purchase.event.id), str(purchase.user_id))

        return Response({
            "status": "success",
            "message": "Compra cancelada correctamente. Puedes volver a comprar entradas para este evento.",
            "purchase_id": str(purchase.id),
        }, status=200)



class SeatReleaseExpiredView(APIView):
    """
    TIC-335, TIC-338: POST /api/v1/seats/release-expired/
    Endpoint interno para que el barrendero (service-queue) libere un asiento expirado.
    Recibe el seat_id y lo marca como 'available'.
    Solo accesible desde microservicios internos (verificado por JWT de servicio).
    """
    permission_classes = []  # Llamada interna entre microservicios
    authentication_classes = []

    def post(self, request):
        seat_id = request.data.get('seat_id')
        if not seat_id:
            return Response({"error": "seat_id es requerido."}, status=400)

        try:
            seat = Seat.objects.get(id=seat_id)
        except Seat.DoesNotExist:
            return Response({"error": f"Asiento {seat_id} no encontrado."}, status=404)

        if seat.status == 'available':
            # Ya estâ”œÃ­ disponible, idempotente
            return Response({"status": "ok", "message": "El asiento ya estaba disponible."}, status=200)

        # Registrar en audit log antes de liberar (TIC-339)
        purchase = getattr(seat, 'purchase', None)
        SeatAuditLog.objects.create(
            seat=seat,
            purchase=purchase,
            action='released',
            reason='Liberado por barrendero (timeout expirado)',
        )

        # Liberar el asiento (TIC-335, TIC-338)
        seat.status = 'available'
        seat.reserved_by = None
        if hasattr(seat, 'reserved_at'):
            seat.reserved_at = None
        if hasattr(seat, 'purchase'):
            seat.purchase = None
        seat.save()

        return Response({
            "status": "ok",
            "seat_id": str(seat_id),
            "message": "Asiento liberado correctamente.",
        }, status=200)


class QueueConfigView(APIView):
    """
    TIC-350, TIC-351, TIC-352: Panel de configuracion de cola para el Promotor.
    GET  /api/v1/queue-config/<event_id>/  Ã”Ã‡Ã¶ obtener configuracion actual
    POST /api/v1/queue-config/<event_id>/  Ã”Ã‡Ã¶ actualizar configuracion

    Solo el promotor dueno del evento puede configurar la cola.
    """
    permission_classes = [IsAuthenticated, IsPromotor]

    def get(self, request, event_id):
        event = get_object_or_404(Event, id=event_id)

        if str(event.promoter_id) != str(request.user.id):
            return Response(
                {"error": "No tienes permiso para ver esta configuracion."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = QueueConfigSerializer(event)
        return Response({
            "status": "success",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request, event_id):
        event = get_object_or_404(Event, id=event_id)

        if str(event.promoter_id) != str(request.user.id):
            return Response(
                {"error": "No tienes permiso para configurar este evento."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = QueueConfigSerializer(event, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            event.refresh_from_db()  # asegurar valores actualizados

            # Sincronizar con service-queue: convertir threshold (%) Ã”Ã¥Ã† max_concurrent_users (absoluto)
            threshold = event.waitlist_threshold
            capacity = event.capacity or 1
            max_concurrent = max(1, math.ceil(capacity * threshold / 100))
            payment_timeout = event.payment_timeout_minutes

            try:
                # Endpoint interno: no autentica ni llama de vuelta Ã”Ã¥Ã† evita deadlock circular
                queue_url = f"{django_settings.QUEUE_SERVICE_URL}/api/v1/internal/sync-queue-config/{event_id}/"
                http_requests.post(
                    queue_url,
                    json={
                        "max_concurrent_users": max_concurrent,
                        "payment_timeout_minutes": payment_timeout,
                    },
                    headers={"Content-Type": "application/json"},
                    timeout=4,
                )
            except Exception:
                pass  # Falla silenciosa; la cola usarâ”œÃ­ el valor previo

            return Response({
                "status": "success",
                "message": "Configuracion de cola actualizada correctamente.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        return Response({
            "status": "error",
            "message": "Error al validar los datos.",
            "details": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
class SuperAdminManageView(APIView):
    """
    TIC-105 & TIC-106: Gestiâ”œâ”‚n integral de Administradores por SuperAdmin.
    Permite modificar permisos y suspender cuentas con protecciâ”œâ”‚n de jerarquâ”œÂ¡a.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def patch(self, request, user_id):
        # 1. SEGURIDAD: Solo el SuperUser (Nivel Dios) puede entrar aquâ”œÂ¡
        if not request.user.is_superuser:
            return Response(
                {"error": "Acceso denegado. Se requieren privilegios de SuperAdmin."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 2. VALIDACIâ”œÃ´N DE JERARQUâ”œÃ¬A: Evitar que toquen a otro SuperAdmin
        # (Aquâ”œÂ¡ simulamos la comprobaciâ”œâ”‚n, en real consultarâ”œÂ¡as tu BD/Service-Profiles)
        target_is_superuser = False # <--- Consultar si el user_id es superusuario
        if target_is_superuser:
            return Response(
                {"error": "Acciâ”œâ”‚n denegada: Un SuperAdmin no puede ser gestionado por este endpoint."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 3. PROCESAMIENTO DE DATOS
        # Usamos el serializer para validar si vienen cambios de permisos
        serializer = AdminPermissionsSerializer(data=request.data, partial=True)
        
        # Detectamos si la intenciâ”œâ”‚n es SUSPENDER (TIC-106)
        is_suspend_action = request.data.get('suspend', False)

        try:
            acciones_realizadas = []

            # --- Lâ”œâ”‚gica de Suspensiâ”œâ”‚n ---
            if is_suspend_action:
                # Aquâ”œÂ¡ llamarâ”œÂ¡as a la lâ”œâ”‚gica de desactivar cuenta (is_active = False)
                acciones_realizadas.append("Suspensiâ”œâ”‚n de cuenta")
                log_admin_action(request, user_id, 'suspend', "Cuenta suspendida por SuperAdmin")

            # --- Lâ”œâ”‚gica de Permisos ---
            if serializer.is_valid() and serializer.validated_data:
                # Aquâ”œÂ¡ actualizarâ”œÂ¡as los permisos en la base de datos
                acciones_realizadas.append(f"Cambio de permisos: {list(serializer.validated_data.keys())}")
                log_admin_action(request, user_id, 'update', f"Permisos modificados: {serializer.validated_data}")

            if not acciones_realizadas:
                return Response({"message": "No se enviaron cambios vâ”œÃ­lidos."}, status=400)

            return Response({
                "status": "success",
                "target_user": user_id,
                "actions": acciones_realizadas
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=500)
    

# Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡ TIC-21/22: Favoritos, Notificaciones, Recomendaciones Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡

class UserFavoritesView(APIView):
    """
    GET  /api/v1/users/{user_id}/favorites/
        Lista todos los eventos favoritos del usuario.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        # Seguridad: solo el propio usuario puede ver sus favoritos
        if str(request.user.id) != str(user_id):
            return Response(
                {"error": "No tienes permiso para ver los favoritos de otro usuario."},
                status=status.HTTP_403_FORBIDDEN
            )

        favoritos = UserFavorite.objects.filter(
            user_id=user_id
        ).select_related('event', 'event__category')

        from .serializers import UserFavoriteSerializer
        serializer = UserFavoriteSerializer(favoritos, many=True)

        return Response({
            "status": "success",
            "count": favoritos.count(),
            "results": serializer.data
        }, status=status.HTTP_200_OK)


class UserFavoriteToggleView(APIView):
    """
    POST /api/v1/users/{user_id}/favorites/{event_id}/
    Toggle: si ya es favorito lo quita, si no lo agrega.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id, event_id):
        # Seguridad: solo el propio usuario puede gestionar sus favoritos
        if str(request.user.id) != str(user_id):
            return Response(
                {"error": "No tienes permiso para modificar los favoritos de otro usuario."},
                status=status.HTTP_403_FORBIDDEN
            )

        event = get_object_or_404(Event, id=event_id)

        favorito_existente = UserFavorite.objects.filter(
            user_id=user_id,
            event=event
        ).first()

        if favorito_existente:
            # Ya era favorito Ã”Ã¥Ã† desmarcar
            favorito_existente.delete()
            return Response({
                "status": "removed",
                "message": f"'{event.name}' eliminado de tus favoritos.",
                "is_favorite": False,
            }, status=status.HTTP_200_OK)

        else:
            # No era favorito Ã”Ã¥Ã† marcar
            UserFavorite.objects.create(
                user_id=user_id,
                event=event
            )

            # Registrar tambiâ”œÂ®n como comportamiento de interâ”œÂ®s
            registrar_comportamiento(
                user_id=user_id,
                event=event,
                action_type='favorite'
            )

            return Response({
                "status": "added",
                "message": f"'{event.name}' agregado a tus favoritos.",
                "is_favorite": True,
            }, status=status.HTTP_201_CREATED)


class UserNotificationsView(APIView):
    """
    GET /api/v1/users/{user_id}/notifications/
    Lista todas las notificaciones del usuario (leâ”œÂ¡das y no leâ”œÂ¡das).

    Query params opcionales:
      ?leida=false  Ã”Ã¥Ã† solo no leâ”œÂ¡das
      ?leida=true   Ã”Ã¥Ã† solo leâ”œÂ¡das
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        # Seguridad: solo el propio usuario puede ver sus notificaciones
        if str(request.user.id) != str(user_id):
            return Response(
                {"error": "No tienes permiso para ver estas notificaciones."},
                status=status.HTTP_403_FORBIDDEN
            )

        notificaciones = Notification.objects.filter(
            user_id=user_id
        ).select_related('event', 'event__category')

        # Filtro opcional por estado de lectura
        leida_param = request.query_params.get('leida', None)
        if leida_param is not None:
            leida_bool = leida_param.lower() == 'true'
            notificaciones = notificaciones.filter(leida=leida_bool)

        from .serializers import NotificationSerializer
        serializer = NotificationSerializer(notificaciones, many=True)

        return Response({
            "status": "success",
            "total": notificaciones.count(),
            "no_leidas": Notification.objects.filter(
                user_id=user_id, leida=False
            ).count(),
            "results": serializer.data,
        }, status=status.HTTP_200_OK)


class UserNotificationReadView(APIView):
    """
    PATCH /api/v1/users/{user_id}/notifications/{notif_id}/read/
    Marca una notificaciâ”œâ”‚n especâ”œÂ¡fica como leâ”œÂ¡da.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id, notif_id):
        # Seguridad: solo el propio usuario puede marcar sus notificaciones
        if str(request.user.id) != str(user_id):
            return Response(
                {"error": "No tienes permiso para modificar estas notificaciones."},
                status=status.HTTP_403_FORBIDDEN
            )

        notificacion = get_object_or_404(
            Notification,
            id=notif_id,
            user_id=user_id
        )

        if notificacion.leida:
            return Response({
                "status": "info",
                "message": "La notificaciâ”œâ”‚n ya estaba marcada como leâ”œÂ¡da.",
            }, status=status.HTTP_200_OK)

        notificacion.leida = True
        notificacion.leida_at = timezone.now()
        notificacion.save(update_fields=['leida', 'leida_at'])

        from .serializers import NotificationSerializer
        serializer = NotificationSerializer(notificacion)

        return Response({
            "status": "success",
            "message": "Notificaciâ”œâ”‚n marcada como leâ”œÂ¡da.",
            "data": serializer.data,
        }, status=status.HTTP_200_OK)

class UserNotificationReadAllView(APIView):
    """
    PATCH /api/v1/users/{user_id}/notifications/read-all/
    Marca TODAS las notificaciones no leâ”œÂ¡das del usuario como leâ”œÂ¡das.
    Endpoint de utilidad para el botâ”œâ”‚n 'Marcar todas como leâ”œÂ¡das'.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        if str(request.user.id) != str(user_id):
            return Response(
                {"error": "No tienes permiso."},
                status=status.HTTP_403_FORBIDDEN
            )

        ahora = timezone.now()

        actualizadas = Notification.objects.filter(
            user_id=user_id,
            leida=False
        ).update(leida=True, leida_at=ahora)

        return Response({
            "status": "success",
            "message": f"{actualizadas} notificaciones marcadas como leâ”œÂ¡das.",
            "actualizadas": actualizadas,
        }, status=status.HTTP_200_OK)

class UserRecommendationsAPIView(APIView):
    """
    Endpoint para obtener eventos recomendados segâ”œâ•‘n comportamiento pasado.
    """
    def get(self, request):
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response(
                {"error": "Se requiere user_id para generar recomendaciones personalizadas."},
                status=status.HTTP_400_BAD_REQUEST
            )

        events = RecommendationEngine.get_recommendation_queryset(user_id)
        serializer = EventSerializer(events, many=True)

        return Response(serializer.data)


class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 10  # Nâ”œâ•‘mero de eventos por pâ”œÃ­gina
    page_size_query_param = 'page_size'
    max_page_size = 50


class UserRecommendationsListView(generics.ListAPIView):
    """
    GET /users/{id}/recommendations
    Retorna lista paginada de eventos recomendados.
    """
    serializer_class = EventSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        # Capturamos el id del usuario desde la URL
        user_id = self.kwargs.get('user_id')
        return RecommendationEngine.get_recommendation_queryset(user_id)


class NotificationPreferenceView(APIView):
    """
    TIC-377: PUT /api/v1/users/{user_id}/notification-preferences/
    Permite al usuario configurar quâ”œÂ® categorâ”œÂ¡as le generan notificaciones.

    Body esperado: { "preferences": [{"category_id": "<uuid>", "enabled": true/false}, ...] }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        if str(request.user.id) != str(user_id):
            return Response(
                {"error": "No tienes permiso para ver estas preferencias."},
                status=status.HTTP_403_FORBIDDEN,
            )
        prefs = NotificationPreference.objects.filter(user_id=user_id).select_related('category')
        data = [
            {
                "id": str(p.id),
                "category_id": str(p.category_id),
                "category_name": p.category.name,
                "enabled": p.enabled,
            }
            for p in prefs
        ]
        return Response({"status": "success", "results": data}, status=status.HTTP_200_OK)

    def put(self, request, user_id):
        if str(request.user.id) != str(user_id):
            return Response(
                {"error": "No tienes permiso para modificar estas preferencias."},
                status=status.HTTP_403_FORBIDDEN,
            )

        prefs = request.data.get('preferences', [])
        if not isinstance(prefs, list):
            return Response(
                {"error": "El campo 'preferences' debe ser una lista."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        actualizadas = 0
        for item in prefs:
            cat_id = item.get('category_id')
            enabled = item.get('enabled', True)
            if not cat_id:
                continue
            NotificationPreference.objects.update_or_create(
                user_id=user_id,
                category_id=cat_id,
                defaults={'enabled': bool(enabled)},
            )
            actualizadas += 1

        return Response({
            "status": "success",
            "message": f"{actualizadas} preferencias actualizadas.",
        }, status=status.HTTP_200_OK)


class AdminUserCleanupView(APIView):
    """
    US23: Limpia datos locales de un usuario eliminado (comportamientos, preferencias, favoritos).
    Llamado desde service-auth cuando se da de baja una cuenta para que los datos
    de recomendaciones en service-events queden consistentes.

    Solo accesible por administradores (is_staff=True).
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        if not request.user.is_staff:
            return Response(
                {"error": "Permisos insuficientes."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if str(request.user.id) == str(user_id):
            return Response(
                {"error": "No puedes eliminar tu propia cuenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted_counts = {
            'behaviors': UserBehavior.objects.filter(user_id=user_id).delete()[0],
            'preferences': UserPreference.objects.filter(user_id=user_id).delete()[0],
            'favorites': UserFavorite.objects.filter(user_id=user_id).delete()[0],
            'notifications': Notification.objects.filter(user_id=user_id).delete()[0],
            'notification_preferences': NotificationPreference.objects.filter(user_id=user_id).delete()[0],
        }

        return Response({
            "status": "success",
            "message": "Datos locales del usuario eliminados.",
            "deleted": deleted_counts,
        }, status=status.HTTP_200_OK)


# Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡ TIC-25: Modificar/Dar de baja eventos (Admin) Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡

class AdminEventEditView(APIView):
    """
    TIC-406: PATCH /admin/events/{id}/
    Permite a un administrador modificar cualquier campo de un evento
    (nombre, fecha, capacidad, descripciâ”œâ”‚n, etc.) y registra la intervenciâ”œâ”‚n.

    Acceso: Admin con capability 'manage_events' o SuperAdmin (bypass).
    """
    permission_classes = [IsAuthenticated, HasAdminCapability('manage_events')]

    def patch(self, request, event_id):
        from .models import Event

        user = request.user
        # Admin = is_staff, is_superadmin, o rol Administrador/admin/superadmin.
        # user.role aqui es _SimpleRole (wrapper construido desde claims JWT).
        role_name = ''
        if hasattr(user, 'role') and user.role:
            role_name = (user.role.name if hasattr(user.role, 'name') else str(user.role)).lower()
        es_admin = (
            getattr(user, 'is_staff', False)
            or getattr(user, 'is_superadmin', False)
            or role_name in ['administrador', 'admin', 'superadmin']
        )
        if not es_admin:
            return Response(
                {"status": "error", "message": "Permisos insuficientes."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response(
                {"status": "error", "message": "Evento no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Campos permitidos para ediciâ”œâ”‚n por admin
        ALLOWED_FIELDS = [
            'name', 'description', 'event_date', 'event_time',
            'location', 'capacity', 'status', 'category',
        ]

        # TIC-453: snapshot antes/despues para registrar en EventAuditLog
        from .models import Category
        changed_fields = {}
        old_status = event.status
        for field in ALLOWED_FIELDS:
            if field not in request.data:
                continue
            new_value = request.data[field]

            # category llega como UUID/string -> resolver a instancia Category (FK).
            # Aceptar None/'' para limpiar la categoria.
            if field == 'category':
                old_value = event.category_id  # comparamos por id, no por instancia
                resolved = None
                if new_value:
                    try:
                        resolved = Category.objects.get(pk=new_value)
                    except (Category.DoesNotExist, ValueError, Exception):
                        return Response(
                            {"status": "error", "message": f"Categorâ”œÂ¡a no encontrada: {new_value}"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                if str(old_value) != str(new_value):
                    changed_fields[field] = {
                        'antes': str(old_value) if old_value is not None else None,
                        'despues': str(new_value) if new_value is not None else None,
                    }
                    event.category = resolved
                continue

            # Capacity llega como string -> convertir a int para evitar errores de comparacion/persistencia
            if field == 'capacity' and new_value not in (None, ''):
                try:
                    new_value = int(new_value)
                except (TypeError, ValueError):
                    return Response(
                        {"status": "error", "message": "La capacidad debe ser un nâ”œâ•‘mero entero."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            old_value = getattr(event, field, None)
            if str(old_value) != str(new_value):
                changed_fields[field] = {
                    'antes': str(old_value) if old_value is not None else None,
                    'despues': str(new_value) if new_value is not None else None,
                }
                setattr(event, field, new_value)

        if not changed_fields:
            return Response(
                {"status": "error", "message": "No se detectaron cambios en los campos enviados."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get('admin_reason', 'Modificaciâ”œâ”‚n administrativa')
        event.admin_status = 'modified'
        event.admin_reason = reason
        event.save()

        # TIC-448/TIC-453: registrar automaticamente en EventAuditLog
        try:
            from .models import EventAuditLog
            EventAuditLog.objects.create(
                event=event,
                event_name=event.name,
                admin_id=user.id,
                admin_email=getattr(user, 'email', str(user.id)),
                action='edit',
                reason=reason,
                changed_fields=changed_fields,
                old_status=old_status,
                new_status=event.status,
            )
        except Exception:
            pass  # El audit log nunca debe romper la respuesta principal

        return Response({
            "status": "success",
            "message": f"Evento '{event.name}' modificado correctamente.",
            "updated_fields": list(changed_fields.keys()),
            "changed_fields": changed_fields,
            "admin_reason": reason,
        }, status=status.HTTP_200_OK)


class AdminEventDeactivateView(APIView):
    """
    TIC-407: PATCH /admin/events/{id}/deactivate/
    Da de baja un evento: cambia su status a 'cancelled' y registra
    admin_status='deactivated' con el motivo obligatorio.

    Acceso: Admin con capability 'manage_events' o SuperAdmin (bypass).
    """
    permission_classes = [IsAuthenticated, HasAdminCapability('manage_events')]

    def patch(self, request, event_id):
        from .models import Event
        from django.utils import timezone as tz

        user = request.user
        # Aceptar is_staff, is_superadmin o rol Administrador
        role_name = ''
        if hasattr(user, 'role') and user.role:
            role_name = (user.role.name if hasattr(user.role, 'name') else str(user.role)).lower()
        es_admin = (
            getattr(user, 'is_staff', False)
            or getattr(user, 'is_superadmin', False)
            or role_name in ['administrador', 'admin', 'superadmin']
        )
        if not es_admin:
            return Response(
                {"status": "error", "message": "Permisos insuficientes."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response(
                {"status": "error", "message": "Evento no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if event.admin_status == 'deactivated':
            return Response(
                {"status": "error", "message": "El evento ya estâ”œÃ­ dado de baja."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get('reason', '')
        if not reason:
            return Response(
                {"status": "error", "message": "El motivo de baja es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = event.status
        event.status = 'cancelled'
        event.admin_status = 'deactivated'
        event.admin_reason = reason
        event.cancelled_at = tz.now()
        event.cancelled_by = user.id
        event.cancellation_reason = reason
        event.save(update_fields=[
            'status', 'admin_status', 'admin_reason',
            'cancelled_at', 'cancelled_by', 'cancellation_reason',
        ])

        # TIC-415: Registrar en EventAuditLog
        try:
            from .models import EventAuditLog
            EventAuditLog.objects.create(
                event=event,
                event_name=event.name,
                admin_id=user.id,
                admin_email=getattr(user, 'email', str(user.id)),
                action='deactivate',
                reason=reason,
                old_status=old_status,
                new_status='cancelled',
            )
        except Exception:
            pass  # El audit log nunca rompe la respuesta principal

        return Response({
            "status": "success",
            "message": f"Evento '{event.name}' dado de baja correctamente.",
            "event_id": str(event.id),
            "admin_reason": reason,
        }, status=status.HTTP_200_OK)


# Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡ TIC-26: Auditorâ”œÂ¡a de eventos Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡

class AdminAuditLogListView(APIView):
    """
    TIC-421: GET /admin/audit-log/
    Retorna el historial completo de intervenciones administrativas sobre eventos.
    Soporta filtros (event_id, admin_id, action, date_from, date_to) y paginaciâ”œâ”‚n.

    Acceso: Admin con capability 'view_reports' o SuperAdmin (bypass).
    """
    permission_classes = [IsAuthenticated, HasAdminCapability('view_reports')]

    def get(self, request):
        from .models import EventAuditLog

        user = request.user
        # Aceptar is_staff, is_superadmin o rol Administrador
        es_admin = (
            getattr(user, 'is_staff', False)
            or getattr(user, 'is_superadmin', False)
            or (
                getattr(user, 'role', None)
                and getattr(user.role, 'name', '').lower() in ['administrador', 'admin', 'superadmin']
            )
        )
        if not es_admin:
            return Response(
                {"status": "error", "message": "Permisos insuficientes para ver el log de auditorâ”œÂ¡a."},
                status=status.HTTP_403_FORBIDDEN,
            )

        qs = EventAuditLog.objects.select_related('event').order_by('-created_at')

        # Filtros opcionales
        event_id = request.query_params.get('event_id')
        admin_id = request.query_params.get('admin_id')
        action = request.query_params.get('action')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if event_id:
            qs = qs.filter(event_id=event_id)
        if admin_id:
            qs = qs.filter(admin_id=admin_id)
        if action:
            qs = qs.filter(action=action)
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        # Paginaciâ”œâ”‚n simple
        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
        except ValueError:
            page, page_size = 1, 20

        total = qs.count()
        start = (page - 1) * page_size
        registros = qs[start:start + page_size]

        data = []
        for log in registros:
            data.append({
                "id": str(log.id),
                "event_id": str(log.event_id) if log.event_id else None,
                "event_name": log.event_name,
                "admin_id": str(log.admin_id),
                "admin_email": log.admin_email,
                "action": log.action,
                "reason": log.reason,
                "changed_fields": log.changed_fields,
                "old_status": log.old_status,
                "new_status": log.new_status,
                "created_at": log.created_at.isoformat(),
            })

        return Response({
            "status": "success",
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "results": data,
        }, status=status.HTTP_200_OK)


class EventAuditLogListView(generics.ListAPIView):
    """
    TIC-420: GET /admin/events/{event_id}/audit-log/
    Historial completo de cambios de un evento especâ”œÂ¡fico, paginado y ordenado
    por fecha descendente.

    Acceso: Admin con capability 'view_reports' o SuperAdmin (bypass).
    """
    permission_classes = [IsAuthenticated, HasAdminCapability('view_reports')]

    def get(self, request, event_id):
        from .serializers import EventAuditLogSerializer
        logs = EventAuditLog.objects.filter(event_id=event_id).order_by('-created_at')
        serializer = EventAuditLogSerializer(logs, many=True)
        return Response({
            "status": "success",
            "event_id": str(event_id),
            "total": logs.count(),
            "results": serializer.data,
        }, status=status.HTTP_200_OK)


class ExportAuditLogCSVView(APIView):
    """
    TIC-423: GET /admin/audit-log/export/
    Genera y retorna un CSV con el historial completo de auditorâ”œÂ¡a para uso externo.

    Acceso: Admin con capability 'view_reports' o SuperAdmin (bypass).
    """
    permission_classes = [IsAuthenticated, HasAdminCapability('view_reports')]

    def get(self, request):
        import csv
        from django.http import HttpResponse

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit_log_export.csv"'

        queryset = EventAuditLog.objects.select_related('event').order_by('-created_at')

        writer = csv.writer(response)
        writer.writerow([
            'ID Log', 'Fecha', 'Evento', 'Admin Email',
            'Acciâ”œâ”‚n', 'Razâ”œâ”‚n', 'Estado Anterior', 'Estado Nuevo',
        ])

        for log in queryset:
            writer.writerow([
                log.id,
                log.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                log.event_name,
                log.admin_email,
                log.get_action_display() if hasattr(log, 'get_action_display') else log.action,
                log.reason or '',
                log.old_status or 'N/A',
                log.new_status or 'N/A',
            ])

        return response


# Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡ US23: Gestion administrativa de usuarios (Anghelo) Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡

class AdminUserDeleteView(APIView):
    """
    TIC-387: Endpoint DELETE /admin/users/{user_id}/ para dar de baja cuentas.
    Solo accesible por administradores. Limpia datos locales en service-events
    (UserBehavior, UserPreference, UserFavorite) y registra la accion en audit log.
    """
    permission_classes = [IsAuthenticated]

    def _es_admin(self, user):
        return (
            getattr(user, 'is_staff', False) or
            (
                getattr(user, 'role', None) and
                getattr(user.role, 'name', '').lower() in ['administrador', 'admin', 'superadmin']
            )
        )

    def delete(self, request, user_id):
        if not self._es_admin(request.user):
            return Response(
                {"error": "No tienes permisos de Administrador."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Validacion: no autoeliminacion
        if str(request.user.id) == str(user_id):
            return Response(
                {"error": "No puedes eliminar tu propia cuenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from .models import UserBehavior, UserPreference, UserFavorite
            behaviors_deleted = UserBehavior.objects.filter(user_id=user_id).delete()[0]
            prefs_deleted = UserPreference.objects.filter(user_id=user_id).delete()[0]
            favs_deleted = UserFavorite.objects.filter(user_id=user_id).delete()[0]

            return Response({
                "status": "success",
                "message": "Datos locales del usuario eliminados.",
                "details": {
                    "behaviors_deleted": behaviors_deleted,
                    "preferences_deleted": prefs_deleted,
                    "favorites_deleted": favs_deleted,
                },
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Error al procesar la baja: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡ US24: Gestion administrativa de eventos (Ariana) Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡

class AdminEventoBajaView(APIView):
    """
    PATCH /api/v1/admin/events/{event_id}/baja/
    Da de baja un evento con motivo obligatorio.
    Registra la accion en EventAuditLog automaticamente.
    Endpoint paralelo a AdminEventDeactivateView (TIC-407) con validaciones extra.

    Acceso: Admin con capability 'manage_events' o SuperAdmin (bypass).
    """
    permission_classes = [IsAuthenticated, HasAdminCapability('manage_events')]

    def _es_admin(self, user):
        return (
            getattr(user, 'is_staff', False) or
            (
                getattr(user, 'role', None) and
                getattr(user.role, 'name', '').lower() in ['administrador', 'admin', 'superadmin']
            )
        )

    def patch(self, request, event_id):
        if not self._es_admin(request.user):
            return Response(
                {"error": "No tienes permisos de Administrador."},
                status=status.HTTP_403_FORBIDDEN,
            )

        motivo = request.data.get('motivo', '').strip()
        if not motivo:
            return Response({
                "status": "error",
                "message": "El motivo de baja es obligatorio.",
            }, status=status.HTTP_400_BAD_REQUEST)

        if len(motivo) < 10:
            return Response({
                "status": "error",
                "message": "El motivo debe tener al menos 10 caracteres.",
            }, status=status.HTTP_400_BAD_REQUEST)

        event = get_object_or_404(Event, id=event_id)

        if event.admin_status == 'deactivated':
            return Response({
                "status": "error",
                "message": "El evento ya esta dado de baja.",
            }, status=status.HTTP_409_CONFLICT)

        estado_anterior = event.admin_status
        old_status = event.status

        event.admin_status = 'deactivated'
        event.admin_reason = motivo
        event.status = 'cancelled'
        event.cancelled_at = timezone.now()
        event.cancelled_by = request.user.id
        event.cancellation_reason = motivo
        event.save(update_fields=[
            'admin_status', 'admin_reason', 'status',
            'cancelled_at', 'cancelled_by', 'cancellation_reason',
        ])

        EventAuditLog.objects.create(
            event=event,
            event_name=event.name,
            admin_id=request.user.id,
            admin_email=request.user.email,
            action='deactivate',
            reason=motivo,
            changed_fields={
                'admin_status': {'antes': estado_anterior, 'despues': 'deactivated'},
            },
            old_status=old_status,
            new_status='cancelled',
        )

        return Response({
            "status": "success",
            "message": f"Evento '{event.name}' dado de baja correctamente.",
            "data": {
                "evento_id": str(event.id),
                "evento_nombre": event.name,
                "admin_status": event.admin_status,
                "motivo": motivo,
                "baja_at": event.cancelled_at,
                "ejecutado_por": request.user.email,
            },
        }, status=status.HTTP_200_OK)


class AdminEventoModificarView(APIView):
    """
    PATCH /api/v1/admin/events/{event_id}/modificar/
    El administrador modifica campos de un evento con motivo obligatorio.
    Registra en EventAuditLog los campos que cambiaron con valores antes/despues.

    Campos modificables por el admin: name, description, event_date, location, status

    Acceso: Admin con capability 'manage_events' o SuperAdmin (bypass).
    """
    permission_classes = [IsAuthenticated, HasAdminCapability('manage_events')]

    CAMPOS_PERMITIDOS = ['name', 'description', 'event_date', 'location', 'status']

    def _es_admin(self, user):
        return (
            getattr(user, 'is_staff', False) or
            (
                getattr(user, 'role', None) and
                getattr(user.role, 'name', '').lower() in ['administrador', 'admin', 'superadmin']
            )
        )

    def patch(self, request, event_id):
        if not self._es_admin(request.user):
            return Response(
                {"error": "No tienes permisos de Administrador."},
                status=status.HTTP_403_FORBIDDEN,
            )

        motivo = request.data.get('motivo', '').strip()
        if not motivo:
            return Response({
                "status": "error",
                "message": "El motivo de la modificacion es obligatorio.",
            }, status=status.HTTP_400_BAD_REQUEST)

        if len(motivo) < 10:
            return Response({
                "status": "error",
                "message": "El motivo debe tener al menos 10 caracteres.",
            }, status=status.HTTP_400_BAD_REQUEST)

        event = get_object_or_404(Event, id=event_id)

        if event.admin_status == 'deactivated':
            return Response({
                "status": "error",
                "message": "No se puede modificar un evento dado de baja.",
            }, status=status.HTTP_400_BAD_REQUEST)

        campos_modificados = {}
        campos_a_actualizar = []
        old_status = event.status

        for campo in self.CAMPOS_PERMITIDOS:
            if campo in request.data:
                valor_nuevo = request.data[campo]
                valor_anterior = getattr(event, campo)

                if str(valor_anterior) != str(valor_nuevo):
                    campos_modificados[campo] = {
                        'antes': str(valor_anterior),
                        'despues': str(valor_nuevo),
                    }
                    setattr(event, campo, valor_nuevo)
                    campos_a_actualizar.append(campo)

        if not campos_a_actualizar:
            return Response({
                "status": "info",
                "message": "No se detectaron cambios en los campos enviados.",
            }, status=status.HTTP_200_OK)

        event.admin_status = 'modified'
        event.admin_reason = motivo
        campos_a_actualizar.extend(['admin_status', 'admin_reason'])
        event.save(update_fields=campos_a_actualizar)

        EventAuditLog.objects.create(
            event=event,
            event_name=event.name,
            admin_id=request.user.id,
            admin_email=request.user.email,
            action='edit',
            reason=motivo,
            changed_fields=campos_modificados,
            old_status=old_status,
            new_status=event.status,
        )

        serializer = EventSerializer(event)

        return Response({
            "status": "success",
            "message": f"Evento '{event.name}' modificado correctamente.",
            "campos_modificados": campos_modificados,
            "data": serializer.data,
        }, status=status.HTTP_200_OK)


class AdminAuditLogView(APIView):
    """
    GET /api/v1/admin/audit-log-v2/
    Lista el historial completo de acciones administrativas sobre eventos.
    Endpoint paralelo a AdminAuditLogListView (TIC-421) con filtros en espanol.

    Query params opcionales:
      ?evento_id=UUID    -> filtrar por evento
      ?accion=baja       -> filtrar por tipo de accion (baja, modificacion)
      ?admin_id=UUID     -> filtrar por administrador

    Acceso: Admin con capability 'view_reports' o SuperAdmin (bypass).
    """
    permission_classes = [IsAuthenticated, HasAdminCapability('view_reports')]

    ACCION_MAP = {
        'baja': 'deactivate',
        'modificacion': 'edit',
        'reactivacion': 'reactivate',
    }

    def _es_admin(self, user):
        return (
            getattr(user, 'is_staff', False) or
            (
                getattr(user, 'role', None) and
                getattr(user.role, 'name', '').lower() in ['administrador', 'admin', 'superadmin']
            )
        )

    def get(self, request):
        if not self._es_admin(request.user):
            return Response(
                {"error": "No tienes permisos de Administrador."},
                status=status.HTTP_403_FORBIDDEN,
            )

        logs = EventAuditLog.objects.all().order_by('-created_at')

        evento_id = request.query_params.get('evento_id')
        if evento_id:
            logs = logs.filter(event_id=evento_id)

        accion = request.query_params.get('accion')
        if accion:
            action_mapped = self.ACCION_MAP.get(accion, accion)
            logs = logs.filter(action=action_mapped)

        admin_id = request.query_params.get('admin_id')
        if admin_id:
            logs = logs.filter(admin_id=admin_id)

        from .serializers import EventAuditLogSerializer
        serializer = EventAuditLogSerializer(logs, many=True)

        return Response({
            "status": "success",
            "total": logs.count(),
            "results": serializer.data,
        }, status=status.HTTP_200_OK)


# Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡ US26: Vista detalle por evento (Ariana) Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡

class EventAuditLogView(APIView):
    """
    GET /api/v1/admin/events/{event_id}/audit-log-v2/
    Vista detallada del historial de auditoria de UN evento especifico.
    Endpoint paralelo a EventAuditLogListView (TIC-420) con formato simplificado.

    Acceso: Admin con capability 'view_reports' o SuperAdmin (bypass).
    """
    permission_classes = [IsAuthenticated, HasAdminCapability('view_reports')]

    def _es_admin(self, user):
        return (
            getattr(user, 'is_staff', False) or
            (
                getattr(user, 'role', None) and
                getattr(user.role, 'name', '').lower() in ['administrador', 'admin', 'superadmin']
            )
        )

    def get(self, request, event_id):
        if not self._es_admin(request.user):
            return Response(
                {"error": "No tienes permisos de Administrador."},
                status=status.HTTP_403_FORBIDDEN,
            )

        event = get_object_or_404(Event, id=event_id)
        logs = EventAuditLog.objects.filter(event=event).order_by('-created_at')

        from .serializers import EventAuditLogSerializer
        serializer = EventAuditLogSerializer(logs, many=True)

        return Response({
            "status": "success",
            "evento_id": str(event.id),
            "evento_nombre": event.name,
            "total": logs.count(),
            "historial": serializer.data,
        }, status=status.HTTP_200_OK)




# Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡ TIC-526 (US-31): Configuraciâ”œâ”‚n de comisiones de la plataforma Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡

class PlatformCommissionCurrentView(APIView):
    """
    GET /api/v1/admin/platform/commission/current/

    Devuelve la configuraciâ”œâ”‚n de comisiâ”œâ”‚n activa vigente.
    Acceso: Solo SuperAdmin.

    Respuesta cuando hay comisiâ”œâ”‚n activa:
        { "commission": { ...campos PlatformCommission... }, "configured": true }
    Respuesta cuando no hay ninguna configurada:
        { "commission": null, "configured": false }
    """
    permission_classes = [IsAuthenticated, IsSuperadmin]

    def get(self, request):
        from .serializers import PlatformCommissionReadSerializer
        comision = PlatformCommission.get_active()
        if comision is None:
            return Response(
                {"commission": None, "configured": False},
                status=status.HTTP_200_OK,
            )
        serializer = PlatformCommissionReadSerializer(comision)
        return Response(
            {"commission": serializer.data, "configured": True},
            status=status.HTTP_200_OK,
        )


class PlatformCommissionCreateView(APIView):
    """
    POST /api/v1/admin/platform/commission/

    Crea una nueva configuraciâ”œâ”‚n de comisiâ”œâ”‚n y desactiva la anterior.
    Acceso: Solo SuperAdmin (IsSuperadmin).

    Body esperado (JSON):
        {
            "commission_type": "porcentaje" | "fijo" | "hibrido",
            "percentage_value": 10.00,       // requerido si porcentaje o hibrido
            "fixed_value": 5.00,             // requerido si fijo o hibrido
            "valid_from": "2026-06-01T00:00:00Z",  // opcional, default=now
            "notes": "Ajuste por acuerdo comercial Q2"  // opcional
        }

    Respuesta exitosa (201):
        { "status": "created", "commission": { ...nueva config... } }
    """
    permission_classes = [IsAuthenticated, IsSuperadmin]

    def post(self, request):
        from .serializers import PlatformCommissionCreateSerializer, PlatformCommissionReadSerializer

        serializer = PlatformCommissionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"status": "error", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Desactivar todas las comisiones activas anteriores
        PlatformCommission.objects.filter(is_active=True).update(is_active=False)

        # Crear la nueva configuraciâ”œâ”‚n
        nueva = serializer.save(
            created_by=request.user.id,
            is_active=True,
        )

        read_serializer = PlatformCommissionReadSerializer(nueva)
        return Response(
            {"status": "created", "commission": read_serializer.data},
            status=status.HTTP_201_CREATED,
        )


class PromotorDashboardSummaryView(APIView):
    """
    US27 (US-26): Dashboard financiero resumido del Promotor autenticado.
    GET /api/v1/promotor/dashboard/summary/

    Retorna KPIs agregados sobre TODOS los eventos del promotor:
      - total_eventos
      - total_tickets_vendidos
      - tasa_ocupacion_pct  (capacidad promedio utilizada)
      - ingresos_brutos     (sum total_price de compras active/used)
      - comisiones_totales  (sum commission_amount Ã”Ã‡Ã¶ disponible tras merge US567)
      - ingresos_netos      (sum net_amount Ã”Ã‡Ã¶ disponible tras merge US567)

    Permisos: IsAuthenticated + IsPromotor.
    """
    permission_classes = [IsAuthenticated, IsPromotor]

    # Compras que representan ingresos reales (pagadas y/o validadas)
    PAID_STATUSES = ['active', 'used']

    def get(self, request):
        from decimal import Decimal as D
        from django.db.models import Sum, Q
        from django.db.models.functions import Coalesce

        promoter_id = request.user.id

        # Ã”Ã¶Ã‡Ã”Ã¶Ã‡ 1. Eventos del promotor Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡
        eventos_qs = Event.objects.filter(promoter_id=promoter_id)
        total_eventos = eventos_qs.count()

        # Ã”Ã¶Ã‡Ã”Ã¶Ã‡ 2. Compras pagadas en esos eventos Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡
        compras_qs = Purchase.objects.filter(
            event__promoter_id=promoter_id,
            status__in=self.PAID_STATUSES,
        )

        total_tickets = compras_qs.aggregate(
            total=Coalesce(Sum('quantity'), 0),
        )['total']

        # Agregaciones financieras (con fallback si columnas de comisiâ”œâ”‚n aâ”œâ•‘n
        # no existen en este branch Ã”Ã‡Ã¶ se completan tras merge con US567).
        try:
            aggs = compras_qs.aggregate(
                ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
                comisiones_totales=Coalesce(Sum('commission_amount'), D('0')),
                ingresos_netos=Coalesce(Sum('net_amount'), D('0')),
            )
        except Exception:
            aggs = compras_qs.aggregate(
                ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
            )
            aggs['comisiones_totales'] = D('0')
            aggs['ingresos_netos'] = aggs['ingresos_brutos']

        # Ã”Ã¶Ã‡Ã”Ã¶Ã‡ 3. Tasa de ocupaciâ”œâ”‚n global Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡
        total_capacidad = eventos_qs.aggregate(
            cap=Coalesce(Sum('capacity'), 0),
        )['cap']
        
        from django.db.models.functions import TruncMonth

        # 4. Ingresos por mes
        monthly_qs = compras_qs.annotate(
            month=TruncMonth('event__event_date')
        ).values('month').annotate(
            ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
            ingresos_netos=Coalesce(Sum('net_amount'), D('0')) if 'net_amount' in [f.name for f in Purchase._meta.get_fields()] else Coalesce(Sum('total_price'), D('0'))
        ).order_by('month')

        ingresos_mensuales = [
            {
                'month': m['month'].strftime('%b %Y') if m['month'] else 'Sin Fecha',
                'ingresos_brutos': m['ingresos_brutos'],
                'ingresos_netos': m['ingresos_netos'],
                'time': m['month'].isoformat() if m['month'] else ''
            }
            for m in monthly_qs
        ]
        
        # Sort by timestamp to be sure
        ingresos_mensuales.sort(key=lambda x: x['time'])

        tasa_ocupacion = (
            round(total_tickets / total_capacidad * 100, 1)
            if total_capacidad else 0.0
        )

        return Response({
            'status': 'success',
            'promoter_id': str(promoter_id),
            'total_eventos': total_eventos,
            'total_tickets_vendidos': total_tickets,
            'tasa_ocupacion_pct': tasa_ocupacion,
            'ingresos_brutos': aggs['ingresos_brutos'],
            'comisiones_totales': aggs['comisiones_totales'],
            
            'ingresos_netos': aggs['ingresos_netos'],
            'ingresos_mensuales': ingresos_mensuales,

        }, status=status.HTTP_200_OK)


class PromotorDashboardComparativaView(APIView):
    """
    US27 (US-26): Comparativa financiera por evento del Promotor autenticado.
    GET /api/v1/promotor/dashboard/comparativa/?limit=5&estado=<published|completed|all>

    Parâ”œÃ­metros opcionales:
      - limit  (int, default=5, mâ”œÃ­x=20): cuâ”œÃ­ntos eventos devolver
      - estado (str, default='all'): filtrar por estado del evento

    Por cada evento retorna:
      evento_id, evento_nombre, fecha, estado, capacidad,
      tickets_vendidos, ocupacion_pct,
      ingresos_brutos, comisiones, ingresos_netos.

    Permisos: IsAuthenticated + IsPromotor.
    """
    permission_classes = [IsAuthenticated, IsPromotor]

    PAID_STATUSES = ['active', 'used']

    def get(self, request):
        from decimal import Decimal as D
        from django.db.models import Sum
        from django.db.models.functions import Coalesce

        promoter_id = request.user.id

        # Ã”Ã¶Ã‡Ã”Ã¶Ã‡ Parâ”œÃ­metros de query Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡
        try:
            limit = min(int(request.query_params.get('limit', 5)), 20)
        except (ValueError, TypeError):
            limit = 5

        estado_filtro = request.query_params.get('estado', 'all')

        # Ã”Ã¶Ã‡Ã”Ã¶Ã‡ Eventos del promotor Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡
        eventos_qs = Event.objects.filter(
            promoter_id=promoter_id,
        ).order_by('-event_date')

        if estado_filtro != 'all':
            eventos_qs = eventos_qs.filter(status=estado_filtro)

        eventos = list(eventos_qs[:limit])

        # Ã”Ã¶Ã‡Ã”Ã¶Ã‡ Construir comparativa por evento Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡
        comparativa = []
        for evento in eventos:
            compras_qs = Purchase.objects.filter(
                event=evento,
                status__in=self.PAID_STATUSES,
            )

            tickets_vendidos = compras_qs.aggregate(
                total=Coalesce(Sum('quantity'), 0),
            )['total']

            try:
                fin = compras_qs.aggregate(
                    ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
                    comisiones=Coalesce(Sum('commission_amount'), D('0')),
                    ingresos_netos=Coalesce(Sum('net_amount'), D('0')),
                )
            except Exception:
                fin = compras_qs.aggregate(
                    ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
                )
                fin['comisiones'] = D('0')
                fin['ingresos_netos'] = fin['ingresos_brutos']

            ocupacion_pct = (
                round(tickets_vendidos / evento.capacity * 100, 1)
                if evento.capacity else 0.0
            )

            comparativa.append({
                'evento_id': str(evento.id),
                'evento_nombre': evento.name,
                'fecha': str(evento.event_date),
                'estado': evento.status,
                'capacidad': evento.capacity,
                'tickets_vendidos': tickets_vendidos,
                'ocupacion_pct': ocupacion_pct,
                'ingresos_brutos': fin['ingresos_brutos'],
                'comisiones': fin['comisiones'],
                'ingresos_netos': fin['ingresos_netos'],
            })

        return Response({
            'status': 'success',
            'promoter_id': str(promoter_id),
            'limit': limit,
            'total_eventos': len(comparativa),
            'comparativa': comparativa,
        }, status=status.HTTP_200_OK)


class EventFinancialReportView(APIView):
    """
    US30 (US-27): Reporte financiero detallado de un evento especâ”œÂ¡fico.
    GET /api/v1/promotor/events/<event_id>/financial/

    Solo el promotor dueâ”œâ–’o del evento puede acceder.

    Respuesta:
      - info del evento (nombre, fecha, location, estado, capacidad)
      - resumen_financiero: ingresos_brutos, comisiones, ingresos_netos,
            total_tickets_vendidos, ocupacion_pct, total_compradores
      - desglose_por_tipo: por cada TicketType:
            nombre, zone_type, precio_unitario, max_capacity,
            tickets_vendidos, ocupacion_pct,
            ingresos_brutos, comisiones, ingresos_netos
      - top_compradores: los 5 user_id que mâ”œÃ­s gastaron en el evento

    Permisos: IsAuthenticated + IsPromotor (+ verificaciâ”œâ”‚n de ownership).
    """
    permission_classes = [IsAuthenticated, IsPromotor]

    PAID_STATUSES = ['active', 'used']

    def get(self, request, event_id):
        from decimal import Decimal as D
        from django.db.models import Sum, Count, Q
        from django.db.models.functions import Coalesce

        # Ã”Ã¶Ã‡Ã”Ã¶Ã‡ Verificar evento y ownership Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡
        evento = get_object_or_404(Event, id=event_id)
        if str(evento.promoter_id) != str(request.user.id):
            return Response(
                {'error': 'No tienes permisos. Solo el promotor dueâ”œâ–’o del evento puede acceder.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Ã”Ã¶Ã‡Ã”Ã¶Ã‡ Compras pagadas del evento Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡
        compras_qs = Purchase.objects.filter(
            event=evento,
            status__in=self.PAID_STATUSES,
        )

        total_tickets = compras_qs.aggregate(
            total=Coalesce(Sum('quantity'), 0),
        )['total']

        total_compradores = compras_qs.values('user_id').distinct().count()

        # Financiero global con fallback si US567 aâ”œâ•‘n no estâ”œÃ­ mergeado
        try:
            aggs = compras_qs.aggregate(
                ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
                comisiones=Coalesce(Sum('commission_amount'), D('0')),
                ingresos_netos=Coalesce(Sum('net_amount'), D('0')),
            )
        except Exception:
            aggs = compras_qs.aggregate(
                ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
            )
            aggs['comisiones'] = D('0')
            aggs['ingresos_netos'] = aggs['ingresos_brutos']

        ocupacion_pct = (
            round(total_tickets / evento.capacity * 100, 1)
            if evento.capacity else 0.0
        )

        # Ã”Ã¶Ã‡Ã”Ã¶Ã‡ Desglose por tipo de ticket Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡
        ticket_types = TicketType.objects.filter(event=evento)
        desglose = []
        for tt in ticket_types:
            qs_tt = compras_qs.filter(ticket_type=tt)
            tt_tickets = qs_tt.aggregate(
                total=Coalesce(Sum('quantity'), 0),
            )['total']

            try:
                tt_fin = qs_tt.aggregate(
                    ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
                    comisiones=Coalesce(Sum('commission_amount'), D('0')),
                    ingresos_netos=Coalesce(Sum('net_amount'), D('0')),
                )
            except Exception:
                tt_fin = qs_tt.aggregate(
                    ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
                )
                tt_fin['comisiones'] = D('0')
                tt_fin['ingresos_netos'] = tt_fin['ingresos_brutos']

            tt_ocupacion = (
                round(tt_tickets / tt.max_capacity * 100, 1)
                if tt.max_capacity else 0.0
            )

            desglose.append({
                'ticket_type_id': str(tt.id),
                'nombre': tt.name,
                'zone_type': tt.zone_type,
                'is_vip': tt.is_vip,
                'precio_unitario': tt.price,
                'max_capacity': tt.max_capacity,
                'tickets_vendidos': tt_tickets,
                'ocupacion_pct': tt_ocupacion,
                'ingresos_brutos': tt_fin['ingresos_brutos'],
                'comisiones': tt_fin['comisiones'],
                'ingresos_netos': tt_fin['ingresos_netos'],
            })

        # Ã”Ã¶Ã‡Ã”Ã¶Ã‡ Top 5 compradores por gasto Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡
        top_compradores = (
            compras_qs
            .values('user_id')
            .annotate(
                gasto_total=Coalesce(Sum('total_price'), D('0')),
                tickets_comprados=Coalesce(Sum('quantity'), 0),
            )
            .order_by('-gasto_total')[:5]
        )
        top_list = [
            {
                'user_id': str(c['user_id']),
                'gasto_total': c['gasto_total'],
                'tickets_comprados': c['tickets_comprados'],
            }
            for c in top_compradores
        ]

        return Response({
            'status': 'success',
            'evento': {
                'id': str(evento.id),
                'nombre': evento.name,
                'fecha': str(evento.event_date),
                'hora': str(evento.event_time) if evento.event_time else None,
                'location': evento.location,
                'estado': evento.status,
                'admin_status': evento.admin_status,
                'capacidad': evento.capacity,
            },
            'resumen_financiero': {
                'total_tickets_vendidos': total_tickets,
                'total_compradores': total_compradores,
                'ocupacion_pct': ocupacion_pct,
                'ingresos_brutos': aggs['ingresos_brutos'],
                'comisiones': aggs['comisiones'],
                'ingresos_netos': aggs['ingresos_netos'],
            },
            'desglose_por_tipo': desglose,
            'top_compradores': top_list,
        }, status=status.HTTP_200_OK)


# â”€â”€â”€ US33 (US-28): Lista de Compradores por Evento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class EventBuyersListView(APIView):
    """
    US33 (US-28): Lista paginada de compradores de un evento.
    GET /api/v1/promotor/events/<event_id>/buyers/

    Solo el promotor dueÃ±o del evento puede acceder.

    ParÃ¡metros opcionales (query string):
      - status      (str): filtrar por estado de compra
                           (active|used|pending|cancelled|expired|all)
      - ticket_type_id (uuid): filtrar por tipo de ticket
      - ordering    (str): campo de ordenaciÃ³n precedido de '-' para desc
                           (created_at, total_price, quantity). Default: -created_at
      - page        (int): nÃºmero de pÃ¡gina. Default: 1
      - page_size   (int): resultados por pÃ¡gina. Default: 20, mÃ¡x: 100

    Respuesta:
      - resumen: total_compradores Ãºnicos, total_tickets, total_ingresos
      - paginaciÃ³n: count, total_pages, page, page_size, next, previous
      - results: lista de compras con user_id, purchase_id, ticket_type,
                 quantity, total_price, discount_amount, status, created_at,
                 backup_code

    Nota: discount_amount disponible tras merge con US35.
    Permisos: IsAuthenticated + IsPromotor.
    """
    permission_classes = [IsAuthenticated, IsPromotor]

    ALLOWED_ORDERINGS = {
        'created_at': 'created_at',
        '-created_at': '-created_at',
        'total_price': 'total_price',
        '-total_price': '-total_price',
        'quantity': 'quantity',
        '-quantity': '-quantity',
    }

    def get(self, request, event_id):
        from decimal import Decimal as D
        from django.db.models import Sum, Count
        from django.db.models.functions import Coalesce
        from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

        # â”€â”€ Verificar evento y ownership â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        evento = get_object_or_404(Event, id=event_id)
        if str(evento.promoter_id) != str(request.user.id):
            return Response(
                {'error': 'No tienes permisos. Solo el promotor dueÃ±o del evento puede acceder.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # â”€â”€ ParÃ¡metros de query â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        status_filtro = request.query_params.get('status', 'all')
        ticket_type_id = request.query_params.get('ticket_type_id')
        ordering_param = request.query_params.get('ordering', '-created_at')
        ordering = self.ALLOWED_ORDERINGS.get(ordering_param, '-created_at')

        try:
            page_num = max(1, int(request.query_params.get('page', 1)))
        except (ValueError, TypeError):
            page_num = 1

        try:
            page_size = min(max(1, int(request.query_params.get('page_size', 20))), 100)
        except (ValueError, TypeError):
            page_size = 20

        # â”€â”€ ConstrucciÃ³n del queryset â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        compras_qs = Purchase.objects.filter(event=evento).select_related('ticket_type')

        if status_filtro != 'all':
            compras_qs = compras_qs.filter(status=status_filtro)

        if ticket_type_id:
            compras_qs = compras_qs.filter(ticket_type_id=ticket_type_id)

        compras_qs = compras_qs.order_by(ordering)

        # â”€â”€ Resumen (antes de paginar) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        # Solo compras activas/usadas para el resumen financiero
        compras_pagadas = compras_qs.filter(status__in=['active', 'used'])
        compradores_unicos = compras_qs.values('user_id').distinct().count()
        total_tickets = compras_pagadas.aggregate(
            t=Coalesce(Sum('quantity'), 0)
        )['t']
        try:
            total_ingresos = compras_pagadas.aggregate(
                i=Coalesce(Sum('total_price'), D('0'))
            )['i']
        except Exception:
            total_ingresos = D('0')

        # â”€â”€ PaginaciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        paginator = Paginator(compras_qs, page_size)
        total_count = compras_qs.count()
        total_pages = paginator.num_pages

        try:
            page_obj = paginator.page(page_num)
        except (EmptyPage, PageNotAnInteger):
            page_obj = paginator.page(1)
            page_num = 1

        # â”€â”€ Serializar resultados â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        results = []
        for compra in page_obj.object_list:
            tt = compra.ticket_type
            entry = {
                'purchase_id': str(compra.id),
                'user_id': str(compra.user_id),
                'ticket_type_id': str(tt.id) if tt else None,
                'ticket_type_nombre': tt.name if tt else None,
                'zone_type': tt.zone_type if tt else None,
                'is_vip': tt.is_vip if tt else False,
                'quantity': compra.quantity,
                'total_price': compra.total_price,
                'status': compra.status,
                'created_at': compra.created_at.isoformat(),
                'backup_code': compra.backup_code,
                'used_at': compra.used_at.isoformat() if compra.used_at else None,
            }
            # Campos opcionales de US35 (discount) â€” presentes tras merge
            if hasattr(compra, 'discount_amount'):
                entry['discount_amount'] = compra.discount_amount
            if hasattr(compra, 'promo_code_id') and compra.promo_code_id:
                entry['promo_code'] = str(compra.promo_code_id)
            results.append(entry)

        # â”€â”€ Construir URLs de paginaciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        base_url = request.build_absolute_uri(request.path)

        def _page_url(p):
            params = request.query_params.copy()
            params['page'] = p
            params['page_size'] = page_size
            return f"{base_url}?{'&'.join(f'{k}={v}' for k, v in params.items())}"

        return Response({
            'status': 'success',
            'resumen': {
                'total_compradores': compradores_unicos,
                'total_tickets': total_tickets,
                'total_ingresos': total_ingresos,
            },
            'paginacion': {
                'count': total_count,
                'total_pages': total_pages,
                'page': page_num,
                'page_size': page_size,
                'next': _page_url(page_num + 1) if page_obj.has_next() else None,
                'previous': _page_url(page_num - 1) if page_obj.has_previous() else None,
            },
            'results': results,
        }, status=status.HTTP_200_OK)


def _build_buyers_rows(compras_qs):
    """Helper: retorna (header, filas) para el reporte de compradores."""
    header = [
        'purchase_id', 'user_id', 'ticket_type', 'zone_type',
        'quantity', 'total_price', 'status', 'created_at', 'backup_code',
    ]
    rows = []
    for c in compras_qs.select_related('ticket_type'):
        tt = c.ticket_type
        rows.append([
            str(c.id),
            str(c.user_id),
            tt.name if tt else '',
            tt.zone_type if tt else '',
            c.quantity,
            str(c.total_price),
            c.status,
            c.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            c.backup_code or '',
        ])
    return header, rows


def _csv_response(filename, header, rows):
    """Genera un HttpResponse con Content-Type text/csv."""
    import csv
    from django.http import HttpResponse

    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response.write('Â´â•—â”')          # BOM UTF-8 para compatibilidad con Excel
    writer = csv.writer(response)
    writer.writerow(header)
    writer.writerows(rows)
    return response


def _pdf_response(filename, title, subtitle, header, rows):
    """
    Genera un HttpResponse con Content-Type application/pdf usando ReportLab.
    Crea un documento con tâ”œÂ¡tulo, subtâ”œÂ¡tulo y tabla de datos.
    """
    import io
    from django.http import HttpResponse
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    elements = []

    # Tâ”œÂ¡tulo y subtâ”œÂ¡tulo
    elements.append(Paragraph(title, styles['Title']))
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(Paragraph(subtitle, styles['Normal']))
    elements.append(Spacer(1, 0.6 * cm))

    # Tabla
    table_data = [header] + [[str(cell) for cell in row] for row in rows]
    col_count = len(header)
    available_width = landscape(A4)[0] - 3 * cm
    col_width = available_width / col_count

    table = Table(table_data, colWidths=[col_width] * col_count, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563EB')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#EFF6FF')]),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response.write(pdf_bytes)
    return response


class ExportEventBuyersView(APIView):
    """
    US36 (US-33): Exportar lista de compradores de un evento.
    GET /api/v1/promotor/events/<event_id>/buyers/export/?format=csv|pdf

    Solo el promotor dueâ”œâ–’o del evento puede acceder.
    Parâ”œÃ­metros:
      - format: 'csv' (default) o 'pdf'
      - status: filtrar por estado (default: active,used)

    Permisos: IsAuthenticated + IsPromotor.
    """
    permission_classes = [IsAuthenticated, IsPromotor]

    def get(self, request, event_id):
        evento = get_object_or_404(Event, id=event_id)
        if str(evento.promoter_id) != str(request.user.id):
            return Response(
                {'error': 'No tienes permisos sobre este evento.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        status_filtro = request.query_params.get('status', 'active,used')
        status_list = [s.strip() for s in status_filtro.split(',') if s.strip()]
        compras_qs = Purchase.objects.filter(event=evento, status__in=status_list)

        fmt = request.query_params.get('format', 'csv').lower()
        header, rows = _build_buyers_rows(compras_qs)
        safe_name = evento.name.replace(' ', '_')[:30]

        if fmt == 'pdf':
            from django.utils import timezone as _tz
            subtitle = (
                f"Evento: {evento.name} | Fecha: {evento.event_date} | "
                f"Generado: {_tz.now().strftime('%Y-%m-%d %H:%M')}"
            )
            return _pdf_response(
                filename=f"compradores_{safe_name}.pdf",
                title="Lista de Compradores",
                subtitle=subtitle,
                header=header,
                rows=rows,
            )

        return _csv_response(f"compradores_{safe_name}.csv", header, rows)


class ExportEventFinancialView(APIView):
    """
    US36 (US-33): Exportar reporte financiero de un evento.
    GET /api/v1/promotor/events/<event_id>/financial/export/?format=csv|pdf

    Exporta el desglose financiero por tipo de ticket del evento.
    Solo el promotor dueâ”œâ–’o puede acceder.

    Permisos: IsAuthenticated + IsPromotor.
    """
    permission_classes = [IsAuthenticated, IsPromotor]

    PAID_STATUSES = ['active', 'used']

    def get(self, request, event_id):
        from decimal import Decimal as D
        from django.db.models import Sum
        from django.db.models.functions import Coalesce

        evento = get_object_or_404(Event, id=event_id)
        if str(evento.promoter_id) != str(request.user.id):
            return Response(
                {'error': 'No tienes permisos sobre este evento.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        compras_qs = Purchase.objects.filter(event=evento, status__in=self.PAID_STATUSES)

        # Resumen global
        total_tickets = compras_qs.aggregate(t=Coalesce(Sum('quantity'), 0))['t']
        try:
            aggs = compras_qs.aggregate(
                ingresos=Coalesce(Sum('total_price'), D('0')),
                comisiones=Coalesce(Sum('commission_amount'), D('0')),
                netos=Coalesce(Sum('net_amount'), D('0')),
            )
        except Exception:
            aggs = compras_qs.aggregate(ingresos=Coalesce(Sum('total_price'), D('0')))
            aggs.update({'comisiones': D('0'), 'netos': aggs['ingresos']})

        # Desglose por ticket type
        header = [
            'Tipo Ticket', 'Zona', 'VIP', 'Precio Unit.',
            'Capacidad', 'Vendidos', 'Ocupacion %',
            'Ingresos Brutos', 'Comisiones', 'Ingresos Netos',
        ]
        rows = []
        for tt in TicketType.objects.filter(event=evento):
            qs_tt = compras_qs.filter(ticket_type=tt)
            tt_tix = qs_tt.aggregate(t=Coalesce(Sum('quantity'), 0))['t']
            try:
                tt_fin = qs_tt.aggregate(
                    ing=Coalesce(Sum('total_price'), D('0')),
                    com=Coalesce(Sum('commission_amount'), D('0')),
                    net=Coalesce(Sum('net_amount'), D('0')),
                )
            except Exception:
                tt_fin = qs_tt.aggregate(ing=Coalesce(Sum('total_price'), D('0')))
                tt_fin.update({'com': D('0'), 'net': tt_fin['ing']})

            oc = round(tt_tix / tt.max_capacity * 100, 1) if tt.max_capacity else 0.0
            rows.append([
                tt.name, tt.zone_type, 'Sâ”œÂ¡' if tt.is_vip else 'No',
                str(tt.price), tt.max_capacity, tt_tix, f"{oc}%",
                str(tt_fin['ing']), str(tt_fin['com']), str(tt_fin['net']),
            ])

        # Fila de totales
        rows.append([
            'TOTAL', '', '', '',
            evento.capacity, total_tickets,
            f"{round(total_tickets/evento.capacity*100,1) if evento.capacity else 0}%",
            str(aggs['ingresos']), str(aggs['comisiones']), str(aggs['netos']),
        ])

        fmt = request.query_params.get('format', 'csv').lower()
        safe_name = evento.name.replace(' ', '_')[:30]

        if fmt == 'pdf':
            from django.utils import timezone as _tz
            subtitle = (
                f"Evento: {evento.name} | Fecha: {evento.event_date} | "
                f"Generado: {_tz.now().strftime('%Y-%m-%d %H:%M')}"
            )
            return _pdf_response(
                filename=f"financiero_{safe_name}.pdf",
                title="Reporte Financiero por Evento",
                subtitle=subtitle,
                header=header,
                rows=rows,
            )

        return _csv_response(f"financiero_{safe_name}.csv", header, rows)


class AdminExportEventBuyersView(APIView):
    """
    US36 (US-33): El Admin exporta la lista de compradores de cualquier evento.
    GET /api/v1/admin/events/<event_id>/buyers/export/?format=csv|pdf

    Sin restricciâ”œâ”‚n de ownership Ã”Ã‡Ã¶ el Admin puede exportar cualquier evento.
    Expone promoter_id en el nombre del archivo para identificaciâ”œâ”‚n.

    Permisos: IsAuthenticated + HasAdminCapability('view_reports').
    """
    permission_classes = [IsAuthenticated, HasAdminCapability('view_reports')]

    def get(self, request, event_id):
        evento = get_object_or_404(Event, id=event_id)
        compras_qs = Purchase.objects.filter(
            event=evento,
            status__in=['active', 'used'],
        )

        fmt = request.query_params.get('format', 'csv').lower()
        header, rows = _build_buyers_rows(compras_qs)
        safe_name = evento.name.replace(' ', '_')[:30]

        if fmt == 'pdf':
            from django.utils import timezone as _tz
            subtitle = (
                f"Evento: {evento.name} | Promotor: {evento.promoter_id} | "
                f"Fecha: {evento.event_date} | Generado: {_tz.now().strftime('%Y-%m-%d %H:%M')}"
            )
            return _pdf_response(
                filename=f"admin_compradores_{safe_name}.pdf",
                title="Lista de Compradores (Admin)",
                subtitle=subtitle,
                header=header,
                rows=rows,
            )

        return _csv_response(f"admin_compradores_{safe_name}.csv", header, rows)


# ==============================================================================
# HISTORIA DE USUARIO: REPORTES DE PROMOTOR (TIC-150)
# ==============================================================================

class PromotorEventBuyersSummaryView(APIView):
    """
    TIC-150: GET /promotor/events/{event_id}/buyers/summary
    Retorna las mÃ©tricas clave de recaudaciÃ³n, compradores Ãºnicos y entradas vendidas.
    """
    permission_classes = [IsPromotor]

    def get(self, request, event_id):
        payload = getattr(request.auth, 'payload', {}) if request.auth else {}
        promotor_id = payload.get('user_id')

        try:
            event = Event.objects.get(id=event_id, promotor_id=promotor_id)
        except Event.DoesNotExist:
            return Response(
                {"error": "Evento no encontrado o no tienes autorizaciÃ³n sobre Ã©l."},
                status=status.HTTP_404_NOT_FOUND
            )

        from .models import Ticket 
        
        metrics = Ticket.objects.filter(event_id=event_id).aggregate(
            total_entradas=Count('id'),
            total_compradores=Count('user_id', distinct=True),
            total_recaudado=Sum('price')
        )

        return Response({
            "event_id": event_id,
            "event_name": event.name,
            "total_recaudado": metrics['total_recaudado'] or 0.0,
            "total_compradores": metrics['total_compradores'] or 0,
            "total_entradas": metrics['total_entradas'] or 0
        }, status=status.HTTP_200_OK)
    
class PromotorEventBuyersListView(ListAPIView):
    """
    TIC-151: GET /promotor/events/{event_id}/buyers/
    Retorna la lista de compradores de un evento especÃ­fico.
    """
    permission_classes = [IsPromotor]

    def get_queryset(self):
        event_id = self.kwargs.get('event_id')
        
        payload = getattr(self.request.auth, 'payload', {}) if self.request.auth else {}
        promotor_id = payload.get('user_id')

        if not Event.objects.filter(id=event_id, promotor_id=promotor_id).exists():
            return Purchase.objects.none()

        search_query = self.request.query_params.get('search', '').strip()
        
        queryset = Purchase.objects.filter(
            ticket_type__event_id=event_id
        )

        if search_query:
            queryset = queryset.filter(
                Q(user_id__icontains=search_query)
            )

        return queryset.order_by('-id')


# â”€â”€â”€ US34 (US-29): Admin ve Dashboard Financiero de cualquier Promotor â”€â”€â”€â”€â”€â”€â”€â”€

class AdminPromotorSummaryView(APIView):
    """
    US34 (US-29): El Administrador consulta el resumen financiero de cualquier Promotor.
    GET /api/v1/admin/promotor/<promoter_id>/summary/
    """
    permission_classes = [IsAuthenticated, HasAdminCapability('view_reports')]
    PAID_STATUSES = ['active', 'used']

    def get(self, request, promoter_id):
        from decimal import Decimal as D
        from django.db.models import Sum
        from django.db.models.functions import Coalesce

        eventos_qs = Event.objects.filter(promoter_id=promoter_id)
        total_eventos = eventos_qs.count()
        if total_eventos == 0:
            return Response(
                {'error': 'No se encontraron eventos para el promotor indicado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        compras_qs = Purchase.objects.filter(
            event__promoter_id=promoter_id,
            status__in=self.PAID_STATUSES,
        )
        total_tickets = compras_qs.aggregate(
            total=Coalesce(Sum('quantity'), 0),
        )['total']

        try:
            aggs = compras_qs.aggregate(
                ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
                comisiones_totales=Coalesce(Sum('commission_amount'), D('0')),
                ingresos_netos=Coalesce(Sum('net_amount'), D('0')),
            )
        except Exception:
            aggs = compras_qs.aggregate(
                ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
            )
            aggs['comisiones_totales'] = D('0')
            aggs['ingresos_netos'] = aggs['ingresos_brutos']

        total_capacidad = eventos_qs.aggregate(
            cap=Coalesce(Sum('capacity'), 0),
        )['cap']
        tasa_ocupacion = (
            round(total_tickets / total_capacidad * 100, 1)
            if total_capacidad else 0.0
        )

        return Response({
            'status': 'success',
            'promoter_id': str(promoter_id),
            'total_eventos': total_eventos,
            'total_tickets_vendidos': total_tickets,
            'tasa_ocupacion_pct': tasa_ocupacion,
            'ingresos_brutos': aggs['ingresos_brutos'],
            'comisiones_totales': aggs['comisiones_totales'],
            'ingresos_netos': aggs['ingresos_netos'],
        }, status=status.HTTP_200_OK)


class AdminPromotorComparativaView(APIView):
    """
    US34 (US-29): El Administrador consulta la comparativa por evento de cualquier Promotor.
    GET /api/v1/admin/promotor/<promoter_id>/comparativa/
    """
    permission_classes = [IsAuthenticated, HasAdminCapability('view_reports')]
    PAID_STATUSES = ['active', 'used']

    def get(self, request, promoter_id):
        from decimal import Decimal as D
        from django.db.models import Sum
        from django.db.models.functions import Coalesce

        try:
            limit = min(int(request.query_params.get('limit', 5)), 20)
        except (ValueError, TypeError):
            limit = 5

        estado_filtro = request.query_params.get('estado', 'all')
        eventos_qs = Event.objects.filter(promoter_id=promoter_id).order_by('-event_date')
        if estado_filtro != 'all':
            eventos_qs = eventos_qs.filter(status=estado_filtro)

        eventos = list(eventos_qs[:limit])
        comparativa = []
        for evento in eventos:
            compras_qs = Purchase.objects.filter(event=evento, status__in=self.PAID_STATUSES)
            tickets_vendidos = compras_qs.aggregate(total=Coalesce(Sum('quantity'), 0))['total']
            try:
                fin = compras_qs.aggregate(
                    ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
                    comisiones=Coalesce(Sum('commission_amount'), D('0')),
                    ingresos_netos=Coalesce(Sum('net_amount'), D('0')),
                )
            except Exception:
                fin = compras_qs.aggregate(ingresos_brutos=Coalesce(Sum('total_price'), D('0')))
                fin['comisiones'] = D('0')
                fin['ingresos_netos'] = fin['ingresos_brutos']

            ocupacion_pct = (
                round(tickets_vendidos / evento.capacity * 100, 1) if evento.capacity else 0.0
            )
            comparativa.append({
                'evento_id': str(evento.id),
                'evento_nombre': evento.name,
                'fecha': str(evento.event_date),
                'estado': evento.status,
                'capacidad': evento.capacity,
                'tickets_vendidos': tickets_vendidos,
                'ocupacion_pct': ocupacion_pct,
                'ingresos_brutos': fin['ingresos_brutos'],
                'comisiones': fin['comisiones'],
                'ingresos_netos': fin['ingresos_netos'],
            })

        return Response({
            'status': 'success',
            'promoter_id': str(promoter_id),
            'limit': limit,
            'total_eventos': len(comparativa),
            'comparativa': comparativa,
        }, status=status.HTTP_200_OK)


class AdminEventFinancialReportView(APIView):
    """
    US34 (US-29): El Administrador consulta el reporte financiero detallado de un evento.
    GET /api/v1/admin/events/<event_id>/financial/
    """
    permission_classes = [IsAuthenticated, HasAdminCapability('view_reports')]
    PAID_STATUSES = ['active', 'used']

    def get(self, request, event_id):
        from decimal import Decimal as D
        from django.db.models import Sum, Count
        from django.db.models.functions import Coalesce

        evento = get_object_or_404(Event, id=event_id)
        compras_qs = Purchase.objects.filter(event=evento, status__in=self.PAID_STATUSES)
        total_tickets = compras_qs.aggregate(total=Coalesce(Sum('quantity'), 0))['total']
        total_compradores = compras_qs.values('user_id').distinct().count()

        try:
            aggs = compras_qs.aggregate(
                ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
                comisiones=Coalesce(Sum('commission_amount'), D('0')),
                ingresos_netos=Coalesce(Sum('net_amount'), D('0')),
            )
        except Exception:
            aggs = compras_qs.aggregate(ingresos_brutos=Coalesce(Sum('total_price'), D('0')))
            aggs['comisiones'] = D('0')
            aggs['ingresos_netos'] = aggs['ingresos_brutos']

        ocupacion_pct = (
            round(total_tickets / evento.capacity * 100, 1) if evento.capacity else 0.0
        )

        ticket_types = TicketType.objects.filter(event=evento)
        desglose = []
        for tt in ticket_types:
            qs_tt = compras_qs.filter(ticket_type=tt)
            tt_tickets = qs_tt.aggregate(total=Coalesce(Sum('quantity'), 0))['total']
            try:
                tt_fin = qs_tt.aggregate(
                    ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
                    comisiones=Coalesce(Sum('commission_amount'), D('0')),
                    ingresos_netos=Coalesce(Sum('net_amount'), D('0')),
                )
            except Exception:
                tt_fin = qs_tt.aggregate(ingresos_brutos=Coalesce(Sum('total_price'), D('0')))
                tt_fin['comisiones'] = D('0')
                tt_fin['ingresos_netos'] = tt_fin['ingresos_brutos']

            tt_ocupacion = (
                round(tt_tickets / tt.max_capacity * 100, 1) if tt.max_capacity else 0.0
            )
            desglose.append({
                'ticket_type_id': str(tt.id),
                'nombre': tt.name,
                'zone_type': tt.zone_type,
                'is_vip': tt.is_vip,
                'precio_unitario': tt.price,
                'max_capacity': tt.max_capacity,
                'tickets_vendidos': tt_tickets,
                'ocupacion_pct': tt_ocupacion,
                'ingresos_brutos': tt_fin['ingresos_brutos'],
                'comisiones': tt_fin['comisiones'],
                'ingresos_netos': tt_fin['ingresos_netos'],
            })

        top_compradores = (
            compras_qs.values('user_id')
            .annotate(
                gasto_total=Coalesce(Sum('total_price'), D('0')),
                tickets_comprados=Coalesce(Sum('quantity'), 0),
            )
            .order_by('-gasto_total')[:5]
        )

        return Response({
            'status': 'success',
            'evento': {
                'id': str(evento.id),
                'nombre': evento.name,
                'fecha': str(evento.event_date),
                'hora': str(evento.event_time) if evento.event_time else None,
                'location': evento.location,
                'estado': evento.status,
                'admin_status': evento.admin_status,
                'capacidad': evento.capacity,
                'promoter_id': str(evento.promoter_id),
            },
            'resumen_financiero': {
                'total_tickets_vendidos': total_tickets,
                'total_compradores': total_compradores,
                'ocupacion_pct': ocupacion_pct,
                'ingresos_brutos': aggs['ingresos_brutos'],
                'comisiones': aggs['comisiones'],
                'ingresos_netos': aggs['ingresos_netos'],
            },
            'desglose_por_tipo': desglose,
            'top_compradores': [
                {
                    'user_id': str(c['user_id']),
                    'gasto_total': c['gasto_total'],
                    'tickets_comprados': c['tickets_comprados'],
                }
                for c in top_compradores
            ],
        }, status=status.HTTP_200_OK)


# â”€â”€â”€ US566 (US-32): Dashboard Financiero Global del Sistema (SuperAdmin) â”€â”€â”€â”€â”€â”€

class SuperAdminGlobalDashboardView(APIView):
    """
    US566 (US-32): Dashboard financiero global de la plataforma.
    GET /api/v1/superadmin/dashboard/global/
    """
    permission_classes = [IsAuthenticated, IsSuperadmin]
    PAID_STATUSES = ['active', 'used']

    def get(self, request):
        from decimal import Decimal as D
        from django.db.models import Sum, Count
        from django.db.models.functions import Coalesce

        total_eventos = Event.objects.count()
        total_promotores = Event.objects.values('promoter_id').distinct().count()

        compras_qs = Purchase.objects.filter(status__in=self.PAID_STATUSES)
        total_compradores = compras_qs.values('user_id').distinct().count()
        total_tickets = compras_qs.aggregate(t=Coalesce(Sum('quantity'), 0))['t']

        try:
            aggs = compras_qs.aggregate(
                ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
                comisiones=Coalesce(Sum('commission_amount'), D('0')),
                ingresos_netos=Coalesce(Sum('net_amount'), D('0')),
            )
        except Exception:
            aggs = compras_qs.aggregate(ingresos_brutos=Coalesce(Sum('total_price'), D('0')))
            aggs['comisiones'] = D('0')
            aggs['ingresos_netos'] = aggs['ingresos_brutos']

        try:
            from .models import EventPromotion
            ingresos_promociones = (
                EventPromotion.objects.filter(status='active')
                .aggregate(total=Coalesce(Sum('amount_paid'), D('0')))
            )['total']
        except Exception:
            ingresos_promociones = D('0')

        total_ingresos_plataforma = aggs['comisiones'] + ingresos_promociones

        top_categorias_qs = (
            compras_qs
            .values('event__category__id', 'event__category__name')
            .annotate(
                tickets=Coalesce(Sum('quantity'), 0),
                ingresos=Coalesce(Sum('total_price'), D('0')),
            )
            .order_by('-tickets')[:5]
        )
        top_categorias = [
            {
                'categoria_id': str(r['event__category__id']) if r['event__category__id'] else None,
                'categoria_nombre': r['event__category__name'] or 'Sin categorÃ­a',
                'tickets_vendidos': r['tickets'],
                'ingresos': r['ingresos'],
            }
            for r in top_categorias_qs
        ]

        return Response({
            'status': 'success',
            'resumen_plataforma': {
                'total_eventos': total_eventos,
                'total_promotores_unicos': total_promotores,
                'total_compradores_unicos': total_compradores,
                'total_tickets_vendidos': total_tickets,
            },
            'financiero': {
                'ingresos_brutos_plataforma': aggs['ingresos_brutos'],
                'comisiones_plataforma': aggs['comisiones'],
                'ingresos_netos_promotores': aggs['ingresos_netos'],
                'ingresos_por_promociones': ingresos_promociones,
                'total_ingresos_plataforma': total_ingresos_plataforma,
            },
            'top_categorias': top_categorias,
        }, status=status.HTTP_200_OK)


class SuperAdminPromotorRankingView(APIView):
    """
    US566 (US-32): Ranking de Promotores por ingresos generados.
    GET /api/v1/superadmin/dashboard/promotores/
    """
    permission_classes = [IsAuthenticated, IsSuperadmin]
    PAID_STATUSES = ['active', 'used']

    def get(self, request):
        from decimal import Decimal as D
        from django.db.models import Sum, Count
        from django.db.models.functions import Coalesce

        try:
            limit = min(int(request.query_params.get('limit', 10)), 50)
        except (ValueError, TypeError):
            limit = 10

        ordering_param = request.query_params.get('ordering', '-ingresos_brutos')

        try:
            ranking_qs = (
                Purchase.objects.filter(status__in=self.PAID_STATUSES)
                .values('event__promoter_id')
                .annotate(
                    tickets_vendidos=Coalesce(Sum('quantity'), 0),
                    ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
                    comisiones=Coalesce(Sum('commission_amount'), D('0')),
                    ingresos_netos=Coalesce(Sum('net_amount'), D('0')),
                )
            )
        except Exception:
            ranking_qs = (
                Purchase.objects.filter(status__in=self.PAID_STATUSES)
                .values('event__promoter_id')
                .annotate(
                    tickets_vendidos=Coalesce(Sum('quantity'), 0),
                    ingresos_brutos=Coalesce(Sum('total_price'), D('0')),
                )
            )

        VALID_ORDERINGS = {
            '-ingresos_brutos': '-ingresos_brutos',
            '-tickets_vendidos': '-tickets_vendidos',
            'ingresos_brutos': 'ingresos_brutos',
            'tickets_vendidos': 'tickets_vendidos',
        }
        ordering = VALID_ORDERINGS.get(ordering_param, '-ingresos_brutos')
        ranking_list = list(ranking_qs.order_by(ordering)[:limit])

        promotores_ids = [r['event__promoter_id'] for r in ranking_list]
        eventos_por_promotor = dict(
            Event.objects.filter(promoter_id__in=promotores_ids)
            .values('promoter_id').annotate(total=Count('id'))
            .values_list('promoter_id', 'total')
        )
        capacidad_por_promotor = dict(
            Event.objects.filter(promoter_id__in=promotores_ids)
            .values('promoter_id').annotate(cap=Coalesce(Sum('capacity'), 0))
            .values_list('promoter_id', 'cap')
        )

        resultados = []
        for i, r in enumerate(ranking_list, start=1):
            pid = r['event__promoter_id']
            total_ev = eventos_por_promotor.get(pid, 0)
            cap = capacidad_por_promotor.get(pid, 0)
            tickets = r['tickets_vendidos']
            tasa = round(tickets / cap * 100, 1) if cap else 0.0
            resultados.append({
                'posicion': i,
                'promoter_id': str(pid),
                'total_eventos': total_ev,
                'tickets_vendidos': tickets,
                'tasa_ocupacion_pct': tasa,
                'ingresos_brutos': r['ingresos_brutos'],
                'comisiones': r.get('comisiones', D('0')),
                'ingresos_netos': r.get('ingresos_netos', r['ingresos_brutos']),
            })

        return Response({
            'status': 'success',
            'limit': limit,
            'total_promotores': len(resultados),
            'ranking': resultados,
        }, status=status.HTTP_200_OK)


class SuperAdminDashboardSummaryView(APIView):
    """TIC-200: GET /admin/dashboard/summary"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        payload = getattr(request.auth, 'payload', {}) if request.auth else {}
        is_superuser = payload.get('is_superuser', False)
        user_role = payload.get('role', '')
        if not is_superuser and user_role != 'Administrador':
            return Response({"error": "Acceso denegado."}, status=status.HTTP_403_FORBIDDEN)
        try:
            ticket_metrics = Ticket.objects.aggregate(total_tickets=Count('id'), total_comisiones=Sum('comision'))
            promo_metrics = Event.objects.filter(is_featured=True).aggregate(total_promo=Sum('promotion_fee'))
            promotores_cnt = Event.objects.filter(status='published').values('promotor_id').distinct().count()
            raw_data = {
                "ingresos_comisiones": float(ticket_metrics['total_comisiones'] or 0.0),
                "ingresos_promociones": float(promo_metrics['total_promo'] or 0.0),
                "total_sistema": float(ticket_metrics['total_comisiones'] or 0.0) + float(promo_metrics['total_promo'] or 0.0),
                "tickets_vendidos": ticket_metrics['total_tickets'] or 0,
                "promotores_activos": promotores_cnt
            }
            serializer = DashboardSummarySerializer(raw_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SuperAdminTopPromotorsView(APIView):
    """TIC-201: GET /admin/dashboard/top-promotors"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        payload = getattr(request.auth, 'payload', {}) if request.auth else {}
        is_superuser = payload.get('is_superuser', False)
        user_role = payload.get('role', '')
        if not is_superuser and user_role != 'Administrador':
            return Response({"error": "Acceso denegado."}, status=status.HTTP_403_FORBIDDEN)
        try:
            top_promotores = (
                Ticket.objects.values('event__promotor_id')
                .annotate(
                    promotor_id=models.F('event__promotor_id'),
                    total_generado=Sum('comision'),
                    eventos_publicados=Count('event_id', distinct=True)
                )
                .order_by('-total_generado')[:10]
            )
            serializer = TopPromotorSerializer(top_promotores, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SuperAdminDashboardEvolutionView(APIView):
    """TIC-202: GET /admin/dashboard/evolution"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        payload = getattr(request.auth, 'payload', {}) if request.auth else {}
        is_superuser = payload.get('is_superuser', False)
        user_role = payload.get('role', '')
        if not is_superuser and user_role != 'Administrador':
            return Response({"error": "Acceso denegado."}, status=status.HTTP_403_FORBIDDEN)
        try:
            evolucion_ingresos = (
                Ticket.objects.annotate(month=TruncMonth('created_at'))
                .values('month')
                .annotate(ingresos_comisiones=Sum('comision'))
                .order_by('month')
            )
            data_formateada = []
            for registro in evolucion_ingresos:
                if registro['month']:
                    data_formateada.append({
                        "mes": registro['month'].strftime('%Y-%m'),
                        "ingresos_comisiones": float(registro['ingresos_comisiones'] or 0.0)
                    })
            serializer = DashboardEvolutionSerializer(data_formateada, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class PromoCodeListCreateView(APIView):
    """
    GET  /api/v1/promotor/promo-codes/   ÔåÆ lista c+¦digos del Promotor autenticado
    POST /api/v1/promotor/promo-codes/   ÔåÆ crea un nuevo c+¦digo de promoci+¦n

    Acceso: solo Promotor (IsPromotor). El promoter_id se toma del JWT.
    """
    permission_classes = [IsAuthenticated, IsPromotor]

    def get(self, request):
        from .serializers import PromoCodeReadSerializer
        promoter_id = request.user.id
        codes = PromoCode.objects.filter(promoter_id=promoter_id).order_by('-created_at')
        serializer = PromoCodeReadSerializer(codes, many=True)
        return Response({
            "status": "ok",
            "total": codes.count(),
            "results": serializer.data,
        }, status=status.HTTP_200_OK)

    def post(self, request):
        from .serializers import PromoCodeCreateSerializer, PromoCodeReadSerializer
        serializer = PromoCodeCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"status": "error", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verificar que el evento (si se envi+¦) pertenece al promotor
        event = serializer.validated_data.get('event')
        if event and str(event.promoter_id) != str(request.user.id):
            return Response(
                {"status": "error", "detail": "El evento no pertenece a tu cuenta."},
                status=status.HTTP_403_FORBIDDEN,
            )

        code = serializer.save(promoter_id=request.user.id)
        return Response(
            {"status": "created", "promo_code": PromoCodeReadSerializer(code).data},
            status=status.HTTP_201_CREATED,
        )


class PromoCodeDetailView(APIView):
    """
    GET    /api/v1/promotor/promo-codes/{id}/  ÔåÆ detalle
    PATCH  /api/v1/promotor/promo-codes/{id}/  ÔåÆ actualizar
    DELETE /api/v1/promotor/promo-codes/{id}/  ÔåÆ desactivar (soft delete)

    Acceso: solo el Promotor propietario del c+¦digo.
    """
    permission_classes = [IsAuthenticated, IsPromotor]

    def _get_own_code(self, request, pk):
        return get_object_or_404(PromoCode, id=pk, promoter_id=request.user.id)

    def get(self, request, pk):
        from .serializers import PromoCodeReadSerializer
        code = self._get_own_code(request, pk)
        return Response(PromoCodeReadSerializer(code).data)

    def patch(self, request, pk):
        from .serializers import PromoCodeCreateSerializer, PromoCodeReadSerializer
        code = self._get_own_code(request, pk)
        serializer = PromoCodeCreateSerializer(code, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                {"status": "error", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Verificar que el nuevo evento (si cambi+¦) sigue siendo del promotor
        event = serializer.validated_data.get('event')
        if event and str(event.promoter_id) != str(request.user.id):
            return Response(
                {"status": "error", "detail": "El evento no pertenece a tu cuenta."},
                status=status.HTTP_403_FORBIDDEN,
            )
        updated = serializer.save()
        return Response(
            {"status": "updated", "promo_code": PromoCodeReadSerializer(updated).data}
        )

    def delete(self, request, pk):
        code = self._get_own_code(request, pk)
        code.is_active = False
        code.save(update_fields=['is_active'])
        return Response({"status": "deactivated"}, status=status.HTTP_200_OK)


class PromoCodeValidateView(APIView):
    """
    POST /api/v1/promo-codes/validate/

    Endpoint p+¦blico (solo autenticado) que valida un c+¦digo antes de comprar.
    El comprador env+¡a: { code, event_id, subtotal }
    Responde con el descuento calculado o el motivo de rechazo.

    Acceso: cualquier usuario autenticado.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .serializers import PromoCodeValidateSerializer
        serializer = PromoCodeValidateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"status": "error", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code_str = serializer.validated_data['code'].upper().strip()
        event_id = serializer.validated_data['event_id']
        subtotal = serializer.validated_data['subtotal']

        try:
            promo = PromoCode.objects.get(code=code_str)
        except PromoCode.DoesNotExist:
            return Response(
                {"status": "invalid", "detail": "C+¦digo de promoci+¦n no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        event = get_object_or_404(Event, id=event_id)
        valid, mensaje = promo.is_valid_for(event)
        if not valid:
            return Response(
                {"status": "invalid", "detail": mensaje},
                status=status.HTTP_400_BAD_REQUEST,
            )

        discount_amount = promo.calcular_descuento(subtotal)
        final_price = subtotal - discount_amount

        return Response({
            "status": "valid",
            "promo_code_id": str(promo.id),
            "code": promo.code,
            "discount_type": promo.discount_type,
            "discount_value": str(promo.discount_value),
            "discount_amount": str(discount_amount),
            "subtotal": str(subtotal),
            "final_price": str(final_price),
        }, status=status.HTTP_200_OK)
class ValidateOrderCouponView(APIView):
    """
    TIC-300: POST /orders/validate-code
    Valida un c+¦digo de descuento usando las reglas de negocio de PromoCode
    y retorna el monto descontado junto al precio final.
    """
    permission_classes = [IsComprador]

    def post(self, request):
        serializer = ValidateCodeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        code_str = serializer.validated_data['code'].strip().upper()
        event_id = serializer.validated_data['event_id']
        base_price = serializer.validated_data['base_price']

        # 1. Obtener el evento asociado
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response(
                {"valid": False, "error": "El evento especificado no existe."},
                status=status.HTTP_444_NOT_FOUND if hasattr(status, 'HTTP_444_NOT_FOUND') else 404
            )

        # 2. Buscar si el c+¦digo promocional existe en el sistema
        try:
            promo_code = PromoCode.objects.get(code=code_str)
        except PromoCode.DoesNotExist:
            return Response(
                {"valid": False, "error": "El c+¦digo de promoci+¦n no existe."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 3. EJECUTAR VALIDACI+ôN NATIVA DEL MODELO (Expiraci+¦n, max_uses, times_used, event match)
        # Tu modelo ya tiene la funci+¦n 'validar_codigo(event)' incorporada
        is_valid, message = promo_code.validar_codigo(event)
        if not is_valid:
            return Response(
                {"valid": False, "error": message},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. CALCULAR DESCUENTO NATIVO DEL MODELO
        # Tu modelo ya tiene 'calcular_descuento(subtotal)' que maneja porcentaje y monto fijo
        from decimal import Decimal
        try:
            monto_descuento_decimal = promo_code.calcular_descuento(Decimal(str(base_price)))
            monto_descontado = float(monto_descuento_decimal)
        except Exception:
            # Fallback matem+ítico cl+ísico si hay problemas con los tipos de datos decimales
            if promo_code.discount_type == 'porcentaje':
                monto_descontado = base_price * (float(promo_code.discount_value) / 100.0)
            else:
                monto_descontado = float(promo_code.discount_value)

        # Asegurar que el descuento no exceda el precio base de la entrada
        if monto_descontado > base_price:
            monto_descontado = base_price

        precio_final = base_price - monto_descontado

        # 5. RETORNAR RESULTADOS
        return Response({
            "valid": True,
            "code": promo_code.code,
            "discount_type": promo_code.discount_type,
            "discount_value": float(promo_code.discount_value),
            "monto_descontado": round(monto_descontado, 2),
            "precio_final": round(precio_final, 2)
        }, status=status.HTTP_200_OK)
class PromotorPromoCodeStatsView(APIView):
    """
    TIC-302: GET /promotor/promo-codes/{id}/stats
    Retorna m+®tricas de rendimiento y uso de un c+¦digo promocional para su creador.
    """
    permission_classes = [IsPromotor]

    def get(self, request, id):
        # 1. Seguridad: Extraer el ID del promotor desde el payload de tu JWT
        payload = getattr(request.auth, 'payload', {}) if request.auth else {}
        promotor_id = payload.get('user_id')

        # 2. Obtener el c+¦digo promocional validando propiedad intelectual
        try:
            # Buscamos por id f+¡sico (UUID) y verificamos que coincida el promotor
            promo_code = PromoCode.objects.get(id=id, promoter_id=promotor_id)
        except PromoCode.DoesNotExist:
            return Response(
                {"error": "C+¦digo promocional no encontrado o no tienes autorizaci+¦n sobre +®l."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 3. Calcular la anal+¡tica (Filtrando compras que NO est+®n canceladas o expiradas)
        # Consideramos 'active' o 'completed' como estados v+ílidos de uso real
        purchases_queryset = Purchase.objects.filter(
            promo_code_id=promo_code.id,
            status__in=['active', 'completed'] 
        )

        metrics = purchases_queryset.aggregate(
            total_descontado_sum=Sum('discount_amount'),
            real_used_count=Count('id')
        )

        # 4. Obtener los +¦ltimos usos (por ejemplo, los +¦ltimos 5 para un feed r+ípido)
        ultimos_usos_qs = purchases_queryset.order_by('-created_at')[:5]

        # 5. Estructurar la respuesta
        raw_data = {
            "code": promo_code.code,
            # Usamos el conteo en BD o el campo de contingencia times_used de tu modelo
            "used_count": metrics['real_used_count'] or promo_code.times_used,
            "total_descontado": float(metrics['total_descontado_sum'] or 0.0),
            "ultimos_usos": ultimos_usos_qs
        }

        serializer = PromoCodeStatsSerializer(raw_data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PromotionPlanListView(APIView):
    """
    GET /api/v1/promotion-plans/

    Lista todos los planes de promoción activos para que el Promotor elija.
    Acceso: cualquier usuario autenticado (Promotor lo usa para ver precios).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .serializers import PromotionPlanSerializer
        plans = PromotionPlan.objects.filter(is_active=True).order_by('priority')
        serializer = PromotionPlanSerializer(plans, many=True)
        return Response({"status": "ok", "plans": serializer.data})


class EventPromoteView(APIView):
    """
    POST /api/v1/promotor/events/{event_id}/promote/

    El Promotor contrata un plan de promoción para uno de sus eventos.
    Crea una EventPromotion en estado 'pending' y la activa inmediatamente
    (en producción esto esperaría confirmación de pago; aquí se simula).

    Acceso: solo Promotor propietario del evento.
    """
    permission_classes = [IsAuthenticated, IsPromotor]

    def post(self, request, event_id):
        from .serializers import EventPromotionCreateSerializer, EventPromotionReadSerializer

        event = get_object_or_404(Event, id=event_id)
        if str(event.promoter_id) != str(request.user.id):
            return Response(
                {"error": "No tienes permisos sobre este evento."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EventPromotionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"status": "error", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan = serializer.get_plan()

        # Cancelar cualquier promoción activa previa para el mismo evento
        EventPromotion.objects.filter(
            event=event,
            status='active',
        ).update(status='cancelled')

        promotion = EventPromotion.objects.create(
            event=event,
            plan=plan,
            promoter_id=request.user.id,
            amount_paid=plan.price_bob,
            status='pending',
        )
        # Simular confirmación de pago inmediata (en producción: webhook)
        promotion.activate()

        return Response(
            {
                "status": "promoted",
                "message": f"Evento '{event.name}' promocionado con plan {plan.name}.",
                "promotion": EventPromotionReadSerializer(promotion).data,
            },
            status=status.HTTP_201_CREATED,
        )


class EventPromotionStatusView(APIView):
    """
    GET /api/v1/promotor/events/{event_id}/promotion/

    El Promotor consulta el estado actual de la promoción de su evento.
    Acceso: Promotor propietario del evento.
    """
    permission_classes = [IsAuthenticated, IsPromotor]

    def get(self, request, event_id):
        from .serializers import EventPromotionReadSerializer
        event = get_object_or_404(Event, id=event_id)
        if str(event.promoter_id) != str(request.user.id):
            return Response({"error": "No tienes permisos sobre este evento."}, status=403)

        promotion = EventPromotion.objects.filter(
            event=event,
            status='active',
        ).select_related('plan').first()

        if not promotion:
            return Response({"status": "no_promotion", "promotion": None})

        return Response({
            "status": "ok",
            "promotion": EventPromotionReadSerializer(promotion).data,
        })


class FeaturedEventsView(APIView):
    """
    GET /api/v1/events/featured/

    Lista pública de eventos actualmente promocionados, ordenados por prioridad
    del plan (Pro > Premium > Básico) y luego por fecha del evento.
    Acceso: público (AllowAny).
    """
    permission_classes = []  # Público

    def get(self, request):
        from django.utils import timezone as tz
        from .serializers import EventSerializer

        now = tz.now()
        # IDs de eventos con promoción activa vigente
        promoted_event_ids = EventPromotion.objects.filter(
            status='active',
            expires_at__gt=now,
            event__status='published',
        ).values_list('event_id', flat=True)

        events = Event.objects.filter(
            id__in=promoted_event_ids,
            status='published',
            event_date__gte=now.date(),
        ).prefetch_related('promotions__plan').order_by('event_date')

        # Ordenar por prioridad del plan activo (menor número = mayor prioridad)
        def get_priority(event):
            promo = event.promotions.filter(status='active', expires_at__gt=now).first()
            return promo.plan.priority if promo else 999

        events_list = sorted(events, key=get_priority)

        serializer = EventSerializer(events_list, many=True, context={'request': request})
        return Response({
            "status": "ok",
            "total": len(events_list),
            "featured_events": serializer.data,
        })


class AdminPromotionListView(APIView):
    """
    GET /api/v1/admin/promotions/

    El SuperAdmin ve todas las promociones para el dashboard de ingresos.
    Filtros opcionales: ?status=active|expired|cancelled&promoter_id=<uuid>
    Acceso: Admin con capability 'view_reports' o SuperAdmin.
    """
    permission_classes = [IsAuthenticated, HasAdminCapability('view_reports')]

    def get(self, request):
        from .serializers import EventPromotionReadSerializer
        qs = EventPromotion.objects.select_related('event', 'plan').order_by('-created_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        promoter_filter = request.query_params.get('promoter_id')
        if promoter_filter:
            qs = qs.filter(promoter_id=promoter_filter)

        total_ingresos = sum(p.amount_paid for p in qs if p.status in ('active', 'expired'))

        serializer = EventPromotionReadSerializer(qs, many=True)
        return Response({
            "status": "ok",
            "total": qs.count(),
            "total_ingresos_promociones_bob": str(total_ingresos),
            "results": serializer.data,
        })

