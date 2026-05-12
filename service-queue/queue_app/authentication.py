"""
authentication.py — Custom JWT authenticator for service-queue.

Identical pattern to service-events: validates the token signature and
expiry from service-auth, but returns a lightweight JWTUser built from
claims instead of hitting the local DB (which has no User table).
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


class JWTUser:
    """
    Lightweight user object built from JWT token claims.
    Does NOT require a local DB user row.
    """
    is_active = True
    is_anonymous = False
    is_authenticated = True

    def __init__(self, payload):
        self.id = payload.get('user_id') or payload.get('sub')
        self.pk = self.id
        self.email = payload.get('email', '')
        self.role = payload.get('role', '')
        self.is_staff = payload.get('is_staff', False)
        self.is_superuser = payload.get('is_superuser', False)

    def __str__(self):
        return self.email or str(self.id)

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser


class MicroserviceJWTAuthentication(JWTAuthentication):
    """
    JWT authentication that validates the token signature and expiry,
    but returns a JWTUser built from claims instead of a DB lookup.
    """

    def get_user(self, validated_token):
        try:
            return JWTUser(validated_token)
        except Exception:
            raise InvalidToken('Token contained no recognizable user identification')
