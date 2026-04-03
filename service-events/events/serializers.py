from rest_framework import serializers
from .models import Category, Event, TicketType


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
    tickets = TicketTypeSerializer(source='tickettype_set', many=True, read_only=True)
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
            'created_at',
            'category',
            'category_name',
            'tickets',
            'disponibilidad'
        ]
        read_only_fields = ['id', 'created_at']

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
        seat_rows = attrs.get('seat_rows', getattr(instance, 'seat_rows', None))
        seats_per_row = attrs.get('seats_per_row', getattr(instance, 'seats_per_row', None))
        current_sold = getattr(instance, 'current_sold', 0)
        zone_type = attrs.get('zone_type', getattr(instance, 'zone_type', 'general'))
        is_vip = attrs.get('is_vip', getattr(instance, 'is_vip', False))

        if (seat_rows is None) != (seats_per_row is None):
            raise serializers.ValidationError(
                'Debes enviar filas y asientos por fila para configurar la distribución de la zona.'
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