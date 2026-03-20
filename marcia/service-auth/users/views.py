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
    # 🔥 REGISTER
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
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
            return Response({"message": "Usuario creado correctamente"}, status=201)

        return Response(serializer.errors, status=400)

    #LOGIN
    #"(Ariana) Creación del servicio para inicio de sesión"
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            return Response(serializer.validated_data, status=200)

        return Response(serializer.errors, status=400)
#"(Ariana) Pedir ingreso de contraseña"

    # PERFIL
    #"(Ariana) Autenticación de usuarios según los roles existentes: <QuerySet [<Role: buyer>, <Role: promoter>, <Role: admin>]>"
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
