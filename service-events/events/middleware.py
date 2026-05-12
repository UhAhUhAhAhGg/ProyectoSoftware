from django.utils.deprecation import MiddlewareMixin
from .models import BlacklistedToken
from django.core.cache import cache
import time
from django.http import JsonResponse


class TokenBlacklistMiddleware(MiddlewareMixin):

    def process_request(self, request):
        token = request.headers.get("Authorization")

        if not token:
            return None

        if BlacklistedToken.objects.filter(token=token).exists():
            return JsonResponse({
                "error": "Token inválido o sesión cerrada"
            }, status=401)

        return None


class ActivityMiddleware(MiddlewareMixin):

    TIMEOUT = 60 * 30  # 30 minutos

    def process_request(self, request):

        if not request.user or not request.user.is_authenticated:
            return None

        user_id = str(request.user.id)
        key = f"session_active:{user_id}"

        last_activity = cache.get(key)

        # ❌ sesión expirada
        if last_activity is None:
            return JsonResponse({
                "error": "SESSION_EXPIRED"
            }, status=401)

        # 🔄 renovar actividad
        cache.set(key, time.time(), timeout=self.TIMEOUT)

        return None