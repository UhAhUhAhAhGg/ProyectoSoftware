import { apiFetch } from './apiHelper';
import { eventosService } from './eventosService';

const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';

export const adminEventsService = {
  /**
   * Obtiene todos los eventos con filtros opcionales (admin).
   * Siempre pasa incluir_bajas=true para que el admin vea TODOS los estados
   * (activo, borrador, dado de baja, finalizado).
   */
  getAllEvents: async (filters = {}) => {
    try {
      let url = `${EVENTS_URL}/api/v1/events/`;

      const params = new URLSearchParams();
      // Critico: sin esto el backend filtra status='published' y oculta
      // borradores/cancelados/finalizados.
      params.append('incluir_bajas', 'true');
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.promoter_id) params.append('promoter_id', filters.promoter_id);

      url += `?${params.toString()}`;

      const res = await apiFetch(url);
      if (!res.ok) throw new Error('No se pudieron cargar los eventos');

      const data = await res.json();
      return data.results || data;
    } catch (error) {
      console.error('Error en getAllEvents:', error);
      throw error;
    }
  },

  /**
   * Obtiene eventos por estado (activos, borradores, dados de baja)
   */
  getEventsByStatus: async (status) => {
    try {
      const events = await this.getAllEvents({ status });
      return events;
    } catch (error) {
      console.error('Error en getEventsByStatus:', error);
      throw error;
    }
  },

  /**
   * Obtiene evento completo con detalles para editar
   */
  getEventForEdit: async (eventId) => {
    try {
      const res = await apiFetch(`${EVENTS_URL}/api/v1/events/${eventId}/`);
      if (!res.ok) {
        throw new Error('No se pudo cargar el evento');
      }
      const event = await res.json();
      
      // Obtener tipos de entrada
      const ticketsRes = await apiFetch(`${EVENTS_URL}/api/v1/events/${eventId}/tickets/`);
      let tickets = [];
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        tickets = ticketsData.results || ticketsData;
      }

      return {
        ...event,
        tickets: tickets
      };
    } catch (error) {
      console.error('Error en getEventForEdit:', error);
      throw error;
    }
  },

  /**
   * Actualiza el estado de un evento (activo, borrador, cancelado, etc.)
   */
  updateEventStatus: async (eventId, status, reason = '') => {
    try {
      const body = {
        status: status
      };
      
      // Si es cancelado/dado de baja, guardar razón
      if (reason && (status === 'cancelled' || status === 'suspended')) {
        body.cancellation_reason = reason;
        body.admin_note = reason;
      }

      const res = await apiFetch(`${EVENTS_URL}/api/v1/events/${eventId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'Error al actualizar estado');
      }

      return await res.json();
    } catch (error) {
      console.error('Error en updateEventStatus:', error);
      throw error;
    }
  },

  /**
   * Da de baja un evento por razones administrativas.
   * TIC-407: PATCH /admin/events/{id}/deactivate/ con motivo obligatorio.
   */
  takedownEvent: async (eventId, reason) => {
    try {
      const res = await apiFetch(`${EVENTS_URL}/api/v1/admin/events/${eventId}/deactivate/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || '' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.detail || 'Error al dar de baja el evento');
      }
      return await res.json();
    } catch (error) {
      console.error('Error en takedownEvent:', error);
      throw error;
    }
  },

  /**
   * Reactiva un evento que fue dado de baja (vuelve a 'published').
   * Usa el endpoint admin de edicion (TIC-406) cambiando solo el campo status.
   */
  reactivateEvent: async (eventId) => {
    try {
      const res = await apiFetch(`${EVENTS_URL}/api/v1/admin/events/${eventId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'published',
          admin_reason: 'Reactivación administrativa',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.detail || 'Error al reactivar el evento');
      }
      return await res.json();
    } catch (error) {
      console.error('Error en reactivateEvent:', error);
      throw error;
    }
  },

  /**
   * Edita los datos de un evento como admin.
   * TIC-406: PATCH /admin/events/{id}/ con motivo opcional.
   */
  editEvent: async (eventId, eventData) => {
    try {
      const body = {};

      // Solo incluir campos proporcionados
      if (eventData.name !== undefined) body.name = eventData.name;
      if (eventData.description !== undefined) body.description = eventData.description;
      if (eventData.event_date !== undefined) body.event_date = eventData.event_date;
      if (eventData.event_time !== undefined) body.event_time = eventData.event_time;
      if (eventData.location !== undefined) body.location = eventData.location;
      if (eventData.capacity !== undefined) body.capacity = parseInt(eventData.capacity);
      if (eventData.category !== undefined) body.category = eventData.category;
      if (eventData.status !== undefined) body.status = eventData.status;
      // El endpoint admin acepta admin_reason; el frontend puede mandar admin_note
      body.admin_reason = eventData.admin_reason || eventData.admin_note || 'Modificación administrativa';

      const res = await apiFetch(`${EVENTS_URL}/api/v1/admin/events/${eventId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.detail || 'Error al editar evento');
      }

      return await res.json();
    } catch (error) {
      console.error('Error en editEvent:', error);
      throw error;
    }
  },

  /**
   * Obtiene historial de acciones administrativas en un evento
   */
  getEventAuditLog: async (eventId) => {
    try {
      const res = await apiFetch(`${EVENTS_URL}/api/v1/events/${eventId}/audit_log/`);
      if (!res.ok) return [];
      
      const data = await res.json();
      return data.results || data;
    } catch (error) {
      console.error('Error en getEventAuditLog:', error);
      return [];
    }
  },

  /**
   * Obtiene estadísticas de eventos
   */
  getEventStats: async () => {
    try {
      const res = await apiFetch(`${EVENTS_URL}/api/v1/events/stats/`);
      if (!res.ok) {
        return {
          total: 0,
          activos: 0,
          borradores: 0,
          cancelados: 0,
          suspendidos: 0
        };
      }

      return await res.json();
    } catch (error) {
      console.error('Error en getEventStats:', error);
      return {
        total: 0,
        activos: 0,
        borradores: 0,
        cancelados: 0,
        suspendidos: 0
      };
    }
  },

  /**
   * Busca eventos por nombre, descripción, promotor
   */
  searchEvents: async (query) => {
    try {
      return await this.getAllEvents({ search: query });
    } catch (error) {
      console.error('Error en searchEvents:', error);
      throw error;
    }
  }
};
