import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth_config.settings')
django.setup()

from users.models import User, Role

print('=== Seed de Usuarios de Prueba ===')

roles = {r.name: r for r in Role.objects.all()}
if not roles:
    print('ERROR: No hay roles en la BD. Ejecuta primero las migraciones.')
    exit(1)

users_to_create = [
    {'email': 'admin@ticketproject.com',     'password': 'Admin1234!',      'role': 'Administrador', 'is_staff': True},
    {'email': 'comprador@ticketproject.com', 'password': 'Comprador1234!',  'role': 'Comprador',     'is_staff': False},
    {'email': 'promotor@ticketproject.com',  'password': 'Promotor1234!',   'role': 'Promotor',      'is_staff': False},
    {'email': 'gustavo.quisbert.c@ucb.edu.bo',  'password': 'Comprador1234!',   'role': 'Comprador',      'is_staff': False},
]

for u in users_to_create:
    user = User.objects.filter(email=u['email']).first()
    if not user:
        user = User(email=u['email'], role=roles[u['role']], is_staff=u['is_staff'])
        user.set_password(u['password'])
        user.save()
        print(f"  CREADO: {u['email']}  ({u['role']}) - Staff: {u['is_staff']}")
    else:
        # Actualizar permisos si es necesario
        updated = False
        if user.is_staff != u['is_staff']:
            user.is_staff = u['is_staff']
            updated = True
        if user.role != roles[u['role']]:
            user.role = roles[u['role']]
            updated = True
        
        if updated:
            user.save()
            print(f"  ACTUALIZADO: {u['email']} - Staff: {user.is_staff}")
        else:
            print(f"  OK (ya existe): {u['email']}")

print(f"\nTotal usuarios en BD: {User.objects.count()}")
