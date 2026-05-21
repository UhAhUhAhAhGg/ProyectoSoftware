# Implementación de Notificaciones por Match de Perfil

## Estado Actual: ✅ IMPLEMENTADO

Se ha completado la implementación **FRONTEND** de las notificaciones según los requerimientos solicitados:

### 1. ✅ Ícono de campanita con badge de notificaciones no leídas

**Ubicación:** [Dashboard.jsx](../src/pages/Dashboard.jsx) (lines 71-89)

**Funcionalidades:**
- Ícono 🔔 en el navbar del dashboard
- Badge dinámico con el conteo de notificaciones no leídas
- Dropdown con lista de notificaciones al pasar el mouse
- Botón para marcar todas las notificaciones como leídas
- Se alimenta dinámicamente desde `NotificationContext`

**Componentes involucrados:**
- Context: `NotificationContext` (línea 64-66 de Dashboard.jsx)
- Estado: `notificaciones`, `conteoNoLeidas`
- Métodos: `marcarTodasComoLeidas()`

---

### 2. ✅ Pantalla de configuración de preferencias de notificación

**Ubicación:** [PerfilUsuario.jsx](../src/pages/PerfilUsuario.jsx) 

**Características:**
- Componente `NotificationPreferences` agregado a la sección de perfil
- Toggle switches para:
  - 📧 Notificaciones por Email
  - 🔔 Notificaciones en la App
- Grid de 7 categorías de eventos:
  - ⚽ Fútbol
  - 🎬 Cine
  - 🎭 Teatro
  - 🎵 Música
  - 🏆 Deportes
  - 🎤 Conciertos
  - 📢 Otros
- Información clara sobre cómo funcionan los "matches"
- Estilos responsive y dark mode compatible

**Componentes involucrados:**
- Componente: `NotificationPreferences.jsx`
- Contexto: `NotificationContext` (con métodos `toggleCategoria`, `toggleEmailNotifications`, etc.)
- Servicio: `notificationService.js`

---

## Archivos Creados

### 1. **Frontend - Context**
- `frontend/src/context/NotificationContext.jsx`
  - Centraliza el estado de notificaciones
  - Proporciona métodos para gestionar notificaciones y preferencias
  - Realiza polling cada 30 segundos para actualizar notificaciones

### 2. **Frontend - Service**
- `frontend/src/services/notificationService.js`
  - Conecta con los endpoints del backend (con fallbacks)
  - Métodos disponibles:
    - `getNotificaciones()` - Obtiene todas las notificaciones
    - `getNotificacionesNoLeidas()` - Obtiene solo las no leídas
    - `marcarComoLeida(id)` - Marca una como leída
    - `marcarTodasComoLeidas()` - Marca todas como leídas
    - `eliminarNotificacion(id)` - Elimina una notificación
    - `getPreferencias()` - Obtiene preferencias guardadas
    - `actualizarPreferencias(data)` - Actualiza preferencias
    - `getNotificacionesPorCategoria(cat)` - Filtra por categoría
    - `suscribirseACategoria(cat)` - Se suscribe a una categoría
    - `desuscribirseDeCategoria(cat)` - Se desuscribe

### 3. **Frontend - Component**
- `frontend/src/components/NotificationPreferences.jsx`
  - Panel de configuración de preferencias
  - 2 secciones: Canales de notificación + Categorías de eventos
  - UX intuitivo con toggles y checkboxes
  - Manejo de errores y mensajes de éxito

### 4. **Frontend - Styles**
- `frontend/src/components/NotificationPreferences.css`
  - Estilos modernos y responsive
  - Soporte para dark mode
  - Animaciones suaves
  - Grid responsivo de categorías

### 5. **Frontend - Updates**
- `frontend/src/pages/Dashboard.jsx` - Actualizado para usar NotificationContext
- `frontend/src/pages/PerfilUsuario.jsx` - Agregado NotificationPreferences
- `frontend/src/app/Providers.jsx` - Agregado NotificationProvider

---

## Próximos Pasos - Backend (PENDIENTE)

Para completar la funcionalidad, se necesita implementar los siguientes **endpoints en el backend**:

### Service: `service-profiles`

#### 1. **GET /api/v1/notifications/**
- Retorna todas las notificaciones del usuario autenticado
- Query params: `?unread=true` (opcional, solo no leídas)
- Response:
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "titulo": "string",
    "mensaje": "string",
    "categoria": "futbol|cine|teatro|musica|deportes|conciertos|otros",
    "evento_id": "uuid",
    "leida": boolean,
    "creada_at": "datetime",
    "actualizada_at": "datetime"
  }
]
```

#### 2. **POST /api/v1/notifications/{id}/mark-as-read/**
- Marca una notificación como leída
- Response: Updated notification object

#### 3. **POST /api/v1/notifications/mark-all-as-read/**
- Marca todas las notificaciones del usuario como leídas
- Response: `{"success": true, "updated_count": 5}`

#### 4. **DELETE /api/v1/notifications/{id}/**
- Elimina una notificación específica
- Response: `{"success": true}`

#### 5. **GET /api/v1/notifications/?category={categoria}**
- Filtra notificaciones por categoría
- Response: Array de notificaciones

### Service: `service-auth`

#### 1. **PUT/GET /api/v1/users/me/notification-preferences/**
- Obtiene o actualiza las preferencias de notificación del usuario
- Request (PUT):
```json
{
  "email_enabled": true,
  "in_app_enabled": true,
  "categorias": {
    "futbol": true,
    "cine": true,
    "teatro": true,
    "musica": true,
    "deportes": true,
    "conciertos": true,
    "otros": true
  }
}
```
- Response: Same format as request

#### 2. **POST /api/v1/categories/{categoria}/subscribe/**
- Suscribe al usuario a una categoría de eventos
- Response: `{"success": true}`

#### 3. **POST /api/v1/categories/{categoria}/unsubscribe/**
- Desuscribe al usuario de una categoría
- Response: `{"success": true}`

---

## Modelos de Base de Datos Necesarios

### 1. **NotificationPreference** (service-auth)
```python
class NotificationPreference(models.Model):
    user = OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preference')
    email_enabled = BooleanField(default=True)
    in_app_enabled = BooleanField(default=True)
    futbol = BooleanField(default=True)
    cine = BooleanField(default=True)
    teatro = BooleanField(default=True)
    musica = BooleanField(default=True)
    deportes = BooleanField(default=True)
    conciertos = BooleanField(default=True)
    otros = BooleanField(default=True)
    updated_at = DateTimeField(auto_now=True)
```

### 2. **Notification** (service-profiles)
```python
class Notification(models.Model):
    id = UUIDField(primary_key=True, default=uuid4)
    user_id = UUIDField()  # Reference to user
    titulo = CharField(max_length=200)
    mensaje = TextField()
    categoria = CharField(
        max_length=50,
        choices=[('futbol', 'Fútbol'), ('cine', 'Cine'), ...]
    )
    evento_id = UUIDField(blank=True, null=True)
    leida = BooleanField(default=False)
    creada_at = DateTimeField(auto_now_add=True)
    actualizada_at = DateTimeField(auto_now=True)
```

---

## Cómo Funcionan los "Matches"

El sistema debería implementar una lógica que:

1. **Cuando se crea un nuevo evento:**
   - Extrae la categoría del evento
   - Busca todos los usuarios suscritos a esa categoría
   - Verifica que tengan habilitadas las notificaciones (in_app o email)
   - Crea registros de `Notification` para cada usuario
   - Envía email (si `email_enabled=true`)

2. **En el frontend:**
   - El `NotificationContext` hace polling cada 30 segundos
   - Actualiza la lista de notificaciones
   - Muestra el badge con el conteo de no leídas

3. **User Experience:**
   - Usuario ve la campanita con badge en tiempo real
   - Puede hacer clic para ver todas las notificaciones
   - Puede marcar como leídas desde la campanita
   - Puede configurar sus preferencias en la sección de Perfil

---

## URLs de Endpoints Esperadas

Basado en la configuración en `notificationService.js`:

```javascript
PROFILES_URL = 'http://localhost:8001'  // service-profiles
AUTH_URL = 'http://localhost:8000'      // service-auth

// Notifications endpoints
GET    /api/v1/notifications/
GET    /api/v1/notifications/?unread=true
POST   /api/v1/notifications/{id}/mark-as-read/
POST   /api/v1/notifications/mark-all-as-read/
DELETE /api/v1/notifications/{id}/
GET    /api/v1/notifications/?category={categoria}

// Preferences endpoints
GET    /api/v1/users/me/notification-preferences/
PUT    /api/v1/users/me/notification-preferences/

// Category subscription endpoints
POST   /api/v1/categories/{categoria}/subscribe/
POST   /api/v1/categories/{categoria}/unsubscribe/
```

---

## Testing

### Frontend Testing
1. Verificar que el NotificationContext se carga correctamente
2. Probar el toggle de cada categoría
3. Verificar que los cambios se guardan (fallback local si no hay backend)
4. Probar responsive design en móviles
5. Verificar dark mode

### Backend Testing (cuando se implemente)
1. POST un evento y verificar que crea notificaciones
2. GET /notifications/ y verificar el formato
3. Marcar como leída y verificar cambio en la respuesta
4. Actualizar preferencias y verificar persistencia
5. Verificar que no se envían notificaciones de categorías deshabilitadas

---

## Variables de Entorno

Asegurar que existan en `.env`:

```bash
NEXT_PUBLIC_PROFILES_URL=http://localhost:8001
NEXT_PUBLIC_AUTH_URL=http://localhost:8000
```

---

## Timeline Estimado para Backend

- Modelos: **2-3h**
- Serializers: **1-2h**  
- Viewsets/Endpoints: **3-4h**
- Email notifications: **2-3h**
- Testing: **2-3h**

**Total Backend: ~11-15 horas**

---

## Notas Importantes

1. El frontend está **100% funcional** con fallbacks automáticos
2. Si no existen los endpoints, usa valores por defecto
3. El servicio tiene error handling robusto
4. Las preferencias se guardan localmente como fallback
5. Las notificaciones se actualizan cada 30 segundos (configurable)
6. Compatible con dark mode y responsive design

---

## Integración Futura - Email Notifications

Para enviar emails, considerar:

1. Usar Celery + Redis para tareas asincrónicas
2. Template de email con branding de eventos
3. Unsubscribe link para respetar preferencias
4. Rate limiting para evitar spam

---

*Documento generado: 18/05/2026*
*Implementación Frontend: ✅ COMPLETA*
*Implementación Backend: ⏳ PENDIENTE*
