# Guia Completa: Parametros de Consulta en la API

> **Para quien es esta guia:** Esta guia asume que no tienes experiencia previa con APIs, DevTools ni Postman.  
> Te explica **exactamente** que hacer, paso a paso, desde encender el proyecto hasta demostrar cada funcionalidad.

---

## ¿Que es un parametro de consulta?

Cuando el frontend (la pagina web) le pide datos al backend (el servidor), lo hace mediante una **URL**.  
Un parametro de consulta es todo lo que va despues del signo `?` en esa URL.

**Ejemplo:**
```
http://localhost:8002/api/v1/purchases/history/?page=1&sortBy=total_price&sortType=DESC
```

Aqui:
- `page=1` → traer la pagina 1 (paginacion)
- `sortBy=total_price` → ordenar por precio (ordenacion)
- `sortType=DESC` → de mayor a menor (direccion)

Lo que vamos a demostrar es que el **frontend envia estos parametros** al backend y que el backend los usa para filtrar, ordenar y paginar correctamente.

---

## Paso 0: Requisitos previos

Antes de empezar, el proyecto debe estar corriendo. Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
docker compose up -d
```

Verifica que los servicios esten activos:

```bash
docker compose ps
```

Debes ver los contenedores `frontend`, `service-events`, `service-auth`, `service-profiles` y `db` con estado `Up`.

Luego abre Chrome y ve a: **http://localhost:3000**

---

## Parte 1: Demostracion con Chrome DevTools

Chrome DevTools es una herramienta que viene integrada en Google Chrome. Permite ver todas las peticiones que hace la pagina web al servidor, incluyendo las URLs completas con todos los parametros.

### Paso 1.1 — Iniciar sesion en la aplicacion

1. Abre Chrome y ve a `http://localhost:3000`
2. Haz clic en **"Iniciar Sesion"** o **"Login"**
3. Ingresa las credenciales de un comprador:
   - Email: `tu_email_real@gmail.com` (el que usaste al registrarte)
   - Password: tu contrasena

> Si no tienes una cuenta compradora, crea una nueva desde el boton de registro.

### Paso 1.2 — Abrir DevTools antes de navegar

> **MUY IMPORTANTE:** Abre DevTools **ANTES** de navegar a la pagina que quieres mostrar, de lo contrario no veras las peticiones anteriores.

1. Presiona **F12** en el teclado (o click derecho en cualquier parte de la pagina → "Inspeccionar")
2. Se abrira un panel en la parte inferior o derecha de la pantalla
3. Haz clic en la pestana **"Network"** (esta entre "Console", "Sources", etc.)

La pantalla deberia verse asi:
```
[Elements] [Console] [Sources] [Network] [Performance] ...
                                  ^
                              Click aqui
```

4. Dentro de Network, busca el boton **"XHR"** o **"Fetch/XHR"** en la barra de filtros y haz clic en el:

```
[ All ] [ Fetch/XHR ] [ JS ] [ CSS ] [ Img ] [ Media ] ...
          ^
       Click aqui
```

Esto filtra la lista para mostrar solo las llamadas al servidor (no imagenes ni scripts).

5. Haz clic en el icono de **tacho de basura** 🗑️ para limpiar la lista y empezar desde cero.

### Paso 1.3 — Navegar a "Mis Entradas"

1. En la aplicacion, ve al menu del Dashboard
2. Haz clic en **"Mis Entradas"** (o navega a `http://localhost:3000/dashboard/mis-compras`)
3. En el panel de DevTools veras aparecer una o varias peticiones en la lista

### Paso 1.4 — Identificar la peticion al backend

En la lista de peticiones, busca una que diga algo como:
```
history/    200    fetch    ...
```

Haz clic sobre esa peticion. Se abrira un panel a la derecha con varias subpestanas:
- **Headers** — muestra la URL completa y los encabezados
- **Preview** — muestra la respuesta del servidor de forma legible
- **Response** — muestra la respuesta como texto crudo

**En la pestana "Headers"**, baja hasta la seccion **"General"** y busca la linea que dice **"Request URL"**. Deberia verse asi:

```
Request URL: http://localhost:8002/api/v1/purchases/history/?page=1&page_size=10&sortBy=created_at&sortType=DESC
```

> Esto prueba que el frontend esta enviando los parametros `page`, `page_size`, `sortBy` y `sortType` al backend.

**Tambien puedes verlo en "Params"** — algunas versiones de DevTools muestran los query params en una tabla separada con nombre y valor de cada parametro.

### Paso 1.5 — Demostrar la ORDENACION

1. En la pagina "Mis Entradas", busca la seccion **"Ordenar por:"** (esta debajo de los filtros de estado)
2. Veras botones: **Fecha ↕**, **Precio ↕**, **Evento ↕**, **Estado ↕**
3. Haz clic en **"Precio ↕"**

Inmediatamente en DevTools apareceran **una nueva peticion**. Haz clic en ella y en "Request URL" veras:
```
Request URL: http://localhost:8002/api/v1/purchases/history/?page=1&page_size=10&sortBy=total_price&sortType=DESC
```

El parametro `sortBy=total_price` cambio. Esto prueba que el frontend le esta pidiendo al backend que ordene por precio.

4. Haz clic en **"Precio ↓"** nuevamente (el mismo boton, ahora muestra la flecha hacia abajo)

Nueva peticion en DevTools:
```
Request URL: http://localhost:8002/api/v1/purchases/history/?page=1&page_size=10&sortBy=total_price&sortType=ASC
```

El parametro cambio a `sortType=ASC` (de menor a mayor). ✅

### Paso 1.6 — Demostrar el FILTRADO

1. En la misma pagina, busca los botones de filtro en la parte superior: **"Todas"**, **"Activas"**, **"Utilizadas"**, **"Pendientes"**, **"Canceladas"**
2. Haz clic en **"Activas"**

Nueva peticion en DevTools:
```
Request URL: http://localhost:8002/api/v1/purchases/history/?page=1&page_size=10&status=active&sortBy=total_price&sortType=ASC
```

Se agrego `status=active`. Solo se muestran las compras activas. ✅

### Paso 1.7 — Demostrar la PAGINACION

1. Si tienes mas de 10 compras, veras botones **"← Anterior"** y **"Siguiente →"** en la parte inferior
2. Haz clic en **"Siguiente →"**

Nueva peticion en DevTools:
```
Request URL: http://localhost:8002/api/v1/purchases/history/?page=2&page_size=10&status=active&sortBy=total_price&sortType=ASC
```

El parametro `page=2` cambio. ✅

> **Nota para la presentacion:** Si no tienes suficientes compras para que aparezca la segunda pagina, puedes demostrar que el parametro `page` existe en la URL desde la primera carga.

### Paso 1.8 — Verificar la respuesta del backend

1. Haz clic en cualquiera de las peticiones de la lista
2. Ve a la pestana **"Preview"** (o "Response")
3. Veras un JSON que el backend devolvio. Debe tener esta estructura:

```json
{
  "results": [ ...lista de compras... ],
  "count": 5,
  "page": 1,
  "page_size": 10,
  "total_pages": 1,
  "sort_by": "total_price",
  "sort_type": "ASC",
  "filters_applied": {
    "status": "active",
    "minPrice": null,
    "maxPrice": null
  }
}
```

Los campos `sort_by`, `sort_type` y `filters_applied` confirman que el backend recibio y aplico los parametros. ✅

---

## Parte 2: Demostracion con Postman

Postman es una aplicacion que permite llamar a cualquier endpoint de la API directamente, sin necesidad de usar la interfaz grafica. Es la forma mas directa de mostrar que la API funciona con parametros.

### Paso 2.1 — Instalar Postman (si no lo tienes)

1. Ve a `https://www.postman.com/downloads/`
2. Descarga la version para Windows
3. Instalala y abrela
4. Puedes crear una cuenta gratuita o hacer clic en **"Skip signing in"**

### Paso 2.2 — Obtener el token de autenticacion

La API requiere que te identifiques antes de hacer peticiones. Para eso necesitas un **token JWT**.

1. En Postman, haz clic en el boton **"+"** para crear una nueva peticion
2. Configura la peticion asi:
   - **Metodo:** `POST` (seleccionalo en el dropdown a la izquierda de la URL)
   - **URL:** `http://localhost:8000/api/v1/auth/login/`
3. Haz clic en la pestana **"Body"** (debajo de la URL)
4. Selecciona **"raw"** y en el dropdown de la derecha elige **"JSON"**
5. En el area de texto, escribe:

```json
{
  "email": "tu_email@gmail.com",
  "password": "tu_contrasena"
}
```

6. Haz clic en el boton azul **"Send"**
7. En la parte inferior apareceran los resultados. Busca el campo **`"access"`** y copia **todo** el valor (es un texto largo que empieza con "eyJ...")

```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> Guarda ese token, lo usaras en todas las peticiones siguientes.

### Paso 2.3 — Configurar el token en Postman

Para no tener que copiar el token en cada peticion:

1. Crea una nueva peticion
2. Haz clic en la pestana **"Authorization"**
3. En el dropdown **"Auth Type"** selecciona **"Bearer Token"**
4. Pega el token copiado en el campo **"Token"**

Listo, todas las peticiones desde esta pestana se enviaran con el token automaticamente.

### Paso 2.4 — Peticion 1: Historial con paginacion y ordenacion por precio

Crea una nueva peticion con estos datos:

- **Metodo:** `GET`
- **URL:** 
  ```
  http://localhost:8002/api/v1/purchases/history/?page=1&page_size=5&sortBy=total_price&sortType=DESC
  ```
- **Authorization:** Bearer Token (el del paso anterior)

Haz clic en **"Send"** y veras la respuesta del backend con las compras ordenadas por precio de mayor a menor, de 5 en 5.

**¿Que mostrar en la presentacion?**
- La URL completa con los parametros visibles
- La respuesta JSON que incluye `"sort_by": "total_price"` y `"sort_type": "DESC"`

### Paso 2.5 — Peticion 2: Filtrar por estado "activo" y precio minimo

- **Metodo:** `GET`
- **URL:**
  ```
  http://localhost:8002/api/v1/purchases/history/?status=active&sortBy=created_at&sortType=ASC&minPrice=10
  ```
- **Authorization:** Bearer Token

**¿Que muestra esto?**
- `status=active` → filtra solo compras activas
- `sortBy=created_at` → ordena por fecha de compra
- `sortType=ASC` → del mas antiguo al mas reciente
- `minPrice=10` → solo compras de mas de 10 bolivianos

### Paso 2.6 — Peticion 3: Listado de eventos con busqueda y ordenacion

- **Metodo:** `GET`
- **URL:**
  ```
  http://localhost:8002/api/v1/events/?ordering=-event_date&search=concierto&status=published&page=1
  ```
- **Authorization:** Bearer Token

**¿Que muestra esto?**
- `ordering=-event_date` → eventos mas proximos primero (el `-` significa descendente)
- `search=concierto` → busca "concierto" en nombre, ubicacion y descripcion
- `status=published` → solo eventos publicados

### Paso 2.7 — Peticion 4: Segunda pagina de eventos

- **Metodo:** `GET`
- **URL:**
  ```
  http://localhost:8002/api/v1/events/?ordering=-event_date&page=2&page_size=3
  ```

Esto muestra la segunda pagina con solo 3 eventos por pagina. Demuestra la paginacion pura.

---

## Parte 3: Guion para la Presentacion

Aqui tienes el flujo exacto que puedes seguir durante la presentacion para mostrar todo de forma clara:

### Usando DevTools (recomendado, es mas visual)

1. **Prepara:** Abre Chrome con `http://localhost:3000`. Abre DevTools (F12) → Network → Fetch/XHR. Limpia la lista.
2. **Inicia sesion** como comprador (con tu cuenta real).
3. **Navega a "Mis Entradas":** Muestra que la URL de la peticion tiene `sortBy=created_at&sortType=DESC` — esto es la llamada inicial con valores por defecto.
4. **Di esto:** *"Aqui pueden ver que el frontend esta enviando los parametros page, page_size, sortBy y sortType al backend"*
5. **Haz clic en "Precio ↕":** Muestra la nueva URL con `sortBy=total_price`.
6. **Di esto:** *"Al cambiar el ordenamiento en la pantalla, el frontend cambia el parametro sortBy automaticamente"*
7. **Haz clic en "Activas":** Muestra la URL con `status=active`.
8. **Di esto:** *"Y al filtrar por estado, se agrega el parametro status a la misma peticion"*
9. **Haz clic en la peticion → Preview:** Muestra el JSON con `sort_by`, `sort_type` y `filters_applied`.
10. **Di esto:** *"El backend confirma en la respuesta que los parametros fueron recibidos y aplicados correctamente"*

### Usando Postman (como respaldo o complemento)

1. Muestra la Peticion 1 (historial con sortBy y page)
2. **Di esto:** *"Aqui llamamos directamente al endpoint pasando los parametros en la URL, exactamente como el formato que pide el API Design"*
3. Muestra la URL: `?page=1&page_size=5&sortBy=total_price&sortType=DESC`
4. Muestra la Peticion 2 (con filtros de estado y precio)
5. **Di esto:** *"Podemos combinar paginacion, ordenacion y filtrado en una sola peticion"*

---

## Referencia Rapida: Todos los Parametros Disponibles

### Endpoint: Historial de Compras
```
GET http://localhost:8002/api/v1/purchases/history/
```

| Parametro   | Ejemplo              | Que hace                              |
|-------------|---------------------|---------------------------------------|
| `page`      | `page=2`            | Segunda pagina de resultados          |
| `page_size` | `page_size=5`       | Mostrar 5 resultados por pagina       |
| `status`    | `status=active`     | Solo compras activas                  |
| `sortBy`    | `sortBy=total_price`| Ordenar por precio                    |
| `sortType`  | `sortType=ASC`      | De menor a mayor                      |
| `minPrice`  | `minPrice=50`       | Solo compras de mas de 50             |
| `maxPrice`  | `maxPrice=200`      | Solo compras de menos de 200          |

**Valores posibles para `status`:** `active`, `used`, `pending`, `cancelled`  
**Valores posibles para `sortBy`:** `created_at`, `total_price`, `event_date`, `status`, `event_name`  
**Valores posibles para `sortType`:** `ASC` (menor a mayor), `DESC` (mayor a menor)

### Endpoint: Listado de Eventos
```
GET http://localhost:8002/api/v1/events/
```

| Parametro   | Ejemplo                   | Que hace                              |
|-------------|--------------------------|---------------------------------------|
| `page`      | `page=2`                 | Segunda pagina                        |
| `ordering`  | `ordering=-event_date`   | Ordenar por fecha (mas reciente primero) |
| `ordering`  | `ordering=name`          | Ordenar por nombre A-Z                |
| `search`    | `search=festival`        | Buscar "festival" en nombre/descripcion |
| `status`    | `status=published`       | Solo eventos publicados               |

**Nota:** Para `ordering` en eventos, el prefijo `-` indica orden descendente (mayor a menor).

---

## Implementacion Tecnica (para el Jira y documentacion interna)

### ¿Como funciona en el backend?

El endpoint `PurchaseHistoryView` en `service-events/events/views.py` lee cada parametro de la URL con `request.query_params.get(...)`, aplica los filtros al queryset de Django antes de paginar, y retorna en la respuesta JSON no solo los datos sino tambien que parametros fueron aplicados.

El endpoint `EventViewSet` usa los filtros nativos de Django REST Framework (`OrderingFilter`, `SearchFilter`, `DjangoFilterBackend`) que procesan automaticamente los parametros `ordering`, `search` y campos de filtro como `status` y `category`.

### ¿Como funciona en el frontend?

El archivo `profileService.js` construye la URL con `URLSearchParams`, agregando cada parametro solo si tiene valor. El componente `MisCompras.jsx` tiene estado (`useState`) para `sortBy`, `sortType`, `filtro` y `page`. Cada vez que el usuario cambia un filtro o el orden, el estado se actualiza y se dispara una nueva peticion al backend con los parametros correspondientes visibles en la URL.
