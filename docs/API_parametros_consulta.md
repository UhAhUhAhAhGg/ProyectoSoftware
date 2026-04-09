# Implementacion de Parametros de Consulta en la API

## Resumen

Se implementaron parametros de consulta (query parameters) en la API REST del proyecto
para soportar **paginacion**, **ordenacion** y **filtrado** en los listados principales.

Esto cumple con el requisito del Diseno de un API evaluado en el Sprint 2.

---

## Endpoints con Parametros de Consulta

### 1. Historial de Compras — `GET /api/v1/purchases/history/`

**Parametros soportados:**

| Parametro   | Tipo    | Valores permitidos                                      | Default      | Descripcion                          |
|-------------|---------|--------------------------------------------------------|--------------|--------------------------------------|
| `page`      | int     | >= 1                                                   | 1            | Numero de pagina                     |
| `page_size` | int     | 1–100                                                  | 10           | Cantidad de resultados por pagina    |
| `status`    | string  | `active`, `used`, `pending`, `cancelled`               | (sin filtro) | Filtra compras por estado            |
| `sortBy`    | string  | `created_at`, `total_price`, `event_date`, `status`, `event_name` | `created_at` | Campo de ordenacion        |
| `sortType`  | string  | `ASC`, `DESC`                                          | `DESC`       | Direccion de ordenacion              |
| `minPrice`  | decimal | cualquier numero positivo                              | (sin filtro) | Precio minimo del total              |
| `maxPrice`  | decimal | cualquier numero positivo                              | (sin filtro) | Precio maximo del total              |

**Ejemplo completo:**
```
GET http://localhost:8002/api/v1/purchases/history/?page=1&page_size=10&status=active&sortBy=total_price&sortType=ASC&minPrice=50
```

**Respuesta incluye metadatos:**
```json
{
  "results": [...],
  "count": 25,
  "page": 1,
  "page_size": 10,
  "total_pages": 3,
  "sort_by": "total_price",
  "sort_type": "ASC",
  "filters_applied": {
    "status": "active",
    "minPrice": "50",
    "maxPrice": null
  }
}
```

### 2. Listado de Eventos — `GET /api/v1/events/`

Usa Django REST Framework `OrderingFilter`, `SearchFilter` y `DjangoFilterBackend`.

**Parametros soportados:**

| Parametro   | Tipo   | Valores permitidos                      | Default        | Descripcion                        |
|-------------|--------|-----------------------------------------|----------------|------------------------------------|
| `page`      | int    | >= 1                                    | 1              | Numero de pagina                   |
| `ordering`  | string | `event_date`, `-event_date`, `created_at`, `-created_at`, `name`, `-name` | `-event_date` | Ordenacion (prefijo `-` = DESC) |
| `search`    | string | texto libre                             | (sin filtro)   | Busca en nombre, ubicacion, desc.  |
| `status`    | string | `published`, `draft`, `cancelled`       | (sin filtro)   | Filtra por estado del evento       |
| `category`  | int    | ID de categoria                         | (sin filtro)   | Filtra por categoria               |

**Ejemplo completo:**
```
GET http://localhost:8002/api/v1/events/?ordering=-created_at&search=concierto&status=published&page=1
```

---

## Como Demostrar con Chrome DevTools

### Paso 1: Abrir DevTools
1. Abrir la aplicacion en Chrome: `http://localhost:3000`
2. Presionar `F12` o `Ctrl+Shift+I` para abrir Developer Tools
3. Ir a la pestana **Network**

### Paso 2: Navegar a Mis Compras
1. Iniciar sesion como comprador
2. Ir a **Dashboard > Mis Entradas** (`/dashboard/mis-compras`)

### Paso 3: Observar las llamadas
1. En la pestana Network, filtrar por **Fetch/XHR**
2. Al cargar la pagina, se vera una request a:
   ```
   http://localhost:8002/api/v1/purchases/history/?page=1&page_size=10&sortBy=created_at&sortType=DESC
   ```

### Paso 4: Interactuar con los controles de ordenacion
1. Hacer clic en el boton **"Precio ↕"** en la interfaz
2. En Network se vera la nueva request:
   ```
   http://localhost:8002/api/v1/purchases/history/?page=1&page_size=10&sortBy=total_price&sortType=DESC
   ```
3. Hacer clic de nuevo en **"Precio ↓"** para cambiar a ASC:
   ```
   http://localhost:8002/api/v1/purchases/history/?page=1&page_size=10&sortBy=total_price&sortType=ASC
   ```

### Paso 5: Aplicar filtro de estado
1. Hacer clic en **"Activas"**
2. La URL cambia a:
   ```
   http://localhost:8002/api/v1/purchases/history/?page=1&page_size=10&status=active&sortBy=total_price&sortType=ASC
   ```

### Paso 6: Verificar la respuesta
1. Hacer clic en la request en Network
2. Ir a la pestana **Response** o **Preview**
3. Verificar que la respuesta incluye `sort_by`, `sort_type` y `filters_applied`

---

## Como Demostrar con Postman

### Request 1: Historial con ordenacion por precio descendente
```
GET http://localhost:8002/api/v1/purchases/history/?page=1&page_size=10&sortBy=total_price&sortType=DESC

Headers:
  Authorization: Bearer <token_jwt>
```

### Request 2: Historial filtrado por estado y precio minimo
```
GET http://localhost:8002/api/v1/purchases/history/?status=active&sortBy=created_at&sortType=ASC&minPrice=100

Headers:
  Authorization: Bearer <token_jwt>
```

### Request 3: Eventos ordenados por nombre
```
GET http://localhost:8002/api/v1/events/?ordering=name&search=rock&page=1

Headers:
  Authorization: Bearer <token_jwt>
```

### Request 4: Eventos filtrados por categoria
```
GET http://localhost:8002/api/v1/events/?category=1&ordering=-event_date&status=published

Headers:
  Authorization: Bearer <token_jwt>
```

### Obtener Token JWT
```
POST http://localhost:8000/api/v1/auth/login/

Body (JSON):
{
  "email": "tu_email@ejemplo.com",
  "password": "tu_password"
}
```
Copiar el campo `access` de la respuesta y usarlo como Bearer token.

---

## Implementacion Tecnica

### Backend (Django)

**PurchaseHistoryView** (`service-events/events/views.py`):
- Lee `sortBy` y `sortType` de `request.query_params`
- Mapea nombres publicos a campos del modelo con `ALLOWED_SORT_FIELDS`
- Aplica `.order_by()` antes de paginar
- Soporta `minPrice` y `maxPrice` con `__gte` y `__lte`
- Retorna metadata de ordenacion y filtros aplicados en la respuesta

**EventViewSet** (`service-events/events/views.py`):
- Usa `rest_framework.filters.OrderingFilter` nativo de DRF
- Parametro `ordering` acepta campos con prefijo `-` para DESC
- `SearchFilter` permite buscar por texto en multiples campos
- `DjangoFilterBackend` filtra por campos exactos (status, category, event_date)

### Frontend (React)

**profileService.js** — `getUserTickets()`:
- Construye `URLSearchParams` con todos los parametros (page, page_size, status, sortBy, sortType, minPrice, maxPrice)
- Los parametros son visibles en la URL de la request en DevTools

**MisCompras.jsx**:
- Estado `sortBy` y `sortType` con botones interactivos
- Toggle: clic en el mismo campo cambia ASC/DESC, clic en otro campo cambia al nuevo campo
- Iconos visuales: ↕ (inactivo), ↓ (DESC), ↑ (ASC)
- Todos los cambios de filtro/orden disparan nueva peticion con params visibles
