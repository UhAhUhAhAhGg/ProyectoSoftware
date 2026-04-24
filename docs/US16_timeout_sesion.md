# 🔐 US16 — Timeout de Sesión por Inactividad

> **Estado:** ⏳ PENDIENTE — Independiente, se puede trabajar en cualquier momento
> **Rama:** Crear `feature/US16-timeout-sesion` partiendo de `Sprint3_DEV`
> **Story Points:** 8 SP | **Microservicio principal:** `service-auth` + Frontend
> **Nota:** No depende de ninguna otra HU del Sprint. Se puede desarrollar en paralelo.

---

## 📖 Historia de Usuario

> Como usuario, quiero que el sistema cierre automáticamente mi sesión tras un período de inactividad, para proteger mi cuenta en caso de que olvide cerrar sesión.

---

## 📋 Prerequisitos antes de empezar

No hay dependencias con otras HUs del Sprint. Puede empezarse en cualquier momento.

```bash
git checkout Sprint3_DEV
git pull origin Sprint3_DEV
git checkout -b feature/US16-timeout-sesion
```

---

## 🏗️ Plan de Implementación

### Paso 1 — Backend: Configurar JWT con expiración más corta (`service-auth`)

**Archivo:** `service-auth/auth_config/settings.py`

Buscar la sección `SIMPLE_JWT` y ajustar los tiempos:

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),   # Token expira en 30 min
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,                     # Al refrescar, genera nuevo refresh token
    'BLACKLIST_AFTER_ROTATION': True,                  # El refresh viejo queda inválido
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
}
```

> **Nota:** Los demás microservicios (`service-events`, `service-queue`) solo validan el token, no lo generan. Solo `service-auth` necesita este cambio.

### Paso 2 — Backend: Endpoint de renovación de token (`service-auth`)

**Archivo:** Verificar si ya existe un endpoint de refresh. En `service-auth/auth/urls.py` buscar:

```python
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # ...
    path('auth/refresh-token/', TokenRefreshView.as_view(), name='token-refresh'),
]
```

Si no existe, añadirlo. SimpleJWT provee `TokenRefreshView` listo para usar.

**Cómo funciona:**
```
POST /api/v1/auth/refresh-token/
Body: { "refresh": "<refresh_token>" }
Respuesta: { "access": "<nuevo_access_token>" }
```

### Paso 3 — Frontend: Detector de inactividad

**Archivo nuevo:** `frontend/src/hooks/useInactivityTimer.js`

Este hook monitorea la actividad del usuario (mouse, teclado, scroll, toques) y dispara el flujo de advertencia/logout.

```javascript
import { useEffect, useRef, useCallback } from 'react';

const INACTIVITY_TIMEOUT_MS = 28 * 60 * 1000;  // 28 minutos → mostrar advertencia
const WARNING_DURATION_MS = 2 * 60 * 1000;      // 2 minutos para responder

export function useInactivityTimer({ onWarning, onLogout }) {
    const inactivityTimer = useRef(null);
    const logoutTimer = useRef(null);

    const resetTimer = useCallback(() => {
        // Limpiar timers existentes
        clearTimeout(inactivityTimer.current);
        clearTimeout(logoutTimer.current);

        // Iniciar nuevo timer de inactividad
        inactivityTimer.current = setTimeout(() => {
            // Mostrar modal de advertencia
            onWarning();
            // Si no responde en 2 min → logout automático
            logoutTimer.current = setTimeout(onLogout, WARNING_DURATION_MS);
        }, INACTIVITY_TIMEOUT_MS);
    }, [onWarning, onLogout]);

    useEffect(() => {
        const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(event => window.addEventListener(event, resetTimer));
        resetTimer(); // Iniciar al montar

        return () => {
            events.forEach(event => window.removeEventListener(event, resetTimer));
            clearTimeout(inactivityTimer.current);
            clearTimeout(logoutTimer.current);
        };
    }, [resetTimer]);

    return { resetTimer };
}
```

### Paso 4 — Frontend: Modal de advertencia de sesión

**Archivo nuevo:** `frontend/src/components/common/SessionWarningModal.jsx`

```jsx
// Estructura visual:
// ┌─────────────────────────────────────────────┐
// │  ⚠️  Tu sesión está a punto de expirar      │
// │                                             │
// │  Por inactividad, tu sesión se cerrará en:  │
// │                                             │
// │              01:45                          │  ← Contador regresivo
// │                                             │
// │  [  Continuar sesión  ]  [  Cerrar sesión  ]│
// └─────────────────────────────────────────────┘

import { useState, useEffect } from 'react';

export function SessionWarningModal({ onContinue, onLogout, visible }) {
    const [secondsLeft, setSecondsLeft] = useState(120); // 2 minutos

    useEffect(() => {
        if (!visible) return;
        const interval = setInterval(() => {
            setSecondsLeft(s => {
                if (s <= 1) {
                    clearInterval(interval);
                    onLogout();
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [visible, onLogout]);

    if (!visible) return null;

    const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
    const secs = (secondsLeft % 60).toString().padStart(2, '0');

    return (
        <div className="session-warning-overlay">
            <div className="session-warning-modal">
                <h2>⚠️ Tu sesión está a punto de expirar</h2>
                <p>Por inactividad, tu sesión se cerrará en:</p>
                <div className="countdown">{mins}:{secs}</div>
                <div className="session-warning-actions">
                    <button onClick={onContinue} className="btn-continue">
                        Continuar sesión
                    </button>
                    <button onClick={onLogout} className="btn-logout">
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </div>
    );
}
```

### Paso 5 — Frontend: Renovar token al hacer clic en "Continuar"

**Archivo:** `frontend/src/services/authService.js` (añadir función)

```javascript
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

export async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token available');

    const resp = await fetch(`${AUTH_URL}/api/v1/auth/refresh-token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken })
    });

    if (!resp.ok) throw new Error('Refresh token inválido o expirado');

    const data = await resp.json();
    localStorage.setItem('token', data.access);
    return data.access;
}
```

### Paso 6 — Frontend: Integrar en el layout principal

**Archivo:** `frontend/src/pages/Dashboard.jsx` (o el componente raíz que envuelve las páginas autenticadas)

```jsx
import { useInactivityTimer } from '../hooks/useInactivityTimer';
import { SessionWarningModal } from '../components/common/SessionWarningModal';
import { refreshAccessToken } from '../services/authService';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
    const [showWarning, setShowWarning] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        // Limpiar localStorage completamente
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleContinue = async () => {
        try {
            await refreshAccessToken();
            setShowWarning(false);
        } catch {
            handleLogout();
        }
    };

    useInactivityTimer({
        onWarning: () => setShowWarning(true),
        onLogout: handleLogout
    });

    return (
        <>
            <SessionWarningModal
                visible={showWarning}
                onContinue={handleContinue}
                onLogout={handleLogout}
            />
            {/* El resto del Dashboard */}
        </>
    );
}
```

### Paso 7 — Frontend: Interceptor de 401 automático

En `frontend/src/services/apiHelper.js`, añadir interceptor para manejar tokens expirados:

```javascript
export async function apiFetch(url, options = {}) {
    let response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            ...options.headers
        }
    });

    // Si el token expiró → intentar renovar una vez
    if (response.status === 401) {
        try {
            await refreshAccessToken();
            response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    ...options.headers
                }
            });
        } catch {
            // Refresh también falló → limpiar sesión
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
        }
    }

    return response;
}
```

---

## 🛠️ Archivos a crear/modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `service-auth/auth_config/settings.py` | MODIFICAR | Ajustar `ACCESS_TOKEN_LIFETIME` a 30 min |
| `service-auth/auth/urls.py` | MODIFICAR | Asegurar que `/auth/refresh-token/` existe |
| `frontend/src/hooks/useInactivityTimer.js` | NUEVO | Hook de detección de inactividad |
| `frontend/src/components/common/SessionWarningModal.jsx` | NUEVO | Modal de advertencia con countdown |
| `frontend/src/components/common/SessionWarningModal.css` | NUEVO | Estilos del modal de advertencia |
| `frontend/src/services/authService.js` | MODIFICAR | Añadir `refreshAccessToken()` |
| `frontend/src/services/apiHelper.js` | MODIFICAR | Añadir interceptor de 401 |
| `frontend/src/pages/Dashboard.jsx` | MODIFICAR | Integrar `useInactivityTimer` y `SessionWarningModal` |

---

## 🧪 Criterios de Aceptación

| PA | Descripción |
|----|-------------|
| PA1 | Usuario inactivo 28 min → aparece modal "Tu sesión expirará en 2 minutos" |
| PA2 | Usuario hace clic en "Continuar" → sesión se extiende otros 30 minutos |
| PA3 | Usuario no responde en 2 min → desconectado y redirigido al login |
| PA4 | Al expirar → localStorage queda vacío (sin token ni datos de usuario) |
| PA5 | Usuario intenta usar app con sesión expirada → error 401 → debe iniciar sesión |

---

## 🔗 Dependencias

- **Independiente:** No depende de ninguna otra HU del Sprint
- **No bloquea a nadie**
- **Recomendación:** Implementar al final del sprint para no interferir con las pruebas de cola
