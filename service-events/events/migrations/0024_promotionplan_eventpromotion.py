# Generated manually for TIC-561 (PromotionPlan table)
# and TIC-562 (EventPromotion table).
# Branch: US570  —  Sprint 5 / US-34 Promoción de Eventos Destacados

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0023_rename_events_notification_indexes'),
    ]

    operations = [
        # ── TIC-561: Nueva tabla PromotionPlan ──────────────────────────────────
        migrations.CreateModel(
            name='PromotionPlan',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(
                    max_length=100,
                    help_text='Nombre visible del plan (ej. "Plan Premium").',
                )),
                ('tier', models.CharField(
                    choices=[
                        ('basico', 'Básico'),
                        ('premium', 'Premium'),
                        ('pro', 'Pro'),
                    ],
                    help_text='Nivel del plan. Determina la prioridad en listados.',
                    max_length=20,
                    unique=True,
                )),
                ('price_bob', models.DecimalField(
                    decimal_places=2,
                    help_text='Precio del plan en BOB por período.',
                    max_digits=10,
                )),
                ('duration_days', models.PositiveIntegerField(
                    help_text='Duración del plan en días (ej. 30 = un mes).',
                )),
                ('priority', models.PositiveSmallIntegerField(
                    default=3,
                    help_text='Prioridad en la ordenación de eventos destacados (1=más alto).',
                )),
                ('description', models.TextField(
                    help_text='Descripción de los beneficios del plan para el Promotor.',
                )),
                ('is_active', models.BooleanField(
                    default=True,
                    help_text='Solo los planes activos se ofrecen a los Promotores.',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Promotion Plan',
                'verbose_name_plural': 'Promotion Plans',
                'ordering': ['priority'],
            },
        ),
        # ── TIC-562: Nueva tabla EventPromotion ─────────────────────────────────
        migrations.CreateModel(
            name='EventPromotion',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('event', models.ForeignKey(
                    help_text='Evento que se promociona.',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='promotions',
                    to='events.event',
                )),
                ('plan', models.ForeignKey(
                    help_text='Plan de promoción contratado.',
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='event_promotions',
                    to='events.promotionplan',
                )),
                ('promoter_id', models.UUIDField(
                    db_index=True,
                    help_text='UUID del Promotor que contrató la promoción.',
                )),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pendiente de pago'),
                        ('active', 'Activa'),
                        ('expired', 'Expirada'),
                        ('cancelled', 'Cancelada'),
                    ],
                    db_index=True,
                    default='pending',
                    max_length=20,
                )),
                ('started_at', models.DateTimeField(
                    blank=True,
                    help_text='Fecha de inicio de la promoción.',
                    null=True,
                )),
                ('expires_at', models.DateTimeField(
                    blank=True,
                    help_text='Fecha de expiración = started_at + plan.duration_days.',
                    null=True,
                )),
                ('amount_paid', models.DecimalField(
                    decimal_places=2,
                    help_text='Monto en BOB pagado por esta promoción.',
                    max_digits=10,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Event Promotion',
                'verbose_name_plural': 'Event Promotions',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='eventpromotion',
            index=models.Index(fields=['promoter_id', 'status'], name='evpromo_promoter_status_idx'),
        ),
        migrations.AddIndex(
            model_name='eventpromotion',
            index=models.Index(fields=['event', 'status'], name='evpromo_event_status_idx'),
        ),
        migrations.AddIndex(
            model_name='eventpromotion',
            index=models.Index(fields=['expires_at'], name='evpromo_expires_idx'),
        ),
    ]
