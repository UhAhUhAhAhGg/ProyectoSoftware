import React, { useState, useEffect } from "react";
import "./TicketView.css";

const TicketView = ({ ticket }) => {
  const [tiempoRestante, setTiempoRestante] = useState(120); // 2 minutos

  useEffect(() => {
    if (tiempoRestante <= 0) return;

    const intervalo = setInterval(() => {
      setTiempoRestante((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalo);
  }, [tiempoRestante]);

  const minutos = Math.floor(tiempoRestante / 60);
  const segundos = tiempoRestante % 60;

  if (!ticket) return null;

  return (
    <div className="ticket-container">
      <h2>🎉 Pago exitoso</h2>
      <p>Tu entrada ha sido generada</p>

      <p className="temporizador">
        ⏳ Tiempo restante: {minutos}:{segundos < 10 ? `0${segundos}` : segundos}
      </p>

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

