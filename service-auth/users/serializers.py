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
    # 1. Validaciones estrictas: Requeridos y no vacíos
    first_name = serializers.CharField(
        required=True, 
        allow_blank=False, 
        error_messages={'required': 'El nombre es obligatorio.', 'blank': 'El nombre no puede estar vacío.'}
    )
    last_name = serializers.CharField(
        required=True, 
        allow_blank=False, 
        error_messages={'required': 'El apellido es obligatorio.', 'blank': 'El apellido no puede estar vacío.'}
    )
    phone = serializers.CharField(
        required=True, 
        allow_blank=False, 
        error_messages={'required': 'El número de teléfono es obligatorio.', 'blank': 'El teléfono no puede estar vacío.'}
    )
    profile_photo_url = serializers.URLField(
        required=False, 
        allow_blank=True,
        error_messages={'invalid': 'Debe proporcionar una URL válida para la foto de perfil.'}
    )

    class Meta:
        model = UserProfile
        fields = ['first_name', 'last_name', 'phone', 'date_of_birth', 'profile_photo_url']

    # 2. Validación de formato de teléfono
    def validate_phone(self, value):
        value = value.replace(" ", "") # Quitamos espacios
        if not value.isdigit() and not (value.startswith('+') and value[1:].isdigit()):
            raise serializers.ValidationError("El teléfono solo debe contener números o el signo '+' al inicio.")
        if len(value) < 8:
            raise serializers.ValidationError("El número de teléfono es muy corto (mínimo 8 dígitos).")
        return value


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    role = serializers.CharField(source='role.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'role', 'is_active', 'is_staff',
            'is_superadmin', 'account_status', 'created_at', 'profile',
        ]
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
            'id': str(user.id),
            'email': user.email,
            'role': user.role.name if user.role else None,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }

class UserUpdateSerializer(serializers.ModelSerializer):
    # Incluimos el perfil para que DRF sepa validarlo al actualizar
    profile = UserProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ['email', 'is_active', 'role', 'profile']

    def update(self, instance, validated_data):
        # 1. Extraemos los datos del perfil si vienen en la petición
        profile_data = validated_data.pop('profile', None)
        
        # 2. Actualizamos los campos del User (ej. email)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # 3. Actualizamos los campos del UserProfile (nombre, teléfono, etc)
        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
            
        return instance


class UserMeSerializer(serializers.ModelSerializer):
    """Serializer para el endpoint /users/me/ (obtener/actualizar perfil del usuario autenticado)"""
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()
    role = serializers.CharField(source='role.name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'role', 'first_name', 'last_name', 'phone', 'profile_photo_url']
        read_only_fields = ['id', 'email', 'role']

    def get_first_name(self, obj):
        return getattr(obj.profile, 'first_name', '') if hasattr(obj, 'profile') else ''

    def get_last_name(self, obj):
        return getattr(obj.profile, 'last_name', '') if hasattr(obj, 'profile') else ''

    def get_phone(self, obj):
        return getattr(obj.profile, 'phone', '') if hasattr(obj, 'profile') else ''

    def get_profile_photo_url(self, obj):
        return getattr(obj.profile, 'profile_photo_url', '') if hasattr(obj, 'profile') else ''

    def update(self, instance, validated_data):
        from datetime import date as today
        profile_data = validated_data.pop('profile', {})

        # Buscar campos planos que el frontend envía directamente
        direct_fields = ['first_name', 'last_name', 'phone', 'profile_photo_url']
        for field in direct_fields:
            if field in validated_data:
                profile_data[field] = validated_data.pop(field)

        if profile_data:
            profile, _ = UserProfile.objects.get_or_create(
                user=instance,
                defaults={
                    'first_name': '',
                    'last_name': '',
                    'phone': '',
                    'date_of_birth': today.today(),
                }
            )
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance


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
            'id': str(user.id),
            'email': user.email,
            'role': user.role.name if user.role else None,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }


class AdminDetailSerializer(serializers.ModelSerializer):
    """
    Serializer completo para listar cuentas de Administrador
    con su estado, perfil y permisos actuales.
    """
    role_name = serializers.CharField(source='role.name', read_only=True)
    full_name = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    estado = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'role_name',
            'full_name',
            'phone',
            'is_active',
            'is_staff',
            'estado',
            'created_at',
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.full_name
        return None

    def get_phone(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.phone
        return None

    def get_estado(self, obj):
        if not obj.is_active:
            return 'suspendido'
        return 'activo'


# --- CREAR USUARIO POR ADMIN ---
class AdminCreateUserSerializer(serializers.ModelSerializer):
    """
    Serializer para que el administrador cree cuentas
    de Promotor o Comprador con todos los datos necesarios.
    """
    password = serializers.CharField(write_only=True, min_length=8)
    role_name = serializers.ChoiceField(
        choices=['Promotor', 'Comprador'],
        write_only=True
    )
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=50)
    date_of_birth = serializers.DateField()

    # Campos exclusivos para Promotor
    company_name = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    comercial_nit = serializers.CharField(
        max_length=50, required=False, allow_blank=True
    )
    bank_account = serializers.CharField(
        max_length=50, required=False, allow_blank=True
    )

    class Meta:
        model = User
        fields = [
            'email', 'password', 'role_name',
            'first_name', 'last_name', 'phone', 'date_of_birth',
            'company_name', 'comercial_nit', 'bank_account',
        ]

    def validate(self, data):
        import re
        password = data.get('password', '')

        if len(password) < 8:
            raise serializers.ValidationError(
                {"password": "La contraseña debe tener al menos 8 caracteres."}
            )
        if not re.search(r'[A-Z]', password):
            raise serializers.ValidationError(
                {"password": "La contraseña debe contener al menos una mayúscula."}
            )
        if not re.search(r'\d', password):
            raise serializers.ValidationError(
                {"password": "La contraseña debe contener al menos un número."}
            )

        # Validar campos obligatorios para Promotor
        if data.get('role_name') == 'Promotor':
            if not data.get('company_name'):
                raise serializers.ValidationError(
                    {"company_name": "El nombre de empresa es obligatorio para Promotores."}
                )
            if not data.get('comercial_nit'):
                raise serializers.ValidationError(
                    {"comercial_nit": "El NIT comercial es obligatorio para Promotores."}
                )
            if not data.get('bank_account'):
                raise serializers.ValidationError(
                    {"bank_account": "La cuenta bancaria es obligatoria para Promotores."}
                )
        return data