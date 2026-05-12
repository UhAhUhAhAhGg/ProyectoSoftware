from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Añadir claims personalizados
        token['email'] = user.email
        token['role'] = user.role.name if getattr(user, 'role', None) else None

        return token
