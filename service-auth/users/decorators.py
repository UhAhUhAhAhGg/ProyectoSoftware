"""
decorators.py — TIC-400
Decorator que registra automáticamente acciones de SuperAdmin en AdminAuditLog.

Uso en views:
    @superadmin_required
    @log_superadmin_action(action='grant_superadmin', category='admin_mgmt')
    def mi_vista(self, request, pk=None):
        ...
"""
import logging
from functools import wraps
from rest_framework.response import Response
from rest_framework import status as drf_status

logger = logging.getLogger(__name__)


def superadmin_required(view_func):
    """
    TIC-393/TIC-400: Decorator de acceso exclusivo para SuperAdmins.
    Verifica que request.user tenga is_superadmin=True o is_staff=True.
    Retorna 403 si no cumple la condición.
    """
    @wraps(view_func)
    def wrapper(self, request, *args, **kwargs):
        user = request.user

        if not user.is_authenticated:
            return Response(
                {"status": "error", "message": "Autenticación requerida."},
                status=drf_status.HTTP_401_UNAUTHORIZED,
            )

        if not (getattr(user, 'is_superadmin', False) or user.is_staff):
            return Response(
                {"status": "error", "message": "Esta acción requiere privilegios de SuperAdmin."},
                status=drf_status.HTTP_403_FORBIDDEN,
            )

        return view_func(self, request, *args, **kwargs)

    return wrapper


def log_superadmin_action(action, category='admin_mgmt', get_target=None):
    """
    TIC-400: Decorator que registra la acción del SuperAdmin en AdminAuditLog
    DESPUÉS de que la vista se ejecute exitosamente (status 2xx).

    Args:
        action: código de acción (ej: 'grant_superadmin', 'create_admin')
        category: 'admin_mgmt' | 'user_mgmt'
        get_target: función opcional (request, kwargs) → (target_user_id, target_email)
                    Si no se pasa, intenta leer pk de kwargs y buscar en BD.

    Ejemplo:
        @log_superadmin_action(action='grant_superadmin', category='admin_mgmt')
        def grant_superadmin(self, request, pk=None):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            response = view_func(self, request, *args, **kwargs)

            # Solo registrar si la operación fue exitosa
            if response.status_code < 200 or response.status_code >= 300:
                return response

            try:
                from .models import AdminAuditLog, User

                admin = request.user
                target_user_id = None
                target_user_email = 'desconocido'

                if get_target:
                    target_user_id, target_user_email = get_target(request, kwargs)
                else:
                    pk = kwargs.get('pk')
                    if pk:
                        try:
                            target = User.objects.get(pk=pk)
                            target_user_id = target.id
                            target_user_email = target.email
                        except User.DoesNotExist:
                            pass

                if target_user_id:
                    AdminAuditLog.objects.create(
                        admin_id=admin.id,
                        admin_email=admin.email,
                        target_user_id=target_user_id,
                        target_user_email=target_user_email,
                        action=action,
                        action_category=category,
                    )
                    logger.info(
                        f"[TIC-400] SuperAdmin audit: admin={admin.email} | "
                        f"action={action} | target={target_user_email}"
                    )

            except Exception as e:
                # El audit log nunca debe romper la respuesta principal
                logger.error(f"[TIC-400] Error al registrar audit log: {e}", exc_info=True)

            return response

        return wrapper
    return decorator
