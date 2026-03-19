from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import User, Role, Permission
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    RoleSerializer,
    PermissionSerializer,
    LoginSerializer
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

    # 🔥 REGISTER
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        serializer = UserCreateSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Usuario creado correctamente"}, status=201)

        return Response(serializer.errors, status=400)

    # 🔥 LOGIN
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            return Response(serializer.validated_data, status=200)

        return Response(serializer.errors, status=400)

    # 🔥 PROFILE
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        return Response({
            "email": request.user.email,
            "role": request.user.role.name if request.user.role else None
        })


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated]
