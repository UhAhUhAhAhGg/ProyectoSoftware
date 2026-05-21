from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Añadir claims personalizados
        token['email'] = user.email
        token['role'] = user.role.name if getattr(user, 'role', None) else None
        token['is_staff'] = bool(getattr(user, 'is_staff', False))
        token['is_superadmin'] = bool(getattr(user, 'is_superadmin', False))
        # TIC-398/445: permisos granulares de admin viajan en el JWT
        token['admin_permissions'] = list(getattr(user, 'admin_permissions', None) or [])

        return token
