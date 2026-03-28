# HU-6: Recuperacion de Contrasena

> Como Usuario o Promotor, quiero restablecer mi contrasena en caso de olvidarla, para poder recuperar el acceso a mi cuenta.

## Arquitectura

### Flujo completo

```
Usuario olvida password
  -> Frontend: /recuperar-password (RecuperarPassword.jsx)
  -> POST /api/v1/users/password_reset_request/
  -> Backend genera JWT token (expira en 60 min)
  -> Envia email (console backend en desarrollo)
  -> Devuelve mock_link en la respuesta para testing
  -> Usuario hace clic en el enlace
  -> Frontend: /reset-password?token=xxx (ResetPassword.jsx)
  -> POST /api/v1/users/password_reset_confirm/
  -> Backend valida token + reglas de password
  -> Password actualizada, redirige a /login
```

## Backend (service-auth)

### Endpoint: Solicitar recuperacion

- **URL:** `POST /api/v1/users/password_reset_request/`
- **Permiso:** AllowAny
- **Body:** `{ "email": "usuario@example.com" }`
- **Respuesta exitosa (200):**
```json
{
  "message": "Si el correo esta registrado, recibiras un enlace de recuperacion.",
  "mock_link": "http://localhost:3000/reset-password?token=eyJ..."
}
```
- **Logica:**
  1. Busca usuario por email
  2. Genera JWT con payload: `{ user_id, email, type: "password_reset", exp: 60min }`
  3. Construye enlace: `{FRONTEND_URL}/reset-password?token={jwt}`
  4. Envia email via `send_mail` (console backend en desarrollo)
  5. Siempre retorna mensaje generico (anti-enumeracion de usuarios)
  6. Incluye `mock_link` en la respuesta para facilitar pruebas

### Endpoint: Confirmar nueva contrasena

- **URL:** `POST /api/v1/users/password_reset_confirm/`
- **Permiso:** AllowAny
- **Body:** `{ "token": "eyJ...", "new_password": "NuevaPassword123" }`
- **Validaciones (TIC-194):**
  - Minimo 8 caracteres
  - Al menos una letra mayuscula
  - Al menos un digito
- **Validacion adicional (TIC-193):** Rechaza si la nueva password es igual a la actual
- **Errores posibles:**
  - Token expirado -> "El enlace de recuperacion ha expirado"
  - Token invalido -> "El enlace de recuperacion es invalido"
  - Password no cumple reglas -> mensaje descriptivo
  - Password igual a la actual -> "La nueva contrasena no puede ser igual a la actual"

### Configuracion en settings.py

```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
EMAIL_HOST_USER = 'noreply@ticketproject.com'
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
PASSWORD_RESET_TIMEOUT_MINUTES = 60
```

## Frontend

### RecuperarPassword.jsx (Paso 1 - Solicitar enlace)

- **Ruta:** `/recuperar-password`
- **Flujo:**
  1. Usuario ingresa su email
  2. Submit llama `authService.requestPasswordReset(email)`
  3. Muestra mensaje de exito
  4. En modo desarrollo, muestra `mock_link` clickeable en un recuadro amarillo
- **States:** `email`, `loading`, `mensaje`, `error`, `mockLink`

### ResetPassword.jsx (Paso 2 - Nueva contrasena)

- **Ruta:** `/reset-password?token=xxx`
- **Flujo:**
  1. Extrae `token` de la URL via `useLocation()` + `URLSearchParams`
  2. Usuario ingresa nueva contrasena + confirmacion
  3. Validacion en tiempo real con checklist visual:
     - Minimo 8 caracteres (verde/rojo)
     - Al menos una mayuscula (verde/rojo)
     - Al menos un numero (verde/rojo)
  4. Submit llama `authService.confirmPasswordReset(token, password)`
  5. Exito: muestra mensaje y redirige a `/login` en 1.5 segundos
- **States:** `password`, `confirmPassword`, `loading`, `mensaje`, `error`

### authService.js - Funciones relacionadas

```javascript
requestPasswordReset(email)     // POST /api/v1/users/password_reset_request/
confirmPasswordReset(token, pwd) // POST /api/v1/users/password_reset_confirm/
```

## Archivos modificados/creados

| Archivo | Cambio |
|---------|--------|
| `service-auth/users/views.py` | Endpoints `password_reset_request` y `password_reset_confirm` |
| `service-auth/auth_config/settings.py` | `EMAIL_BACKEND`, `FRONTEND_URL`, `PASSWORD_RESET_TIMEOUT_MINUTES` |
| `frontend/src/pages/RecuperarPassword.jsx` | Pantalla de solicitud con mock_link |
| `frontend/src/pages/RecuperarPassword.css` | Estilos (tema beige/dorado) |
| `frontend/src/pages/ResetPassword.jsx` | Pantalla de reset con validacion en tiempo real |
| `frontend/src/pages/ResetPassword.css` | Estilos + checklist de reglas |
| `frontend/src/services/authService.js` | `requestPasswordReset()`, `confirmPasswordReset()` |

## Pruebas de aceptacion

### PA-1: Solicitar enlace de recuperacion
1. Ir a `/recuperar-password`
2. Ingresar email registrado (ej: `comprador@ticketproject.com`)
3. Clic en "Enviar enlace de recuperacion"
4. **Verificar:** Mensaje de exito + mock_link visible en recuadro amarillo

### PA-2: Validacion de nueva contrasena en tiempo real
1. Hacer clic en el mock_link
2. Ingresar "abc" en el campo de nueva contrasena
3. **Verificar:** Checklist muestra las 3 reglas en rojo
4. Ingresar "Abc12345"
5. **Verificar:** Las 3 reglas pasan a verde

### PA-3: Restablecer contrasena exitosamente
1. Completar el formulario con contrasena valida + confirmacion
2. Clic en "Guardar nueva contrasena"
3. **Verificar:** Mensaje de exito y redireccion a `/login`
4. Iniciar sesion con la nueva contrasena -> Login exitoso
