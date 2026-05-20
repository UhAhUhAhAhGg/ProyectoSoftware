"""
utils.py — Helpers transversales para el modulo events.

log_admin_action (US23/US26 Anghelo): Registra una accion administrativa.
Adaptado al schema actual de auditoria (EventAuditLog). Las acciones sobre
EVENTOS quedan registradas automaticamente via signals (TIC-417/418/419);
este helper se usa para acciones sobre USUARIOS que no tienen vinculo directo
con un evento, solo loguea en el logger del modulo.
"""
import logging

logger = logging.getLogger(__name__)


def log_admin_action(request, target_user_id=None, action='edit', details=""):
    """
    Registra una accion administrativa.

    Args:
        request: HttpRequest, para extraer admin_id, IP, etc.
        target_user_id: UUID del usuario objetivo (cuando aplica).
        action: codigo de accion ('edit', 'deactivate', 'delete', etc.).
        details: descripcion en texto libre.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR', 'unknown')

    admin_email = getattr(request.user, 'email', 'unknown')
    admin_id = getattr(request.user, 'id', None)

    logger.info(
        f"[AdminAction] admin={admin_email} ({admin_id}) | "
        f"action={action} | target_user={target_user_id} | "
        f"ip={ip} | details={details}"
    )
    return True
