from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, EventViewSet, TicketTypeViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'events', EventViewSet, basename='event')
router.register(r'ticket-types', TicketTypeViewSet, basename='ticket-type')

urlpatterns = [
    path('', include(router.urls)),
]