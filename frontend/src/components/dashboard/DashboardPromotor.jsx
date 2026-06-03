import React, { useEffect, useState, useRef } from 'react';
import PromotorService from '../../services/promotorService';
import api from '../../services/api';
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
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const data = await PromotorService.getDashboardSummary();
      setSummary(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching promotor dashboard summary', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load
    fetchData();

    // polling every 30s
    intervalRef.current = setInterval(fetchData, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Defensive mapping of expected fields
  const totalNet = summary?.total_net_income ?? summary?.net_income ?? summary?.total_net ?? 0;
  const totalIncome = summary?.total_income ?? summary?.gross_income ?? summary?.total ?? 0;
  const totalSales = summary?.total_sales ?? summary?.tickets_sold ?? 0;
  const totalEvents = summary?.total_events ?? (Array.isArray(summary?.events) ? summary.events.length : summary?.events_count ?? 0);
  const avgOccupancy = summary?.avg_occupancy ?? summary?.occupancy_percentage ?? 0;

  const eventsComparison = summary?.events_comparison ?? summary?.events ?? [];
  const monthlyIncome = summary?.monthly_income ?? summary?.income_by_month ?? [];

  return (
    <div className="promotor-dashboard">
      <h2 className="dashboard-title">Panel Promotor</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          className="export-btn"
          onClick={() => {
            const url = `${api.defaults.baseURL}/promotor/dashboard/summary/export?format=pdf`;
            window.open(url, '_blank');
          }}
        >
          Exportar PDF
        </button>
        <button
          className="export-btn"
          onClick={() => {
            const url = `${api.defaults.baseURL}/promotor/dashboard/summary/export?format=excel`;
            window.open(url, '_blank');
          }}
        >
          Exportar Excel
        </button>
      </div>

      <div className="kpi-row">
        <KPI label="Ingreso Neto" value={`$ ${Number(totalNet).toLocaleString()}`} />
        <KPI label="Ingresos Brutos" value={`$ ${Number(totalIncome).toLocaleString()}`} />
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
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" name="Ingresos" fill="#8884d8" />
                <Bar dataKey="net_revenue" name="Neto" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Ingresos por mes</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={monthlyIncome} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#8884d8" name="Ingresos" />
                <Line type="monotone" dataKey="net_income" stroke="#82ca9d" name="Neto" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {loading && <div className="loading">Cargando...</div>}
    </div>
  );
};

export default DashboardPromotor;
