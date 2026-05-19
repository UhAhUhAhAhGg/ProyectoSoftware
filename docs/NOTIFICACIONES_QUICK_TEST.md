# Quick Reference: Pruebas de Notificaciones

## Datos de Prueba

```
Comprador ID: 0f8bdd7a-3e3a-44e4-9710-394bf8b5d544
Email: comprador@ticketproject.com
Password: Comprador1234!

Promotor ID: cb85f364-2635-4a7f-ba5a-ec0ac0eca562
Email: promotor@ticketproject.com
Password: Promotor1234!

Categoría: Música (a497fd97-9245-4266-9f0b-6a3324658882)
```

## Paso 1: Obtener Tokens

### Login Comprador
```bash
curl -X POST http://localhost:8000/api/v1/users/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email":"comprador@ticketproject.com",
    "password":"Comprador1234!"
  }' | jq .
```

### Login Promotor
```bash
curl -X POST http://localhost:8000/api/v1/users/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email":"promotor@ticketproject.com",
    "password":"Promotor1234!"
  }' | jq .
```

## Paso 2: Crear y Publicar Evento

### Crear Evento (Promotor)
```bash
curl -X POST http://localhost:8002/api/v1/events/ \
  -H "Authorization: Bearer {PROMOTOR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "promoter_id":"cb85f364-2635-4a7f-ba5a-ec0ac0eca562",
    "name":"Evento Test Notificaciones",
    "description":"Evento de prueba",
    "event_date":"2026-06-20",
    "event_time":"20:00:00",
    "location":"Lugar Test",
    "capacity":100,
    "category":"a497fd97-9245-4266-9f0b-6a3324658882"
  }' | jq '.id'
```

### Publicar Evento (Promotor)
```bash
curl -X POST http://localhost:8002/api/v1/events/{EVENT_ID}/publish/ \
  -H "Authorization: Bearer {PROMOTOR_TOKEN}"
```

## Paso 3: Probar Endpoints

### GET Notificaciones
```bash
curl -X GET http://localhost:8002/api/v1/users/0f8bdd7a-3e3a-44e4-9710-394bf8b5d544/notifications/ \
  -H "Authorization: Bearer {COMPRADOR_TOKEN}" | jq .
```

### GET Notificaciones (filtro no leídas)
```bash
curl -X GET "http://localhost:8002/api/v1/users/0f8bdd7a-3e3a-44e4-9710-394bf8b5d544/notifications/?leida=false" \
  -H "Authorization: Bearer {COMPRADOR_TOKEN}" | jq '.results | length'
```

### PATCH Marcar como Leída
```bash
curl -X PATCH http://localhost:8002/api/v1/users/0f8bdd7a-3e3a-44e4-9710-394bf8b5d544/notifications/{NOTIF_ID}/read/ \
  -H "Authorization: Bearer {COMPRADOR_TOKEN}" \
  -H "Content-Type: application/json" | jq .
```

### PATCH Marcar Todas como Leídas
```bash
curl -X PATCH http://localhost:8002/api/v1/users/0f8bdd7a-3e3a-44e4-9710-394bf8b5d544/notifications/read-all/ \
  -H "Authorization: Bearer {COMPRADOR_TOKEN}" \
  -H "Content-Type: application/json" | jq .
```

## Validaciones

- [ ] GET devuelve 200 OK
- [ ] Total notificaciones > 0
- [ ] Campo `leida` es boolean
- [ ] PATCH devuelve 200 OK
- [ ] Timestamp `leida_at` se actualiza
- [ ] Filtro ?leida=false funciona

