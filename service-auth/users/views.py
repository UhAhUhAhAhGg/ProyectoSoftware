from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import User, Role, Permission
from django.core.cache import cache
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    RoleSerializer,
    PermissionSerializer,
    LoginSerializer,
)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'register']:
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    # --- PERFIL DEL USUARIO AUTENTICADO ---
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    # --- REGISTRO ---
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        email = request.data.get('email')

        # Verificación anticipada de duplicado (devuelve 409 antes de llegar al serializer)
        if email and User.objects.filter(email=email).exists():
            return Response({
                "status": "error",
                "message": "El correo ingresado ya pertenece a otro usuario."
            }, status=status.HTTP_409_CONFLICT)

        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success",
                "message": "Usuario creado correctamente.",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "status": "error",
            "message": "Error en los datos enviados.",
            "details": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    # --- LOGIN con JWT ---
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # --- LOGIN DE ADMINISTRADOR (CON BLOQUEO DE SEGURIDAD) ---
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def admin_login(self, request):
        """Inicio de sesión exclusivo para el panel de Administradores con bloqueo de seguridad"""
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({
                "status": "error",
                "message": "Por favor ingresa tu correo y contraseña."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 1. REVISAR INTENTOS PREVIOS (Usando Caché)
        cache_key = f"admin_login_attempts_{email}"
        attempts = cache.get(cache_key, 0)

        # Si ya falló 3 veces, lo bloqueamos sin consultar la base de datos
        if attempts >= 3:
            return Response({
                "status": "error",
                "message": "Cuenta bloqueada por múltiples intentos fallidos. Intenta de nuevo en 15 minutos."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        try:
            user = User.objects.get(email=email)

            # 2. Validar la contraseña
            if not user.check_password(password):
                attempts += 1
                cache.set(cache_key, attempts, timeout=900) # Bloqueo por 15 minutos
                
                intentos_restantes = 3 - attempts
                if intentos_restantes > 0:
                    mensaje_error = f"Correo o contraseña incorrectos. Te quedan {intentos_restantes} intento(s)."
                else:
                    mensaje_error = "Cuenta bloqueada por múltiples intentos fallidos. Intenta de nuevo en 15 minutos."

                return Response({
                    "status": "error",
                    "message": mensaje_error
                }, status=status.HTTP_401_UNAUTHORIZED)

            # 3. Validar el rol
            if not user.role or user.role.name.lower() not in ['administrador', 'admin']:
                return Response({
                    "status": "error",
                    "message": "Permisos insuficientes."
                }, status=status.HTTP_403_FORBIDDEN)

            # 4. ÉXITO: Borramos el historial de fallos porque ya entró
            cache.delete(cache_key)

            serializer = UserSerializer(user)
            
            return Response({
                "status": "success",
                "message": "Bienvenido al panel de administración.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            # Táctica anti-enumeración de usuarios
            attempts += 1
            cache.set(cache_key, attempts, timeout=900)
            
            return Response({
                "status": "error",
                "message": "Correo o contraseña incorrectos."
            }, status=status.HTTP_401_UNAUTHORIZED)

    # --- CAMBIAR CONTRASEÑA ---
    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        user = self.get_object()
        password = request.data.get('password')
        if not password:
            return Response(
                {'error': 'Password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(password)
        user.save()
        return Response({'success': 'Password updated'})

    # --- ACTIVAR / DESACTIVAR USUARIO ---
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'success': 'User activated'})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({'success': 'User deactivated'})


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated]