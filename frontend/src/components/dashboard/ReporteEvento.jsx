import React, { useEffect, useState } from 'react';
import PromotorService from '../../services/promotorService';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import ProgressBar from '../common/ProgressBar';
import './ReporteEvento.css';

const MetricCard = ({ label, value }) => (
  <div className="metric-card">
    <div className="metric-label">{label}</div>
    <div className="metric-value">{value}</div>
  </div>
);

const TicketTypeRow = ({ type }) => (
  <div className="ticket-row">
    <div className="ticket-type">{type.name}</div>
    <div className="ticket-values">
      <div>Vendidos: {type.sold ?? type.quantity_sold ?? 0}</div>
      <div>Ingresos: $ {Number(type.gross ?? type.revenue ?? 0).toLocaleString()}</div>
      <div>Comisión: $ {Number(type.commission ?? 0).toLocaleString()}</div>
      <div>Neto: $ {Number(type.net ?? type.net_revenue ?? 0).toLocaleString()}</div>
    </div>
  </div>
);

const ReporteEvento = ({ eventId }) => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!eventId) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await PromotorService.getEventReport(eventId);
        setReport(data);
      } catch (err) {
        console.error('Error loading event report', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId]);

  if (!eventId) return <div>Please provide an `eventId` prop to view the report.</div>;
  if (loading) return <div>Loading report...</div>;
  if (!report) return <div>No data available for this event.</div>;

  const gross = report?.gross_income ?? report?.total_income ?? 0;
  const commissions = report?.commissions ?? report?.total_commission ?? 0;
  const net = report?.net_income ?? report?.total_net ?? 0;
  const goal = report?.revenue_goal ?? report?.goal ?? gross;
  const salesEvolution = report?.sales_evolution ?? report?.sales_by_day ?? [];
  const ticketTypes = report?.ticket_types ?? report?.ticket_type_breakdown ?? [];

  return (
    <div className="reporte-evento">
      <h2>Reporte financiero - {report?.name ?? report?.title ?? `Evento ${eventId}`}</h2>

      <div className="metrics-row">
        <MetricCard label="Ingresos Brutos" value={`$ ${Number(gross).toLocaleString()}`} />
        <MetricCard label="Comisiones" value={`$ ${Number(commissions).toLocaleString()}`} />
        <MetricCard label="Neto recibido" value={`$ ${Number(net).toLocaleString()}`} />
        <div className="metric-card">
          <div className="metric-label">Meta de ingresos</div>
          <div className="metric-value">$ {Number(goal).toLocaleString()}</div>
          <div style={{ marginTop: 8 }}>
            <ProgressBar value={net} goal={goal} />
          </div>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3>Evolución de ventas</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={salesEvolution} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#8884d8" name="Ventas" />
                <Line type="monotone" dataKey="revenue" stroke="#82ca9d" name="Ingresos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ticket-types-card">
          <h3>Ingresos por Tipo de Entrada</h3>
          {ticketTypes.length === 0 && <div>No hay datos de tipos de entrada.</div>}
          {ticketTypes.map((t, idx) => (
            <TicketTypeRow key={t.id ?? t.name ?? idx} type={t} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReporteEvento;
