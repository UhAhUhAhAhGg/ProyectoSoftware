const SistemaTopPromotores = ({ datos }) => {
  if (!datos || datos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Top 5 Promotores</h3>
        <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold text-gray-700 mb-3">Top 5 Promotores</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="pb-2">#</th>
            <th className="pb-2">Promotor</th>
            <th className="pb-2">Ventas</th>
            <th className="pb-2">Comisión</th>
          </tr>
        </thead>
        <tbody>
          {datos?.map((p, i) => (
            <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-2 font-bold text-indigo-600">{i + 1}</td>
              <td className="py-2">{p.nombre}</td>
              <td className="py-2">{p.ventas}</td>
              <td className="py-2 font-semibold">${p.comision?.toLocaleString('es-BO')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SistemaTopPromotores;
