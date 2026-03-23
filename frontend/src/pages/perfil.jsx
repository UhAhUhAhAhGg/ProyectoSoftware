import { useState } from "react";
import "./perfil.css";

export default function PerfilPage() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // aquí luego irá backend, por ahora solo mostramos mensaje
    setMensaje("✅ Datos actualizados correctamente");
  };

  return (
    <div className="perfil-container">
      <div className="perfil-box">

        <h1>Mi Perfil</h1>

        <form onSubmit={handleSubmit}>

          <label>Nombre</label>
          <input
            type="text"
            placeholder="Tu nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <label>Teléfono</label>
          <input
            type="text"
            placeholder="Tu teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />

          <label>Foto (URL)</label>
          <input
            type="text"
            placeholder="URL de tu foto"
          />

          <button type="submit">Guardar cambios</button>

        </form>

        {/* 🔥 MENSAJE */}
        {mensaje && <p className="mensaje">{mensaje}</p>}

      </div>
    </div>
  );
}