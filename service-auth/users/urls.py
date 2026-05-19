from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet,
    RoleViewSet,
    PermissionViewSet,
    AdminUserManagementView,
    AdminSuspendUserView,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'permissions', PermissionViewSet, basename='permission')

urlpatterns = [
    path('', include(router.urls)),

    # Endpoints de administración
    path(
        'admin/users/',
        AdminUserManagementView.as_view(),
        name='admin-create-user'
    ),
    path(
        'admin/users/<uuid:pk>/suspend/',
        AdminSuspendUserView.as_view(),
        name='admin-suspend-user'
    ),
]