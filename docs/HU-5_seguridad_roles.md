# Informe Técnico: HU-5 (Seguridad y Permisos de Administrador)

## Estado General
*   **Backend (HU-5 - Seguridad):** Completado (Tareas TIC-118 y TIC-120).
*   **Frontend (HU-5 - Diseño y Módulos):** Pendiente de desarrollo.

---

## 1. Resumen de Implementación Backend (Qué se hizo y Dónde)

Para la HU-5, el objetivo central del lado del servidor era blindar la plataforma. Asegurar que el rol Administrador no pudiera inmiscuirse en tareas operativas de Promotor o Comprador, y a su vez, que su sesión de administración estuviera validada en tiempo real. 

**Archivos Modificados/Creados:**
*   `service-events/events/permissions.py` **[NUEVO]**
*   `service-profiles/profiles/permissions.py` **[NUEVO]**
*   `service-events/events/views.py` (Editado)
*   `service-profiles/profiles/views.py` (Editado)
*   `service-auth/users/views.py` (Editado interno)

**Cumplimiento de Jira:**
*   **TIC-118 (Bloqueos en rutas no administrativas):** Se aplicaron restricciones estrictas en el microservicio de Eventos (`service-events`). Se sobreescribieron los métodos `get_permissions` obligando a que acciones como Crear, Editar o Cancelar un evento (`EventViewSet`) y Tipos de Entrada (`TicketTypeViewSet`) requieran obligatoriamente el rol de **Promotor**. Si un Administrador intenta acceder, el sistema lo rechaza con un HTTP 403 Forbidden.
*   **TIC-120 (Sincronizar permisos en tiempo real):** Se implementó creando las clases `IsAdministrador`, `IsPromotor` y `IsComprador`. Estas clases verifican constantemente en milisegundos si la petición viene acompañada de una sesión (JWT) válida para procesar el cambio. (Ejemplo: Solo el administrador puede modificar variables globales en Perfiles de Administración).

---

## 2. Decisiones Arquitectónicas (Cómo y Por qué)

### ¿Cómo se comunican los permisos en microservicios? (Stateless)
En una arquitectura monolítica, simplemente se haría `if request.user.role == 'Administrador'`. Sin embargo, aquí la base de datos de usuarios (`auth_db`) está separada del microservicio de eventos (`events_db`).

**El problema:** Si `service-events` no tiene la tabla de roles, ¿cómo sabe si el usuario es Promotor o Administrador?
**La solución (Por qué):** Para no romper el estándar de microservicios (desacoplamiento), evitamos hacer que un microservicio le pregunte a la base de datos de otro. En su lugar, utilizamos los **JWT Claims**. Modificamos la autenticación para que el Token de Sesión que recibe el usuario al hacer login contenga su Rol (`"role": "Administrador"`).
Las nuevas clases en `permissions.py` simplemente decodifican matemáticamente ese token (que es infalsificable) en milisegundos y leen el rol directamente de él. Es rápido, seguro y 100% *stateless*.

### Resolución del conflicto Server-to-Server
Al momento de registrar un administrador (`apply_admin`), el `service-auth` debía ordenar a `service-profiles` crear el perfil. Como acabábamos de instalar seguridad estricta (`IsAdministrador`) en `service-profiles`, la petición de servidor a servidor fue bloqueada por falta de credenciales. **Solución:** Programamos a `service-auth` para que "firme" o fabrique un mini-token local de uso único y vigencia de 5 minutos al vuelo, para hacerse pasar legítimamente por un administrador y lograr inyectar el perfil en el otro contenedor.

---

## 3. Instrucciones y Tareas para el Frontend

Para el desarrollador Frontend que arme las pantallas de la HU-5:

1.  **Manejo Categórico de Errores (HTTP 403):** 
    *   Si por accidente en la interfaz se habilita un botón de "Crear Evento" en el Dashboard del Administrador, al enviarse la petición, el backend devolverá el código **HTTP 403 Forbidden**. 
    *   *Tarea Frontend:* Capturar errores 403 en los *interceptors* de Axios o Fetch y mostrar un `Toast` o Modal elegante que diga: *"Permisos insuficientes para esta acción. Esta ruta es exclusiva para Promotores"*.
2.  **Menú de Navegación Exclusivo (TIC-117):**
    *   Evalúa el rol guardado en tu estado global (Redux/Context). Si es Administrador, escóndele inmediatamente los links de comprar entradas o crear eventos. 
    *   Diseña una Sidebar lateral (Dashboard) con "Gestión de Módulos" que será la futura HU.
3.  **Seguridad en el Auth Token:**
    *   No te preocupes por validar los permisos manuales al hacer peticiones complejas REST. Solo asegúrate de enviar el header `Authorization: Bearer <TOKEN>` en cada petición de los módulos de gestión (TIC-119). El backend y las nuevas clases `permissions.py` se encargarán de rechazar a intrusos.
