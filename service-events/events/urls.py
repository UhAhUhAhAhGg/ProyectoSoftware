from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, EventViewSet, TicketTypeViewSet, PurchaseView, SimularPagoView, PurchaseStatusView, SeatConfigurationView, ValidateTicketView, WaitlistView, LogoutView, PurchaseHistoryView, PurchaseDetailView, PurchaseDownloadPDFView, PurchaseCancelView, SeatListView, SeatReserveView, SeatBulkReserveView, SeatReleaseExpiredView

app_name = 'events'

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'events', EventViewSet, basename='event')
router.register(r'ticket-types', TicketTypeViewSet, basename='ticket-type')

urlpatterns = [
    path('', include(router.urls)),
    
    # Compra: iniciar orden (→ pending) y confirmar pago
    path('purchase/', PurchaseView.as_view(), name='purchase'),
    path('purchase/<uuid:purchase_id>/simular_pago/', SimularPagoView.as_view(), name='simular-pago'),
    path('purchase/<uuid:purchase_id>/status/', PurchaseStatusView.as_view(), name='purchase-status'),
    path('purchase/<uuid:purchase_id>/cancel/', PurchaseCancelView.as_view(), name='purchase-cancel'),
    # Validación de entrada en puerta
    path('tickets/validate/', ValidateTicketView.as_view(), name='validate-ticket'),
    # Configuración de asientos
    path('events/<uuid:event_id>/seat-config/', SeatConfigurationView.as_view(), name='seat-config'),
    # Lista de espera
    path('waitlist/', WaitlistView.as_view(), name='waitlist'),
    # Logout
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    # Historial de compras
    path('purchases/history/', PurchaseHistoryView.as_view(), name='purchase-history'),
    path('purchases/<uuid:purchase_id>/', PurchaseDetailView.as_view(), name='purchase-detail'),
    path('purchases/<uuid:purchase_id>/download-pdf/', PurchaseDownloadPDFView.as_view(), name='purchase-download-pdf'),
    # Asientos individuales (TIC-11)
    path('seats/', SeatListView.as_view(), name='seat-list'),
    path('seats/bulk-reserve/', SeatBulkReserveView.as_view(), name='seat-bulk-reserve'),
    path('seats/<uuid:seat_id>/reserve/', SeatReserveView.as_view(), name='seat-reserve'),
    # US20: Endpoint interno para liberar asientos expirados (llamado por service-queue)
    path('seats/release-expired/', SeatReleaseExpiredView.as_view(), name='seat-release-expired'),
]