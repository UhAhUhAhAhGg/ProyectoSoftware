# HS-16 — Seguridad de Sesión y JWT

> **Estado:** ✅ COMPLETADA — Mergeada a `Sprint3_DEV`
> **Rama:** `US16`
> **TICs:** TIC-320, TIC-321, TIC-322

---

## 📖 Historia de Usuario

> Como usuario, quiero que mi sesión sea segura y se cierre sola si me olvido, para evitar que otros usen mi cuenta en equipos públicos.

---

## ✅ Implementado

### 1. Configuración de JWT (`service-auth`)
- `ACCESS_TOKEN_LIFETIME` ajustado a **5 minutos** para facilitar pruebas
- `REFRESH_TOKEN_LIFETIME` en 1 día

### 2. Gestión de Inactividad (`frontend/src/context/AuthContext.jsx`)
- Timer de inactividad que detecta mouse y teclado
- **A los 8 minutos** sin actividad: muestra modal de advertencia con cronómetro regresivo de 2 min
- **A los 10 minutos**: cierra sesión automáticamente y limpia `localStorage`
- **Auto-dismiss:** si el usuario mueve el mouse mientras el modal está activo, el modal se cierra y el token se renueva

### 3. Renovación automática de token (`frontend/src/services/apiHelper.js`)
- `refreshAccessToken()` exportable para uso externo
- Integrado en `AuthContext` para renovar silenciosamente cuando el usuario hace clic en "Continuar"

### 4. Corrección de bug crítico (`frontend/src/pages/Dashboard.jsx`)
- Se eliminó un `setTimeout` hardcodeado de 60 segundos que forzaba el logout prematuro

---

## 📂 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `service-auth/auth_config/settings.py` | JWT lifetime ajustado |
| `frontend/src/context/AuthContext.jsx` | Lógica de inactividad, modal, cronómetro, auto-dismiss |
| `frontend/src/services/apiHelper.js` | Export de `refreshAccessToken` |
| `frontend/src/pages/Dashboard.jsx` | Eliminación del timer hardcodeado |

---

## 🧪 Cómo Probar

1. Hacer login con cualquier usuario
2. No interactuar con la pantalla durante 8 minutos
3. Verificar que aparece el modal de advertencia con cronómetro
4. **Caso A:** Hacer clic en "Continuar" → la sesión se renueva sin recargar
5. **Caso B:** Mover el mouse → el modal desaparece automáticamente
6. **Caso C:** No hacer nada → a los 10 min se redirige a `/login`
