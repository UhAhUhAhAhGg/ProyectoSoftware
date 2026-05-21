# HU-17 — Pago con QR

**Historia de Usuario:** Como comprador, quiero pagar mis entradas mediante un código QR para completar la transacción de forma segura y sin efectivo.

---

## Flujo implementado

```
[Comprador] → Selecciona entrada → "Pagar con QR"
    ↓
[Backend] Crea Purchase(status='pending') + QR de pago (referencia)
    ↓
[Frontend] Muestra modal con QR de pago + cronómetro de 15 min
    ↓
[Pago] Banco confirma → llama al webhook (producción) o botón simulación (desarrollo)
    ↓
[Backend] Activa Purchase(status='active') + genera QR de entrada + backup_code
    ↓
[Frontend] Muestra QR de entrada y código de respaldo ✅
```

### Diferencia clave: QR de pago vs QR de entrada

| QR de pago | QR de entrada |
|---|---|
| Se genera al iniciar la compra | Se genera SOLO al confirmar el pago |
| Contiene `TICKETPAY:<purchase_id>:<monto>` | Contiene el `backup_code` único |
| Se escanea con app bancaria | Se escanea en la puerta del evento |
| Expira en 15 minutos | Válido hasta el evento |

---

## Endpoints del backend (service-events, puerto 8002)

### 1. Iniciar compra
```
POST /api/v1/purchase/
Authorization: Bearer <token>
Content-Type: application/json

{
  "event_id": "<uuid>",
  "ticket_type_id": "<uuid>",
  "quantity": 1
}
```

**Respuesta exitosa (201):**
```json
{
  "status": "pending",
  "message": "Orden de pago creada. Escanea el QR para completar el pago.",
  "data": {
    "purchase_id": "uuid",
    "total": 150.00,
    "payment_qr": "<base64 PNG>",
    "expires_at": "2026-04-08T20:30:00+00:00",
    "event_name": "Concierto...",
    "ticket_type_name": "VIP"
  }
}
```

**Errores posibles:**
- `400` — cantidad inválida, evento no disponible, tipo agotado
- `409` — ya tienes una entrada para este evento
- `200` con `status: "waitlist"` — evento casi lleno, enviado a lista de espera

---

### 2. Simular confirmación de pago ⚠️ SOLO DESARROLLO
```
POST /api/v1/purchase/<purchase_id>/simular_pago/
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "status": "success",
  "message": "Pago confirmado. Tu entrada ha sido generada.",
  "data": {
    "purchase_id": "uuid",
    "backup_code": "A3F9C2",
    "total": 150.00,
    "qr_code": "<base64 PNG>",
    "event_name": "Concierto...",
    "ticket_type_name": "VIP"
  }
}
```

**Errores:**
- `400` — ya fue confirmada o cancelada
- `410` — expiró el tiempo de pago (orden marcada como `cancelled`)

---

### 3. Consultar estado (polling)
```
GET /api/v1/purchase/<purchase_id>/status/
Authorization: Bearer <token>
```

**Respuesta (200):**
```json
{
  "purchase_id": "uuid",
  "status": "pending | active | cancelled",
  "expires_at": "...",
  // Solo si status == "active":
  "backup_code": "A3F9C2",
  "qr_code": "<base64>",
  "event_name": "...",
  "ticket_type_name": "...",
  "total": 150.00
}
```

---

## Cómo probar manualmente (entorno de desarrollo)

### Requisitos previos
1. Docker corriendo desde el directorio correcto:
   ```
   cd "C:\Users\Gustavo\Documents\UCB\Taller de Desarrollo de Software\Project\ProyectoSoftware"
   docker compose up
   ```
2. Haber creado al menos un evento con tipos de entrada activos (como promotor).

### Pasos de prueba

**Paso 1: Iniciar sesión como comprador**
- URL: `http://localhost:3000`
- Email: `comprador@ticketproject.com`
- Contraseña: `Comprador1234!`

**Paso 2: Explorar evento y seleccionar entrada**
- Ir a **Dashboard → Eventos**
- Seleccionar un evento disponible
- En "Tipos de entrada", hacer clic en **"Pagar con QR"**

**Paso 3: Verificar el modal de pago**
- Debe aparecer el modal con:
  - ✅ QR de pago (imagen PNG)
  - ✅ Cronómetro de 15 minutos regresivo
  - ✅ Botón amarillo "🛠️ Simular pago aprobado"
  - ✅ Nombre del evento y tipo de entrada
  - ✅ Monto total en Bs.

**Paso 4: Simular el pago**
- Hacer clic en **"✅ Simular pago aprobado"**
- El modal debe cambiar automáticamente y mostrar:
  - ✅ Mensaje "¡Pago Exitoso! 🎉"
  - ✅ Código de respaldo (ej: `A3F9C2`)
  - ✅ QR de la ENTRADA (diferente al QR de pago)
  - ✅ Botón "Ver mis entradas"

**Paso 5: Verificar en historial**
- Hacer clic en "Ver mis entradas"
- La compra debe aparecer en **Mis Compras** con estado **Activa**
- El QR de la entrada debe estar disponible para descarga

**Paso 6: Probar expiración**
- Iniciar una compra → NO hacer clic en simular
- Esperar hasta que el cronómetro llegue a 00:00
- El modal debe cambiar al estado "Tiempo Expirado"
- Volver al evento e intentar comprar de nuevo → debe funcionar (la orden expirada se cancela)

**Paso 7: Probar restricción de duplicados**
- Completar una compra exitosamente
- Intentar comprar el mismo evento de nuevo
- Debe aparecer el error: **"Ya tienes una entrada para este evento"**

---

## Cómo debería funcionar en producción

En producción, el botón "Simular pago aprobado" **no debe existir**. El flujo real es:

### Opción A: Integración con banco boliviano (ej. Simple, BNB)
1. Al crear la orden, generar un QR real en el formato que acepta el banco (requiere contrato comercial)
2. El banco llama a un **webhook** del backend cuando el pago es confirmado:
   ```
   POST /api/v1/webhooks/pago_confirmado/
   {
     "reference": "TICKETPAY:<purchase_id>:<monto>",
     "status": "APPROVED",
     "bank_transaction_id": "..."
   }
   ```
3. El webhook llama internamente a la misma lógica de `SimularPagoView`

### Opción B: Integración con Stripe (internacional)
```python
# En el webhook de Stripe:
@csrf_exempt
def stripe_webhook(request):
    event = stripe.Webhook.construct_event(...)
    if event['type'] == 'checkout.session.completed':
        purchase_id = event['data']['object']['metadata']['purchase_id']
        confirmar_compra(purchase_id)
```

### Cambios necesarios para producción
1. **Eliminar** el endpoint `/simular_pago/` o protegerlo con `DEBUG=True`
2. **Agregar** endpoint webhook con validación de firma del banco
3. **Generar** el QR en el formato real del banco (QRIS, ISO 20022, etc.)
4. **Configurar** `EMAIL_BACKEND` para envío real de tickets por correo
5. **Agregar** `HTTPS` obligatorio para todos los webhooks

### Variables de entorno necesarias
```env
# .env (service-events)
PAYMENT_PROVIDER=simple  # o bnb, stripe
SIMPLE_API_KEY=...
SIMPLE_SECRET=...
WEBHOOK_SECRET=...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=tickets@tuempresa.com
EMAIL_HOST_PASSWORD=...
```

---

## Arquitectura técnica

### Backend (service-events)
| Archivo | Cambio |
|---|---|
| `events/views.py` | `PurchaseView`: crea orden `pending`; `SimularPagoView`: confirma y genera ticket QR; `PurchaseStatusView`: polling |
| `events/urls.py` | Rutas: `/purchase/`, `/purchase/<id>/simular_pago/`, `/purchase/<id>/status/` |
| `events/models.py` | `Purchase.status`: usa `pending` → `active` (ya existía) |

### Frontend (React)
| Archivo | Cambio |
|---|---|
| `services/eventosService.js` | `realizarCompra()`, `simularPago()`, `consultarEstadoCompra()` |
| `components/dashboard/eventos/DetalleEvento.jsx` | Llama a `realizarCompra`, abre `ModalPagoQR` con datos de la orden |
| `components/dashboard/eventos/ModalPagoQR.jsx` | Reescrito: cronómetro, polling, botón simulación, estados pending/active/expired/cancelled |

---

## Estados del modelo `Purchase`

```
pending  →  active    (pago confirmado ✅)
pending  →  cancelled (expiró o cancelado por usuario)
active   →  used      (validado en puerta del evento)
```

---

## Envío de Email con Ticket

Al confirmar el pago (ya sea simulado o real), el sistema envía automáticamente un email al comprador con:
- PDF adjunto de la entrada (con QR y código de respaldo)
- HTML con datos del evento, fecha, tipo de entrada y código

### Configuración del email (Gmail SMTP)

**Variables de entorno** (en `.env` raíz del proyecto):
```env
EMAIL_HOST_USER=tucorreo@gmail.com
EMAIL_HOST_PASSWORD=tuapppassword16chars
DEFAULT_FROM_EMAIL=TicketProject <tucorreo@gmail.com>
```

**Importante:**
- La contraseña debe ser una **App Password de Google** (16 caracteres SIN espacios)
- Para obtenerla: Google Account → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación
- El `from_email` DEBE coincidir con `EMAIL_HOST_USER` (Gmail rechaza envíos desde otro remitente)

### Respuesta de la API con estado del email
Cuando se confirma el pago, la respuesta incluye:
```json
{
  "data": {
    "email_sent": true,
    "email_sent_to": "comprador@gmail.com"
  }
}
```

### Frontend: notificación de email
- Si `email_sent=true`: banner azul "📧 Ticket enviado a comprador@gmail.com"
- Si `email_sent=false`: aviso amarillo "⚠️ No se pudo enviar el email. Descarga tu entrada desde Mis Entradas."

### Archivos del sistema de email
| Archivo | Descripción |
|---|---|
| `service-events/events/services.py` | `send_ticket_email()` — genera PDF y envía con EmailMessage |
| `service-events/events_config/settings.py` | Configuración SMTP (líneas 174-180) |
| `docker-compose.yml` | Variables de entorno EMAIL_* para service-events |
| `.env` | Credenciales de Gmail (NO commitear) |
