"use client"
import React, { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// Helper: group sales by day or week
const groupData = (sales = [], period = 'day') => {
  const map = new Map()
  sales.forEach((s) => {
    const d = new Date(s.date)
    if (Number.isNaN(d)) return
    let key
    if (period === 'week') {
      // ISO week label YYYY-Www
      const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      const dayNum = tmp.getUTCDay() || 7
      tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
      const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7)
      key = `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
    } else {
      key = d.toISOString().slice(0, 10)
    }
    const prev = map.get(key) || 0
    map.set(key, prev + Number(s.amount || 0))
  })
  // convert to array sorted by key
  const arr = Array.from(map.entries()).map(([k, v]) => ({ period: k, value: v }))
  arr.sort((a, b) => (a.period < b.period ? -1 : 1))
  return arr
}

const VentasLineChart = ({ sales = [], initialPeriod = 'day' }) => {
  const [period, setPeriod] = useState(initialPeriod)

  const data = useMemo(() => groupData(sales, period), [sales, period])

  return (
    <div style={{ width: '100%', height: 320, padding: 12, background: '#fff', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Evolución de ventas</h3>
        <div>
          <button onClick={() => setPeriod('day')} style={{ marginRight: 8 }} className={period === 'day' ? 'active' : ''}>
            Día
          </button>
          <button onClick={() => setPeriod('week')} className={period === 'week' ? 'active' : ''}>
            Semana
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default VentasLineChart
