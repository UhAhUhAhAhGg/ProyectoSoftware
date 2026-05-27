from rest_framework import serializers
from .models import Category, Event, TicketType, UserFavorite, Notification, EventAuditLog, PlatformCommission


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'is_active']


class TicketTypeSerializer(serializers.ModelSerializer):
    available_capacity = serializers.IntegerField(read_only=True)
    configured_seats = serializers.IntegerField(read_only=True)

    class Meta:
        model = TicketType
        fields = [
            'id',
            'event',
            'name',
            'description',
            'price',
            'max_capacity',
            'zone_type',
            'is_vip',
            'seat_rows',
            'seats_per_row',
            'configured_seats',
            'current_sold',
            'available_capacity',
            'status',
        ]


class EventSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    tickets = TicketTypeSerializer(source='ticket_types', many=True, read_only=True)
    disponibilidad = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id',
            'promoter_id',
            'name',           # PA: Nombre
            'description',
            'event_date',     # PA: Fecha
            'event_time',
            'location',       # PA: Lugar
            'capacity',
            'image',
            'status',
            'admin_status',
            'created_at',
            'category',
            'category_name',
            'tickets',
            'disponibilidad'
        ]
        read_only_fields = ['id', 'created_at', 'admin_status']

    def get_disponibilidad(self, obj):
        # Si el evento no está publicado, no debe mostrarse como disponible
        if obj.status != 'published':
            return "No disponible"
            
        # Validación base: Si la capacidad es mayor a 0. 
        # (Nota: Más adelante, cuando integres ventas, aquí restaremos los tickets vendidos)
        if obj.capacity and obj.capacity > 0:
            return "Disponible"
            
        return "Agotado"


class EventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            'id',
            'promoter_id',
            'name',
            'description',
            'event_date',
            'event_time',
            'location',
            'capacity',
            'image',
            'status',
            'category'
        ]
        read_only_fields = ['id']


class EventUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            'name',
            'description',
            'event_date',
            'event_time',
            'location',
            'capacity',
            'image',
            'status',
            'category'
        ]


class TicketTypeCreateSerializer(serializers.ModelSerializer):
    description = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = TicketType
        fields = [
            'event',
            'name',
            'description',
            'price',
            'max_capacity',
            'zone_type',
            'is_vip',
            'seat_rows',
            'seats_per_row',
            'status',
        ]

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        max_capacity = attrs.get('max_capacity', getattr(instance, 'max_capacity', None))
        current_sold = getattr(instance, 'current_sold', 0)
        zone_type = attrs.get('zone_type', getattr(instance, 'zone_type', 'general'))
        is_vip = attrs.get('is_vip', getattr(instance, 'is_vip', False))

        # Determinar si los campos de layout llegaron explícitamente en el request.
        # En PATCH parcial, solo validamos si el cliente los envió intencionalmente.
        request = self.context.get('request')
        request_data = getattr(request, 'data', {}) if request else attrs

        seat_rows_in_request = 'seat_rows' in request_data
        seats_per_row_in_request = 'seats_per_row' in request_data

        seat_rows = attrs.get('seat_rows', getattr(instance, 'seat_rows', None))
        seats_per_row = attrs.get('seats_per_row', getattr(instance, 'seats_per_row', None))

        # Solo validar layout si ambos campos vienen en el request
        if seat_rows_in_request or seats_per_row_in_request:
            if (seat_rows is None) != (seats_per_row is None):
                raise serializers.ValidationError(
                    'Debes enviar filas y asientos por fila juntos para configurar la distribución.'
                )

            if seat_rows is not None and seats_per_row is not None:
                configured_seats = seat_rows * seats_per_row
                if configured_seats != max_capacity:
                    raise serializers.ValidationError(
                        'La capacidad de la zona debe coincidir exactamente con filas x asientos por fila.'
                    )

        if max_capacity is not None and max_capacity < current_sold:
            raise serializers.ValidationError(
                f'No puedes reducir la capacidad por debajo de las ventas realizadas ({current_sold}).'
            )

        attrs['is_vip'] = is_vip or zone_type == 'vip'
        return attrs

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("El precio debe ser mayor a 0.")
        return value

    def validate_max_capacity(self, value):
        if value <= 0:
            raise serializers.ValidationError("La capacidad debe ser mayor a 0.")
        return value

    def validate_seat_rows(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('Las filas deben ser mayores a 0.')
        return value

    def validate_seats_per_row(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('Los asientos por fila deben ser mayores a 0.')
        return value


class QueueConfigSerializer(serializers.ModelSerializer):
    """
    Serializer para leer y actualizar la configuración de cola de un evento.
    Solo expone los campos relevantes para la cola virtual.
    """
    class Meta:
        model = Event
        fields = [
            'id',
            'name',
            'waitlist_threshold',
            'waitlist_active',
            'payment_timeout_minutes',
        ]
        read_only_fields = ['id', 'name', 'waitlist_active']

    def validate_waitlist_threshold(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "El umbral debe ser mayor a 0."
            )
        if value > 100:
            raise serializers.ValidationError(
                "El umbral no puede superar el 100%."
            )
        return value

    def validate_payment_timeout_minutes(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "El tiempo de pago debe ser mayor a 0 minutos."
            )
        if value > 60:
            raise serializers.ValidationError(
                "El tiempo de pago no puede superar 60 minutos."
            )
        return value


class UserFavoriteSerializer(serializers.ModelSerializer):
    event_detail = EventSerializer(source='event', read_only=True)

    class Meta:
        model = UserFavorite
        fields = ['id', 'event', 'event_detail', 'created_at']
        read_only_fields = ['id', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    event_nombre = serializers.CharField(
        source='event.name',
        read_only=True,
        default=None
    )
    event_fecha = serializers.DateField(
        source='event.event_date',
        read_only=True,
        default=None
    )

    class Meta:
        model = Notification
        fields = [
            'id',
            'tipo',
            'titulo',
            'mensaje',
            'leida',
            'created_at',
            'leida_at',
            'event',
            'event_nombre',
            'event_fecha',
        ]
        read_only_fields = ['id', 'created_at', 'leida_at']


class NotificationPreferenceUpdateSerializer(serializers.Serializer):
    """
    TIC-377: Serializer para PUT /users/{id}/notification-preferences/
    """
    category_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=True,
        help_text="Lista de IDs de categorías para activar notificaciones.",
    )


class EventAuditLogSerializer(serializers.ModelSerializer):
    """
    TIC-420/423: Serializer del historial de auditoría de eventos.
    """
    event_id = serializers.UUIDField(source='event.id', read_only=True)

    class Meta:
        model = EventAuditLog
        fields = [
            'id',
            'event_id',
            'event_name',
            'admin_id',
            'admin_email',
            'action',
            'reason',
            'changed_fields',
            'old_status',
            'new_status',
            'created_at',
        ]
        read_only_fields = fields


# ─── TIC-526 (US-31): Serializers de comisiones de la plataforma ──────────────

class PlatformCommissionReadSerializer(serializers.ModelSerializer):
    """
    TIC-526: Serializer de solo lectura para la comisión activa.
    Expone todos los campos para que el frontend pueda mostrar la config actual.
    """
    class Meta:
        model = PlatformCommission
        fields = [
            'id',
            'commission_type',
            'percentage_value',
            'fixed_value',
            'is_active',
            'valid_from',
            'created_by',
            'notes',
            'created_at',
        ]
        read_only_fields = fields


class PlatformCommissionCreateSerializer(serializers.ModelSerializer):
    """
    TIC-526: Serializer de escritura para crear una nueva configuración de comisión.
    El SuperAdmin solo envía los campos de negocio; created_by se inyecta desde la view.
    """
    class Meta:
        model = PlatformCommission
        fields = [
            'commission_type',
            'percentage_value',
            'fixed_value',
            'valid_from',
            'notes',
        ]

    def validate(self, data):
        commission_type = data.get('commission_type', 'porcentaje')
        pct = data.get('percentage_value')
        fixed = data.get('fixed_value')

        if commission_type in ('porcentaje', 'hibrido') and not pct:
            raise serializers.ValidationError(
                {'percentage_value': 'Este campo es obligatorio para el tipo seleccionado.'}
            )
        if commission_type in ('fijo', 'hibrido') and not fixed:
            raise serializers.ValidationError(
                {'fixed_value': 'Este campo es obligatorio para el tipo seleccionado.'}
            )
        if pct is not None and (pct < 0 or pct > 100):
            raise serializers.ValidationError(
                {'percentage_value': 'El porcentaje debe estar entre 0 y 100.'}
            )
        if fixed is not None and fixed < 0:
            raise serializers.ValidationError(
                {'fixed_value': 'El valor fijo no puede ser negativo.'}
            )
        return data
