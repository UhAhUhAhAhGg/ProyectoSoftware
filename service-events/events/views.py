from rest_framework import viewsets, status
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
import secrets
import uuid
from django.db.models import Max
from datetime import timedelta
from .permissions import IsAdministrador, IsPromotor, IsComprador
from .services import TicketGenerationService, send_ticket_email
from .models import Category, Event, TicketType, Purchase, Waitlist, BlacklistedToken
from .serializers import (
    CategorySerializer,
    EventSerializer,
    EventCreateSerializer,
    EventUpdateSerializer,
    TicketTypeSerializer,
    TicketTypeCreateSerializer
)


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
        if self.action == 'list':
            return Event.objects.filter(status='published')
        return Event.objects.all()

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'category', 'event_date']
    search_fields = ['name', 'location', 'description']
    ordering_fields = ['event_date', 'created_at']
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
        return Response({'success': 'Event published'})

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

        tickets = event.tickettype_set.all()
        total_sold = sum(ticket.current_sold for ticket in tickets)

        # Actualizamos el estado del evento
        event.status = 'cancelled'
        event.save()

        # Detenemos la comercializaciÃ³n desactivando los tickets
        for ticket in tickets:
            ticket.status = 'inactive'
            ticket.save()

        # Preparamos una respuesta inteligente basada en las ventas
        if total_sold > 0:
            mensaje = f"Evento cancelado. ATENCIÃ“N: Se registraron {total_sold} entradas vendidas. Se debe notificar a los compradores y gestionar reembolsos."
        else:
            mensaje = "Evento cancelado exitosamente. La comercializaciÃ³n fue detenida (0 entradas vendidas)."

        return Response({
            "status": "success",
            "message": mensaje,
            "tickets_sold": total_sold
        }, status=status.HTTP_200_OK)
    
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
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.user.id
        event_id = request.data.get("event_id")
        ticket_type_id = request.data.get("ticket_type_id")

        try:
            quantity = int(request.data.get("quantity", 1))
        except (ValueError, TypeError):
            return Response({"error": "Cantidad invalida"}, status=400)

        if quantity <= 0:
            return Response({"error": "Cantidad debe ser mayor a 0"}, status=400)

        event = get_object_or_404(Event, id=event_id)
        ticket = get_object_or_404(TicketType, id=ticket_type_id)

        # Si lista de espera activa â†’ no comprar
        if event.waitlist_active:
            return Response({
                "status": "waitlist",
                "message": "El evento estÃ¡ casi lleno. Has sido redirigido a la lista de espera."
            }, status=200)

        if event.status == 'cancelled':
            return Response({"error": "No puedes comprar entradas para un evento cancelado"}, status=400)

        if event.status != 'published':
            return Response({"error": "El evento no esta disponible para compra"}, status=400)

        if ticket.status != 'active':
            return Response({"error": "Este tipo de entrada no esta disponible"}, status=400)

        if ticket.available_capacity < quantity:
            return Response({"error": "No hay suficientes entradas disponibles"}, status=400)

        # Validacion: no comprar mÃ¡s de una entrada por evento
        existing_purchase = Purchase.objects.filter(
            user_id=user_id,
            event=event,
            status__in=['active', 'pending']
        ).exists()

        if existing_purchase:
            return Response({"error": "Ya tienes una entrada para este evento"}, status=409)

        total_price = ticket.price * quantity

        backup_code = secrets.token_hex(5).upper()

        qr_code_base64 = None
        try:
            qr = qrcode.make(backup_code)
            buffer = io.BytesIO()
            qr.save(buffer, format='PNG')
            qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
        except Exception as e:
            print(f"Error generando QR: {str(e)}")
            qr_code_base64 = None

        purchase = Purchase.objects.create(
            user_id=user_id,
            event=event,
            ticket_type=ticket,
            quantity=quantity,
            total_price=total_price,
            qr_code=qr_code_base64,
            backup_code=backup_code,
            status='active'
        )

        ticket.current_sold += quantity
        ticket.save()

        # Verificar umbral de lista de espera
        total_sold = sum(t.current_sold for t in event.ticket_types.all())
        percentage = (total_sold / event.capacity) * 100

        if percentage >= event.waitlist_threshold:
            event.waitlist_active = True
            event.save()

        try:
            print(f"Email pendiente de envÃ­o para {purchase.id}")
        except Exception as e:
            print(f"Error intentando enviar email: {str(e)}")

        return Response({
            "status": "success",
            "message": "Compra realizada correctamente",
            "data": {
                "purchase_id": purchase.id,
                "backup_code": backup_code,
                "total": total_price
            }
        }, status=status.HTTP_201_CREATED)


class SeatConfigurationView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, event_id):
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
                errors.append(f"Zona[{i}] tiene precio invÃ¡lido")

        total_capacity = sum([z.get("max_capacity", 0) for z in zones])

        if total_capacity > event.capacity:
            errors.append("La suma de capacidades supera el aforo del evento")

        if errors:
            return Response({"status": "error", "errors": errors}, status=422)

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
                    status='active'
                )

        return Response({
            "status": "success",
            "message": "ConfiguraciÃ³n de asientos guardada correctamente"
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
                "message": "Esta entrada ha sido cancelada"
            }, status=status.HTTP_410_GONE)

        purchase.status = 'used'
        purchase.used_at = timezone.now()
        purchase.validated_by = request.user.id
        purchase.save()

        return Response({
            "status": "success",
            "message": "Entrada validada correctamente âœ…",
            "data": {
                "purchase_id": str(purchase.id),
                "evento": purchase.event.name,
                "usuario": purchase.user_id,
                "zona": purchase.ticket_type.name,
                "validado_en": timezone.now().isoformat(),
                "validador": str(request.user.id)
            }
        }, status=status.HTTP_200_OK)


class WaitlistView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        event_id = request.data.get("event_id")
        user_id = request.user.id

        event = get_object_or_404(Event, id=event_id)

        if Waitlist.objects.filter(event=event, user_id=user_id).exists():
            return Response({"error": "Ya estÃ¡s en la lista de espera"}, status=400)

        last_position = Waitlist.objects.filter(event=event).aggregate(
            Max('position')
        )['position__max'] or 0

        new_position = last_position + 1

        Waitlist.objects.create(
            event=event,
            user_id=user_id,
            position=new_position
        )

        return Response({"status": "success", "position": new_position}, status=201)


class LogoutView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.headers.get("Authorization")

        if not token:
            return Response({"error": "Token requerido"}, status=400)

        BlacklistedToken.objects.create(
            token=token,
            expires_at=timezone.now() + timedelta(hours=1)
        )

        return Response({"status": "success", "message": "SesiÃ³n cerrada correctamente"})


class PurchaseHistoryView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        purchases = Purchase.objects.filter(user_id=request.user.id)

        data = [
            {
                "event": p.event.name,
                "ticket": p.ticket_type.name,
                "quantity": p.quantity,
                "total": p.total_price,
                "date": p.created_at
            }
            for p in purchases
        ]

        return Response(data)
