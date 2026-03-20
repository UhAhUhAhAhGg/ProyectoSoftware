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
