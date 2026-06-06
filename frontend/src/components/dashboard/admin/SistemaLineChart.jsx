import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SistemaLineChart = ({ datos }) => {
  // datos = [{ mes: 'Ene', comisiones: 1200, promociones: 800 }, ...]
  if (!datos || datos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-5 mt-4">
        <h3 className="font-semibold text-gray-700 mb-3">Evolución de Ingresos por Mes</h3>
        <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-5 mt-4">
      <h3 className="font-semibold text-gray-700 mb-3">Evolución de Ingresos por Mes</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={datos}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis tickFormatter={(v) => `$${v}`} />
          <Tooltip 
            formatter={(v) => `$${v.toLocaleString('es-BO')}`}
            contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="comisiones" 
            stroke="#6366f1" 
            strokeWidth={2} 
            dot={false}
            name="Comisiones"
          />
          <Line 
            type="monotone" 
            dataKey="promociones" 
            stroke="#10b981" 
            strokeWidth={2} 
            dot={false}
            name="Promociones"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SistemaLineChart;
