import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORES = ['#6366f1', '#10b981', '#f59e0b'];

const SistemaPieChart = ({ datos }) => {
  // datos = [{ name: 'Comisiones', value: 5000 }, { name: 'Promociones', value: 3000 }]
  if (!datos || datos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Fuentes de Ingreso</h3>
        <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold text-gray-700 mb-3">Fuentes de Ingreso</h3>
      <div className="flex justify-center">
        <PieChart width={300} height={260}>
          <Pie data={datos} cx={150} cy={110} outerRadius={90} dataKey="value" label>
            {datos?.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => `$${v.toLocaleString('es-BO')}`} />
          <Legend />
        </PieChart>
      </div>
    </div>
  );
};

export default SistemaPieChart;
