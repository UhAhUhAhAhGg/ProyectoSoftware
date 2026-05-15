import React, { useEffect, useState } from 'react';
import './SeatMap.css';
import SeatMap from './SeatMap';
import { useQueue } from '../../context/QueueContext';
import ConfirmDialog from '../common/ConfirmDialog';

const QUEUE_URL = process.env.REACT_APP_QUEUE_URL || 'http://localhost:8003';

export default function SeatMapModal({ open, onClose, eventId, ticketType, onConfirm, initialDeadline, onDeadlineResolved, initialSelected, hayColaActiva }) {
  const { fueAdmitidoPorCola } = useQueue();
  const [deadline, setDeadline] = useState(initialDeadline || null); // Date | null
  const [segundosRestantes, setSegundosRestantes] = useState(null);
  const [expirado, setExpirado] = useState(false); // Mostrar overlay de expiración
  const [mostrarConfirm, setMostrarConfirm] = useState(false); // Diálogo de confirmación

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && open && !expirado) handleClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, expirado]);

  // Si nos pasan un deadline externo (ej: volver atrás desde QR), usarlo directamente
  useEffect(() => {
    if (initialDeadline) {
      setDeadline(initialDeadline);
    }
  }, [initialDeadline]);

  // Al abrir, obtener accessed_at + payment_timeout para calcular deadline
  // Solo si NO tenemos un deadline inicial ya proporcionado
  useEffect(() => {
    if (!open || !eventId || initialDeadline) return;
    let cancelled = false;
    (async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(`${QUEUE_URL}/api/v1/queue/${eventId}/position/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.accessed_at) {
          // Obtener el payment_timeout del config
          const cfgRes = await fetch(`${QUEUE_URL}/api/v1/queue-config/${eventId}/`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          let timeoutMin = 15;
          if (cfgRes.ok) {
            const cfg = await cfgRes.json();
            timeoutMin = cfg.data?.payment_timeout_minutes ?? cfg.payment_timeout_minutes ?? 15;
          }
          const accessedAt = new Date(data.accessed_at);
          const dl = new Date(accessedAt.getTime() + timeoutMin * 60 * 1000);
          setDeadline(dl);
          // Notificar al padre para que pueda reusar el deadline si el usuario vuelve atrás
          if (onDeadlineResolved) onDeadlineResolved(dl);
        }
      } catch { /* ignorar */ }
    })();
    return () => { cancelled = true; };
  }, [open, eventId, initialDeadline, onDeadlineResolved]);

  // Countdown
  useEffect(() => {
    if (!deadline || expirado) return;
    const tick = () => {
      const secs = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000));
      setSegundosRestantes(secs);
      if (secs === 0) {
        // Tiempo agotado — mostrar overlay de expiración en vez de cerrar silenciosamente
        setExpirado(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, expirado]);

  // Cerrar con advertencia si hay cola
  const handleClose = () => {
    if (hayColaActiva || fueAdmitidoPorCola) {
      setMostrarConfirm(true);
      return;
    }
    onClose && onClose();
  };

  const confirmarSalida = () => {
    setMostrarConfirm(false);
    onClose && onClose();
  };

  if (!open) return null;

  const formatTiempo = (segs) => {
    if (segs === null) return '--:--';
    const m = Math.floor(segs / 60);
    const s = segs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const timerColor = segundosRestantes !== null && segundosRestantes < 30 ? '#dc2626' : '#1f2937';

  return (
    <div className="seatmap-modal-overlay" role="dialog" aria-modal="true">
      <div className="seatmap-modal" role="document">

        {/* Overlay de expiración */}
        {expirado && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 10,
            borderRadius: 'inherit',
          }}>
            <div style={{
              background: '#f8d7da', color: '#721c24', padding: '30px',
              borderRadius: '14px', textAlign: 'center', maxWidth: '380px',
              width: '85%', border: '1px solid #f5c6cb',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 8 }}>❌</div>
              <h2 style={{ margin: '0 0 8px 0' }}>Tiempo Agotado</h2>
              <p style={{ marginBottom: '15px', fontSize: '0.95rem' }}>
                El tiempo para seleccionar asientos y completar el pago ha expirado.
                Los asientos han sido liberados.
              </p>
              <button
                onClick={() => { setExpirado(false); onClose && onClose(); }}
                style={{
                  padding: '10px 20px', background: '#dc3545', color: 'white',
                  border: 'none', borderRadius: 6, cursor: 'pointer', width: '100%',
                  fontSize: '1rem', fontWeight: 'bold',
                }}
              >
                Volver al evento
              </button>
            </div>
          </div>
        )}

        <div className="seatmap-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Selecciona tus plazas</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {segundosRestantes !== null && (
              <div style={{
                background: '#fef3c7',
                color: timerColor,
                padding: '6px 12px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: `2px solid ${timerColor}`,
              }}>
                ⏱ {formatTiempo(segundosRestantes)}
              </div>
            )}
            <button className="btn modal-close" onClick={handleClose} aria-label="Cerrar">×</button>
          </div>
        </div>
        <div className="seatmap-modal-body">
          <SeatMap
            eventId={eventId}
            ticketType={ticketType}
            initialSelected={initialSelected}
            onConfirm={(sel) => onConfirm && onConfirm(sel)}
            onCancel={handleClose}
          />
        </div>
      </div>

      {/* Diálogo de confirmación bonito */}
      <ConfirmDialog
        open={mostrarConfirm}
        icono="🚪"
        titulo="¿Salir de la selección?"
        mensaje="Hay una cola de espera activa para este evento. Si sales ahora, perderás tu turno y tendrás que volver a hacer cola."
        textoConfirmar="Sí, salir"
        textoCancelar="Seguir comprando"
        onConfirm={confirmarSalida}
        onCancel={() => setMostrarConfirm(false)}
      />
    </div>
  );
}
