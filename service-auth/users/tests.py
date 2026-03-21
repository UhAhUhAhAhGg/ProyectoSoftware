from rest_framework.test import APITestCase
from users.models import User, Role


class AuthTests(APITestCase):

    def setUp(self):
        # Crear roles necesarios para los tests
        self.role_buyer = Role.objects.create(name="Comprador")
        self.role_promoter = Role.objects.create(name="Promotor")

        # Crear usuario de prueba
        self.user = User.objects.create_user(
            email="test@test.com",
            password="123456",
            role=self.role_buyer
        )

    def test_register_user(self):
        """Registro exitoso devuelve 201"""
        response = self.client.post("/api/v1/users/register/", {
            "email": "nuevo@test.com",
            "password": "123456",
            "role": "Comprador"
        })
        self.assertEqual(response.status_code, 201)

    def test_register_duplicate_email(self):
        """Email duplicado devuelve 409"""
        response = self.client.post("/api/v1/users/register/", {
            "email": "test@test.com",
            "password": "nuevapass",
            "role": "Comprador"
        })
        self.assertEqual(response.status_code, 409)

    def test_login_exitoso(self):
        """Login correcto devuelve 200 con access y refresh tokens"""
        response = self.client.post("/api/v1/users/login/", {
            "email": "test@test.com",
            "password": "123456"
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['role'], "Comprador")

    def test_login_y_acceso_me(self):
        """Login + acceder a /me/ con el token devuelve datos del usuario"""
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
        self.assertEqual(response.data['role'], "Comprador")

    def test_login_credenciales_incorrectas(self):
        """Contraseña incorrecta devuelve 401"""
        response = self.client.post("/api/v1/users/login/", {
            "email": "test@test.com",
            "password": "incorrect"
        })
        self.assertEqual(response.status_code, 401)

    def test_me_sin_token(self):
        """/me/ sin token devuelve 401"""
        response = self.client.get("/api/v1/users/me/")
        self.assertEqual(response.status_code, 401)

    def test_roles_existen(self):
        """La BD tiene los roles creados en setUp"""
        roles = Role.objects.all()
        self.assertTrue(roles.count() > 0)
