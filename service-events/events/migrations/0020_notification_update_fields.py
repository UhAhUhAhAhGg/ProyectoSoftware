# Generated migration for Notification model update

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0019_userfavorite'),
    ]

    operations = [
        # First, remove the old Notification model
        migrations.DeleteModel(
            name='Notification',
        ),
        # Then, create the new Notification model with updated fields
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('user_id', models.UUIDField(db_index=True)),
                ('tipo', models.CharField(
                    choices=[
                        ('new_event_match', 'Nuevo evento compatible'),
                        ('waitlist_turn', 'Turno en lista de espera'),
                        ('purchase_confirmed', 'Compra confirmada')
                    ],
                    max_length=30
                )),
                ('titulo', models.CharField(max_length=200)),
                ('mensaje', models.TextField()),
                ('leida', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('leida_at', models.DateTimeField(blank=True, null=True)),
                ('event', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.CASCADE, related_name='notifications', to='events.event')),
            ],
            options={
                'verbose_name': 'Notification',
                'verbose_name_plural': 'Notifications',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['user_id'], name='events_notification_user_id_idx'),
                    models.Index(fields=['user_id', 'leida'], name='events_notification_user_leida_idx'),
                ],
            },
        ),
    ]
