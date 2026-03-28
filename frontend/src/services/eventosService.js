import { apiFetch } from './apiHelper';

const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';

const STATUS_MAP = {
  draft: 'borrador',
  published: 'activo',
  cancelled: 'cancelado',
  completed: 'finalizado',
};

const mapEvento = (e) => {
  const tiposEntrada = (e.tickets ?? []).map(t => ({
    id: t.id,
    nombre: t.name,
    descripcion: t.description,
    precio: parseFloat(t.price),
    cupoMaximo: t.max_capacity,
    cupoVendido: t.current_sold ?? 0,
    estado: TICKET_STATUS_MAP[t.status] ?? t.status,
    disponibles: t.available_capacity ?? (t.max_capacity - (t.current_sold ?? 0)),
  }));
  const activos = tiposEntrada.filter(t => t.estado === 'activo');
  const precio = activos.length > 0 ? Math.min(...activos.map(t => t.precio)) : 0;
  return {
    id: e.id,
    nombre: e.name,
    descripcion: e.description,
    fecha: e.event_date,
    hora: e.event_time,
    ubicacion: e.location,
    ciudad: e.location,
    direccion: e.location,
    capacidad: e.capacity,
    boletosVendidos: 0,
    precio,
    imagen: e.image || null,
    estado: STATUS_MAP[e.status] ?? e.status,
    promotorId: e.promoter_id,
    categoria: e.category ?? null,
    categoriaNombre: e.category_name ?? null,
    tiposEntrada,
  };
};

const TICKET_STATUS_MAP = {
  active: 'activo',
  inactive: 'eliminado',
  sold_out: 'agotado',
};

const mapTipoEntrada = (t) => ({
  id: t.id,
  nombre: t.name,
  descripcion: t.description,
  precio: parseFloat(t.price),
  cupoMaximo: t.max_capacity,
  cupoVendido: t.current_sold ?? 0,
  estado: TICKET_STATUS_MAP[t.status] ?? t.status,
  disponibles: t.available_capacity ?? (t.max_capacity - (t.current_sold ?? 0)),
});

export const eventosService = {
  getCategorias: async () => {
    const res = await apiFetch(`${EVENTS_URL}/api/v1/categories/`);
    if (!res.ok) throw new Error('No se pudieron cargar las categorías.');
    const data = await res.json();
    return data.results ?? data;
  },

  getEventosDisponibles: async () => {
    const res = await apiFetch(`${EVENTS_URL}/api/v1/events/?status=published`);
    if (!res.ok) throw new Error('No se pudieron cargar los eventos.');
    const data = await res.json();
    return (data.results ?? data).map(mapEvento);
  },

  getEventosByPromotor: async (promotorId) => {
    const res = await apiFetch(`${EVENTS_URL}/api/v1/events/by_promoter/?promoter_id=${promotorId}`);
    if (!res.ok) throw new Error('No se pudieron cargar tus eventos.');
    const data = await res.json();
    return (data.results ?? data).map(mapEvento);
  },

  getEventoById: async (id) => {
    const res = await apiFetch(`${EVENTS_URL}/api/v1/events/${id}/`);
    if (!res.ok) return null;
    const e = await res.json();
    const mapped = mapEvento(e);

    const ticketsRes = await apiFetch(`${EVENTS_URL}/api/v1/events/${id}/tickets/`);
    if (ticketsRes.ok) {
      const tickets = await ticketsRes.json();
      mapped.tiposEntrada = (tickets.results ?? tickets).map(mapTipoEntrada);
      if (mapped.tiposEntrada.length > 0) {
        mapped.precio = Math.min(...mapped.tiposEntrada.map((t) => t.precio));
      }
    }
    return mapped;
  },

  crearEvento: async (eventoData, promotorId) => {
    let res;
    if (eventoData.imagen) {
      // Usar FormData para enviar archivos e información
      const formData = new FormData();
      formData.append('name', eventoData.nombre);
      formData.append('description', eventoData.descripcion);
      formData.append('event_date', eventoData.fecha);
      formData.append('event_time', eventoData.hora);
      formData.append('location', eventoData.ubicacion);
      formData.append('capacity', parseInt(eventoData.capacidad));
      formData.append('promoter_id', promotorId);
      formData.append('status', 'published');
      if (eventoData.categoria) formData.append('category', eventoData.categoria);
      
      // Convert base64 to Blob
      if (typeof eventoData.imagen === 'string' && eventoData.imagen.startsWith('data:image')) {
        const resBlob = await fetch(eventoData.imagen);
        const blob = await resBlob.blob();
        formData.append('image', blob, 'image.jpg');
      }

      res = await apiFetch(`${EVENTS_URL}/api/v1/events/`, {
        method: 'POST',
        headers: {
          // No setear Content-Type, fetch lo hará automáticamente con el boundary para FormData
        },
        body: formData,
      });
    } else {
      res = await apiFetch(`${EVENTS_URL}/api/v1/events/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eventoData.nombre,
          description: eventoData.descripcion,
          event_date: eventoData.fecha,
          event_time: eventoData.hora,
          location: eventoData.ubicacion,
          capacity: parseInt(eventoData.capacidad),
          promoter_id: promotorId,
          category: eventoData.categoria || null,
          status: 'published',
        }),
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("DRF Error en crearEvento:", err);
      const strErr = typeof err === 'object' ? JSON.stringify(err) : err;
      throw new Error(err.detail || err.message || `No se pudo crear el evento. Detalles: ${strErr}`);
    }
    return mapEvento(await res.json());
  },

  actualizarEvento: async (id, eventoData) => {
    let res;
    if (eventoData.imagen && typeof eventoData.imagen === 'string' && eventoData.imagen.startsWith('data:image')) {
      // Necesita FormData para nueva imagen
      const formData = new FormData();
      if (eventoData.nombre) formData.append('name', eventoData.nombre);
      if (eventoData.descripcion) formData.append('description', eventoData.descripcion);
      if (eventoData.fecha) formData.append('event_date', eventoData.fecha);
      if (eventoData.hora) formData.append('event_time', eventoData.hora);
      if (eventoData.ubicacion) formData.append('location', eventoData.ubicacion);
      if (eventoData.capacidad) formData.append('capacity', parseInt(eventoData.capacidad));
      if (eventoData.status) formData.append('status', eventoData.status);
      if (eventoData.categoria) formData.append('category', eventoData.categoria);
      
      const resBlob = await fetch(eventoData.imagen);
      const blob = await resBlob.blob();
      formData.append('image', blob, 'image.jpg');

      res = await apiFetch(`${EVENTS_URL}/api/v1/events/${id}/`, {
        method: 'PATCH',
        body: formData,
      });
    } else {
      // Solo texto, JSON normal
      const body = {};
      if (eventoData.nombre) body.name = eventoData.nombre;
      if (eventoData.descripcion) body.description = eventoData.descripcion;
      if (eventoData.fecha) body.event_date = eventoData.fecha;
      if (eventoData.hora) body.event_time = eventoData.hora;
      if (eventoData.ubicacion) body.location = eventoData.ubicacion;
      if (eventoData.capacidad) body.capacity = parseInt(eventoData.capacidad);
      if (eventoData.status) body.status = eventoData.status;
      if (eventoData.categoria) body.category = eventoData.categoria;

      res = await apiFetch(`${EVENTS_URL}/api/v1/events/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'No se pudo actualizar el evento.');
    }
    return mapEvento(await res.json());
  },

  eliminarEvento: async (id) => {
    const res = await apiFetch(`${EVENTS_URL}/api/v1/events/${id}/`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'No se pudo eliminar el evento.');
    }
    return true;
  },

  // ===== TIPOS DE ENTRADA =====

  getTiposEntradaByEvento: async (eventoId) => {
    const res = await apiFetch(
      `${EVENTS_URL}/api/v1/ticket-types/by_event/?event_id=${eventoId}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? data).map(mapTipoEntrada);
  },

  crearTipoEntrada: async (eventoId, tipoData) => {
    const res = await apiFetch(`${EVENTS_URL}/api/v1/ticket-types/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventoId,
        name: tipoData.nombre,
        description: tipoData.descripcion || '',
        price: parseFloat(tipoData.precio),
        max_capacity: parseInt(tipoData.cupoMaximo),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("DRF Error en crearTipoEntrada:", err);
      const detalles = err.details || err.detail || '';
      const strDetalles = typeof detalles === 'object' ? JSON.stringify(detalles) : detalles;
      throw new Error(`${err.message || 'No se pudo crear el tipo de entrada.'} Detalles: ${strDetalles}`);
    }
    return mapTipoEntrada(await res.json());
  },

  actualizarTipoEntrada: async (eventoId, tipoId, tipoData) => {
    const body = {};
    if (tipoData.nombre) body.name = tipoData.nombre;
    if (tipoData.descripcion !== undefined) body.description = tipoData.descripcion;
    if (tipoData.precio !== undefined) body.price = parseFloat(tipoData.precio);
    if (tipoData.cupoMaximo !== undefined) body.max_capacity = parseInt(tipoData.cupoMaximo);
    if (tipoData.estado !== undefined) {
      const statusMap = { activo: 'active', eliminado: 'inactive', inactivo: 'inactive' };
      body.status = statusMap[tipoData.estado] || tipoData.estado;
    }

    const res = await apiFetch(`${EVENTS_URL}/api/v1/ticket-types/${tipoId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'No se pudo actualizar el tipo de entrada.');
    }
    return mapTipoEntrada(await res.json());
  },

  eliminarTipoEntrada: async (eventoId, tipoId) => {
    const res = await apiFetch(`${EVENTS_URL}/api/v1/ticket-types/${tipoId}/`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'No se pudo eliminar el tipo de entrada.');
    }
    return true;
  },
};