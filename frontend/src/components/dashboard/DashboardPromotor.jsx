import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PromotorService from '../../services/promotorService';
import { eventosService } from '../../services/eventosService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';
import './DashboardPromotor.css';

/* ── Constantes ─────────────────────────────────────────── */
const RANGE_OPTIONS = [
  { value: 'all', label: 'Todo' },
  { value: '12m', label: '12 meses' },
  { value: '6m', label: '6 meses' },
  { value: '3m', label: '3 meses' },
];

/* ── Helpers ────────────────────────────────────────────── */
const trendLabel = (value) => {
  if (!Number.isFinite(value) || value === 0) return 'Sin variación';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
};

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getDate = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getOccupancyColor = (pct) => {
  if (pct >= 70) return '#16a34a';
  if (pct >= 40) return '#d97706';
  return '#dc2626';
};

/* ── Sub-componentes ────────────────────────────────────── */
const KPI = ({ icon, label, value, hint, delta, tone = 'neutral' }) => (
  <article className={`pd-kpi pd-kpi--${tone}`}>
    <div className="pd-kpi__head">
      <span className="pd-kpi__icon">{icon}</span>
      <span className="pd-kpi__label">{label}</span>
      {delta !== undefined && delta !== null && (
        <span className={`pd-kpi__delta ${Number(delta) >= 0 ? 'is-positive' : 'is-negative'}`}>
          {trendLabel(delta)}
        </span>
      )}
    </div>
    <div className="pd-kpi__value">{value}</div>
    {hint && <div className="pd-kpi__hint">{hint}</div>}
  </article>
);

const StatMini = ({ icon, label, value }) => (
  <div className="pd-stat-mini">
    <span className="pd-stat-mini__icon">{icon}</span>
    <div className="pd-stat-mini__content">
      <span className="pd-stat-mini__value">{value}</span>
      <span className="pd-stat-mini__label">{label}</span>
    </div>
  </div>
);

/* ── Componente Principal ───────────────────────────────── */
const DashboardPromotor = ({ promoterId, promoterName }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [range, setRange] = useState('6m');
  const intervalRef = useRef(null);
  const isFetchingRef = useRef(false);

  /* ── Fetch data ─────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setError(null);
    try {
      const [data, promoterEvents] = await Promise.all([
        PromotorService.getDashboardSummary(),
        promoterId ? eventosService.getEventosByPromotor(promoterId) : Promise.resolve([]),
      ]);
      setSummary(data);
      setEvents(Array.isArray(promoterEvents) ? promoterEvents : []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching promotor dashboard summary', err);
      setError(err?.message || 'Error cargando datos');
      setLoading(false);
    } finally {
      isFetchingRef.current = false;
    }
  }, [promoterId]);

  /* ── Polling ────────────────────────────────────────── */
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (!document.hidden) fetchData();
    }, 10000);
  }, [fetchData]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    fetchData();
    startPolling();
    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchData();
        startPolling();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchData, startPolling, stopPolling]);

  /* ── Datos derivados ────────────────────────────────── */
  const rawMonthly = useMemo(
    () => (Array.isArray(summary?.monthly_income) ? summary.monthly_income : []),
    [summary]
  );
  const eventsComparison = useMemo(
    () => (Array.isArray(summary?.events_comparison) ? summary.events_comparison : []),
    [summary]
  );

  const normalizedEvents = useMemo(() => {
    return events.map((event) => {
      const ticketRevenue = (event.tiposEntrada || []).reduce(
        (total, ticket) => total + Number(ticket.cupoVendido || 0) * Number(ticket.precio || 0),
        0
      );
      const matchedSummary = eventsComparison.find(
        (item) => normalizeText(item.name) === normalizeText(event.nombre)
      );
      const sold = Number(event.boletosVendidos || 0);
      const occupancy = event.capacidad ? (sold / Number(event.capacidad || 1)) * 100 : 0;
      return {
        id: event.id,
        nombre: event.nombre,
        fecha: event.fecha,
        estado: event.estado,
        ubicacion: event.ubicacion,
        ciudad: event.ciudad,
        imagen: event.imagen,
        ticketsVendidos: sold,
        ingresosBrutos: Number(matchedSummary?.revenue || ticketRevenue || 0),
        ingresosNetos: Number(matchedSummary?.net_revenue || ticketRevenue || 0),
        ocupacionPct: Number(occupancy.toFixed(1)),
        capacidad: Number(event.capacidad || 0),
        tiposEntrada: event.tiposEntrada || [],
      };
    });
  }, [events, eventsComparison]);

  const activeEvents = useMemo(
    () => normalizedEvents.filter((e) => e.estado === 'activo'),
    [normalizedEvents]
  );

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return normalizedEvents
      .filter((event) => {
        const eventDate = getDate(event.fecha);
        return eventDate && eventDate >= today && event.estado !== 'cancelado';
      })
      .sort((a, b) => {
        const aDate = getDate(a.fecha);
        const bDate = getDate(b.fecha);
        return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
      });
  }, [normalizedEvents]);

  const topEvents = useMemo(() => {
    return [...normalizedEvents]
      .sort((a, b) => Number(b.ingresosNetos || 0) - Number(a.ingresosNetos || 0))
      .slice(0, 5);
  }, [normalizedEvents]);

  /* ── KPI values ─────────────────────────────────────── */
  const totalIncome = Number(summary?.total_income ?? 0);
  const totalNet = Number(summary?.total_net_income || totalIncome || 0);
  const totalCommissions = Number(summary?.total_commissions ?? 0);
  const totalSales = Number(summary?.total_sales ?? 0);
  const avgOccupancy = Number(summary?.avg_occupancy ?? 0);

  /* ── Range filtering ────────────────────────────────── */
  const filteredMonthly = useMemo(() => {
    if (!rawMonthly.length) return [];
    if (range === 'all') return rawMonthly;
    const limit = range === '12m' ? 12 : range === '6m' ? 6 : 3;
    return rawMonthly.slice(Math.max(rawMonthly.length - limit, 0));
  }, [rawMonthly, range]);

  const previousMonthly = useMemo(() => {
    if (!rawMonthly.length) return [];
    if (range === 'all') return [];
    const limit = range === '12m' ? 12 : range === '6m' ? 6 : 3;
    const start = Math.max(rawMonthly.length - limit * 2, 0);
    return rawMonthly.slice(start, Math.max(rawMonthly.length - limit, 0));
  }, [rawMonthly, range]);

  const latestPoint = filteredMonthly[filteredMonthly.length - 1];
  const previousPoint = filteredMonthly[filteredMonthly.length - 2];
  const previousWindowPoint = previousMonthly[previousMonthly.length - 1];

  const incomeTrend = latestPoint && previousWindowPoint
    ? ((Number(latestPoint.net_income ?? 0) - Number(previousWindowPoint.net_income ?? 0)) /
      Math.max(Number(previousWindowPoint.net_income ?? 0), 1)) * 100
    : latestPoint && previousPoint
      ? ((Number(latestPoint.net_income ?? 0) - Number(previousPoint.net_income ?? 0)) /
        Math.max(Number(previousPoint.net_income ?? 0), 1)) * 100
      : 0;

  const grossTrend = latestPoint && previousWindowPoint
    ? ((Number(latestPoint.income ?? 0) - Number(previousWindowPoint.income ?? 0)) /
      Math.max(Number(previousWindowPoint.income ?? 0), 1)) * 100
    : 0;

  const bestMonth = useMemo(() => {
    if (!filteredMonthly.length) return null;
    return [...filteredMonthly].sort(
      (a, b) => Number(b.net_income ?? 0) - Number(a.net_income ?? 0)
    )[0];
  }, [filteredMonthly]);

  const topEvent = topEvents[0];

  /* ── Alertas ────────────────────────────────────────── */
  const alerts = useMemo(() => {
    const items = [];
    if (!activeEvents.length) {
      items.push({
        tone: 'warning', icon: '⚡',
        title: 'Sin eventos activos',
        message: 'Publica un evento para empezar a ver movimiento en el panel.',
      });
    }
    if (upcomingEvents[0]) {
      const nextDate = getDate(upcomingEvents[0].fecha);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const days = nextDate ? Math.max(Math.ceil((nextDate - today) / 86400000), 0) : null;
      if (days !== null && days <= 7) {
        items.push({
          tone: 'info', icon: '📅',
          title: 'Evento cercano',
          message: `${upcomingEvents[0].nombre} empieza en ${days} día${days === 1 ? '' : 's'}.`,
        });
      }
    }
    if (topEvent && Number(topEvent.ocupacionPct || 0) >= 80) {
      items.push({
        tone: 'success', icon: '🔥',
        title: 'Casi lleno',
        message: `${topEvent.nombre} ya alcanzó ${topEvent.ocupacionPct}% de ocupación.`,
      });
    }
    if (incomeTrend < 0) {
      items.push({
        tone: 'danger', icon: '📉',
        title: 'Caída de ingresos',
        message: `El ingreso neto bajó ${Math.abs(incomeTrend).toFixed(1)}% frente al periodo anterior.`,
      });
    }
    return items.slice(0, 3);
  }, [activeEvents.length, incomeTrend, upcomingEvents, topEvent]);

  /* ── Chart data ─────────────────────────────────────── */
  const chartMonthly = filteredMonthly.map((item) => ({
    month: item.month ?? item.mes ?? item.label ?? item.name,
    income: Number(item.income ?? 0),
    net_income: Number(item.net_income || item.income || 0),
  }));

  const chartEvents = eventsComparison.map((item) => ({
    name: item.name,
    revenue: Number(item.revenue ?? 0),
    net_revenue: Number(item.net_revenue || item.revenue || 0),
    ventas: Number(item.ventas ?? 0),
  }));

  const occupancyData = useMemo(() => {
    return activeEvents
      .map((e) => ({
        id: e.id,
        name: e.nombre.length > 20 ? e.nombre.slice(0, 18) + '…' : e.nombre,
        fullName: e.nombre,
        pct: e.ocupacionPct,
        sold: e.ticketsVendidos,
        cap: e.capacidad,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6);
  }, [activeEvents]);

  // Total compradores: sumar boletos vendidos de todos los eventos
  const totalCompradores = normalizedEvents.reduce((s, e) => s + e.ticketsVendidos, 0);

  const tooltipFormatter = (value) => formatCurrency(value);

  /* ── Handlers para interactividad ───────────────────── */
  const handleEventBarClick = (data) => {
    const matched = activeEvents.find(e => normalizeText(e.nombre) === normalizeText(data?.activePayload?.[0]?.payload?.name));
    if (matched) {
      navigate('/dashboard/mis-eventos', { state: { openEventId: matched.id } });
    } else {
      navigate('/dashboard/mis-eventos');
    }
  };

  const handleOccupancyBarClick = (data) => {
    if (data?.id) {
      navigate('/dashboard/mis-eventos', { state: { openEventId: data.id } });
    }
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="pd" id="finanzas">
      {/* ═══ HEADER ═══ */}
      <header className="pd__header">
        <div className="pd__header-left">
          <span className="pd__eyebrow">Panel del Promotor</span>
          <h2 className="pd__title">
            Hola, {promoterName || 'Promotor'}
          </h2>
          <p className="pd__subtitle">
            Controla tus ventas, ingresos netos y los eventos que requieren atención ahora mismo.
          </p>
        </div>
        <div className="pd__range">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`pd__range-btn ${range === option.value ? 'is-active' : ''}`}
              onClick={() => setRange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {/* ═══ ACCIONES ═══ */}
      <div className="pd__actions">
        <Link to="/dashboard/crear-evento" className="pd__action pd__action--primary">
          <span>➕</span> Crear evento
        </Link>
        <Link to="/dashboard/mis-eventos" className="pd__action">
          <span>📋</span> Mis eventos
        </Link>
        <Link to="/dashboard/mis-eventos" state={{ activeTab: 'promociones' }} className="pd__action">
          <span>🚀</span> Mis promociones
        </Link>
        <Link to="/dashboard/mis-eventos" state={{ activeTab: 'codigos' }} className="pd__action">
          <span>🏷️</span> Mis códigos
        </Link>
      </div>

      {/* ═══ ERROR ═══ */}
      {error && (
        <div className="pd__alert pd__alert--error">
          <div>
            <strong>No pudimos cargar el panel.</strong>
            <p>{error}</p>
          </div>
          <button className="pd__retry-btn" onClick={fetchData}>Reintentar</button>
        </div>
      )}

      {/* ═══ ALERTAS ═══ */}
      {alerts.length > 0 && (
        <div className="pd__alerts">
          {alerts.map((item) => (
            <div key={`${item.title}-${item.message}`} className={`pd__alert pd__alert--${item.tone}`}>
              <span className="pd__alert-icon">{item.icon}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ KPIs ═══ */}
      <section className="pd__kpis">
        <KPI
          icon="📈"
          label="Ingresos brutos"
          value={formatCurrency(totalIncome)}
          hint={bestMonth ? `Mejor mes: ${bestMonth.month || 'N/A'}` : 'Sin histórico'}
          delta={grossTrend}
          tone="primary"
        />
        <KPI
          icon="🏦"
          label="Comisión TicketGo"
          value={formatCurrency(totalCommissions)}
          hint="Total pagado a la plataforma"
          tone="warning"
        />
        <KPI
          icon="💵"
          label="Ingreso neto"
          value={formatCurrency(totalNet)}
          hint={`Periodo ${RANGE_OPTIONS.find((o) => o.value === range)?.label.toLowerCase()}`}
          delta={incomeTrend}
          tone="success"
        />
        <KPI
          icon="🎟️"
          label="Tickets vendidos"
          value={Number(totalSales).toLocaleString('es-BO')}
          hint="En todos los eventos"
          tone="neutral"
        />
        <KPI
          icon="📅"
          label="Eventos Activos"
          value={activeEvents.length}
          hint="Eventos en curso"
          tone="neutral"
        />
        <KPI
          icon="📊"
          label="Ocupación promedio"
          value={`${Number(avgOccupancy).toFixed(1)}%`}
          hint={topEvent ? `Top: ${topEvent.nombre}` : 'Sin eventos aún'}
          tone="warning"
        />
      </section>

      {/* ═══ RESUMEN ESTADÍSTICO CONSOLIDADO ═══ */}
      <section className="pd__stats-summary">
        <StatMini icon="👥" label="Total Compradores" value={totalCompradores} />
        <StatMini icon="📅" label="Eventos Activos" value={activeEvents.length} />
        <StatMini icon="🎯" label="Próximos Eventos" value={upcomingEvents.length} />
        <StatMini icon="📋" label="Total Eventos" value={normalizedEvents.length} />
      </section>

      {/* ═══ GRID: EVOLUCIÓN + ALERTAS ═══ */}
      <section className="pd__grid pd__grid--main">
        {/* Evolución de ingresos */}
        <div className="pd__panel pd__panel--wide">
          <div className="pd__panel-head">
            <div>
              <h3>Evolución de ingresos</h3>
              <p>Vista consolidada según el periodo seleccionado.</p>
            </div>
            <span className="pd__badge">
              {filteredMonthly.length} punto{filteredMonthly.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="pd__chart">
            {chartMonthly.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={chartMonthly} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#b9770e" name="Brutos" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="net_income" stroke="#16a34a" name="Netos" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="pd__empty">Todavía no hay datos suficientes para mostrar la tendencia.</div>
            )}
          </div>
        </div>

        {/* Alertas y foco */}
        <aside className="pd__panel pd__panel--side">
          <div className="pd__panel-head">
            <div>
              <h3>Alertas y foco</h3>
              <p>Señales rápidas para decidir qué hacer ahora.</p>
            </div>
          </div>
          <div className="pd__focus-list">
            {topEvent ? (
              <article className="pd__focus-card" onClick={() => navigate('/dashboard/mis-eventos', { state: { openEventId: topEvent.id } })} style={{ cursor: 'pointer' }}>
                <span className="pd__focus-label">🏆 Evento con más ingresos</span>
                <strong>{topEvent.nombre}</strong>
                <p>{formatCurrency(topEvent.ingresosNetos)} · {topEvent.ocupacionPct}% ocupación</p>
              </article>
            ) : (
              <article className="pd__focus-card">
                <span className="pd__focus-label">Publica tu primer evento</span>
                <strong>Así el dashboard empezará a mostrar ventas reales.</strong>
              </article>
            )}
            {upcomingEvents.slice(0, 3).map((event) => (
              <article key={event.id} className="pd__focus-card pd__focus-card--soft" onClick={() => navigate('/dashboard/mis-eventos', { state: { openEventId: event.id } })} style={{ cursor: 'pointer' }}>
                <span className="pd__focus-label">📅 Próximo evento</span>
                <strong>{event.nombre}</strong>
                <p>{formatDate(event.fecha)} · {event.ubicacion || 'Sin ubicación'}</p>
                <div className="pd__focus-meta">
                  <span>🎟️ {event.ticketsVendidos} boletos</span>
                  <span>{formatCurrency(event.ingresosBrutos)}</span>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>

      {/* ═══ GRID: COMPARATIVO + OCUPACIÓN ═══ */}
      <section className="pd__grid pd__grid--charts">
        {/* Comparativo por evento */}
        <div className="pd__panel">
          <div className="pd__panel-head">
            <div>
              <h3>Comparativo por evento</h3>
              <p>Haz clic en una barra para ir a "Mis Eventos".</p>
            </div>
          </div>
          <div className="pd__chart">
            {chartEvents.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={chartEvents} margin={{ top: 10, right: 20, left: 0, bottom: 5 }} onClick={handleEventBarClick} style={{ cursor: 'pointer' }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend />
                  <Bar dataKey="revenue" name="Ingresos Brutos" fill="#b9770e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="net_revenue" name="Ingreso Neto" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="pd__empty">No hay eventos suficientes para comparar.</div>
            )}
          </div>
        </div>

        {/* Ocupación por evento */}
        <div className="pd__panel">
          <div className="pd__panel-head">
            <div>
              <h3>Ocupación por evento</h3>
              <p>Nivel de ventas vs. capacidad total.</p>
            </div>
          </div>
          <div className="pd__chart pd__chart--occupancy">
            {occupancyData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={occupancyData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }} onClick={(data) => data?.activePayload?.[0]?.payload && handleOccupancyBarClick(data.activePayload[0].payload)} style={{ cursor: 'pointer' }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name, props) => [`${value}%`, 'Ocupación']}
                    labelFormatter={(label) => {
                      const d = occupancyData.find((x) => x.name === label);
                      return d ? `${d.fullName} (${d.sold}/${d.cap})` : label;
                    }}
                  />
                  <Bar dataKey="pct" name="Ocupación" radius={[0, 6, 6, 0]} barSize={22}>
                    {occupancyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getOccupancyColor(entry.pct)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="pd__empty">No hay eventos activos para mostrar ocupación.</div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ RANKING + PRÓXIMOS EVENTOS ═══ */}
      <section className="pd__grid pd__grid--bottom">
        {/* Eventos clave */}
        <div className="pd__panel">
          <div className="pd__panel-head">
            <div>
              <h3>🏅 Ranking de Eventos</h3>
              <p>Ordenados por ingreso neto.</p>
            </div>
          </div>
          <div className="pd__events-list">
            {topEvents.length > 0 ? (
              topEvents.map((event, i) => (
                <article
                  key={event.id}
                  className="pd__event-row"
                  onClick={() => navigate('/dashboard/mis-eventos', { state: { openEventId: event.id } })}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="pd__event-rank">#{i + 1}</div>
                  <div className="pd__event-info">
                    <strong>{event.nombre}</strong>
                    <p>{formatDate(event.fecha)} · {event.ubicacion || 'Sin ubicación'}</p>
                  </div>
                  <div className="pd__event-metrics">
                    <span className="pd__event-revenue">{formatCurrency(event.ingresosNetos)}</span>
                    <small>{event.ticketsVendidos} boletos · {event.ocupacionPct}%</small>
                  </div>
                </article>
              ))
            ) : (
              <div className="pd__empty">Todavía no hay eventos para mostrar.</div>
            )}
          </div>
        </div>

        {/* Próximos eventos */}
        <div className="pd__panel">
          <div className="pd__panel-head">
            <div>
              <h3>📅 Próximos Eventos</h3>
              <p>Tus eventos que vienen pronto.</p>
            </div>
            <Link to="/dashboard/mis-eventos" className="pd__badge pd__badge--link">
              Ver todos →
            </Link>
          </div>
          <div className="pd__upcoming-list">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.slice(0, 4).map((ev) => {
                const daysUntil = (() => {
                  const d = getDate(ev.fecha);
                  if (!d) return null;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return Math.max(Math.ceil((d - today) / 86400000), 0);
                })();
                const progressPct = ev.capacidad ? Math.min((ev.ticketsVendidos / ev.capacidad) * 100, 100) : 0;
                return (
                  <article
                    key={ev.id}
                    className="pd__upcoming-card"
                    onClick={() => navigate('/dashboard/mis-eventos', { state: { openEventId: ev.id } })}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="pd__upcoming-left">
                      <div className="pd__upcoming-date-badge">
                        {daysUntil !== null && daysUntil <= 7 ? (
                          <><span className="pd__upcoming-days">{daysUntil}</span><span className="pd__upcoming-days-label">días</span></>
                        ) : (
                          <><span className="pd__upcoming-days">{formatDate(ev.fecha).split(' ')[0]}</span><span className="pd__upcoming-days-label">{formatDate(ev.fecha).split(' ').slice(1).join(' ')}</span></>
                        )}
                      </div>
                    </div>
                    <div className="pd__upcoming-info">
                      <strong>{ev.nombre}</strong>
                      <p>📍 {ev.ubicacion || ev.ciudad || 'Sin ubicación'}</p>
                      <div className="pd__upcoming-progress">
                        <div className="pd__upcoming-bar">
                          <div className="pd__upcoming-bar-fill" style={{ width: `${progressPct}%` }} />
                        </div>
                        <span className="pd__upcoming-pct">{ev.ticketsVendidos}/{ev.capacidad} 🎟️</span>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="pd__empty">
                <p>📭 No tienes eventos próximos.</p>
                <Link to="/dashboard/crear-evento" className="pd__action pd__action--primary" style={{ display: 'inline-flex', marginTop: 10 }}>
                  Crear tu primer evento
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Loading skeleton */}
      {loading && (
        <div className="pd__loading-row">
          <div className="pd__skeleton" />
          <div className="pd__skeleton" />
          <div className="pd__skeleton" />
        </div>
      )}
    </div>
  );
};

export default DashboardPromotor;
