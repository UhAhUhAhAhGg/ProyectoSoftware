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

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        """Registrar nuevo usuario"""
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        """Cambiar contraseña de usuario"""
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