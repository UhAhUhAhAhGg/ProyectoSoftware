# Generated migration for TIC-569: Agregar commission_percentage a Purchase
# para guardar históricamente qué porcentaje se aplicó en cada compra

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0024_platformcommission_purchase_commission_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='purchase',
            name='commission_percentage',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Porcentaje de comisión aplicado en el momento de la compra (para histórico).',
                max_digits=5,
                null=True,
            ),
        ),
    ]
