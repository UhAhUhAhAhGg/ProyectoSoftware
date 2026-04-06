from decimal import Decimal

from django.test import TestCase

from .models import Category, Event, TicketType
from .serializers import TicketTypeCreateSerializer


class TicketTypeZoneSerializerTests(TestCase):
	def setUp(self):
		self.category = Category.objects.create(
			name='Conciertos',
			description='Eventos musicales',
		)
		self.event = Event.objects.create(
			promoter_id='11111111-1111-1111-1111-111111111111',
			name='Evento con zonas',
			description='Evento con asientos configurables',
			event_date='2026-12-10',
			event_time='20:00:00',
			location='Estadio Central',
			capacity=500,
			status='draft',
			category=self.category,
		)

	def test_rejects_inconsistent_seat_distribution(self):
		serializer = TicketTypeCreateSerializer(data={
			'event': self.event.id,
			'name': 'VIP Norte',
			'description': 'Zona premium',
			'price': Decimal('250.00'),
			'max_capacity': 40,
			'zone_type': 'vip',
			'is_vip': True,
			'seat_rows': 4,
			'seats_per_row': 12,
			'status': 'active',
		})

		self.assertFalse(serializer.is_valid())
		self.assertIn('La capacidad de la zona debe coincidir exactamente', str(serializer.errors))

	def test_accepts_valid_zone_configuration(self):
		serializer = TicketTypeCreateSerializer(data={
			'event': self.event.id,
			'name': 'Platea A',
			'description': 'Zona central',
			'price': Decimal('120.00'),
			'max_capacity': 30,
			'zone_type': 'platea',
			'is_vip': False,
			'seat_rows': 3,
			'seats_per_row': 10,
			'status': 'active',
		})

		self.assertTrue(serializer.is_valid(), serializer.errors)
		ticket = serializer.save()
		self.assertEqual(ticket.configured_seats, 30)
		self.assertFalse(ticket.is_vip)

	def test_rejects_capacity_below_sales_on_update(self):
		ticket = TicketType.objects.create(
			event=self.event,
			name='VIP Sur',
			description='Zona ya vendida',
			price=Decimal('300.00'),
			max_capacity=20,
			zone_type='vip',
			is_vip=True,
			seat_rows=2,
			seats_per_row=10,
			current_sold=8,
			status='active',
		)

		serializer = TicketTypeCreateSerializer(instance=ticket, data={
			'max_capacity': 6,
			'seat_rows': 2,
			'seats_per_row': 3,
		}, partial=True)

		self.assertFalse(serializer.is_valid())
		self.assertIn('No puedes reducir la capacidad por debajo de las ventas realizadas', str(serializer.errors))
