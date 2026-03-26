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
    *   Dentro del dashboard (`/admin/dashboard`), se consumió `pending_admins` creando una tabla dinámica que permite emitir rechazos o aprobaciones instantáneas contra la API de Node.

## 4. Tareas Restantes del Backlog General
Todas las Historias de Usuario principales asociadas a la gestión base de Administradores se dan por concluidas en su arquitectura core.
