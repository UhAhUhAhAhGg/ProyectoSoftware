# 📱 Guía Rápida de Endpoints para Frontend

> **Descripción:** Referencia rápida de todos los endpoints que interactúan con BD, con ejemplos de uso en JavaScript

---

## 🔐 Service-Auth (Puerto 8001)

### Base URL
```
http://localhost:8001/api/v1
```

### 1. **Registro de Usuario**

#### Endpoint
```
POST /users/register/
```

#### Request
```javascript
const response = await fetch('http://localhost:8001/api/v1/users/register/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'nuevo@example.com',
    password: 'SecurePass123!'
  })
});
```

#### Response (201 Created)
```json
{
  "status": "success",
  "message": "Usuario creado correctamente.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "nuevo@example.com"
  }
}
```

---

### 2. **Login (Obtener Token JWT)**

#### Endpoint
```
POST /token/
```

#### Request
```javascript
const response = await fetch('http://localhost:8001/api/v1/token/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'usuario@example.com',
    password: 'SecurePass123!'
  })
});

const data = await response.json();
const accessToken = data.access;
const refreshToken = data.refresh;
localStorage.setItem('accessToken', accessToken);
```

#### Response (200 OK)
```json
{
  "access": "eyJ0eXAiOiJKV1QiLC...",
  "refresh": "eyJ0eXAiOiJKV1QiLC...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "usuario@example.com",
  "role": "buyer"
}
```

---

### 3. **Refrescar Token**

#### Endpoint
```
POST /token/refresh/
```

#### Request
```javascript
const response = await fetch('http://localhost:8001/api/v1/token/refresh/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refresh: localStorage.getItem('refreshToken')
  })
});

const data = await response.json();
localStorage.setItem('accessToken', data.access);
```

#### Response (200 OK)
```json
{
  "access": "eyJ0eXAiOiJKV1QiLC..."
}
```

---

### 4. **Obtener Perfil del Usuario**

#### Endpoint
```
GET /users/me/
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');
const response = await fetch('http://localhost:8001/api/v1/users/me/', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

#### Response (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "usuario@example.com",
  "is_active": true,
  "role": {
    "id": "role-uuid",
    "name": "buyer"
  },
  "profile": {
    "first_name": "Juan",
    "last_name": "Pérez",
    "phone": "+34 912 34 56 78",
    "date_of_birth": "1990-05-15",
    "profile_photo_url": "https://..."
  }
}
```

---

### 5. **Actualizar Perfil**

#### Endpoint
```
PUT/PATCH /users/me/
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');
const response = await fetch('http://localhost:8001/api/v1/users/me/', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    first_name: 'Juan Carlos',
    last_name: 'Pérez López',
    phone: '+34 912 34 56 78',
    profile_photo_url: 'data:image/png;base64,...'
  })
});
```

#### Response (200 OK)
```json
{
  "status": "success",
  "message": "Perfil actualizado correctamente.",
  "data": { /* usuario actualizado */ }
}
```

---

### 6. **Solicitar Recuperación de Contraseña**

#### Endpoint
```
POST /users/password_reset_request/
```

#### Request
```javascript
const response = await fetch('http://localhost:8001/api/v1/users/password_reset_request/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'usuario@example.com'
  })
});
```

#### Response (200 OK)
```json
{
  "status": "success",
  "message": "Se ha enviado un enlace de recuperación al correo"
}
```

---

### 7. **Confirmar Nueva Contraseña**

#### Endpoint
```
POST /users/password_reset_confirm/
```

#### Request
```javascript
const response = await fetch('http://localhost:8001/api/v1/users/password_reset_confirm/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'reset-token-from-email',
    new_password: 'NuevaPass123!'
  })
});
```

---

### 8. **Eliminar Cuenta**

#### Endpoint
```
DELETE /users/me/
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');
const response = await fetch('http://localhost:8001/api/v1/users/me/', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    password: 'contraseña-confirmacion'
  })
});
```

#### Response (200 OK)
```json
{
  "status": "success",
  "message": "Tu cuenta y todos tus datos personales han sido eliminados correctamente."
}
```

---

## 🎯 Service-Events (Puerto 8002)

### Base URL
```
http://localhost:8002/api/v1
```

### 1. **Listar Categorías**

#### Endpoint
```
GET /categories/
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');
const response = await fetch('http://localhost:8002/api/v1/categories/', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const categories = await response.json();
```

#### Response (200 OK)
```json
[
  {
    "id": "cat-uuid-1",
    "name": "Música",
    "description": "Eventos musicales",
    "is_active": true
  },
  {
    "id": "cat-uuid-2",
    "name": "Deportes",
    "description": "Eventos deportivos",
    "is_active": true
  }
]
```

---

### 2. **Listar Eventos (Catálogo)**

#### Endpoint
```
GET /events/
GET /events/?status=published
GET /events/?category={id}
GET /events/?event_date=2026-06-15
GET /events/?search=concierto
GET /events/?ordering=-event_date
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');

// Listar eventospublicados
const response = await fetch(
  'http://localhost:8002/api/v1/events/?status=published',
  { headers: { 'Authorization': `Bearer ${token}` } }
);

const { results, count, next } = await response.json();
```

#### Response (200 OK)
```json
{
  "count": 42,
  "next": "http://localhost:8002/api/v1/events/?page=2",
  "previous": null,
  "results": [
    {
      "id": "event-uuid",
      "promoter_id": "promoter-uuid",
      "name": "Concierto de Rock",
      "description": "Un increíble concierto",
      "event_date": "2026-06-15",
      "event_time": "20:00:00",
      "location": "Auditorio Nacional",
      "capacity": 2000,
      "image": "https://...",
      "status": "published",
      "created_at": "2026-04-01T10:00:00Z",
      "category": {
        "id": "cat-uuid",
        "name": "Música"
      }
    }
  ]
}
```

---

### 3. **Obtener Evento Específico**

#### Endpoint
```
GET /events/{id}/
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');
const eventId = 'event-uuid';

const response = await fetch(
  `http://localhost:8002/api/v1/events/${eventId}/`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

const event = await response.json();
```

---

### 4. **Crear Evento (Solo Promotor)**

#### Endpoint
```
POST /events/
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');

const response = await fetch('http://localhost:8002/api/v1/events/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Concierto de Jazz',
    description: 'Una noche de jazz en directo',
    event_date: '2026-07-20',
    event_time: '21:00:00',
    location: 'Teatro del Centro',
    capacity: 500,
    category: 'cat-uuid',
    image: null, // Opcionalpod
    status: 'draft'
  })
});

const event = await response.json();
```

#### Response (201 Created)
```json
{
  "status": "success",
  "message": "Evento creado correctamente.",
  "data": { /* evento creado */ }
}
```

---

### 5. **Actualizar Evento**

#### Endpoint
```
PUT/PATCH /events/{id}/
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');
const eventId = 'event-uuid';

const response = await fetch(
  `http://localhost:8002/api/v1/events/${eventId}/`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Concierto de Jazz Actualizado',
      capacity: 600
    })
  }
);
```

#### Response (200 OK)
```json
{
  "status": "success",
  "message": "Evento actualizado correctamente.",
  "data": { /* evento actualizado */ }
}
```

---

### 6. **Eliminar Evento (Soft Delete)**

#### Endpoint
```
DELETE /events/{id}/
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');
const eventId = 'event-uuid';

const response = await fetch(
  `http://localhost:8002/api/v1/events/${eventId}/`,
  {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
```

#### Response (200 OK)
```json
{
  "status": "success",
  "message": "El evento ha sido eliminado lógicamente..."
}
```

---

### 7. **Obtener Eventos Próximos**

#### Endpoint
```
GET /events/upcoming/
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');

const response = await fetch('http://localhost:8002/api/v1/events/upcoming/', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

### 8. **Listar Tipos de Entrada**

#### Endpoint
```
GET /tickettypes/
GET /tickettypes/?event={id}
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');
const eventId = 'event-uuid';

const response = await fetch(
  `http://localhost:8002/api/v1/tickettypes/?event=${eventId}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

const tickets = await response.json();
```

#### Response (200 OK)
```json
[
  {
    "id": "ticket-uuid-1",
    "event": "event-uuid",
    "name": "Entrada General",
    "description": "Entrada general para todo público",
    "price": "25.00",
    "max_capacity": 1000,
    "zone_type": "general",
    "is_vip": false,
    "status": "active",
    "current_sold": 450
  },
  {
    "id": "ticket-uuid-2",
    "event": "event-uuid",
    "name": "VIP",
    "description": "Entrada VIP con beneficios",
    "price": "75.00",
    "max_capacity": 200,
    "zone_type": "vip",
    "is_vip": true,
    "status": "active",
    "current_sold": 180
  }
]
```

---

### 9. **Crear Tipo de Entrada (Solo Promotor)**

#### Endpoint
```
POST /tickettypes/
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');

const response = await fetch('http://localhost:8002/api/v1/tickettypes/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    event: 'event-uuid',
    name: 'Entrada VIP',
    description: 'Acceso VIP con asiento numerado',
    price: '99.99',
    max_capacity: 100,
    zone_type: 'vip',
    is_vip: true,
    seat_rows: 5,
    seats_per_row: 20
  })
});
```

---

## 👤 Service-Profiles (Puerto 8003)

### Base URL
```
http://localhost:8003/api/v1
```

### 1. **Obtener Perfil de Admin**

#### Endpoint
```
GET /admin-profiles/by_user/?user_id={id}
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');
const userId = 'user-uuid';

const response = await fetch(
  `http://localhost:8003/api/v1/admin-profiles/by_user/?user_id=${userId}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

const profile = await response.json();
```

#### Response (200 OK)
```json
{
  "user_id": "user-uuid",
  "employee_code": "ADMIN-001",
  "department": "Administración"
}
```

---

### 2. **Obtener Perfil de Comprador**

#### Endpoint
```
GET /buyer-profiles/by_user/?user_id={id}
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');
const userId = 'user-uuid';

const response = await fetch(
  `http://localhost:8003/api/v1/buyer-profiles/by_user/?user_id=${userId}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

const profile = await response.json();
```

---

### 3. **Obtener Perfil de Promotor**

#### Endpoint
```
GET /promotor-profiles/by_user/?user_id={id}
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');
const userId = 'user-uuid';

const response = await fetch(
  `http://localhost:8003/api/v1/promotor-profiles/by_user/?user_id=${userId}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

const profile = await response.json();
```

#### Response (200 OK)
```json
{
  "user_id": "user-uuid",
  "company_name": "Eventos XYZ S.L.",
  "comercial_nit": "12345678A",
  "bank_account": "ES9121000418450200051332"
}
```

---

### 4. **Crear Perfil de Promotor**

#### Endpoint
```
POST /promotor-profiles/
```

#### Request
```javascript
const token = localStorage.getItem('accessToken');

const response = await fetch('http://localhost:8003/api/v1/promotor-profiles/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: 'user-uuid',
    company_name: 'Mi Empresa de Eventos',
    comercial_nit: '12345678A',
    bank_account: 'ES9121000418450200051332'
  })
});
```

---

## ⚙️ Gestor de Autenticación

Crea un archivo `authService.js` para manejar tokens automáticamente:

```javascript
// src/services/authService.js

class AuthService {
  constructor() {
    this.baseURL = 'http://localhost:8001/api/v1';
  }

  async login(email, password) {
    const response = await fetch(`${this.baseURL}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) throw new Error('Login fallido');

    const data = await response.json();
    localStorage.setItem('accessToken', data.access);
    localStorage.setItem('refreshToken', data.refresh);
    localStorage.setItem('user', JSON.stringify(data));

    return data;
  }

  async register(email, password) {
    const response = await fetch(`${this.baseURL}/users/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) throw new Error('Registro fallido');

    return await response.json();
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      'Content-Type': 'application/json'
    };
  }

  async refreshToken() {
    const refresh = localStorage.getItem('refreshToken');
    if (!refresh) throw new Error('No hay refresh token');

    const response = await fetch(`${this.baseURL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh })
    });

    if (!response.ok) {
      this.logout();
      throw new Error('Token refresh fallido');
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.access);
    return data.access;
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  }

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}

export default new AuthService();
```

---

## 🔄 Uso en Componentes React

```javascript
import authService from '../services/authService';
import { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const user = await authService.login(email, password);
      console.log('Login exitoso:', user);
      // Redirigir al dashboard
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
      />
      <button type="submit">Iniciar Sesión</button>
    </form>
  );
}
```

---

## 🚀 URLs de Swagger para Pruebas

Abre en tu navegador durante desarrollo:

```
🔐 Service-Auth:    http://localhost:8001/api/v1/schema/swagger-ui/
🎯 Service-Events:  http://localhost:8002/api/v1/schema/swagger-ui/
👤 Service-Profiles: http://localhost:8003/api/v1/schema/swagger-ui/
```

---

**Última actualización:** 4 de abril de 2026
