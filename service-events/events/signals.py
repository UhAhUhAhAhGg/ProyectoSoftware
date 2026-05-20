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


# ─────────────────────────────────────────────────────────────────────────────
# SUBTAREAS 1 y 2: Auditoría automática de cambios en Event
# ─────────────────────────────────────────────────────────────────────────────

from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver
from .models import Event, EventAuditLog, event_to_dict


# ─────────────────────────────────────────────────────────────
# pre_save: guardar snapshot del estado ANTERIOR antes de guardar
# ─────────────────────────────────────────────────────────────
@receiver(pre_save, sender=Event)
def capturar_estado_anterior(sender, instance, **kwargs):
    """
    Antes de guardar, obtiene el estado actual desde la BD
    y lo almacena en el instance para que post_save lo use.
    No genera log — solo prepara el snapshot anterior.
    """
    if instance.pk:
        try:
            instance._estado_anterior = event_to_dict(
                Event.objects.get(pk=instance.pk)
            )
        except Event.DoesNotExist:
            instance._estado_anterior = None
    else:
        # Es una creación — no hay estado anterior
        instance._estado_anterior = None


# ─────────────────────────────────────────────────────────────
# SUBTAREA 1: post_save — creaciones y actualizaciones
# ─────────────────────────────────────────────────────────────
@receiver(post_save, sender=Event)
def registrar_cambio_evento(sender, instance, created, **kwargs):
    """
    Se ejecuta automáticamente después de cada Event.save().
    Registra creaciones y actualizaciones en event_audit_log.
    
    Para soft-delete (admin_status='dado_de_baja') detecta
    automáticamente el cambio y lo registra como 'soft_delete'.
    """
    try:
        estado_nuevo = event_to_dict(instance)
        estado_anterior = getattr(instance, '_estado_anterior', None)

        if created:
            # ── CREACIÓN ──────────────────────────────────────
            EventAuditLog.objects.create(
                evento_id=instance.id,
                evento_nombre=instance.name,
                operacion='create',
                estado_anterior=None,
                estado_nuevo=estado_nuevo,
                campos_modificados=None,
                motivo_baja=None,
            )
            logger.info(f"[EventAuditLog] CREATE: {instance.name} ({instance.id})")

        else:
            # ── ACTUALIZACIÓN ─────────────────────────────────
            campos_modificados = {}

            if estado_anterior:
                for campo, valor_nuevo in estado_nuevo.items():
                    valor_anterior = estado_anterior.get(campo)
                    if str(valor_anterior) != str(valor_nuevo):
                        campos_modificados[campo] = {
                            'antes': valor_anterior,
                            'despues': valor_nuevo,
                        }

            if not campos_modificados:
                # No hubo cambios reales — no generar log vacío
                return

            # Detectar si es un soft-delete por cambio de admin_status
            es_soft_delete = (
                'admin_status' in campos_modificados and
                campos_modificados['admin_status']['despues'] == 'dado_de_baja'
            )

            operacion = 'soft_delete' if es_soft_delete else 'update'
            motivo_baja = instance.admin_baja_motivo if es_soft_delete else None

            EventAuditLog.objects.create(
                evento_id=instance.id,
                evento_nombre=instance.name,
                operacion=operacion,
                estado_anterior=estado_anterior,
                estado_nuevo=estado_nuevo,
                campos_modificados=campos_modificados,
                motivo_baja=motivo_baja,
            )
            logger.info(
                f"[EventAuditLog] {operacion.upper()}: "
                f"{instance.name} ({instance.id}) — "
                f"campos: {list(campos_modificados.keys())}"
            )

    except Exception as e:
        # El signal nunca debe romper el flujo principal
        logger.error(f"[EventAuditLog] Error en post_save signal: {e}")


# ─────────────────────────────────────────────────────────────
# SUBTAREA 2: post_delete — eliminaciones físicas (hard delete)
# ─────────────────────────────────────────────────────────────
@receiver(post_delete, sender=Event)
def registrar_eliminacion_evento(sender, instance, **kwargs):
    """
    Se ejecuta automáticamente después de cada Event.delete().
    Registra la eliminación física en event_audit_log.
    
    El snapshot del estado anterior se guarda como último
    estado conocido antes de la eliminación.
    """
    try:
        # Usar el snapshot guardado por pre_save si existe,
        # o construirlo desde la instancia en memoria
        estado_anterior = getattr(
            instance, '_estado_anterior', None
        ) or event_to_dict(instance)

        EventAuditLog.objects.create(
            evento_id=instance.id,
            evento_nombre=instance.name,
            operacion='delete',
            estado_anterior=estado_anterior,
            estado_nuevo=None,
            campos_modificados=None,
            motivo_baja=instance.admin_baja_motivo or None,
        )
        logger.info(
            f"[EventAuditLog] DELETE: {instance.name} ({instance.id})"
        )

    except Exception as e:
        logger.error(f"[EventAuditLog] Error en post_delete signal: {e}")
