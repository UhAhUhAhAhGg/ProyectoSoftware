from .models import AdminAuditLog

def log_admin_action(request, target_user_id, action, details=""):
    """
    Registra una acción administrativa en el log.
    """
    # Obtenemos la IP del admin
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')

    AdminAuditLog.objects.create(
        admin_id=request.user.id,
        target_user_id=target_user_id,
        action=action,
        details=details,
        ip_address=ip
    )