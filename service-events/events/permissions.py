from rest_framework import permissions

class CheckRolePermission(permissions.BasePermission):
    """
    Lee el Payload JWT del request para determinar el rol sin golpear BD local.
    """
    allowed_roles = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Extraer token payload (request.auth lo provee SimpleJWT)
        payload = getattr(request.auth, 'payload', {}) if request.auth else {}
        user_role = payload.get('role', '')
        
        # Validar si el rol está en los permitidos
        return user_role in self.allowed_roles

class IsAdministrador(CheckRolePermission):
    allowed_roles = ['Administrador']

class IsPromotor(CheckRolePermission):
    allowed_roles = ['Promotor']

class IsComprador(CheckRolePermission):
    allowed_roles = ['Comprador']
class CanViewAuditLogs(CheckRolePermission):
    """
    TIC-121: Valida que el Administrador tenga el permiso 'audit_view'
    dentro del payload de su token JWT.
    """
    message = "Acceso denegado: No tienes el permiso 'audit_view' asignado."

    def has_permission(self, request, view):
        # 1. Primero validamos que sea Administrador usando tu lógica existente
        if not super().has_permission(request, view):
            # Si no es Administrador (según el payload), rebota
            return False

        # 2. Extraer el payload del token
        payload = getattr(request.auth, 'payload', {}) if request.auth else {}
        
        # 3. Buscamos el permiso específico en el payload
        # Normalmente los permisos vienen en una lista llamada 'permissions' o 'claims'
        user_permissions = payload.get('permissions', [])
        
        # Permitimos si es SuperAdmin o si tiene el permiso específico
        is_superuser = payload.get('is_superuser', False)
        
        return is_superuser or 'audit_view' in user_permissions

# Definimos el alias para usarlo fácilmente
class IsAdminWithAudit(CanViewAuditLogs):
    allowed_roles = ['Administrador']


# ─── TIC-398 / TIC-445: Capabilities granulares de Administrador ──────────────
# Espejo del helper en service-auth/users/permissions.py. Las capabilities
# viajan en el JWT (campo admin_permissions) emitido por service-auth y se
# leen aqui desde el JWTUser construido en authentication.py.

ADMIN_CAPABILITIES = [
    'manage_users',
    'manage_events',
    'view_reports',
    'manage_queue',
    'system_config',
]


def has_admin_capability(user, cap):
    """SuperAdmin (is_superadmin / is_staff) bypass; Admins normales validan cap."""
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
    """Factory para usar como permission_classes=[IsAuthenticated, HasAdminCapability('manage_events')]."""
    class _HasAdminCap(permissions.BasePermission):
        message = f"Falta el permiso '{required}' para realizar esta acción."

        def has_permission(self, request, view):
            return has_admin_capability(request.user, required)

    _HasAdminCap.__name__ = f"HasAdminCapability_{required}"
    return _HasAdminCap


class IsSuperadmin(permissions.BasePermission):
    """
    US566 (US-32): Solo el SuperAdmin puede acceder.
    Bypass para is_staff (seed histórico). Los Admins normales y Promotores/Compradores
    reciben 403 aunque tengan todas las capabilities.
    """
    message = "Solo el SuperAdmin puede realizar esta acción."

    def has_permission(self, request, view):
        if not request.user or not getattr(request.user, 'is_authenticated', False):
            return False
        if getattr(request.user, 'is_superadmin', False):
            return True
        if getattr(request.user, 'is_staff', False):
            return True
        return False
