# HU-15: Comprador Visualiza sus Entradas Compradas

## Descripción
Como comprador, quiero ver mis entradas compradas, descargar el PDF y ver el QR de cada una para poder acceder al evento.

## Subtareas
1. Endpoint historial de compras con paginación - COMPLETADA
2. Vista frontend "Mis Compras" - COMPLETADA
3. Descarga de PDF de entrada - COMPLETADA
4. Envío de email con ticket (integrado en flujo de pago) - COMPLETADA

## Implementación Técnica

### Backend Endpoints (service-events:8002)

**GET /api/v1/purchases/history/**
- Auth: JWT requerido
- Parámetros query:
  - `status` (optional): active, used, pending, cancelled
  - `page` (optional, default 1)
  - `page_size` (optional, default 20)
- Retorna: lista paginada con { results, count, page, total_pages }
- Cada item: id, event_name, event_date, event_time, event_location, ticket_type, zone_type, quantity, total_price, status, backup_code, qr_code, created_at, used_at

**GET /api/v1/purchases/<uuid>/**
- Auth: JWT requerido (solo dueño puede ver)
- Retorna detalle completo de una compra

**GET /api/v1/purchases/<uuid>/download-pdf/**
- Auth: JWT requerido (solo dueño)
- Retorna: archivo PDF con datos del evento, QR y código de respaldo
- Content-Type: application/pdf
- No permite descargar entradas canceladas

### Frontend

**Página principal**: `frontend/src/pages/MisCompras.jsx`
- Ruta: `/dashboard/mis-compras`
- Funcionalidades:
  - Filtros por estado (Todas, Completadas, Utilizadas, Pendientes, Canceladas)
  - Listado de compras con tarjetas que muestran: nombre evento, fecha, tipo entrada, estado, precio
  - Panel lateral de detalle al hacer click en una compra
  - Detalle muestra: toda la info + código de respaldo + QR + botón "Descargar PDF"
  - Paginación (10 por página)

**Servicios**: `frontend/src/services/profileService.js`
- `getUserTickets(options)` - Obtiene historial con filtros y paginación
- `getPurchaseDetail(purchaseId)` - Detalle de una compra
- `downloadPurchasePDF(purchaseId, eventName)` - Descarga PDF como archivo

**Navegación**:
- Dashboard sidebar: "🎟️ Mis Entradas" → `/dashboard/mis-compras`
- OpcionesComprador: tarjeta "Mis Entradas" → `/dashboard/mis-compras`
- ModalPagoQR: botón "Ver mis entradas" después de pago exitoso
- Rutas alias: `/dashboard/boletos` y `/dashboard/historial` redirigen a `/dashboard/mis-compras`

## Pruebas Manuales

### Prerrequisitos
1. Docker levantado: `docker compose up`
2. Cuenta de comprador con al menos 1 compra completada
3. Login: `comprador@ticketproject.com` / `Comprador1234!`

### Caso 1: Ver historial vacío
1. Login con cuenta sin compras
2. Ir a "Mis Entradas" desde el dashboard
3. **Resultado esperado**: Mensaje "No tienes compras registradas" con botón "Explorar eventos"

### Caso 2: Ver historial con compras
1. Comprar una entrada (flujo completo con pago simulado)
2. Ir a "Mis Entradas"
3. **Resultado esperado**: Aparece la compra con estado "Completada" (verde), nombre del evento, fecha, tipo y precio

### Caso 3: Ver detalle de compra
1. En "Mis Entradas", hacer click en una tarjeta de compra
2. **Resultado esperado**: Panel lateral muestra:
   - Nombre del evento, fecha, ubicación
   - Tipo de entrada, zona, cantidad, total
   - Código de respaldo (alfanumérico)
   - QR code de la entrada
   - Botón "Descargar entrada PDF"
   - Fecha de compra e ID

### Caso 4: Descargar PDF
1. En el detalle de una compra, click "📄 Descargar entrada PDF"
2. **Resultado esperado**: Se descarga un archivo PDF con los datos del evento, QR y código de acceso

### Caso 5: Filtrar por estado
1. Click en "Completadas" en los filtros
2. **Resultado esperado**: Solo se muestran compras con estado "active/Completada"
3. Click en "Todas"
4. **Resultado esperado**: Se muestran todas las compras

### Caso 6: Navegación desde el pago
1. Completar una compra con pago simulado
2. En el modal de éxito, click "Ver mis entradas"
3. **Resultado esperado**: Se navega a `/dashboard/mis-compras`

## Archivos Relacionados
| Archivo | Descripción |
|---------|-------------|
| `frontend/src/pages/MisCompras.jsx` | Página principal de historial |
| `frontend/src/pages/MisCompras.css` | Estilos |
| `frontend/src/services/profileService.js` | Funciones de API |
| `service-events/events/views.py` | PurchaseHistoryView, PurchaseDetailView, PurchaseDownloadPDFView |
| `service-events/events/services.py` | generate_ticket_pdf() |
| `frontend/src/App.js` | Rutas /mis-compras, /boletos, /historial |
