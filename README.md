# 🎟️ ProyectoSoftware — Plataforma de Tickets

Plataforma de venta de entradas construida con arquitectura de microservicios.

## 🏗️ Arquitectura

```
┌─────────────────────────────────┐
│         Frontend (Next.js)       │  :3000
└─────────────────────────────────┘
          │         │         │
┌─────────┐ ┌───────────┐ ┌────────────┐
│ service │ │  service  │ │  service   │
│  -auth  │ │ -profiles │ │  -events   │
│  :8000  │ │   :8001   │ │   :8002    │
└─────────┘ └───────────┘ └────────────┘
     │             │             │
┌─────────┐ ┌───────────┐ ┌────────────┐
│ auth_db │ │profiles_db│ │ events_db  │
│  :5432  │ │   :5433   │ │   :5434    │
└─────────┘ └───────────┘ └────────────┘
```

| Servicio | Tecnología | Puerto | Descripción |
|---|---|---|---|
| `service-auth` | Django + DRF | 8000 | Autenticación JWT, usuarios, roles |
| `service-profiles` | Django + DRF | 8001 | Perfiles de Admin, Comprador, Promotor |
| `service-events` | Django + DRF | 8002 | Eventos, categorías, tipos de ticket |
| `frontend` | Next.js 16 | 3000 | Interfaz de usuario |

---

## ✅ Requisitos previos

Antes de empezar, asegúrate de tener instalado:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)
- [Git](https://git-scm.com/)

**Verificar instalación:**
```bash
docker --version       # Docker version 24+
docker compose version # Docker Compose version 2+
git --version
```

---

## 🚀 Cómo ejecutar el proyecto (primera vez)

### 1. Clonar el repositorio

```bash
git clone git@github.com:UhAhUhAhAhGg/ProyectoSoftware.git
cd ProyectoSoftware
```

### 2. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env
```

> El archivo `.env.example` ya tiene valores por defecto para desarrollo local. No necesitas cambiar nada para correr el proyecto por primera vez.

### 3. Levantar todos los servicios

```bash
docker compose up --build
```

Este comando:
- Construye las imágenes Docker de cada servicio
- Levanta las 3 bases de datos PostgreSQL
- Genera y aplica las migraciones automáticamente
- Inicia los 4 servicios

⏳ La primera vez puede tardar unos minutos mientras descarga las imágenes base.

### 4. Verificar que todo funciona

Abre tu navegador y accede a:

| URL | Qué deberías ver |
|---|---|
| http://localhost:3000 | Frontend (Next.js) |
| http://localhost:8000/api/v1/ | API de autenticación |
| http://localhost:8001/api/v1/ | API de perfiles |
| http://localhost:8002/api/v1/ | API de eventos |

---

## 💻 Uso diario

### Levantar los servicios (sin rebuild)
```bash
docker compose up
```

### Levantar en segundo plano (detached)
```bash
docker compose up -d
```

### Apagar todos los servicios
```bash
docker compose down
```

### Apagar y **borrar los datos de las bases de datos**
```bash
docker compose down -v
```
> ⚠️ Esto elimina los volúmenes de PostgreSQL. Usar solo si quieres empezar desde cero.

### Ver logs de un servicio específico
```bash
docker compose logs -f service-auth
docker compose logs -f service-profiles
docker compose logs -f service-events
docker compose logs -f frontend
```

### Reconstruir un servicio específico (ej: después de cambiar el Dockerfile)
```bash
docker compose up --build service-auth
```

---

## 🔑 Autenticación (JWT)

El sistema usa JWT con `djangorestframework-simplejwt`.

### Obtener token
```bash
POST http://localhost:8000/api/v1/token/
Content-Type: application/json

{
  "username": "tu@email.com",
  "password": "tupassword"
}
```

### Usar el token en requests protegidos
```bash
GET http://localhost:8000/api/v1/users/
Authorization: Bearer <access_token>
```

### Refrescar token
```bash
POST http://localhost:8000/api/v1/token/refresh/
Content-Type: application/json

{
  "refresh": "<refresh_token>"
}
```

---

## 📋 Estructura del proyecto

```
ProyectoSoftware/
├── docker-compose.yml          # Orquestación de todos los servicios
├── .env.example                # Variables de entorno de ejemplo
├── requirements.txt            # Dependencias Python compartidas
│
├── service-auth/               # Microservicio de autenticación
│   ├── Dockerfile
│   ├── auth_config/            # Configuración Django
│   ├── users/                  # App: modelos User, Role, Permission
│   └── tests/
│
├── service-profiles/           # Microservicio de perfiles
│   ├── Dockerfile
│   ├── profiles_config/        # Configuración Django
│   ├── profiles/               # App: AdminProfile, BuyerProfile, PromotorProfile
│   └── tests/
│
├── service-events/             # Microservicio de eventos
│   ├── Dockerfile
│   ├── events_config/          # Configuración Django
│   ├── events/                 # App: Category, Event, TicketType
│   └── tests/
│
└── frontend/                   # Frontend Next.js
    ├── Dockerfile
    ├── app/                    # App Router de Next.js
    └── src/                    # Componentes y servicios
```

---

## 🌱 Semillas de Base de Datos Básico (Seeds)

Para que el proyecto funcione correctamente (tanto en Back como en Front) sin que tengas que crearlo todo desde cero a mano, incluimos scripts "Seed" que inyectan los datos primordiales.

Debes ejecutar estos comandos **inmediatamente después de hacer `docker compose up` por primera vez**, en otra terminal:

### 1. Semilla de Usuarios Básica (`service-auth`)
Pre-carga roles y 3 usuarios de prueba con la contraseña `*Password1234!*`:
* Administrador (`admin@ticketproject.com`)
* Promotor (`promotor@ticketproject.com`)
* Comprador (`comprador@ticketproject.com`)
```bash
docker compose exec service-auth python seed_users.py
```

### 2. Semilla de Categorías de Eventos (`service-events`)
Pre-carga las 8 categorías oficiales de eventos para que el Frontend y el Backend hablen el mismo idioma al crear funciones (Música, Deportes, Festivales, etc.).
```bash
docker compose exec service-events python seed_categories.py
```

---

## 🧪 Cómo probar los Flujos de Usuario y Administrador (HU-4 y HU-5)

Una vez que tengas los contenedores corriendo (`docker compose up`), sigue estos pasos para probar el ecosistema de roles:

### Flujo 1: Crear el SuperAdmin inicial (Vía Docker)
Dado que la plataforma requiere extrema seguridad, el primer administrador general debe crearse desde la consola de comandos del servidor backend:

```bash
docker compose exec service-auth python manage.py create_superadmin --email superadmin@ticketgo.com --password admin123
```
*Si omites los parámetros `--email` o `--password`, el script te los pedirá de forma interactiva en la consola.*

### Flujo 2: Invitar a un Nuevo Administrador
1. Ve a la **página de Login Privado**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
2. Inicia sesión con el email y contraseña del **SuperAdmin** que acabas de crear.
3. Serás redirigido al `Dashboard`. En la barra lateral, haz click en **⚙️ Administradores**.
4. En el módulo superior verás **✉️ Invitar Nuevo Administrador**. Escribe el correo de tu colega (ej. `segundo@admin.com`) y genera el enlace.
5. El sistema mostrará un mensaje verde con un Link Secreto. **Cópialo**.

### Flujo 3: Registro y Aprobación de Seguridad
1. Abre una **ventana de incógnito** y pega el Link Secreto (`http://localhost:3000/admin/register?token=...`).
2. Llena el formulario de seguridad (Código de Empleado y Departamento). Al enviarlo, la cuenta quedará como "Pendiente".
3. Vuelve a tu ventana normal (la del SuperAdmin) y actualiza la tabla de **⏳ Solicitudes Pendientes de Aprobación**.
4. Encontrarás la solicitud en rojo. Haz click en el botón **Aprobar**.
5. ¡Listo! El nuevo colega ya puede iniciar sesión libremente en `/admin/login`.

### Flujo 4: Usuarios Públicos (Compradores y Promotores)
1. Para los clientes normales, ve a la ruta raíz: [http://localhost:3000](http://localhost:3000) y pulsa "Acceder" (o directamente ve a `/login`).
2. Si intentas poner las credenciales del SuperAdmin aquí, el sistema **te rechazará o redirigirá** a los modulos equivocados para forzarte a usar el portal privado de la empresa.
3. En la página de Login o `/registro`, pulsa "¿No tienes una cuenta? Regístrate aquí".
4. Podrás elegir entre el perfil de **Comprador** o **Promotor**. Tras el registro, podrás iniciar sesión normalmente.

---

## 🎯 Guía de Pruebas — Sprint 2

Esta sección resume cómo probar cada Historia de Usuario del Sprint 2. Para detalles completos, consulta la documentación en la carpeta `docs/`.

### Prerrequisitos generales

1. Levantar todos los servicios:
   ```bash
   docker compose up
   ```
2. Ejecutar los seeds (solo la primera vez):
   ```bash
   docker compose exec service-auth python seed_users.py
   docker compose exec service-events python seed_categories.py
   ```
3. Crear al menos un evento como Promotor (ver más abajo)

### Cuentas de prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | `admin@ticketproject.com` | `Admin1234!` |
| Promotor | `promotor@ticketproject.com` | `Promotor1234!` |
| Comprador | `comprador@ticketproject.com` | `Comprador1234!` |

> **Nota:** Si quieres recibir el email con el ticket, registra una cuenta con tu correo real.

### Preparación: Crear un evento de prueba

1. Login como **Promotor** en http://localhost:3000
2. Dashboard → "Crear Evento"
3. Llenar datos: nombre, descripción, fecha futura, ubicación, imagen
4. En "Gestión de Zonas/Entradas", agregar al menos una zona (ej: VIP, $500, 200 cupos)
5. Guardar → Publicar el evento

---

### HU-9: Explorar Catálogo de Eventos 📖 [docs/HU-9_explorar_eventos.md](docs/HU-9_explorar_eventos.md)

| # | Prueba | Pasos | Resultado esperado |
|---|--------|-------|-------------------|
| 1 | Ver listado | Login comprador → "Explorar Eventos" | Lista de eventos con imagen, nombre, fecha, ubicación |
| 2 | Buscar | Escribir en el buscador | Lista se filtra por nombre, ubicación o ciudad en tiempo real |
| 3 | Ver detalle | Click en un evento | Página con info completa y tipos de entrada |

---

### HU-10: Selección de Tipo de Entrada 📖 [docs/HU-10_seleccion_entradas.md](docs/HU-10_seleccion_entradas.md)

| # | Prueba | Pasos | Resultado esperado |
|---|--------|-------|-------------------|
| 1 | Ver tipos | En detalle de evento, ver sección "Tipos de entrada" | Nombre, zona, precio, disponibilidad por cada tipo |
| 2 | Seleccionar | Click "Pagar con QR" en un tipo | Se abre modal de pago con QR, resumen y temporizador |

---

### HU-13: Compra Única por Evento 📖 [docs/HU-13_compra_unica.md](docs/HU-13_compra_unica.md)

| # | Prueba | Pasos | Resultado esperado |
|---|--------|-------|-------------------|
| 1 | Compra duplicada | Completar pago → volver al evento → intentar comprar de nuevo | Mensaje: "🛑 Ya compraste una entrada para este evento" |
| 2 | Otro evento | Con la misma cuenta, comprar en un evento diferente | Compra se realiza normalmente |

---

### HU-15: Mis Entradas (Visualización) 📖 [docs/HU-15_mis_entradas.md](docs/HU-15_mis_entradas.md)

| # | Prueba | Pasos | Resultado esperado |
|---|--------|-------|-------------------|
| 1 | Ver entradas | Comprar una entrada → sidebar "Mis Entradas" | Compra visible con estado, evento, precio |
| 2 | Ver detalle | Click en una compra | Panel lateral con QR, código de respaldo, info completa |
| 3 | Descargar PDF | En detalle, click "📄 Descargar entrada PDF" | Se descarga PDF con QR y código de acceso |
| 4 | Filtrar | Click en filtros (Completadas, Pendientes, etc.) | Lista se filtra por estado |

---

### HU-17: Pago con QR 📖 [docs/HU-17_pago_qr.md](docs/HU-17_pago_qr.md)

| # | Prueba | Pasos | Resultado esperado |
|---|--------|-------|-------------------|
| 1 | Iniciar pago | En evento → "Pagar con QR" | Modal con QR de pago, temporizador 15 min, botón simular |
| 2 | Simular pago | Click "Simular pago aprobado" | 🎉 Pago Exitoso + QR de entrada + código de respaldo |
| 3 | Email | Tras pago, si configuraste Gmail | Banner "📧 Ticket enviado a tu@correo.com" |
| 4 | Expiración | Iniciar pago → NO pagar → esperar 15 min | Modal muestra "Tiempo Expirado", permite reintentar |

**Configuración de Email (opcional):**
Para recibir el ticket por correo, edita el archivo `.env` raíz:
```env
EMAIL_HOST_USER=tucorreo@gmail.com
EMAIL_HOST_PASSWORD=tuapppassword16chars
DEFAULT_FROM_EMAIL=TicketProject <tucorreo@gmail.com>
```
> Necesitas una [App Password de Google](https://myaccount.google.com/apppasswords) (16 caracteres sin espacios).

---

### HU-32: Historial de Compras 📖 [docs/HU-32_historial_compras.md](docs/HU-32_historial_compras.md)

| # | Prueba | Pasos | Resultado esperado |
|---|--------|-------|-------------------|
| 1 | Historial | Varias compras → "Mis Entradas" | Todas las compras ordenadas por fecha |
| 2 | Filtros | Click en Completadas/Pendientes/Canceladas | Solo compras del estado seleccionado |
| 3 | Paginación | Más de 10 compras | Botones Anterior/Siguiente |

---

### Flujo completo de prueba (de inicio a fin)

1. `docker compose up` + seeds
2. Login como **Promotor** → Crear evento con zonas y precios → Publicar
3. Login como **Comprador** → Explorar Eventos → Seleccionar evento
4. Ver tipos de entrada → "Pagar con QR" → Simular pago
5. Verificar: 🎉 Pago exitoso + QR + código + email (si configurado)
6. Ir a "Mis Entradas" → Ver compra + descargar PDF
7. Volver al evento → Intentar comprar de nuevo → Verificar bloqueo "Ya compraste"

---

## 📚 Documentación completa

| Documento | Descripción |
|-----------|-------------|
| [docs/HU-9_explorar_eventos.md](docs/HU-9_explorar_eventos.md) | Explorar catálogo de eventos |
| [docs/HU-10_seleccion_entradas.md](docs/HU-10_seleccion_entradas.md) | Selección de tipo de entrada |
| [docs/HU-13_compra_unica.md](docs/HU-13_compra_unica.md) | Restricción de compra única |
| [docs/HU-15_mis_entradas.md](docs/HU-15_mis_entradas.md) | Visualización de entradas compradas |
| [docs/HU-17_pago_qr.md](docs/HU-17_pago_qr.md) | Pago con QR + email |
| [docs/HU-32_historial_compras.md](docs/HU-32_historial_compras.md) | Historial de compras |
| [docs/HU-1_registro.md](docs/HU-1_registro.md) | Registro de usuarios |
| [docs/HU-2_login.md](docs/HU-2_login.md) | Inicio de sesión |
| [docs/HU-7_gestion_eventos.md](docs/HU-7_gestion_eventos.md) | Gestión de eventos (Promotor) |
| [docs/HU-8_gestion_entradas.md](docs/HU-8_gestion_entradas.md) | Gestión de entradas/zonas |

---

### Crear un superusuario para el admin de Django
```bash
docker compose exec service-auth python manage.py createsuperuser
```

### Acceder al shell de Django
```bash
docker compose exec service-auth python manage.py shell
```

### Crear migraciones manualmente (si modificas modelos)
```bash
docker compose exec service-auth python manage.py makemigrations
docker compose exec service-auth python manage.py migrate
```

### Acceder a la base de datos
```bash
docker compose exec auth-db psql -U admin -d auth_db
```

---

## ❓ Problemas comunes

### "Port is already in use"
Algún puerto (8000, 8001, 8002, 3000, 5432, 5433, 5434) ya está en uso. Detén cualquier servicio local que use esos puertos y vuelve a intentarlo.

### Los servicios no pueden conectarse entre sí
Asegúrate de ejecutar `docker compose up` desde la raíz del proyecto (donde está el `docker-compose.yml`), no desde una subcarpeta.

### "Permission denied" en Linux/Mac
```bash
sudo chmod +x manage.py
```

### Cambios en el código no se reflejan
El proyecto usa volúmenes montados, los cambios en el código Python se recargan automáticamente. Para cambios en el `Dockerfile` o en `requirements.txt` es necesario reconstruir:
```bash
docker compose up --build
```
update
