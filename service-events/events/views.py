from rest_framework import viewsets, status
from rest_framework.decorators import action
from django.db import transaction
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
import qrcode
import base64
from django.db import transaction
from rest_framework.permissions import AllowAny
import uuid
from io import BytesIO
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .models import TicketType, PaymentOrder # Asegúrate de importar tus modelos
from .permissions import IsAdministrador, IsPromotor, IsComprador
from .services import TicketGenerationService
import uuid # Por si necesitamos simular el ID de la compra
from .models import Category, Event, TicketType
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
        """Obtener solo categorías activas"""
        categories = Category.objects.filter(is_active=True)
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)


class EventViewSet(viewsets.ModelViewSet):


    def get_queryset(self):
        """
        Lógica dinámica de consultas:
        - Si el usuario pide el catálogo completo (GET /events/), solo mostramos los 'publicados'.
        - Si busca un evento específico o intenta editarlo, buscamos en todos (las reglas 
          de seguridad de edición ya las tenemos blindadas en los métodos update/destroy).
        """
        if self.action == 'list':
            # Solo los publicados para el catálogo del Comprador
            return Event.objects.filter(status='published')
        
        # Para retrieve, update, destroy, etc., buscamos en toda la base de datos
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
        # Para ver la lista (catálogo) dejamos pasar a usuarios autenticados (compradores)
        return [IsAuthenticated()] 

    def get_serializer_class(self):
        # ... (todo lo demás sigue intacto)
        if self.action == 'create':
            return EventCreateSerializer
        elif self.action in ['partial_update', 'update']:
            return EventUpdateSerializer
        return EventSerializer

    def update(self, request, *args, **kwargs):
        """Editar un evento validando permisos y estado (PUT/PATCH)"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object() 

        # 1. Validar Permisos: ¿El usuario actual es el promotor dueño de este evento?
        if str(instance.promoter_id) != str(request.user.id):
            return Response({
                "status": "error",
                "message": "No tienes permisos. Solo el promotor que creó el evento puede editarlo."
            }, status=status.HTTP_403_FORBIDDEN)

        # 2. Validar Estado: Solo se puede editar si está en borrador o publicado
        if instance.status in ['cancelled', 'completed']:
            return Response({
                "status": "error",
                "message": f"Acción denegada. No se puede editar un evento que ya está '{instance.status}'."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 3. Guardar datos
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
        """Eliminación lógica de un evento (Soft Delete para proteger compras)"""
        instance = self.get_object()

        # 1. Validar Permisos: Solo el dueño puede eliminarlo
        if str(instance.promoter_id) != str(request.user.id):
            return Response({
                "status": "error",
                "message": "No tienes permisos. Solo el promotor que creó el evento puede eliminarlo."
            }, status=status.HTTP_403_FORBIDDEN)

        # 2. Validar Estado
        if instance.status in ['cancelled', 'completed']:
            return Response({
                "status": "error",
                "message": f"El evento ya se encuentra en estado '{instance.status}'."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 3. ELIMINACIÓN LÓGICA
        instance.status = 'cancelled'
        instance.save()

        # 4. Desactivamos todos sus tickets
        tickets = instance.tickettype_set.all()
        for ticket in tickets:
            ticket.status = 'inactive'
            ticket.save()

        return Response({
            "status": "success",
            "message": "El evento ha sido eliminado lógicamente. El historial de compras previas se mantiene intacto."
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Obtener eventos próximos (no pasados)"""
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

        # Condición 1: Permisos (Solo el promotor dueño puede cancelar)
        if str(event.promoter_id) != str(request.user.id):
            return Response({
                "status": "error",
                "message": "No tienes permisos. Solo el promotor que creó el evento puede cancelarlo."
            }, status=status.HTTP_403_FORBIDDEN)

        # Condición 2: Estado del evento (Evitar doble cancelación)
        if event.status in ['cancelled', 'completed']:
            return Response({
                "status": "error",
                "message": f"Acción denegada. El evento ya se encuentra '{event.status}'."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Condición 3: Validar temporalidad (No cancelar eventos pasados)
        if not event.is_upcoming:
            return Response({
                "status": "error",
                "message": "No se puede cancelar un evento cuya fecha ya pasó o está en curso."
            }, status=status.HTTP_400_BAD_REQUEST)

        tickets = event.tickettype_set.all()
        total_sold = sum(ticket.current_sold for ticket in tickets)

        # Actualizamos el estado del evento
        event.status = 'cancelled'
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
            "tickets_sold": total_sold
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
        """Crear tipo de entrada validando propiedad del evento y capacidad máxima"""
        event_id = request.data.get('event')
        
        try:
            new_capacity = int(request.data.get('max_capacity', 0))
        except ValueError:
            new_capacity = 0

        if not event_id:
            return Response({
                "status": "error",
                "message": "El ID del evento es requerido."
            }, status=status.HTTP_400_BAD_REQUEST)

        from .models import Event
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response({
                "status": "error",
                "message": "El evento especificado no existe."
            }, status=status.HTTP_404_NOT_FOUND)

        # 1. Validar Permisos
        if str(event.promoter_id) != str(request.user.id):
            return Response({
                "status": "error",
                "message": "Acceso denegado. No puedes crear entradas para un evento que no te pertenece."
            }, status=status.HTTP_403_FORBIDDEN)

        # 2. Validar Capacidad
        from django.db.models import Sum
        current_tickets = TicketType.objects.filter(event=event).aggregate(
            total=Sum('max_capacity')
        )['total'] or 0

        if (current_tickets + new_capacity) > event.capacity:
            capacidad_disponible = event.capacity - current_tickets
            return Response({
                "status": "error",
                "message": f"La capacidad solicitada supera el límite del evento. Solo te queda espacio para {capacidad_disponible} entradas más."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 3. Crear el ticket
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
        
        # 1. Validar Permisos
        if str(event.promoter_id) != str(request.user.id):
            return Response({
                "status": "error",
                "message": "Acceso denegado. No puedes editar entradas de un evento que no te pertenece."
            }, status=status.HTTP_403_FORBIDDEN)

        # 2. Obtenemos nueva capacidad
        try:
            new_capacity = request.data.get('max_capacity')
            new_capacity = int(new_capacity) if new_capacity is not None else instance.max_capacity
        except ValueError:
            return Response({
                "status": "error",
                "message": "La capacidad debe ser un número entero válido."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 3. Matemática de cupos
        from django.db.models import Sum
        current_other_tickets = TicketType.objects.filter(event=event).exclude(id=instance.id).aggregate(
            total=Sum('max_capacity')
        )['total'] or 0

        if (current_other_tickets + new_capacity) > event.capacity:
            capacidad_disponible = event.capacity - current_other_tickets
            return Response({
                "status": "error",
                "message": f"Error: Superas la capacidad del evento. Solo puedes aumentar esta entrada hasta un máximo de {capacidad_disponible} cupos."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 4. Guardar la edición
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
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsComprador])
    def purchase(self, request, pk=None):
        """
        Proceso de compra seguro: Identifica al usuario y valida el límite de 1 ticket.
        """
        ticket_type = self.get_object()
        event = ticket_type.event
        comprador_id = request.user.id

        # Validar disponibilidad
        if not ticket_type.is_available:
            return Response({
                "status": "error",
                "message": "Este tipo de entrada está agotado o inactivo."
            }, status=status.HTTP_400_BAD_REQUEST)

       # Usamos transacciones para evitar errores de concurrencia
        try:
            with transaction.atomic():
                # A. Descontamos el inventario
                ticket_type.current_sold += 1
                ticket_type.save()

                # B. Simulamos que se creó la orden de compra
                # Order.objects.create(...)
                fake_purchase_id = str(uuid.uuid4()) # Quita esto cuando tengas tu modelo de Orden real

              # ... (resto de tu código atomic()...)
                fake_purchase_id = str(uuid.uuid4())

                # LLAMAMOS AL SERVICIO ACTUALIZADO (Ahora pide event y ticket_type)
                digital_ticket = TicketGenerationService.generate_digital_ticket(
                    purchase_id=fake_purchase_id,
                    event=event,
                    ticket_type=ticket_type,
                    buyer_id=comprador_id
                )

            # Devolvemos todo al frontend
            return Response({
                "status": "success",
                "message": "Compra procesada exitosamente. Tu entrada está lista.",
                "ticket_data": {
                    "event_name": event.name,
                    "ticket_type": ticket_type.name,
                    "emergency_code": digital_ticket["emergency_code"],
                    "qr_code": digital_ticket["qr_image_base64"],
                    "pdf_file": digital_ticket["pdf_document_base64"] # ¡El frontend solo debe decodificar esto y guardarlo como .pdf!
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                "status": "error",
                "message": "Error interno al procesar la compra.",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def validate_ticket(self, request):
        """
        Endpoint para el personal de seguridad.
        Recibe el código (QR o Alfanumérico) y lo marca como usado.
        """
        from django.utils import timezone
        from django.db.models import Q
        from .models import TicketInstance # Asegúrate de que el nombre coincida con tu models.py

        code = request.data.get('code') # Puede ser el contenido del QR o el alfanumérico
        event_id = request.data.get('event_id')

        if not code or not event_id:
            return Response({
                "error": "Código y event_id son requeridos"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Buscamos la entrada usando el operador Q para buscar en dos columnas a la vez (QR o Emergencia)
            ticket = TicketInstance.objects.get(
                Q(qr_code_data=code) | Q(emergency_code=code),
                ticket_type__event_id=event_id
            )

            # REGLA DE ORO: ¿Ya fue validada antes?
            if ticket.is_used:
                return Response({
                    "status": "DENIED",
                    "message": "ALERTA: ESTA ENTRADA YA FUE USADA",
                    "validated_at": ticket.validated_at
                }, status=status.HTTP_409_CONFLICT)

            # Si llega aquí, la entrada es válida. La "quemamos":
            ticket.is_used = True
            ticket.validated_at = timezone.now()
            ticket.save()

            return Response({
                "status": "SUCCESS",
                "message": "Entrada validada correctamente. ¡Acceso permitido!",
                "details": {
                    "tipo": ticket.ticket_type.name,
                    "zona": ticket.ticket_type.get_zone_type_display()  # type: ignore
                }
            }, status=status.HTTP_200_OK)

        except TicketInstance.DoesNotExist:
            return Response({
                "status": "ERROR",
                "message": "Entrada no encontrada o no pertenece a este evento."
            }, status=status.HTTP_404_NOT_FOUND)
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def mis_entradas(self, request):
        """
        Endpoint para que el comprador vea sus propias entradas.
        """
        
        tickets = TicketInstance.objects.filter(buyer_id=request.user.id).select_related('ticket_type', 'ticket_type__event')
        
        data = []
        for ticket in tickets:
            data.append({
                "id": str(ticket.id),
                "event_name": ticket.ticket_type.event.name,
                "ticket_type": ticket.ticket_type.name,
                "qr_code": ticket.qr_code_data,  # El string en Base64
                "emergency_code": ticket.emergency_code,
                "is_used": ticket.is_used
            })
            
        return Response(data, status=200)    
@action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
def procesar_compra(self, request):
    # 1. Recibir datos reales del frontend
    ticket_type_id = request.data.get('ticket_type_id')
    cantidad = int(request.data.get('quantity', 1))

    try:
        ticket_type = TicketType.objects.get(id=ticket_type_id)
    except TicketType.DoesNotExist:
        return Response({"error": "Tipo de entrada no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    # 2. Validación REAL: ¿Hay espacio?
    if not ticket_type.is_available or ticket_type.available_capacity < cantidad:
        return Response({"error": "Se agotaron las entradas de este tipo"}, status=status.HTTP_400_BAD_REQUEST)

    # 3. Calcular total real
    total = ticket_type.price * cantidad

    # 4. Crear la orden de pago en la Base de Datos (Esto le pone los 15 min de vida automáticamente)
    orden = PaymentOrder.objects.create(
        buyer_id=request.user.id, 
        ticket_type=ticket_type,
        quantity=cantidad,
        total_price=total
    )

    # 5. Generar un QR REAL (No simulado). 
    # Le ponemos los datos de la orden. En un entorno bancario real de Bolivia (Simple), 
    # aquí iría la cadena del banco, pero esto ya es un QR 100% escaneable.
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    datos_qr = f"TICKETGO|ORDEN:{orden.id}|TOTAL:{orden.total_price}|BOB"
    qr.add_data(datos_qr)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer,"PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

   # 6. Devolver todo al frontend
    # Usamos un 'if' en una sola línea para que Pylance sepa que estamos verificando que no sea nulo
    fecha_expiracion = orden.expires_at.isoformat() if orden.expires_at else None

    return Response({
        "order_id": orden.id,
        "total_price": orden.total_price,
        "qr_image": qr_base64,
        "expires_at": fecha_expiracion, # Fecha y hora real de expiración (ahora segura)
        "status": orden.status
    }, status=status.HTTP_201_CREATED)
