from rest_framework import serializers
from .models import Category, Event, TicketType


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'is_active']


class TicketTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketType
        fields = ['id', 'event_id', 'name', 'description', 'price', 'max_capacity', 'status']


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
    class Meta:
        model = TicketType
        fields = ['event', 'name', 'description', 'price', 'max_capacity', 'status']

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("El precio debe ser mayor a 0.")
        return value

    def validate_max_capacity(self, value):
        if value <= 0:
            raise serializers.ValidationError("La capacidad debe ser mayor a 0.")
        return value