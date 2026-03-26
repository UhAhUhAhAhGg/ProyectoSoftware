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

## 🛠️ Comandos útiles de Django (dentro de Docker)

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
