from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.purchases.models import Purchase # Ajusta la ruta a tu app

class Command(BaseCommand):
    help = 'Expira compras y libera asientos'

    def handle(self, *args, **options):
        umbral = timezone.now() - timedelta(minutes=15)
        
        # Obtenemos las compras pendientes viejas
        purchases_to_expire = Purchase.objects.filter(
            status='pending',
            created_at__lt=umbral
        )

        count = 0
        for purchase in purchases_to_expire:
            # El método check_expiration ya se encarga de llamar a release_seats()
            if purchase.check_expiration():
                count += 1

        if count > 0:
            self.stdout.write(self.style.SUCCESS(f'Se expiraron {count} compras y se liberaron sus asientos.'))
        else:
            self.stdout.write('No hay asientos que liberar.')