# Generated manually for TIC-526 (PlatformCommission table)
# and TIC-569 (commission_amount + net_amount on Purchase).
# Branch: US567  —  Sprint 5 / US-31 Configuración de Comisiones

from django.db import migrations, models
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0023_rename_events_notification_indexes'),
    ]

    operations = [
        # ── TIC-569: Nuevos campos en Purchase ──────────────────────────────────
        migrations.AddField(
            model_name='purchase',
            name='commission_amount',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Comisión de la plataforma sobre esta compra (en BOB).',
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='purchase',
            name='net_amount',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Monto neto para el promotor = total_price - commission_amount (en BOB).',
                max_digits=10,
                null=True,
            ),
        ),
        # ── TIC-526: Nueva tabla PlatformCommission ──────────────────────────────
        migrations.CreateModel(
            name='PlatformCommission',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('commission_type', models.CharField(
                    choices=[
                        ('porcentaje', 'Porcentaje sobre precio final'),
                        ('fijo', 'Monto fijo por compra'),
                        ('hibrido', 'Porcentaje + monto fijo'),
                    ],
                    default='porcentaje',
                    max_length=20,
                )),
                ('percentage_value', models.DecimalField(
                    blank=True,
                    decimal_places=2,
                    help_text='Porcentaje de comisión (e.g. 10.00 = 10 %). Obligatorio si type es porcentaje o hibrido.',
                    max_digits=5,
                    null=True,
                )),
                ('fixed_value', models.DecimalField(
                    blank=True,
                    decimal_places=2,
                    help_text='Monto fijo en BOB por compra. Obligatorio si type es fijo o hibrido.',
                    max_digits=8,
                    null=True,
                )),
                ('is_active', models.BooleanField(
                    db_index=True,
                    default=True,
                    help_text='Solo el registro activo más reciente determina la comisión vigente.',
                )),
                ('valid_from', models.DateTimeField(
                    default=django.utils.timezone.now,
                    help_text='Fecha y hora desde la que esta comisión aplica.',
                )),
                ('created_by', models.UUIDField(
                    help_text='UUID del SuperAdmin que definió esta comisión.',
                )),
                ('notes', models.TextField(
                    blank=True,
                    help_text='Notas internas sobre el motivo del cambio de comisión.',
                    null=True,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Platform Commission',
                'verbose_name_plural': 'Platform Commissions',
                'ordering': ['-valid_from'],
            },
        ),
        migrations.AddIndex(
            model_name='platformcommission',
            index=models.Index(fields=['is_active'], name='pcomm_active_idx'),
        ),
        migrations.AddIndex(
            model_name='platformcommission',
            index=models.Index(fields=['valid_from'], name='pcomm_valid_from_idx'),
        ),
    ]
