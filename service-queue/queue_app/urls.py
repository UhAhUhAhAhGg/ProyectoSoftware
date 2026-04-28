"""
urls.py — Rutas de queue_app.
"""

from django.urls import path
from .views import (
    QueueConfigView,
    QueueHealthView,
    QueueEnterView,
    QueueStatusView,
    QueuePositionView,
    QueueLeaveView,
    SyncQueueConfigView,
)

urlpatterns = [
    # US14: Configuración de cola por evento (para Promotores)
    path('queue-config/<uuid:event_id>/', QueueConfigView.as_view(), name='queue-config'),

    # Health check (sin autenticación)
    path('health/', QueueHealthView.as_view(), name='queue-health'),

    # US18: Entrada y estado de la cola virtual
    path('queue/<uuid:event_id>/enter/', QueueEnterView.as_view(), name='queue-enter'),
    path('queue/<uuid:event_id>/status/', QueueStatusView.as_view(), name='queue-status'),

    # US19: Posición en cola y ETA (TIC-309)
    path('queue/<uuid:event_id>/position/', QueuePositionView.as_view(), name='queue-position'),

    # US19: Abandonar la cola voluntariamente
    path('queue/<uuid:event_id>/leave/', QueueLeaveView.as_view(), name='queue-leave'),

    # Internal: Sync de configuración desde service-events (sin auth)
    path('internal/sync-config/<uuid:event_id>/', SyncQueueConfigView.as_view(), name='sync-config'),
]
