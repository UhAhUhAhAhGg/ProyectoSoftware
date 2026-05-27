# Generated manually for TIC-512 (PromoCode table)
# and TIC-513 (promo_code FK + discount_amount on Purchase).
# Branch: US35  —  Sprint 5 / US-30 Códigos de Promoción y Descuentos

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0023_rename_events_notification_indexes'),
    ]

    operations = [
        # ── TIC-512: Nueva tabla PromoCode ───────────────────────────────────────
        migrations.CreateModel(
            name='PromoCode',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('code', models.CharField(
                    db_index=True,
                    help_text='Texto del cupón (ej. VERANO25). Único en todo el sistema.',
                    max_length=50,
                    unique=True,
                )),
                ('promoter_id', models.UUIDField(
                    db_index=True,
                    help_text='UUID del Promotor que creó el código.',
                )),
                ('event', models.ForeignKey(
                    blank=True,
                    help_text='Si se especifica, el código solo aplica a este evento.',
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='promo_codes',
                    to='events.event',
                )),
                ('discount_type', models.CharField(
                    choices=[
                        ('porcentaje', 'Porcentaje de descuento'),
                        ('fijo', 'Monto fijo por compra'),
                    ],
                    default='porcentaje',
                    max_length=20,
                )),
                ('discount_value', models.DecimalField(
                    decimal_places=2,
                    help_text='Valor del descuento. Para porcentaje: 0-100. Para fijo: monto en BOB.',
                    max_digits=10,
                )),
                ('valid_from', models.DateTimeField(
                    help_text='Fecha y hora desde la que el código es válido.',
                )),
                ('valid_until', models.DateTimeField(
                    help_text='Fecha y hora hasta la que el código es válido.',
                )),
                ('max_uses', models.PositiveIntegerField(
                    blank=True,
                    help_text='Número máximo de usos. null = ilimitado.',
                    null=True,
                )),
                ('times_used', models.PositiveIntegerField(
                    default=0,
                    help_text='Contador de usos (incrementa al confirmar cada compra).',
                )),
                ('is_active', models.BooleanField(
                    db_index=True,
                    default=True,
                    help_text='Solo los códigos activos pueden ser aplicados.',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Promo Code',
                'verbose_name_plural': 'Promo Codes',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='promocode',
            index=models.Index(fields=['promoter_id', 'is_active'], name='promo_promoter_active_idx'),
        ),
        migrations.AddIndex(
            model_name='promocode',
            index=models.Index(fields=['valid_from', 'valid_until'], name='promo_validity_idx'),
        ),
        # ── TIC-513: Nuevos campos en Purchase ──────────────────────────────────
        migrations.AddField(
            model_name='purchase',
            name='promo_code',
            field=models.ForeignKey(
                blank=True,
                help_text='Código de descuento aplicado en esta compra (si corresponde).',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='purchases',
                to='events.promocode',
            ),
        ),
        migrations.AddField(
            model_name='purchase',
            name='discount_amount',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Monto descontado en BOB. total_price ya incluye este descuento aplicado.',
                max_digits=10,
                null=True,
            ),
        ),
    ]
