# Generated migration for cancellation tracking fields (TIC-9)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0010_alter_tickettype_event'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='cancelled_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='cancelled_by',
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='cancellation_reason',
            field=models.TextField(blank=True, null=True),
        ),
    ]
