from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0002_event_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='tickettype',
            name='is_vip',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='tickettype',
            name='seat_rows',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='tickettype',
            name='seats_per_row',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='tickettype',
            name='zone_type',
            field=models.CharField(
                choices=[
                    ('general', 'General'),
                    ('platea', 'Platea'),
                    ('preferencial', 'Preferencial'),
                    ('vip', 'VIP'),
                    ('palco', 'Palco'),
                ],
                default='general',
                max_length=30,
            ),
        ),
    ]