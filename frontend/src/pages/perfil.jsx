import { useState } from "react";
import { Link } from 'react-router-dom';
import "./perfil.css";

export default function PerfilPage() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [foto, setFoto] = useState(null);

  // GUARDAR DATOS
  const handleSubmit = (e) => {
    e.preventDefault();
    setMensaje("✅ Datos actualizados correctamente");
  };

  // SUBIR FOTO
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFoto(URL.createObjectURL(file));
    }
  };

  // ELIMINAR CUENTA
  const handleEliminar = (e) => {
    e.preventDefault();

    const confirmacion = window.confirm(
      "⚠️ ¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer."
    );

    if (confirmacion) {
      setMensaje("❌ Cuenta eliminada correctamente");

      // Simulación de espera antes de redirigir
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    }
  };

  return (
    <div className="perfil-container">
      <div className="perfil-box">
        <Link to="/dashboard" className="perfil-back-link">← Volver al dashboard</Link>

        <h1>Mi Perfil</h1>

        {/* 🖼 FOTO DE PERFIL */}
        <div className="foto-container">
          <label htmlFor="fotoInput">
            <img
              src={foto || "https://via.placeholder.com/150"}
              alt="Foto de perfil"
              className="foto-perfil"
            />
          </label>
          <input
            id="fotoInput"
            type="file"
            accept="image/*"
            onChange={handleFotoChange}
            hidden
          />
          <p className="foto-texto">Haz clic para cambiar tu foto</p>
        </div>

        {/* FORMULARIO */}
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

          <button type="submit">Guardar cambios</button>

        </form>

        {/* 🔥 ZONA PELIGROSA */}
        <div className="danger-zone">

          <h3>⚠ Zona de riesgo</h3>

          <p>
            Si eliminas tu cuenta, perderás todos tus datos, eventos y accesos.
            Esta acción no se puede deshacer.
          </p>

          <button className="btn-eliminar" onClick={handleEliminar}>
            Eliminar cuenta
          </button>

        </div>

        {/* MENSAJE */}
        {mensaje && <p className="mensaje">{mensaje}</p>}

      </div>
    </div>
  );
}
