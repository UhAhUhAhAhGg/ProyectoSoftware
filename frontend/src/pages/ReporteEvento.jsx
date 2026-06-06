import React, { useMemo } from 'react'
import ProgressBar from '../components/common/ProgressBar'
import VentasLineChart from '../components/VentasLineChart'

// Example page - ReporteEvento
const sampleSales = [
  { date: '2026-04-01', amount: 120 },
  { date: '2026-04-01', amount: 80 },
  { date: '2026-04-02', amount: 200 },
  { date: '2026-04-05', amount: 300 },
  { date: '2026-04-09', amount: 150 },
  { date: '2026-04-16', amount: 400 },
]

const sampleTicketTypes = [
  { name: 'General', price: 20, sold: 120, commissionPct: 0.05 },
  { name: 'VIP', price: 50, sold: 40, commissionPct: 0.07 },
  { name: 'Platea', price: 35, sold: 60, commissionPct: 0.06 },
]

const ReporteEvento = ({ sales = sampleSales, ticketTypes = sampleTicketTypes, target = 8000 }) => {
  const metrics = useMemo(() => {
    const grossByType = ticketTypes.map((t) => ({
      ...t,
      gross: t.price * t.sold,
      commission: t.price * t.sold * (t.commissionPct || 0),
    }))
    const gross = grossByType.reduce((s, t) => s + t.gross, 0)
    const commissions = grossByType.reduce((s, t) => s + t.commission, 0)
    const net = gross - commissions
    return { grossByType, gross, commissions, net }
  }, [ticketTypes])

  return (
    <div style={{ padding: 20 }}>
      <h2>Reporte financiero del evento</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 12 }}>
        <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Ingresos brutos</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>${metrics.gross.toFixed(2)}</div>
        </div>

        <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Comisiones</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>${metrics.commissions.toFixed(2)}</div>
        </div>

        <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Neto recibido</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>${metrics.net.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
            <h4 style={{ marginTop: 0 }}>Progreso hacia la meta</h4>
            <ProgressBar value={metrics.gross} goal={target} />
          </div>

          <div style={{ marginTop: 12 }}>
            <VentasLineChart sales={sales} initialPeriod="day" />
          </div>
        </div>

        <div style={{ width: 360 }}>
          <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
            <h4 style={{ marginTop: 0 }}>Ingresos por tipo de entrada</h4>
            <div style={{ display: 'grid', gap: 8 }}>
              {metrics.grossByType.map((t) => (
                <div key={t.name} style={{ padding: 8, borderRadius: 6, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 14 }}>${t.gross.toFixed(2)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{t.sold} vendidos • Comisión ${t.commission.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReporteEvento
