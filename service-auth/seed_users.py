"""
Seed de usuarios de prueba.

Crea (o actualiza) tres cuentas estandar para que el equipo pueda probar
todos los flujos sin tener que registrarse manualmente:

  - admin@ticketproject.com    -> SuperAdministrador (is_superadmin=True,
                                  is_staff=True, todas las capabilities).
                                  Es la cuenta inicial desde la cual se
                                  crean los demas admins.
  - promotor@ticketproject.com -> Promotor.
  - comprador@ticketproject.com -> Comprador.

Ademas crea un Administrador "limitado" (admin2@ticketproject.com) con solo
manage_events para poder verificar que el sistema de permisos granulares
filtra el sidebar correctamente (US24 / TIC-398 / TIC-445).

Ejecutar:
    docker compose exec service-auth python seed_users.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth_config.settings')
django.setup()

from users.models import User, Role
from users.permissions import ADMIN_CAPABILITIES

print('=== Seed de Usuarios de Prueba ===')

# Asegurar que los roles existan (los crea seed_superadmin_role.py + migrations)
ROLES_REQUERIDOS = ['Administrador', 'Promotor', 'Comprador', 'Superadmin']
for nombre in ROLES_REQUERIDOS:
    Role.objects.get_or_create(name=nombre)

roles = {r.name: r for r in Role.objects.all()}

USERS_TO_CREATE = [
    {
        'email': 'admin@ticketproject.com',
        'password': 'Admin1234!',
        'role': 'Administrador',
        'is_staff': True,
        'is_superadmin': True,
        # SuperAdmin: bypass total. Asignamos igual el set completo por
        # consistencia con el modelo (no afecta el bypass).
        'admin_permissions': list(ADMIN_CAPABILITIES),
    },
    {
        'email': 'admin2@ticketproject.com',
        'password': 'Admin1234!',
        'role': 'Administrador',
        'is_staff': True,
        'is_superadmin': False,
        # Admin limitado: solo gestiona eventos. Util para verificar gating.
        'admin_permissions': ['manage_events'],
    },
    {
        'email': 'promotor@ticketproject.com',
        'password': 'Promotor1234!',
        'role': 'Promotor',
        'is_staff': False,
        'is_superadmin': False,
        'admin_permissions': [],
    },
    {
        'email': 'comprador@ticketproject.com',
        'password': 'Comprador1234!',
        'role': 'Comprador',
        'is_staff': False,
        'is_superadmin': False,
        'admin_permissions': [],
    },
]

for u in USERS_TO_CREATE:
    user = User.objects.filter(email=u['email']).first()
    if not user:
        user = User(
            email=u['email'],
            role=roles[u['role']],
            is_staff=u['is_staff'],
            is_superadmin=u['is_superadmin'],
            admin_permissions=u['admin_permissions'],
        )
        user.set_password(u['password'])
        user.save()
        flag = ' [SUPERADMIN]' if u['is_superadmin'] else ''
        print(f"  CREADO: {u['email']} ({u['role']}){flag}")
    else:
        # Actualizar campos clave si difieren
        cambios = []
        if user.is_staff != u['is_staff']:
            user.is_staff = u['is_staff']; cambios.append('is_staff')
        if user.is_superadmin != u['is_superadmin']:
            user.is_superadmin = u['is_superadmin']; cambios.append('is_superadmin')
        if user.role != roles[u['role']]:
            user.role = roles[u['role']]; cambios.append('role')
        if list(user.admin_permissions or []) != list(u['admin_permissions']):
            user.admin_permissions = u['admin_permissions']; cambios.append('admin_permissions')
        if cambios:
            user.save()
            print(f"  ACTUALIZADO: {u['email']} ({', '.join(cambios)})")
        else:
            print(f"  OK (sin cambios): {u['email']}")

print(f"\nTotal usuarios en BD: {User.objects.count()}")
print('\nCuentas de prueba listas:')
for u in USERS_TO_CREATE:
    print(f"  {u['email']:35s} / {u['password']}  ({u['role']})")
