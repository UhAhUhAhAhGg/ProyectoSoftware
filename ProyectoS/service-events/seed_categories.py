import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'events_config.settings')
django.setup()

from events.models import Category

print('=== Seed de Categorías de Eventos ===')

categorias_to_create = [
    {'name': 'Música', 'description': 'Música y Conciertos'},
    {'name': 'Teatro', 'description': 'Teatro y Artes Escénicas'},
    {'name': 'Deportes', 'description': 'Deportes y Actividades Físicas'},
    {'name': 'Conferencias', 'description': 'Conferencias y Seminarios'},
    {'name': 'Festivales', 'description': 'Festivales de diversos temas'},
    {'name': 'Familia', 'description': 'Eventos para la Familia y Niños'},
    {'name': 'Arte', 'description': 'Arte y Exposiciones'},
    {'name': 'Otros', 'description': 'Otros tipos de eventos'},
]

for c in categorias_to_create:
    categoria, created = Category.objects.get_or_create(
        name=c['name'],
        defaults={'description': c['description'], 'is_active': True}
    )
    if created:
        print(f"  CREADO: {categoria.name}")
    else:
        # Actualizamos la descripción si es necesario
        if categoria.description != c['description']:
            categoria.description = c['description']
            categoria.save()
            print(f"  ACTUALIZADO: {categoria.name}")
        else:
            print(f"  OK (ya existe): {categoria.name}")

print(f"\nTotal categorías en BD: {Category.objects.count()}")
