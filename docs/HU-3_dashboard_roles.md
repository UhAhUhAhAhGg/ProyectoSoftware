# HU-3: Navegación por Roles — Documentación Técnica

## 1. Resumen
Implementación de la lógica de acceso y visualización diferenciada para los perfiles de **Comprador** y **Promotor**. El sistema garantiza que cada usuario visualice únicamente las herramientas y opciones correspondientes a su nivel de permisos tras el inicio de sesión.

---

## 2. Justificación de Cumplimiento (Tickets Jira)

| Ticket | Subtarea | Justificación Técnica |
|:---|:---|:---|
| **TIC-158**| [Backend] Servicio de info de usuario | Se habilitó el endpoint `@action me` en `UserViewSet`, el cual retorna el correo y el rol exacto del usuario autenticado. |
| **TIC-159**| [Backend] Protección de perfil | El endpoint `/me` utiliza la clase de permiso `IsAuthenticated` de DRF, bloqueando cualquier consulta de usuarios no logueados. |
| **TIC-160**| [Frontend] Pedir info al abrir panel | El componente `Dashboard.jsx` invoca automáticamente al hook `useAuth()`, el cual recupera la sesión y los datos del usuario del estado global. |
| **TIC-161**| [Frontend] Leer tipo para decidir opciones | `AuthContext.jsx` procesa el campo `user.role` y expone las variables booleanas `isComprador` y `isPromotor`. |
| **TIC-162**| [UI] Opciones de Comprador | Se desarrolló el componente `OpcionesComprador.jsx` con el catálogo visual de acciones (Explorar, Mis Boletos). |
| **TIC-163**| [UI] Ocultar botón "Crear Evento" | Implementado mediante renderizado condicional: `{isPromotor && <OpcionesPromotor />}`. Un comprador nunca ve el código del panel de promotor. |
| **TIC-164**| [UI] Panel de Promotor | Se desarrolló el componente `OpcionesPromotor.jsx` con el set de herramientas para gestión de eventos y ventas. |
| **TIC-165**| [Frontend] Cambio automático de panel | La UI es reactiva; si un usuario cambia su sesión o rol, el `Dashboard` se vuelve a renderizar para mostrar el contenido correcto de inmediato. |
| **TIC-166**| [Frontend] Redigir si no hay permiso | Un `useEffect` en `Dashboard.jsx` verifica la autenticación y ejecuta `navigate('/login')` si no hay un token válido presente. |
| **TIC-169**| [Frontend] Limpieza al salir | La función `logout` en el contexto elimina los tokens del `localStorage`, resetea el estado del usuario y redirige al inicio. |

## 3. Guía de Prueba (Verificación Manual)

Para comprobar que la **HU-3** está completa, sigue estos pasos:

### Escenario A: Acceso como Comprador
1. Inicia sesión con una cuenta de rol `Comprador` (ej. `comprador@test.com`).
2. **Verificación:** El título del dashboard debe decir **"Panel de Comprador"**.
3. **Verificación:** Debes visualizar opciones como "Explorar Eventos" y "Mis Boletos".
4. **Verificación:** El botón de "Crear Evento" debe estar oculto.

### Escenario B: Acceso como Promotor
1. Inicia sesión con una cuenta de rol `Promotor` (ej. `promotor@test.com`).
2. **Verificación:** El título del dashboard debe decir **"Panel de Promotor"**.
3. **Verificación:** Debes visualizar la opción "Crear Nuevo Evento" y la gestión de ventas.

### Escenario C: Seguridad de Navegación
1. Cierra sesión (Logout).
2. Intenta ingresar directamente a `http://localhost:3000/dashboard` escribiendo la URL.
3. **Resultado esperado:** El sistema debe detectar la falta de token y redirigirte automáticamente a `/login`.

---

## 4. Estructura de Navegación
El sistema utiliza una división clara en el `App.jsx` y `Dashboard.jsx` para gestionar las rutas internas. Aunque los botones visuales ya están en su lugar, la funcionalidad extendida (lógica de negocio) de cada botón se delegará a las HU-7, HU-8 y HU-12 respectivamente.
