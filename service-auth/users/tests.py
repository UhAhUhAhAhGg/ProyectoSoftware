from rest_framework.test import APITestCase
from users.models import User, Role


class AuthTests(APITestCase):

    def setUp(self):
        # Crear rol
        self.role = Role.objects.create(name="buyer")

        # Crear usuario
        self.user = User.objects.create_user(
            email="test@test.com",
            password="123456",
            role=self.role
        )

    def test_login_and_access_me(self):
        response = self.client.post("/api/v1/users/login/", {
            "email": "test@test.com",
            "password": "123456"
        })

        self.assertEqual(response.status_code, 200)

        token = response.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        response = self.client.get("/api/v1/users/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['email'], "test@test.com")
        self.assertEqual(response.data['role'], "buyer")

    def test_register_user(self):
        response = self.client.post("/api/v1/users/register/", {
            "email": "nuevo@test.com",
            "password": "123456",
            "role": self.role.id
        })

        self.assertEqual(response.status_code, 201)

    def test_login_fail(self):
        response = self.client.post("/api/v1/users/login/", {
            "email": "test@test.com",
            "password": "wrong"
        })

        self.assertEqual(response.status_code, 401)

    def test_me_without_token(self):
        response = self.client.get("/api/v1/users/me/")
        self.assertEqual(response.status_code, 401)

    def test_roles_exist(self):
        roles = Role.objects.all()
        self.assertTrue(roles.count() > 0)
