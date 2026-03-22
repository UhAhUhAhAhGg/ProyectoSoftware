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
        role_permissions = RolePermission.objects.filter(role=obj).select_related('permission')
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
        fields = ['id', 'email', 'role', 'is_active', 'created_at', 'profile']
        read_only_fields = ['id', 'created_at']


# --- REGISTRO ---
class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    role = serializers.SlugRelatedField(
        queryset=Role.objects.all(),
        slug_field='name'
    )

    class Meta:
        model = User
        fields = ['email', 'password', 'role']

    def validate_email(self, value):
        try:
            validate_email(value)
        except ValidationError:
            raise serializers.ValidationError("Formato de correo inválido.")

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este correo ya está registrado.")

        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        return User.objects.create_user(password=password, **validated_data)


# --- LOGIN con JWT ---
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])

        if user is None:
            raise AuthenticationFailed("Correo o contraseña incorrectos.")

        if not user.is_active:
            raise AuthenticationFailed("Esta cuenta está desactivada.")

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


# --- FORMULARIO DE APLICACIÓN DE ADMIN ---
class AdminApplySerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    first_name = serializers.CharField(required=True, max_length=100)
    last_name = serializers.CharField(required=True, max_length=100)
    phone = serializers.CharField(required=True, max_length=50)
    date_of_birth = serializers.DateField(required=True)
    profile_photo_url = serializers.CharField(required=False, allow_blank=True, max_length=255)
    employee_code = serializers.CharField(required=True, max_length=50)
    department = serializers.CharField(required=True, max_length=50)


# --- LOGIN ESTRICTO DE ADMIN ---
class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            user = User.objects.get(email=data['email'])
        except User.DoesNotExist:
            raise AuthenticationFailed("Correo o contraseña incorrectos.")

        if not user.check_password(data['password']):
            raise AuthenticationFailed("Correo o contraseña incorrectos.")

        if user.role and user.role.name != 'Administrador':
            raise AuthenticationFailed("Acceso denegado. Este portal es solo para Administradores.")

        if not user.is_active:
            raise AuthenticationFailed("Su cuenta está pendiente de aprobación por el Administrador Global.")

        refresh = RefreshToken.for_user(user)
        refresh['email'] = user.email
        refresh['role'] = user.role.name if user.role else None

        return {
            'email': user.email,
            'role': user.role.name if user.role else None,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }