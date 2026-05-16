import { useEffect, useState, useRef } from 'react';
import { useQueue } from '../../../context/QueueContext';
import './ColaEspera.css';

/**
 * Pantalla de cola de espera. Lee el estado del QueueContext (polling global)
 * y permite al usuario:
 *   - Minimizar para navegar por la app (sigue el polling y aparece banner flotante)
 *   - Salir voluntariamente de la cola
 *
 * Muestra un countdown del TIEMPO RESTANTE (no del tiempo esperando).
 * El backend devuelve estimated_wait_seconds basado en accessed_at del usuario
 * actualmente admitido. El frontend lo decrementa cada segundo y se resincroniza
 * en cada poll (cada 5s).
 */
function ColaEspera() {
  const { estadoCola, minimizar, salirDeCola } = useQueue();
  const [puntos, setPuntos] = useState('');
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const initialEtaRef = useRef(0);

  // Animación de puntos suspensivos
  useEffect(() => {
    const interval = setInterval(() => {
      setPuntos((p) => (p.length >= 3 ? '' : p + '.'));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Resincronizar con backend cada vez que llega un poll
  useEffect(() => {
    if (estadoCola?.etaSeconds !== undefined && estadoCola.etaSeconds !== null) {
      setSegundosRestantes(estadoCola.etaSeconds);
      // Guardar el ETA inicial más alto para la barra de progreso
      if (estadoCola.etaSeconds > initialEtaRef.current) {
        initialEtaRef.current = estadoCola.etaSeconds;
      }
    }
  }, [estadoCola?.etaSeconds, estadoCola?.lastUpdate]);

  // Countdown local cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setSegundosRestantes((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!estadoCola || estadoCola.minimizado) return null;

  const posicion = estadoCola.position ?? '?';

  const formatRestante = (segs) => {
    const m = Math.floor(segs / 60);
    const s = segs % 60;
    if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
    return `${s}s`;
  };

  const progresoPorcentaje = initialEtaRef.current > 0
    ? Math.min(100, Math.max(0, ((initialEtaRef.current - segundosRestantes) / initialEtaRef.current) * 100))
    : 0;

  return (
    <div className="cola-espera-overlay">
      <div className="cola-espera-card">
        <div className="cola-icono">⏳</div>

        <h2 className="cola-titulo">Estás en la cola de espera</h2>
        <p className="cola-subtitulo">
          Este evento tiene alta demanda en este momento{puntos}
        </p>

        <div className="cola-posicion-wrap">
          <span className="cola-posicion-label">Tu posición</span>
          <span className="cola-posicion-numero">#{posicion}</span>
        </div>

        <div className="cola-eta">
          <span>⏱ Tiempo restante para tu turno:</span>
          <strong> {segundosRestantes > 0 ? formatRestante(segundosRestantes) : '¡Preparando tu acceso! 🎉'}</strong>
        </div>

        <div className="cola-barra-wrap">
          <div className="cola-barra-label">
            <span>Avanzando en la fila</span>
            <span>{progresoPorcentaje.toFixed(0)}%</span>
          </div>
          <div className="cola-barra">
            <div
              className="cola-barra-fill"
              style={{ width: `${progresoPorcentaje}%` }}
            />
          </div>
        </div>

        <p className="cola-aviso">
          🔔 Cuando sea tu turno, esta pantalla aparecerá automáticamente y podrás seleccionar tus asientos.
        </p>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={minimizar}
            style={{
              padding: '10px 18px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            📥 Minimizar y navegar
          </button>
          <button
            onClick={() => {
              if (window.confirm('¿Seguro que quieres salir de la cola? Perderás tu posición.')) {
                salirDeCola();
              }
            }}
            style={{
              padding: '10px 18px',
              background: '#64748b',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            🚪 Salir de la cola
          </button>
        </div>
      </div>
    </div>
  );
}

export default ColaEspera;
