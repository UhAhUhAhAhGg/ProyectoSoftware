# 📜 Informe de Contexto y Operaciones Estratégicas: `service-queue`

## 1. Visión General del Desafío
El **Sprint 3** introduce la necesidad de manejar **colas virtuales** para eventos con alta demanda, así como gestionar la **limpieza de los carritos de reservas de los asientos** (soltar los asientos reservados que no completaron la compra en menos de 15 minutos).

Todo esto requiere su propio microservicio especializado llamado `service-queue`. Este microservicio vivirá bajo un contenedor Docker que se expondrá en el puerto `:8003`.

---

## 2. Decisiones Arquitecturales y Consideraciones

Para no obstruir el proyecto original, este microservicio requiere acatar algunas reglas de este sistema distribuido:

1. **Autonomía:** Al crear la base de datos `queue_db`, este servicio NO tendrá *Foreign Keys* duras (SQL FK constraints) directamente apuntando a las tablas de `service-events` o `service-auth`. Se usarán de manera "lógica" `user_id` y `event_id` (que son UUIDs).
2. **Escalabilidad (US18):** Para calcular cuánta gente está viendo el evento al unísono, se desarrollará un middleware que vigile todas las peticiones con JWT. Cuando el número total rebase el `Waitlist_Threshold` de `Queue_Config`, todas las siguientes peticiones de compra o visualización entrarán en la *Cola Virtual*.
3. **Mecanismo Desacoplado (Cron Jobs - US20):** La expiración de la reserva de tus asientos individuales (creados hoy en el US11) funciona gracias a una etiqueta temporal (`reserved_at`). El nuevo `service-queue` requiere un Scheduler de fondo continuo *(ej. APscheduler en python u otro cron en thread de Django)* barriendo constantemente a los compradores inactivos para liberar sus asientos.
4. **Residencia del Modelo `Seat` (Decisión de Diseño):** ¿Por qué el modelo de asientos (`Seat`) se quedó alojado en `service-events` en lugar de nacer en `service-queue`? Básicamente porque `Seat` es una extensión ultra-directa (dependiente mediante Foreign Key) de `TicketType` y del `Event` en sí. Aislar la tabla `Seat` a otro microservicio habría requerido hacer "referencias lógicas cruzadas" excesivas, y sincronizar capacidades dinámicamente perdería su propiedad atómica nativa (constraints de base de datos) que logramos con `select_for_update`. De esta manera, `service-events` acapara el "inventario duro", y `service-queue` orquestará puramente **el tráfico de los usuarios**.
5. **Dependencias del Frontend:** El frontend tiene que poder conectarse internamente. Es necesario orquestar `REACT_APP_QUEUE_URL` en las variables de entorno para los `.env` o el archivo docker.

---

## 3. Hoja de Ruta Fragmentada por Ramas (Feature Branches)

Te sugiero que desarrolles esto en un flujo metódico apoyándote estrictamente en el siguiente recorrido de ramas, cerrando una cuando consigas su objetivo:

### ⚙️ Rama: `US14` - "Nacimiento y Bootstraping de Configuración"
> **Objetivo:** Iniciar la estructura mínima de `service-queue` y hacer que levante con Docker junto al resto.

1. **Tareas:**
   - Crear el directorio `service-queue` copiando el boilerplate desde `service-events` o `profiles`.
   - Incluir la conexión a BD en tus settings (`queue_db`).
   - Crear la tabla **Queue_Config** (Atributos: `event_id`, `threshold`, `timeout_seconds`, `is_active`).
   - Definir los 2 Endpoints: `POST` y `GET` a `/api/v1/queue-config/{event_id}/` que permita a los Promotores activar el manejo de colas por cada entrada.
   - Modificar de raíz el `docker-compose.yml` para levantar a tu `queue_db` (PostgresSQL) e imágenes de Django para `service-queue`.

### 🚷 Rama: `US18` - "Puerta de Acceso (Entrando a la cola)"
> **Objetivo:** Automatizar la admisión al evento y prohibir accesos.

1. **Tareas:**
   - Crear la tabla **Queue_Entry** (Atributos: `user_id`, `event_id`, `joined_at`, `status ['waiting', 'admitted', 'rejected']`).
   - Crear el endpoint de admisión `POST /queue/{event_id}/enter/` — Toma al usuario y lo encola.
   - **(Crítico)** Programar las rutinas lógicas (`Compare logic` vs umbral) para evitar que los usuarios prosigan a la página de compra si están en cola de espera.

### ⏳ Rama: `US19` - "Posición y Estimación (ETA)"
> **Objetivo:** Proveer la matemática y lógica gráfica de espera del usuario.

1. **Tareas:**
   - Crear el endpoint `GET /queue/{event_id}/position/`. 
   - La lógica matemática es simple: *Tú posición es = Cuántos usuarios en estado 'waiting' tienen tu mismo `event_id` y además su `joined_at` es más viejo que el tuyo.*
   - Sumado con un estimativo (ETA) estándar: asumiendo `X` minutos aproximados por transacción de usuario activo.

### 🧹 Rama: `US20` - "El Barrendero Crítico (Liberación de Asientos)"
> **Objetivo:** Un trabajo programado constante.

1. **Tareas:**
   - Crear la tabla **Queue_Log** (para auditorías y métricas del sistema).
   - Crear un Scheduled Job Background en Django (usando APScheduler, CRON simple o Celery puro) que despierte cada 60 segundos y solicite el endpoint POST de reseteo: `/seats/release-expired/` el cuál buscará los asientos "reserved" pasados los `15 minutos` y los convertirá otra vez en `available`, notificando vía backend la liberación. 
