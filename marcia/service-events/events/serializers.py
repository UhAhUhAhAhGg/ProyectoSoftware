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
            'status',
            'created_at',
            'category_name',
            'tickets'
        ]
        read_only_fields = ['id', 'created_at']


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