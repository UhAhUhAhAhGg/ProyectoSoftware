from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.purchases.models import Purchase # Ajusta la ruta a tu app

class Command(BaseCommand):
    help = 'Expira compras pendientes que superaron los 15 minutos de gracia'

    def handle(self, *args, **options):
        # 1. Definir el umbral (hace 15 minutos)
        umbral = timezone.now() - timedelta(minutes=15)

        # 2. Buscar compras que sigan 'pending' y sean más viejas que el umbral
        expired_count = Purchase.objects.filter(
            status='pending',
            created_at__lt=umbral
        ).update(status='expired')

        if expired_count > 0:
            self.stdout.write(
                self.style.SUCCESS(f'Se han liberado {expired_count} órdenes de compra expiradas.')
            )
        else:
            self.stdout.write('No hay órdenes expiradas por limpiar.')