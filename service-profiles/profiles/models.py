import uuid
from django.db import models


class AdminProfile(models.Model):
    user_id = models.UUIDField(primary_key=True, editable=False)
    employee_code = models.CharField(max_length=50, unique=True)
    department = models.CharField(max_length=50)

    class Meta:
        verbose_name = 'Admin Profile'
        verbose_name_plural = 'Admin Profiles'

    def __str__(self):
        return f"Admin - {self.employee_code}"


class BuyerProfile(models.Model):
    user_id = models.UUIDField(primary_key=True, editable=False)

    class Meta:
        verbose_name = 'Buyer Profile'
        verbose_name_plural = 'Buyer Profiles'

    def __str__(self):
        return f"Buyer - {self.user_id}"


class PromotorProfile(models.Model):
    user_id = models.UUIDField(primary_key=True, editable=False)
    company_name = models.CharField(max_length=100)
    comercial_nit = models.CharField(max_length=50, unique=True)
    bank_account = models.CharField(max_length=50)

    class Meta:
        verbose_name = 'Promotor Profile'
        verbose_name_plural = 'Promotor Profiles'

    def __str__(self):
        return f"Promotor - {self.company_name}"