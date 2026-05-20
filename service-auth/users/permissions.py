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
