# 🎯 Catálogo de ideas — Sprint 5 (cierre del proyecto)

> **Objetivo**: dar al equipo un menú amplio de US candidatas para impactar al ingeniero en la entrega final. Tú las eliges, las metes en Jira, y reparten al equipo.

---

## 📊 Diagnóstico del backlog actual

De los 6 TICs en backlog, solo 2 requieren código nuevo:

| TIC | Estado | Acción sugerida |
|---|---|---|
| TIC-27 (conciliar pagos) | ⚪ Requiere código | **Conservar** → fusionar con TIC-30 en un Dashboard Financiero |
| TIC-30 (ingresos/comisiones) | ⚪ Requiere código | **Fusionar con TIC-27** |
| TIC-33 (restricción por rol) | 🟢 Cubierto en US-24 | **Retirar o marcar como completado** |
| TIC-34 (datos seguros) | 🟡 JWT+HTTPS ya | **Documentar como RNF** (sin código) |
| TIC-35 (carga concurrente) | 🟢 Cola virtual Sprint 3 | **Documentar evidencia** |
| TIC-36 (cola al superar umbral) | 🟢 US-18 Sprint 3 | **Documentar evidencia** |

> Eso libera ~90% de la capacidad del sprint para features nuevas.

---

## 🏆 Catálogo de ideas

### Convenciones

- **Esfuerzo**: S (≤2 días/persona), M (3-5 días), L (>5 días)
- **WOW**: 🔥 (útil), 🔥🔥 (impactante), 🔥🔥🔥 (memorable)
- Las US marcadas con ⭐ son las que más recomiendo personalmente

---

## 🎨 Tier 1 — Features visuales y experienciales (alto WOW)

### ⭐ US-A · Validación de QR en puerta (control de asistencia)
**🔥🔥🔥 · M · ~3-4 días**

Promotor abre `/dashboard/evento/{id}/asistencia` → activa cámara → escanea el QR del comprador → instantáneamente: verde "Acceso permitido" o rojo "QR ya usado / inválido". Lista en tiempo real de quienes ya entraron.

**Por qué impacta**: cierra el ciclo del producto (compra → asistencia). El endpoint `POST /tickets/validate/` **ya existe**. Solo falta UI con `html5-qrcode`. En la demo, el inge compra entrada, te muestra el QR, lo escaneas. 🎤

**Plan técnico**:
- Backend: endpoint `/events/{id}/attendance/` que devuelve lista de validados, asegurar que `validate` registra `is_used=True`, `validated_at`, `validated_by`.
- Frontend: librería `html5-qrcode`, vista de cámara grande + panel lateral con asistentes en tiempo real (polling 3s).

---

### ⭐ US-B · Dashboard Financiero (cubre TIC-27 + TIC-30)
**🔥🔥🔥 · M · ~5-6 días**

Vista financiera con KPIs, gráficos y conciliación. El Promotor ve sus ingresos; el Admin ve agregado por promotor.

**Componentes**:
- KPIs: ingreso bruto, comisión TicketGo (%), neto a recibir, boletos vendidos
- Gráfico de barras: ingresos por mes
- Top 5 eventos por venta
- Tabla de conciliación: pagos vs tickets emitidos (discrepancias resaltadas en rojo)
- Botones "Exportar PDF" / "Exportar Excel"

**Plan técnico**:
- Backend: endpoints `GET /finance/summary/`, `/finance/reconciliation/`, `/finance/export.csv|.pdf` (usar `reportlab`).
- Frontend: librería `recharts` para gráficos, ruta `/dashboard/finanzas` y `/admin/finanzas`.

---

### US-C · Mapa interactivo de eventos cercanos
**🔥🔥🔥 · M · ~3-4 días**

En "Explorar Eventos", añadir vista de mapa con pins de eventos según ubicación. Click en pin → detalle del evento. Filtro por distancia.

**Por qué impacta**: muy visual, propio de plataformas tipo Eventbrite. En Bolivia con eventos en distintas ciudades, ofrece valor real.

**Plan técnico**:
- Backend: agregar `latitude` y `longitude` al modelo `Event` (migración).
- Frontend: `react-leaflet` (Leaflet es libre, sin API key). Geocodificación manual o automática vía Nominatim (OSM, gratis).

---

### US-D · Notificaciones push del navegador (Web Push)
**🔥🔥🔥 · L · ~5-7 días**

Notificaciones reales del sistema operativo cuando hay match con preferencias, cambio en evento favorito o queda 1 hora para inicio.

**Por qué impacta**: lleva US-22 (deuda técnica) a otro nivel — del notification center in-app a notif del SO.

**Plan técnico**:
- Backend: Service Worker registry + Web Push protocol (librería `py-vapid` o `pywebpush`).
- Frontend: registrar service worker, pedir permiso al usuario, manejar `push` events.
- Requiere generar VAPID keys.

---

### US-E · Estadísticas en tiempo real con gráficos vivos
**🔥🔥 · M · ~3-4 días**

Dashboard del Promotor con gráficos que se actualizan en vivo: ventas en tiempo real, boletos disponibles en la cola, asistentes que han entrado.

**Plan técnico**:
- Polling cada 5s al endpoint de stats (más simple que WebSockets pero efectivo).
- Animaciones de números (librería `react-countup`).
- Si quieres ir más fancy: WebSocket vía Django Channels.

---

## 🛒 Tier 2 — Features comerciales que faltan

### ⭐ US-F · Códigos de promoción / descuentos
**🔥🔥 · M · ~4 días**

Promotor crea códigos (%, monto fijo, usos limitados, fecha límite). Comprador los ingresa en el pago y ve el descuento aplicado.

**Por qué impacta**: feature comercialmente obvia que toda plataforma seria tiene. Toca backend, frontend y audit.

**Plan técnico**:
- Backend: modelos `PromoCode`, `PromoCodeUsage`; endpoints CRUD + `POST /promo-codes/validate/`.
- Frontend: pestaña "Promociones" en panel Promotor + input "Tengo un código" en `ModalPagoQR`.

---

### US-G · Sistema de reembolsos
**🔥🔥 · M · ~4-5 días**

Comprador solicita reembolso desde "Mis Entradas" con motivo. Promotor/Admin aprueba o rechaza. Si aprueba, el ticket queda cancelado y el monto vuelve al saldo del usuario.

**Plan técnico**:
- Backend: modelo `RefundRequest` con estados `pending/approved/rejected`; endpoints para crear, aprobar, rechazar. Hook al sistema de pagos.
- Frontend: botón "Solicitar reembolso" en detalle de compra. Cola de revisión en panel Promotor/Admin.

---

### US-H · Transferencia de entradas
**🔥🔥 · M · ~3 días**

Comprador puede regalar/transferir su entrada a otro usuario por email. El nuevo dueño recibe el QR; el original lo pierde.

**Plan técnico**:
- Backend: endpoint `POST /tickets/{id}/transfer/` con `recipient_email`. Si el destinatario no existe, envío de link de invitación.
- Frontend: modal "Transferir entrada" con confirmación.
- Audit log obligatorio.

---

### US-I · Wishlist / "Me interesa" antes de comprar
**🔥 · S · ~1-2 días**

Comprador marca eventos como "Me interesa" (similar a favoritos pero sin compromiso de compra). Recibe alerta cuando hay descuento o quedan pocas entradas.

**Plan técnico**:
- Backend: ya existe `UserFavorite` (Sprint 4). Solo agregar campo `interest_only` o reutilizarlo con renombre UX.
- Frontend: botón estrella ⭐ en cards de evento; pestaña "Mi wishlist" en dashboard.

---

### US-J · Eventos recurrentes
**🔥 · M · ~3-4 días**

Promotor crea un evento que se repite (ej. clase de yoga cada lunes). El sistema genera instancias automáticamente.

**Plan técnico**:
- Backend: modelo `EventRecurrence` con regla iCal (RRULE). Job que genera instancias.
- Frontend: formulario con frecuencia (diaria/semanal/mensual) y fecha límite.

---

### US-K · Sistema de afiliados / referidos
**🔥🔥 · L · ~5-6 días**

Comprador genera un link único; cada compra vía ese link le da puntos/comisión. Promotor puede activar el programa.

**Plan técnico**:
- Backend: modelo `Referral` con código único por usuario; tracking de conversiones; sistema de puntos canjeables.
- Frontend: sección "Invita amigos" con link copiable + dashboard de ganancias.

---

## 🎨 Tier 3 — UX polish (mejoras visibles, esfuerzo bajo-medio)

### ⭐ US-L · Búsqueda con filtros avanzados
**🔥🔥 · S · ~2 días**

Hoy se filtra por nombre y categoría. Agregar: rango de fecha, rango de precio, ciudad, distancia, "solo con disponibilidad", ordenar por (fecha/precio/popularidad).

**Plan técnico**:
- Backend: extender query params del endpoint `/events/` con `min_price`, `max_price`, `date_from`, `date_to`, `city`, `ordering`.
- Frontend: barra de filtros expandible con sliders y dropdowns.

---

### US-M · Calendario integrado (descarga ICS)
**🔥🔥 · S · ~1 día**

Tras comprar entrada, el comprador puede descargar un `.ics` para agregar al calendario (Google, Apple, Outlook).

**Plan técnico**:
- Backend: endpoint `GET /purchases/{id}/calendar.ics` genera archivo iCal con nombre, fecha, ubicación, recordatorio 1h antes.
- Frontend: botón "Agregar a calendario" en confirmación de compra y en "Mis Entradas".

---

### US-N · Compartir evento en redes sociales con preview
**🔥🔥 · S · ~1-2 días**

Cuando se comparte el link de un evento en WhatsApp/Twitter/Facebook, aparece un preview con imagen, título y fecha.

**Plan técnico**:
- Backend: endpoint público SSR-friendly que retorna meta tags Open Graph + Twitter Cards.
- Frontend: botones "Compartir en WhatsApp / Twitter / Facebook / Copiar link" en detalle de evento.

---

### US-O · PWA — instalable como app en móvil
**🔥🔥 · S · ~2 días**

El usuario puede "instalar" TicketGo en su celular como app nativa (icono en home screen, abre sin barra del navegador, funciona offline en cierto grado).

**Plan técnico**:
- Frontend: `manifest.json` + service worker básico. Next.js tiene `next-pwa` que lo automatiza.

---

### US-P · Modo oscuro mejorado / Temas
**🔥 · S · ~1-2 días**

Ya hay un toggle de modo oscuro, pero está incompleto en varias páginas. Pulir todo + agregar 2-3 temas alternativos (claro/oscuro/sepia/colores corporativos).

**Plan técnico**:
- CSS variables por tema. Auditoría visual página por página.

---

### US-Q · Onboarding tour para usuarios nuevos
**🔥🔥 · S · ~2 días**

Primera vez que un usuario entra al dashboard, un tooltip guiado le muestra dónde están las cosas. Librería: `driver.js` o `react-joyride`.

**Por qué impacta**: en demo se ve súper pulido. Los inges valoran mucho el detalle.

---

### US-R · Búsqueda con autocompletado
**🔥 · S · ~2 días**

Al escribir en el buscador, sugerencias inline de eventos, categorías y ciudades (estilo Google).

**Plan técnico**:
- Backend: endpoint `/events/suggest/?q=...` con respuesta rápida (limit 8).
- Frontend: debounce + dropdown.

---

### US-S · Atajos de teclado
**🔥 · S · ~1 día**

`Ctrl+K` abre buscador rápido global (estilo Linear, Notion). `Esc` cierra modals. `?` muestra ayuda con todos los atajos.

**Por qué impacta**: detalle pequeño que los desarrolladores aprecian muchísimo.

---

## 🚀 Tier 4 — Diferenciadores técnicos (sorprenden al inge)

### US-T · Detección de fraude / patrones sospechosos
**🔥🔥🔥 · L · ~5-6 días**

Sistema que detecta patrones sospechosos: muchas compras desde misma IP en poco tiempo, mismo método de pago en múltiples cuentas, intentos de login fallidos masivos. Genera alertas para el admin.

**Plan técnico**:
- Backend: tabla `SuspiciousActivity`; signals que populan la tabla en eventos de login fallido / compra / cambio de email.
- Reglas simples: `>5 compras en 1min misma IP`, `>10 logins fallidos misma cuenta en 5min`.
- Frontend: panel "Alertas de seguridad" en el admin.

---

### US-U · API pública para integradores externos
**🔥🔥 · M · ~4-5 días**

Endpoints públicos documentados con OpenAPI/Swagger + sistema de API keys para que terceros (bots, scripts, agencias) consuman datos no sensibles (eventos publicados).

**Plan técnico**:
- Backend: modelo `ApiKey` con scopes (`read:events`, `read:tickets`); middleware que valida `X-API-Key`.
- Frontend: panel para el Promotor para generar/revocar keys (similar a GitHub PATs).
- Documentación auto-generada con `drf-spectacular`.

---

### US-V · Webhooks para terceros
**🔥🔥 · M · ~3 días**

Promotor configura URLs que reciben notificaciones HTTP cuando pasa algo en sus eventos (nueva venta, cancelación, validación de entrada). Similar a Stripe/GitHub.

**Plan técnico**:
- Backend: modelo `WebhookEndpoint`; signal handlers que disparan POST async. Retry con backoff. Firma HMAC en headers.
- Frontend: CRUD de endpoints + log de últimos envíos con código de respuesta.

---

### US-W · Tickets con hash verificable (anti-falsificación)
**🔥🔥🔥 · M · ~3-4 días**

Cada ticket emitido tiene un hash SHA-256 firmado por el backend que incluye: ID de evento + ID de comprador + timestamp. El QR contiene este hash. Cualquier intento de modificar invalida el ticket. **No es blockchain real**, pero da el mismo efecto de inmutabilidad.

**Por qué impacta**: el inge piensa "¿usaron blockchain?". Es un truco simple pero efectivo.

**Plan técnico**:
- Backend: al emitir ticket, generar `signature = hmac.new(SECRET, payload, sha256)`. Validar en `/tickets/validate/`.
- Frontend: el QR ya existe; solo cambia el contenido.

---

### US-X · Analytics avanzados con cohorts
**🔥🔥 · M · ~4 días**

Para el admin: gráficos de retención (cohort analysis), funnel de conversión (visitas → exploran → agregan favorito → compran), LTV por usuario.

**Plan técnico**:
- Backend: aprovechar `UserBehavior` (ya existe del Sprint 4). Endpoints de agregación.
- Frontend: gráficos `recharts` o `nivo`.

---

### US-Y · Eventos virtuales con streaming integrado
**🔥🔥🔥 · M · ~4-5 días**

Promotor marca evento como "Virtual" y agrega link de transmisión (Zoom, YouTube Live, Twitch). Comprador, tras pagar, ve un botón "Unirme al streaming" 15 min antes y durante el evento. El link no es visible para no-pagadores.

**Por qué impacta**: amplía el mercado del producto (no solo eventos físicos). Súper relevante post-2020.

**Plan técnico**:
- Backend: agregar `event_type` (presencial/virtual/híbrido) y `streaming_url` al modelo Event. Endpoint protegido que devuelve el link solo a compradores con ticket pagado.
- Frontend: badge "Virtual" en cards, sección "Acceso al streaming" en "Mis Entradas".

---

## 🎁 Tier 5 — Social / engagement

### ⭐ US-Z · Calificaciones y reseñas post-evento
**🔥🔥 · M · ~3 días**

Tras la fecha del evento, el comprador puede calificar 1-5 estrellas + comentario opcional. Promedios visibles en cards de evento futuros del mismo promotor.

**Plan técnico**:
- Backend: modelo `EventReview` con `rating`, `comment`, `created_at`, `user_id`, `event_id`. Endpoint POST/GET.
- Job que envía notificación 24h después del evento invitando a calificar.
- Frontend: modal de rating; estrellas promedio en card de evento.

---

### US-AA · Sistema de "Asisten también"
**🔥 · S · ~2 días**

En el detalle de un evento, mostrar "Otros usuarios que asisten" (foto de perfil + nombre, solo si optaron por ser visibles). Cierra la sensación de comunidad.

**Plan técnico**:
- Backend: campo `is_public_attendance` en compra. Endpoint `/events/{id}/public-attendees/`.
- Frontend: avatars en grid en detalle de evento.

---

### US-AB · Gamificación: badges y niveles
**🔥🔥 · M · ~3-4 días**

Usuario sube de nivel ("Explorador", "Coleccionista", "VIP") según eventos asistidos. Badges desbloqueables (primer evento, 10 eventos, evento internacional, asistió a 3 categorías, etc.). Visible en perfil público.

**Plan técnico**:
- Backend: tabla `UserAchievement` con relación many-to-many a `Badge`. Reglas en signals (al validar entrada, evaluar badges).
- Frontend: perfil con grid de badges + barra de progreso de nivel.

---

### US-AC · Galería post-evento
**🔥 · S · ~2 días**

Tras el evento, el Promotor sube fotos del mismo. Compradores que asistieron pueden verlas y descargar las suyas.

**Plan técnico**:
- Backend: modelo `EventGallery` con imágenes; endpoint protegido (solo asistentes validados pueden ver).
- Frontend: galería lightbox tras la fecha del evento.

---

## ⚙️ Tier 6 — Operacionales (poco WOW visual, mucho profesionalismo)

### US-AD · Importación masiva de eventos via CSV
**🔥 · S · ~2 días**

Promotor sube CSV con varios eventos a la vez. Útil para promotores grandes con cientos de funciones.

---

### US-AE · Plantillas de evento
**🔥 · S · ~1-2 días**

Promotor guarda un evento como "plantilla" y crea otros desde ella sin llenar todo de nuevo.

---

### US-AF · Reportes programados por email
**🔥🔥 · S · ~2 días**

Cada lunes a las 9:00, el Promotor recibe email con resumen semanal (ventas, top eventos, asistencia). Configurable.

**Plan técnico**:
- Backend: cron (ya existe `service-queue` con cron infraestructura) que genera y envía. Modelo `ScheduledReport` con frecuencia/usuario.

---

### US-AG · Logs de auditoría exportables
**🔥 · S · ~1 día**

Ya hay tabla de auditoría (US-26) y exportar CSV. Agregar exportar PDF firmado para uso legal/contable.

---

### US-AH · Sistema de banner / anuncios internos
**🔥 · S · ~1 día**

SuperAdmin publica avisos que aparecen como banner para todos los usuarios ("Mantenimiento programado el 30/05", "Promo Black Friday").

---

## 📋 Combinaciones recomendadas

Aquí te armo 3 perfiles según ambición. Tú eliges (o mezclas).

### 🎯 Perfil "Conservador" (4 US, sprint tranquilo)
- US-B Dashboard Financiero (cubre TIC-27 + TIC-30)
- US-A Validación de QR en puerta
- US-F Códigos de promoción
- US-30 Evidencia de RNF (cubre TIC-33/34/35/36)

### 🎯 Perfil "Equilibrado" (6-7 US, sprint normal)
- US-B Dashboard Financiero
- US-A Validación de QR en puerta
- US-F Códigos de promoción
- US-L Filtros avanzados de búsqueda
- US-M Calendario integrado (.ics)
- US-Z Calificaciones post-evento
- US-30 Evidencia de RNF

### 🎯 Perfil "Ambicioso" (8-10 US, riesgo medio, máximo impacto)
- US-B Dashboard Financiero
- US-A Validación de QR en puerta
- US-W Tickets con hash verificable (anti-falsificación)
- US-Y Eventos virtuales con streaming
- US-T Detección de fraude
- US-F Códigos de promoción
- US-L Filtros avanzados
- US-Q Onboarding tour
- US-D Notificaciones push del navegador
- US-30 Evidencia de RNF

### 🎯 Perfil "Bomb shell" (4 US grandes, todo o nada)
Para sorprender de verdad. Si todas salen bien, el inge no olvidará la demo.
- US-A Validación QR en puerta (cierra el ciclo del producto)
- US-Y Eventos virtuales con streaming (amplía el mercado)
- US-W Tickets con hash verificable (anti-falsificación)
- US-T Detección de fraude

---

## 🎤 Pitch sugerido para la demo final

> "TicketGo no es solo una plataforma para comprar entradas: es un ecosistema completo.
>
> El **Promotor** crea su evento, configura promociones para atraer público, recibe ingresos en su dashboard financiero con conciliación automática, y el día del evento valida la asistencia escaneando QR desde su celular.
>
> El **Comprador** descubre eventos según sus gustos en el mapa, recibe notificaciones push, paga seguro, aplica códigos de descuento, transfiere su entrada si no puede ir, y muestra su QR firmado anti-falsificación en la puerta.
>
> El **Administrador** supervisa, audita y delega con permisos granulares. El **SuperAdmin** lo gobierna todo. Sistema de detección de fraude vigilando todo en tiempo real.
>
> Y bajo el capó: cola virtual para eventos masivos, transmisión segura, microservicios listos para escalar, API pública para integradores. Todo construido en 5 sprints."

---

## 🤝 Mi opinión

Si quieres impactar de verdad y vas con un equipo razonable de 4-5 personas, mi recomendación es el **perfil "Equilibrado" extendido**:

**Imprescindibles** (para cerrar el producto):
- US-A · Validación QR en puerta
- US-B · Dashboard Financiero
- US-30 · Evidencia de RNF

**Para impactar**:
- US-W · Tickets con hash verificable (es barato y suena a "blockchain")
- US-Y · Eventos virtuales con streaming (amplía el caso de uso)

**Para pulir**:
- US-L · Filtros avanzados de búsqueda
- US-Q · Onboarding tour
- US-M · Descarga .ics

Eso te da 8 US, balance entre ambición y entregable. Las primeras 5 son las que realmente moverán la aguja en la presentación.

---

## ⚠️ Riesgos y consideraciones

1. **No te sobrecargues**: prefieres entregar 6 US bien que 10 a medias. El inge ve la calidad, no la cantidad.
2. **Demuestra integración**, no solo features sueltas. Cada US debería conectarse con algo previo (ej. el dashboard financiero usa datos de compras del Sprint 2 y permisos del Sprint 4).
3. **Reserva 2-3 días al final** para pulir, validar US-21 / US-22 (deuda técnica) y preparar la demo en vivo.
4. **Practica la demo** al menos 2 veces antes. Sin práctica, hasta el mejor producto se ve mal.

---

> **Próximo paso**: tú decides qué US tomar y las metes en Jira. Si después quieres que diseñe el plan técnico detallado de cualquiera de estas US (modelos, endpoints, componentes específicos), avísame y lo armo.
