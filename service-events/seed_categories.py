import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'events_config.settings')
django.setup()

from events.models import Category

print('=== Seed de Categorías de Eventos ===')

CATEGORIAS_BASE = [
    {"name": "Música",      "description": "Conciertos, festivales y eventos musicales de todo género."},
    {"name": "Deportes",    "description": "Partidos, torneos y competencias deportivas."},
    {"name": "Teatro",      "description": "Obras de teatro, musicales y artes escénicas."},
    {"name": "Cine",        "description": "Proyecciones, festivales de cine y premieres."},
    {"name": "Arte",        "description": "Exposiciones, galerías y muestras artísticas."},
    {"name": "Tecnología",  "description": "Conferencias, hackathons y eventos tech."},
    {"name": "Gastronomía", "description": "Ferias de comida, catas y eventos culinarios."},
    {"name": "Familia",     "description": "Eventos para niños y toda la familia."},
    {"name": "Educación",   "description": "Talleres, seminarios y cursos presenciales."},
    {"name": "Negocios",    "description": "Networking, conferencias empresariales y expos."},
]

creadas = 0
existentes = 0

for cat in CATEGORIAS_BASE:
    obj, created = Category.objects.get_or_create(
        name=cat["name"],
        defaults={
            "description": cat["description"],
            "is_active": True,
        }
    )
    if created:
        creadas += 1
        print(f"  ✅ Creada: {cat['name']}")
    else:
        existentes += 1
        print(f"  ⚠️  Ya existe: {cat['name']}")

print(f"\nResumen: {creadas} creadas, {existentes} ya existían.")
print(f"Total categorías en BD: {Category.objects.count()}")
