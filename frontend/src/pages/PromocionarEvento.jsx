import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventosService } from '../services/eventosService';
import ModalPagoQR from '../components/ModalPagoQR';
import api from '../services/api';
import './PromocionarEvento.css';

const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';

// Beneficios reales y honestos según el nivel del plan
const BENEFICIOS_POR_TIER = {
  basico: [
    'Tu evento aparece en la sección "Eventos Destacados" del dashboard del comprador',
    'Visibilidad prioridad baja frente a eventos sin promoción',
  ],
  premium: [
    'Tu evento aparece en la sección "Eventos Destacados" del dashboard del comprador',
    'Mayor prioridad de visibilidad que el plan Básico',
  ],
  pro: [
    'Tu evento aparece en la sección "Eventos Destacados" del dashboard del comprador',
    'Mayor prioridad de visibilidad que todos los demás planes',
  ],
};

const EMOJIS_POR_TIER = { basico: '⭐', premium: '🥇', pro: '🚀' };
const COLORES_POR_TIER = { basico: '#6B7280', premium: '#F59E0B', pro: '#8B5CF6' };

export default function PromocionarEvento({ eventoId: propEventoId, onClose }) {
  const params = useParams();
  const navigate = useNavigate();
  const eventoId = propEventoId || params.id;
  const { user } = useAuth();
  
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [error, setError] = useState('');
  const [eventoInfo, setEventoInfo] = useState(null);
  const [cargandoEvento, setCargandoEvento] = useState(true);
  const [existingPromo, setExistingPromo] = useState(null);

  // Cargar planes desde el backend
  useEffect(() => {
    const cargarPlanes = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await api.get(`${EVENTS_URL}/api/v1/promotion-plans/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const planesBackend = (res.data?.plans || []).map(p => ({
          id: p.tier,
          planId: p.id,
          nombre: p.name,
          precio: parseFloat(p.price_bob),
          duracion: `${p.duration_days} días`,
          beneficios: BENEFICIOS_POR_TIER[p.tier] || [`Visibilidad ${p.tier} en la plataforma`],
          color: COLORES_POR_TIER[p.tier] || '#6B7280',
          emoji: EMOJIS_POR_TIER[p.tier] || '⭐',
        }));
        setPlanes(planesBackend);
      } catch (err) {
        console.error('Error al cargar planes:', err);
        setError('No se pudieron cargar los planes de promoción. Intenta de nuevo.');
      } finally {
        setLoadingPlanes(false);
      }
    };
    cargarPlanes();
  }, []);

  // Cargar información del evento
  useEffect(() => {
    const cargarEvento = async () => {
      try {
        const evento = await eventosService.getEventoById(eventoId);
        setEventoInfo(evento);
        const promoRes = await eventosService.getPromotionStatus(eventoId);
        const promoData = promoRes.data || promoRes;
        if (promoData.status !== 'no_promotion') {
           setExistingPromo(promoData.promotion);
        }
      } catch (err) {
        setError('No se pudo cargar la información del evento.');
        console.error(err);
      } finally {
        setCargandoEvento(false);
      }
    };
    
    if (eventoId) {
      cargarEvento();
    }
  }, [eventoId]);

  const handleContinuarAlPago = () => {
    if (!planSeleccionado) {
      setError('Por favor selecciona un plan.');
      return;
    }
    setError('');
    // No necesitamos llamar al backend para generar QR, simularemos localmente
    setQrData({ total_price: planSeleccionado.precio });
    setModalPagoAbierto(true);
  };

  const handlePagoConfirmado = async (comprobante) => {
    try {
      setLoading(true);
      setError('');

      await eventosService.promocionarEvento(eventoId, {
        plan: planSeleccionado.planId,
        comprobante: comprobante
      });

      alert(`✅ ¡Evento promocionado exitosamente!\nPlan ${planSeleccionado.nombre} activado por ${planSeleccionado.duracion}`);
      if (onClose) onClose();
      else navigate('/dashboard/mis-eventos');
    } catch (err) {
      setError(err.message || 'Error al confirmar la promoción. Intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
      setModalPagoAbierto(false);
    }
  };

  const handleCerrarModal = () => {
    setModalPagoAbierto(false);
    setQrData(null);
  };

  if (cargandoEvento || loadingPlanes) {
    return (
      <div className="promocionar-evento-loading">
        <div className="spinner"></div>
        <p>Cargando información...</p>
      </div>
    );
  }

  return (
    <div className={`promocionar-overlay ${onClose ? 'is-modal' : ''}`} onClick={() => onClose && onClose()}>
      <div className={`promocionar-evento ${onClose ? 'as-modal' : ''}`} onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div className="promocionar-header">
        <button 
          className="btn-volver" 
          onClick={() => {
            if (onClose) onClose();
            else navigate('/dashboard/mis-eventos');
          }}
        >
          &larr; Volver
        </button>
        <h2>🚀 Promociona tu Evento</h2>
        {eventoInfo && <p className="evento-nombre-destacado">{eventoInfo.nombre}</p>}
      </div>

      {existingPromo ? (
        <div style={{ padding: '20px', background: '#fef3c7', borderRadius: '12px', margin: '20px', textAlign: 'center', border: '1px solid #f59e0b' }}>
          <h3 style={{ color: '#b45309', marginBottom: '10px' }}>⭐ Ya tienes una promoción activa</h3>
          <p style={{ color: '#92400e', marginBottom: '15px' }}>
            Este evento ya cuenta con el plan <strong>{existingPromo.plan_name || 'Pro'}</strong> activo hasta el {new Date(existingPromo.expires_at).toLocaleDateString('es-ES')}. No puedes adquirir otra promoción mientras esta esté vigente.
          </p>
          <button 
            className="btn-primario" 
            onClick={() => {
              if (onClose) onClose();
              else navigate('/dashboard/mis-eventos');
            }}
            style={{ display: 'inline-block' }}
          >
            Entendido
          </button>
        </div>
      ) : (
        <>
          {error && <div className="alert alert-error"><span>❌ {error}</span><button className="alert-close" onClick={() => setError('')}>✕</button></div>}
          <div className="promocionar-description">
            <p>
              Selecciona un plan de promoción para que tu evento aparezca en la sección 
              <strong> "Eventos Destacados"</strong> del dashboard del comprador. 
              A mayor plan, mayor prioridad de visibilidad.
            </p>
          </div>

      {/* Grid de Planes */}
      <div className="planes-container">
        {planes.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
            No hay planes disponibles en este momento.
          </p>
        ) : (
          planes.map(plan => (
            <div
              key={plan.id}
              className={`plan-card ${planSeleccionado?.id === plan.id ? 'seleccionado' : ''}`}
              onClick={() => setPlanSeleccionado(plan)}
              style={{
                borderColor: planSeleccionado?.id === plan.id ? plan.color : '#e0e0e0',
                backgroundColor: planSeleccionado?.id === plan.id ? `${plan.color}08` : '#ffffff'
              }}
            >
              {/* Header del Plan */}
              <div className="plan-header" style={{ borderBottomColor: plan.color }}>
                <div className="plan-emoji">{plan.emoji}</div>
                <h3 className="plan-nombre">{plan.nombre}</h3>
                <div className="plan-precio">
                  <span className="cantidad">Bs. {plan.precio}</span>
                </div>
              </div>

              {/* Duración */}
              <div className="plan-duracion">
                <span className="icono">⏱️</span>
                <span>{plan.duracion}</span>
              </div>

              {/* Beneficios */}
              <div className="plan-beneficios">
                <h4>¿Qué obtienes?</h4>
                <ul>
                  {plan.beneficios.map((beneficio, idx) => (
                    <li key={idx}>
                      <span className="beneficio-icono">✓</span>
                      <span>{beneficio}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Selector */}
              <div className="plan-selector">
                <input
                  type="radio"
                  name="plan"
                  value={plan.id}
                  checked={planSeleccionado?.id === plan.id}
                  onChange={() => setPlanSeleccionado(plan)}
                  style={{ accentColor: plan.color }}
                />
                <span className="selector-label">
                  {planSeleccionado?.id === plan.id ? 'Seleccionado' : 'Seleccionar'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resumen de Selección */}
      {planSeleccionado && (
        <div className="resumen-plan">
          <div className="resumen-contenido">
            <div className="resumen-item">
              <span className="resumen-label">Plan seleccionado:</span>
              <span className="resumen-valor" style={{ color: planSeleccionado.color }}>
                {planSeleccionado.emoji} {planSeleccionado.nombre}
              </span>
            </div>
            <div className="resumen-item">
              <span className="resumen-label">Duración:</span>
              <span className="resumen-valor">{planSeleccionado.duracion}</span>
            </div>
            <div className="resumen-item">
              <span className="resumen-label">Costo total:</span>
              <span className="resumen-valor resumen-precio">Bs. {planSeleccionado.precio}</span>
            </div>
          </div>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="acciones-footer">
        <button 
          className="btn-cancelar"
          onClick={() => {
            if (onClose) onClose();
            else navigate('/dashboard/mis-eventos');
          }}
          disabled={loading}
        >
          Cancelar
        </button>
        <button 
          className={`btn-continuar ${!planSeleccionado || loading ? 'deshabilitado' : ''}`}
          onClick={handleContinuarAlPago}
          disabled={!planSeleccionado || loading}
        >
          {loading ? 'Procesando...' : 'Continuar al Pago'}
        </button>
      </div>

      {/* Modal de Pago QR */}
      {modalPagoAbierto && qrData && (
        <ModalPagoQR
          qrData={qrData}
          onCancel={handleCerrarModal}
          onPagoConfirmado={handlePagoConfirmado}
          concepto={`Promoción ${planSeleccionado?.nombre} - Evento #${eventoId}`}
        />
      )}
        </>
      )}
      </div>
    </div>
  );
}
