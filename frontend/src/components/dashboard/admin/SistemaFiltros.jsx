const SistemaFiltros = ({ filtros, onChange }) => (
  <div className="flex flex-wrap gap-3 mb-6 bg-white p-4 rounded-xl shadow">
    <div className="flex flex-col">
      <label className="text-xs text-gray-500 mb-1 font-semibold">Desde</label>
      <input
        type="date"
        value={filtros.desde}
        onChange={(e) => onChange({ ...filtros, desde: e.target.value })}
        className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
    <div className="flex flex-col">
      <label className="text-xs text-gray-500 mb-1 font-semibold">Hasta</label>
      <input
        type="date"
        value={filtros.hasta}
        onChange={(e) => onChange({ ...filtros, hasta: e.target.value })}
        className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
    <div className="flex flex-col">
      <label className="text-xs text-gray-500 mb-1 font-semibold">Vista</label>
      <select
        value={filtros.vista}
        onChange={(e) => onChange({ ...filtros, vista: e.target.value })}
        className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="mensual">Mensual</option>
        <option value="trimestral">Trimestral</option>
      </select>
    </div>
  </div>
);

export default SistemaFiltros;
