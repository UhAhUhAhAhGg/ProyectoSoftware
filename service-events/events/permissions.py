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
