from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdminProfileViewSet, BuyerProfileViewSet, PromotorProfileViewSet

router = DefaultRouter()
router.register(r'admin-profiles', AdminProfileViewSet, basename='admin-profile')
router.register(r'buyer-profiles', BuyerProfileViewSet, basename='buyer-profile')
router.register(r'promotor-profiles', PromotorProfileViewSet, basename='promotor-profile')

urlpatterns = [
    path('', include(router.urls)),
]