"""
urls.py — Rutas de queue_app.
"""

from django.urls import path
from .views import QueueConfigView, QueueHealthView, QueuePositionView, QueueLeaveView

urlpatterns = [
    # US14: Configuración de cola por evento
    path('queue-config/<uuid:event_id>/', QueueConfigView.as_view(), name='queue-config'),

    # Health check (sin autenticación)
    path('health/', QueueHealthView.as_view(), name='queue-health'),

    # US19: Posición en cola y ETA (TIC-309)
    path('queue/<uuid:event_id>/position/', QueuePositionView.as_view(), name='queue-position'),

    # US19: Abandonar la cola voluntariamente
    path('queue/<uuid:event_id>/leave/', QueueLeaveView.as_view(), name='queue-leave'),
]
