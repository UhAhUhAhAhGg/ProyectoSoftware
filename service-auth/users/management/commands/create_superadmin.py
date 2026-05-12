"""
Management command: create_superadmin

Crea el primer usuario Administrador del sistema (superadmin).
Solo debe correrse una vez, al inicio del proyecto.

Uso:
    python manage.py create_superadmin --email admin@empresa.com --password MiClave123

Si no se pasan argumentos, se pedirán de forma interactiva.
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from users.models import Role

User = get_user_model()


class Command(BaseCommand):
    help = 'Crea el primer usuario Administrador (superadmin) del sistema.'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Correo del superadmin')
        parser.add_argument('--password', type=str, help='Contraseña del superadmin')

    def handle(self, *args, **options):
        email = options.get('email')
        password = options.get('password')

        # Si no se pasaron, pedirlos interactivamente
        if not email:
            email = input('Correo del superadmin: ').strip()
        if not password:
            import getpass
            password = getpass.getpass('Contraseña: ')

        # Validaciones básicas
        if not email or '@' not in email:
            raise CommandError('El correo ingresado no es válido.')
        if not password or len(password) < 6:
            raise CommandError('La contraseña debe tener al menos 6 caracterres.')

        # Verificar que el rol Administrador existe (lo crea la data migration)
        try:
            rol_admin = Role.objects.get(name='Administrador')
        except Role.DoesNotExist:
            raise CommandError(
                'El rol "Administrador" no existe en la base de datos. '
                'Ejecuta primero: python manage.py migrate'
            )

        # Verificar si ya existe un admin con ese correo
        if User.objects.filter(email=email).exists():
            raise CommandError(f'Ya existe un usuario con el correo "{email}".')

        # Crear el superadmin
        user = User.objects.create_user(
            email=email,
            password=password,
            role=rol_admin,
            is_active=True,
            is_staff=True,
        )

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Superadmin creado exitosamente.'
            f'\n   Email: {user.email}'
            f'\n   Rol:   {user.role.name}'
            f'\n\nYa puedes iniciar sesión en: http://localhost:3000/login\n'
        ))
