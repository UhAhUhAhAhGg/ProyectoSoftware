# 🔧 Deuda técnica conocida

Este documento registra **funcionalidades implementadas pero no validadas en demo** o con limitaciones conocidas. Sirve como contrato explícito con el equipo: estos puntos están sobre la mesa para revisarse cuando el sistema se despliegue en producción.

> Última actualización: cierre del Sprint 4.

---

## 🟡 US-21 — Recomendaciones de eventos

**Estado**: implementada pero **no validada end-to-end**.

### Lo que existe

**Backend** ([service-events/events/](../service-events/events/)):
- Modelos `UserBehavior`, `UserPreference`, `UserFavorite` (migración 0018, 0021).
- Endpoints:
  - `GET /api/v1/my-recommendations/` — recomendaciones personalizadas
  - `GET /api/v1/users/{id}/favorites/` — favoritos
  - `POST /api/v1/users/{id}/favorites/{event_id}/` — toggle favorito
  - `GET /api/v1/users/{id}/recommendations/` — lista
- Algoritmo basado en categoría favorita y comportamiento de compra.

**Frontend**:
- [`Recommendations.jsx`](../frontend/src/components/dashboard/eventos/Recommendations.jsx)
- [`FavoritesContext.jsx`](../frontend/src/context/FavoritesContext.jsx)
- [`FavoriteButton.jsx`](../frontend/src/components/FavoriteButton.jsx)
- [`recommendationsService.js`](../frontend/src/services/recommendationsService.js)

### Por qué es deuda técnica

- No se validó con flujo real de usuario en demo (comprar varios eventos → verificar que las recomendaciones cambian de forma coherente).
- Posible inconsistencia: el algoritmo asume categorías favoritas que el usuario marca explícitamente, pero el frontend puede no estar pasando ese tracking en todos los puntos.
- No hay tests automatizados que verifiquen el ranking.

### Cómo validar cuando se despliegue

1. Login como Comprador con cuenta limpia.
2. Marcar 2-3 eventos como favoritos (de categoría Música).
3. Comprar uno de ellos.
4. Volver al home / "Explorar Eventos" → la sección "Recomendaciones para ti" debe priorizar eventos de Música.
5. Verificar con DevTools que el endpoint `/my-recommendations/` se llama y devuelve resultados ordenados.

**Documentación de referencia**:
- [RECOMMENDATIONS_INTEGRATION_GUIDE.md](sprint-4/RECOMMENDATIONS_INTEGRATION_GUIDE.md)
- [RECOMMENDATIONS_EXAMPLES.md](sprint-4/RECOMMENDATIONS_EXAMPLES.md)

---

## 🟡 US-22 — Notificaciones cuando un evento haga "match" con el perfil

**Estado**: infraestructura implementada pero **trigger de match no validado**.

### Lo que existe

**Backend** ([service-events/events/](../service-events/events/)):
- Modelos `Notification`, `NotificationPreference` (migraciones 0018, 0022, 0023).
- Endpoints:
  - `GET /api/v1/users/{id}/notifications/` — listar
  - `PATCH /api/v1/users/{id}/notifications/{notif_id}/read/` — marcar leída
  - `PATCH /api/v1/users/{id}/notifications/read-all/` — todas leídas
  - `GET/PATCH /api/v1/users/{id}/notification-preferences/` — preferencias
- Signal automático al crear un evento que dispara notificaciones a usuarios con preferencias matcheadas.

**Frontend**:
- [`NotificationContext.jsx`](../frontend/src/context/NotificationContext.jsx)
- [`NotificationPreferences.jsx`](../frontend/src/components/NotificationPreferences.jsx)
- [`notificationService.js`](../frontend/src/services/notificationService.js)
- Campana en el header con contador de no-leídas.

### Por qué es deuda técnica

- El "match" entre un nuevo evento y las preferencias del usuario **no se validó end-to-end** en demo. La lógica del signal puede ejecutarse pero no se verificó que efectivamente cree el registro `Notification` con el contenido correcto.
- Las preferencias del usuario (categorías + canales) se persisten, pero no se probó la sincronía completa "Promotor publica evento → Comprador recibe notif en su campana en tiempo real".
- No hay envío de email/push automático por match — el plan original incluía esto pero quedó solo la notificación in-app.

### Cómo validar cuando se despliegue

1. Login como Comprador → "Mi perfil → Preferencias de notificación".
2. Activar categoría "Música" en canal "In-app".
3. En otra pestaña, login como Promotor → crear evento de categoría Música → publicar.
4. Volver al Comprador → la campana debe mostrar +1 sin recargar (o tras un refresh manual).
5. Verificar la notificación con el evento que coincide.

**Documentación de referencia**:
- [NOTIFICATIONS_IMPLEMENTATION.md](sprint-4/NOTIFICATIONS_IMPLEMENTATION.md)
- [NOTIFICACIONES_PRUEBAS.md](sprint-4/NOTIFICACIONES_PRUEBAS.md)
- [NOTIFICACIONES_QUICK_TEST.md](sprint-4/NOTIFICACIONES_QUICK_TEST.md)

---

## 🟢 Sprint 4 — Lo que SÍ se validó

Para evitar ambigüedad, estos son los items del Sprint 4 que están **probados manualmente y funcionando**:

- **US-23**: suspender/reactivar/baja de Compradores y Promotores con motivo + auditoría + bloqueo de sesión activa.
- **US-24**: panel SuperAdmin, creación de admins, modificación de permisos granulares, aplicación inmediata vía polling, bypass del SuperAdmin, sanitización de capabilities (`manage_admins` filtrado).
- **US-25**: edición y baja de eventos por admin con vista completa (mismo formulario del Promotor + Control Administrativo).
- **US-26**: auditoría unificada con tipo Evento/Usuario, filtros, exportar CSV.

---

## 📌 Acción recomendada antes de producción

1. **Probar US-21**: con cuenta limpia, generar comportamiento de usuario y verificar que `/my-recommendations/` ordena coherentemente.
2. **Probar US-22**: validar el signal de match revisando que `Notification` se crea cuando un Promotor publica un evento que coincide con preferencias activas.
3. Si encuentras bugs, abrir tickets en Jira con prefijo `[DT-S4]` (Deuda Técnica Sprint 4).
4. Una vez validados, mover los items a "verde" en este documento y borrar la entrada.
