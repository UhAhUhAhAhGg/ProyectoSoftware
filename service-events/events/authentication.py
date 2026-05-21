"""
authentication.py — Custom JWT authenticator for service-events.

Problem: simplejwt's default JWTAuthentication tries to look up the user
in the LOCAL database using the 'user_id' claim from the token. But service-auth
uses UUID primary keys, while service-events uses integer PKs. This causes:
    ValueError: Field 'id' expected a number but got '<UUID>'.

Solution: Override get_user() to return a lightweight AnonymousUser-like object
populated directly from the JWT claims, without touching the local DB.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from django.contrib.auth.models import AnonymousUser


class _SimpleRole:
    """Wrapper liviano para que user.role.name funcione (compat Django-style)."""
    def __init__(self, name):
        self.name = name or ''

    def __str__(self):
        return self.name


class JWTUser:
    """
    Lightweight user object built from JWT token claims.
    Does NOT require a local DB user row.
    """
    is_active = True
    is_anonymous = False
    is_authenticated = True

    def __init__(self, payload):
        # user_id comes as UUID string from service-auth
        self.id = payload.get('user_id') or payload.get('sub')
        self.pk = self.id
        self.email = payload.get('email', '')
        # role del JWT es string ('Administrador', 'Comprador', etc.).
        # Lo envolvemos en _SimpleRole para que el codigo user.role.name no rompa.
        role_name = payload.get('role', '')
        self.role = _SimpleRole(role_name) if role_name else None
        self.is_staff = payload.get('is_staff', False)
        self.is_superuser = payload.get('is_superuser', False)
        # Custom claim del service-auth — necesario para checks de SuperAdmin
        self.is_superadmin = payload.get('is_superadmin', False)
        # TIC-398/445: capabilities granulares del admin viajan en el JWT
        # emitido por service-auth — service-events las lee sin consultar la BD remota.
        self.admin_permissions = list(payload.get('admin_permissions', []) or [])

    def __str__(self):
        return self.email or str(self.id)

    # Required by DRF permission classes
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
