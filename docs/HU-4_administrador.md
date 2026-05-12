# Informe Técnico y de Progreso: HU-4 (Acceso de Administrador)

## Estado General
*   **Backend (HU-4):** 100% Completado.
*   **Frontend (HU-4):** 100% Completado (Implementado usando Next.js App Router).

## 1. Resumen de Implementación Backend (Qué se hizo)
Para cumplir con los requerimientos de la historia de usuario 4, limitándose exclusivamente al lado del servidor y cumpliendo con la arquitectura de microservicios existente, se implementó lo siguiente en el servicio **`service-auth`**:

1.  **Generador de Invitaciones JWT (`POST /api/users/invite_admin/`):** Endpoint que emite un token criptográfico firmado temporal con el correo del futuro administrador e intenta mandarlo vía correo (SMTP).
2.  **Revisor de Solicitudes (`POST /api/users/apply_admin/`):** Endpoint público que recibe la información general del usuario más los datos de administración (`employee_code` y `department`). Ejecuta una transacción atómica que:
    *   Crea un `User` local forzando el rol de Administrador.
    *   Le asigna por defecto el estado de seguridad `is_active = False` para impedir que se loguee prematuramente.
    *   Se comunica internamente vía petición HTTP con el microservicio **`service-profiles`** para hidratar la tabla remota `AdminProfile`.
3.  **Dashboards de Control SuperAdmin (`GET /pending_admins/`, `PATCH /approve_admin/`, `DELETE /reject_admin/`):** Permiten al administrador global enlistar rápidamente las cuentas inactivas y asignar `is_active=True` para habilitar su acceso.
4.  **Autenticación Restrictiva (`POST /api/users/admin_login/`):** Endpoint de inicio de sesión diseñado exclusivamente para el panel de administración. 

## 2. Justificación de Diseño Arquitectónico (Cómo y Por qué)

### ¿Por qué se utilizó JWT y `is_active=False` para las invitaciones?
En lugar de crear nuevas tablas en la base de datos para almacenar "invitaciones temporales" (lo cual ensucia el modelo de datos), se optó por una arquitectura *Stateless* usando Tokens JWT. Esto ahorra tiempo de desarrollo en el sprint y recursos de base de datos. Además, utilizar la propiedad nativa `is_active` de Django permite aprovechar el bloqueo natural contra inicios de sesión no autorizados sin escribir middlewares complejos.

### Cumplimiento estricto con Jira
*   **TIC-109 (Verificación de Credenciales de Control):** Se cumplió diseñando un `AdminLoginSerializer` específico. En vez de usar el login público que deja pasar a todos los roles, este intercepta la petición y verifica si las contraseñas coinciden de forma habitual, devolviendo un token especial.
*   **TIC-110 (Asegurar Restricción de Acceso):** Se resolvió dentro del mismo serializador. Si el usuario que intenta entrar suministró datos correctos pero su rol asignado en base de datos es `Comprador` o `Promotor`, el sistema escupe inmediatamente una excepción `AuthenticationFailed` (HTTP 401), bloqueando en seco el acceso cruzado.

## 3. Implementación Frontend Realizada (Next.js)

Se integraron las siguientes vistas utilizando el **App Router** (`src/app/admin/`) en lugar de depender del antiguo flujo de React Router para aislar la seguridad:

1.  **Formulario Exclusivo de Registro (`/admin/register`):** 
    *   Lee el parámetro `?token=` desde el backend de manera criptográfica.
    *   Fuerza al colega invitado a completar sus credenciales obligatorias (`employee_code` y `department`).
2.  **Login Aislado y Seguro (`/admin/login`):** 
    *   Se extirpó cualquier vinculación de administradores del login público (`Login.jsx`), delegando todo el tráfico a este puerto exclusivo protegido por JWT y diseño encriptado.
3.  **Módulo de Aprobaciones (`AdminUsuarios.jsx`):**
    *   Dentro del dashboard (`/admin/dashboard`), se consumio `pending_admins` creando una tabla dinamica que permite emitir rechazos o aprobaciones instantaneas contra la API de Django REST Framework.
4.  **Configuracion Global (`AdminConfiguracion.jsx`):**
    *   Panel para configurar timeout de inactividad (1-60 min) con botones de acceso rapido.
    *   Muestra informacion del sistema: version, tiempos de JWT, timeout actual.

## 4. Seguridad: Bloqueo por intentos fallidos (TIC-114)

El endpoint `admin_login` implementa **proteccion contra fuerza bruta** usando Django Cache:

- Clave de cache: `admin_login_attempts_{email}`
- **3 intentos maximos** antes de bloquear
- Bloqueo por **15 minutos** (900 segundos)
- Cada intento fallido incrementa el contador y muestra intentos restantes
- Anti-enumeracion: si el email no existe, tambien incrementa el contador
- Login exitoso resetea el contador a 0

**Prueba de aceptacion (TIC-114):**
1. Ir a `/admin/login`
2. Ingresar `admin@ticketproject.com` con password incorrecta 3 veces
3. **Verificar:** Mensaje "Cuenta bloqueada por multiples intentos fallidos. Intenta de nuevo en 15 minutos."
4. Esperar 15 minutos o reiniciar el servicio para desbloquear

## 5. Redireccion post-login (TIC-115)

Tras login exitoso como admin:
- `AdminLogin.jsx` redirige a `/admin/dashboard` usando `window.location.href`
- Si un admin accede a `/dashboard` (ruta de promotor/comprador), `Dashboard.jsx` lo redirige automaticamente a `/admin/dashboard`
- Se usa `window.location.href` en lugar de `navigate()` de React Router porque `/admin/dashboard` es una ruta del App Router de Next.js

## 6. Timeout de inactividad (TIC-116)

Configuracion de sesion por inactividad desde el panel de administracion:

- **AdminConfiguracion.jsx** permite configurar el timeout (1-60 minutos)
- Botones de acceso rapido: 1, 5, 15, 30 minutos
- Se persiste en `localStorage` como `inactivity_timeout_minutes`
- **AuthContext.jsx** maneja el timer:
  - Eventos monitoreados: `mousedown`, `keydown`, `scroll`, `touchstart`
  - Cualquier actividad reinicia el timer
  - Al expirar: cierra sesion y marca `sessionExpired = true`
  - Login.jsx y AdminLogin.jsx muestran banner amarillo de sesion expirada

**Prueba de aceptacion (TIC-116):**
1. Login como admin -> ir a Configuracion
2. Cambiar timeout a 1 minuto -> Guardar
3. No tocar nada durante 1 minuto
4. **Verificar:** Sesion se cierra, redirige a login con mensaje "Tu sesion ha expirado por inactividad"

## 7. Pruebas de aceptacion completas (HU-4)

### TIC-112: Solo admins pueden ingresar
```bash
curl -X POST http://localhost:8000/api/v1/users/admin_login/ -H "Content-Type: application/json" -d "{\"email\": \"admin@ticketproject.com\", \"password\": \"Admin1234!\"}"
```
**Verificar:** Respuesta con `"status": "success"` y tokens JWT

### TIC-113: Comprador/Promotor denegados
```bash
curl -X POST http://localhost:8000/api/v1/users/admin_login/ -H "Content-Type: application/json" -d "{\"email\": \"comprador@ticketproject.com\", \"password\": \"Comprador1234!\"}"
```
**Verificar:** Respuesta con `"message": "Permisos insuficientes."` (HTTP 403)

### TIC-114: Bloqueo por intentos fallidos
Ingresar password incorrecta 3 veces en `/admin/login` -> verificar bloqueo de 15 minutos

### TIC-115: Redireccion a /admin/dashboard
Login exitoso como admin -> verificar URL es `/admin/dashboard`

### TIC-116: Timeout de inactividad
Configurar timeout a 1 min -> esperar -> verificar cierre de sesion
