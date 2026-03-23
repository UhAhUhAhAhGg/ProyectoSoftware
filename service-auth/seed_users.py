import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User, Role

print('=== Seed de Usuarios de Prueba ===')

roles = {r.name: r for r in Role.objects.all()}
if not roles:
    print('ERROR: No hay roles en la BD. Ejecuta primero las migraciones.')
    exit(1)

users_to_create = [
    {'email': 'admin@ticketproject.com',     'password': 'Admin1234!',      'role': 'Administrador'},
    {'email': 'comprador@ticketproject.com', 'password': 'Comprador1234!',  'role': 'Comprador'},
    {'email': 'promotor@ticketproject.com',  'password': 'Promotor1234!',   'role': 'Promotor'},
]

for u in users_to_create:
    if not User.objects.filter(email=u['email']).exists():
        user = User(email=u['email'], role=roles[u['role']])
        user.set_password(u['password'])
        user.save()
        print(f"  CREADO: {u['email']}  ({u['role']})")
    else:
        print(f"  OK (ya existe): {u['email']}")

print(f"\nTotal usuarios en BD: {User.objects.count()}")
