from django.db import migrations


def crear_roles(apps, schema_editor):
    """Inserta los 3 roles base del sistema."""
    Role = apps.get_model('users', 'Role')
    roles = ['Administrador', 'Promotor', 'Comprador']
    for nombre in roles:
        Role.objects.get_or_create(name=nombre)


def eliminar_roles(apps, schema_editor):
    """Revierte la creación de roles (para rollback)."""
    Role = apps.get_model('users', 'Role')
    Role.objects.filter(name__in=['Administrador', 'Promotor', 'Comprador']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(crear_roles, eliminar_roles),
    ]
