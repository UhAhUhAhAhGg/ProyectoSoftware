import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

# --- ROLES Y PERMISOS ---
class Role(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        verbose_name = 'Role'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return self.name

class Permission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = 'Permission'
        verbose_name_plural = 'Permissions'

    def __str__(self):
        return self.name

class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='role_permissions')

    class Meta:
        unique_together = ('role', 'permission')
        verbose_name = 'Role Permission'
        verbose_name_plural = 'Role Permissions'

    def __str__(self):
        return f"{self.role.name} - {self.permission.name}"

# --- GESTIÓN DE USUARIOS ---
class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es requerido')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_staff', True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser):
    ACCOUNT_STATUS_CHOICES = [
        ('active', 'Activo'),
        ('suspended', 'Suspendido'),
        ('banned', 'Bloqueado permanentemente'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    reset_token = models.CharField(max_length=255, blank=True, null=True)
    reset_token_expires = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(blank=True, null=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)

    # TIC-382: Gestión de estado de cuenta por administrador
    account_status = models.CharField(
        max_length=20,
        choices=ACCOUNT_STATUS_CHOICES,
        default='active',
        db_index=True,
    )
    suspended_reason = models.TextField(null=True, blank=True)

    # TIC-393: Rol SuperAdmin — privilegios máximos del sistema
    is_superadmin = models.BooleanField(default=False, db_index=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email

    def has_perm(self, perm, obj=None):
        return True

    def has_module_perms(self, app_label):
        return True


class UserProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='profile'
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=50)
    date_of_birth = models.DateField()
    profile_photo_url = models.TextField(blank=True, null=True)  # TextField para soportar base64 largo

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class AccountDeletionLog(models.Model):
    """
    Registra quién eliminó su cuenta para auditoría legal.
    No se usa ForeignKey porque el User será borrado físicamente.
    """
    user_email = models.EmailField()
    user_role = models.CharField(max_length=50, null=True, blank=True)
    deleted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'account_deletion_logs'
        verbose_name = 'Registro de Eliminación'
        verbose_name_plural = 'Registros de Eliminaciones'

    def __str__(self):
        return f"{self.user_email} - {self.deleted_at}"


# ─── TIC-23: Gestión de Promotores/Clientes (Admin) ──────────────────────────

class AdminAuditLog(models.Model):
    """
    TIC-383: Registro de todas las acciones administrativas sobre usuarios.
    Permite rastrear quién hizo qué, cuándo y por qué.

    Categorías de acción:
      - suspend: Suspensión temporal de cuenta
      - ban: Bloqueo permanente
      - reactivate: Reactivación de cuenta
      - delete: Eliminación de cuenta
      - role_change: Cambio de rol
      - create_admin: Creación de cuenta admin (usado en TIC-24)
    """
    ACTION_CHOICES = [
        ('suspend', 'Suspender cuenta'),
        ('ban', 'Bloquear permanentemente'),
        ('reactivate', 'Reactivar cuenta'),
        ('delete', 'Eliminar cuenta'),
        ('role_change', 'Cambiar rol'),
        ('create_admin', 'Crear administrador'),
        ('update_admin', 'Actualizar permisos administrador'),
        ('grant_superadmin', 'Otorgar SuperAdmin'),
        ('revoke_superadmin', 'Revocar SuperAdmin'),
    ]

    # TIC-394: Categoría de la acción para diferenciar contexto de auditoría
    ACTION_CATEGORY_CHOICES = [
        ('user_mgmt', 'Gestión de usuarios'),
        ('admin_mgmt', 'Gestión de administradores'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Quién ejecutó la acción
    admin_id = models.UUIDField(db_index=True)
    admin_email = models.EmailField()

    # Sobre quién se ejecutó
    target_user_id = models.UUIDField(db_index=True)
    target_user_email = models.EmailField()

    action = models.CharField(max_length=30, choices=ACTION_CHOICES, db_index=True)
    # TIC-394: Categoría para filtrar por tipo de operación
    action_category = models.CharField(
        max_length=20,
        choices=ACTION_CATEGORY_CHOICES,
        default='user_mgmt',
        db_index=True,
    )
    reason = models.TextField(null=True, blank=True)

    # Estado anterior y nuevo (para auditoría completa)
    previous_status = models.CharField(max_length=20, null=True, blank=True)
    new_status = models.CharField(max_length=20, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Admin Audit Log'
        verbose_name_plural = 'Admin Audit Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['admin_id']),
            models.Index(fields=['target_user_id']),
            models.Index(fields=['action']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.admin_email} → {self.action} sobre {self.target_user_email}"


class SuspensionLog(models.Model):
    """
    US22: Registra cada suspensión de cuenta para auditoría detallada.
    Complementa AdminAuditLog con motivo y email de quien suspendió.
    No usa ForeignKey al User porque el usuario podría ser eliminado posteriormente.
    """
    user_email = models.EmailField()
    user_role = models.CharField(max_length=50, null=True, blank=True)
    motivo = models.TextField()
    suspendido_por_email = models.EmailField()
    suspended_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'suspension_logs'
        verbose_name = 'Registro de Suspensión'
        verbose_name_plural = 'Registros de Suspensiones'
        ordering = ['-suspended_at']

    def __str__(self):
        return f"{self.user_email} — {self.suspended_at}"
