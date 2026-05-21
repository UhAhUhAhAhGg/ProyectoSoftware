# HU-29: Eliminar Cuenta Voluntariamente

> Como usuario, quiero poder eliminar mi cuenta voluntariamente, para que mis datos personales sean removidos del sistema.

## Arquitectura

### Flujo

```
Usuario en /perfil
  -> Clic en "Eliminar mi cuenta"
  -> Se abre modal de confirmacion con consecuencias
  -> Usuario ingresa su contrasena actual
  -> DELETE /api/v1/users/me/ con { password }
  -> Backend valida password
  -> Crea registro en AccountDeletionLog (auditoria)
  -> Hard delete del usuario
  -> Frontend limpia sesion
  -> Redirige a /cuenta-eliminada
```

## Backend (service-auth)

### Modelo: AccountDeletionLog

```python
class AccountDeletionLog(models.Model):
    user_email = models.EmailField()
    user_role = models.CharField(max_length=50, null=True)
    deleted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'account_deletion_logs'
```

- No usa ForeignKey a User (porque el usuario se elimina fisicamente)
- Almacena email y rol para auditoria/cumplimiento legal

### Endpoint: DELETE /api/v1/users/me/

- **Permiso:** IsAuthenticated
- **Body:** `{ "password": "contrasena_actual" }`
- **Logica:**
  1. Valida que se envie `password`
  2. Verifica con `user.check_password(password)`
  3. Si es incorrecta -> 403 "Contrasena incorrecta"
  4. Crea `AccountDeletionLog` con email y rol
  5. Ejecuta `user.delete()` (hard delete, CASCADE elimina UserProfile)
  6. Retorna 200 "Cuenta eliminada exitosamente"

## Frontend

### Modal de eliminacion (en PerfilUsuario.jsx)

- **Trigger:** Boton rojo "Eliminar mi cuenta" en la zona de peligro
- **Contenido del modal:**
  1. Titulo con icono de advertencia
  2. Lista de consecuencias:
     - Se eliminaran todos tus datos personales permanentemente
     - Perderas acceso a todos tus eventos y entradas
     - No podras recuperar tu cuenta ni tus compras
     - Esta accion no se puede deshacer
  3. Input de contrasena para confirmacion
  4. Botones "Cancelar" y "Eliminar definitivamente"

### Flujo post-eliminacion

1. `deleteAccount(password)` en AuthContext llama `authService.deleteAccount(token, password)`
2. Limpia `user`, `token`, `loading` del estado
3. Limpia localStorage (`user`, `token`, `refresh`)
4. Redirige a `/cuenta-eliminada`

## Archivos modificados/creados

| Archivo | Cambio |
|---------|--------|
| `service-auth/users/models.py` | Modelo `AccountDeletionLog` |
| `service-auth/users/views.py` | DELETE en endpoint `me` |
| `frontend/src/pages/PerfilUsuario.jsx` | Modal de eliminacion con consecuencias |
| `frontend/src/pages/PerfilUsuario.css` | Estilos del modal y zona de peligro |
| `frontend/src/context/AuthContext.jsx` | `deleteAccount()` |
| `frontend/src/services/authService.js` | `deleteAccount(token, password)` |

## Pruebas de aceptacion

### PA-1: Confirmacion con consecuencias
1. Ir a `/perfil`
2. Clic en "Eliminar mi cuenta"
3. **Verificar:** Modal muestra lista de 4 consecuencias
4. **Verificar:** Boton de eliminar requiere contrasena

### PA-2: Contrasena incorrecta
1. En el modal, ingresar una contrasena incorrecta
2. Clic en "Eliminar definitivamente"
3. **Verificar:** Error "Contrasena incorrecta"

### PA-3: Eliminacion exitosa
1. Ingresar la contrasena correcta
2. Clic en "Eliminar definitivamente"
3. **Verificar:** Redireccion a `/cuenta-eliminada`
4. **Verificar:** Intentar login con las mismas credenciales falla

### PA-4: Registro de auditoria
```bash
docker compose exec service-auth python manage.py shell -c "
from users.models import AccountDeletionLog
for log in AccountDeletionLog.objects.all():
    print(f'{log.user_email} - {log.user_role} - {log.deleted_at}')
"
```
**Verificar:** Aparece el email del usuario eliminado con fecha/hora
