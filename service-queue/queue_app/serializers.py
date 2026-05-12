"""
serializers.py — Serializadores para service-queue.
"""

from rest_framework import serializers
from .models import QueueConfig, QueueEntry, QueueLog


class QueueConfigSerializer(serializers.ModelSerializer):
    """Serializer completo de QueueConfig para lectura."""

    class Meta:
        model = QueueConfig
        fields = [
            'id',
            'event_id',
            'max_concurrent_users',
            'payment_timeout_minutes',
            'is_queue_active',
            'updated_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'is_queue_active', 'created_at', 'updated_at']


class QueueConfigWriteSerializer(serializers.ModelSerializer):
    """
    Serializer para crear/actualizar QueueConfig (POST/PUT del Promotor).
    Valida que max_concurrent_users sea > 0.
    La validación contra la capacidad del evento se hace en la View
    consultando service-events.
    """

    class Meta:
        model = QueueConfig
        fields = [
            'max_concurrent_users',
            'payment_timeout_minutes',
        ]

    def validate_max_concurrent_users(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "El umbral debe ser mayor a 0."
            )
        return value

    def validate_payment_timeout_minutes(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "El timeout de pago debe ser mayor a 0 minutos."
            )
        return value


class QueueEntrySerializer(serializers.ModelSerializer):
    """Serializer de lectura para QueueEntry."""

    class Meta:
        model = QueueEntry
        fields = [
            'id',
            'user_id',
            'event_id',
            'position',
            'joined_at',
            'notified_at',
            'accessed_at',
            'status',
        ]
        read_only_fields = fields
