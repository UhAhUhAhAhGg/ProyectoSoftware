import { useEffect, useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import api from '../../../services/api';
import { userManagementService } from '../../../services/userManagementService';
import './DashboardSistema.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';

const formatCurrency = (val) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', maximumFractionDigits: 0 }).format(val || 0);

const DashboardSistema = () => {
  const [data, setData] = useState({
    kpis: { comisiones: 0, promociones: 0, total: 0, activos: 0 },
    fuentes: [],
    topPromotores: [],
    evolucion: [],
    topCategorias: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };

        const [globalRes, promotoresData, rankingRes, evolutionRes] = await Promise.all([
          api.get(`${EVENTS_URL}/api/v1/superadmin/dashboard/global/`, { headers }),
          userManagementService.getPromotores(),
          api.get(`${EVENTS_URL}/api/v1/superadmin/dashboard/promotores/`, { headers }),
          api.get(`${EVENTS_URL}/api/v1/admin/dashboard/evolution/`, { headers })
        ]);

        const global = globalRes.data || globalRes;
        const ranking = (rankingRes.data || rankingRes).ranking || [];
        const evolution = evolutionRes.data || evolutionRes;

        // Mapear Nombres de Promotores
        const mapPromotores = new Map(promotoresData.map(p => [String(p.id), p.nombre]));

        const mappedTopPromotores = ranking.map((p, i) => ({
          id: p.promoter_id,
          nombre: mapPromotores.get(String(p.promoter_id)) || 'Promotor Desconocido',
          ventas: p.tickets_vendidos || 0,
          comision: Number(p.comisiones || 0)
        })).slice(0, 5); // Tomar solo los top 5

        const mappedEvolucion = Array.isArray(evolution) ? evolution.map(e => ({
          mes: e.mes,
          comisiones: Number(e.ingresos_comisiones || 0),
          promociones: 0 // Mock porque evolution no trae promociones aún
        })) : [];

        const financiero = global.financiero || {};
        const resumen = global.resumen_plataforma || {};
        const categorias = global.top_categorias || [];

        setData({
          kpis: {
            comisiones: Number(financiero.comisiones_plataforma || 0),
            promociones: Number(financiero.ingresos_por_promociones || 0),
            total: Number(financiero.total_ingresos_plataforma || 0),
            activos: Number(resumen.total_eventos || 0)
          },
          fuentes: [
            { name: 'Comisiones de Venta', value: Number(financiero.comisiones_plataforma || 0) },
            { name: 'Planes de Promoción', value: Number(financiero.ingresos_por_promociones || 0) }
          ].filter(f => f.value > 0), // Solo mostrar los que tienen ingresos
          topPromotores: mappedTopPromotores,
          evolucion: mappedEvolucion,
          topCategorias: categorias.map(c => ({
            name: c.categoria_nombre,
            ingresos: Number(c.ingresos || 0),
            tickets: c.tickets_vendidos
          }))
        });

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("No se pudieron cargar los datos del dashboard. Verifica tu conexión o permisos.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="ds-loader-container">
        <div className="ds-spinner" />
        <p>Calculando métricas globales...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ds-loader-container">
        <p style={{ color: '#ef4444' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="ds-wrapper">
      <header className="ds-header">
        <h1 className="ds-title">
          <span className="ds-title-icon">🌍</span>
          Rendimiento Financiero Global
        </h1>
      </header>

      {/* Tarjetas KPI */}
      <div className="ds-kpi-grid">
        <div className="ds-kpi-card">
          <span className="ds-kpi-label">Ingreso Total Plataforma</span>
          <span className="ds-kpi-value">{formatCurrency(data.kpis.total)}</span>
        </div>
        <div className="ds-kpi-card success">
          <span className="ds-kpi-label">Por Comisiones</span>
          <span className="ds-kpi-value">{formatCurrency(data.kpis.comisiones)}</span>
        </div>
        <div className="ds-kpi-card warning">
          <span className="ds-kpi-label">Por Promociones</span>
          <span className="ds-kpi-value">{formatCurrency(data.kpis.promociones)}</span>
        </div>
        <div className="ds-kpi-card">
          <span className="ds-kpi-label">Eventos Registrados</span>
          <span className="ds-kpi-value">{data.kpis.activos}</span>
        </div>
      </div>

      <div className="ds-charts-grid">
        {/* Gráfico principal: Evolución */}
        <div className="ds-panel">
          <h2 className="ds-panel-title">📈 Evolución de Ingresos</h2>
          <div style={{ height: 320, width: '100%' }}>
            {data.evolucion.length > 0 ? (
              <ResponsiveContainer>
                <AreaChart data={data.evolucion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCom" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="mes" stroke="#9ca3af" tick={{fill: '#9ca3af', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#9ca3af" tick={{fill: '#9ca3af', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="comisiones" name="Comisiones" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCom)" />
                  <Area type="monotone" dataKey="promociones" name="Promociones" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPro)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#6b7280' }}>
                No hay datos de evolución suficientes
              </div>
            )}
          </div>
        </div>

        {/* Panel lateral: Top Promotores */}
        <div className="ds-panel">
          <h2 className="ds-panel-title">🏆 Top Promotores</h2>
          {data.topPromotores.length > 0 ? (
            <ul className="ds-ranking-list">
              {data.topPromotores.map((p, i) => (
                <li key={p.id} className="ds-ranking-item">
                  <div className="ds-ranking-left">
                    <span className="ds-ranking-pos">#{i + 1}</span>
                    <span className="ds-ranking-name">{p.nombre}</span>
                  </div>
                  <div className="ds-ranking-right">
                    <span className="ds-ranking-val">{formatCurrency(p.comision)}</span>
                    <span className="ds-ranking-sub">{p.ventas} ventas</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#6b7280', textAlign: 'center' }}>
              No hay promotores con ventas<br/>registradas aún.
            </div>
          )}
        </div>
      </div>

      <div className="ds-charts-grid">
        {/* Distribución */}
        <div className="ds-panel">
          <h2 className="ds-panel-title">🍩 Distribución de Ingresos</h2>
          <div style={{ height: 250, width: '100%', display: 'flex', alignItems: 'center' }}>
            {data.fuentes.length > 0 ? (
              <>
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.fuentes}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.fuentes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ width: '50%', paddingLeft: '1rem' }}>
                  {data.fuentes.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COLORS[i % COLORS.length], marginRight: '8px' }}></div>
                      <div>
                        <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>{f.name}</div>
                        <div style={{ color: 'var(--ds-text-secondary)', fontSize: '0.8rem' }}>{formatCurrency(f.value)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ width: '100%', textAlign: 'center', color: '#6b7280' }}>
                Sin ingresos registrados para distribuir.
              </div>
            )}
          </div>
        </div>

        {/* Nuevo Gráfico: Top Categorías */}
        <div className="ds-panel">
          <h2 className="ds-panel-title">⭐ Ingresos por Categoría</h2>
          <div style={{ height: 250, width: '100%' }}>
            {data.topCategorias.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={data.topCategorias} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="#9ca3af" tick={{fill: '#9ca3af', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" tick={{fill: '#fff', fontSize: 13, fontWeight: 500}} width={100} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={20}>
                    {data.topCategorias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#6b7280', textAlign: 'center' }}>
                No hay categorías con ingresos registrados.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardSistema;
