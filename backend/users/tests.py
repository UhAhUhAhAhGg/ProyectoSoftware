from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

class RegisterTestCase(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/register/"

    def test_register_user_success(self):
        data = {
            "email": "test@test.com",
            "password": "123456",
            "role": "buyer"
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], "Usuario creado correctamente")

    def test_register_duplicate_email(self):
        data = {
            "email": "test@test.com",
            "password": "123456",
            "role": "buyer"
        }

        self.client.post(self.url, data, format='json')
        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_invalid_email(self):
        data = {
            "email": "correo_invalido",
            "password": "123456",
            "role": "buyer"
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

from django.test import TestCase
from users.models import User

class SuperUserTestCase(TestCase):

    def test_create_superuser(self):
        user = User.objects.create_superuser(
            email="admin@test.com",
            password="admin123"
        )

        self.assertEqual(user.email, "admin@test.com")
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertEqual(user.role, "admin")
from django.contrib.auth import authenticate

class SuperUserLoginTest(TestCase):

    def test_superuser_login(self):
        User.objects.create_superuser(
            email="admin@test.com",
            password="admin123"
        )

        user = authenticate(email="admin@test.com", password="admin123")

        self.assertIsNotNone(user)
        self.assertTrue(user.is_superuser)