import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventosService } from '../services/eventosService';
import ModalPagoQR from '../components/ModalPagoQR';
import './PromocionarEvento.css';

// Planes de promoción disponibles
const PLANES = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: 50,
    duracion: '7 días',
    beneficios: ['Badge destacado', 'Aparece primero en su categoría'],
    color: '#6B7280',
    emoji: '⭐'
  },
  {
    id: 'premium',
    nombre: 'Premium',
    precio: 120,
    duracion: '15 días',
    beneficios: ['Badge Premium', 'Top 3 en búsquedas', 'Banner en home'],
    color: '#F59E0B',
    emoji: '🥇'
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: 250,
    duracion: '30 días',
    beneficios: ['Badge Pro', 'Posición #1', 'Banner destacado', 'Notificación a usuarios'],
    color: '#8B5CF6',
    emoji: '🚀'
  }
];

export default function PromocionarEvento({ eventoId: propEventoId, onClose }) {
  const params = useParams();
  const navigate = useNavigate();
  const eventoId = propEventoId || params.id;
  const { user } = useAuth();
  
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [eventoInfo, setEventoInfo] = useState(null);
  const [cargaringEvento, setCargandoEvento] = useState(true);

  // Cargar información del evento
  useEffect(() => {
    const cargarEvento = async () => {
      try {
        const evento = await eventosService.getEventoById(eventoId);
        setEventoInfo(evento);
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

  const handleContinuarAlPago = async () => {
    if (!planSeleccionado) {
      setError('Por favor selecciona un plan.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generar QR para el pago de la promoción
      const qrResponse = await eventosService.generarQRPromocion(eventoId, {
        plan: planSeleccionado.id,
        monto: planSeleccionado.precio
      });

      setQrData(qrResponse);
      setModalPagoAbierto(true);
    } catch (err) {
      setError(err.message || 'Error al generar código QR. Intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePagoConfirmado = async (comprobante) => {
    try {
      setLoading(true);
      setError('');

      // Registrar la promoción con el comprobante
      await eventosService.promocionarEvento(eventoId, {
        plan: planSeleccionado.id,
        comprobante: comprobante
      });

      // Mostrar éxito y redirigir o cerrar
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

  if (cargaringEvento) {
    return (
      <div className="promocionar-evento-loading">
        <div className="spinner"></div>
        <p>Cargando información del evento...</p>
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
          ← Volver
        </button>
        <div>
          <h1>🚀 Promociona tu Evento</h1>
          {eventoInfo && <p className="evento-nombre">{eventoInfo.nombre}</p>}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <span>❌ {error}</span>
          <button className="alert-close" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Descripción */}
      <div className="promocionar-description">
        <p>
          Selecciona un plan de promoción para aumentar la visibilidad de tu evento.
          Cada plan incluye beneficios exclusivos para posicionar tu evento en la plataforma.
        </p>
      </div>

      {/* Grid de Planes */}
      <div className="planes-container">
        {PLANES.map(plan => (
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
              <h4>Beneficios incluidos:</h4>
              <ul>
                {plan.beneficios.map((beneficio, idx) => (
                  <li key={idx}>
                    <span className="beneficio-icono">✓</span>
                    <span>{beneficio}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Checkbox de Selección */}
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
        ))}
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
          // Propiedades adicionales si ModalPagoQR las soporta
          onPagoConfirmado={handlePagoConfirmado}
          concepto={`Promoción ${planSeleccionado?.nombre} - Evento #${eventoId}`}
        />
      )}
      </div>
    </div>
  );
}
