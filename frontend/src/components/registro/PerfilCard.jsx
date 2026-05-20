import React, { useState } from 'react';
import styles from './Registro.module.css';

const PerfilCard = () => {
  const [mostrarModal, setMostrarModal] = useState(false);

  const [formulario, setFormulario] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'comprador',
  });

  const handleChange = (e) => {
    setFormulario({
      ...formulario,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log('Datos del registro:', formulario);

    alert('Cuenta creada correctamente');

    setMostrarModal(false);

    setFormulario({
      nombre: '',
      email: '',
      password: '',
      rol: 'comprador',
    });
  };

  return (
    <div className={styles.card}>
      <h2>Registro de Usuario</h2>

      <button
        className={styles.openModalBtn}
        onClick={() => setMostrarModal(true)}
      >
        Crear Cuenta
      </button>

      {mostrarModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Crear Nueva Cuenta</h3>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="nombre"
                placeholder="Nombre completo"
                value={formulario.nombre}
                onChange={handleChange}
                required
              />

              <input
                type="email"
                name="email"
                placeholder="Correo electrónico"
                value={formulario.email}
                onChange={handleChange}
                required
              />

              <input
                type="password"
                name="password"
                placeholder="Contraseña"
                value={formulario.password}
                onChange={handleChange}
                required
              />

              <select
                name="rol"
                value={formulario.rol}
                onChange={handleChange}
              >
                <option value="comprador">Comprador</option>
                <option value="promotor">Promotor</option>
              </select>

              <div className={styles.modalButtons}>
                <button type="submit">
                  Registrar
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerfilCard;