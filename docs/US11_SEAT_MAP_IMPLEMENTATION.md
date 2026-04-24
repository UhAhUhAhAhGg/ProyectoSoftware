# 💺 Documentación de Implementación - US11 (Mapa de Asientos)

## 📌 Contexto y Objetivo
La **Historia de Usuario TIC-11 (US11)** buscaba habilitar la capacidad técnica y visual para gestionar y reservar asientos de manera estructurada mediante mapas de recintos. El código de esta rama combina el trabajo visual en el frontend, y resoluciones de arquitectura crítica en el backend.

---

## 🛠️ Lo que construimos (y reparamos)

Hicimos un análisis forense de la rama donde encontramos componentes funcionales pero desconectados. Logramos preservar lo bueno y arreglar los errores estructurales graves:

### 1. Elementos Conservados y Validados
Se mantuvo intacto todo el desarrollo visual creado previamente (por `mar1511`):
* `VenueLayoutPreview.jsx`: Lógica gráfica y vista isométrica de recintos.
* Formularios de Zonas y Precios.
* `ModalPagoQR.jsx`: Componentes estéticos transaccionales.

### 2. Backend Crítico Implementado
* **Creación del Modelo Físico en Base de Datos (`Seat`)**:
  Diseñamos la tabla fundamental atada como `ForeignKey` a la tabla de `TicketType` en el microservicio `service-events`. Controla ahora 3 estados por cada asiento único: `available`, `reserved` y `sold`. 
* **Endpoints de Generación y Lectura Diaria (`GET /api/v1/seats/`)**:
  Se incluyó la lógica para consultar todos los asientos por zona. El endpoint, de forma inteligente, iterará y "dibujará" (creará masivamente) los asientos en la base de datos automáticamente si es la primera vez que se consulta la zona de un evento.
* **Mecanismos Anti-Colisión (`POST /api/v1/seats/<id>/reserve/`)**:
  Se creó el endpoint de reservas transaccionales implementando el candado atómico en bases de datos `select_for_update(nowait=True)`. Permite la concurrencia segura evitando que dos usuarios simultáneos reserven el mismo asiento en milisegundos de diferencia.

### 3. Bugs Resueltos (Fallos de Sintaxis e Inconsistencias)
* **Error 1 (Lectura Invisible):** El `SeatConfigurationView` no contaba con método `GET`. Se programó el método respectivo para poder popular datos.
* **Error 2 (Validación Rígida de Serializadores):** Previamente era imposible que un promotor actualizará "sólo el precio" porque el backend le exigía enviar de nuevo todas las variables del recinto. Se modificó el `Serializer` para que la validación dimensional (`filas * butacas = capacidad`) sea condicional al request.
* **Error 3 (Puente Frontend Roto):** Aunque el mapa virtual estaba programado en frontend, la información jamás le llegaba a los clientes debido a que el servicio base (`eventosService.js / mapEvento()`) truncaba y olvidaba cargar la información de butacas, dimensiones y VIP. Centralizamos el uso de `mapTipoEntrada()` en toda la aplicación.

### 4. Funcionalidades Frontend Implementadas (Interactividad y Tiempo Real)
Se integraron las siguientes capacidades visuales e interactivas al mapa de asientos (`SeatMap.jsx` y `SeatMapModal.jsx`):
*   **Selección Dinámica:** Permite la selección múltiple de asientos mediante clics o arrastrando el ratón. Los asientos cambian de estado visual (`Disponible`, `Seleccionado`, `Ocupado`).
*   **Sincronización en Tiempo Real:** Uso de WebSockets con una estrategia de respaldo (*fallback*) de *polling* cada 5 segundos para mantener la lista de asientos ocupados actualizada sin recargar la página.
*   **Gestión de Concurrencia UI:** Si el backend lanza un `409 Conflict` (alguien más reservó el asiento al mismo tiempo), la interfaz atrapa el error y muestra una alerta actualizando inmediatamente el mapa.
*   **Navegación en Mapas Grandes:** Implementación de *Zoom* y *Pan* mediante la rueda del ratón y arrastre del mapa completo, vital para recintos muy grandes.
*   **Visualización de Llenado (Previews):** Las tarjetas de resumen de zonas en los eventos ahora "apagan" u oscurecen el porcentaje exacto de asientos ya vendidos, permitiendo al usuario pre-visualizar el nivel de ocupación antes de abrir el mapa interactivo.

### 5. Casos de Borde y Optimizaciones Avanzadas (Nuevo)
*   **Bloqueo Atómico de Múltiples Asientos:** Se migró de promesas concurrentes individuales a una transacción atómica `bulk-reserve` en la base de datos (`SeatBulkReserveView`). Esto previene el clásico bug de "reserva fantasma" o reserva parcial: si un usuario intenta comprar 3 asientos y 1 de ellos falla por conflicto, la transacción completa hace un *rollback* estricto y limpia los otros 2 asientos automáticamente.
*   **Restricción de Compra Múltiple por Usuario:** Para evitar acaparamiento y errores de UI, el Frontend intercepta el historial del usuario (`/api/v1/purchases/history/?event_id=...`) saltándose inteligentemente la paginación. Si se detecta una orden "active" o "pending" para el mismo evento, el sistema bloquea los botones y muestra *"Ya compraste entrada"*, blindando el flujo.

---

## 🧪 Guía Oficial de Pruebas (Cómo validar la rama US11)

### A. Pruebas de Aceptación (PA) según Criterios de Jira

1.  **PA: Interactividad de Asientos (TIC-289, TIC-290, TIC-293):**
    *   **Dado** que el usuario accede a "Seleccionar asientos", **entonces** el mapa carga mostrando los asientos disponibles (verde) y ocupados (gris/deshabilitados).
    *   **Dado** que selecciona múltiples asientos arrastrando o clickeando, **entonces** cambian a color azul (seleccionado) y el contador inferior "Seleccionados: X" se actualiza correctamente.
    *   **Dado** que un asiento está ocupado, **entonces** el sistema le impide seleccionarlo.

2.  **PA: Tiempo Real (TIC-292):**
    *   **Dado** que hay dos usuarios (A y B) con el mismo mapa de asientos abierto.
    *   **Cuando** el Usuario A confirma y reserva un asiento.
    *   **Entonces** el mapa del Usuario B se actualiza automáticamente mostrando el asiento de A como ocupado, sin necesidad de recargar la página.

3.  **PA: Control de Concurrencia Estricta (TIC-291):**
    *   **Dado** que dos usuarios (A y B) seleccionan *el mismo asiento disponible al mismo tiempo* sin que el tiempo real alcance a avisarles.
    *   **Cuando** ambos le dan clic a "Comprar" simultáneamente.
    *   **Entonces** el primero bloquea el asiento en base de datos. Al segundo le saltará una alerta de error indicando: *"Algunos asientos se ocuparon mientras seleccionaba. Se actualizará la vista"*, protegiendo la transacción.

### B. Guía de Pruebas Manuales (Paso a Paso)

Para probar la interacción como **Comprador**:
1.  **Levanta los entornos:** Asegúrate de que `service-auth`, `service-events` y el `frontend` estén corriendo.
2.  **Inicia sesión:** Ingresa como un Comprador (puedes ver correos disponibles en `seed_users.py`).
3.  **Selecciona un Evento:** Ve a la vista "Eventos" (`/dashboard/eventos`) y dale clic a un evento disponible (que ya tenga configurado tipos de entrada).
4.  **Abre el Mapa:** Desplázate a las opciones de entradas y dale al botón de "Comprar" o seleccionar asientos. Se abrirá el modal con el plano del recinto.
5.  **Prueba el Zoom/Pan:** Usa la rueda del ratón para acercar y alejar. Haz clic en una zona vacía del modal y arrastra para mover el plano.
6.  **Selección Múltiple:** Haz clic en un asiento o arrastra el ratón sobre varios asientos verdes. Deben cambiar a azul. El contador "Seleccionados: X" debe actualizarse en tiempo real.
7.  **Prueba Concurrencia (Simulación):**
    *   Abre tu navegador normal y una ventana en Incógnito. Inicia sesión con 2 cuentas de comprador diferentes.
    *   Entra al mismo evento en ambas pantallas y abre el mapa.
    *   En la ventana normal, selecciona el asiento **A1** y dale "Comprar" (confirmar bloqueo).
    *   Observa la ventana de Incógnito: el asiento **A1** debería parpadear y pintarse de gris/deshabilitarse por sí solo gracias al WebSocket/Polling, sin que tú refresques la página.

8.  **Prueba Transacción Atómica (Avanzado):**
    *   Con la Cuenta A, selecciona F1, F2, F3 y llega a la pasarela de pago (los asienta como reservados).
    *   Con la Cuenta B, intenta comprar F1, F4, F5. Te saltará un error de ocupación por culpa del F1. 
    *   Verifica que F4 y F5 **NO** se queden bloqueados y sigan verdes y disponibles, confirmando el *rollback* atómico.

9.  **Prueba Antidoble-Compra:**
    *   Una vez que confirmes el pago y tengas la entrada, vuelve a la página de detalles del mismo evento.
    *   El botón debe decir "Ya compraste entrada" y ser invulnerable a clics.
