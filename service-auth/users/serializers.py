from rest_framework import serializers
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, UserProfile, Role, Permission, RolePermission


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name']


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'name', 'permissions']

    def get_permissions(self, obj):
        role_permissions = RolePermission.objects.filter(role=obj)
        perms = [rp.permission for rp in role_permissions]
        return PermissionSerializer(perms, many=True).data


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['first_name', 'last_name', 'phone', 'date_of_birth', 'profile_photo_url']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    role = serializers.CharField(source='role.name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'role', 'created_at', 'profile']


# 🔥 REGISTER
class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'role']
#"(Ariana) Verificación de formato de correo válido"
    def validate_email(self, value):
        try:
            validate_email(value)
        except ValidationError:
            raise serializers.ValidationError("Correo inválido")
#"(Ariana) Verificación del correo no Repetido"
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este correo ya está registrado")

        return value
#"(Ariana) Creación de servicio que identifica tipo de usuario"
    def create(self, validated_data):
        password = validated_data.pop('password')
        return User.objects.create_user(password=password, **validated_data)


# 🔥 LOGIN (JWT)
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])

        if user is None:
            raise AuthenticationFailed("Credenciales inválidas")

        if not user.is_active:
            raise AuthenticationFailed("Usuario inactivo")

        refresh = RefreshToken.for_user(user)

        refresh['email'] = user.email
        refresh['role'] = user.role.name if user.role else None

        return {
            'email': user.email,
            'role': user.role.name if user.role else None,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'is_active', 'role']
