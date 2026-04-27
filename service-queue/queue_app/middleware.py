import re
from queue_app.active_users import register_user_activity

class ActiveUserTrackingMiddleware:
    """
    Middleware que intercepta peticiones a /queue/<event_id>/...
    y registra la actividad del usuario en memoria para mantener
    viva su sesión de "selección de asientos".
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Ejecutar la vista normalmente
        response = self.get_response(request)

        # 2. Si el usuario está autenticado (JWT decodificado por AuthenticationMiddleware)
        if hasattr(request, 'user') and request.user and request.user.is_authenticated:
            # 3. Buscar event_id en la ruta (ej: /api/v1/queue/8423-.../status/)
            match = re.search(r'/queue/([0-9a-fA-F-]+)/', request.path)
            if match:
                event_id = match.group(1)
                register_user_activity(event_id, request.user.id)

        return response
