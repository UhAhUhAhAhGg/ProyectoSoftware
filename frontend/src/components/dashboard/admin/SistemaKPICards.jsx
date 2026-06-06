const SistemaKPICards = ({ datos }) => {
  const cards = [
    { label: 'Ingresos por Comisiones', valor: datos?.comisiones, color: 'blue' },
    { label: 'Ingresos por Promociones', valor: datos?.promociones, color: 'purple' },
    { label: 'Total Plataforma', valor: datos?.total, color: 'green' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`bg-white rounded-xl shadow p-5 border-l-4 border-${c.color}-500`}
          style={{ borderLeft: `4px solid ${getBorderColor(c.color)}` }}
        >
          <p className="text-sm text-gray-500">{c.label}</p>
          <p className="text-2xl font-bold text-gray-800">
            ${c.valor?.toLocaleString('es-BO') ?? '—'}
          </p>
        </div>
      ))}
    </div>
  );
};

const getBorderColor = (color) => {
  const colors = {
    blue: '#3b82f6',
    purple: '#a855f7',
    green: '#10b981',
  };
  return colors[color] || '#999';
};

export default SistemaKPICards;
