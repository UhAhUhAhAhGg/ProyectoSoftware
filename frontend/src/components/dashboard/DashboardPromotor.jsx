import React, { useEffect, useState, useRef } from 'react';
import PromotorService from '../../services/promotorService';
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
} from 'recharts';
import './DashboardPromotor.css';

const KPI = ({ label, value }) => (
  <div className="kpi-card">
    <div className="kpi-label">{label}</div>
    <div className="kpi-value">{value}</div>
  </div>
);

const DashboardPromotor = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const isFetchingRef = useRef(false);

  const fetchData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setError(null);
    try {
      const data = await PromotorService.getDashboardSummary();
      setSummary(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching promotor dashboard summary', err);
      setError(err?.message || 'Error cargando datos');
      setLoading(false);
    } finally {
      isFetchingRef.current = false;
    }
  };

  // Polling control: start/stop and visibility handling
  const startPolling = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (!document.hidden) fetchData();
    }, 30000);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    // initial load
    fetchData();
    startPolling();

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // when tab becomes visible, refresh immediately and resume polling
        fetchData();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Format currency
  const currencyFormatter = new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  // Defensive mapping of expected fields
  const totalNet = Number(summary?.total_net_income ?? summary?.net_income ?? summary?.total_net ?? 0);
  const totalIncome = Number(summary?.total_income ?? summary?.gross_income ?? summary?.total ?? 0);
  const totalSales = Number(summary?.total_sales ?? summary?.tickets_sold ?? 0);
  const totalEvents = Number(summary?.total_events ?? (Array.isArray(summary?.events) ? summary.events.length : summary?.events_count ?? 0));
  const avgOccupancy = Number(summary?.avg_occupancy ?? summary?.occupancy_percentage ?? 0);

  const rawEvents = summary?.events_comparison ?? summary?.events ?? [];
  const eventsComparison = Array.isArray(rawEvents)
    ? rawEvents.map((e, idx) => ({
        name: e.name ?? e.title ?? e.event_name ?? `Evento ${e.id ?? idx + 1}`,
        revenue: Number(e.revenue ?? e.income ?? e.gross ?? 0),
        net_revenue: Number(e.net_revenue ?? e.net_income ?? e.net ?? 0),
      }))
    : [];

  const rawMonthly = summary?.monthly_income ?? summary?.income_by_month ?? [];
  const monthlyIncome = Array.isArray(rawMonthly)
    ? rawMonthly.map((m) => ({
        month: m.month ?? m.label ?? m.period ?? m.name,
        income: Number(m.income ?? m.total ?? 0),
        net_income: Number(m.net_income ?? m.net ?? 0),
      }))
    : [];

  const tooltipFormatter = (value) => currencyFormatter.format(Number(value ?? 0));

  return (
    <div className="promotor-dashboard">
      <h2 className="dashboard-title">Panel Promotor</h2>

      {error && (
        <div className="error-banner">
          <span>Error: {error}</span>
          <button className="retry-btn" onClick={fetchData}>Reintentar</button>
        </div>
      )}

      <div className="kpi-row">
        <KPI label="Ingreso Neto" value={currencyFormatter.format(totalNet)} />
        <KPI label="Ingresos Brutos" value={currencyFormatter.format(totalIncome)} />
        <KPI label="Ventas" value={Number(totalSales).toLocaleString()} />
        <KPI label="Eventos" value={Number(totalEvents).toLocaleString()} />
        <KPI label="Ocupación Prom." value={`${Number(avgOccupancy).toFixed(1)} %`} />
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3 className="chart-title">Comparativo por evento (Ingresos)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={eventsComparison} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => currencyFormatter.format(v)} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                <Bar dataKey="revenue" name="Ingresos" fill="#8884d8" />
                <Bar dataKey="net_revenue" name="Neto" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {eventsComparison.length === 0 && <div className="empty">No hay datos de eventos</div>}
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Ingresos por mes</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={monthlyIncome} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => currencyFormatter.format(v)} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#8884d8" name="Ingresos" />
                <Line type="monotone" dataKey="net_income" stroke="#82ca9d" name="Neto" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {monthlyIncome.length === 0 && <div className="empty">No hay datos mensuales</div>}
        </div>
      </div>

      {loading && (
        <div className="loading-row">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      )}
    </div>
  );
};

export default DashboardPromotor;
