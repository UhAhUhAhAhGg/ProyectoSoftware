# Plan Sprint 5 — Reportes, Finanzas y Marketing

> **Foco del Sprint:** Cerrar el ciclo financiero de TicketGo. Entrega visibilidad económica para el Promotor, configuración del modelo de negocio para el SuperAdmin, dashboard global de ingresos del sistema y herramientas comerciales (códigos de descuento + promoción pagada de eventos).

---

## Estado actual del sprint

**Sprint activo** — el equipo ya comenzó. Datos al 27/05/2026.

| TIC | US | Rama | Subtareas | 🟡 En curso | ⚪ Por hacer |
|---|---|---|---|---|---|
| **TIC-567** | US-31 — Configuración de Comisiones | `US567` | 10 | 2 | 8 |
| **TIC-27** | US-26 — Dashboard Financiero del Promotor | `US27` | 9 | 3 | 6 |
| **TIC-30** | US-27 — Reporte Financiero por Evento | `US30` | 9 | 1 | 8 |
| **TIC-33** | US-28 — Lista de Compradores por Evento | `US33` | 8 | 1 | 7 |
| **TIC-34** | US-29 — Admin ve Dashboard del Promotor | `US34` | 7 | 3 | 4 |
| **TIC-566** | US-32 — Dashboard Financiero Global | `US566` | 12 | 1 | 11 |
| **TIC-35** | US-30 — Códigos de Promoción y Descuentos | `US35` | 14 | 3 | 11 |
| **TIC-570** | US-34 — Promoción de Eventos Destacados | `US570` | 15 | 2 | 13 |
| **TIC-36** | US-33 — Exportar Reportes a PDF y Excel | `US36` | 9 | 2 | 7 |
| | | **Total** | **93** | **18** | **75** |

**Épicas:**

- `TIC-45` — Reportes y Finanzas (agrupa TIC-27, 30, 33, 34, 566, 567, 36)
- `TIC-571` — Marketing (agrupa TIC-35, 570)

---

## Ramas de trabajo

```text
main
  └── SPRINT_5_DEV          ← integración del sprint (PR aquí al terminar cada HU)
        ├── US27             ← US-26  Dashboard Financiero del Promotor
        ├── US30             ← US-27  Reporte por Evento
        ├── US33             ← US-28  Lista de Compradores
        ├── US34             ← US-29  Admin ve Dashboard del Promotor
        ├── US35             ← US-30  Códigos de Descuento
        ├── US36             ← US-33  Exportar PDF/Excel
        ├── US566            ← US-32  Dashboard Global del Sistema
        ├── US567            ← US-31  Configuración de Comisiones
        └── US570            ← US-34  Promoción de Eventos Destacados
```

---

## Contexto: Modelo de negocio

TicketGo genera ingresos por **dos vías**:

| Fuente | Cómo funciona |
|---|---|
| **Comisión por venta** | Porcentaje configurable que se descuenta de cada ticket vendido. Se calcula sobre el precio **final pagado** por el Comprador (después de descuentos). |
| **Promoción de eventos** | El Promotor paga un plan (Básico/Premium/Pro) para destacar su evento en la plataforma por un período de tiempo. |

> **Importante:** Los descuentos de códigos promocionales los absorbe el Promotor. TicketGo cobra su comisión sobre el precio efectivamente pagado.

---

## Orden de implementación recomendado

Las HUs tienen dependencias. Respetar este orden evita bloqueos:

1. **US-31 / TIC-567** — Comisiones: agrega `commission_amount` y `net_amount` a `Order`. Todo lo financiero depende de esto.
2. **US-26 / TIC-27 + US-27 / TIC-30 + US-28 / TIC-33** — Dashboards y reportes del Promotor.
3. **US-29 / TIC-34 + US-32 / TIC-566** — Vistas del Admin y SuperAdmin (reutilizan US-26).
4. **US-30 / TIC-35 + US-34 / TIC-570** — Códigos de descuento y promoción pagada.
5. **US-33 / TIC-36** — Exportación PDF/Excel (toca todos los reportes existentes).

---

## US-31 · TIC-567 · `US567` — Configuración de Comisiones de la Plataforma

> **Como** SuperAdmin, **quiero** configurar la comisión que cobra la plataforma por cada venta, **para** definir el modelo de negocio del sistema y poder ajustarlo según las necesidades comerciales.

**Épica:** TIC-45 Reportes y Finanzas | **Estimación:** 15h | **Estado:** 🟡 En curso (2/10 subtareas)

**Subtareas**

- **Backend - BD:** Crear tabla `PlatformCommission` con campos `id`, `commission_type` (porcentaje/fijo/hibrido), `percentage_value`, `fixed_value`, `is_active`, `valid_from`, `created_by`, `created_at` **[3h]**
- **Backend - BD:** Agregar campos `commission_amount` (DecimalField) y `net_amount` (DecimalField) al modelo `Order` para guardar histórico inmutable de cada venta **[2h]**
- **Backend:** Endpoint `GET /admin/platform/commission/current` que devuelva la configuración de comisión activa actual **[2h]**
- **Backend:** Endpoint `POST /admin/platform/commission` protegido con `IsSuperadmin` que cree una nueva configuración y desactive la anterior **[3h]**
- **Backend:** Servicio `CommissionService.aplicar()` invocado al crear una `Order` para calcular `commission_amount` y `net_amount` según la configuración activa, tomando como base el precio final pagado **[3h]**
- **Frontend:** Pantalla `ConfiguracionComisiones.jsx` en el panel SuperAdmin con radio buttons (Porcentaje / Fijo / Híbrido) e inputs numéricos **[2h]**

**Pruebas de Aceptación**

- **[PA]:** Dado que el SuperAdmin establece un porcentaje del 10%, cuando guarda la configuración, entonces todas las nuevas ventas aplican esa comisión sobre el precio final del ticket.
- **[PA]:** Dado que el SuperAdmin cambia la comisión al 10%, entonces las compras antiguas conservan su comisión original y solo las nuevas usan el 10% (histórico inmutable en Order).
- **[PA]:** Dado que un Promotor revisa sus ingresos, cuando ve el detalle de una venta, entonces puede ver el monto bruto, la comisión descontada por la plataforma y el monto neto que recibe.
- **[PA]:** Dado que un Administrador normal (no SuperAdmin) intenta acceder a la configuración de comisiones, cuando hace clic en la opción, entonces el sistema le muestra un mensaje de acceso denegado.

---

## US-26 · TIC-27 · `US27` — Dashboard Financiero General del Promotor

> **Como** Promotor, **quiero** visualizar un panel con las estadísticas financieras generales de todos mis eventos, **para** conocer mi desempeño global, saber cuánto recibo neto tras comisiones y tomar mejores decisiones de negocio.

**Épica:** TIC-45 Reportes y Finanzas | **Estimación:** 22h | **Estado:** 🟡 En curso (3/9 subtareas)

**Subtareas**

- **Backend - BD:** Crear consultas agregadas en `service-events` que sumen `ingresos_brutos`, `comisiones_totales` y `ingresos_netos` del promotor a partir de las tablas `Order` (campos `total`, `commission_amount`, `net_amount`) y `Event` filtradas por `promotor_id` **[3h]**
- **Backend:** Endpoint `GET /promotor/dashboard/summary` que retorne `ingresos_brutos`, `comisiones_totales`, `ingresos_netos`, `tickets_vendidos`, `eventos_activos` y `ocupacion_promedio` **[4h]**
- **Backend:** Endpoint `GET /promotor/dashboard/comparativa` que devuelva ingresos netos y ventas de los últimos 5 eventos del promotor **[3h]**
- **Frontend:** Componente `DashboardPromotor.jsx` con tres tarjetas KPI principales (Ingresos brutos / Comisión TicketGo / Tu ingreso neto) más métricas secundarias (ventas, eventos, ocupación) **[5h]**
- **Frontend:** Gráficas con `recharts` (BarChart comparativo entre eventos basado en monto neto, LineChart de ingresos netos por mes) **[4h]**
- **Frontend:** Tooltip explicativo "¿Cómo se calcula tu ingreso neto?" con la fórmula y el porcentaje de comisión vigente **[1h]**
- **Frontend:** Polling con `setInterval` cada 30 segundos para refrescar los datos del dashboard sin recarga manual **[2h]**

**Pruebas de Aceptación**

- **[PA]:** Dado que el Promotor accede a su panel financiero, cuando carga la pantalla, entonces se muestran los ingresos brutos, las comisiones descontadas por la plataforma y el ingreso neto en bolivianos.
- **[PA]:** Dado que el Promotor tiene varios eventos creados, cuando observa el dashboard, entonces puede ver una gráfica comparativa de ingresos netos entre sus últimos eventos.
- **[PA]:** Dado que el Promotor está viendo su dashboard, cuando ocurre una nueva venta, entonces los datos se actualizan automáticamente en máximo 30 segundos.
- **[PA]:** Dado que el Promotor quiere entender el cálculo, cuando pasa el cursor sobre el ícono de información, entonces ve una explicación clara del porcentaje de comisión vigente y cómo se calcula su ingreso neto.

---

## US-27 · TIC-30 · `US30` — Reporte Financiero por Evento

> **Como** Promotor, **quiero** ver un reporte detallado de cada uno de mis eventos con su desglose de comisiones, **para** conocer su desempeño individual real y optimizar mis próximas estrategias.

**Épica:** TIC-45 Reportes y Finanzas | **Estimación:** 18h | **Estado:** 🟡 En curso (1/9 subtareas)

**Subtareas**

- **Backend - BD:** Agregar campo `meta_ventas` (DecimalField, nullable) al modelo `Event` mediante migración Django **[1h]**
- **Backend:** Endpoint `GET /promotor/events/{event_id}/report` que retorne `ingresos_brutos`, `comisiones_descontadas`, `ingresos_netos`, `ingresos_por_tipo_entrada`, `ocupacion_porcentaje`, `meta_ventas` y `progreso_meta` **[5h]**
- **Backend:** Servicio `EventReportService.calcular_metricas()` con lógica de ocupación (`tickets_vendidos/capacidad_total*100`) y progreso de meta basado en ingresos netos **[2h]**
- **Frontend:** Pantalla `ReporteEvento.jsx` con tarjetas de métricas (bruto, comisión, neto) y barra de progreso de meta usando el ingreso neto **[5h]**
- **Frontend:** Gráfica `LineChart` de evolución de ventas con datos agrupados por día/semana usando `recharts` **[3h]**
- **Frontend:** Tabla mostrando ingresos desglosados por cada `TipoEntrada` con columnas: tipo, tickets vendidos, ingresos brutos, comisión, ingresos netos **[2h]**

**Pruebas de Aceptación**

- **[PA]:** Dado que el Promotor selecciona uno de sus eventos, cuando ingresa al reporte, entonces se muestran los ingresos brutos, la comisión total descontada, el ingreso neto y el porcentaje de ocupación.
- **[PA]:** Dado que el Promotor definió una meta de ventas, cuando visualiza el reporte, entonces aparece una barra de progreso indicando cuánto falta de su ingreso neto para alcanzarla.
- **[PA]:** Dado que el evento ofrece varios tipos de entrada, cuando el Promotor revisa el reporte, entonces ve las ventas, ingresos brutos, comisiones e ingresos netos separados por cada tipo de entrada.

---

## US-28 · TIC-33 · `US33` — Lista de Compradores por Evento

> **Como** Promotor, **quiero** ver la lista de compradores de cada uno de mis eventos, **para** conocer a mi audiencia, filtrarla y poder contactarlos en caso de cambios o cancelaciones.

**Épica:** TIC-45 Reportes y Finanzas | **Estimación:** 16h | **Estado:** 🟡 En curso (1/8 subtareas)

**Subtareas**

- **Backend:** Endpoint `GET /promotor/events/{event_id}/buyers` con paginación (`page_size=20`) y query params (`search`, `ticket_type`, `start_date`, `end_date`) **[4h]**
- **Backend:** Endpoint `GET /promotor/events/{event_id}/buyers/summary` que retorne `total_recaudado_bruto`, `total_recaudado_neto`, `total_compradores`, `total_entradas` **[2h]**
- **Backend:** Implementar búsqueda case-insensitive con `Q()` sobre `user__email` y `user__profile__full_name` con `icontains` **[3h]**
- **Frontend:** Componente `CompradoresEvento.jsx` con tabla paginada mostrando: nombre, correo, tipo de entrada, cantidad, monto pagado, código de descuento aplicado (si lo hubo) **[4h]**
- **Frontend:** Barra de búsqueda con `debounce` de 300ms y filtros (select de tipo entrada, date pickers para rango de fechas) **[3h]**

**Pruebas de Aceptación**

- **[PA]:** Dado que el Promotor accede a la lista de compradores de un evento, cuando se carga la pantalla, entonces puede ver el nombre, correo, tipo de entrada, monto pagado y código de descuento (si aplica) por cada comprador.
- **[PA]:** Dado que la lista contiene muchos compradores, cuando el Promotor escribe un nombre o correo en el buscador, entonces la tabla se filtra automáticamente.
- **[PA]:** Dado que el Promotor revisa la lista, cuando observa la parte superior, entonces puede ver un resumen con el total recaudado bruto, el total neto, la cantidad de compradores y las entradas vendidas.

---

## US-29 · TIC-34 · `US34` — Administrador Visualiza Dashboard Financiero del Promotor

> **Como** Administrador con permisos de reportes, **quiero** acceder al dashboard financiero de cualquier promotor, **para** supervisar el desempeño de la plataforma y detectar oportunidades o problemas.

**Épica:** TIC-45 Reportes y Finanzas | **Estimación:** 11h | **Estado:** 🟡 En curso (3/7 subtareas)

**Subtareas**

- **Backend:** Endpoint `GET /admin/promotors` protegido con `HasAdminCapability('view_reports')` que retorne lista de promotores activos con `id`, `email` y `nombre` **[3h]**
- **Backend:** Endpoint `GET /admin/promotors/{promotor_id}/dashboard` con la misma capability, reutilizando la lógica del servicio de US-26 **[2h]**
- **Frontend:** Pantalla `SeleccionPromotor.jsx` con dropdown/searchable select de promotores activos **[3h]**
- **Frontend:** Vista `DashboardPromotorAdmin.jsx` que reutiliza los componentes de US-26 con prop `readOnly=true` para deshabilitar acciones de edición **[3h]**

**Pruebas de Aceptación**

- **[PA]:** Dado que el Administrador tiene el permiso de "ver reportes", cuando entra a la sección "Dashboard de Promotores", entonces puede ver una lista de todos los promotores activos.
- **[PA]:** Dado que el Administrador selecciona un promotor, cuando ingresa a su dashboard, entonces puede ver toda la información financiera (brutos, comisiones, netos) en modo de solo lectura.
- **[PA]:** Dado que un Administrador no tiene el permiso de "ver reportes", cuando intenta acceder a la sección, entonces el sistema le muestra un mensaje de acceso denegado.

---

## US-32 · TIC-566 · `US566` — Dashboard Financiero Global del Sistema

> **Como** SuperAdmin o Administrador con permisos de reportes, **quiero** visualizar un dashboard con los ingresos totales de la plataforma (comisiones + promociones pagadas), **para** conocer el desempeño económico del negocio y tomar decisiones estratégicas.

**Épica:** TIC-45 Reportes y Finanzas | **Estimación:** 23h | **Estado:** 🟡 En curso (1/12 subtareas)

**Subtareas**

- **Backend - BD:** Crear consultas agregadas que sumen ingresos totales del sistema (comisiones de ventas + pagos por promoción) a partir de `Order.commission_amount` y `EventPromotion.amount_paid` **[3h]**
- **Backend:** Endpoint `GET /admin/dashboard/summary` que retorne `ingresos_comisiones`, `ingresos_promociones`, `total_sistema`, `tickets_vendidos`, `promotores_activos` **[4h]**
- **Backend:** Endpoint `GET /admin/dashboard/top-promotors` que retorne los 10 promotores que más ingresos han generado para la plataforma **[3h]**
- **Backend:** Endpoint `GET /admin/dashboard/evolution` que devuelva ingresos del sistema agrupados por mes para gráfica de evolución temporal **[3h]**
- **Backend:** Proteger los 3 endpoints con `HasAdminCapability('view_reports')` (SuperAdmin tiene bypass automático) **[1h]**
- **Frontend:** Componente `DashboardSistema.jsx` con KPIs globales (ingresos comisiones, ingresos promociones, total), gráfica PieChart de fuentes y tabla top promotores **[5h]**
- **Frontend:** Gráfica `LineChart` de evolución de ingresos del sistema por mes usando `recharts` **[3h]**
- **Frontend:** Filtros de fecha (selector de rango) y selector de vista (mensual/trimestral) en el dashboard global **[2h]**

**Pruebas de Aceptación**

- **[PA]:** Dado que el SuperAdmin entra al dashboard del sistema, cuando se carga la pantalla, entonces ve los ingresos totales de la plataforma en bolivianos desglosados en comisiones de ventas y promociones pagadas.
- **[PA]:** Dado que la plataforma tiene ingresos por ambas fuentes, cuando el SuperAdmin observa la gráfica circular, entonces ve el porcentaje que aporta cada fuente al ingreso total.
- **[PA]:** Dado que el SuperAdmin revisa el dashboard, cuando observa la sección de top promotores, entonces ve los 10 promotores que más ingresos han generado para la plataforma.
- **[PA]:** Dado que un Administrador con el permiso "view_reports" accede al sistema, cuando entra al dashboard global, entonces puede visualizar la información en modo de solo lectura.
- **[PA]:** Dado que un Administrador sin el permiso "view_reports" intenta acceder al dashboard global, cuando hace clic en la sección, entonces el sistema le muestra un mensaje de acceso denegado.

---

## US-30 · TIC-35 · `US35` — Códigos de Promoción y Descuentos

> **Como** Promotor, **quiero** crear códigos de descuento para mis eventos, **para** incentivar la venta anticipada y atraer más compradores con campañas promocionales. El costo del descuento lo absorbo yo, no la plataforma.

**Épica:** TIC-571 Marketing | **Estimación:** 24h | **Estado:** 🟡 En curso (3/14 subtareas)

**Subtareas**

- **Backend - BD:** Crear tabla `PromoCode` con campos `id`, `code` (unique), `event_id` (FK a Event), `discount_type` (porcentaje/fijo), `discount_value`, `max_uses`, `used_count`, `expires_at`, `is_active`, `created_at` **[3h]**
- **Backend - BD:** Agregar campo `promo_code_id` (FK nullable a PromoCode) y `discount_amount` (DecimalField) al modelo `Order` para registrar el código usado en cada compra **[2h]**
- **Backend:** Endpoints CRUD `/promotor/promo-codes` (`POST` crear, `GET` listar, `PATCH` editar, `DELETE` eliminar) con validación de unicidad del campo `code` **[4h]**
- **Backend:** Endpoint `POST /orders/validate-code` que valide el código (existe, no expirado, `used_count < max_uses`) y retorne el monto descontado y el precio final **[4h]**
- **Backend:** Modificar la creación de `Order` para que la comisión se calcule sobre el precio final (después de aplicar descuento) y para registrar `promo_code_id` y `discount_amount` **[2h]**
- **Backend:** Endpoint `GET /promotor/promo-codes/{id}/stats` que retorne `used_count`, `total_descontado` y `ultimos_usos` **[3h]**
- **Frontend:** Pantalla `GestionCodigos.jsx` con tabla de códigos y modal de creación (form con code, discount_value, expires_at, max_uses) **[4h]**
- **Frontend:** Input de código de descuento en el checkout con validación en tiempo real al hacer `onBlur` y consumo de `/orders/validate-code` **[2h]**
- **Frontend:** Componente `ResumenCompra` actualizado para mostrar el descuento aplicado y el precio final con el descuento restado **[2h]**

**Pruebas de Aceptación**

- **[PA]:** Dado que el Promotor está gestionando un evento, cuando crea un código de descuento con un valor del 20% y un límite de 50 usos, entonces el código queda activo y disponible para sus compradores.
- **[PA]:** Dado que un Comprador está en la pantalla de pago, cuando ingresa un código válido, entonces el sistema aplica el descuento y muestra el nuevo precio total a pagar.
- **[PA]:** Dado que un código alcanzó su límite máximo de usos, cuando un Comprador intenta usarlo, entonces el sistema muestra un mensaje indicando que el código ya no está disponible.
- **[PA]:** Dado que se aplica un descuento en una compra, cuando el sistema calcula la comisión de la plataforma, entonces la calcula sobre el precio final pagado por el Comprador (después del descuento), no sobre el precio original.
- **[PA]:** Dado que el Promotor revisa sus códigos, cuando entra al panel de códigos, entonces puede ver cuántas veces fue usado cada uno y el total descontado en bolivianos.

---

## US-34 · TIC-570 · `US570` — Promoción de Eventos Destacados (Publicidad Pagada)

> **Como** Promotor, **quiero** pagar para destacar mi evento en la plataforma, **para** aumentar su visibilidad y vender más entradas, generando además ingresos adicionales para TicketGo.

**Épica:** TIC-571 Marketing | **Estimación:** 22h | **Estado:** 🟡 En curso (2/15 subtareas)

**Subtareas**

- **Backend - BD:** Crear tabla `PromotionPlan` con campos `id`, `name` (Básico/Premium/Pro), `price`, `duration_days`, `benefits` (JSONField), `is_active` **[2h]**
- **Backend - BD:** Crear tabla `EventPromotion` con campos `id`, `event_id` (FK), `plan_id` (FK), `amount_paid`, `starts_at`, `ends_at`, `payment_status`, `created_at` **[3h]**
- **Backend:** Endpoint `GET /promotor/promotion-plans` que retorne los planes disponibles activos **[2h]**
- **Backend:** Endpoint `POST /promotor/events/{id}/promote` que cree una promoción pendiente de pago según el plan elegido **[3h]**
- **Backend:** Endpoint `POST /promotor/events/{id}/promote/confirm-payment` que confirme el pago QR y active la promoción **[2h]**
- **Backend:** Modificar `EventViewSet.get_queryset` para ordenar eventos con promoción activa primero **[2h]**
- **Backend:** Cron job diario en `service-events` que desactive promociones expiradas (`ends_at < now()`) **[2h]**
- **Frontend:** Pantalla `PromocionarEvento.jsx` con tarjetas de planes y selector **[3h]**
- **Frontend:** Integración con el flujo de pago QR existente para confirmar el pago **[2h]**
- **Frontend:** Badge visual "⭐ Destacado" en cards de eventos promocionados (con estilo distintivo según plan) **[1h]**

**Pruebas de Aceptación**

- **[PA]:** Dado que el Promotor está gestionando un evento, cuando selecciona "Promocionar evento", entonces ve los planes disponibles con sus precios, duración y beneficios.
- **[PA]:** Dado que el Promotor elige un plan y completa el pago, cuando finaliza la transacción, entonces su evento aparece destacado en la home por la duración contratada.
- **[PA]:** Dado que un Comprador navega la sección de eventos, cuando visualiza la lista, entonces ve primero los eventos promocionados con un badge "Destacado".
- **[PA]:** Dado que la promoción de un evento llegó a su fecha de finalización, cuando se ejecuta el proceso automático del día, entonces el evento deja de aparecer destacado.
- **[PA]:** Dado que el Promotor revisa su panel, cuando ingresa a "Mis promociones", entonces puede ver todas sus promociones activas con fecha de inicio, fecha de fin y plan contratado.

---

## US-33 · TIC-36 · `US36` — Exportar Reportes a PDF y Excel

> **Como** Promotor, Administrador o SuperAdmin, **quiero** exportar mis reportes financieros a PDF o Excel, **para** archivarlos, compartirlos con socios o presentarlos en reuniones de negocio.

**Épica:** TIC-45 Reportes y Finanzas | **Estimación:** 14h | **Estado:** 🟡 En curso (2/9 subtareas)

**Subtareas**

- **Backend:** Endpoint `GET /promotor/events/{id}/export/excel` que genere archivo `.xlsx` con la librería `openpyxl` conteniendo hojas de ventas, compradores, comisiones y métricas **[4h]**
- **Backend:** Endpoint `GET /promotor/events/{id}/export/pdf` que genere PDF con `reportlab` incluyendo gráficas renderizadas y datos resumidos (brutos, comisiones, netos) **[5h]**
- **Frontend:** Botones "Exportar PDF" y "Exportar Excel" en `DashboardPromotor.jsx` que disparen `window.open()` con la URL del endpoint **[2h]**
- **Frontend:** Botones de exportación en `ReporteEvento.jsx` y `DashboardSistema.jsx` con el mismo flujo de descarga via blob **[2h]**
- **Frontend:** Spinner global durante la descarga (estado `isExporting`) con `try/catch` para mostrar `toast` de error si la generación falla **[1h]**

**Pruebas de Aceptación**

- **[PA]:** Dado que el Promotor está en su dashboard financiero, cuando presiona "Exportar PDF", entonces se descarga un archivo con las métricas, gráficas y desglose de comisiones del panel.
- **[PA]:** Dado que el Promotor revisa el reporte de un evento, cuando presiona "Exportar Excel", entonces se descarga una hoja de cálculo con el detalle de ventas, ingresos brutos, comisiones, netos y compradores.
- **[PA]:** Dado que el SuperAdmin está en el dashboard global del sistema, cuando exporta el reporte, entonces obtiene un archivo con los ingresos totales de la plataforma desglosados por fuente.
- **[PA]:** Dado que el sistema está generando un reporte, cuando el usuario hace clic en exportar, entonces se muestra un indicador de carga mientras se procesa el archivo.

---

## Notas técnicas

- **Tablas nuevas** — todas van en `service-events` (events_db). No se crea ningún microservicio nuevo.
- **US-31 es la fundación** — los campos `commission_amount` y `net_amount` de `Order` deben existir antes de arrancar US-26, US-27 y US-32.
- **Comisión inmutable** — una vez guardada en `Order`, no cambia aunque el SuperAdmin modifique la configuración. Preserva la trazabilidad histórica.
- **Descuento vs Comisión** — el descuento se aplica primero; la comisión se calcula sobre el precio ya descontado. El Promotor absorbe el descuento.
- **Permisos reutilizados** — `view_reports` (US-29, US-32) e `IsSuperadmin` (US-31) ya existen desde Sprint 4 (TIC-398/445). No requieren cambios en `service-auth`.
- **Deuda técnica pendiente** — US-21 (Recomendaciones) y US-22 (Notificaciones) documentadas en [DEUDA_TECNICA.md](../DEUDA_TECNICA.md).
