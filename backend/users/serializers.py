from rest_framework import serializers
from .models import User
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'password', 'role']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate_email(self, value):
        # Validar formato
        try:
            validate_email(value)
        except ValidationError:
            raise serializers.ValidationError("Correo inválido")

        # Validar duplicado
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este correo ya está registrado")

        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data['role']
        )
        return user