"""
Migra usuarios con is_staff=True para convertirlos en SuperAdmins reales
usando el nuevo campo booleano is_superadmin en lugar del rol 'Superadmin'.
Ejecutar con:
    docker compose exec service-auth python seed_superadmin_role.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth_config.settings')
django.setup()

from users.models import Role, User

# 1. Asegurar rol Administrador
rol_admin, created = Role.objects.get_or_create(name='Administrador')

# 2. Migrar usuarios staff a is_superadmin=True
superadmins = User.objects.filter(is_staff=True)
for u in superadmins:
    u.role = rol_admin
    u.is_superadmin = True
    u.save(update_fields=['role', 'is_superadmin'])
    print(f"  ✅ {u.email} → is_superadmin=True y rol Administrador asignado.")

print(f"\nResumen: {superadmins.count()} usuario(s) actualizados.")
