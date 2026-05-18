# 🚀 QUICK START - SuperAdmin Dashboard

## 📖 Inicio Rápido

### 1. Verificar Instalación (30 segundos)

```bash
# Validar que todos los archivos existan
cd frontend/src

# Servicio
ls services/adminService.js

# Componentes
ls components/dashboard/admin/AdminTable.jsx
ls components/dashboard/admin/AdminTable.css

# Pages
ls pages/SuperAdminDashboard.jsx
ls pages/SuperAdminDashboard.css

# Rutas
ls app/superadmin/dashboard/page.page.jsx

# Verificar cambios en AuthContext
grep "isSuperAdmin" context/AuthContext.jsx
```

### 2. Iniciar el Servidor (1 minuto)

```bash
cd frontend
npm install  # Si es necesario
npm run dev
```

La aplicación estará en: `http://localhost:3000`

### 3. Acceder al Panel (2 minutos)

1. Ir a: `http://localhost:3000/superadmin/dashboard`
2. Usar credenciales de SuperAdmin
3. Se mostrará la tabla de administradores (si el backend está implementado)

---

## 🎯 Estructura Rápida

```
SuperAdminDashboard (Página Principal)
├── Sidebar (Navegación)
│   ├── Gestión de Administradores ← Activo
│   ├── Solicitudes Pendientes
│   ├── Auditoría
│   └── Configuración
└── Main Content
    └── AdminTable (Tabla de administradores)
        ├── Búsqueda
        ├── Filtros
        ├── Tabla con 5 columnas
        └── Modales (Permisos, Estado)
```

---

## 💻 Código de Ejemplo

### Importar el Servicio
```javascript
import { adminService } from '@/services/adminService';
```

### Obtener Administradores
```javascript
const cargarAdmins = async () => {
  try {
    const admins = await adminService.getAdministradores();
    console.log(admins);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Actualizar Permisos
```javascript
const actualizarPermisos = async (adminId, permissions) => {
  try {
    const resultado = await adminService.updateAdminPermissions(
      adminId,
      permissions
    );
    console.log('Permisos actualizados:', resultado);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Usar:
actualizarPermisos(1, ['manage_users', 'manage_events']);
```

### Desactivar Administrador
```javascript
const desactivarAdmin = async (adminId, razon) => {
  try {
    await adminService.deactivateAdmin(adminId, razon);
    console.log('Administrador desactivado');
  } catch (error) {
    console.error('Error:', error);
  }
};

// Usar:
desactivarAdmin(1, 'Inactividad prolongada');
```

### Validar SuperAdmin en Componentes
```javascript
import { useAuth } from '@/context/AuthContext';

export function MiComponente() {
  const { isSuperAdmin } = useAuth();
  
  if (!isSuperAdmin) {
    return <div>❌ Solo SuperAdmin puede acceder</div>;
  }
  
  return <div>✅ Contenido SuperAdmin</div>;
}
```

---

## 📊 Columnas de la Tabla

| Columna | Descripción | Acciones |
|---------|-------------|----------|
| **Nombre** | Nombre del administrador + Avatar | Solo lectura |
| **Email** | Email del administrador | Solo lectura |
| **Permisos Activos** | Badges de permisos (max 2 visible) | Editable via modal |
| **Estado** | Active/Inactive badge | Editable via modal |
| **Acciones** | Botones para gestionar | 🔐 Permisos, ⛔ Estado |

---

## 🔐 Permisos Disponibles

```javascript
const permissionOptions = [
  { id: 'manage_users', label: '👥 Gestionar Usuarios' },
  { id: 'manage_events', label: '📅 Gestionar Eventos' },
  { id: 'manage_admins', label: '⚙️ Gestionar Administradores' },
  { id: 'view_reports', label: '📊 Ver Reportes' },
  { id: 'manage_queue', label: '⏳ Gestionar Cola' },
  { id: 'system_config', label: '🔧 Configuración del Sistema' }
];
```

---

## 🎨 Temas y Colores

```javascript
// Colores principales
const colores = {
  fondo: '#0f0f0f',
  secundario: '#1a1a1a',
  acento: '#ffb800',      // Oro
  naranja: '#ff8c00',     // Naranja
  exito: '#4caf50',       // Verde
  error: '#f44336',       // Rojo
  advertencia: '#ff9800'  // Naranja
};
```

---

## 🧪 Pruebas Rápidas

### Test 1: Carga de Tabla
```javascript
// En browser console
fetch('http://localhost:8000/api/v1/users/administrators/', {
  headers: { 'Authorization': 'Bearer TOKEN_AQUI' }
})
.then(r => r.json())
.then(data => console.log(data));
```

### Test 2: Permisos de Usuario
```javascript
// En browser console
const { isSuperAdmin } = useAuth();
console.log('¿Es SuperAdmin?', isSuperAdmin);
```

---

## 🛠️ Troubleshooting

### Problema: "No tienes acceso a este panel"
**Solución**: Verifica que el usuario tenga `role: 'SuperAdmin'` en el backend

### Problema: Tabla vacía
**Solución**: Verifica que el endpoint `/api/v1/users/administrators/` esté implementado

### Problema: Botones no funcionan
**Solución**: Verifica que los endpoints POST/PATCH estén implementados en el backend

### Problema: CSS no carga
**Solución**: Verifica que los imports en page.page.jsx sean correctos

---

## 📝 Archivos Clave

```
Frontend - Estructura
├── src/
│   ├── services/
│   │   └── adminService.js ← Lógica de API
│   │
│   ├── components/dashboard/admin/
│   │   ├── AdminTable.jsx ← Tabla principal
│   │   └── AdminTable.css ← Estilos
│   │
│   ├── pages/
│   │   ├── SuperAdminDashboard.jsx ← Panel
│   │   └── SuperAdminDashboard.css ← Estilos
│   │
│   ├── context/
│   │   └── AuthContext.jsx ← isSuperAdmin agregado
│   │
│   └── app/superadmin/dashboard/
│       └── page.page.jsx ← Ruta Next.js
```

---

## 🚀 Deploy Checklist

- [ ] Verificar que AuthContext tenga isSuperAdmin
- [ ] Verificar que AdminTable.jsx está en components/
- [ ] Verificar que SuperAdminDashboard.jsx está en pages/
- [ ] Verificar que adminService.js está en services/
- [ ] Verificar que la ruta /superadmin/dashboard existe
- [ ] Verificar que el backend tiene los endpoints requeridos
- [ ] Hacer npm run build sin errores
- [ ] Verificar en producción que solo SuperAdmin accede

---

## 📞 Endpoints Backend Requeridos

Mínimo requerido para funcionalidad básica:

```
GET /api/v1/users/administrators/
PATCH /api/v1/users/{id}/permissions/
PATCH /api/v1/users/{id}/
```

Ver `SUPERADMIN_BACKEND_INTEGRATION.md` para lista completa.

---

## 💡 Tips y Trucos

1. **Búsqueda en tiempo real**: Empieza a escribir en el input para filtrar
2. **Ordenar columnas**: Haz click en los headers para ordenar
3. **Seleccionar múltiples**: Usa los checkboxes para seleccionar varios
4. **Permisos rápidos**: Modal permite agregar/quitar permisos sin guardar
5. **Botones con emoji**: 🔐 = Permisos, ⛔ = Desactivar, ✅ = Reactivar

---

## 🎓 Documentación Completa

Para más detalles, ver:
- `SUPERADMIN_IMPLEMENTATION.md` - Guía completa
- `SUPERADMIN_BACKEND_INTEGRATION.md` - Especificación técnica
- `SUPERADMIN_DELIVERY.md` - Resumen de entrega

---

## ✨ ¡Listo!

El panel SuperAdmin está completamente implementado y listo para usar. Solo necesita:

1. ✅ Frontend (ya está)
2. ⏳ Backend (implementar endpoints)
3. ⏳ Base de datos (campos necesarios)

**Tiempo de integración backend**: ~2-3 horas

---

**Última actualización**: Mayo 2024
**Versión**: 1.0.0
**Status**: 🟢 COMPLETO
