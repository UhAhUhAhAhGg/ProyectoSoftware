import React, { useState, useEffect, useCallback } from "react";
import "./DashboardPromotorAdmin.css";

// ─── Iconos SVG inline (sin dependencia externa) ────────────────────────────
const Icon = {
  ArrowLeft: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  TrendingUp: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  DollarSign: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Percent: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Calendar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  User: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Lock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Ticket: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    </svg>
  ),
  AlertCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ─── Sub-componentes ────────────────────────────────────────────────────────

/** Tarjeta de métrica financiera */
const MetricCard = ({ label, value, icon: IconComp, variant = "default", sublabel }) => (
  <div className={`dpa-metric-card dpa-metric-card--${variant}`}>
    <div className="dpa-metric-card__icon">
      <IconComp />
    </div>
    <div className="dpa-metric-card__body">
      <span className="dpa-metric-card__label">{label}</span>
      <span className="dpa-metric-card__value">{value}</span>
      {sublabel && <span className="dpa-metric-card__sublabel">{sublabel}</span>}
    </div>
  </div>
);

/** Fila de evento en la tabla */
const EventRow = ({ evento, readOnly }) => (
  <tr className="dpa-table__row">
    <td className="dpa-table__cell dpa-table__cell--name">
      <span className="dpa-event-name">{evento.nombre}</span>
      <span className="dpa-event-date">
        <Icon.Calendar /> {formatDate(evento.fecha)}
      </span>
    </td>
    <td className="dpa-table__cell">{formatCurrency(evento.ingresos_brutos)}</td>
    <td className="dpa-table__cell dpa-table__cell--commission">
      <span className="dpa-commission-badge">
        {evento.porcentaje_comision ?? "—"}%
      </span>
      <span className="dpa-commission-amount">
        {formatCurrency(evento.comision_plataforma)}
      </span>
    </td>
    <td className="dpa-table__cell dpa-table__cell--net">
      {formatCurrency(evento.ingreso_neto)}
    </td>
    <td className="dpa-table__cell">
      <span className={`dpa-status-badge dpa-status-badge--${evento.estado}`}>
        {evento.estado}
      </span>
    </td>
    {/* readOnly=true: columna de acciones deshabilitada */}
    {!readOnly && (
      <td className="dpa-table__cell dpa-table__cell--actions">
        {/* acciones solo para el propio promotor */}
      </td>
    )}
  </tr>
);

// ─── Componente principal ───────────────────────────────────────────────────

/**
 * DashboardPromotorAdmin
 *
 * Vista de solo lectura del dashboard financiero de un promotor,
 * accesible únicamente por Administradores con permiso de reportes.
 *
 * @param {string}   promotorId   - ID del promotor a supervisar
 * @param {boolean}  readOnly     - Siempre true en este contexto; deshabilita acciones de edición
 * @param {function} onBack       - Callback para volver al listado de promotores
 */
const DashboardPromotorAdmin = ({
  promotorId,
  readOnly = true,
  onBack,
}) => {
  const [promotor, setPromotor] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // ── Fetch datos del promotor ──────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    if (!promotorId) return;
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';
      const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

      const [promotorRes, resumenRes, eventosRes] = await Promise.all([
        fetch(`${AUTH_URL}/api/v1/users/${promotorId}/`, { headers }),
        fetch(`${EVENTS_URL}/api/v1/admin/promotor/${promotorId}/summary/`, { headers }),
        fetch(`${EVENTS_URL}/api/v1/admin/promotor/${promotorId}/comparativa/?limit=100`, { headers }),
      ]);

      // If summary is 404 because no events, don't throw an error, just handle gracefully
      if (!promotorRes.ok) throw new Error("No se pudo cargar el perfil del promotor.");
      // if (!resumenRes.ok) throw new Error("No se pudo cargar el resumen financiero.");
      if (!eventosRes.ok) throw new Error("No se pudieron cargar los eventos.");

      const promotorDataRaw = await promotorRes.json();
      const promotorData = {
        nombre: `${promotorDataRaw.first_name || ''} ${promotorDataRaw.last_name || ''}`.trim() || 'Promotor',
        email: promotorDataRaw.email || '—'
      };

      const resumenData = resumenRes.ok ? await resumenRes.json() : null;
      const eventosData = await eventosRes.json();
      
      const rawComparativa = eventosData.comparativa || [];
      const mappedEventos = rawComparativa.map(e => {
        const brutos = Number(e.ingresos_brutos) || 0;
        const comisiones = Number(e.comisiones) || 0;
        const pct = brutos > 0 ? ((comisiones / brutos) * 100).toFixed(1) : "—";
        return {
          id: e.evento_id,
          nombre: e.evento_nombre,
          fecha: e.fecha,
          estado: e.estado,
          ingresos_brutos: brutos,
          comision_plataforma: comisiones,
          porcentaje_comision: pct,
          ingreso_neto: Number(e.ingresos_netos) || 0,
        };
      });

      setPromotor(promotorData);
      setResumen(resumenData || { ingresos_brutos: 0, comisiones_totales: 0, ingresos_netos: 0, total_tickets: 0 });
      setEventos(mappedEventos);
    } catch (err) {
      setError(err.message || "Error inesperado al cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }, [promotorId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Filtrado local por estado ─────────────────────────────────────────────
  const eventosFiltrados =
    filtroEstado === "todos"
      ? eventos
      : eventos.filter((e) => e.estado === filtroEstado);

  // ── Estados de carga / error ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="dpa-loading">
        <div className="dpa-loading__spinner" />
        <p>Cargando dashboard del promotor…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dpa-error">
        <Icon.AlertCircle />
        <p>{error}</p>
        <button className="dpa-btn dpa-btn--secondary" onClick={fetchDashboard}>
          Reintentar
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="dpa-wrapper">
      {/* ── Encabezado ── */}
      <header className="dpa-header">
        <div className="dpa-header__left">
          {onBack && (
            <button
              className="dpa-btn dpa-btn--ghost dpa-btn--icon"
              onClick={onBack}
              title="Volver"
            >
              <Icon.ArrowLeft />
            </button>
          )}
          <div className="dpa-header__identity">
            <div className="dpa-avatar">
              {promotor?.nombre?.[0]?.toUpperCase() ?? "P"}
            </div>
            <div>
              <h1 className="dpa-header__title">
                {promotor?.nombre ?? "Promotor"}
              </h1>
              <span className="dpa-header__subtitle">
                <Icon.User /> {promotor?.email ?? "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Insignia solo lectura — siempre visible cuando readOnly=true */}
        {readOnly && (
          <div className="dpa-readonly-badge">
            <Icon.Lock />
            Solo lectura
          </div>
        )}
      </header>

      {/* ── Métricas financieras ── */}
      <section className="dpa-metrics">
        <MetricCard
          label="Ingresos Brutos"
          value={formatCurrency(resumen?.ingresos_brutos)}
          icon={Icon.TrendingUp}
          variant="primary"
          sublabel={`${resumen?.total_eventos ?? 0} evento(s)`}
        />
        <MetricCard
          label="Comisión Plataforma"
          value={formatCurrency(resumen?.comisiones_totales)}
          icon={Icon.Percent}
          variant="warning"
          sublabel={`Ocupación ${resumen?.tasa_ocupacion_pct ?? "—"}%`}
        />
        <MetricCard
          label="Ingresos Netos"
          value={formatCurrency(resumen?.ingresos_netos)}
          icon={Icon.DollarSign}
          variant="success"
          sublabel="Transferido al promotor"
        />
        <MetricCard
          label="Entradas Vendidas"
          value={resumen?.total_tickets_vendidos ?? "—"}
          icon={Icon.Ticket}
          variant="default"
          sublabel={`${resumen?.total_eventos ?? 0} evento(s)`}
        />
      </section>

      {/* ── Tabla de eventos ── */}
      <section className="dpa-section">
        <div className="dpa-section__header">
          <h2 className="dpa-section__title">Eventos del Promotor</h2>

          {/* Filtro por estado */}
          <div className="dpa-filter-group">
            {["todos", "activo", "finalizado", "cancelado"].map((estado) => (
              <button
                key={estado}
                className={`dpa-filter-btn ${filtroEstado === estado ? "dpa-filter-btn--active" : ""}`}
                onClick={() => setFiltroEstado(estado)}
              >
                {estado.charAt(0).toUpperCase() + estado.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {eventosFiltrados.length === 0 ? (
          <div className="dpa-empty">
            <Icon.CheckCircle />
            <p>No hay eventos para el filtro seleccionado.</p>
          </div>
        ) : (
          <div className="dpa-table-wrapper">
            <table className="dpa-table">
              <thead>
                <tr>
                  <th className="dpa-table__th">Evento</th>
                  <th className="dpa-table__th">Ingresos Brutos</th>
                  <th className="dpa-table__th">Comisión</th>
                  <th className="dpa-table__th">Ingreso Neto</th>
                  <th className="dpa-table__th">Estado</th>
                  {!readOnly && <th className="dpa-table__th">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {eventosFiltrados.map((evento) => (
                  <EventRow
                    key={evento.id}
                    evento={evento}
                    readOnly={readOnly}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPromotorAdmin;
