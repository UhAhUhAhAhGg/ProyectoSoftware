import React, { useEffect } from 'react';
import './SeatMap.css';
import SeatMap from './SeatMap';

export default function SeatMapModal({ open, onClose, eventId, ticketType, onConfirm }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && open) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="seatmap-modal-overlay" role="dialog" aria-modal="true">
      <div className="seatmap-modal" role="document">
        <div className="seatmap-modal-header">
          <h3>Selecciona tus plazas</h3>
          <button className="btn modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="seatmap-modal-body">
          <SeatMap
            eventId={eventId}
            ticketType={ticketType}
            onConfirm={(sel) => onConfirm && onConfirm(sel)}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
