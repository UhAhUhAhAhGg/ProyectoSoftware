import { Link } from 'react-router-dom';
import './CuentaEliminada.css';

function CuentaEliminada() {
  return (
    <section className="cuenta-eliminada-page">
      <div className="cuenta-eliminada-card">
        <div className="icono">✅</div>
        <h2>Tu cuenta fue eliminada correctamente</h2>
        <p>
          Tus datos fueron retirados de la plataforma según tu solicitud. Si deseas
          volver, deberás registrarte nuevamente.
        </p>

        <div className="acciones">
          <Link to="/" className="btn-principal">Ir al inicio</Link>
          <Link to="/registro" className="btn-secundario">Crear una nueva cuenta</Link>
        </div>
      </div>
    </section>
  );
}

export default CuentaEliminada;
