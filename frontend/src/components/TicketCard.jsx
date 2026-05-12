// src/components/TicketCard.jsx
import React from 'react';
import './TicketCard.css'; // Importamos los estilos que acabamos de crear

const TicketCard = ({ eventName, ticketType, qrCodeBase64, emergencyCode }) => {
  return (
    <div className="ticket-card">
      <div className="ticket-header">
        <h3>Tu Entrada Digital</h3>
        {/* Opcional: Mostrar el nombre del evento y tipo si los pasas */}
        {eventName && <p style={{ margin: '5px 0 0', fontSize: '0.9rem' }}>{eventName}</p>}
        {ticketType && <small>{ticketType}</small>}
      </div>
      
      <div className="qr-section">
        {/* Renderizamos el QR desde el Base64 que manda el Backend */}
        <img 
          src={`data:image/png;base64,${qrCodeBase64}`} 
          alt="Código QR de Acceso"
          className="qr-code"
        />
        
        {/* Aquí está el requerimiento de la Historia de Usuario */}
        <div className="emergency-code-container">
          <p className="code-label">CÓDIGO ALFANUMÉRICO DE RESPALDO</p>
          <p className="code-value">{emergencyCode}</p>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;