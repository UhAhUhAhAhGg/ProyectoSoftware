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
from django_filters.rest_framework import DjangoFilterBackend
from .models import Event, EventAuditLog
from .serializers import EventSerializer
from .permissions import IsAdministrador, IsPromotor, IsComprador, IsAdminWithAudit
from .services import TicketGenerationService, send_ticket_email
from .models import (
    Category, Event, TicketType, Purchase, Waitlist, BlacklistedToken, Seat,
    UserBehavior, UserPreference, UserFavorite, Notification, NotificationPreference,
    RecommendationEngine, registrar_comportamiento, generar_notificaciones_match,
)
from .serializers import (
    CategorySerializer,
    EventSerializer,
    EventCreateSerializer,
    EventUpdateSerializer,
    TicketTypeSerializer,
    TicketTypeCreateSerializer,
    QueueConfigSerializer,
)


def _notify_queue_release(event_id: str, user_id: str):
    """Notifica a service-queue que un usuario liberó su cupo (compra completa/cancelada/expirada)."""
    try:
        url = f"{django_settings.QUEUE_SERVICE_URL}/api/v1/internal/release-user/"
        http_requests.post(url, json={"event_id": event_id, "user_id": user_id}, timeout=3)
    except Exception:
        pass


def _get_queue_access_time(event_id: str, user_id: str):
    """
    Consulta service-queue para obtener cuándo el usuario fue admitido al evento.
    Retorna un datetime o None. Permite que el timer del Purchase empiece desde
    'Seleccionar Asientos' y no desde la generación del QR.
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
        """GET /events/{id}/ — registra la visualización como comportamiento"""
        instance = self.get_object()

        # Registrar automáticamente la interacción 'view'
        registrar_comportamiento(
            user_id=request.user.id,
            event=instance,
            action_type='view'
        )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        """GET /events/{id}/ — registra la visualización como comportamiento"""
        instance = self.get_object()

        # Registrar automáticamente la interacción 'view'
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
        Calcula la posición en tiempo real y el promedio dinámico de espera (max 15 min).
        """
        event = self.get_object()
        user_id = request.user.id

        # 1. Verificar si el usuario realmente está en la fila
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

        # 2. Calcular cuántas personas están estrictamente delante de este usuario
        people_ahead = Waitlist.objects.filter(
            event=event,
            status='waiting',
            position__lt=waitlist_entry.position
        ).count()
        # Tomamos una muestra de las últimas 20 compras confirmadas del evento
        recent_purchases = list(Purchase.objects.filter(
            event=event, 
            status='active'
        ).order_by('-created_at')[:20])

        average_time_minutes = 5.0  # Tiempo por defecto si no hay data histórica suficiente

        if len(recent_purchases) >= 2:
            # Diferencia de tiempo entre la compra más reciente y la más antigua de la muestra
            newest_purchase = recent_purchases[0].created_at
            oldest_purchase = recent_purchases[-1].created_at
            
            time_diff_seconds = (newest_purchase - oldest_purchase).total_seconds()
            
            if time_diff_seconds > 0:
                # Calculamos cuánto toma en promedio despachar 1 compra (en minutos)
                calc_average = (time_diff_seconds / 60.0) / len(recent_purchases)
                
                # Regla de Negocio: Mínimo 1 minuto, Máximo 15 minutos (por expiración del QR)
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
        
        # NUEVO — disparar notificaciones de match en < 5 minutos
        generar_notificaciones_match(event)
        
        
        # NUEVO — disparar notificaciones de match en < 5 minutos
        generar_notificaciones_match(event)
        
        return Response({'success': 'Event published'})
    
    @action(detail=True, methods=['get', 'put'], url_path='queue-config')
    def queue_config(self, request, pk=None):
        """
        HU: Configurar umbral de usuarios simultáneos.
        GET: Obtener la configuración actual.
        PUT: Actualizar la configuración con validaciones estrictas.
        """
        event = self.get_object()

        # 1. Seguridad base para ambos métodos
        if str(event.promoter_id) != str(request.user.id):
            return Response({
                "status": "error",
                "message": "No tienes permisos. Solo el promotor de este evento puede gestionar la fila virtual."
            }, status=status.HTTP_403_FORBIDDEN)

        # 2. Manejo de la petición GET (Lo que hicimos en la subtarea anterior)
        if request.method == 'GET':
            return Response({
                "status": "success",
                "data": {
                    "event_id": str(event.id),
                    "waitlist_threshold": event.waitlist_threshold,
                    "waitlist_active": event.waitlist_active,
                    "queue_timeout": event.queue_timeout,
                    "event_capacity": event.capacity # Útil para que el Frontend valide también
                }
            }, status=status.HTTP_200_OK)

        # 3. Manejo de la petición PUT (La nueva subtarea de validación)
        elif request.method == 'PUT':
            threshold_input = request.data.get('waitlist_threshold')
            is_active_input = request.data.get('waitlist_active', event.waitlist_active)
            timeout_input = request.data.get('queue_timeout', event.queue_timeout)

            # Validación A: Que el dato exista
            if threshold_input is None:
                return Response({
                    "status": "error",
                    "message": "El campo 'waitlist_threshold' es obligatorio."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validación B: Que sea un número entero
            try:
                threshold = int(threshold_input)
            except ValueError:
                return Response({
                    "status": "error",
                    "message": "El umbral debe ser un número entero válido."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validación C: Entero positivo (> 0)
            if threshold <= 0:
                return Response({
                    "status": "error",
                    "message": "El umbral debe ser un número entero positivo mayor a cero."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validación D: <= capacidad del evento (El Core de tu ticket)
            if threshold > event.capacity:
                return Response({
                    "status": "error",
                    "message": f"El umbral ({threshold}) no puede superar la capacidad máxima del evento ({event.capacity} personas)."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validación para queue_timeout
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
                    "message": "El tiempo de espera (timeout) debe ser un número entero válido."
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
                "message": "Configuración de la fila virtual actualizada y validada correctamente.",
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

        # CondiciÃ³n 1: Permisos (Solo el promotor dueÃ±o puede cancelar)
        if str(event.promoter_id) != str(request.user.id):
            return Response({
                "status": "error",
                "message": "No tienes permisos. Solo el promotor que creÃ³ el evento puede cancelarlo."
            }, status=status.HTTP_403_FORBIDDEN)

        # CondiciÃ³n 2: Estado del evento (Evitar doble cancelaciÃ³n)
        if event.status in ['cancelled', 'completed']:
            return Response({
                "status": "error",
                "message": f"AcciÃ³n denegada. El evento ya se encuentra '{event.status}'."
            }, status=status.HTTP_400_BAD_REQUEST)

        # CondiciÃ³n 3: Validar temporalidad (No cancelar eventos pasados)
        if not event.is_upcoming:
            return Response({
                "status": "error",
                "message": "No se puede cancelar un evento cuya fecha ya pasÃ³ o estÃ¡ en curso."
            }, status=status.HTTP_400_BAD_REQUEST)

        tickets = event.ticket_types.all()
        total_sold = sum(ticket.current_sold for ticket in tickets)

        # Registrar metadata de cancelación (TIC-210/TIC-229)
        event.status = 'cancelled'
        event.cancelled_at = timezone.now()
        event.cancelled_by = request.user.id
        event.cancellation_reason = request.data.get('cancellation_reason', '')
        event.save()

        # Detenemos la comercialización desactivando los tickets
        for ticket in tickets:
            ticket.status = 'inactive'
            ticket.save()

        # Preparamos una respuesta inteligente basada en las ventas
        if total_sold > 0:
            mensaje = f"Evento cancelado. ATENCIÓN: Se registraron {total_sold} entradas vendidas. Se debe notificar a los compradores y gestionar reembolsos."
        else:
            mensaje = "Evento cancelado exitosamente. La comercialización fue detenida (0 entradas vendidas)."

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
        
        # En producción, 'mi_secreto_super_seguro' debe estar en un archivo .env
        if token_banco != 'mi_secreto_super_seguro': 
            return Response({"error": "No autorizado. Firma inválida."}, status=status.HTTP_403_FORBIDDEN)

        # 2. Leer los datos que manda el banco
        order_id = request.data.get('order_id')
        estado_transaccion = request.data.get('status') # El banco suele mandar 'EXITOSO', 'RECHAZADO', etc.

        try:
            orden = PaymentOrder.objects.get(id=order_id)
        except PaymentOrder.DoesNotExist:
            return Response({"error": "Orden no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        # 3. Idempotencia: ¿Qué pasa si el banco manda el mismo mensaje dos veces por error?
        if orden.status == 'paid':
            return Response({"mensaje": "Esta orden ya fue procesada y pagada anteriormente"}, status=status.HTTP_200_OK)

        # 4. Validar si la orden ya expiró en nuestro sistema
        if orden.is_expired:
            orden.status = 'expired'
            orden.save()
            return Response({"error": "La orden ya expiró"}, status=status.HTTP_400_BAD_REQUEST)

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
                    # Este es el QR que el usuario mostrará EN LA PUERTA del evento
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
        return Response({"error": "Transacción no exitosa"}, status=status.HTTP_400_BAD_REQUEST)


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
    un QR de pago (contiene el purchase_id) con 15 minutos de expiración.
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

        # 2. Evaluamos si el evento tiene la fila activa Y superó el umbral
        if event.waitlist_active and (total_sold + quantity) >= event.waitlist_threshold:
            
            with transaction.atomic():
                # Verificamos si el usuario ya está en la fila
                waitlist_entry = Waitlist.objects.filter(event=event, user_id=user_id).first()
                
                if not waitlist_entry:
                    # Buscamos la última posición asignada para darle la siguiente
                    last_position = Waitlist.objects.filter(event=event).aggregate(Max('position'))['position__max'] or 0
                    
                    waitlist_entry = Waitlist.objects.create(
                        event=event,
                        user_id=user_id,
                        position=last_position + 1,
                        status='waiting' # Estado "en_cola" según el ticket
                    )
                    
                    mensaje = "El evento ha superado el umbral de capacidad simultánea. Has sido colocado en la fila virtual."
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
        # --- FIN LÓGICA DE FILA VIRTUAL ---

        # Validaciones estándar de compra
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
        # no desde la generación del QR. Fallback: ahora si no hay registro.
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
        # (que calculan expires_at = created_at + timeout) usen el tiempo de admisión
        # a la cola en vez del tiempo de creación de la orden.
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
    Simula la confirmación de pago bancario, activa la compra y genera el QR/backup_code de la entrada.
    En producción este endpoint no existiría; se reemplaza por un webhook del banco.
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
            return Response({"error": "El tiempo de pago expiró. Genera una nueva orden."}, status=410)

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

        # NUEVO — registrar comportamiento de compra
        registrar_comportamiento(
            user_id=purchase.user_id,
            event=purchase.event,
            action_type='purchase'
        )

        # NUEVO — registrar comportamiento de compra
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

            # Liberar asientos si la compra expiró por tiempo
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
    GET  /api/v1/events/<event_id>/seat-config/  — Devuelve zonas + disponibilidad
    POST /api/v1/events/<event_id>/seat-config/  — Crea/reemplaza zonas del evento
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
        """Crea o reemplaza la configuración de zonas. Protege zonas con ventas."""
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
                errors.append(f"Zona[{i}] tiene precio inválido")

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
            "message": "Configuración de asientos guardada correctamente"
        }, status=201)


class ValidateTicketView(APIView):
    """
    Endpoint para validar entradas en la puerta del evento.
    Acepta tanto cÃ³digo QR como cÃ³digo alfanumÃ©rico.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        codigo = request.data.get("codigo", "").strip()

        if not codigo:
            return Response({
                "status": "error",
                "message": "El cÃ³digo es requerido"
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
    Si la zona no tiene asientos generados aún, los genera automáticamente.
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
        # los generamos automáticamente (una sola vez).
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
    Reserva un asiento de forma atómica (select_for_update evita doble reserva).
    La reserva expira si no se confirma el pago (ver TIC-20 para el scheduler).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, seat_id):
        user_id = request.user.id

        with transaction.atomic():
            # select_for_update: bloquea la fila mientras la transacción está activa
            # garantizando que dos usuarios simultáneos no reserven el mismo asiento
            try:
                seat = Seat.objects.select_for_update(nowait=True).get(id=seat_id)
            except Seat.DoesNotExist:
                return Response({'error': 'Asiento no encontrado'}, status=404)
            except Exception:
                # nowait=True lanza error si el registro está bloqueado
                return Response(
                    {'error': 'El asiento está siendo reservado por otro usuario. Intenta de nuevo.'},
                    status=409
                )

            if seat.status == 'sold':
                return Response({'error': 'Este asiento ya fue vendido.'}, status=409)

            if seat.status == 'reserved':
                # Verificar si la reserva expiró (más de 15 min)
                if seat.reserved_at:
                    expiracion = seat.reserved_at + timedelta(minutes=15)
                    if timezone.now() < expiracion:
                        return Response(
                            {'error': 'Este asiento ya está reservado. Intenta con otro.'},
                            status=409
                        )
                    # Reserva expirada: liberar y tomar
                seat.status = 'available'

            if seat.status != 'available':
                return Response({'error': 'El asiento no está disponible.'}, status=409)

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
    Reserva múltiples asientos de forma atómica. Si uno falla, toda la transacción se revierte.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.user.id
        seat_ids = request.data.get('seat_ids', [])

        if not seat_ids or not isinstance(seat_ids, list):
            return Response({'error': 'se requiere una lista de seat_ids'}, status=400)

        with transaction.atomic():
            # select_for_update bloquea todos los asientos de la lista de forma atómica
            try:
                # order_by('id') previene deadlocks al bloquear múltiples filas
                seats = Seat.objects.select_for_update(nowait=True).filter(id__in=seat_ids).order_by('id')
                if len(seats) != len(seat_ids):
                    return Response({'error': 'Algunos asientos no fueron encontrados'}, status=404)
            except Exception:
                return Response({'error': 'Algunos asientos están siendo reservados por otro usuario. Intenta de nuevo.'}, status=409)

            for seat in seats:
                if seat.status == 'sold':
                    return Response({'error': f'El asiento {seat.seat_code} ya fue vendido.'}, status=409)
                if seat.status == 'reserved':
                    if seat.reserved_at:
                        expiracion = seat.reserved_at + timedelta(minutes=15)
                        if timezone.now() < expiracion:
                            return Response({'error': f'El asiento {seat.seat_code} ya está reservado.'}, status=409)
                    # Expiró, podemos tomarlo
                elif seat.status != 'available':
                    return Response({'error': f'El asiento {seat.seat_code} no está disponible.'}, status=409)

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
            return Response({"error": "Ya estás en la lista de espera"}, status=400)

        max_pos = Waitlist.objects.filter(event=event).aggregate(Max('position'))['position__max'] or 0
        entry = Waitlist.objects.create(
            event=event,
            user_id=user_id,
            position=max_pos + 1
        )
        return Response({
            "status": "waitlist",
            "position": entry.position,
            "message": f"Estás en la posición {entry.position} de la lista de espera."
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    """Endpoint para cerrar sesión (blacklist token)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if token:
            BlacklistedToken.objects.get_or_create(
                token=token,
                defaults={'expires_at': timezone.now() + timedelta(days=1)}
            )
        return Response({"message": "Sesión cerrada correctamente"}, status=200)


class PurchaseHistoryView(APIView):
    """
    Endpoint para consultar historial de compras del usuario.
    
    Parámetros de consulta soportados:
      - page (int): Número de página (default: 1)
      - page_size (int): Cantidad por página (default: 10, max: 100)
      - status (str): Filtrar por estado (active, used, pending, cancelled)
      - sortBy (str): Campo de ordenación (created_at, total_price, event_date, status)
      - sortType (str): Dirección de orden (ASC o DESC, default: DESC)
      - minPrice (decimal): Precio mínimo del total
      - maxPrice (decimal): Precio máximo del total
    
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

        # ── Filtro por status ──
        status_filter = request.query_params.get('status')
        if status_filter and status_filter in ('active', 'used', 'pending', 'cancelled'):
            qs = qs.filter(status=status_filter)

        # ── Filtro por evento ──
        event_filter = request.query_params.get('event_id')
        if event_filter:
            qs = qs.filter(event_id=event_filter)

        # ── Filtro por rango de precio ──
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

        # ── Ordenación ──
        sort_by = request.query_params.get('sortBy', 'created_at')
        sort_type = request.query_params.get('sortType', 'DESC').upper()
        db_field = self.ALLOWED_SORT_FIELDS.get(sort_by, 'created_at')
        if sort_type == 'ASC':
            qs = qs.order_by(db_field)
        else:
            qs = qs.order_by(f'-{db_field}')

        # ── Paginación ──
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
      { "keep_queue": true }  →  cancela la compra y libera asientos pero NO libera
                                  el cupo en service-queue (útil para "volver atrás"
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
            # Ya está disponible, idempotente
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
    GET  /api/v1/queue-config/<event_id>/  — obtener configuracion actual
    POST /api/v1/queue-config/<event_id>/  — actualizar configuracion

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

            # Sincronizar con service-queue: convertir threshold (%) → max_concurrent_users (absoluto)
            threshold = event.waitlist_threshold
            capacity = event.capacity or 1
            max_concurrent = max(1, math.ceil(capacity * threshold / 100))
            payment_timeout = event.payment_timeout_minutes

            try:
                # Endpoint interno: no autentica ni llama de vuelta → evita deadlock circular
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
                pass  # Falla silenciosa; la cola usará el valor previo

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
    TIC-105 & TIC-106: Gestión integral de Administradores por SuperAdmin.
    Permite modificar permisos y suspender cuentas con protección de jerarquía.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def patch(self, request, user_id):
        # 1. SEGURIDAD: Solo el SuperUser (Nivel Dios) puede entrar aquí
        if not request.user.is_superuser:
            return Response(
                {"error": "Acceso denegado. Se requieren privilegios de SuperAdmin."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 2. VALIDACIÓN DE JERARQUÍA: Evitar que toquen a otro SuperAdmin
        # (Aquí simulamos la comprobación, en real consultarías tu BD/Service-Profiles)
        target_is_superuser = False # <--- Consultar si el user_id es superusuario
        if target_is_superuser:
            return Response(
                {"error": "Acción denegada: Un SuperAdmin no puede ser gestionado por este endpoint."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 3. PROCESAMIENTO DE DATOS
        # Usamos el serializer para validar si vienen cambios de permisos
        serializer = AdminPermissionsSerializer(data=request.data, partial=True)
        
        # Detectamos si la intención es SUSPENDER (TIC-106)
        is_suspend_action = request.data.get('suspend', False)

        try:
            acciones_realizadas = []

            # --- Lógica de Suspensión ---
            if is_suspend_action:
                # Aquí llamarías a la lógica de desactivar cuenta (is_active = False)
                acciones_realizadas.append("Suspensión de cuenta")
                log_admin_action(request, user_id, 'suspend', "Cuenta suspendida por SuperAdmin")

            # --- Lógica de Permisos ---
            if serializer.is_valid() and serializer.validated_data:
                # Aquí actualizarías los permisos en la base de datos
                acciones_realizadas.append(f"Cambio de permisos: {list(serializer.validated_data.keys())}")
                log_admin_action(request, user_id, 'update', f"Permisos modificados: {serializer.validated_data}")

            if not acciones_realizadas:
                return Response({"message": "No se enviaron cambios válidos."}, status=400)

            return Response({
                "status": "success",
                "target_user": user_id,
                "actions": acciones_realizadas
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=500)
    

# ─── TIC-21/22: Favoritos, Notificaciones, Recomendaciones ───────────────────

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
            # Ya era favorito → desmarcar
            favorito_existente.delete()
            return Response({
                "status": "removed",
                "message": f"'{event.name}' eliminado de tus favoritos.",
                "is_favorite": False,
            }, status=status.HTTP_200_OK)

        else:
            # No era favorito → marcar
            UserFavorite.objects.create(
                user_id=user_id,
                event=event
            )

            # Registrar también como comportamiento de interés
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
    Lista todas las notificaciones del usuario (leídas y no leídas).

    Query params opcionales:
      ?leida=false  → solo no leídas
      ?leida=true   → solo leídas
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
    Marca una notificación específica como leída.
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
                "message": "La notificación ya estaba marcada como leída.",
            }, status=status.HTTP_200_OK)

        notificacion.leida = True
        notificacion.leida_at = timezone.now()
        notificacion.save(update_fields=['leida', 'leida_at'])

        from .serializers import NotificationSerializer
        serializer = NotificationSerializer(notificacion)

        return Response({
            "status": "success",
            "message": "Notificación marcada como leída.",
            "data": serializer.data,
        }, status=status.HTTP_200_OK)

class NotificationPreferenceView(APIView):
    def put(self, request, user_id):
        # Usamos el serializer de PREFERENCIAS para validar la lista de IDs
        serializer = NotificationPreferenceUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            category_ids = serializer.validated_data['category_ids']
            
            # Apagamos todas primero (reset)
            UserPreference.objects.filter(user_id=user_id).update(notifications_enabled=False)
            
            # Prendemos las que el usuario eligió
            for cat_id in category_ids:
                pref, created = UserPreference.objects.get_or_create(
                    user_id=user_id,
                    category_id=cat_id
                )
                pref.notifications_enabled = True
                pref.save()
                
            return Response({"message": "Preferencias actualizadas"}, status=200)
        
        return Response(serializer.errors, status=400)

class UserNotificationReadAllView(APIView):
    """
    PATCH /api/v1/users/{user_id}/notifications/read-all/
    Marca TODAS las notificaciones no leídas del usuario como leídas.
    Endpoint de utilidad para el botón 'Marcar todas como leídas'.
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
            "message": f"{actualizadas} notificaciones marcadas como leídas.",
            "actualizadas": actualizadas,
        }, status=status.HTTP_200_OK)

class UserRecommendationsAPIView(APIView):
    """
    Endpoint para obtener eventos recomendados según comportamiento pasado.
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
    page_size = 10  # Número de eventos por página
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
    Permite al usuario configurar qué categorías le generan notificaciones.

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


# ─── TIC-25: Modificar/Dar de baja eventos (Admin) ───────────────────────────

class AdminEventEditView(APIView):
    """
    TIC-406: PATCH /admin/events/{id}/
    Permite a un administrador modificar cualquier campo de un evento
    (nombre, fecha, capacidad, descripción, etc.) y registra la intervención.

    Solo accesible por usuarios con rol Administrador o is_staff=True.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, event_id):
        from .models import Event

        user = request.user
        if not (user.is_staff or (hasattr(user, 'role') and user.role and
                user.role.get('name', '') in ['Administrador', 'admin'] if isinstance(user.role, dict)
                else user.is_staff)):
            # Verificación simplificada: cualquier usuario autenticado con is_staff
            if not user.is_staff:
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

        # Campos permitidos para edición por admin
        ALLOWED_FIELDS = [
            'name', 'description', 'event_date', 'event_time',
            'location', 'capacity', 'status', 'category',
        ]

        # TIC-453: snapshot antes/despues para registrar en EventAuditLog
        changed_fields = {}
        old_status = event.status
        for field in ALLOWED_FIELDS:
            if field in request.data:
                old_value = getattr(event, field, None)
                new_value = request.data[field]
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

        reason = request.data.get('admin_reason', 'Modificación administrativa')
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

    Solo accesible por usuarios con is_staff=True.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, event_id):
        from .models import Event
        from django.utils import timezone as tz

        user = request.user
        if not user.is_staff:
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
                {"status": "error", "message": "El evento ya está dado de baja."},
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


# ─── TIC-26: Auditoría de eventos ─────────────────────────────────────────────

class AdminAuditLogListView(APIView):
    """
    TIC-421: GET /admin/audit-log/
    Retorna el historial completo de intervenciones administrativas sobre eventos.
    Soporta filtros (event_id, admin_id, action, date_from, date_to) y paginación.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import EventAuditLog

        user = request.user
        if not user.is_staff:
            return Response(
                {"status": "error", "message": "Permisos insuficientes."},
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

        # Paginación simple
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
    Historial completo de cambios de un evento específico, paginado y ordenado
    por fecha descendente. Protegido por permiso audit_view (TIC-422).
    """
    permission_classes = [IsAuthenticated, IsAdminWithAudit]

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
    Genera y retorna un CSV con el historial completo de auditoría para uso externo.
    Protegido por permiso audit_view (TIC-422).
    """
    permission_classes = [IsAuthenticated, IsAdminWithAudit]

    def get(self, request):
        import csv
        from django.http import HttpResponse

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit_log_export.csv"'

        queryset = EventAuditLog.objects.select_related('event').order_by('-created_at')

        writer = csv.writer(response)
        writer.writerow([
            'ID Log', 'Fecha', 'Evento', 'Admin Email',
            'Acción', 'Razón', 'Estado Anterior', 'Estado Nuevo',
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


# ─── US23: Gestion administrativa de usuarios (Anghelo) ──────────────────────

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


# ─── US24: Gestion administrativa de eventos (Ariana) ────────────────────────

class AdminEventoBajaView(APIView):
    """
    PATCH /api/v1/admin/events/{event_id}/baja/
    Da de baja un evento con motivo obligatorio.
    Registra la accion en EventAuditLog automaticamente.
    Endpoint paralelo a AdminEventDeactivateView (TIC-407) con validaciones extra.
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
    """
    permission_classes = [IsAuthenticated]

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
    """
    permission_classes = [IsAuthenticated]

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


# ─── US26: Vista detalle por evento (Ariana) ─────────────────────────────────

class EventAuditLogView(APIView):
    """
    GET /api/v1/admin/events/{event_id}/audit-log-v2/
    Vista detallada del historial de auditoria de UN evento especifico.
    Endpoint paralelo a EventAuditLogListView (TIC-420) con formato simplificado.
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
