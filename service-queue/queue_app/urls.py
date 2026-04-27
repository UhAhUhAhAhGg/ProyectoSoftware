"""
urls.py — Rutas de queue_app.
"""

from django.urls import path
from .views import QueueConfigView, QueueHealthView, QueueEnterView, QueueStatusView

urlpatterns = [
    # US14: Configuración de cola por evento
    path('queue-config/<uuid:event_id>/', QueueConfigView.as_view(), name='queue-config'),

    # Health check (sin autenticación)
    path('health/', QueueHealthView.as_view(), name='queue-health'),
    
    # US18: Entrada y estado de la cola
    path('queue/<uuid:event_id>/enter/', QueueEnterView.as_view(), name='queue-enter'),
    path('queue/<uuid:event_id>/status/', QueueStatusView.as_view(), name='queue-status'),
]
