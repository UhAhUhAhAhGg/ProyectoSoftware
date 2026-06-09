import django
import os
import uuid

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from events.models import PromotionPlan

planes = [
    {'name': 'Basico', 'tier': 'basico', 'price_bob': 50.00, 'duration_days': 7, 'priority': 3, 'description': 'Badge destacado y aparece primero en su categoria.', 'is_active': True},
    {'name': 'Premium', 'tier': 'premium', 'price_bob': 120.00, 'duration_days': 15, 'priority': 2, 'description': 'Badge Premium, top 3 en busquedas y banner en home.', 'is_active': True},
    {'name': 'Pro', 'tier': 'pro', 'price_bob': 250.00, 'duration_days': 30, 'priority': 1, 'description': 'Badge Pro, posicion #1, banner destacado y notificacion a usuarios.', 'is_active': True},
]

for p in planes:
    p['id'] = uuid.uuid4()
    obj, created = PromotionPlan.objects.get_or_create(tier=p['tier'], defaults=p)
    status = 'CREADO' if created else 'YA EXISTE'
    print(status + ': ' + obj.name + ' - Bs.' + str(obj.price_bob))
