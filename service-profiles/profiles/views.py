from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .permissions import IsAdministrador, IsPromotor, IsComprador
from .models import AdminProfile, BuyerProfile, PromotorProfile
from .serializers import (
    AdminProfileSerializer,
    AdminProfileCreateSerializer,
    BuyerProfileSerializer,
    BuyerProfileCreateSerializer,
    PromotorProfileSerializer,
    PromotorProfileCreateSerializer
)


class AdminProfileViewSet(viewsets.ModelViewSet):
    queryset = AdminProfile.objects.all()
    
    def get_permissions(self):
        return [IsAuthenticated(), IsAdministrador()]

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminProfileCreateSerializer
        return AdminProfileSerializer

    @action(detail=False, methods=['get'])
    def by_user(self, request):
        """Obtener perfil de admin por user_id"""
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            profile = AdminProfile.objects.get(user_id=user_id)
            serializer = AdminProfileSerializer(profile)
            return Response(serializer.data)
        except AdminProfile.DoesNotExist:
            return Response(
                {'error': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class BuyerProfileViewSet(viewsets.ModelViewSet):
    queryset = BuyerProfile.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return BuyerProfileCreateSerializer
        return BuyerProfileSerializer

    @action(detail=False, methods=['get'])
    def by_user(self, request):
        """Obtener perfil de comprador por user_id"""
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            profile = BuyerProfile.objects.get(user_id=user_id)
            serializer = BuyerProfileSerializer(profile)
            return Response(serializer.data)
        except BuyerProfile.DoesNotExist:
            return Response(
                {'error': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class PromotorProfileViewSet(viewsets.ModelViewSet):
    queryset = PromotorProfile.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return PromotorProfileCreateSerializer
        return PromotorProfileSerializer

    @action(detail=False, methods=['get'])
    def by_user(self, request):
        """Obtener perfil de promotor por user_id"""
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            profile = PromotorProfile.objects.get(user_id=user_id)
            serializer = PromotorProfileSerializer(profile)
            return Response(serializer.data)
        except PromotorProfile.DoesNotExist:
            return Response(
                {'error': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        """Obtener eventos del promotor (si implementas relación)"""
        promotor = self.get_object()
        return Response({
            'promotor_id': str(promotor.user_id),
            'company_name': promotor.company_name,
            'message': 'Implementar conexión con service-events'
        })