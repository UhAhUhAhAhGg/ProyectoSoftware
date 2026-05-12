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
