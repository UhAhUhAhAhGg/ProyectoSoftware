# 🔖 Guía de Documentación de Modelos en Swagger

> **Objetivo:** Facilitar la documentación automática de todos los elementos que usan base de datos en Swagger

---

## ✅ Checklist de Documentación por Servicio

### Service-Auth (Puerto 8001)
```
✅ INSTALADO: drf-spectacular==0.27.2
✅ CONFIGURADO: INSTALLED_APPS
✅ CONFIGURADO: REST_FRAMEWORK['DEFAULT_SCHEMA_CLASS']
✅ CONFIGURADO: SPECTACULAR_SETTINGS
✅ HABILITADO: Swagger UI en /api/v1/schema/swagger-ui/
```

### Service-Events (Puerto 8002)
```
✅ INSTALADO: drf-spectacular==0.27.2
✅ CONFIGURADO: INSTALLED_APPS
✅ CONFIGURADO: REST_FRAMEWORK['DEFAULT_SCHEMA_CLASS']
✅ CONFIGURADO: SPECTACULAR_SETTINGS
✅ HABILITADO: Swagger UI en /api/v1/schema/swagger-ui/
```

### Service-Profiles (Puerto 8003)
```
✅ INSTALADO: drf-spectacular==0.27.2
✅ CONFIGURADO: INSTALLED_APPS
✅ CONFIGURADO: REST_FRAMEWORK['DEFAULT_SCHEMA_CLASS']
✅ CONFIGURADO: SPECTACULAR_SETTINGS
✅ HABILITADO: Swagger UI en /api/v1/schema/swagger-ui/
```

---

## 📝 Cómo Documenting Models con drf-spectacular

### 1. **Documentar Serializadores**

Para mejorar la documentación de Swagger, añade docstrings a los serializadores:

#### Ejemplo: UserSerializer (service-auth)

```python
from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    """
    Serializador para User.
    
    Usado en endpoints GET para retornar datos de usuario.
    """
    class Meta:
        model = User
        fields = ['id', 'email', 'is_active', 'is_staff', 'created_at', 'role']
        read_only_fields = ['id', 'created_at']
        
    def create(self, validated_data):
        """Crear un nuevo usuario"""
        user = User.objects.create_user(**validated_data)
        return user


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializador para crear usuarios.
    
    Usado en POST /api/v1/register/
    """
    password = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['email', 'password']
```

### 2. **Documentar ViewSets**

```python
from rest_framework import viewsets
from drf_spectacular.utils import extend_schema
from .models import User
from .serializers import UserSerializer

class UserViewSet(viewsets.ModelViewSet):
    """
    API para gestionar usuarios.
    
    Endpoints:
    - GET /api/v1/users/ - Listar todos
    - POST /api/v1/users/ - Crear
    - GET /api/v1/users/{id}/ - Obtener por ID
    - PUT/PATCH /api/v1/users/{id}/ - Actualizar
    - DELETE /api/v1/users/{id}/ - Eliminar
    """
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    @extend_schema(
        description="Obtener el perfil del usuario autenticado",
        responses=UserSerializer
    )
    def me(self, request):
        """Obtener datos del usuario autenticado"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
```

### 3. **Docstring en Modelos**

```python
class Event(models.Model):
    """
    Modelo de Evento.
    
    Representa un evento que puede ser creado y gestionado por un promotor.
    Los eventos tienen múltiples estados: draft, published, cancelled, completed.
    
    Attributes:
        id: UUID único del evento
        promoter_id: UUID del usuario que creó el evento
        name: Nombre del evento (máx 200 caracteres)
        description: Descripción detallada
        event_date: Fecha del evento
        event_time: Hora del evento
        location: Ubicación (máx 255 caracteres)
        capacity: Capacidad total de asistentes
        image: Imagen del evento
        status: Estado del evento
        created_at: Fecha de creación
        category: Categoría a la que pertenece
    """
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    promoter_id = models.UUIDField()  # Referencia a User en service-auth
    name = models.CharField(max_length=200)
    # ... resto de campos
```

---

## 🎯 Mejoras Implementadas Automáticamente

Con drf-spectacular configurado, automáticamente se genera:

### ✅ Generado Automáticamente
- Modelos de Request/Response
- Validaciones de campos
- Tipos de datos
- Campos obligatorios vs opcionales
- Errores HTTP (400, 401, 403, 404, 500)
- Paginación
- Filtros y búsqueda

### 📌 Requiere Documentación Manual

Para mejorar aún más, puedes usar decoradores:

```python
from drf_spectacular.utils import extend_schema, extend_schema_field
from rest_framework import serializers

# En Serializadores - Documentar campos específicos
class EventCreateSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        help_text="ID de la categoría del evento"
    )
    
    name = serializers.CharField(
        max_length=200,
        help_text="Nombre del evento. Máximo 200 caracteres"
    )

# En ViewSets - Documentar acciones específicas
class EventViewSet(viewsets.ModelViewSet):
    
    @extend_schema(
        description="Listar todos los eventos publicados",
        summary="Eventos publicados",
        tags=["Events"]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @extend_schema(
        description="Crear un nuevo evento solamente si eres promotor",
        summary="Crear evento",
        request=EventCreateSerializer,
        responses={201: EventSerializer},
        tags=["Events"]
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    @extend_schema(
        description="Obtener los eventos próximos (fecha >= hoy)",
        summary="Eventos próximos",
        tags=["Events"]
    )
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        # ... implementación
        pass
```

---

## 🔍 URLs de Acceso a Swagger por Servicio

### Service-Auth
```
🔒 Swagger UI:   http://localhost:8001/api/v1/schema/swagger-ui/
📖 ReDoc:        http://localhost:8001/api/v1/schema/redoc/
📋 Schema JSON:  http://localhost:8001/api/v1/schema/
```

### Service-Events
```
🎯 Swagger UI:   http://localhost:8002/api/v1/schema/swagger-ui/
📖 ReDoc:        http://localhost:8002/api/v1/schema/redoc/
📋 Schema JSON:  http://localhost:8002/api/v1/schema/
```

### Service-Profiles
```
👤 Swagger UI:   http://localhost:8003/api/v1/schema/swagger-ui/
📖 ReDoc:        http://localhost:8003/api/v1/schema/redoc/
📋 Schema JSON:  http://localhost:8003/api/v1/schema/
```

---

## 📊 Elementos de BD Documentados

### Service-Auth
- ✅ User
- ✅ Role
- ✅ Permission
- ✅ RolePermission
- ✅ UserProfile
- ✅ AccountDeletionLog

### Service-Events
- ✅ Category
- ✅ Event
- ✅ TicketType

### Service-Profiles
- ✅ AdminProfile
- ✅ BuyerProfile
- ✅ PromotorProfile

**Total: 12 modelos documentados**

---

## 🎓 Recursos Adicionales

- [drf-spectacular Documentation](https://drf-spectacular.readthedocs.io/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.0)

---

## 🔧 Próximos Pasos para Mejorar Documentación

1. **Agregar ejemplos de request/response** en decoradores @extend_schema
2. **Documentar permisos personalizados** en each endpoint
3. **Crear guía de OAuth2/JWT** en Swagger
4. **Documentar webhooks** si se implementan
5. **Generar cliente SDK** automáticamente desde OpenAPI

---

**Última actualización:** 4 de abril de 2026
