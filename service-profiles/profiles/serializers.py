from rest_framework import serializers
from .models import AdminProfile, BuyerProfile, PromotorProfile


class AdminProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminProfile
        fields = '__all__'


class AdminProfileCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminProfile
        fields = ['user_id', 'employee_code', 'department']


class BuyerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerProfile
        fields = '__all__'


class BuyerProfileCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerProfile
        fields = ['user_id']


class PromotorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromotorProfile
        fields = '__all__'


class PromotorProfileCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromotorProfile
        fields = ['user_id', 'company_name', 'comercial_nit', 'bank_account']