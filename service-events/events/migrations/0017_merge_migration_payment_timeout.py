# Generated manually to resolve migration conflict:
# - 0015_event_payment_timeout_minutes (Ariana, US14 - agrega payment_timeout_minutes)
# - 0016_event_queue_timeout (rama principal - agrega queue_timeout)
# Ambas derivan de 0014_add_seat_model y crean dos hojas en el grafo.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0015_event_payment_timeout_minutes'),
        ('events', '0016_event_queue_timeout'),
    ]

    operations = [
    ]
