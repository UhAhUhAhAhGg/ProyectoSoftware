"""
Crea el rol Superadmin en la BD y asigna is_staff=True
al primer usuario con is_staff=True existente.
Ejecutar con:
    docker compose exec service-auth python seed_superadmin_role.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth_config.settings')
django.setup()

from users.models import Role, User

# 1. Crear rol Superadmin
rol, created = Role.objects.get_or_create(name='Superadmin')
if created:
    print("✅ Rol 'Superadmin' creado.")
else:
    print("⚠️  Rol 'Superadmin' ya existía.")

# 2. Asignar a usuarios con is_staff=True existentes
superadmins = User.objects.filter(is_staff=True)
for u in superadmins:
    u.role = rol
    u.save(update_fields=['role'])
    print(f"  ✅ {u.email} → rol Superadmin asignado.")

print(f"\nResumen: {superadmins.count()} usuario(s) actualizados.")
