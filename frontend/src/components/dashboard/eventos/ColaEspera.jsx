import { useEffect, useState, useCallback } from 'react';
import './ColaEspera.css';

const QUEUE_URL = process.env.REACT_APP_QUEUE_URL || 'http://localhost:8003';

function ColaEspera({ eventId, queueEntryId, posicionInicial, etaInicial, onAdmitido, onError }) {
  const [posicion, setPosicion] = useState(posicionInicial || '?');
  const [eta, setEta] = useState(etaInicial || '?');
  const [puntos, setPuntos] = useState('');
  const [tiempoEspera, setTiempoEspera] = useState(0); // segundos esperados

  // Animación de puntos suspensivos
  useEffect(() => {
    const interval = setInterval(() => {
      setPuntos((p) => (p.length >= 3 ? '' : p + '.'));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Contador de tiempo en espera
  useEffect(() => {
    const interval = setInterval(() => {
      setTiempoEspera((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Polling: consultar posición en la cola cada 5 segundos
  const consultarPosicion = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || !eventId) return;

    try {
      const res = await fetch(`${QUEUE_URL}/api/v1/queue/${eventId}/enter/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (res.status === 403) {
        // Tiempo expirado
        onError && onError(data.error || 'Tu tiempo en la cola ha expirado.');
        return;
      }

      if (data.queued === false) {
        // ¡Fue admitido!
        onAdmitido && onAdmitido();
        return;
      }

      // Actualizar posición y ETA
      if (data.position !== undefined) setPosicion(data.position);
      if (data.estimated_wait_minutes !== undefined) setEta(data.estimated_wait_minutes);
    } catch (err) {
      console.error('Error consultando la cola:', err);
    }
  }, [eventId, onAdmitido, onError]);

  useEffect(() => {
    // Consultar inmediatamente y luego cada 5 segundos
    consultarPosicion();
    const interval = setInterval(consultarPosicion, 5000);
    return () => clearInterval(interval);
  }, [consultarPosicion]);

  const formatTiempoEspera = (segs) => {
    const m = Math.floor(segs / 60);
    const s = segs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="cola-espera-overlay">
      <div className="cola-espera-card">
        {/* Icono animado */}
        <div className="cola-icono">⏳</div>

        <h2 className="cola-titulo">Estás en la cola de espera</h2>
        <p className="cola-subtitulo">
          Este evento tiene alta demanda en este momento{puntos}
        </p>

        {/* Posición principal */}
        <div className="cola-posicion-wrap">
          <span className="cola-posicion-label">Tu posición</span>
          <span className="cola-posicion-numero">#{posicion}</span>
        </div>

        {/* ETA */}
        <div className="cola-eta">
          <span>⏱ Tiempo estimado de espera:</span>
          <strong> ~{eta} {eta === 1 ? 'minuto' : 'minutos'}</strong>
        </div>

        {/* Barra de progreso visual */}
        <div className="cola-barra-wrap">
          <div className="cola-barra-label">
            <span>Avanzando en la fila</span>
            <span>{formatTiempoEspera(tiempoEspera)} esperando</span>
          </div>
          <div className="cola-barra">
            <div
              className="cola-barra-fill"
              style={{ width: `${Math.min(100, (tiempoEspera / ((eta || 1) * 60)) * 100)}%` }}
            />
          </div>
        </div>

        <p className="cola-aviso">
          🔔 Cuando sea tu turno, esta pantalla desaparecerá automáticamente y podrás seleccionar tus asientos.
        </p>

        <p className="cola-no-cerrar">
          ⚠️ No cierres esta ventana mientras esperas.
        </p>
      </div>
    </div>
  );
}

export default ColaEspera;
