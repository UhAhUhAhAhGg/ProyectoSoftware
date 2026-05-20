"""
signals.py — TIC-373 + TIC-417/418/419 (Auditoría automática de Event)

Signals que disparan:
  - Notificaciones de match al publicar evento (TIC-373/374)
  - Registro automático en EventAuditLog en cambios y eliminaciones (TIC-417/418/419)
"""
import logging
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import Event, EventAuditLog

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# TIC-373: Matching de notificaciones al publicar evento
# ─────────────────────────────────────────────────────────────────────────────

@receiver(post_save, sender=Event)
def on_event_published_match(sender, instance, created, **kwargs):
    """
    Se ejecuta cada vez que se guarda un Event.
    Solo lanza el matching si el evento acaba de pasar a 'published'.
    """
    from .services import MatchingService

    event = instance

    if event.status != 'published':
        return

    previous_status = getattr(event, '_previous_status', None)

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
        logger.error(
            f"[Signal TIC-373] Error en matching para evento '{event.name}': {e}",
            exc_info=True,
        )


# ─────────────────────────────────────────────────────────────────────────────
# TIC-417/418/419: Auditoría automática de cambios en Event
# ─────────────────────────────────────────────────────────────────────────────

# Campos que rastreamos para detectar cambios
AUDITED_FIELDS = [
    'name', 'description', 'event_date', 'event_time', 'location',
    'capacity', 'status', 'category_id', 'image',
    'admin_status', 'admin_reason',
]


def _event_snapshot(event):
    """Captura el estado actual de un evento como dict serializable."""
    return {
        field: str(getattr(event, field, None)) if getattr(event, field, None) is not None else None
        for field in AUDITED_FIELDS
    }


@receiver(pre_save, sender=Event)
def capturar_estado_anterior(sender, instance, **kwargs):
    """
    Antes de guardar, captura el estado actual desde la BD
    para que post_save pueda comparar.
    """
    if instance.pk:
        try:
            instance._estado_anterior = _event_snapshot(
                Event.objects.get(pk=instance.pk)
            )
            instance._previous_status = Event.objects.get(pk=instance.pk).status
        except Event.DoesNotExist:
            instance._estado_anterior = None
            instance._previous_status = None
    else:
        instance._estado_anterior = None
        instance._previous_status = None


@receiver(post_save, sender=Event)
def registrar_cambio_evento(sender, instance, created, **kwargs):
    """
    TIC-417/419: Registra automáticamente cambios en EventAuditLog
    después de cada save. Captura precios/cupos via ticket_types relacionados
    se hace por separado en sus propios signals.

    Solo registra cuando hay un admin_id disponible en _audit_admin_id
    (seteado por vistas administrativas para no spammear el log con cambios
    de promotores).
    """
    admin_id = getattr(instance, '_audit_admin_id', None)
    admin_email = getattr(instance, '_audit_admin_email', None)

    if not admin_id:
        # Solo auditamos cambios administrativos explícitos.
        # Cambios de promotores no entran en EventAuditLog.
        return

    try:
        estado_nuevo = _event_snapshot(instance)
        estado_anterior = getattr(instance, '_estado_anterior', None)

        if created:
            EventAuditLog.objects.create(
                event=instance,
                event_name=instance.name,
                admin_id=admin_id,
                admin_email=admin_email or 'system',
                action='edit',
                changed_fields={'created': estado_nuevo},
            )
            return

        # Detectar campos modificados
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
            return

        # Detectar si es soft-delete (deactivate)
        es_deactivate = (
            'admin_status' in campos_modificados and
            campos_modificados['admin_status']['despues'] == 'deactivated'
        )
        action = 'deactivate' if es_deactivate else 'edit'

        EventAuditLog.objects.create(
            event=instance,
            event_name=instance.name,
            admin_id=admin_id,
            admin_email=admin_email or 'system',
            action=action,
            reason=getattr(instance, 'admin_reason', None),
            changed_fields=campos_modificados,
            old_status=(estado_anterior or {}).get('status'),
            new_status=estado_nuevo.get('status'),
        )
        logger.info(
            f"[TIC-417] EventAuditLog {action.upper()}: "
            f"{instance.name} ({instance.id}) — "
            f"campos: {list(campos_modificados.keys())}"
        )

    except Exception as e:
        logger.error(f"[TIC-417] Error en post_save signal: {e}", exc_info=True)


@receiver(post_delete, sender=Event)
def registrar_eliminacion_evento(sender, instance, **kwargs):
    """
    TIC-418: La eliminación física de eventos NO está soportada en este sistema.
    Solo logueamos como advertencia si ocurre, pero la baja administrativa
    se hace via TIC-407 (deactivate) que registra correctamente en EventAuditLog.
    """
    logger.warning(
        f"[TIC-418] post_delete disparado para evento '{instance.name}' "
        f"({instance.id}). La política recomendada es soft-delete (deactivate)."
    )
