# HU-1: Sistema de Registro — Documentación Técnica

## Resumen

Implementación completa del flujo de registro de nuevos usuarios (*end-to-end*) para la plataforma **TicketGo**. El sistema permite a cualquier visitante registrarse como **Comprador** o **Promotor**, validar requisitos de seguridad en su contraseña en tiempo real, e iniciar sesión automáticamente conectándolo a su respectivo panel de control tras ver el modal de bienvenida.

---

## Funcionalidades implementadas

### Backend (`service-auth`)

| Componente | Descripción |
|---|---|
| `POST /api/v1/users/register/` | Endpoint genérico para registro. Recibe `email`, `password` y procesa el string de rol (`role`) como el tipo de usuario final al que será asignado. |
| `UserCreateSerializer` | En `users/serializers.py` se sobreescribió la validación normal de Django Rest Framework hacia `SlugRelatedField` para determinar y vincular la id del rol al usuario utilizando estrictamente su nombre en texto. |
| `tests.py (Users)` | Cobertura de tests unitarios actualizada para inyectar correctamente el texto del rol (`Comprador`) en todas las aserciones de factoría automática enviada. |

### Frontend (`frontend`)

| Componente | Descripción |
|---|---|
| `src/pages/Registro.jsx` | Interfaz implementada en el esquema de la compañera vía React Router. Lógica de indicadores de fortaleza de contraseña incorporada, validaciones activas en front al hacer `submit`, y la adición vital del auto-login utilizando `authService.login()` y la actualización global directa (inyección en `AuthContext` vía la variable `useAuth`) tras crearse la cuenta. |
| `src/services/authService.js` | Incorporación del llamado asíncrono `authService.register` invocando `POST /api/v1/users/register/` junto con control robusto de errores de API y respuesta procesada al frontend de React. |
| `src/pages/Registro.css` | Corrección de sobreposición al añadir selectores CSS de alta prioridad contra reglas globales como reseters (`padding` para alojar cómodamente los botones del "Volver al Inicio" y el ícono del ojo). |
| `next.config.js` | Definición imperativa obligatoria (`pageExtensions: ['page.tsx']`) para imposibilitar y prevenir que el Pages Router (interno por defecto a Next.js) intente asimilar y sobreescribir la carpeta `src/pages/` produciendo crashes al encontrar components `useAuth` sin `Providers`. |
| `src/app/[[...slug]]/page.page.tsx` | Desconexión de _Server-Side Rendering_ impuesta por el App Router (`ssr: false`) en la raíz Catch-all, logrando un control monopólico, sin pantallas 404 ni parpadeos para `React Router Dom` a partir de `src/App.jsx`. |

### Redirección post-registro y Auto-Login

| Eventos | Triger |
|---|---|
| Creación de Sesión | Al momento exacto de recibir el *success: 201* del registro en el backend, la UI desencadena subrepticiamente una llamada de login. |
| Redirección al Dashboard | `Registro.jsx` espera que el usuario dé click al botón "¡Comenzar!" o interactúe para cerrar el "Modal de Bienvenida". Tras descartarse, redirecciona su tráfico a la ruta `/dashboard`. |

---

## Guía para Consultar la Base de Datos

El microservicio utiliza una base de datos montada en su propio contenedor dentro del entorno Docker administrada por PostgreSQL (`profiles_db` o similar dependiendo de Docker-Compose).

Si deseas revisar los usuarios insertados a mano a través del front:

> [!TIP]
> **Comando rápido para inspeccionar todos los usuarios de la tabla default auth:**
> 
> ```bash
> docker-compose exec profiles_db psql -U admin -d auth_db -c "SELECT * FROM users_user;"
> ```
*(Cambia `profiles_db` si el nombre exacto de tu servicio de PostgreSQL está nombrado distinto en el docker-compose).*

**Si prefieres ingresar a la consola interactiva de PostgreSQL para ver metadatos o buscar un error local:**

1. Ejecuta la shell sql a través del container:
   ```bash
   docker-compose exec profiles_db psql -U admin -d auth_db
   ```
2. Ya dentro observarás el prompt (`auth_db=#`). De ahí puedes lanzar rutinas como:
   ```sql
   -- Ver correos y estado de los últimos 5 inscriptos ordenados por ID
   SELECT id, email, is_active FROM users_user ORDER BY id DESC LIMIT 5;
   
   -- Ver los tipos de roles existentes
   SELECT id, name FROM users_role;
   
   -- Salir de la base de datos
   \q
   ```

---

## Guía de Prueba

**1. Navegar a ruta de registro:**
Ingresar a `http://localhost:3000/registro` o usar el enlace "¿No tienes cuenta? Regístrate aquí" a partir del Home/Login.

**2. Revisión de Campos Visuales:**
- Completar la contraseña viendo que las sub-condiciones van cambiando a color verde o ganan un ticket (✓) al superarse (mayúscula, caracter especial).
- Reconfirmar si al intentar duplicar el email de `admin@ticketgo.com` responde la red con el error de duplicado y lo alerta en pantalla.
- Jugar con la paleta de modo Dark/Light a voluntad.

**3. Test Exitoso del Auto-Login (End-to-End):**

| Campo | Valor |
|---|---|
| Rol Clickeado | Promotor |
| Nombre y Apellido | *Test Demo* |
| Email | `nuevo@test.com` |
| Contraseñas (Ambas) | `Demostracion1!` |

- **Verificación 1:** Clic en botón "Registrarse". Modal de "🎉 ¡Bienvenido Promotor!" hace una animación `slideUp` y acapara la pantalla.
- **Verificación 2:** Tras bastidores sin emitir alerta (se comprueba en Panel De Red F12 si existe el request `/login/`), la plataforma le adjudica un Token `access` a la memoria del local storage validando la sesión en el React Router.
- **Resultado final:** Al presionar "¡Comenzar!", la ventana invoca al `navigate('/dashboard')` arrojándolo automáticamente al panel interno de TicketGo confirmando la creación e inicio efectivo.
