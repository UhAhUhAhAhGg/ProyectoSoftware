from django.contrib import admin
from .models import Category, Event, TicketType


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    ordering = ('name',)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'promoter_id', 'event_date', 'location', 'capacity', 'status', 'category')
    list_filter = ('status', 'event_date', 'category')
    search_fields = ('name', 'description', 'location')
    readonly_fields = ('created_at',)
    date_hierarchy = 'event_date'
    ordering = ('-event_date',)


@admin.register(TicketType)
class TicketTypeAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'event', 'price', 'max_capacity', 'current_sold', 'status')
    list_filter = ('status', 'event')
    search_fields = ('name', 'event__name')
    ordering = ('event', 'name')