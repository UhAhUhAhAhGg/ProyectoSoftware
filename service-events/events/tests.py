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


class FakeAuth:
    """Mock auth object to simulate JWT payload with role."""
    def __init__(self, role='Comprador'):
        self.payload = {'role': role}


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


# =============================================
# PA Tests - TIC-9: Cancelar Evento
# =============================================

class EventCancellationPATestCase(APITestCase):
    """
    Pruebas de aceptación para TIC-9 (Cancelar Evento).
    TIC-228: Evento cancelado muestra estado 'cancelled'
    TIC-229: Metadata de cancelación se almacena correctamente
    TIC-230: No se puede comprar en un evento cancelado
    """

    def setUp(self):
        self.promoter_id = uuid.uuid4()
        self.promoter = FakeUser(self.promoter_id)
        self.buyer_id = uuid.uuid4()
        self.buyer = FakeUser(self.buyer_id)

        self.event = Event.objects.create(
            promoter_id=self.promoter_id,
            name="Concierto PA Test",
            description="Evento para pruebas de aceptación",
            event_date="2026-12-15",
            event_time="21:00",
            location="Cochabamba",
            capacity=200,
            status='published'
        )

        self.ticket = TicketType.objects.create(
            event=self.event,
            name="General",
            description="Entrada general",
            price=80,
            max_capacity=200,
            current_sold=0,
            status='active'
        )

    def test_tic228_cancelled_event_shows_status(self):
        """TIC-228: Al cancelar un evento, su estado debe mostrarse como 'cancelled'."""
        self.client.force_authenticate(user=self.promoter, token=FakeAuth('Promotor'))

        cancel_url = reverse('events:event-cancel', args=[self.event.id])
        response = self.client.post(cancel_url, {
            "cancellation_reason": "Fuerza mayor"
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "success")

        # Verificar que el evento aparece como cancelled al consultarlo
        self.event.refresh_from_db()
        self.assertEqual(self.event.status, 'cancelled')

        # Verificar vía API GET
        detail_url = reverse('events:event-detail', args=[self.event.id])
        get_response = self.client.get(detail_url)
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.data['status'], 'cancelled')

    def test_tic229_cancellation_metadata_stored(self):
        """TIC-229: La cancelación debe almacenar fecha, responsable y motivo."""
        self.client.force_authenticate(user=self.promoter, token=FakeAuth('Promotor'))

        cancel_url = reverse('events:event-cancel', args=[self.event.id])
        response = self.client.post(cancel_url, {
            "cancellation_reason": "Clima adverso"
        }, format='json')

        self.assertEqual(response.status_code, 200)

        # Verificar metadata en la respuesta
        self.assertIn("cancelled_at", response.data)
        self.assertIn("cancelled_by", response.data)
        self.assertIn("cancellation_reason", response.data)
        self.assertEqual(response.data["cancellation_reason"], "Clima adverso")
        self.assertEqual(response.data["cancelled_by"], str(self.promoter_id))

        # Verificar metadata en la BD
        self.event.refresh_from_db()
        self.assertIsNotNone(self.event.cancelled_at)
        self.assertEqual(self.event.cancelled_by, self.promoter_id)
        self.assertEqual(self.event.cancellation_reason, "Clima adverso")

    def test_tic230_cannot_purchase_cancelled_event(self):
        """TIC-230: No se puede comprar entradas para un evento cancelado."""
        # Primero cancelar el evento
        self.client.force_authenticate(user=self.promoter, token=FakeAuth('Promotor'))
        cancel_url = reverse('events:event-cancel', args=[self.event.id])
        self.client.post(cancel_url, {
            "cancellation_reason": "Cancelado para test"
        }, format='json')

        # Intentar comprar como comprador
        self.client.force_authenticate(user=self.buyer)
        purchase_url = reverse('events:purchase')
        response = self.client.post(purchase_url, {
            "event_id": str(self.event.id),
            "ticket_type_id": str(self.ticket.id),
            "quantity": 1
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.event.refresh_from_db()
        self.assertEqual(self.event.status, 'cancelled')


# =============================================
# PA Tests - TIC-10: Configuración de Asientos
# =============================================

class SeatConfigurationPATestCase(APITestCase):
    """
    Pruebas de aceptación para TIC-10 (Configuración de Asientos).
    TIC-225: Asientos vinculados correctamente a zona
    TIC-226: Distribución de zonas visible en GET del evento
    TIC-227: Configuración inválida rechazada
    """

    def setUp(self):
        self.promoter_id = uuid.uuid4()
        self.promoter = FakeUser(self.promoter_id)

        self.event = Event.objects.create(
            promoter_id=self.promoter_id,
            name="Festival PA Test",
            description="Evento para PA de configuración",
            event_date="2026-12-20",
            event_time="19:00",
            location="Santa Cruz",
            capacity=500,
            status='published'
        )

    def test_tic225_seats_linked_to_zone(self):
        """TIC-225: Asientos quedan vinculados a la zona con tipo, capacidad y precio correctos."""
        self.client.force_authenticate(user=self.promoter)

        url = reverse('events:seat-config', args=[self.event.id])
        data = {
            "zones": [
                {
                    "name": "General",
                    "price": 50,
                    "max_capacity": 300,
                    "zone_type": "general"
                },
                {
                    "name": "VIP",
                    "price": 150,
                    "max_capacity": 100,
                    "zone_type": "vip"
                },
                {
                    "name": "Platea",
                    "price": 80,
                    "max_capacity": 100,
                    "zone_type": "platea"
                }
            ]
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 201)

        # Verificar que se crearon los TicketTypes con los datos correctos
        ticket_types = TicketType.objects.filter(event=self.event).order_by('name')
        self.assertEqual(ticket_types.count(), 3)

        general = ticket_types.get(name="General")
        self.assertEqual(general.zone_type, "general")
        self.assertEqual(general.max_capacity, 300)
        self.assertEqual(general.price, 50)

        vip = ticket_types.get(name="VIP")
        self.assertEqual(vip.zone_type, "vip")
        self.assertEqual(vip.max_capacity, 100)
        self.assertEqual(vip.price, 150)

        platea = ticket_types.get(name="Platea")
        self.assertEqual(platea.zone_type, "platea")
        self.assertEqual(platea.max_capacity, 100)
        self.assertEqual(platea.price, 80)

    def test_tic226_venue_shows_zone_distribution(self):
        """TIC-226: Al consultar el evento, se muestra la distribución de zonas configuradas."""
        self.client.force_authenticate(user=self.promoter)

        # Configurar zonas
        config_url = reverse('events:seat-config', args=[self.event.id])
        self.client.post(config_url, {
            "zones": [
                {"name": "General", "price": 50, "max_capacity": 300, "zone_type": "general"},
                {"name": "VIP", "price": 150, "max_capacity": 100, "zone_type": "vip"}
            ]
        }, format='json')

        # Consultar el evento
        detail_url = reverse('events:event-detail', args=[self.event.id])
        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, 200)
        self.assertIn('tickets', response.data)

        tickets_data = response.data['tickets']
        self.assertEqual(len(tickets_data), 2)

        zone_names = [t['name'] for t in tickets_data]
        self.assertIn('General', zone_names)
        self.assertIn('VIP', zone_names)

        for t in tickets_data:
            self.assertIn('zone_type', t)
            self.assertIn('max_capacity', t)
            self.assertIn('price', t)
            self.assertIn('available_capacity', t)

    def test_tic227_invalid_config_rejected(self):
        """TIC-227: Configuración inválida (sin zone_type, nombres duplicados) es rechazada con 422."""
        self.client.force_authenticate(user=self.promoter)

        url = reverse('events:seat-config', args=[self.event.id])

        # Caso 1: Nombres duplicados
        response_dup = self.client.post(url, {
            "zones": [
                {"name": "VIP", "price": 100, "max_capacity": 50, "zone_type": "vip"},
                {"name": "VIP", "price": 120, "max_capacity": 50, "zone_type": "vip"}
            ]
        }, format='json')
        self.assertEqual(response_dup.status_code, 422)

        # Caso 2: Capacidad excede el evento
        response_cap = self.client.post(url, {
            "zones": [
                {"name": "General", "price": 50, "max_capacity": 600, "zone_type": "general"}
            ]
        }, format='json')
        self.assertEqual(response_cap.status_code, 422)

        # Caso 3: VIP con precio menor que general
        response_price = self.client.post(url, {
            "zones": [
                {"name": "General", "price": 100, "max_capacity": 200, "zone_type": "general"},
                {"name": "VIP", "price": 50, "max_capacity": 100, "zone_type": "vip"}
            ]
        }, format='json')
        self.assertEqual(response_price.status_code, 422)

        # Verificar que no se crearon TicketTypes (todo fue rechazado)
        self.assertEqual(TicketType.objects.filter(event=self.event).count(), 0)


class PurchaseHistoryPATestCase(APITestCase):
    """PA Tests for TIC-32: Historial de compras."""

    def setUp(self):
        self.user_id = uuid.uuid4()
        self.other_user_id = uuid.uuid4()
        self.user = FakeUser(self.user_id)
        self.other_user = FakeUser(self.other_user_id)

        from .models import Category
        cat = Category.objects.create(name='Concierto')
        self.event1 = Event.objects.create(
            name='Evento Reciente', description='Test', event_date='2026-06-15',
            event_time='20:00:00', location='Estadio', capacity=500,
            promoter_id=uuid.uuid4(), status='published', category=cat
        )
        self.event2 = Event.objects.create(
            name='Evento Antiguo', description='Test2', event_date='2026-05-10',
            event_time='18:00:00', location='Teatro', capacity=300,
            promoter_id=uuid.uuid4(), status='published', category=cat
        )
        self.ticket1 = TicketType.objects.create(
            event=self.event1, name='General', price=100, max_capacity=200,
            zone_type='general', status='active'
        )
        self.ticket2 = TicketType.objects.create(
            event=self.event2, name='VIP', price=500, max_capacity=50,
            zone_type='vip', is_vip=True, status='active'
        )
        # Compra del usuario principal (la mas reciente)
        self.purchase1 = Purchase.objects.create(
            user_id=self.user_id, event=self.event1, ticket_type=self.ticket1,
            quantity=1, total_price=100, backup_code='ABC123TEST',
            status='active'
        )
        # Compra antigua del mismo usuario
        self.purchase2 = Purchase.objects.create(
            user_id=self.user_id, event=self.event2, ticket_type=self.ticket2,
            quantity=1, total_price=500, backup_code='DEF456TEST',
            status='used'
        )
        # Compra de OTRO usuario (no debe verse)
        self.purchase_other = Purchase.objects.create(
            user_id=self.other_user_id, event=self.event1, ticket_type=self.ticket1,
            quantity=2, total_price=200, backup_code='OTHER789X',
            status='active'
        )

    def test_tic285_user_only_sees_own_purchases(self):
        """TIC-285: El usuario solo puede ver su propio historial."""
        self.client.force_authenticate(user=self.user, token=FakeAuth('Comprador'))
        res = self.client.get('/api/v1/purchases/history/')
        self.assertEqual(res.status_code, 200)
        results = res.data['results']
        purchase_ids = [p['id'] for p in results]
        self.assertIn(str(self.purchase1.id), purchase_ids)
        self.assertIn(str(self.purchase2.id), purchase_ids)
        self.assertNotIn(str(self.purchase_other.id), purchase_ids)

    def test_tic285_cannot_access_other_user_purchase_detail(self):
        """TIC-285: No puede ver detalle de compra ajena."""
        self.client.force_authenticate(user=self.user, token=FakeAuth('Comprador'))
        res = self.client.get(f'/api/v1/purchases/{self.purchase_other.id}/')
        self.assertEqual(res.status_code, 403)

    def test_tic286_purchase_shows_event_name_date_amount(self):
        """TIC-286: Cada registro muestra nombre del evento, fecha y monto."""
        self.client.force_authenticate(user=self.user, token=FakeAuth('Comprador'))
        res = self.client.get('/api/v1/purchases/history/')
        self.assertEqual(res.status_code, 200)
        results = res.data['results']
        self.assertTrue(len(results) >= 2)
        for p in results:
            self.assertIn('event_name', p)
            self.assertIn('event_date', p)
            self.assertIn('total_price', p)
            self.assertIn('ticket_type', p)
            self.assertIn('status', p)
            self.assertIn('backup_code', p)
            self.assertTrue(len(p['event_name']) > 0)

    def test_tic287_purchase_detail_shows_full_info(self):
        """TIC-287: Al seleccionar una compra, muestra detalles y codigo de acceso."""
        self.client.force_authenticate(user=self.user, token=FakeAuth('Comprador'))
        res = self.client.get(f'/api/v1/purchases/{self.purchase1.id}/')
        self.assertEqual(res.status_code, 200)
        data = res.data
        self.assertEqual(data['event_name'], 'Evento Reciente')
        self.assertEqual(data['backup_code'], 'ABC123TEST')
        self.assertIn('event_location', data)
        self.assertIn('zone_type', data)
        self.assertIn('quantity', data)

    def test_tic288_purchases_ordered_chronologically(self):
        """TIC-288: Las compras estan ordenadas con la mas reciente primero."""
        self.client.force_authenticate(user=self.user, token=FakeAuth('Comprador'))
        res = self.client.get('/api/v1/purchases/history/')
        self.assertEqual(res.status_code, 200)
        results = res.data['results']
        self.assertTrue(len(results) >= 2)
        dates = [p['created_at'] for p in results]
        self.assertEqual(dates, sorted(dates, reverse=True))

    def test_pagination_works(self):
        """Verifica que la paginacion funciona correctamente."""
        self.client.force_authenticate(user=self.user, token=FakeAuth('Comprador'))
        res = self.client.get('/api/v1/purchases/history/?page=1&page_size=1')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['results']), 1)
        self.assertEqual(res.data['count'], 2)
        self.assertEqual(res.data['total_pages'], 2)

    def test_filter_by_status(self):
        """Verifica que el filtro por status funciona."""
        self.client.force_authenticate(user=self.user, token=FakeAuth('Comprador'))
        res = self.client.get('/api/v1/purchases/history/?status=used')
        self.assertEqual(res.status_code, 200)
        results = res.data['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['status'], 'used')
