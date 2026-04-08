from django.urls import path, include
from rest_framework.routers import DefaultRouter
<<<<<<< HEAD
from .views import CategoryViewSet, EventViewSet, TicketTypeViewSet, PurchaseView, SeatConfigurationView, ValidateTicketView, WaitlistView, LogoutView, PurchaseHistoryView

app_name = 'events'
=======
from .views import CategoryViewSet, EventViewSet, TicketTypeViewSet
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'events', EventViewSet, basename='event')
router.register(r'ticket-types', TicketTypeViewSet, basename='ticket-type')

urlpatterns = [
    path('', include(router.urls)),
<<<<<<< HEAD
    
    # ✅ endpoint de compra
    path('purchase/', PurchaseView.as_view(), name='purchase'),
    # ✅ endpoint de validación de entrada (puerta)
    path('tickets/validate/', ValidateTicketView.as_view(), name='validate-ticket'),
    # ✅ endpoint de configuración de asientos
    path('events/<uuid:event_id>/seat-config/', SeatConfigurationView.as_view(), name='seat-config'),
    # ✅ endpoint de lista de espera
    path('waitlist/', WaitlistView.as_view(), name='waitlist'),
    # ✅ endpoint de logout
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    # ✅ endpoint de historial de compras
    path('purchases/history/', PurchaseHistoryView.as_view(), name='purchase-history'),
=======
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
]