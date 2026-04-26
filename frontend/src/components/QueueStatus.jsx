"use client";
import { useEffect, useState, useRef } from "react";

export default function QueueStatus() {
  const [position, setPosition] = useState(120);
  const [progress, setProgress] = useState(0);

  const prevPosition = useRef(position);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/notification.mp3");
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition((prev) => (prev > 1 ? prev - 1 : 1));
      setProgress((prev) => (prev < 100 ? prev + 2 : 100));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // 🔥 AQUÍ detectamos salida de cola
  useEffect(() => {
    if (prevPosition.current > 1 && position === 1) {
      // sonido
      audioRef.current?.play();

      // notificación visual
      alert("🎉 ¡Es tu turno!");
    }

    prevPosition.current = position;
  }, [position]);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>🎟️ Fila virtual de espera</h2>
      <p>Estamos procesando tu acceso...</p>

      <p><strong>Posición en cola:</strong> {position}</p>
      <p><strong>Tiempo estimado:</strong> {Math.ceil(position / 20)} min</p>

      <div style={{
        width: "100%",
        height: "20px",
        background: "#eee",
        borderRadius: "10px",
        marginTop: "20px",
        overflow: "hidden"
      }}>
        <div style={{
          width: `${progress}%`,
          height: "100%",
          background: "#4caf50",
          transition: "width 0.5s"
        }} />
      </div>

      <p style={{ marginTop: "10px" }}>{progress}% completado</p>
    </div>
  );
}
