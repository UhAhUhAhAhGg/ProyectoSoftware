# US-34 — Dashboard Financiero de Promotor (Vista Admin)

## Resumen de Entrega

Esta subtarea implementa una vista **de solo lectura** del dashboard financiero de un promotor, accesible únicamente por Administradores con permisos de reportes.

**Estado:** ✅ Completado  
**Estimación:** 3 horas  
**Sprint:** 5

---

## Archivos Entregados

| Archivo | Ruta | Descripción |
|---------|------|-------------|
| `DashboardPromotorAdmin.jsx` | `frontend/src/components/dashboard/admin/` | Componente React principal con lógica de carga y renderizado |
| `DashboardPromotorAdmin.css` | `frontend/src/components/dashboard/admin/` | Estilos con prefijo `dpa-` para evitar colisiones |

---

## Integración en AdminDashboard.jsx

El componente está completamente integrado en el flujo de administración:

### Imports
```jsx
import DashboardPromotorAdmin from '../components/dashboard/admin/DashboardPromotorAdmin';
```

### Estados
- `selectedPromotorId`: almacena el ID del promotor seleccionado
- Nueva sección `dashboard-promotor` en `SECTION_PERMISSION` con capacidad `view_reports`

### Flujo de navegación
1. Admin navega a **Gestión de Promotores**
2. Hace clic en botón **📊 Dashboard** en la fila del promotor
3. `onViewPromotorDashboard` callback dispara:
   - `setSelectedPromotorId(promotorId)`
   - `setActiveSection('dashboard-promotor')`
4. Se renderiza `<DashboardPromotorAdmin promotorId={...} readOnly={true} onBack={...} />`
5. Botón "Volver" en el dashboard regresa a Gestión de Promotores

---

## Props del Componente

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `promotorId` | `string` | ✅ | ID del promotor a supervisar |
| `readOnly` | `boolean` | ✅ (siempre `true`) | Deshabilita acciones de edición; columna de acciones oculta |
| `onBack` | `function` | ❌ | Callback para volver al listado de promotores |

### Ejemplo de uso

```jsx
<DashboardPromotorAdmin
  promotorId="12345"
  readOnly={true}
  onBack={() => setActiveSection('promotores')}
/>
```

---

## Endpoints Backend Esperados

El componente consume los siguientes endpoints (deben existir en `service-events` o `service-auth`):

### 1. Perfil del Promotor

```
GET /api/admin/promotores/{promotorId}/
```

**Respuesta esperada:**
```json
{
  "id": "12345",
  "nombre": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "fecha_registro": "2024-01-15T10:30:00Z"
}
```

### 2. Resumen Financiero

```
GET /api/admin/promotores/{promotorId}/resumen-financiero/
```

**Respuesta esperada:**
```json
{
  "ingresos_brutos_total": 50000.00,
  "comisiones_total": 5000.00,
  "ingresos_netos_total": 45000.00,
  "entradas_vendidas_total": 250,
  "total_eventos": 5,
  "eventos_activos": 2,
  "porcentaje_comision_promedio": 10.5
}
```

### 3. Eventos del Promotor

```
GET /api/admin/promotores/{promotorId}/eventos/
```

**Respuesta esperada:**
```json
[
  {
    "id": "evt-001",
    "nombre": "Concierto de Rock 2024",
    "fecha": "2024-06-15",
    "estado": "activo",
    "ingresos_brutos": 10000.00,
    "porcentaje_comision": 10,
    "comision_plataforma": 1000.00,
    "ingreso_neto": 9000.00
  },
  ...
]
```

---

## Características Principales

### 1. Insignia "Solo Lectura"
- Se muestra permanentemente en el header cuando `readOnly={true}`
- Indica visualmente que la vista es de supervisión únicamente
- Usa prefijo de advertencia (🔒 + icono de candado)

### 2. Cuatro Tarjetas de Métricas
- **Ingresos Brutos**: Total generado por el promotor
- **Comisión Plataforma**: Monto total retenido como comisión
- **Ingresos Netos**: Lo que recibe el promotor tras comisiones
- **Entradas Vendidas**: Cantidad total de tickets vendidos

Cada tarjeta incluye:
- Icono representativo
- Valor formateado en BOB (Bolivianos)
- Sublabel con información adicional
- Variantes de color (primary, success, warning, default)

### 3. Tabla de Eventos
- **Columnas**: Evento | Ingresos Brutos | Comisión | Ingreso Neto | Estado
- **Filtro por estado**: Todos, Activo, Finalizado, Cancelado (filtro local)
- **Cuando `readOnly={true}`**: Columna de acciones no se renderiza del DOM (no solo oculta)
- **Información de evento**: Nombre + Fecha con icono de calendario

### 4. Estados UX
- **Cargando**: Spinner animado con mensaje
- **Error**: Icono de alerta + mensaje de error + botón "Reintentar"
- **Vacío**: Cuando no hay eventos para el filtro seleccionado
- **Datos**: Tabla con paginación implícita (se carga todo de una vez)

### 5. Responsive Design
- Desktop (≥1024px): Grid de 4 columnas para métricas
- Tablet (768px-1023px): Grid de 2 columnas para métricas
- Mobile (320px-767px): Grid de 1 columna para métricas
- Tabla scrollable horizontalmente en móvil

---

## Decisiones de Diseño

### Patrón CSS: Prefijo `dpa-`
- Evita colisiones con estilos globales y otros módulos admin
- Sigue el patrón usado en `AdminAuditoria.css` y `AdminVentas.css`
- Variables CSS heredadas del tema global con fallback propio

### Componentes Reutilizables
- `MetricCard`: Tarjeta de métrica financiera con variant system
- `EventRow`: Fila de evento con soporte para `readOnly`
- Iconos SVG inline (sin dependencia de librería de iconos)

### Fetch de Datos
- **Promise.all()** para cargar 3 endpoints en paralelo
- Token de autenticación desde `localStorage.getItem("access_token")`
- Headers con `Content-Type: application/json` y `Authorization: Bearer`

### Filtrado Local
- Filtro por estado (`todos / activo / finalizado / cancelado`) opera sobre datos ya cargados
- Sin petición adicional al backend
- Estado local con `filtroEstado`

---

## Criterios de Aceptación

- ✅ El admin puede ver ingresos brutos, comisión y neto por evento
- ✅ Las métricas globales del promotor se muestran en las 4 tarjetas superiores
- ✅ No aparece ningún control de edición (readOnly=true)
- ✅ La insignia "Solo lectura" es visible en todo momento
- ✅ El componente muestra estado de carga, error y vacío correctamente
- ✅ Es responsive en móvil (≥ 320px)
- ✅ Integración con AdminDashboard.jsx completada
- ✅ Botón "Ver Dashboard" visible en tabla de promotores
- ✅ Navegación back regresa a Gestión de Promotores

---

## Notas de Implementación

### Manejo de Errores
Si alguno de los 3 endpoints falla:
1. El estado `error` se actualiza con el mensaje de error
2. Se renderiza la vista de error con botón "Reintentar"
3. El click en "Reintentar" reinicia `fetchDashboard()`

### Autenticación
- Token se obtiene de `localStorage.getItem("access_token")`
- Si no existe token, el fetch fallará con 401
- La pantalla de error se mostrará

### Soporte a Datos Anidados
- Si `eventosData` viene como `{ results: [...] }` (pagination), se extrae correctamente
- Si viene como array, se usa directamente

### Formatos Localizados
- Moneda: `es-BO` (Bolivianos)
- Fecha: `es-BO` con formato `dd MMM yyyy`
- Ej: "15 jun 2024"

---

## Roadmap Futuro

Si en futuras historias se requiere que el **promotor acceda a su propio dashboard**:
- Solo cambiar `readOnly={false}` en la llamada
- La UI se adaptará automáticamente:
  - Aparecerá la columna de Acciones
  - Se habilitarán controles de edición
  - La insignia "Solo lectura" desaparecerá

---

## Testing Manual

### Flujo 1: Acceso al Dashboard
1. Inicia sesión como Admin con permisos `view_reports`
2. Ve a Gestión de Promotores
3. Busca un promotor y haz clic en 📊 Dashboard
4. Verifica que se carguen las métricas y la tabla de eventos

### Flujo 2: Filtrado de Eventos
1. Desde el dashboard, prueba cada botón de filtro
2. Verifica que la tabla se actualiza correctamente

### Flujo 3: Navegación
1. Haz clic en el botón "← Volver"
2. Verifica que regresas a Gestión de Promotores

### Flujo 4: Permisos
1. Inicia sesión como Admin **sin** permiso `view_reports`
2. Intenta acceder directamente a la URL del dashboard
3. Verifica que ves el componente `SinPermisos`

---

## Versionado

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2024-06-06 | Implementación inicial; integración en AdminDashboard.jsx |

---

**Autor:** GitHub Copilot  
**Contacto:** copilot@ticketgo.com
