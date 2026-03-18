from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
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
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Obtener solo categorías activas"""
        categories = Category.objects.filter(is_active=True)
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'category', 'event_date']
    search_fields = ['name', 'location', 'description']
    ordering_fields = ['event_date', 'created_at']
    ordering = ['-event_date']

    def get_serializer_class(self):
        if self.action == 'create':
            return EventCreateSerializer
        elif self.action == 'partial_update' or self.action == 'update':
            return EventUpdateSerializer
        return EventSerializer

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Obtener eventos próximos (no pasados)"""
        from django.utils import timezone
        upcoming = Event.objects.filter(event_date__gte=timezone.now().date())
        serializer = EventSerializer(upcoming, many=True)
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
        serializer = EventSerializer(events, many=True)
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
        """Cancelar un evento"""
        event = self.get_object()
        event.status = 'cancelled'
        event.save()
        return Response({'success': 'Event cancelled'})


class TicketTypeViewSet(viewsets.ModelViewSet):
    queryset = TicketType.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['event', 'status']
    search_fields = ['name', 'description']

    def get_serializer_class(self):
        if self.action == 'create':
            return TicketTypeCreateSerializer
        return TicketTypeSerializer

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