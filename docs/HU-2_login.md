# HU-2: Sistema de Login — Documentación Técnica

## Resumen

Implementación completa del flujo de inicio de sesión (*end-to-end*) para la plataforma **TicketGo**. El sistema autentica al usuario contra el backend, obtiene un JWT y lo redirige al panel correspondiente según su rol.

---

## Funcionalidades implementadas

### Backend (`service-auth`)

| Componente | Descripción |
|---|---|
| `POST /api/v1/users/login/` | Endpoint de login. Recibe `email` y `password`, valida credenciales y devuelve `access`, `refresh`, `email` y `role`. |
| `LoginSerializer` | Valida credenciales con `authenticate()`, genera JWT con `RefreshToken.for_user()`, incluye el `role` en el payload. |
| `Migration 0002_data_roles` | Inserta los 3 roles base: **Administrador**, **Promotor**, **Comprador**. |
| `create_superadmin` | Management command para crear el primer administrador del sistema. |
| `seed_users.py` | Script para crear usuarios de prueba en entornos locales. |

### Frontend (`frontend`)

| Componente | Descripción |
|---|---|
| `src/app/login/page.jsx` | Página de login en Next.js App Router. Misma UI que el diseño del equipo, adaptada para Next.js. |
| `src/context/AuthContext.jsx` | Contexto global de autenticación. Guarda `user`, `token` y `refresh` en `localStorage`. Expone `login()`, `logout()`, `isAuthenticated`, `isAdministrador`, `isPromotor`, `isComprador`, `getDashboardPath()`. |
| `src/services/authService.js` | Llama a `POST /api/v1/users/login/` con las credenciales. Devuelve un objeto `{ success, data: { user, token, refresh } }`. |
| `src/app/Providers.jsx` | Wrapper `'use client'` para que `AuthProvider` funcione dentro del Server Component `layout.tsx`. |
| `src/app/globals.css` | Variables CSS globales del proyecto (`--color-beige`, `--color-marron`, `--dark-bg`, etc.) necesarias para los estilos. |
| `next.config.js` | Configuración de Next.js. Desactiva el indicador de desarrollo. |
| `docker-compose.yml` | Variable de entorno `NEXT_PUBLIC_AUTH_URL` apuntando al backend. |

### Redirección post-login (destino según rol)

| Rol | Destino |
|---|---|
| Administrador | `/dashboard/admin` |
| Promotor | `/dashboard/promotor` |
| Comprador | `/dashboard/comprador` |

---

## Persistencia de usuarios

> [!IMPORTANT]
> Los usuarios **NO están guardados en el repositorio Git**. Están almacenados en el volumen Docker de la base de datos (`auth_db`).
>
> Al hacer `docker compose down -v` (con el flag `-v`) o al recrear el contenedor de la base de datos, los usuarios se pierden.

### Para recrear los usuarios tras un reinicio

**Opción 1 — Script seed (recomendado):**
```bash
# Desde la raíz del proyecto
docker cp service-auth/seed_users.py service_auth:/app/seed_users.py
docker exec service_auth python seed_users.py
```

**Opción 2 — Management command (solo para el admin):**
```bash
docker exec service_auth python manage.py create_superadmin \
  --email admin@ticketproject.com \
  --password Admin1234!
```

---

## Guía de Prueba

### Prerequisitos

Los contenedores deben estar corriendo:
```bash
docker compose up -d
```

Verificar que los usuarios existen en la BD:
```bash
docker cp service-auth/seed_users.py service_auth:/app/seed_users.py
docker exec service_auth python seed_users.py
```

### Paso a paso

**1. Navegar al login:**
```
http://localhost:3000/login
```
Debes ver la página de login con el selector de 3 roles.

---

**2. Probar login como Administrador:**

Seleccionar la tarjeta **Administrador** (el formulario se pre-llena automáticamente).

| Campo | Valor |
|---|---|
| Email | `admin@ticketproject.com` |
| Contraseña | `Admin1234!` |

Clic en **"Iniciar sesión como Administrador"**.

✅ **Resultado esperado:** Redirige a `http://localhost:3000/dashboard/admin`

---

**3. Probar login como Promotor:**

Seleccionar la tarjeta **Promotor**.

| Campo | Valor |
|---|---|
| Email | `promotor@ticketproject.com` |
| Contraseña | `Promotor1234!` |

✅ **Resultado esperado:** Redirige a `http://localhost:3000/dashboard/promotor`

---

**4. Probar login como Comprador:**

Seleccionar la tarjeta **Comprador**.

| Campo | Valor |
|---|---|
| Email | `comprador@ticketproject.com` |
| Contraseña | `Comprador1234!` |

✅ **Resultado esperado:** Redirige a `http://localhost:3000/dashboard/comprador`

---

**5. Probar credenciales incorrectas:**

Ingresar cualquier email/contraseña incorrectos.

✅ **Resultado esperado:** Mensaje de error: *"Correo o contraseña incorrectos."*

---

**6. Probar cierre de sesión:**

Desde cualquier dashboard, hacer clic en el botón **"Cerrar Sesión"** (esquina superior derecha).

✅ **Resultado esperado:** Redirige a `http://localhost:3000/login` con la sesión cerrada.

---

**7. Probar que la sesión persiste:**

Luego de iniciar sesión, cerrar y volver a abrir el navegador (sin borrar datos).
Navegar a `http://localhost:3000/login`.

✅ **Resultado esperado:** Redirige automáticamente al dashboard correspondiente (la sesión se restauró desde `localStorage`).

---

## Verificación del API (Postman / curl)

```bash
# Login correcto
curl -X POST http://localhost:8000/api/v1/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ticketproject.com","password":"Admin1234!"}'

# Respuesta esperada (200 OK):
# {
#   "access": "<jwt_token>",
#   "refresh": "<refresh_token>",
#   "email": "admin@ticketproject.com",
#   "role": "Administrador"
# }

# Login con credenciales incorrectas
curl -X POST http://localhost:8000/api/v1/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@email.com","password":"wrong"}'

# Respuesta esperada (401 Unauthorized):
# {"detail": "No active account found with the given credentials"}
```
