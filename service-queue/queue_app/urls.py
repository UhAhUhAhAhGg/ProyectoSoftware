"""
urls.py — Rutas de queue_app.
"""

from django.urls import path
from .views import QueueConfigView, QueueHealthView

urlpatterns = [
    # US14: Configuración de cola por evento
    path('queue-config/<uuid:event_id>/', QueueConfigView.as_view(), name='queue-config'),

    # Health check (sin autenticación)
    path('health/', QueueHealthView.as_view(), name='queue-health'),
]
