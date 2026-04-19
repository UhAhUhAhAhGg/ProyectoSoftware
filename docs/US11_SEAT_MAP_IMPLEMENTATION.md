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

---

## 🧪 Guía Oficial de Pruebas (Cómo validar la rama US11)

### A. Pruebas de Frontend e Integración
1. **Flujo de Promotor (Libertad de Edición):**
   - Inicia sesión como Promotor.
   - Crea un evento y asígnale Zonas de Entradas (Ej. General y VIP).
   - Ve a la pestaña para "Editar" el mismo evento. Edita **sólo el precio** o **descripción** del ticket y dale Guardar. 
   - *Éxito:* Deberá permitirte la actualización instantánea sin fallar ni invocar errores de discrepancias de capacidad.

2. **Flujo de Comprador (Renderizado Visual):**
   - Inicia sesión como Comprador.
   - Navega al apartado "Eventos" (listado de explorador).
   - Ingresa al detalle del mismo evento creado en el paso anterior.
   - Desplázate hacia el fondo. 
   - *Éxito:* Identificarás cómo el mapa de asientos del `VenueLayoutPreview` ha levantado, dimensionado la cantidad exacta de filas que configuró el promotor, y pintado correctamente de dorado (VIP) o general (Verde normal) sus zonas respectivas.

### B. Pruebas de Backend (Endpoints Directos)
Usa Postman o CMD (`curl`) contra el servidor en el puerto `:8002`.

1. **Test GET Zonas Generadas:**
   `GET http://localhost:8002/api/v1/seats/?ticket_type_id=<UUID_DEL_TICKET>`
   *Verificar:* Una lista exitosa con arreglo de datos (JSON) donde puedas inspeccionar el `seat_code` dictando filas (Ej. `"A-1", "A-2"` y con estados `"available"`).

2. **Test POST Bloqueo Atómico de Concurrencia:**
   Toma la ID específica de un Asiento que viste en la respuesta anterior y usa el token de autenticación.
   `POST http://localhost:8002/api/v1/seats/<UUID_DEL_ASIENTO>/reserve/`
   *Verificar Primera Petición:* Devuelve status `success` indicando la reserva.
   *Verificar Petición Repetida:* Sin importar quién la mande, el sistema cortará el request con Código HTTP `409 Conflict` (El asiento no está disponible o está siendo reservado).
