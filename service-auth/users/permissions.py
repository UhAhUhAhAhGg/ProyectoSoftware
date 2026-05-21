from rest_framework.permissions import BasePermission


class IsSuperadmin(BasePermission):
    """
    Guardia que restringe el acceso exclusivamente al rol Superadmin.

    Un usuario es Superadmin si cumple CUALQUIERA de estas condiciones:
      1. is_staff=True  (superusuario Django clásico)
      2. role.name == 'Superadmin'

    Un Administrador normal NO pasa esta guardia.
    """
    message = "Acceso restringido. Se requiere rol Superadmin."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if getattr(request.user, 'is_staff', False):
            return True

        if (
            getattr(request.user, 'role', None) and
            getattr(request.user.role, 'name', '').lower() == 'superadmin'
        ):
            return True

        return False


class IsAdminOrSuperadmin(BasePermission):
    """
    Permite acceso a Administrador Y Superadmin.
    Útil para endpoints que ambos roles comparten.
    """
    message = "Acceso restringido. Se requiere rol Administrador o Superadmin."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if getattr(request.user, 'is_staff', False):
            return True

        if request.user.role and request.user.role.name.lower() in [
            'superadmin', 'administrador', 'admin'
        ]:
            return True

        return False


# ─── TIC-398 / TIC-445: Capabilities granulares de Administrador ──────────────
# Cada Administrador tiene un subconjunto de estas capabilities almacenado en
# User.admin_permissions (JSONField). SuperAdmin tiene bypass total.
# Comprador y Promotor son roles funcionales y no usan este sistema.

ADMIN_CAPABILITIES = [
    'manage_users',
    'manage_events',
    'view_reports',
    'manage_queue',
    'system_config',
]


def has_admin_capability(user, cap):
    """
    True si el usuario puede ejecutar la capability dada.

    Reglas:
      - Anónimo / no autenticado → False
      - SuperAdmin (is_superadmin=True) → True (bypass total)
      - is_staff=True (SuperAdmin "historico" del seed) → True
      - Rol Administrador con `cap` en su admin_permissions → True
      - Cualquier otro caso → False
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superadmin', False):
        return True
    if getattr(user, 'is_staff', False):
        return True
    role = getattr(user, 'role', None)
    role_name = (getattr(role, 'name', '') or '').lower()
    if role_name in ('administrador', 'admin'):
        perms = getattr(user, 'admin_permissions', None) or []
        return cap in perms
    return False


def HasAdminCapability(required):
    """
    Factory que devuelve una clase BasePermission para usar en
    permission_classes=[IsAuthenticated, HasAdminCapability('manage_users')].
    """
    class _HasAdminCap(BasePermission):
        message = f"Falta el permiso '{required}' para realizar esta acción."

        def has_permission(self, request, view):
            return has_admin_capability(request.user, required)

    _HasAdminCap.__name__ = f"HasAdminCapability_{required}"
    return _HasAdminCap
