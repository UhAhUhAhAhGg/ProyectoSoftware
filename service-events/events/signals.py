"""
signals.py — TIC-373
Django signal que dispara el MatchingService al publicar un evento.

El signal escucha post_save en el modelo Event. Cuando el status
cambia a 'published', invoca MatchingService.procesar_evento_publicado()
para generar las notificaciones de match en < 5 minutos (TIC-374).
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender='events.Event')
def on_event_saved(sender, instance, created, **kwargs):
    """
    Se ejecuta cada vez que se guarda un Event.
    Solo lanza el matching si el evento acaba de pasar a 'published'.
    """
    # Importación diferida para evitar circular imports
    from .services import MatchingService

    event = instance

    # Solo procesar eventos que acaban de publicarse
    if event.status != 'published':
        return

    # Si es una creación y ya viene como 'published', procesamos
    # Si es una actualización, __previous_status detecta el cambio
    previous_status = getattr(event, '_previous_status', None)

    # Si el status anterior era 'published', ya se notificó antes → skip
    if not created and previous_status == 'published':
        return

    logger.info(
        f"[Signal TIC-373] Evento '{event.name}' publicado — iniciando matching."
    )

    try:
        total = MatchingService.procesar_evento_publicado(event)
        logger.info(
            f"[Signal TIC-373] Matching finalizado para '{event.name}': "
            f"{total} notificaciones generadas."
        )
    except Exception as e:
        # Nunca dejar que el matching rompa el guardado del evento
        logger.error(
            f"[Signal TIC-373] Error en matching para evento '{event.name}': {e}",
            exc_info=True,
        )
