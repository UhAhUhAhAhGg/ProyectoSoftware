import { useState, useEffect, useCallback } from 'react';
import PromotorService from '../../../services/promotorService';
import './PromocodesModal.css';

function PromocodesModal({ eventId, eventoNombre, onClose }) {
  const [codigos, setCodigos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');

  // Formulario nuevo código
  const [nuevoCodigo, setNuevoCodigo] = useState({
    code: '',
    discount_type: 'porcentaje',
    discount_value: '',
    max_uses: '',
    valid_until: ''
  });

  const cargarCodigos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await PromotorService.getPromoCodes(eventId);
      setCodigos(result.results || []);
    } catch (err) {
      console.error('Error cargando códigos:', err);
      setError('Error al cargar la lista de códigos.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    cargarCodigos();
  }, [cargarCodigos]);

  const handleCrear = async (e) => {
    e.preventDefault();
    setCreando(true);
    setError('');
    
    try {
      const data = {
        ...nuevoCodigo,
        event: eventId,
        code: nuevoCodigo.code.toUpperCase(),
        discount_value: parseFloat(nuevoCodigo.discount_value),
        max_uses: (nuevoCodigo.max_uses && parseInt(nuevoCodigo.max_uses) > 0) ? parseInt(nuevoCodigo.max_uses) : null,
      };

      if (nuevoCodigo.valid_until) {
        data.valid_until = nuevoCodigo.valid_until;
      } else {
        delete data.valid_until;
      }

      await PromotorService.createPromoCode(data);
      setNuevoCodigo({ code: '', discount_type: 'porcentaje', discount_value: '', max_uses: '', valid_until: '' });
      await cargarCodigos();
    } catch (err) {
      setError(err.message || 'Error al crear el código. Verifica que no exista otro con el mismo nombre.');
    } finally {
      setCreando(false);
    }
  };

  const handleToggleEstado = async (id, is_active) => {
    try {
      await PromotorService.updatePromoCode(id, { is_active: !is_active });
      await cargarCodigos();
    } catch (err) {
      alert('Error al cambiar el estado del código.');
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este código?')) return;
    try {
      await PromotorService.deletePromoCode(id);
      await cargarCodigos();
    } catch (err) {
      alert('Error al eliminar el código.');
    }
  };

  const formatMoney = (val, type) => {
    if (type === 'porcentaje') return `${val}%`;
    return `Bs. ${Number(val).toLocaleString('es-BO')}`;
  };

  const formatDate = (d) => {
    if (!d) return 'Sin límite';
    return new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="pcm-overlay" onClick={onClose}>
      <div className="pcm-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="pcm-header">
          <div>
            <h2>🏷️ Códigos de Descuento</h2>
            <p className="pcm-evento-nombre">{eventoNombre}</p>
          </div>
          <button className="pcm-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="pcm-error">{error}</div>}

        {/* Formulario */}
        <div className="pcm-form-section">
          <h3>Crear Nuevo Código</h3>
          <form className="pcm-form" onSubmit={handleCrear}>
            <div className="pcm-form-group">
              <label>Código (Ej: VERANO20)</label>
              <input
                type="text"
                required
                value={nuevoCodigo.code}
                onChange={e => setNuevoCodigo({ ...nuevoCodigo, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                placeholder="PROMO10"
              />
            </div>
            <div className="pcm-form-group pcm-form-row">
              <div>
                <label>Tipo de Descuento</label>
                <select
                  value={nuevoCodigo.discount_type}
                  onChange={e => setNuevoCodigo({ ...nuevoCodigo, discount_type: e.target.value, discount_value: '' })}
                >
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="fijo">Monto Fijo (Bs.)</option>
                </select>
              </div>
              <div>
                <label>Valor ({nuevoCodigo.discount_type === 'porcentaje' ? '%' : 'Bs.'})</label>
                <input
                  type="number"
                  required
                  min="0.1"
                  step="0.1"
                  max={nuevoCodigo.discount_type === 'porcentaje' ? "100" : undefined}
                  value={nuevoCodigo.discount_value}
                  onChange={e => setNuevoCodigo({ ...nuevoCodigo, discount_value: e.target.value })}
                  placeholder={nuevoCodigo.discount_type === 'porcentaje' ? "10" : "50"}
                />
              </div>
            </div>
            <div className="pcm-form-group pcm-form-row">
              <div>
                <label>Límite de Usos (0 = ilimitado)</label>
                <input
                  type="number"
                  min="0"
                  value={nuevoCodigo.max_uses}
                  onChange={e => setNuevoCodigo({ ...nuevoCodigo, max_uses: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label>Expiración (opcional)</label>
                <input
                  type="datetime-local"
                  value={nuevoCodigo.valid_until}
                  onChange={e => setNuevoCodigo({ ...nuevoCodigo, valid_until: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="pcm-btn-submit" disabled={creando}>
              {creando ? 'Creando...' : '+ Crear Código'}
            </button>
          </form>
        </div>

        {/* Tabla de códigos */}
        <div className="pcm-list-section">
          <h3>Códigos Activos</h3>
          {loading ? (
            <div className="pcm-loading">Cargando...</div>
          ) : codigos.length === 0 ? (
            <div className="pcm-empty">No hay códigos de descuento creados.</div>
          ) : (
            <div className="pcm-table-wrap">
              <table className="pcm-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descuento</th>
                    <th>Usos</th>
                    <th>Total Descontado</th>
                    <th>Expiración</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {codigos.map(c => (
                    <tr key={c.id}>
                      <td className="pcm-td-code">{c.code}</td>
                      <td>{formatMoney(c.discount_value, c.discount_type)}</td>
                      <td>{c.times_used || 0} / {c.max_uses > 0 ? c.max_uses : '∞'}</td>
                      <td style={{ color: '#dc3545', fontWeight: '500' }}>Bs. {parseFloat(c.total_descontado || 0).toFixed(2)}</td>
                      <td>{formatDate(c.valid_until)}</td>
                      <td>
                        <span className={`pcm-status ${c.is_active ? 'active' : 'inactive'}`}>
                          {c.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="pcm-td-actions">
                        <button 
                          className="pcm-btn-toggle" 
                          onClick={() => handleToggleEstado(c.id, c.is_active)}
                        >
                          {c.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                        <button 
                          className="pcm-btn-delete" 
                          onClick={() => handleEliminar(c.id)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PromocodesModal;
