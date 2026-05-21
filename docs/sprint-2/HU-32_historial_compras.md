# HU-32: Historial de Compras del Comprador

## Descripción
Como comprador, quiero consultar mi historial completo de compras con filtros y paginación.

## Relación con HU-15
Esta HU comparte implementación con HU-15 (Mis Entradas). La diferencia conceptual:
- **HU-15**: Enfocada en ver entradas activas, QR y PDF para acceder al evento
- **HU-32**: Enfocada en el historial completo con todas las compras (incluyendo canceladas y usadas)

Ambas se resuelven con la misma página "Mis Compras" que soporta filtros por estado.

## Subtareas
1. Endpoint con paginación y filtros - COMPLETADA
2. Vista frontend con filtros por estado - COMPLETADA
3. Detalle de cada compra individual - COMPLETADA
4. Descarga de PDF - COMPLETADA

## Implementación Técnica
(Misma que HU-15, ver `docs/HU-15_mis_entradas.md` para detalles completos)

### Características específicas de historial:
- **Filtros**: Todas | Completadas | Utilizadas | Pendientes | Canceladas
- **Paginación**: 10 items por página con navegación Anterior/Siguiente
- **Ordenamiento**: Por fecha de compra descendente (más reciente primero)
- **Detalle expandible**: Click en cualquier compra para ver info completa

## Pruebas Manuales

### Prerrequisitos
1. Docker levantado: `docker compose up`
2. Cuenta de comprador con varias compras en diferentes estados
3. Login: `comprador@ticketproject.com` / `Comprador1234!`

### Caso 1: Historial completo
1. Realizar varias compras para diferentes eventos
2. Ir a "Mis Entradas" (sidebar o dashboard)
3. **Resultado esperado**: Todas las compras ordenadas por fecha, la más reciente primero

### Caso 2: Filtrar por estado
1. Click filtro "Completadas" → solo compras activas
2. Click filtro "Pendientes" → solo compras en proceso
3. Click filtro "Canceladas" → solo compras canceladas
4. Click "Todas" → todo el historial

### Caso 3: Paginación
1. Tener más de 10 compras
2. **Resultado esperado**: Se muestran 10 por página con botones "Anterior" y "Siguiente"

### Caso 4: Detalle desde historial
1. Click en cualquier compra del historial
2. **Resultado esperado**: Panel de detalle con toda la información, QR, código y opción de descargar PDF

## Archivos Relacionados
(Mismos que HU-15 - ver `docs/HU-15_mis_entradas.md`)
