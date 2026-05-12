# 🎫 HU-8: ABM de Tipos de Entradas (Módulo Promotor)

**Objetivo:** Permitir al promotor asignar clases de boletos (ej. VIP, General, Platea) con cupos y precios distintos a sus eventos, pudiendo ejecutarse previa o simultáneamente a la creación maestra.

## ✨ Backend: ¡100% Completado y Validado Matemáticamente!
*   ✅ **[TIC-97] Modelo de Datos:** `TicketType` en la base de datos con relaciones foráneas `ForeignKey(Event, on_delete=CASCADE)`. Define precios (`price`) fijos, descripción y validación atómica obligatoria a contrastar con `max_capacity`.
*   ✅ **[TIC-98] Endpoint Crear:** El POST está activo y protegido en la abstracción `TicketTypeViewSet`.
*   ✅ **[TIC-99] Endpoint Actualizar (Control de ventas seguras):** Módulo DRF blindado. Restringe férreamente intentar editar parámetros bajando artificialmente el umbral de capacidad a un punto numérico que resulte inferior al stock ya facturado a clientes finales (`current_sold`).
*   ✅ **[TIC-100] Validación Anti-Sobreventa Computada:** Realiza agregaciones en lote en la BD. Lanza un request ORM: `TicketType.objects.filter(event=event).aggregate(total=Sum('max_capacity'))`. Activa contención rebotando al cliente visual con un HTTP `400 Bad Request` si la cuota excedería la propiedad natural topográfica del espacio original `event.capacity`.

## ✅ Frontend: ¡100% Completado!
*   ✅ **[TIC-101] Gestión de Interfaz Dinámica (`GestionTiposEntrada.jsx`):** Submódulo React que estira un mapeo de entradas modeladas como rectángulos interactivos. Muestran "Vendidos", "Disponibles", "Tensión Ocupacional" a nivel métrico y barras interactivas progreesuales por tramos porcentuales.
*   ✅ **[TIC-102] Pipeline de Memoria In-App:** Implementación de persistencia compleja Client-Side. Si el Evento todavía no obtuvo una confirmación PK en base de datos, el framework React suspende la emisión API aislando la caché de tickets temporalmente (`useState`). Al crear firmemente el Evento principal y atrapar el Primary Key ID resultante, un gatillo algorítmico buclea los tickets residentes insertándolos secuencialmente hacia la BD sin notificar lag al usuario.
*   ✅ **Resolución de Conflictos Lógicos:** Evita un desastre silencioso interceptando valores Input-DOM con primitivas de casting numéricas obligatorias (`parseInt()`). Parcheó el vector de sumar Strings (`"110" + "8" = "01108"`) que detonaba aritméticas de aforo negativas (`Capacidad Disponible: -395`).
*   ✅ **[TIC-103] Renderizado Top-Down Reactivo:** Integración "Lift State Up" que transmite copias del array de los boletos guardados hacia las root views, refrescando de manera viva los subtitulados calculando variables económicas (Leyendas tipo: "Desde $2500") dinámicamente.

---

## 🧪 Pruebas de Aceptación Jira (Acceptance Criteria)

Para dar por "Done" esta historia, el cuerpo de QA debe dictaminar el cierre de:

### Jira AC1: Excedente de Aforo Desafiado (Validación Matemática)
1. Modifica o crea un evento capándolo a un volumen techo de solamente **50 personas**.
2. Pulsa en "Agregar Tipo de Entrada" y edifica una zona **VIP para 30 individuos**.
3. Reitera agregando un segundo cerco natural (Ticket **General forzando 30 adicionales**).
4. **Criterios Aprobatorios:** 
   - La App Client-Side estipulará rechazo local mediante un label informando una infracción `60 > 50` sobre su panel de cuotas totales.
   - De interceptar las primitivas burlando Postman, el Backend abortará de manera directa por la salvaguarda DRF arrojando `ValidationError` (AC TIC-100 check).

### Jira AC2: Modificación Libre de Conflicto de Componentes
1. Ingresa nuevamente en un viejo Evento Pre-Existente compuesto por docenas de Tickets anexados y reajusta la prosa explicativa principal (su Descripción base).
2. Toca "Actualizar Evento" firmando el Payload en `FormularioEvento.jsx`. 
3. **Criterios Aprobatorios:** Las entradas anexadas previamente DEBERÁN subsistir inalteradas en número e integridad, atestiguando que el guardado parcial principal omitirá purgar las tuplas hijas del array modelado originalmente.
