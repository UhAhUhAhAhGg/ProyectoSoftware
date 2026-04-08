# Informe de Modificaciones: Historias de Usuario 7 y 8

Este documento resume todos los cambios técnicos realizados en el Frontend y Backend para dar por finalizadas las historias de usuario de **Gestión de Eventos (HU-7)** y **Gestión de Entradas (HU-8)**.

## 🖼️ Módulo de Imágenes (HU-7)
*   **Dependencias de Backend:** Se instaló `Pillow` en el contenedor `service-events` para habilitar el motor de guardado de imágenes de Django (`ImageField`).
*   **Frontend Upload:** Se actualizó `FormularioEvento.jsx` para permitir la carga de imágenes locales (`<input type="file">`). 
*   **Conversión Nativa:** Se implementó una función `getBase64` en React para convertir las imágenes cargadas a strings Base64, permitiendo que la interfaz renderice inmediatamente resoluciones crudas y que el mock LocalStorage pueda procesarlas mientras no se envían los binarios definitivos al Backend mediante `FormData`.

## 🎟️ Gestión Dinámica de Tipos de Entradas (HU-8)
*   **Pipeline en Memoria:** Se eliminó la restricción temporal que impedía crear Entradas al momento de crear un Evento nuevo. Ahora, `GestionTiposEntrada.jsx` captura las entradas en la memoria caché del componente de React, y al presionar "Crear Evento", el sistema genera el evento principal y luego itera secuelmente sobre la memoria para inyectar cada boleto en la Base de Datos asociándolo al ID recién creado.
*   **Corrección de Tipados (Bugs Críticos):** Se resolvió un bug matemático donde JavaScript concatenaba las capacidades de los tickets (`"110" + "8" = "01108"`) generando aforos negativos (ej. `-395 disponibles`). Esto se parcheó inyectando `parseInt()` en los hooks de reducción de arrays.
*   **Corrección de Sobrescritura:** Se eliminó el error donde hacer Update del evento principal aplastaba por accidente el array secundario de Boletos.

## 🗂️ Categorías de Eventos
*   **UI/UX:** Se añadió un selector desplegable de categorías en `FormularioEvento.jsx` con opciones predefinidas. La categoría elegida ahora aparece renderizada en la Vista Previa y en la Lista de Eventos como una etiqueta visual (`🏷️ Música y Conciertos`).
*   **Seeding Backend:** Dado que el Modelo `Category` de Django exigía llaves foráneas puras, se creó un script `service-events/seed_categories.py` y se corrió dentro de la base de datos PostgreSQL de Producción, dejando 8 categorías listas para cuando la UI migre del Mock LocalStorage hacia el ecosistema de Axios/Fetch.

## 🎨 UI & Resiliencia Visual
*   **Cálculo Dinámico de Precio:** Se eliminó la etiqueta de precio absoluto estático. El componente `ListaEventos.jsx` ahora lee las colecciones de boletos activas y devuelve un String dinámico ("Por Definir", "$5000", o "Desde $2500" para múltiples precios).
*   **Modal de Detalles In-Page:** Se eliminó el hipervínculo obsoleto del icono "Ver detalles" (👁️) que arrojaba una pantalla blanca. En su defecto, se levantó un `DetalleEventoModal` que ensombrece el fondo e invoca la descripción, geolocalización, imagen expandida y un listado preciso línea por línea de la tabla de tickets con conteos de ventas actualizadas.
