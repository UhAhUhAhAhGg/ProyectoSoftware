"use client";

export default function QueueStatus() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "24px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#f5f5f5",
          padding: "24px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          maxWidth: "420px",
          width: "100%",
        }}
      >
        <h2 style={{ marginBottom: "10px" }}>
          Fila virtual de espera
        </h2>

        <p style={{ color: "#555", marginBottom: "20px" }}>
          Estamos procesando tu acceso...
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontSize: "16px",
          }}
        >
          <p>
            <strong>Posición en cola:</strong> <span>--</span>
          </p>

          <p>
            <strong>Tiempo estimado:</strong> <span>-- minutos</span>
          </p>
        </div>

        <div
          style={{
            marginTop: "20px",
            fontSize: "14px",
            color: "#888",
          }}
        >
          Por favor, no cierres esta ventana
        </div>
      </div>
    </div>
  );
}
