# HU-28: Actualizar Datos Personales

> Como usuario, quiero poder actualizar mis datos personales (nombre, telefono, foto de perfil) para mantener mi informacion al dia.

## Arquitectura

### Flujo

```
Usuario autenticado
  -> Frontend: /perfil (PerfilUsuario.jsx)
  -> GET /api/v1/users/me/ (cargar datos actuales)
  -> Usuario edita nombre, telefono o foto
  -> PATCH /api/v1/users/me/ (guardar cambios)
  -> Backend actualiza User + UserProfile
  -> Frontend actualiza estado local + localStorage
```

## Backend (service-auth)

### Modelo: UserProfile

```python
class UserProfile(models.Model):
    user = models.OneToOneField(User, primary_key=True, related_name='profile')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=50)
    date_of_birth = models.DateField()
    profile_photo_url = models.TextField(null=True, blank=True)  # soporta base64
```

### Signal: Creacion automatica de perfil

`users/signals.py` registra un handler `post_save` en `User`:
- Cuando se crea un usuario nuevo, automaticamente crea un `UserProfile` con campos vacios
- Evita errores al acceder a `/users/me/` sin perfil existente

### Endpoint: GET /api/v1/users/me/

- **Permiso:** IsAuthenticated
- **Respuesta:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "Comprador",
  "first_name": "Juan",
  "last_name": "Perez",
  "phone": "+591 12345678",
  "profile_photo_url": "data:image/jpeg;base64,..."
}
```
- Usa `UserMeSerializer` que aplana los campos de `UserProfile` al nivel raiz

### Endpoint: PATCH /api/v1/users/me/

- **Permiso:** IsAuthenticated
- **Body (parcial):**
```json
{
  "first_name": "Juan",
  "last_name": "Perez",
  "phone": "+591 12345678",
  "profile_photo_url": "data:image/jpeg;base64,..."
}
```
- Usa `get_or_create` en `UserProfile` para asegurar que existe
- Solo actualiza campos que se envian (los demas permanecen igual)

## Frontend

### PerfilUsuario.jsx

- **Ruta:** `/perfil`
- **States:** `profileData`, `loading`, `formData`, `editando`, `mensaje`, `error`, `showDeleteModal`, `deletePassword`, `deleteLoading`
- **Flujo:**
  1. Al montar, llama `GET /api/v1/users/me/` via `apiFetch`
  2. Muestra avatar (imagen o inicial del nombre), email (read-only), rol (read-only)
  3. Campos editables: nombre completo, telefono
  4. Boton "Editar" activa modo edicion; "Cambiar foto" aparece
  5. Validacion: nombre obligatorio, telefono con formato `^\+?[0-9\s()-]{7,20}$`
  6. Submit: divide nombre en `first_name` + `last_name`, llama `updateUserProfile()` del AuthContext
  7. AuthContext hace PATCH a `/api/v1/users/me/` y actualiza localStorage

### Cambio de foto

1. Clic en "Cambiar foto" abre un input file oculto (`fileInputRef`)
2. Se lee el archivo como base64 via `FileReader.readAsDataURL()`
3. Se guarda en `formData.avatar`
4. Backend recibe la URL base64 en `profile_photo_url`

## Archivos modificados/creados

| Archivo | Cambio |
|---------|--------|
| `service-auth/users/models.py` | `UserProfile` con `profile_photo_url` como TextField |
| `service-auth/users/signals.py` | **Nuevo** - Creacion automatica de UserProfile |
| `service-auth/users/serializers.py` | `UserMeSerializer` (campos planos) |
| `service-auth/users/views.py` | Endpoint `me` (GET/PATCH/DELETE) |
| `service-auth/users/apps.py` | Importa signals en `ready()` |
| `frontend/src/pages/PerfilUsuario.jsx` | Pagina de perfil completa |
| `frontend/src/pages/PerfilUsuario.css` | Estilos |
| `frontend/src/context/AuthContext.jsx` | `updateUserProfile()` |
| `frontend/src/services/authService.js` | `getMe()` |

## Pruebas de aceptacion

### PA-1: Ver perfil actual
1. Iniciar sesion como `comprador@ticketproject.com`
2. Navegar a `/perfil`
3. **Verificar:** Se muestra email, rol, avatar (o inicial)

### PA-2: Editar nombre y telefono
1. Clic en "Editar"
2. Cambiar nombre a "Juan Perez" y telefono a "+591 12345678"
3. Clic en "Guardar cambios"
4. **Verificar:** Mensaje de exito, datos actualizados en pantalla

### PA-3: Cambiar foto de perfil
1. En modo edicion, clic en "Cambiar foto"
2. Seleccionar una imagen
3. **Verificar:** Previsualizacion del avatar cambia inmediatamente
4. Guardar cambios
5. **Verificar:** Foto persiste al recargar la pagina
