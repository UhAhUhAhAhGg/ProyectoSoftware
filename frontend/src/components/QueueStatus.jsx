"use client";

export default function QueueStatus() {
  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>Fila virtual de espera</h2>
      <p>Estamos procesando tu acceso...</p>

      <p><strong>Posición en cola:</strong> --</p>
      <p><strong>Tiempo estimado:</strong> -- minutos</p>
    </div>
  );
}
