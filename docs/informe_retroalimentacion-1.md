# Informe de Retroalimentación — Integración del Equipo
**Sprint 1 | ProyectoSoftware | 19–20 mar 2026**

---

## Contexto

Al revisar el historial de commits del Sprint 1 se detectaron **6 errores de integración** que causaron que el trabajo de 3 integrantes del equipo (Ariana, Anghelo y Marcia) no quedara correctamente en `main`. Este documento registra qué ocurrió, cómo se resolvió y cómo debería haberse hecho.

---

## Error 1 — El merge de Anghelo no incorporó el trabajo de Ariana en [views.py](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/views.py) y [serializers.py](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/serializers.py)

### ¿Qué pasó?
Ariana implementó el [LoginSerializer](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/serializers.py#71-94) con JWT, el action [login](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/views.py#61-69) y la validación de email en [serializers.py](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/serializers.py) y [views.py](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/views.py). Cuando Anghelo hizo el **Merge Pull Request #1**, estos cambios no quedaron en `main`. Los archivos [views.py](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/views.py) y [serializers.py](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/serializers.py) permanecieron en la versión base original.

### ¿Por qué?
Ariana y Anghelo trabajaron en la **misma rama** (`anghelo`). Anghelo hizo su propia versión del [views.py](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/views.py) partiendo del `main` original (antes de los commits de Ariana en esa rama). Al momento del merge, Git tomó la versión más reciente de Anghelo que **pisó** los cambios de Ariana en esos archivos, porque ambas versiones partían de puntos distintos y no se reconciliaron manualmente.

### ¿Cómo se resolvió?
Se revisaron los commits de Ariana (`de9a7cb`) y se incorporaron manualmente los cambios:
- [LoginSerializer](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/serializers.py#71-94) con JWT que incluye [email](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/serializers.py#54-64) y [role](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/tests.py#77-81) en el payload
- [validate_email()](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/serializers.py#54-64) con mensaje claro de error
- Action [login](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/views.py#61-69) en [UserViewSet](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/views.py#16-98)

### ¿Cómo debería haberse hecho?
Cada integrante debería trabajar en **su propia rama** y nunca en la misma. El flujo correcto:

```bash
# Ariana
git checkout -b feature/ariana-login
# ... hace sus commits ...
git push origin feature/ariana-login
# Abre PR → main

# Anghelo, después de que se mergea el PR de Ariana
git checkout -b feature/anghelo-validaciones
git pull origin main   # ← CLAVE: partir siempre del main actualizado
# ... hace sus commits ...
git push origin feature/anghelo-validaciones
# Abre PR → main
```

Así los PRs van en secuencia y no hay pisotones de código.

---

## Error 2 — El `venv` de Python fue commiteado al repositorio

### ¿Qué pasó?
El commit `b81d380` de Anghelo ("Subiendo proyecto completo") incluyó la carpeta `backend/venv/` completa — miles de archivos de paquetes Python (Django, requests, etc.).

### ¿Por qué?
Anghelo no tenía un [.gitignore](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/.gitignore) activo en su ambiente local, o commiteó con `git add .` sin verificar qué archivos estaba agregando.

### ¿Cómo se resolvió?
El [.gitignore](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/.gitignore) raíz ya tenía `venv/`, pero no cubría subdirectorios. Se agregó:
```gitignore
**/venv/
**/env/
```

> **Nota**: Los archivos del commit original siguen en el historial de git (no se puede borrar sin reescribir historia). Pero de ahora en adelante no se volverán a subir.

### ¿Cómo debería haberse hecho?
Antes de hacer el primer `git add`, siempre revisar:
```bash
git status          # ver qué archivos se van a agregar
git diff --staged   # ver exactamente qué cambios van
```

Y asegurarse de que el [.gitignore](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/.gitignore) esté activo **antes** de crear el entorno virtual.

---

## Error 3 — El trabajo de Marcia quedó en una rama huérfana sin mergear

### ¿Qué pasó?
Marcia creó 30 archivos de frontend React (`Login.jsx`, `Dashboard.jsx`, `Home.jsx`, `AuthContext.jsx`, etc.) en el commit `5c2d450`. Sin embargo, este commit quedó en una **rama que nunca se conectó a `main`**. El trabajo completo de Marcia era inaccesible desde la rama principal.

### ¿Por qué?
Marcia subió sus cambios pero no abrió un Pull Request para mergearlos en `main`. El commit quedó flotando en el historial de git sin ninguna rama activa que lo conectara a `main`.

### ¿Cómo se resolvió?
Se usó `git cherry-pick` para traer ese commit directamente a `main`:
```bash
git cherry-pick 5c2d450
```
Esto copió los 30 archivos de Marcia al estado actual de `main` sin afectar el resto del historial.

### ¿Cómo debería haberse hecho?
```bash
# Marcia, cuando terminó su trabajo
git push origin feature/marcia-frontend
# Luego abrir un Pull Request en GitHub desde feature/marcia-frontend → main
```

---

## Error 4 — Marcia subió el proyecto entero en una carpeta `/marcia/`

### ¿Qué pasó?
El commit `a3c3f9b` "movió" todos los archivos del proyecto a una subcarpeta `/marcia/`. Esto creó confusión y habría duplicado todo el código si hubiera tenido contenido real.

### ¿Por qué?
Probablemente Marcia trabajó localmente con una copia del proyecto en una carpeta llamada `marcia/` y accidentalmente subió esa estructura de carpetas al repositorio.

### ¿Cómo se resolvió?
En la práctica la carpeta `/marcia/` no existe en el directorio de trabajo actual (el commit fue un git rename de archivos que no existían en `main`), por lo que no causó daño real. Se dejó en el historial de git tal cual — no era necesario limpiarla.

### ¿Cómo debería haberse hecho?
Siempre trabajar **dentro del directorio raíz del proyecto** clonado. Antes de hacer cualquier commit, revisar con `git status` que los cambios corresponden a los archivos correctos.

---

## Error 5 — Nombres de roles inconsistentes (inglés vs. español)

### ¿Qué pasó?
En el commit `50b3cf5` de Ariana, los roles se nombraron como `buyer`, [promoter](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-events/events/views.py#55-67), `admin` (inglés, minúsculas). En los tests y en el acuerdo del equipo se definieron como `Comprador`, [Promotor](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-profiles/profiles/models.py#29-41), `Administrador` (español, capitalizados).

### ¿Por qué?
No hubo un acuerdo documentado sobre los nombres de los roles. Cada integrante tomó una decisión propia.

### ¿Cómo se resolvió?
Los tests de integración ([tests.py](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/tests.py)) se escribieron con los nombres en español (`Comprador`, [Promotor](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-profiles/profiles/models.py#29-41)). En el serializer y las views se maneja el `role.name` directamente desde la base de datos, por lo que el nombre correcto depende de qué datos se inserten en la BD.

> **Pendiente**: Crear una **data migration** que inserte los 3 roles con los nombres acordados en español.

### ¿Cómo debería haberse hecho?
Definir en el README o en un documento compartido las constantes del sistema antes de empezar a codear:
```
ROLES:
  - "Administrador"
  - "Comprador"
  - "Promotor"
```

---

## Error 6 — Campos del modelo renombrados sin coordinación (`reset_token_expires` → `reset_token_expire`)

### ¿Qué pasó?
Anghelo renombró el campo `reset_token_expires` (con 's') a `reset_token_expire` (sin 's') en una migración (`0003`). Esta migración no llegó a `main`, por lo que el modelo actual tiene `reset_token_expires` pero podría haber bases de datos en el equipo con `reset_token_expire`.

### ¿Por qué?
Cambios al modelo de base de datos sin coordinarlo con el equipo y sin asegurarse de que la migración llegara a `main`.

### ¿Cómo se resolvió?
El modelo en `main` conserva `reset_token_expires` (nombre original). Si algún miembro del equipo tiene la BD con `reset_token_expire`, necesitará hacer un `python manage.py migrate` cuando reciba el `main` actualizado.

### ¿Cómo debería haberse hecho?
Cualquier cambio a modelos (que genera migraciones) debe:
1. Discutirse con el equipo antes
2. La migración debe llegar en el mismo PR que el cambio del modelo
3. El resto del equipo debe hacer `git pull` + `python manage.py migrate` al recibir el cambio

---

## Resumen de resoluciones

| # | Error | Cómo se resolvió | Commit |
|---|---|---|---|
| 1 | Trabajo de Ariana perdido en merge | Incorporación manual de LoginSerializer y action login | `93f213c` |
| 2 | venv commiteado al repo | Añadido `**/venv/` al [.gitignore](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/.gitignore) | `93f213c` |
| 3 | Trabajo de Marcia en rama huérfana | `git cherry-pick 5c2d450` | `5788e1d` |
| 4 | Carpeta `/marcia/` duplicada | No causó daño real; se dejó en historial | — |
| 5 | Nombres de roles inconsistentes | Tests escritos con nombres en español | `93f213c` |
| 6 | Campo renombrado sin coordinar | Modelo conserva nombre original | — |

---

## Flujo Git recomendado para el equipo

```
main (rama protegida — nadie pushea directo aquí)
├── feature/gustavo-auth-base      ← Gustavo
├── feature/ariana-login           ← Ariana
├── feature/anghelo-validaciones   ← Anghelo
└── feature/marcia-frontend        ← Marcia
```

**Reglas de equipo:**

1. **Nunca trabajar directamente en `main`** — siempre crear una rama propia
2. **Nombres de ramas descriptivos**: `feature/<nombre>-<tarea>` o `fix/<nombre>-<descripcion>`
3. **Un PR por subtarea** — no acumular todo el trabajo en un solo PR gigante
4. **Antes de abrir un PR**: hacer `git pull origin main` y resolver conflictos en tu rama local
5. **Comunicar qué archivos modificarás** antes de empezar — especialmente si son archivos compartidos como [models.py](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/models.py), [serializers.py](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/serializers.py), [views.py](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/service-auth/users/views.py)
6. **Revisar con `git status` antes de `git add`** — nunca hacer `git add .` sin revisar
7. **El [.gitignore](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/.gitignore) debe estar configurado antes del primer commit** y nunca commitear `venv/`, `node_modules/`, [.env](file:///c:/Users/Gustavo/Documents/UCB/Taller%20de%20Desarrollo%20de%20Software/Project/ProyectoSoftware/.env)

---

## Estado final del repositorio

```
main (93f213c)
├── service-auth/users/serializers.py  ✅ LoginSerializer + JWT + validate_email
├── service-auth/users/views.py        ✅ action login + validación 409
├── service-auth/users/tests.py        ✅ 7 tests automatizados
├── service-auth/users/models.py       ✅ AbstractBaseUser + UserManager
├── frontend/src/pages/                ✅ Login.jsx, Registro.jsx, Dashboard.jsx, Home.jsx
├── frontend/src/components/           ✅ Comprador, Promotor, Eventos
├── frontend/src/context/              ✅ AuthContext.jsx
├── frontend/src/services/             ✅ authService.js, eventosService.js
└── .gitignore                         ✅ **/venv/ agregado
```

**Para hacer push:**
```bash
git push origin main   # push normal, no se necesita --force
```
