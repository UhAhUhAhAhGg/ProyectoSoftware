# Bitácora de Sesión: Estabilización de Arquitectura Frontend para Administradores (HU-4 / HU-5)

**Fecha de Ejecución:** Sesión actual (Actualizada a finales de sprint)
**Objetivo Principal:** Resolver los conflictos de renderizado y seguridad entre los diseños "legacy" (React Router) y la nueva arquitectura requerida para el pase a Producción **(Next.js App Router)**.

---

## 🏗️ 1. Conflictos Estructurales Resueltos
Al migrar los componentes aislados de la HU-4 (Panel de Administrador) y la HU-5 (Permisos de Módulos) hacia la estructura base actual del Frontend, se presentaron colisiones críticas (pantallas en blanco y errores de dependencias perdidas).  
Se tomó la decisión técnica de **mudar el ecosistema de Administración (`/admin/...`) puramente al App Router (`src/app/admin/`)**, encapsulando cada vista dentro de un archivo `page.page.jsx` que inyecta su propio Provider y Hoja de Estilos de forma manual.

### Endpoints
*   Se uniformizaron las rutas a nivel frontend. Se añadió el prefijo faltante `/api/v1/` en `authService.js` previniendo errores de *"Unexpected token HTML <"* debido a que React colisionaba de frente con el código 404 del backend.
*   El backend Django (`views.py`) fue reparado localmente para que la validación exclusiva `admin_login` devolviera correctamente los Web Tokens (`access`, `refresh`) indispensables, cosa que originalmente generaba un bucle bloqueante.

---

## 🔣 2. Recuperación de Codificación (Mojibake UTF-8)
Debido a herramientas de migración cruzadas entre equipos usando sistemas operativos Linux y Windows sin parámetros `utf-8` fijos, todos los archivos nativos traídos de la rama `marcia2` desarrollaron corrupción de caracteres especiales (*Mojibake*, transformando "Configuración" en "ConfiguraciÃ³n").
*   **Solución:** Se construyeron e interpusieron scripts globales de Python (`fix_all_encoding.py`) que analizaron más de `N` archivos `.jsx` y `.css` en cascada reescribiendo y reparando las estructuras sintácticas de manera automatizada.

---

## 🎨 3. UI/UX: Modos de Visualización y Toggles CSS
El contenedor de autenticación administrativa presentaba serios fallos en Next.js originados por la superposición o anidación invertida de las clases CSS Globales:
*   Las hojas de estilo importadas directamente en Componentes Cliente (`"use client"`) fueron omitidas por el Webpack de Next.js. **Se corrigió** moviendo la carga a nivel Componente de Servidor (`layout`/`page.tsx`).
*   La lógica del *Modo Claro/Oscuro* (`body:not(.dark-mode)`) colapsó con las preconfiguraciones de los Layouts. **Se replanteó** el diseño para basarse simplemente en el estándar: usar el *Modo Claro* como el `default` natural del Body, y usar clases inyectoras `body.dark-mode` como condicional secundario. El login fue ampliado y centrado con las medidas `100vw, 100vh, margin: 0`.

---

## 🔒 4. Segregación de Roles Definitiva
Se concluyó el ciclo dictado en **Jira** extrayendo completamente el botón de "Administrador" de la página principal e integrando un **Formulario Físico de Invitación Criptográfica** dentro del Panel SuperAdmin. Estas adiciones prepararon exitosamente el proyecto para su despliegue y pase QA.
