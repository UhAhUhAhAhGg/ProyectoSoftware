import { useEffect, useState } from 'react';
import { settingsService } from '../../../services/settingsService';

function SuperAdminComisiones() {
  const [mode, setMode] = useState('porcentaje'); // 'porcentaje' | 'fijo' | 'hibrido'
  const [percentage, setPercentage] = useState(5);
  const [fixed, setFixed] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await settingsService.getCommissionSettings();
        if (!mounted || !data) return;
        // Esperamos una forma como: { mode: 'porcentaje', percentage: 5, fixed: 0 }
        if (data.mode) setMode(data.mode);
        if (typeof data.percentage === 'number') setPercentage(data.percentage);
        if (typeof data.fixed === 'number') setFixed(data.fixed);
      } catch (err) {
        console.warn('No hay config de comisiones en el backend o hubo error');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const validate = () => {
    if (mode === 'porcentaje' || mode === 'hibrido') {
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        setMessage('El porcentaje debe estar entre 0 y 100');
        return false;
      }
    }
    if (mode === 'fijo' || mode === 'hibrido') {
      if (isNaN(fixed) || fixed < 0) {
        setMessage('El monto fijo debe ser un número mayor o igual a 0');
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    setMessage('');
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { mode, percentage: Number(percentage), fixed: Number(fixed) };
      await settingsService.updateCommissionSettings(payload);
      setMessage('Configuración de comisiones guardada correctamente.');
    } catch (err) {
      setMessage('Error al guardar la configuración.');
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div className="admin-module">
      <h2>Configuración de Comisiones</h2>
      <p>Define cómo calcula la plataforma la comisión por cada venta.</p>

      <div style={{ marginTop: '1rem', maxWidth: '680px' }}>
        <div style={{
          background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', padding: '1rem'
        }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontWeight: 600 }}>
            Modo de comisión
          </label>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <label style={{ color: '#ddd' }}>
              <input type="radio" name="mode" value="porcentaje" checked={mode === 'porcentaje'} onChange={() => setMode('porcentaje')} /> Porcentaje
            </label>
            <label style={{ color: '#ddd' }}>
              <input type="radio" name="mode" value="fijo" checked={mode === 'fijo'} onChange={() => setMode('fijo')} /> Fijo
            </label>
            <label style={{ color: '#ddd' }}>
              <input type="radio" name="mode" value="hibrido" checked={mode === 'hibrido'} onChange={() => setMode('hibrido')} /> Híbrido
            </label>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ color: '#ccc', fontSize: '0.9rem' }}>Porcentaje (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                disabled={mode === 'fijo'}
                style={{ width: '160px', padding: '0.5rem', borderRadius: '8px', background: '#222', color: '#fff', border: '1px solid #444' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ color: '#ccc', fontSize: '0.9rem' }}>Monto fijo (BOB)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fixed}
                onChange={(e) => setFixed(e.target.value)}
                disabled={mode === 'porcentaje'}
                style={{ width: '160px', padding: '0.5rem', borderRadius: '8px', background: '#222', color: '#fff', border: '1px solid #444' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: '#ad8149', color: '#fff', cursor: 'pointer' }}
            >
              {loading ? 'Guardando...' : 'Guardar configuración'}
            </button>

            {message && (
              <span style={{ color: message.includes('Error') ? '#c94b4b' : '#7fbf7f' }}>{message}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminComisiones;
