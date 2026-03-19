from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.hashers import make_password
from .models import User, UserProfile, Role, Permission
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    RoleSerializer,
    PermissionSerializer,
    UserProfileSerializer
)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action == 'partial_update' or self.action == 'update':
            return UserUpdateSerializer
        return UserSerializer

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Obtener datos del usuario actual"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    # --- AQUÍ ADAPTAMOS NUESTRO REGISTRO ---
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        """Registrar nuevo usuario con validación de duplicados"""
        email = request.data.get('email')

        # 1. Validación de correo duplicado (Error 409 Conflict)
        if email and User.objects.filter(email=email).exists():
            return Response({
                "status": "error",
                "message": "El correo ingresado ya pertenece a otro usuario."
            }, status=status.HTTP_409_CONFLICT)

        # 2. Usamos el serializer profesional que ya tienes configurado
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

    # --- AQUÍ ADAPTAMOS NUESTRO LOGIN ---
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        """Iniciar sesión seguro (Protección contra enumeración)"""
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({
                "status": "error",
                "message": "Por favor ingresa tu correo y contraseña."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)

            if not user.check_password(password):
                return Response({
                    "status": "error",
                    "message": "Correo o contraseña incorrectos."
                }, status=status.HTTP_401_UNAUTHORIZED)

            # Si pasa, serializamos al usuario
            serializer = UserSerializer(user)
            return Response({
                "status": "success",
                "message": "Inicio de sesión exitoso.",
                "data": serializer.data
                # OJO: Aquí irá tu Token JWT muy pronto
            }, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Correo o contraseña incorrectos."
            }, status=status.HTTP_401_UNAUTHORIZED)

    # ... Tus otros métodos set_password, activate, deactivate se quedan igual ...
    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        """Cambiar contraseña de usuario"""
        user = self.get_object()
        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save()
        return Response({'success': 'Password updated'})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activar usuario"""
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'success': 'User activated'})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Desactivar usuario"""
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