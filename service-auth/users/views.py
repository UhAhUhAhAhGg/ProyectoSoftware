from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import User, Role, Permission
from django.core.cache import cache
from .models import User, Role, Permission, UserProfile
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    RoleSerializer,
    PermissionSerializer,
    LoginSerializer,
    AdminApplySerializer,
    AdminLoginSerializer,
)
import jwt
import datetime
import requests
from django.conf import settings
from django.db import transaction
from django.core.mail import send_mail


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

    # === RECUPERACIÓN DE CONTRASEÑA: SOLICITAR ENLACE ===
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def password_reset_request(self, request):
        email = request.data.get('email')

        if not email:
            return Response(
                {"status": "error", "message": "El correo electrónico es requerido."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Buscamos al usuario
        user = User.objects.filter(email=email).first()
        if user:
            # Leer la configuración de expiración (por defecto 60 minutos si no existe)
            expiration_minutes = getattr(settings, 'PASSWORD_RESET_TIMEOUT_MINUTES', 60)
            
            # 1. Generamos un token JWT válido por el tiempo configurado
            payload = {
                'user_id': str(user.id),
                'email': user.email,
                'type': 'password_reset',
                'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=expiration_minutes)
            }
            token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

            # 2. Construimos el enlace del Frontend (BFF Pattern)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            reset_link = f"{frontend_url}/reset-password?token={token}"

            # 3. Enviamos el correo
            try:
                send_mail(
                    subject='Recuperación de Contraseña - TicketProject',
                    message=f'Hola,\n\nHemos recibido una solicitud para restablecer tu contraseña.\n'
                            f'Por favor, haz clic en el siguiente enlace para crear una nueva (es válido por {expiration_minutes} minutos):\n\n'
                            f'{reset_link}\n\n'
                            f'Si no solicitaste esto, ignora este correo.',
                    from_email=getattr(settings, 'EMAIL_HOST_USER', 'noreply@ticketproject.com'),
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception as e:
                # Imprimimos en consola por si estás desarrollando y no tienes SMTP configurado
                print("⚠️ Correo no enviado. Simulación de enlace:", reset_link)

        # La respuesta genérica para el usuario (Evita enumeración)
        return Response({
            "status": "success",
            "message": "Si el correo está registrado, recibirás un enlace de recuperación en breve."
        }, status=status.HTTP_200_OK)

    # === RECUPERACIÓN DE CONTRASEÑA: CONFIRMAR Y CAMBIAR ===
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def password_reset_confirm(self, request):
        """Valida la expiración del token y guarda la nueva contraseña"""
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        if not token or not new_password:
            return Response({
                "status": "error", 
                "message": "Falta el token o la nueva contraseña."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # 1. Decodificar el token (valida la expiración automáticamente)
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])

            if payload.get('type') != 'password_reset':
                return Response({
                    "status": "error", 
                    "message": "Token inválido para esta acción."
                }, status=status.HTTP_400_BAD_REQUEST)

            # 2. Cambiar la clave
            user = User.objects.get(id=payload['user_id'])
            user.set_password(new_password)
            user.save()

            return Response({
                "status": "success", 
                "message": "Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión."
            }, status=status.HTTP_200_OK)

        except jwt.ExpiredSignatureError:
            return Response({
                "status": "error", 
                "message": "El enlace de recuperación ha expirado. Por favor, solicita uno nuevo."
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except (jwt.InvalidTokenError, User.DoesNotExist):
            return Response({
                "status": "error", 
                "message": "Enlace de recuperación inválido o corrupto."
            }, status=status.HTTP_400_BAD_REQUEST)

    # === HU-4: INVITAR ADMINISTRADOR (Solo Superadmin) ===
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def invite_admin(self, request):
        if not getattr(request.user, 'is_staff', False) and not (request.user.role and request.user.role.name == 'Administrador'):
            return Response({"error": "No tienes permisos de SuperAdmin."}, status=status.HTTP_403_FORBIDDEN)
            
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        payload = {
            'email': email,
            'type': 'admin_invitation',
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=2)
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        
        # Enviar correo (Impreso en consola por si falta config SMTP)
        link = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/admin/register?token={token}"
        try:
            send_mail(
                'Invitación para ser Administrador',
                f'Utiliza este enlace para registrarte: {link}',
                getattr(settings, 'EMAIL_HOST_USER', 'noreply@ticketproject.com'),
                [email],
                fail_silently=True,
            )
        except Exception:
            print("Correo no enviado (falta configuración SMTP). Link:", link)
            
        return Response({"message": "Invitación generada y enviada", "mock_link": link}, status=status.HTTP_200_OK)

    # === HU-4: APLICAR PARA ADMIN (Público con Token) ===
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def apply_admin(self, request):
        serializer = AdminApplySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        data = serializer.validated_data
        
        # 1. Validar el token matemáticamente
        try:
            payload = jwt.decode(data['token'], settings.SECRET_KEY, algorithms=['HS256'])
            if payload.get('type') != 'admin_invitation':
                raise jwt.InvalidTokenError
            email = payload['email']
        except jwt.ExpiredSignatureError:
            return Response({"error": "La invitación ha expirado."}, status=status.HTTP_400_BAD_REQUEST)
        except jwt.InvalidTokenError:
            return Response({"error": "Token de invitación inválido."}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar si ya existe
        if User.objects.filter(email=email).exists():
            return Response({"error": "El email ya está registrado."}, status=status.HTTP_409_CONFLICT)
            
        try:
            rol_admin = Role.objects.get(name='Administrador')
        except Role.DoesNotExist:
            return Response({"error": "El rol Administrador no existe en la BD."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            with transaction.atomic():
                # 2. Crear User (is_active=False) - Forma segura
                user = User(
                    email=email,
                    role=rol_admin,
                    is_active=False  # PENDIENTE DE APROBACIÓN
                )
                user.set_password(data['password']) # Encripta la contraseña correctamente
                user.save() # Guarda el usuario en la base de datos
                
                # 3. Crear UserProfile local
                UserProfile.objects.create(
                    user=user,
                    first_name=data['first_name'],
                    last_name=data['last_name'],
                    phone=data['phone'],
                    date_of_birth=data['date_of_birth'],
                    profile_photo_url=data.get('profile_photo_url', '')
                )
                
                # Generar token interno para autorizar en el microservicio
                internal_payload = {
                    'user_id': str(user.id),
                    'email': user.email,
                    'role': 'Administrador',
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
                }
                internal_token = jwt.encode(internal_payload, settings.SECRET_KEY, algorithm='HS256')

                # 4. Solicitud al microservicio service-profiles
                profiles_url = getattr(settings, 'PROFILES_SERVICE_URL', 'http://localhost:8001')
                response = requests.post(
                    f"{profiles_url}/api/profiles/admin-profiles/",
                    json={
                        "user_id": str(user.id),
                        "employee_code": data['employee_code'],
                        "department": data['department']
                    },
                    headers={"Authorization": f"Bearer {internal_token}"},
                    timeout=5
                )

                if response.status_code not in (200, 201):
                    raise Exception(f"Fallo al crear AdminProfile remoto: {response.text}")
                    
        except Exception as e:
            return Response({"error": "Error al crear el administrador", "detalle": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"message": "Solicitud enviada con éxito. Pendiente de aprobación."}, status=status.HTTP_201_CREATED)

    # === HU-4: VER PENDIENTES (Dashboard SuperAdmin) ===
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def pending_admins(self, request):
        if not getattr(request.user, 'is_staff', False) and not (request.user.role and request.user.role.name == 'Administrador'):
            return Response({"error": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN)
            
        pendientes = User.objects.filter(role__name='Administrador', is_active=False)
        serializer = UserSerializer(pendientes, many=True)
        return Response(serializer.data)

    # === HU-4: APROBAR ADMIN (Dashboard SuperAdmin) ===
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def approve_admin(self, request, pk=None):
        if not getattr(request.user, 'is_staff', False) and not (request.user.role and request.user.role.name == 'Administrador'):
            return Response({"error": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            user = User.objects.get(pk=pk, role__name='Administrador', is_active=False)
            user.is_active = True
            user.save()
            return Response({"message": "Administrador aprobado correctamente."})
        except User.DoesNotExist:
            return Response({"error": "Usuario pendiente no encontrado."}, status=status.HTTP_404_NOT_FOUND)

    # === HU-4: RECHAZAR ADMIN (Dashboard SuperAdmin) ===
    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def reject_admin(self, request, pk=None):
        if not getattr(request.user, 'is_staff', False) and not (request.user.role and request.user.role.name == 'Administrador'):
            return Response({"error": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            user = User.objects.get(pk=pk, role__name='Administrador', is_active=False)
            user.delete()
            return Response({"message": "Solicitud rechazada y eliminada."})
        except User.DoesNotExist:
            return Response({"error": "Usuario pendiente no encontrado."}, status=status.HTTP_404_NOT_FOUND)

    # --- LOGIN con JWT ---
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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


            cache.delete(cache_key)

            serializer = UserSerializer(user)
            
            admin_modules = [
                {"name": "Gestión de Usuarios", "action": "view_users"},
                {"name": "Configuración Global", "action": "manage_settings"},
                {"name": "Reportes", "action": "view_reports"}
            ]
            
            return Response({
                "status": "success",
                "message": "Bienvenido al panel de administración.",
                "data": serializer.data,
                "allowed_modules": admin_modules  # Se lo pasamos al Frontend
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