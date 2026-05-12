from django.contrib import admin
from .models import QueueConfig, QueueEntry, QueueLog, SeatReservation


@admin.register(QueueConfig)
class QueueConfigAdmin(admin.ModelAdmin):
    list_display = ['event_id', 'max_concurrent_users', 'payment_timeout_minutes', 'is_queue_active', 'updated_at']
    list_filter = ['is_queue_active']
    search_fields = ['event_id']


@admin.register(QueueEntry)
class QueueEntryAdmin(admin.ModelAdmin):
    list_display = ['user_id', 'event_id', 'position', 'status', 'joined_at']
    list_filter = ['status']
    search_fields = ['user_id', 'event_id']


@admin.register(QueueLog)
class QueueLogAdmin(admin.ModelAdmin):
    list_display = ['event_type', 'user_id', 'event_id', 'created_at']
    list_filter = ['event_type']
    ordering = ['-created_at']


@admin.register(SeatReservation)
class SeatReservationAdmin(admin.ModelAdmin):
    list_display = ['seat_id', 'user_id', 'status', 'reserved_at', 'expires_at', 'released_at']
    list_filter = ['status']
    search_fields = ['seat_id', 'user_id', 'purchase_id']
    ordering = ['-reserved_at']
