'use client';

import { useEffect, useState } from 'react';
import SistemaKPICards from './SistemaKPICards';
import SistemaPieChart from './SistemaPieChart';
import SistemaTopPromotores from './SistemaTopPromotores';
import SistemaLineChart from './SistemaLineChart';
import SistemaFiltros from './SistemaFiltros';
import {
  getKPIsGlobales,
  getFuentesIngreso,
  getTopPromotores,
  getEvolucionIngresos
} from '../../../services/adminFinanceService';

// 👇 DATOS MOCK mientras el backend no esté listo
const MOCK = {
  kpis: { comisiones: 12500, promociones: 4800, total: 17300 },
  fuentes: [{ name: 'Comisiones', value: 12500 }, { name: 'Promociones', value: 4800 }],
  topPromotores: [
    { id: 1, nombre: 'Ana Quispe', ventas: 45, comision: 2250 },
    { id: 2, nombre: 'Luis Mamani', ventas: 38, comision: 1900 },
    { id: 3, nombre: 'Sara Condori', ventas: 30, comision: 1500 },
    { id: 4, nombre: 'Pedro Flores', ventas: 22, comision: 1100 },
    { id: 5, nombre: 'María López', ventas: 18, comision: 900 },
  ],
  evolucion: [
    { mes: 'Ene', comisiones: 1000, promociones: 400 },
    { mes: 'Feb', comisiones: 1200, promociones: 500 },
    { mes: 'Mar', comisiones: 1800, promociones: 600 },
    { mes: 'Abr', comisiones: 1500, promociones: 700 },
    { mes: 'May', comisiones: 2100, promociones: 900 },
    { mes: 'Jun', comisiones: 2500, promociones: 1100 },
  ],
};

const DashboardSistema = () => {
  const [filtros, setFiltros] = useState({
    desde: '2025-01-01',
    hasta: new Date().toISOString().split('T')[0],
    vista: 'mensual',
  });

  const [kpis, setKpis] = useState(null);
  const [fuentes, setFuentes] = useState([]);
  const [topPromotores, setTopPromotores] = useState([]);
  const [evolucion, setEvolucion] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      // Con backend real:
      // const [k, f, t, e] = await Promise.all([
      //   getKPIsGlobales(filtros), getFuentesIngreso(filtros),
      //   getTopPromotores(filtros), getEvolucionIngresos(filtros)
      // ]);

      // Con mock (quitar cuando backend esté listo):
      const { kpis: k, fuentes: f, topPromotores: t, evolucion: e } = MOCK;

      setKpis(k);
      setFuentes(f);
      setTopPromotores(t);
      setEvolucion(e);
    } catch (err) {
      console.error('Error cargando dashboard sistema:', err);
      setError('Error al cargar los datos. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 Dashboard Financiero Global</h2>

      <SistemaFiltros filtros={filtros} onChange={setFiltros} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="spinner" style={{
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #6366f1',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p className="text-gray-500 ml-4">Cargando datos...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        <>
          <SistemaKPICards datos={kpis} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SistemaPieChart datos={fuentes} />
            <SistemaTopPromotores datos={topPromotores} />
          </div>
          <SistemaLineChart datos={evolucion} />
        </>
      )}
    </div>
  );
};

export default DashboardSistema;
