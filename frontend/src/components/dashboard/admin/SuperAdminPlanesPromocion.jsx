import { useEffect, useState } from 'react';
import api from '../../../services/api';

const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';

function SuperAdminPlanesPromocion() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchPlans = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await api.get(`${EVENTS_URL}/api/v1/superadmin/promotion-plans/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (mounted && res.data?.plans) {
          setPlans(res.data.plans);
        }
      } catch (err) {
        console.error('Error al cargar planes de promoción', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchPlans();
    return () => { mounted = false; };
  }, []);

  const handleChange = (id, field, value) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSave = async (id) => {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;

    setSavingId(id);
    setMessage('');
    try {
      const token = localStorage.getItem('access_token');
      await api.patch(`${EVENTS_URL}/api/v1/superadmin/promotion-plans/${id}/`, {
        price_bob: parseFloat(plan.price_bob),
        is_active: plan.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage(`Plan "${plan.name}" actualizado correctamente.`);
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setMessage(`Error al guardar el plan "${plan.name}".`);
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <p style={{ color: '#999' }}>Cargando planes...</p>;

  return (
    <div style={{ marginTop: '2rem', maxWidth: '800px' }}>
      <div style={{
        background: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '12px',
        padding: '1.25rem'
      }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#e6c96b' }}>
          Planes de Promoción
        </h3>
        <p style={{ color: '#999', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
          Ajusta los precios y activa/desactiva los planes que se ofrecen a los Promotores.
        </p>

        {message && (
          <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '6px', background: message.includes('Error') ? '#331a1a' : '#1a331a', border: message.includes('Error') ? '1px solid #5c2020' : '1px solid #205c20', color: message.includes('Error') ? '#fca5a5' : '#86efac', fontSize: '0.9rem' }}>
            {message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {plans.map(plan => (
            <div key={plan.id} style={{
              background: '#222',
              border: '1px solid #444',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#fff', fontSize: '1.05rem' }}>{plan.name}</strong>
                <span style={{ fontSize: '0.8rem', background: '#333', padding: '2px 6px', borderRadius: '4px', color: '#ccc' }}>
                  {plan.tier_display}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
                <label style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>Precio (Bs.)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={plan.price_bob}
                  onChange={(e) => handleChange(plan.id, 'price_bob', e.target.value)}
                  style={{
                    background: '#111', border: '1px solid #555', color: '#fff', padding: '8px', borderRadius: '6px', width: '100%'
                  }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '5px' }}>
                <input 
                  type="checkbox" 
                  checked={plan.is_active}
                  onChange={(e) => handleChange(plan.id, 'is_active', e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: '#ddd', fontSize: '0.9rem' }}>Plan Activo</span>
              </label>

              <button 
                onClick={() => handleSave(plan.id)}
                disabled={savingId === plan.id}
                style={{
                  marginTop: 'auto',
                  padding: '8px',
                  background: '#ad8149',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: savingId === plan.id ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: savingId === plan.id ? 0.7 : 1
                }}
              >
                {savingId === plan.id ? 'Guardando...' : 'Guardar Plan'}
              </button>
            </div>
          ))}
          {plans.length === 0 && (
            <p style={{ color: '#777', gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>
              No hay planes de promoción en la base de datos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SuperAdminPlanesPromocion;
