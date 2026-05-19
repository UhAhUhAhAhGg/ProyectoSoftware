from django.http import JsonResponse


class SuperadminRouteMiddleware:
    """
    Middleware que intercepta TODAS las rutas bajo /api/v1/superadmin/
    y verifica que el usuario tenga rol Superadmin ANTES de que
    llegue a la vista.

    Esto actúa como una segunda capa de seguridad además del
    permission class IsSuperadmin en cada vista.
    """

    RUTAS_PROTEGIDAS = ['/api/v1/superadmin/', '/api/superadmin/']

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if any(request.path.startswith(prefix) for prefix in self.RUTAS_PROTEGIDAS):
            if not self._es_superadmin(request):
                return JsonResponse({
                    "status": "error",
                    "message": "Acceso denegado. Se requiere rol Superadmin."
                }, status=403)

        return self.get_response(request)

    def _es_superadmin(self, request):
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return False

        if getattr(user, 'is_staff', False):
            return True

        if user.role and getattr(user.role, 'name', '').lower() == 'superadmin':
            return True

        return False
