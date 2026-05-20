from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, EventViewSet, TicketTypeViewSet,
    PurchaseView, SimularPagoView, PurchaseStatusView,
    SeatConfigurationView, ValidateTicketView, WaitlistView,
    LogoutView, PurchaseHistoryView, PurchaseDetailView,
    PurchaseDownloadPDFView, PurchaseCancelView,
    SeatListView, SeatReserveView, SeatBulkReserveView,
    SeatReleaseExpiredView,  # US20: barrendero
    QueueConfigView,         # US14: configuracion de cola por promotor
    AdminEventEditView,      # TIC-406: editar evento por admin
    AdminEventDeactivateView, # TIC-407: dar de baja evento por admin
    AdminAuditLogListView,   # TIC-421: historial de auditoria de eventos
    EventAuditLogListView,   # TIC-420: audit log de un evento especifico
    ExportAuditLogCSVView,   # TIC-423: exportar audit log a CSV
    # US21: Favoritos y Recomendaciones
    UserFavoritesView,
    UserFavoriteToggleView,
    UserRecommendationsAPIView,
    UserRecommendationsListView,
    # US22: Notificaciones
    UserNotificationsView,
    UserNotificationReadView,
    UserNotificationReadAllView,
    NotificationPreferenceView,
    # US24: SuperAdmin (gestion remota)
    SuperAdminManageView,
    # US23: Limpieza datos locales tras baja de cuenta
    AdminUserCleanupView,
)

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
    # US14: Configuración de cola virtual por promotor (TIC-350, TIC-351, TIC-352)
    path('queue-config/<uuid:event_id>/', QueueConfigView.as_view(), name='queue-config'),

    # US24: Gestión SuperAdmin (TIC-398/399 - proxy a service-auth)
    path('superadmin/admins/<uuid:user_id>/permissions/', SuperAdminManageView.as_view(), name='admin-permissions'),
    path('superadmin/admins/<uuid:user_id>/suspend/', SuperAdminManageView.as_view(), name='admin-suspend'),

    # TIC-25: Gestión administrativa de eventos
    path('admin/events/<uuid:event_id>/', AdminEventEditView.as_view(), name='admin-event-edit'),
    path('admin/events/<uuid:event_id>/deactivate/', AdminEventDeactivateView.as_view(), name='admin-event-deactivate'),

    # US23: Limpieza local tras baja de cuenta (llamado por service-auth)
    path('admin/users/<uuid:user_id>/cleanup/', AdminUserCleanupView.as_view(), name='admin-user-cleanup'),

    # TIC-26: Auditoría de eventos
    path('admin/audit-log/', AdminAuditLogListView.as_view(), name='admin-audit-log'),
    path('admin/audit-log/export/', ExportAuditLogCSVView.as_view(), name='admin-audit-log-export'),
    path('admin/events/<uuid:event_id>/audit-log/', EventAuditLogListView.as_view(), name='admin-event-audit-log'),

    # US21: Favoritos
    path('users/<uuid:user_id>/favorites/', UserFavoritesView.as_view(), name='user-favorites'),
    path('users/<uuid:user_id>/favorites/<uuid:event_id>/', UserFavoriteToggleView.as_view(), name='user-favorite-toggle'),

    # US21: Recomendaciones
    path('my-recommendations/', UserRecommendationsAPIView.as_view(), name='user-specific-recommendations'),
    path('users/<uuid:user_id>/recommendations/', UserRecommendationsListView.as_view(), name='user-recommendations-list'),

    # US22: Notificaciones
    path('users/<uuid:user_id>/notifications/', UserNotificationsView.as_view(), name='user-notifications'),
    path('users/<uuid:user_id>/notifications/read-all/', UserNotificationReadAllView.as_view(), name='user-notifications-read-all'),
    path('users/<uuid:user_id>/notifications/<uuid:notif_id>/read/', UserNotificationReadView.as_view(), name='user-notification-read'),
    path('users/<uuid:user_id>/notification-preferences/', NotificationPreferenceView.as_view(), name='set-notification-preferences'),
]
