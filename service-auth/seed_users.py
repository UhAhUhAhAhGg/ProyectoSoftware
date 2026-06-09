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

from users.models import User, Role, UserProfile
from users.permissions import ADMIN_CAPABILITIES

print('=== Seed de Usuarios de Prueba ===')

# Asegurar que los roles existan (los crea seed_superadmin_role.py + migrations)
ROLES_REQUERIDOS = ['Administrador', 'Promotor', 'Comprador', 'Superadmin']
for nombre in ROLES_REQUERIDOS:
    Role.objects.get_or_create(name=nombre)

roles = {r.name: r for r in Role.objects.all()}

USERS_TO_CREATE = [
    {
        'first_name': 'Gus',
        'email': 'gus@ticketgo.com',
        'password': 'Admin1234!',
        'role': 'Administrador',
        'is_staff': True,
        'is_superadmin': True,
        'admin_permissions': list(ADMIN_CAPABILITIES),
    },
    {
        'first_name': 'Fernand',
        'email': 'fernand@ticketgo.com',
        'password': 'Admin123!',
        'role': 'Administrador',
        'is_staff': True,
        'is_superadmin': False,
        'admin_permissions': list(ADMIN_CAPABILITIES),
    },
    {
        'first_name': 'MarciaPrin.',
        'email': 'marciaprin@ticketgo.com',
        'password': 'Romeo9&15',
        'role': 'Promotor',
        'is_staff': False,
        'is_superadmin': False,
        'admin_permissions': [],
    },
    {
        'first_name': 'Ari',
        'email': 'arianak@ticketgo.com',
        'password': 'AriKrem$63',
        'role': 'Promotor',
        'is_staff': False,
        'is_superadmin': False,
        'admin_permissions': [],
    },
    {
        'first_name': 'Quino',
        'email': 'quinoerick@ticketgo.com',
        'password': 'QuinoMir@04',
        'role': 'Promotor',
        'is_staff': False,
        'is_superadmin': False,
        'admin_permissions': [],
    },
    {
        'first_name': 'Anghelo',
        'email': 'anghelop@ticketgo.com',
        'password': 'AngheloP3h@',
        'role': 'Promotor',
        'is_staff': False,
        'is_superadmin': False,
        'admin_permissions': [],
    },
    {
        'first_name': 'Roberto',
        'email': 'roberto@ticketgo.com',
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
        
        # Crear perfil para que tengan nombre
        from datetime import date
        UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'first_name': u.get('first_name', ''),
                'last_name': '',
                'phone': '00000000',
                'date_of_birth': date(2000, 1, 1),
            }
        )

        flag = ' [SUPERADMIN]' if u['is_superadmin'] else ''
        print(f"  CREADO: {u['email']} ({u['role']}) - {u.get('first_name', '')}{flag}")
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

    # Asegurar que el perfil exista y esté actualizado SIEMPRE
    from datetime import date
    profile, created = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            'first_name': u.get('first_name', ''),
            'last_name': '',
            'phone': '00000000',
            'date_of_birth': date(2000, 1, 1),
        }
    )
    if not created and profile.first_name != u.get('first_name', ''):
        profile.first_name = u.get('first_name', '')
        profile.save()
        print(f"  PERFIL ACTUALIZADO: {u['email']} -> {profile.first_name}")

print(f"\nTotal usuarios en BD: {User.objects.count()}")
print('\nCuentas de prueba listas:')
for u in USERS_TO_CREATE:
    print(f"  {u['email']:35s} / {u['password']}  ({u['role']})")
