"""
TIC-334, TIC-335, TIC-338: Scheduled job en service-events que expira compras
vencidas y libera sus asientos automáticamente.

Uso:
    python manage.py cleanup_purchases
    python manage.py cleanup_purchases --timeout 10   # timeout personalizado en minutos
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from events.models import Purchase  # Import corregido


class Command(BaseCommand):
    help = 'Expira compras pendientes vencidas y libera sus asientos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--timeout',
            type=int,
            default=15,
            help='Minutos de timeout para considerar una compra expirada (default: 15)',
        )

    def handle(self, *args, **options):
        timeout_minutes = options['timeout']
        umbral = timezone.now() - timedelta(minutes=timeout_minutes)

        purchases_to_expire = Purchase.objects.filter(
            status='pending',
            created_at__lt=umbral
        )

        total = purchases_to_expire.count()
        if total == 0:
            self.stdout.write('No hay compras vencidas que procesar.')
            return

        count = 0
        for purchase in purchases_to_expire:
            # check_expiration() marca como 'expired', libera asientos y envía email
            if purchase.check_expiration():
                count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ Compra {purchase.id} expirada — asientos liberados')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n[cleanup_purchases] {count}/{total} compra(s) expirada(s) y asientos liberados.'
            )
        )