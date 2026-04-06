import React from "react";
import "./TicketView.css";

const TicketView = ({ ticket }) => {
  if (!ticket) return null;

  return (
    <div className="ticket-container">
      <h2>🎉 Pago exitoso</h2>
      <p>Tu entrada ha sido generada</p>

      <div className="ticket-box">
        <img src={ticket.qr} alt="QR" className="qr" />

        <p><strong>Código:</strong> {ticket.codigo}</p>

        <a href={ticket.pdf} target="_blank" rel="noreferrer">
          Descargar PDF
        </a>
      </div>
    </div>
  );
};

export default TicketView;

