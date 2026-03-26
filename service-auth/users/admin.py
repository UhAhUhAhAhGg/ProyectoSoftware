from django.contrib import admin
from .models import User, UserProfile, Role, Permission, AccountDeletionLog


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'role', 'is_active', 'is_staff', 'created_at')
    list_filter = ('role', 'is_active', 'is_staff', 'created_at')
    search_fields = ('email',)
    ordering = ('-created_at',)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'first_name', 'last_name', 'phone', 'date_of_birth', 'profile_photo_url')
    search_fields = ('first_name', 'last_name', 'user__email')
    ordering = ('first_name',)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)

@admin.register(AccountDeletionLog)
class AccountDeletionLogAdmin(admin.ModelAdmin):
    list_display = ('user_email', 'user_role', 'deleted_at')
    list_filter = ('user_role', 'deleted_at')
    search_fields = ('user_email',)
    ordering = ('-deleted_at',)