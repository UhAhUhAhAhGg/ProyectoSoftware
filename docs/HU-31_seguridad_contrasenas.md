# HU-31: Seguridad de Contraseñas — Documentación Técnica

## 1. Resumen
Implementación de los protocolos de seguridad industrial para garantizar la integridad y privacidad de las credenciales de los usuarios en la plataforma. Siguiendo estándares mundiales, el sistema aplica cifrado unidireccional (*One-way Hashing*) para que las contraseñas reales nunca se almacenen ni circulen en texto plano.

---

## 2. Justificación de Cumplimiento (Tickets Jira)

| Ticket | Subtarea | Justificación Técnica |
|:---|:---|:---|
| **TIC-125**| [Backend] Selección de herramienta de protección | Se utiliza el motor nativo de Django, configurado con el algoritmo de hashing **PBKDF2 con SHA256**, estándar de la industria. |
| **TIC-126**| [Backend] Hash durante el Registro | En `UserManager.create_user`, el sistema utiliza la función `user.set_password(password)`, transformando la clave en un hash irreversible antes de guardarla. |
| **TIC-127**| [Backend] Comparación segura en Login | El proceso de autenticación en `LoginSerializer` utiliza la función `authenticate()`, que compara hashes criptográficamente sin requerir conocer la clave real. |
| **TIC-128**| [Backend] Tamaño de base de datos | Se aseguró que el campo `password` (heredado de `AbstractBaseUser`) tenga longitud suficiente (128 caracteres) para almacenar el prefijo del algoritmo, el salt y el hash final. |
| **TIC-129**| [PA] Visualización de BD | Al consultar la tabla `users_user`, las contraseñas aparecen como cadenas aleatorias tipo `pbkdf2_sha256$720000$pBv...`, cumpliendo el requisito visual de ocultación. |
| **TIC-130**| [PA] Privacidad de administradores | Ni siquiera un administrador con acceso Root a la base de datos puede descifrar o revertir el hash de una contraseña de usuario. |
| **TIC-131**| [PA] Login funcional con hash | El sistema reconoce correctamente la clave real ingresada por el usuario en `Login.jsx`, confirmando que el algoritmo de verificación de hash es bidireccionalmente coherente. |
| **TIC-132**| [PA] Aplicación de Sal (Salt) | Se verificó que cada usuario posee un **Salt único**. Esto garantiza que, si dos usuarios usan la misma contraseña simple, sus registros en la BD sean totalmente distintos. |

## 3. Guía de Prueba (Verificación Técnica)

Para comprobar que la **HU-31** es efectiva, puedes realizar estas pruebas:

### Prueba 1: Verificación de Hashing (Registro)
1. Registra un nuevo usuario desde el frontend.
2. Ejecuta el comando en terminal:
   ```bash
   docker-compose exec profiles_db psql -U admin -d auth_db -c "SELECT email, password FROM users_user WHERE email='tu_correo@test.com';"
   ```
3. **Resultado esperado:** La columna `password` debe mostrar un hash largo (ej. `pbkdf2_sha256$...`) y **nunca** la clave escrita por el usuario.

### Prueba 2: Verificación de Salting (Colisiones)
1. Registra **dos** usuarios diferentes con la **misma contraseña** (ej. `ClaveIgual123!`).
2. Consulta ambos en la base de datos:
   ```sql
   SELECT email, password FROM users_user WHERE password LIKE 'pbkdf2_sha256$%';
   ```
3. **Resultado esperado:** Los hashes de ambos usuarios deben ser **completamente diferentes**. Esto confirma que el "Salt" aleatorio está funcionando correctamente.

### Prueba 3: Integridad del Login
1. Intenta iniciar sesión con la contraseña original.
2. **Resultado esperado:** Acceso concedido (el sistema sabe comparar el hash contra la clave entrante).
3. Intenta cambiar un caracter del hash directamente en la BD y loguearte de nuevo.
4. **Resultado esperado:** Acceso denegado (la integridad del hash protege la cuenta).

---

## 4. Seguridad de Transmisión
Toda contraseña viajando desde el frontend hacia el backend se realiza bajo el protocolo HTTP dentro de un cuerpo JSON en peticiones `POST`, asegurando que el canal esté protegido y sea compatible con implementaciones futuras de TSL/SSL (HTTPS).
