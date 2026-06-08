from rest_framework import serializers
from .models import Category, Event, TicketType, UserFavorite, Notification, EventAuditLog, PromoCode, PromotionPlan, EventPromotion, PlatformCommission


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

# ─── TIC-561/562 (US-34): Serializers de planes de promoción ──────────────────

class PromotionPlanSerializer(serializers.ModelSerializer):
    """
    TIC-561: Lectura de planes de promoción disponibles.
    """
    tier_display = serializers.CharField(source='get_tier_display', read_only=True)

    class Meta:
        model = PromotionPlan
        fields = [
            'id',
            'name',
            'tier',
            'tier_display',
            'price_bob',
            'duration_days',
            'priority',
            'description',
            'is_active',
        ]
        read_only_fields = fields

class PromotionPlanUpdateSerializer(serializers.ModelSerializer):
    """
    Serializador para que el SuperAdmin actualice el plan de promoción.
    """
    class Meta:
        model = PromotionPlan
        fields = ['price_bob', 'is_active']

class EventPromotionReadSerializer(serializers.ModelSerializer):
    """
    TIC-562: Lectura de una promoción activa de evento.
    """
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_tier = serializers.CharField(source='plan.tier', read_only=True)
    plan_priority = serializers.IntegerField(source='plan.priority', read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True)
    is_currently_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = EventPromotion
        fields = [
            'id',
            'event',
            'event_name',
            'plan',
            'plan_name',
            'plan_tier',
            'plan_priority',
            'promoter_id',
            'status',
            'started_at',
            'expires_at',
            'amount_paid',
            'is_currently_active',
            'created_at',
        ]
        read_only_fields = fields


class EventPromotionCreateSerializer(serializers.Serializer):
    """
    TIC-562: Contratación de una promoción por el Promotor.
    El Promotor envía el plan que quiere activar.
    """
    plan_id = serializers.UUIDField(help_text='ID del plan de promoción a contratar.')

    def validate_plan_id(self, value):
        try:
            plan = PromotionPlan.objects.get(id=value, is_active=True)
        except PromotionPlan.DoesNotExist:
            raise serializers.ValidationError("Plan de promoción no encontrado o no disponible.")
        self._plan = plan
        return value

    def get_plan(self):
        return self._plan

# ==============================================================================
# SERIALIZERS DE DASHBOARD Y ANALÍTICA (TIC-200)
# ==============================================================================

# ─── TIC-512/514 (US-30): Serializers de códigos de promoción ─────────────────

class PromoCodeReadSerializer(serializers.ModelSerializer):
    """
    TIC-514: Lectura completa de un PromoCode (para el Promotor y validación pública).
    Incluye estado de validez calculado.
    """
    event_name = serializers.CharField(source='event.name', read_only=True, default=None)
    is_currently_valid = serializers.SerializerMethodField()
    uses_remaining = serializers.SerializerMethodField()

    class Meta:
        model = PromoCode
        fields = [
            'id',
            'code',
            'promoter_id',
            'event',
            'event_name',
            'discount_type',
            'discount_value',
            'valid_from',
            'valid_until',
            'max_uses',
            'times_used',
            'uses_remaining',
            'is_active',
            'is_currently_valid',
            'created_at',
        ]
        read_only_fields = fields

    def get_is_currently_valid(self, obj):
        valid, _ = obj.is_valid_for(obj.event or self._get_any_event(obj))
        return valid

    def get_uses_remaining(self, obj):
        if obj.max_uses is None:
            return None  # ilimitado
        return max(0, obj.max_uses - obj.times_used)

    def _get_any_event(self, obj):
        """Helper para is_valid_for cuando el code aplica a todos los eventos."""
        class _FakeEvent:
            id = None
            promoter_id = obj.promoter_id
        return _FakeEvent()


class PromoCodeCreateSerializer(serializers.ModelSerializer):
    """
    TIC-514: Creación/actualización de un PromoCode por el Promotor.
    promoter_id se inyecta desde la view (token JWT).
    """
    class Meta:
        model = PromoCode
        fields = [
            'code',
            'event',
            'discount_type',
            'discount_value',
            'valid_from',
            'valid_until',
            'max_uses',
            'is_active',
        ]
        extra_kwargs = {
            'valid_from': {'required': False},
            'valid_until': {'required': False},
        }

    def create(self, validated_data):
        from django.utils import timezone
        from datetime import timedelta
        
        if 'valid_from' not in validated_data:
            validated_data['valid_from'] = timezone.now()
        if 'valid_until' not in validated_data or not validated_data['valid_until']:
            # Set to 10 years by default if null or not provided
            validated_data['valid_until'] = timezone.now() + timedelta(days=3650)
            
        return super().create(validated_data)

    def validate_code(self, value):
        return value.upper().strip()

    def validate_discount_value(self, value):
        if value <= 0:
            raise serializers.ValidationError("El valor del descuento debe ser mayor a 0.")
        return value

    def validate(self, data):
        discount_type = data.get('discount_type', 'porcentaje')
        discount_value = data.get('discount_value')
        if discount_type == 'porcentaje' and discount_value and discount_value > 100:
            raise serializers.ValidationError(
                {'discount_value': 'El porcentaje de descuento no puede superar 100%.'}
            )
        valid_from = data.get('valid_from')
        valid_until = data.get('valid_until')
        if valid_from and valid_until and valid_until <= valid_from:
            raise serializers.ValidationError(
                {'valid_until': 'La fecha de fin debe ser posterior a la fecha de inicio.'}
            )
        return data


class PromoCodeValidateSerializer(serializers.Serializer):
    """
    TIC-514: Serializer para el endpoint de validación pública de un código
    antes de confirmar la compra.
    """
    code = serializers.CharField(max_length=50)
    event_id = serializers.UUIDField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)


# ==============================================================================
# SERIALIZERS DE CÓDIGOS DE PROMOCIÓN (TIC-300)
# ==============================================================================

class ValidateCodeSerializer(serializers.Serializer):
    """
    TIC-300: Recibe los datos para validar un código promocional en el checkout.
    """
    code = serializers.CharField(required=True, max_length=50)
    event_id = serializers.UUIDField(required=True)
    base_price = serializers.FloatField(required=True)


# ==============================================================================
# SERIALIZERS DE ESTADÍSTICAS DE CÓDIGOS PROMOCIONALES (TIC-302)
# ==============================================================================

class PromoCodeUsageLogSerializer(serializers.Serializer):
    """Estructura simplificada para el historial reciente de uso."""
    purchase_id = serializers.UUIDField(source='id', read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    monto_descontado = serializers.FloatField(source='discount_amount', read_only=True)
    precio_pagado = serializers.FloatField(source='total_price', read_only=True)
    fecha_uso = serializers.DateTimeField(source='created_at', read_only=True)


class PromoCodeStatsSerializer(serializers.Serializer):
    """Estructura global de métricas del código de descuento."""
    code = serializers.CharField(read_only=True)
    used_count = serializers.IntegerField(read_only=True)
    total_descontado = serializers.FloatField(read_only=True)
    ultimos_usos = PromoCodeUsageLogSerializer(many=True, read_only=True)

class DashboardSummarySerializer(serializers.Serializer):
    """
    TIC-200: Estructura de salida para el Dashboard Financiero Global.
    Garantiza que todos los datos numéricos mantengan el tipo de dato correcto.
    """
    ingresos_comisiones = serializers.FloatField(read_only=True)
    ingresos_promociones = serializers.FloatField(read_only=True)
    total_sistema = serializers.FloatField(read_only=True)
    tickets_vendidos = serializers.IntegerField(read_only=True)
    promotores_activos = serializers.IntegerField(read_only=True)
class TopPromotorSerializer(serializers.Serializer):
    """
    TIC-201: Estructura para el top de promotores que generan más ingresos.
    """
    promotor_id = serializers.UUIDField(read_only=True)
    total_generado = serializers.FloatField(read_only=True)
    eventos_publicados = serializers.IntegerField(read_only=True)

class DashboardEvolutionSerializer(serializers.Serializer):
    """
    TIC-202: Estructura para la evolución temporal de ingresos mensuales.
    """
    mes = serializers.CharField(read_only=True)  # Formato: "YYYY-MM"
    ingresos_comisiones = serializers.FloatField(read_only=True)

class PlatformCommissionReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformCommission
        fields = '__all__'

class PlatformCommissionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformCommission
        fields = ['commission_type', 'percentage_value', 'fixed_value', 'valid_from', 'notes']