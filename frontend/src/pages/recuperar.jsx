import './recuperar.css';
import { useState } from "react";

export default function RecuperarPassword() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Se enviaron instrucciones a: " + email);
  };

  return (
    <div className="recuperar-container">

      <div className="recuperar-box">

        <h1>Recuperar Contraseña</h1>
        <p className="subtexto">
          Ingresa tu correo electrónico y te enviaremos instrucciones
        </p>

        <form onSubmit={handleSubmit}>
          
          <label>Correo Electrónico</label>
          <input
            type="email"
            placeholder="ejemplo@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit">Enviar enlace</button>
        </form>

        <div className="links">
          <a href="/login">Volver al login</a>
        </div>

      </div>

    </div>
  );
}