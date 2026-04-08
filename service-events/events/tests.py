<<<<<<< HEAD
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
import uuid

from .models import Event, TicketType, Purchase, Waitlist



class FakeUser:
    def __init__(self, user_id):
        self.id = user_id
        self.pk = user_id
        self.is_authenticated = True
        self.is_active = True
        self.is_staff = False
        self.is_superuser = False


class PurchaseTestCase(APITestCase):

    def setUp(self):
        
        self.user_id = uuid.uuid4()
        self.user = FakeUser(self.user_id)


        self.event = Event.objects.create(
            promoter_id=uuid.uuid4(),
            name="Evento Test",
            description="Descripción",
            event_date="2026-12-01",
            event_time="20:00",
            location="La Paz",
            capacity=100,
            status='published'
        )

        
        self.ticket = TicketType.objects.create(
            event=self.event,
            name="General",
            description="Entrada general",
            price=50,
            max_capacity=100,
            current_sold=0,
            status='active'
        )

        
        self.url = reverse('events:purchase')


    def test_purchase_success(self):
        self.client.force_authenticate(user=self.user)

        data = {
            "event_id": str(self.event.id),
            "ticket_type_id": str(self.ticket.id),
            "quantity": 2
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "success")

 
    def test_purchase_event_cancelled(self):
        self.client.force_authenticate(user=self.user)

        self.event.status = 'cancelled'
        self.event.save()

        data = {
            "event_id": str(self.event.id),
            "ticket_type_id": str(self.ticket.id),
            "quantity": 1
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)


    def test_event_not_published(self):
        self.client.force_authenticate(user=self.user)

        self.event.status = 'draft'
        self.event.save()

        response = self.client.post(self.url, {
            "event_id": str(self.event.id),
            "ticket_type_id": str(self.ticket.id),
            "quantity": 1
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)


    def test_cannot_purchase_cancelled_event(self):
        self.client.force_authenticate(user=self.user)

        self.event.status = 'cancelled'
        self.event.save()

        data = {
            "event_id": str(self.event.id),
            "ticket_type_id": str(self.ticket.id),
            "quantity": 1
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, 400)


    def test_purchase_no_capacity(self):
        self.client.force_authenticate(user=self.user)

        self.ticket.current_sold = 100
        self.ticket.save()

        data = {
            "event_id": str(self.event.id),
            "ticket_type_id": str(self.ticket.id),
            "quantity": 1
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)


    def test_ticket_inactive(self):
        self.client.force_authenticate(user=self.user)

        self.ticket.status = 'inactive'
        self.ticket.save()

        data = {
            "event_id": str(self.event.id),
            "ticket_type_id": str(self.ticket.id),
            "quantity": 1
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)


    def test_cannot_purchase_twice(self):
        self.client.force_authenticate(user=self.user)

        data = {
            "event_id": str(self.event.id),
            "ticket_type_id": str(self.ticket.id),
            "quantity": 1
        }

        # primera compra
        self.client.post(self.url, data, format='json')

        # segunda compra (debe fallar)
        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, 409)
        self.assertIn("error", response.data)


    def test_can_purchase_again_if_cancelled(self):
        from .models import Purchase

        self.client.force_authenticate(user=self.user)

        Purchase.objects.create(
            user_id=self.user.id,
            event=self.event,
            ticket_type=self.ticket,
            quantity=1,
            total_price=50,
            status='cancelled'
        )

        data = {
            "event_id": str(self.event.id),
            "ticket_type_id": str(self.ticket.id),
            "quantity": 1
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, 201)


    def test_waitlist_activation(self):
        self.client.force_authenticate(user=self.user)

        # 🔥 Simular casi lleno
        self.ticket.current_sold = 90
        self.ticket.save()

        response = self.client.post(self.url, {
            "event_id": str(self.event.id),
            "ticket_type_id": str(self.ticket.id),
            "quantity": 5
        }, format='json')

        self.event.refresh_from_db()

        self.assertTrue(self.event.waitlist_active)


    def test_redirect_to_waitlist(self):
        self.client.force_authenticate(user=self.user)

        self.event.waitlist_active = True
        self.event.save()

        response = self.client.post(self.url, {
            "event_id": str(self.event.id),
            "ticket_type_id": str(self.ticket.id),
            "quantity": 1
        }, format='json')

        self.assertEqual(response.data["status"], "waitlist")


    def test_waitlist_position(self):
        self.client.force_authenticate(user=self.user)

        waitlist_url = reverse('events:waitlist')

        response = self.client.post(waitlist_url, {
            "event_id": str(self.event.id)
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["position"], 1)


    def test_logout(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(reverse('events:logout'), headers={'Authorization': 'Bearer fake-token'})

        self.assertEqual(response.status_code, 200)


    def test_purchase_history(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse('events:purchase-history'))

        self.assertEqual(response.status_code, 200)


class SeatConfigurationTestCase(APITestCase):

    def setUp(self):
        self.user_id = uuid.uuid4()
        self.user = FakeUser(self.user_id)

        self.event = Event.objects.create(
            promoter_id=self.user_id,
            name="Evento Test",
            description="Descripción",
            event_date="2026-12-01",
            event_time="20:00",
            location="La Paz",
            capacity=100,
            status='published'
        )

    def test_seat_configuration_success(self):
        self.client.force_authenticate(user=self.user)

        url = reverse('events:seat-config', args=[self.event.id])

        data = {
            "zones": [
                {
                    "name": "General",
                    "price": 50,
                    "max_capacity": 50,
                    "zone_type": "general"
                },
                {
                    "name": "VIP",
                    "price": 100,
                    "max_capacity": 30,
                    "zone_type": "vip"
                }
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, 201)

    def test_duplicate_zones(self):
        self.client.force_authenticate(user=self.user)

        url = reverse('events:seat-config', args=[self.event.id])

        data = {
            "zones": [
                {"name": "VIP", "price": 100, "max_capacity": 10, "zone_type": "vip"},
                {"name": "VIP", "price": 120, "max_capacity": 10, "zone_type": "vip"}
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, 422)

    def test_capacity_exceeded(self):
        self.client.force_authenticate(user=self.user)

        url = reverse('events:seat-config', args=[self.event.id])

        data = {
            "zones": [
                {"name": "General", "price": 50, "max_capacity": 200, "zone_type": "general"}
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, 422)

    def test_vip_price_invalid(self):
        self.client.force_authenticate(user=self.user)

        url = reverse('events:seat-config', args=[self.event.id])

        data = {
            "zones": [
                {"name": "General", "price": 100, "max_capacity": 50, "zone_type": "general"},
                {"name": "VIP", "price": 80, "max_capacity": 20, "zone_type": "vip"}
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, 422)


class ValidateTicketTestCase(APITestCase):
    """
    Test cases para validar entradas en la puerta del evento.
    """

    def setUp(self):
        self.user_id = uuid.uuid4()
        self.user = FakeUser(self.user_id)

        self.event = Event.objects.create(
            promoter_id=uuid.uuid4(),
            name="Evento Test",
            description="Descripción",
            event_date="2026-12-01",
            event_time="20:00",
            location="La Paz",
            capacity=100,
            status='published'
        )

        self.ticket = TicketType.objects.create(
            event=self.event,
            name="General",
            description="Entrada general",
            price=50,
            max_capacity=100,
            current_sold=0,
            status='active'
        )

        self.validate_url = reverse('events:validate-ticket')

    def test_validate_ticket_success(self):
        """Validar una entrada existente con código de respaldo"""
        # Crear una compra
        purchase = Purchase.objects.create(
            user_id=self.user.id,
            event=self.event,
            ticket_type=self.ticket,
            quantity=1,
            total_price=50,
            backup_code="A1B2C3D4E5",
            status='active'
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.validate_url, {
            "codigo": "A1B2C3D4E5"
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "success")

        # Verificar que la entrada ahora está marcada como usada
        purchase.refresh_from_db()
        self.assertEqual(purchase.status, 'used')
        self.assertIsNotNone(purchase.used_at)
        self.assertEqual(purchase.validated_by, self.user.id)

    def test_validate_ticket_not_found(self):
        """Intentar validar un código que no existe"""
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.validate_url, {
            "codigo": "CODIGO_INEXISTENTE"
        }, format='json')

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["status"], "error")
        self.assertIn("no encontrada", response.data["message"])

    def test_validate_ticket_already_used(self):
        """Intentar validar una entrada que ya fue usada"""
        from django.utils import timezone
        
        # Crear una compra y marcarla como usada
        purchase = Purchase.objects.create(
            user_id=self.user.id,
            event=self.event,
            ticket_type=self.ticket,
            quantity=1,
            total_price=50,
            backup_code="A1B2C3D4E5",
            status='used',
            used_at=timezone.now(),
            validated_by=uuid.uuid4()
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.validate_url, {
            "codigo": "A1B2C3D4E5"
        }, format='json')

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["status"], "error")
        self.assertIn("ya fue utilizada", response.data["message"])

    def test_validate_ticket_cancelled(self):
        """Intentar validar una entrada cancelada"""
        purchase = Purchase.objects.create(
            user_id=self.user.id,
            event=self.event,
            ticket_type=self.ticket,
            quantity=1,
            total_price=50,
            backup_code="A1B2C3D4E5",
            status='cancelled'
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.validate_url, {
            "codigo": "A1B2C3D4E5"
        }, format='json')

        self.assertEqual(response.status_code, 410)
        self.assertEqual(response.data["status"], "error")
        self.assertIn("cancelada", response.data["message"])

    def test_validate_ticket_missing_codigo(self):
        """Intentar validar sin proporcionar código"""
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.validate_url, {}, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["status"], "error")

    def test_validate_ticket_requires_auth(self):
        """La validación requiere autenticación"""
        response = self.client.post(self.validate_url, {
            "codigo": "A1B2C3D4E5"
        }, format='json')

        self.assertEqual(response.status_code, 401)

    def test_validate_ticket_with_qr_code_still_works(self):
        """Validar entrada usando backup_code (que es lo que validamos)"""
        purchase = Purchase.objects.create(
            user_id=self.user.id,
            event=self.event,
            ticket_type=self.ticket,
            quantity=1,
            total_price=50,
            backup_code="QR123456789",
            qr_code="base64_encoded_qr_data",
            status='active'
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.validate_url, {
            "codigo": "QR123456789"
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "success")

        purchase.refresh_from_db()
        self.assertEqual(purchase.status, 'used')
=======
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
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
