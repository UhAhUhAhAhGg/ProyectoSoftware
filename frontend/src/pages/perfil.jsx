import { useState } from "react";
import "./perfil.css";

export default function PerfilPage() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");

  // GUARDAR DATOS
  const handleSubmit = (e) => {
    e.preventDefault();
    setMensaje("✅ Datos actualizados correctamente");
  };

  // ELIMINAR CUENTA
  const handleEliminar = (e) => {
    e.preventDefault();

    const confirmacion = window.confirm(
      "⚠️ ¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer."
    );

    if (confirmacion) {
      setMensaje("❌ Cuenta eliminada correctamente");

      // conectar con backend
      // fetch('/api/delete-user', { method: 'DELETE' })

      // (Opcional futuro)
      // redirigir al login
      // window.location.href = "/login";
    }
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

        {/*BOTÓN ELIMINAR (FUERA DEL FORM para evitar conflictos) */}
        <button className="btn-eliminar" onClick={handleEliminar}>
          Eliminar cuenta
        </button>

        {/*MENSAJE */}
        {mensaje && <p className="mensaje">{mensaje}</p>}

      </div>
    </div>
  );
}
