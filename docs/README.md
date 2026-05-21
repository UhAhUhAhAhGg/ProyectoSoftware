# 📚 Documentación de TicketGo / ProyectoSoftware

Toda la documentación del proyecto está organizada por sprint. Si recién llegas al proyecto, empieza por [architecture/](./architecture/) y luego entra al sprint correspondiente.

> 🔧 **Antes de desplegar a producción** revisa [DEUDA_TECNICA.md](./DEUDA_TECNICA.md) — registra US-21 y US-22 como pendientes de validación end-to-end.

## 🗺️ Organización

| Carpeta | Contenido |
|---|---|
| [DEUDA_TECNICA.md](./DEUDA_TECNICA.md) | Items implementados pero no validados (US-21, US-22) |
| [architecture/](./architecture/) | Estructura de archivos, referencia de API, BD, guías técnicas transversales |
| [sprint-1/](./sprint-1/) | HU-1 a HU-8: registro, login, dashboard por rol, admin, gestión de eventos básica |
| [sprint-2/](./sprint-2/) | HU-9 a HU-32: explorar, comprar, pago QR, perfil, historial, eliminación de cuenta |
| [sprint-3/](./sprint-3/) | US11-US20: mapa de asientos, cola virtual, timeout de sesión, cron barrendero |
| [sprint-4/](./sprint-4/) | US21-US26: recomendaciones, notificaciones, gestión de usuarios, SuperAdmin, edición de eventos por admin, auditoría |
| [sprint-5/](./sprint-5/) | **Propuesta de cierre**: dashboard financiero, validación QR en puerta, códigos promo, evidencia RNF |

---

## 🏛️ architecture/

Referencias técnicas que no pertenecen a una HU específica.

| Archivo | Descripción |
|---|---|
| [FILE_STRUCTURE.md](./architecture/FILE_STRUCTURE.md) | Árbol de archivos del proyecto |
| [DATABASE_API_DOCUMENTATION.md](./architecture/DATABASE_API_DOCUMENTATION.md) | Modelos y endpoints expuestos |
| [API_parametros_consulta.md](./architecture/API_parametros_consulta.md) | Filtros y parámetros aceptados |
| [SWAGGER_SETUP_GUIDE.md](./architecture/SWAGGER_SETUP_GUIDE.md) | Cómo levantar Swagger UI |
| [FRONTEND_QUICK_REFERENCE.md](./architecture/FRONTEND_QUICK_REFERENCE.md) | Patrones del frontend |
| [GUIA_GENERAL.md](./architecture/GUIA_GENERAL.md) | Guía general del proyecto |
| [IMPLEMENTATION_CHECKLIST.md](./architecture/IMPLEMENTATION_CHECKLIST.md) | Checklist de implementación histórico |

---

## 🚀 sprint-1/ — Bases del sistema

| HU | Archivo | Tema |
|---|---|---|
| HU-1 | [HU-1_registro.md](./sprint-1/HU-1_registro.md) | Registro de usuarios |
| HU-2 | [HU-2_login.md](./sprint-1/HU-2_login.md) | Inicio de sesión |
| HU-3 | [HU-3_dashboard_roles.md](./sprint-1/HU-3_dashboard_roles.md) | Dashboard diferenciado por rol |
| HU-4 | [HU-4_administrador.md](./sprint-1/HU-4_administrador.md) | Flujo de Administrador |
| HU-5 | [HU-5_seguridad_roles.md](./sprint-1/HU-5_seguridad_roles.md) | Seguridad de roles |
| HU-6 | [HU-6_recuperacion_password.md](./sprint-1/HU-6_recuperacion_password.md) | Recuperación de contraseña |
| HU-7 | [HU-7_gestion_eventos.md](./sprint-1/HU-7_gestion_eventos.md) | Gestión de eventos por Promotor |
| HU-8 | [HU-8_gestion_entradas.md](./sprint-1/HU-8_gestion_entradas.md) | Tipos de entrada |

---

## 🎟️ sprint-2/ — Compra y experiencia del comprador

| HU | Archivo | Tema |
|---|---|---|
| HU-9 | [HU-9_explorar_eventos.md](./sprint-2/HU-9_explorar_eventos.md) | Explorar catálogo |
| HU-10 | [HU-10_seleccion_entradas.md](./sprint-2/HU-10_seleccion_entradas.md) | Selección de tipo de entrada |
| HU-12 | [HU-12_explorar_eventos.md](./sprint-2/HU-12_explorar_eventos.md) | Búsqueda y filtros |
| HU-13 | [HU-13_compra_unica.md](./sprint-2/HU-13_compra_unica.md) | Compra única por evento |
| HU-15 | [HU-15_mis_entradas.md](./sprint-2/HU-15_mis_entradas.md) | Mis entradas |
| HU-17 | [HU-17_pago_qr.md](./sprint-2/HU-17_pago_qr.md) | Pago con QR + email |
| HU-28 | [HU-28_perfil_usuario.md](./sprint-2/HU-28_perfil_usuario.md) | Editar perfil |
| HU-29 | [HU-29_eliminar_cuenta.md](./sprint-2/HU-29_eliminar_cuenta.md) | Eliminar cuenta voluntariamente |
| HU-31 | [HU-31_seguridad_contrasenas.md](./sprint-2/HU-31_seguridad_contrasenas.md) | Validación de contraseñas |
| HU-32 | [HU-32_historial_compras.md](./sprint-2/HU-32_historial_compras.md) | Historial de compras |
| — | [SEAT_MAP_API.md](./sprint-2/SEAT_MAP_API.md) | API de asientos (preludio US11) |
| — | [api_event_cancellations.md](./sprint-2/api_event_cancellations.md) | Cancelación de eventos |

---

## 🎫 sprint-3/ — Asientos y cola virtual

| US | Archivo | Tema |
|---|---|---|
| US-11 | [US11_SEAT_MAP_IMPLEMENTATION.md](./sprint-3/US11_SEAT_MAP_IMPLEMENTATION.md) | Mapa de asientos |
| US-14 | [US14_service_queue_bootstrap.md](./sprint-3/US14_service_queue_bootstrap.md) | Bootstrap del microservicio de cola |
| US-16 | [US16_timeout_sesion.md](./sprint-3/US16_timeout_sesion.md) | Timeout de sesión |
| US-18 | [US18_activar_cola_virtual.md](./sprint-3/US18_activar_cola_virtual.md) | Activar la cola virtual |
| US-19 | [US19_posicion_eta_cola.md](./sprint-3/US19_posicion_eta_cola.md) | Posición y ETA en cola |
| US-20 | [US20_barrendero_cron_job.md](./sprint-3/US20_barrendero_cron_job.md) | Cron job de liberación de asientos |

---

## 🛡️ sprint-4/ — Personalización + Administración

| US | Estado | Archivos |
|---|---|---|
| US-21 — Recomendaciones y favoritos | 🟡 [Deuda técnica](./DEUDA_TECNICA.md#-us-21--recomendaciones-de-eventos) | [RECOMMENDATIONS_INTEGRATION_GUIDE.md](./sprint-4/RECOMMENDATIONS_INTEGRATION_GUIDE.md), [RECOMMENDATIONS_EXAMPLES.md](./sprint-4/RECOMMENDATIONS_EXAMPLES.md) |
| US-22 — Notificaciones y preferencias | 🟡 [Deuda técnica](./DEUDA_TECNICA.md#-us-22--notificaciones-cuando-un-evento-haga-match-con-el-perfil) | [NOTIFICATIONS_IMPLEMENTATION.md](./sprint-4/NOTIFICATIONS_IMPLEMENTATION.md), [NOTIFICACIONES_PRUEBAS.md](./sprint-4/NOTIFICACIONES_PRUEBAS.md), [NOTIFICACIONES_QUICK_TEST.md](./sprint-4/NOTIFICACIONES_QUICK_TEST.md) |
| US-23 — Gestión de usuarios (admin) | 🟢 Validada | [US23_gestion_usuarios.md](./sprint-4/US23_gestion_usuarios.md) |
| US-24 — Panel SuperAdmin + permisos granulares | 🟢 Validada | [US24_permisos_granulares.md](./sprint-4/US24_permisos_granulares.md) |
| US-25 — Edición / baja de eventos por admin | 🟢 Validada | [US25_admin_eventos.md](./sprint-4/US25_admin_eventos.md) |
| US-26 — Auditoría unificada | 🟢 Validada | [US26_auditoria.md](./sprint-4/US26_auditoria.md) |
