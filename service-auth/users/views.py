from rest_framework.views import APIView
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.cache import cache
from django.db import transaction
from django.core.mail import send_mail
from .models import User, Role, Permission, UserProfile, AccountDeletionLog, AdminAuditLog
from .decorators import superadmin_required, log_superadmin_action
from .permissions import IsSuperadmin
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    UserMeSerializer,
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
from rest_framework_simplejwt.tokens import RefreshToken


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
    @action(detail=False, methods=['get', 'put', 'patch', 'delete'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        GET: Obtiene los datos del perfil.
        PUT/PATCH: Actualiza los datos del perfil.
        DELETE: Elimina la cuenta permanentemente.
        """
        user = request.user

        # Guard de seguridad: bloquear acceso si la cuenta esta suspendida/banned.
        # El frontend hace polling a /users/me/ — al recibir 403 con code, fuerza logout.
        if user.account_status == 'suspended':
            return Response({
                "status": "error",
                "message": f"Tu cuenta está suspendida. {('Motivo: ' + user.suspended_reason) if user.suspended_reason else 'Contacta al administrador.'}",
                "code": "ACCOUNT_SUSPENDED",
            }, status=status.HTTP_403_FORBIDDEN)
        if user.account_status == 'banned':
            return Response({
                "status": "error",
                "message": "Tu cuenta ha sido dada de baja permanentemente.",
                "code": "ACCOUNT_BANNED",
            }, status=status.HTTP_403_FORBIDDEN)

        # 1. LEER DATOS (GET)
        if request.method == 'GET':
            serializer = UserMeSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)

      # 2. ACTUALIZAR DATOS (PUT / PATCH)
        elif request.method in ['PUT', 'PATCH']:
            from datetime import date as today
            # Extraer campos del perfil del request
            first_name = request.data.get('first_name', None)
            last_name = request.data.get('last_name', None)
            phone = request.data.get('phone', None)
            profile_photo_url = request.data.get('profile_photo_url', None)

            # Crear o actualizar el UserProfile
            profile, _ = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'first_name': '',
                    'last_name': '',
                    'phone': '',
                    'date_of_birth': today.today(),
                }
            )
            if first_name is not None:
                profile.first_name = first_name
            if last_name is not None:
                profile.last_name = last_name
            if phone is not None:
                profile.phone = phone
            if profile_photo_url is not None:
                profile.profile_photo_url = profile_photo_url
            profile.save()

            serializer = UserMeSerializer(user)
            return Response({
                "status": "success",
                "message": "Perfil actualizado correctamente.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        # 3. ELIMINAR CUENTA (DELETE)
        elif request.method == 'DELETE':
            password = request.data.get('password')

            if not password:
                return Response({
                    "status": "error",
                    "message": "Por tu seguridad, debes ingresar tu contraseña para confirmar la eliminación de la cuenta."
                }, status=status.HTTP_400_BAD_REQUEST)

            if not user.check_password(password):
                return Response({
                    "status": "error",
                    "message": "Contraseña incorrecta. Operación cancelada."
                }, status=status.HTTP_403_FORBIDDEN)

            # --- REGISTRO DE AUDITORÍA (Cumpliendo subtarea BD) ---
            AccountDeletionLog.objects.create(
                user_email=user.email,
                user_role=user.role.name if user.role else 'Sin rol'
            )

            # Borrado físico del usuario (Hard Delete)
            user.delete()

            return Response({
                "status": "success",
                "message": "Tu cuenta y todos tus datos personales han sido eliminados correctamente."
            }, status=status.HTTP_200_OK)

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

        user = User.objects.filter(email=email).first()
        mock_link = None

        if user:
            expiration_minutes = getattr(settings, 'PASSWORD_RESET_TIMEOUT_MINUTES', 60)

            payload = {
                'user_id': str(user.id),
                'email': user.email,
                'type': 'password_reset',
                'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=expiration_minutes)
            }
            token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            reset_link = f"{frontend_url}/reset-password?token={token}"
            mock_link = reset_link

            # Enviar correo (console backend en dev → imprime en docker logs)
            send_mail(
                subject='Recuperación de Contraseña - TicketProject',
                message=(
                    f'Hola,\n\n'
                    f'Recibimos una solicitud para restablecer tu contraseña.\n'
                    f'Usa este enlace (válido por {expiration_minutes} minutos):\n\n'
                    f'{reset_link}\n\n'
                    f'Si no solicitaste esto, ignora este correo.'
                ),
                from_email=getattr(settings, 'EMAIL_HOST_USER', 'noreply@ticketproject.com'),
                recipient_list=[user.email],
                fail_silently=False,
            )

        response_data = {
            "status": "success",
            "message": "Si el correo está registrado, recibirás un enlace de recuperación en breve.",
        }
        if mock_link:
            response_data["mock_link"] = mock_link

        return Response(response_data, status=status.HTTP_200_OK)

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

            # TIC-194: Validar reglas de seguridad
            import re
            if len(new_password) < 8:
                return Response({"status": "error", "message": "La contraseña debe tener al menos 8 caracteres."}, status=status.HTTP_400_BAD_REQUEST)
            if not re.search(r'[A-Z]', new_password):
                return Response({"status": "error", "message": "La contraseña debe contener al menos una letra mayúscula."}, status=status.HTTP_400_BAD_REQUEST)
            if not re.search(r'\d', new_password):
                return Response({"status": "error", "message": "La contraseña debe contener al menos un número."}, status=status.HTTP_400_BAD_REQUEST)

            # TIC-193: No permitir la misma contraseña que la actual
            if user.check_password(new_password):
                return Response({"status": "error", "message": "La nueva contraseña no puede ser igual a la contraseña actual."}, status=status.HTTP_400_BAD_REQUEST)

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
        # Pre-check: bloquear login si la cuenta esta suspendida/dada de baja
        # (antes de que el serializer valide credenciales)
        email = request.data.get('email')
        if email:
            try:
                u = User.objects.get(email=email)
                if u.account_status == 'suspended':
                    return Response(
                        {
                            "status": "error",
                            "message": f"Tu cuenta está suspendida. {('Motivo: ' + u.suspended_reason) if u.suspended_reason else 'Contacta al administrador.'}",
                            "code": "ACCOUNT_SUSPENDED",
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
                if u.account_status == 'banned':
                    return Response(
                        {
                            "status": "error",
                            "message": "Tu cuenta ha sido dada de baja permanentemente.",
                            "code": "ACCOUNT_BANNED",
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
            except User.DoesNotExist:
                pass  # Dejar que el serializer maneje el "usuario no existe"

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

            # 3. Validar el rol (acepta admin/administrador, superadmin, o is_superadmin=True)
            tiene_rol_admin = user.role and user.role.name.lower() in ['administrador', 'admin', 'superadmin']
            if not tiene_rol_admin and not user.is_superadmin:
                return Response({
                    "status": "error",
                    "message": "Permisos insuficientes."
                }, status=status.HTTP_403_FORBIDDEN)

            # 4. Bloquear si la cuenta esta suspendida o dada de baja
            if user.account_status == 'suspended':
                return Response({
                    "status": "error",
                    "message": f"Tu cuenta de administrador está suspendida. {('Motivo: ' + user.suspended_reason) if user.suspended_reason else ''}",
                    "code": "ACCOUNT_SUSPENDED",
                }, status=status.HTTP_403_FORBIDDEN)
            if user.account_status == 'banned':
                return Response({
                    "status": "error",
                    "message": "Tu cuenta ha sido dada de baja permanentemente.",
                    "code": "ACCOUNT_BANNED",
                }, status=status.HTTP_403_FORBIDDEN)

            cache.delete(cache_key)

            serializer = UserSerializer(user)
            
            admin_modules = [
                {"name": "Gestión de Usuarios", "action": "view_users"},
                {"name": "Configuración Global", "action": "manage_settings"},
                {"name": "Reportes", "action": "view_reports"}
            ]
            
            refresh = RefreshToken.for_user(user)
            # Claims custom para que service-events identifique al SuperAdmin
            refresh['email'] = user.email
            refresh['role'] = user.role.name if user.role else None
            refresh['is_staff'] = bool(user.is_staff)
            refresh['is_superadmin'] = bool(user.is_superadmin)

            return Response({
                "status": "success",
                "message": "Bienvenido al panel de administración.",
                "data": serializer.data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "allowed_modules": admin_modules
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

    # ─── TIC-384: Gestión de usuarios desde panel Admin ──────────────────────

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='admin-list')
    def admin_users(self, request):
        """
        TIC-384: GET /users/admin-list/
        Lista paginada de todos los usuarios con filtros opcionales.
        Solo accesible por admins o superadmins.

        Query params:
          - role: nombre del rol (ej: 'Comprador', 'Promotor', 'Administrador')
          - account_status: 'active' | 'suspended' | 'banned'
          - search: texto libre que busca en email
          - page: número de página (default 1)
          - page_size: resultados por página (default 20)
        """
        admin = request.user
        if not admin.is_staff and not (admin.role and admin.role.name.lower() in ['administrador', 'admin', 'superadmin']):
            return Response(
                {"status": "error", "message": "Permisos insuficientes."},
                status=status.HTTP_403_FORBIDDEN
            )

        qs = User.objects.select_related('role').order_by('-created_at')

        # Filtros opcionales
        role_name = request.query_params.get('role')
        account_status = request.query_params.get('account_status')
        search = request.query_params.get('search')

        if role_name:
            qs = qs.filter(role__name__iexact=role_name)
        if account_status:
            qs = qs.filter(account_status=account_status)
        if search:
            qs = qs.filter(email__icontains=search)

        # Paginación simple
        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
        except ValueError:
            page, page_size = 1, 20

        total = qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        usuarios = qs[start:end]

        data = []
        for u in usuarios:
            profile = getattr(u, 'profile', None)
            first_name = profile.first_name if profile else ''
            last_name = profile.last_name if profile else ''
            data.append({
                "id": str(u.id),
                "email": u.email,
                "role": u.role.name if u.role else None,
                "account_status": u.account_status,
                "suspended_reason": u.suspended_reason,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat(),
                "first_name": first_name,
                "last_name": last_name,
                "nombre": f"{first_name} {last_name}".strip() or None,
                "phone": profile.phone if profile else '',
            })

        return Response({
            "status": "success",
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "results": data,
        }, status=status.HTTP_200_OK)

    def _list_by_role(self, request, role_name):
        """
        Helper interno reutilizado por endpoints /promotores/, /compradores/, /administradores/.
        Reusa la logica de admin_users con filtro de rol fijo.
        """
        admin = request.user
        if not admin.is_staff and not (admin.role and admin.role.name.lower() in ['administrador', 'admin', 'superadmin']):
            return Response(
                {"status": "error", "message": "Permisos insuficientes."},
                status=status.HTTP_403_FORBIDDEN,
            )

        qs = (
            User.objects
            .select_related('role', 'profile')
            .filter(role__name__iexact=role_name)
            .order_by('-created_at')
        )

        # Filtros adicionales opcionales
        account_status = request.query_params.get('account_status')
        search = request.query_params.get('search')
        if account_status:
            qs = qs.filter(account_status=account_status)
        if search:
            # Busca por email, nombre o apellido
            from django.db.models import Q
            qs = qs.filter(
                Q(email__icontains=search)
                | Q(profile__first_name__icontains=search)
                | Q(profile__last_name__icontains=search)
            )

        data = []
        for u in qs:
            profile = getattr(u, 'profile', None)
            first_name = profile.first_name if profile else ''
            last_name = profile.last_name if profile else ''
            nombre_completo = f"{first_name} {last_name}".strip()
            data.append({
                "id": str(u.id),
                "email": u.email,
                "role": u.role.name if u.role else None,
                "account_status": u.account_status,
                "suspended_reason": u.suspended_reason,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat(),
                "first_name": first_name,
                "last_name": last_name,
                "nombre": nombre_completo or None,
                "phone": profile.phone if profile else '',
            })
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='promotores')
    def list_promotores(self, request):
        """GET /users/promotores/ — Lista usuarios con rol Promotor."""
        return self._list_by_role(request, 'Promotor')

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='compradores')
    def list_compradores(self, request):
        """GET /users/compradores/ — Lista usuarios con rol Comprador."""
        return self._list_by_role(request, 'Comprador')

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='administradores')
    def list_administradores(self, request):
        """GET /users/administradores/ — Lista usuarios con rol Administrador."""
        return self._list_by_role(request, 'Administrador')

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='admin-audit-log')
    def admin_audit_log_list(self, request):
        """
        GET /users/admin-audit-log/
        Lista el historial de acciones administrativas sobre USUARIOS
        (suspend, reactivate, ban, create_admin, update_admin, grant/revoke_superadmin).
        Complementa el log de auditoria de eventos.

        Query params:
          - action: filtrar por tipo de accion
          - admin_id: filtrar por administrador que ejecuto
          - target_id: filtrar por usuario afectado
          - date_from / date_to: rango de fechas (YYYY-MM-DD)
          - page / page_size: paginacion
        """
        admin = request.user
        es_admin = (
            getattr(admin, 'is_staff', False)
            or getattr(admin, 'is_superadmin', False)
            or (admin.role and (admin.role.name if hasattr(admin.role, 'name') else str(admin.role)).lower()
                in ['administrador', 'admin', 'superadmin'])
        )
        if not es_admin:
            return Response(
                {"status": "error", "message": "Permisos insuficientes para ver el log de auditoria."},
                status=status.HTTP_403_FORBIDDEN,
            )

        qs = AdminAuditLog.objects.all().order_by('-created_at')

        action = request.query_params.get('action')
        admin_id = request.query_params.get('admin_id')
        target_id = request.query_params.get('target_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if action:
            qs = qs.filter(action=action)
        if admin_id:
            qs = qs.filter(admin_id=admin_id)
        if target_id:
            qs = qs.filter(target_user_id=target_id)
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
        except ValueError:
            page, page_size = 1, 20

        total = qs.count()
        start = (page - 1) * page_size
        registros = qs[start:start + page_size]

        ACTION_LABELS = {
            'suspend': 'Suspensión',
            'reactivate': 'Reactivación',
            'ban': 'Baja permanente',
            'delete': 'Eliminación',
            'role_change': 'Cambio de rol',
            'create_admin': 'Creación de Admin',
            'update_admin': 'Actualización de Admin',
            'grant_superadmin': 'Otorgar SuperAdmin',
            'revoke_superadmin': 'Revocar SuperAdmin',
        }

        data = []
        for log in registros:
            data.append({
                "id": str(log.id),
                "admin_id": str(log.admin_id),
                "admin_email": log.admin_email,
                "target_user_id": str(log.target_user_id),
                "target_user_email": log.target_user_email,
                "action": log.action,
                "action_label": ACTION_LABELS.get(log.action, log.action),
                "action_category": log.action_category,
                "reason": log.reason,
                "previous_status": log.previous_status,
                "new_status": log.new_status,
                "created_at": log.created_at.isoformat(),
            })

        return Response({
            "status": "success",
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "results": data,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated], url_path='suspend')
    def suspend_user(self, request, pk=None):
        """
        TIC-384: PATCH /users/{id}/suspend/
        Suspende la cuenta de un usuario y registra en AdminAuditLog.
        Body: { "reason": "Motivo de la suspensión" }
        """
        admin = request.user
        if not admin.is_staff and not (admin.role and admin.role.name.lower() in ['administrador', 'admin', 'superadmin']):
            return Response({"status": "error", "message": "Permisos insuficientes."}, status=status.HTTP_403_FORBIDDEN)

        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"status": "error", "message": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # TIC-440: no permitir auto-suspension
        if str(target.id) == str(admin.id):
            return Response(
                {"status": "error", "message": "No puedes suspender tu propia cuenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response(
                {"status": "error", "message": "El motivo de la suspension es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        previous_status = target.account_status

        target.account_status = 'suspended'
        target.suspended_reason = reason
        target.save(update_fields=['account_status', 'suspended_reason'])

        AdminAuditLog.objects.create(
            admin_id=admin.id,
            admin_email=admin.email,
            target_user_id=target.id,
            target_user_email=target.email,
            action='suspend',
            reason=reason,
            previous_status=previous_status,
            new_status='suspended',
        )

        return Response({
            "status": "success",
            "message": f"Cuenta de {target.email} suspendida correctamente.",
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated], url_path='reactivate')
    def reactivate_user(self, request, pk=None):
        """
        TIC-384: PATCH /users/{id}/reactivate/
        Reactiva la cuenta de un usuario suspendido y registra en AdminAuditLog.
        """
        admin = request.user
        if not admin.is_staff and not (admin.role and admin.role.name.lower() in ['administrador', 'admin', 'superadmin']):
            return Response({"status": "error", "message": "Permisos insuficientes."}, status=status.HTTP_403_FORBIDDEN)

        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"status": "error", "message": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        previous_status = target.account_status
        target.account_status = 'active'
        target.suspended_reason = None
        target.save(update_fields=['account_status', 'suspended_reason'])

        AdminAuditLog.objects.create(
            admin_id=admin.id,
            admin_email=admin.email,
            target_user_id=target.id,
            target_user_email=target.email,
            action='reactivate',
            previous_status=previous_status,
            new_status='active',
        )

        return Response({
            "status": "success",
            "message": f"Cuenta de {target.email} reactivada correctamente.",
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated], url_path='ban')
    def ban_user(self, request, pk=None):
        """
        TIC-441: PATCH /users/{id}/ban/
        Da de BAJA PERMANENTE la cuenta de un Comprador/Promotor (diferente
        de 'suspend' que es temporal). El usuario pierde acceso inmediato
        (is_active=False) y la cuenta queda con account_status='banned'.

        Body: { "reason": "motivo obligatorio de la baja" }

        Validaciones:
        - Solo Admin/SuperAdmin puede ejecutar
        - No se puede auto-eliminar (TIC-440)
        - No se puede dar de baja a otros Admins/SuperAdmins desde aqui
          (eso se hace via /superadmin/admins/suspend/)
        - Motivo obligatorio
        """
        admin = request.user
        if not admin.is_staff and not (admin.role and admin.role.name.lower() in ['administrador', 'admin', 'superadmin']):
            return Response(
                {"status": "error", "message": "Permisos insuficientes."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"status": "error", "message": "Usuario no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # TIC-440: no permitir auto-baja
        if str(target.id) == str(admin.id):
            return Response(
                {"status": "error", "message": "No puedes dar de baja tu propia cuenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Bloquear baja de Admins/SuperAdmins via este endpoint
        if target.is_superadmin or (target.role and target.role.name.lower() in ['administrador', 'admin']):
            return Response(
                {"status": "error", "message": "Para dar de baja a un Administrador usa el panel SuperAdmin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response(
                {"status": "error", "message": "El motivo de la baja es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        previous_status = target.account_status
        target.account_status = 'banned'
        target.suspended_reason = reason
        target.is_active = False
        target.save(update_fields=['account_status', 'suspended_reason', 'is_active'])

        AdminAuditLog.objects.create(
            admin_id=admin.id,
            admin_email=admin.email,
            target_user_id=target.id,
            target_user_email=target.email,
            action='ban',
            reason=reason,
            previous_status=previous_status,
            new_status='banned',
        )

        return Response({
            "status": "success",
            "message": f"Cuenta de {target.email} dada de baja permanentemente.",
            "data": {
                "user_id": str(target.id),
                "email": target.email,
                "account_status": target.account_status,
                "reason": reason,
            },
        }, status=status.HTTP_200_OK)

    # ─── TIC-393/TIC-400: Gestión de SuperAdmins ────────────────────────────────

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated], url_path='grant-superadmin')
    @superadmin_required
    @log_superadmin_action(action='grant_superadmin', category='admin_mgmt')
    def grant_superadmin(self, request, pk=None):
        """
        TIC-393/TIC-400: PATCH /users/{id}/grant-superadmin/
        Otorga privilegios de SuperAdmin a un administrador existente.
        Solo accesible por SuperAdmins.
        """
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"status": "error", "message": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not (target.role and target.role.name.lower() in ['administrador', 'admin']):
            return Response(
                {"status": "error", "message": "Solo se puede otorgar SuperAdmin a usuarios con rol Administrador."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target.is_superadmin = True
        target.is_staff = True
        target.save(update_fields=['is_superadmin', 'is_staff'])

        return Response({
            "status": "success",
            "message": f"{target.email} ahora tiene privilegios de SuperAdmin.",
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated], url_path='revoke-superadmin')
    @superadmin_required
    @log_superadmin_action(action='revoke_superadmin', category='admin_mgmt')
    def revoke_superadmin(self, request, pk=None):
        """
        TIC-393/TIC-400: PATCH /users/{id}/revoke-superadmin/
        Revoca los privilegios de SuperAdmin de un administrador.
        Solo accesible por SuperAdmins.
        """
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"status": "error", "message": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        target.is_superadmin = False
        target.is_staff = False
        target.save(update_fields=['is_superadmin', 'is_staff'])

        return Response({
            "status": "success",
            "message": f"Privilegios de SuperAdmin revocados para {target.email}.",
        }, status=status.HTTP_200_OK)

    # ─── TIC-396/397/398/399: Gestión completa de Administradores por SuperAdmin ──

    @action(
        detail=False,
        methods=['get', 'post'],
        permission_classes=[IsAuthenticated],
        url_path='superadmin/admins',
    )
    def superadmin_admins(self, request):
        """
        TIC-396 (GET): Lista todos los administradores con permisos y estado.
        TIC-397 (POST): Crea un nuevo Administrador con permisos asignables.
                       Body: { email, password, first_name, last_name, permissions: [...] }
        Acceso: solo SuperAdmin.
        """
        if not request.user.is_superadmin:
            return Response(
                {"status": "error", "message": "Solo SuperAdmin puede gestionar administradores."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.method == 'GET':
            qs = User.objects.select_related('role').filter(
                role__name__iexact='Administrador',
            ).order_by('-created_at')

            data = []
            for u in qs:
                perms = list(u.admin_permissions or [])
                data.append({
                    "id": str(u.id),
                    "email": u.email,
                    "nombre": f"{u.profile.first_name} {u.profile.last_name}".strip() if hasattr(u, 'profile') and u.profile else u.email,
                    "is_superadmin": u.is_superadmin,
                    "is_active": u.is_active,
                    "account_status": u.account_status,
                    "suspended_reason": u.suspended_reason,
                    "permissions": perms,
                    "created_at": u.created_at.isoformat(),
                })
            return Response({"status": "success", "total": len(data), "results": data}, status=status.HTTP_200_OK)

        # POST → crear nuevo admin
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response(
                {"status": "error", "message": "Email y password son obligatorios."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(email=email).exists():
            return Response(
                {"status": "error", "message": "Ya existe un usuario con ese email."},
                status=status.HTTP_409_CONFLICT,
            )

        admin_role = Role.objects.filter(name__iexact='Administrador').first()
        # TIC-397/443: persistir los permisos asignados al crear
        permissions = request.data.get('permissions', []) or []
        if not isinstance(permissions, list):
            return Response(
                {"status": "error", "message": "El campo permissions debe ser una lista."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        phone = request.data.get('phone', '')

        try:
            with transaction.atomic():
                new_user = User.objects.create_user(
                    email=email,
                    password=password,
                    role=admin_role,
                    is_staff=True,
                    admin_permissions=permissions,
                )

                # Un signal post_save puede crear el UserProfile vacio; usamos
                # update_or_create para evitar duplicate key y aun asi poblar campos.
                if first_name or last_name or phone:
                    from datetime import date
                    UserProfile.objects.update_or_create(
                        user=new_user,
                        defaults={
                            'first_name': first_name,
                            'last_name': last_name,
                            'phone': phone,
                            'date_of_birth': date.today(),
                        },
                    )

                AdminAuditLog.objects.create(
                    admin_id=request.user.id,
                    admin_email=request.user.email,
                    target_user_id=new_user.id,
                    target_user_email=new_user.email,
                    action='create_admin',
                    action_category='admin_mgmt',
                    reason=request.data.get('reason') or f"Permisos iniciales: {', '.join(permissions) if permissions else 'ninguno'}",
                    new_status='active',
                )
        except Exception as e:
            return Response(
                {"status": "error", "message": f"No se pudo crear el administrador: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({
            "status": "success",
            "message": f"Administrador {email} creado correctamente.",
            "data": {
                "id": str(new_user.id),
                "email": new_user.email,
                "role": admin_role.name if admin_role else None,
                "permissions": permissions,
            },
        }, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['patch'],
        permission_classes=[IsAuthenticated],
        url_path='superadmin/admins/permissions',
    )
    @superadmin_required
    def superadmin_update_permissions(self, request, pk=None):
        """
        TIC-398: PATCH /users/{id}/superadmin/admins/permissions/
        Modifica los permisos de un Administrador.

        Body: { "permissions": ["manage_users", "manage_events", "view_reports", ...] }

        Validacion clave: un Admin estandar NO puede modificar SuperAdmins (TIC-446).
        """
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"status": "error", "message": "Administrador no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # TIC-446: No permitir gestionar a otro SuperAdmin
        if target.is_superadmin and target.id != request.user.id:
            return Response(
                {"status": "error", "message": "No esta autorizado a gestionar cuentas de nivel SuperAdmin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not (target.role and target.role.name.lower() in ['administrador', 'admin']):
            return Response(
                {"status": "error", "message": "Solo se pueden modificar permisos de Administradores."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nuevos_permisos = request.data.get('permissions', [])
        if not isinstance(nuevos_permisos, list):
            return Response(
                {"status": "error", "message": "El campo permissions debe ser una lista."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # TIC-398/445: persistir los permisos en User.admin_permissions
        permisos_anteriores = list(target.admin_permissions or [])
        target.admin_permissions = nuevos_permisos
        target.save(update_fields=['admin_permissions'])

        # Registrar en bitacora para auditoria
        AdminAuditLog.objects.create(
            admin_id=request.user.id,
            admin_email=request.user.email,
            target_user_id=target.id,
            target_user_email=target.email,
            action='update_admin',
            action_category='admin_mgmt',
            reason=f"Permisos: [{', '.join(permisos_anteriores) or '-'}] → [{', '.join(nuevos_permisos) or '-'}]",
            previous_status='active',
            new_status='active',
        )

        return Response({
            "status": "success",
            "message": f"Permisos de {target.email} actualizados correctamente.",
            "data": {
                "admin_id": str(target.id),
                "email": target.email,
                "permissions_before": permisos_anteriores,
                "permissions_after": nuevos_permisos,
            },
        }, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=['patch'],
        permission_classes=[IsAuthenticated],
        url_path='superadmin/admins/suspend',
    )
    @superadmin_required
    def superadmin_suspend_admin(self, request, pk=None):
        """
        TIC-399: PATCH /users/{id}/superadmin/admins/suspend/
        Suspende a un Administrador (cambia account_status = 'suspended').
        Body: { "reason": "motivo de suspension" }

        Validaciones:
        - Solo SuperAdmin (decorator)
        - No se puede suspender a otro SuperAdmin (TIC-446)
        - El usuario debe tener rol Administrador
        - No se puede auto-suspender
        """
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"status": "error", "message": "Administrador no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if str(target.id) == str(request.user.id):
            return Response(
                {"status": "error", "message": "No puedes suspender tu propia cuenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target.is_superadmin:
            return Response(
                {"status": "error", "message": "No esta autorizado a suspender cuentas de SuperAdmin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not (target.role and target.role.name.lower() in ['administrador', 'admin']):
            return Response(
                {"status": "error", "message": "Solo se pueden suspender Administradores con este endpoint."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response(
                {"status": "error", "message": "El motivo de suspension es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        previous_status = target.account_status
        target.account_status = 'suspended'
        target.suspended_reason = reason
        target.is_active = False
        target.save(update_fields=['account_status', 'suspended_reason', 'is_active'])

        AdminAuditLog.objects.create(
            admin_id=request.user.id,
            admin_email=request.user.email,
            target_user_id=target.id,
            target_user_email=target.email,
            action='suspend',
            action_category='admin_mgmt',
            reason=reason,
            previous_status=previous_status,
            new_status='suspended',
        )

        return Response({
            "status": "success",
            "message": f"Administrador {target.email} suspendido correctamente.",
            "data": {
                "admin_id": str(target.id),
                "email": target.email,
                "account_status": target.account_status,
                "reason": reason,
            },
        }, status=status.HTTP_200_OK)


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated]


# --- ENDPOINTS DE ADMINISTRACIÓN ---
class AdminUserManagementView(APIView):
    """
    POST /api/admin/users/
    El administrador crea una cuenta de Promotor o Comprador.
    Incluye creación de UserProfile local y perfil remoto
    en service-profiles según el rol.
    """
    permission_classes = [IsAuthenticated]

    def _es_admin(self, user):
        return (
            getattr(user, 'is_staff', False) or
            (user.role and user.role.name.lower() in ['administrador', 'admin'])
        )

    def post(self, request):
        if not self._es_admin(request.user):
            return Response(
                {"error": "No tienes permisos de Administrador."},
                status=status.HTTP_403_FORBIDDEN
            )

        from .serializers import AdminCreateUserSerializer
        serializer = AdminCreateUserSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Error en los datos enviados.",
                "details": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Verificar email único
        if User.objects.filter(email=data['email']).exists():
            return Response({
                "status": "error",
                "message": "El correo ya está registrado en el sistema."
            }, status=status.HTTP_409_CONFLICT)

        # Obtener el rol
        try:
            rol = Role.objects.get(name=data['role_name'])
        except Role.DoesNotExist:
            return Response({
                "status": "error",
                "message": f"El rol '{data['role_name']}' no existe en la base de datos."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            with transaction.atomic():
                # 1. Crear el User
                user = User(
                    email=data['email'],
                    role=rol,
                    is_active=True  # Admin crea directamente activo
                )
                user.set_password(data['password'])
                user.save()

                # 2. Actualizar UserProfile local (el signal ya lo creó automáticamente)
                from datetime import date as _date_cls
                dob_fallback = data.get('date_of_birth') or _date_cls(2000, 1, 1)
                profile, _ = UserProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'first_name': '',
                        'last_name': '',
                        'phone': '',
                        'date_of_birth': dob_fallback,
                    }
                )
                profile.first_name = data['first_name']
                profile.last_name = data.get('last_name') or ''
                profile.phone = data.get('phone') or ''
                profile.date_of_birth = data.get('date_of_birth') or dob_fallback
                profile.save()

                # 3. Token interno para llamar a service-profiles
                internal_payload = {
                    'user_id': str(user.id),
                    'email': user.email,
                    'role': data['role_name'],
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
                }
                internal_token = jwt.encode(
                    internal_payload,
                    settings.SECRET_KEY,
                    algorithm='HS256'
                )

                profiles_url = getattr(
                    settings, 'PROFILES_SERVICE_URL', 'http://localhost:8001'
                )

                # 4. Crear perfil remoto según el rol
                profiles_url = getattr(
                    settings, 'PROFILES_SERVICE_URL', 'http://service-profiles:8000'
                )

                try:
                    if data['role_name'] == 'Promotor':
                        response = requests.post(
                            f"{profiles_url}/api/profiles/promotor-profiles/",
                            json={
                                "user_id": str(user.id),
                                "company_name": data['company_name'],
                                "comercial_nit": data['comercial_nit'],
                                "bank_account": data['bank_account'],
                            },
                            headers={"Authorization": f"Bearer {internal_token}"},
                            timeout=5
                        )
                    else:
                        # Comprador
                        response = requests.post(
                            f"{profiles_url}/api/profiles/buyer-profiles/",
                            json={"user_id": str(user.id)},
                            headers={"Authorization": f"Bearer {internal_token}"},
                            timeout=5
                        )

                    if response.status_code not in (200, 201):
                        raise Exception(
                            f"Error al crear perfil remoto: {response.text}"
                        )
                except (requests.ConnectionError, requests.Timeout, Exception) as e:
                    # Si el servicio de perfiles no está disponible, el usuario se crea igualmente
                    # pero se genera un warning en los logs
                    print(f"WARNING: No se pudo crear perfil remoto para {user.email}: {str(e)}")

        except Exception as e:
            return Response({
                "status": "error",
                "message": "Error al crear el usuario.",
                "detalle": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "status": "success",
            "message": f"Cuenta de {data['role_name']} creada correctamente.",
            "data": {
                "id": str(user.id),
                "email": user.email,
                "role": data['role_name'],
                "is_active": user.is_active,
            }
        }, status=status.HTTP_201_CREATED)


class SuperadminAdminListCreateView(APIView):
    """
    GET  /api/v1/superadmin/admins/
        Lista todas las cuentas de Administrador con estado y permisos.

    POST /api/v1/superadmin/admins/
        Crea una nueva cuenta de Administrador directamente
        (sin necesidad de invitación ni aprobación).
    """
    permission_classes = [IsAuthenticated, IsSuperadmin]

    def get(self, request):
        admins = User.objects.filter(
            role__name__in=['Administrador', 'Admin']
        ).select_related('role', 'profile').order_by('-created_at')

        estado = request.query_params.get('estado', None)
        if estado == 'activo':
            admins = admins.filter(is_active=True)
        elif estado == 'suspendido':
            admins = admins.filter(is_active=False)
        elif estado == 'pendiente':
            admins = admins.filter(is_active=False)

        from .serializers import AdminDetailSerializer
        serializer = AdminDetailSerializer(admins, many=True)

        return Response({
            "status": "success",
            "total": admins.count(),
            "activos": admins.filter(is_active=True).count(),
            "suspendidos": admins.filter(is_active=False).count(),
            "results": serializer.data,
        }, status=status.HTTP_200_OK)

    def post(self, request):
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        phone = request.data.get('phone', '').strip()
        date_of_birth = request.data.get('date_of_birth', None)
        employee_code = request.data.get('employee_code', '').strip()
        department = request.data.get('department', '').strip()

        errores = {}
        if not email:
            errores['email'] = 'El correo es obligatorio.'
        if not password:
            errores['password'] = 'La contraseña es obligatoria.'
        if not first_name:
            errores['first_name'] = 'El nombre es obligatorio.'
        if not last_name:
            errores['last_name'] = 'El apellido es obligatorio.'
        if not phone:
            errores['phone'] = 'El teléfono es obligatorio.'
        if not date_of_birth:
            errores['date_of_birth'] = 'La fecha de nacimiento es obligatoria.'
        if not employee_code:
            errores['employee_code'] = 'El código de empleado es obligatorio.'
        if not department:
            errores['department'] = 'El departamento es obligatorio.'

        if errores:
            return Response({
                "status": "error",
                "message": "Faltan campos obligatorios.",
                "details": errores
            }, status=status.HTTP_400_BAD_REQUEST)

        import re
        if len(password) < 8:
            return Response({
                "status": "error",
                "message": "La contraseña debe tener al menos 8 caracteres."
            }, status=status.HTTP_400_BAD_REQUEST)
        if not re.search(r'[A-Z]', password):
            return Response({
                "status": "error",
                "message": "La contraseña debe contener al menos una mayúscula."
            }, status=status.HTTP_400_BAD_REQUEST)
        if not re.search(r'\d', password):
            return Response({
                "status": "error",
                "message": "La contraseña debe contener al menos un número."
            }, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({
                "status": "error",
                "message": "El correo ya está registrado en el sistema."
            }, status=status.HTTP_409_CONFLICT)

        try:
            rol_admin = Role.objects.get(name='Administrador')
        except Role.DoesNotExist:
            return Response({
                "status": "error",
                "message": "El rol 'Administrador' no existe en la base de datos."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            with transaction.atomic():
                user = User(
                    email=email,
                    role=rol_admin,
                    is_active=True
                )
                user.set_password(password)
                user.save()

                UserProfile.objects.create(
                    user=user,
                    first_name=first_name,
                    last_name=last_name,
                    phone=phone,
                    date_of_birth=date_of_birth,
                )

                internal_payload = {
                    'user_id': str(user.id),
                    'email': user.email,
                    'role': 'Administrador',
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
                }
                internal_token = jwt.encode(
                    internal_payload,
                    settings.SECRET_KEY,
                    algorithm='HS256'
                )

                profiles_url = getattr(
                    settings, 'PROFILES_SERVICE_URL', 'http://service-profiles:8000'
                )
                response = requests.post(
                    f"{profiles_url}/api/profiles/admin-profiles/",
                    json={
                        "user_id": str(user.id),
                        "employee_code": employee_code,
                        "department": department,
                    },
                    headers={"Authorization": f"Bearer {internal_token}"},
                    timeout=5
                )

                if response.status_code not in (200, 201):
                    raise Exception(
                        f"Error al crear AdminProfile remoto: {response.text}"
                    )

        except Exception as e:
            return Response({
                "status": "error",
                "message": "Error al crear el administrador.",
                "detalle": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "status": "success",
            "message": "Cuenta de Administrador creada correctamente por Superadmin.",
            "data": {
                "id": str(user.id),
                "email": user.email,
                "role": "Administrador",
                "is_active": True,
                "employee_code": employee_code,
                "department": department,
            }
        }, status=status.HTTP_201_CREATED)


class AdminSuspendUserView(APIView):
    """
    PATCH /api/admin/users/{id}/suspend/
    Suspende una cuenta de Promotor o Comprador.
    El motivo es obligatorio para cumplir auditoría.
    """
    permission_classes = [IsAuthenticated]

    def _es_admin(self, user):
        return (
            getattr(user, 'is_staff', False) or
            (user.role and user.role.name.lower() in ['administrador', 'admin'])
        )

    def patch(self, request, pk):
        if not self._es_admin(request.user):
            return Response(
                {"error": "No tienes permisos de Administrador."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Motivo obligatorio
        motivo = request.data.get('motivo', '').strip()
        if not motivo:
            return Response({
                "status": "error",
                "message": "El motivo de suspensión es obligatorio."
            }, status=status.HTTP_400_BAD_REQUEST)

        if len(motivo) < 10:
            return Response({
                "status": "error",
                "message": "El motivo debe tener al menos 10 caracteres."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Obtener el usuario a suspender
        try:
            usuario_objetivo = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Usuario no encontrado."
            }, status=status.HTTP_404_NOT_FOUND)

        # El admin no puede suspenderse a sí mismo
        if str(usuario_objetivo.id) == str(request.user.id):
            return Response({
                "status": "error",
                "message": "No puedes suspender tu propia cuenta."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Solo se puede suspender Promotores y Compradores
        roles_suspendibles = ['promotor', 'comprador', 'buyer']
        if not usuario_objetivo.role or \
           usuario_objetivo.role.name.lower() not in roles_suspendibles:
            return Response({
                "status": "error",
                "message": "Solo se pueden suspender cuentas de Promotor o Comprador."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verificar si ya está suspendido
        if not usuario_objetivo.is_active:
            return Response({
                "status": "error",
                "message": "La cuenta ya está suspendida."
            }, status=status.HTTP_409_CONFLICT)

        # Suspender y registrar auditoría
        from .models import SuspensionLog
        with transaction.atomic():
            usuario_objetivo.is_active = False
            usuario_objetivo.save(update_fields=['is_active'])

            SuspensionLog.objects.create(
                user_email=usuario_objetivo.email,
                user_role=usuario_objetivo.role.name if usuario_objetivo.role else 'Sin rol',
                motivo=motivo,
                suspendido_por_email=request.user.email,
            )

        return Response({
            "status": "success",
            "message": f"Cuenta de {usuario_objetivo.email} suspendida correctamente.",
            "data": {
                "user_id": str(usuario_objetivo.id),
                "email": usuario_objetivo.email,
                "role": usuario_objetivo.role.name if usuario_objetivo.role else None,
                "is_active": False,
                "motivo": motivo,
                "suspendido_por": request.user.email,
            }
        }, status=status.HTTP_200_OK)