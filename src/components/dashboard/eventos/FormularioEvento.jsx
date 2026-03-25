import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { eventosService } from '../../../services/eventosService';
import { useAuth } from '../../../context/AuthContext';
import GestionTiposEntrada from './GestionTiposEntrada';
import './FormularioEvento.css';

function FormularioEvento() {
  const { id } = useParams(); // Si hay ID, es edición
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    fecha: '',
    hora: '',
    ubicacion: '',
    direccion: '',
    ciudad: '',
    capacidad: '',
    precio: '',
    imagen: 'https://via.placeholder.com/300x200?text=Evento'
  });

  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  // Cargar datos si es edición
  useEffect(() => {
    if (isEditing) {
      const evento = eventosService.getEventoById(id);
      if (evento) {
        setFormData(evento);
      } else {
        navigate('/dashboard/mis-eventos');
      }
    }
  }, [id, isEditing, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Limpiar error del campo
    if (errores[name]) {
      setErrores({
        ...errores,
        [name]: ''
      });
    }
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    // Validar nombre
    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre del evento es requerido';
    } else if (formData.nombre.length < 5) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 5 caracteres';
    }

    // Validar descripción
    if (!formData.descripcion.trim()) {
      nuevosErrores.descripcion = 'La descripción es requerida';
    } else if (formData.descripcion.length < 20) {
      nuevosErrores.descripcion = 'La descripción debe tener al menos 20 caracteres';
    }

    // Validar fecha
    if (!formData.fecha) {
      nuevosErrores.fecha = 'La fecha es requerida';
    } else {
      const fechaSeleccionada = new Date(formData.fecha);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fechaSeleccionada < hoy) {
        nuevosErrores.fecha = 'La fecha no puede ser en el pasado';
      }
    }

    // Validar hora
    if (!formData.hora) {
      nuevosErrores.hora = 'La hora es requerida';
    }

    // Validar ubicación
    if (!formData.ubicacion.trim()) {
      nuevosErrores.ubicacion = 'La ubicación es requerida';
    }

    // Validar dirección
    if (!formData.direccion.trim()) {
      nuevosErrores.direccion = 'La dirección es requerida';
    }

    // Validar ciudad
    if (!formData.ciudad.trim()) {
      nuevosErrores.ciudad = 'La ciudad es requerida';
    }

    // Validar capacidad
    if (!formData.capacidad) {
      nuevosErrores.capacidad = 'La capacidad es requerida';
    } else if (parseInt(formData.capacidad) < 10) {
      nuevosErrores.capacidad = 'La capacidad mínima es 10 personas';
    } else if (parseInt(formData.capacidad) > 10000) {
      nuevosErrores.capacidad = 'La capacidad máxima es 10,000 personas';
    }

    // Validar precio
    if (!formData.precio) {
      nuevosErrores.precio = 'El precio es requerido';
    } else if (parseInt(formData.precio) < 0) {
      nuevosErrores.precio = 'El precio no puede ser negativo';
    } else if (parseInt(formData.precio) > 100000) {
      nuevosErrores.precio = 'El precio máximo es $100,000';
    }

    return nuevosErrores;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const nuevosErrores = validarFormulario();
    
    if (Object.keys(nuevosErrores).length === 0) {
      setCargando(true);
      
      // Simular envío
      setTimeout(() => {
        try {
          if (isEditing) {
            eventosService.actualizarEvento(id, formData);
            alert('✅ Evento actualizado exitosamente');
          } else {
            eventosService.crearEvento(formData, user.id);
            alert('✅ Evento creado exitosamente');
          }
          navigate('/dashboard/mis-eventos');
        } catch (error) {
          alert('Error al guardar el evento');
        } finally {
          setCargando(false);
        }
      }, 1000);
    } else {
      setErrores(nuevosErrores);
      // Scroll al primer error
      const primerError = document.querySelector('.error-mensaje');
      if (primerError) {
        primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleCancelar = () => {
    navigate('/dashboard/mis-eventos');
  };

  return (
    <div className="formulario-evento-container">
      <div className="formulario-header">
        <h2>{isEditing ? 'Editar Evento' : 'Crear Nuevo Evento'}</h2>
        <p className="formulario-subtitulo">
          {isEditing 
            ? 'Actualiza la información de tu evento' 
            : 'Completa los datos para publicar tu evento'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="formulario-evento">
        <div className="formulario-grid">
          {/* Columna izquierda */}
          <div className="form-columna">
            <div className="form-group">
              <label htmlFor="nombre">
                Nombre del Evento <span className="required">*</span>
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej: Concierto de Rock, Festival de Jazz, etc."
                className={errores.nombre ? 'error' : ''}
                maxLength="100"
              />
              {errores.nombre && <span className="error-mensaje">{errores.nombre}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="descripcion">
                Descripción <span className="required">*</span>
              </label>
              <textarea
                id="descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                placeholder="Describe tu evento, artistas, actividades, etc."
                rows="5"
                className={errores.descripcion ? 'error' : ''}
                maxLength="500"
              />
              <div className="campo-contador">
                {formData.descripcion.length}/500 caracteres
              </div>
              {errores.descripcion && <span className="error-mensaje">{errores.descripcion}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fecha">
                  Fecha <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="fecha"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleChange}
                  className={errores.fecha ? 'error' : ''}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errores.fecha && <span className="error-mensaje">{errores.fecha}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="hora">
                  Hora <span className="required">*</span>
                </label>
                <input
                  type="time"
                  id="hora"
                  name="hora"
                  value={formData.hora}
                  onChange={handleChange}
                  className={errores.hora ? 'error' : ''}
                />
                {errores.hora && <span className="error-mensaje">{errores.hora}</span>}
              </div>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="form-columna">
            <div className="form-group">
              <label htmlFor="ubicacion">
                Ubicación <span className="required">*</span>
              </label>
              <input
                type="text"
                id="ubicacion"
                name="ubicacion"
                value={formData.ubicacion}
                onChange={handleChange}
                placeholder="Ej: Estadio Centenario, Teatro Colón"
                className={errores.ubicacion ? 'error' : ''}
              />
              {errores.ubicacion && <span className="error-mensaje">{errores.ubicacion}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="direccion">
                Dirección <span className="required">*</span>
              </label>
              <input
                type="text"
                id="direccion"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                placeholder="Ej: Av. Siempre Viva 123"
                className={errores.direccion ? 'error' : ''}
              />
              {errores.direccion && <span className="error-mensaje">{errores.direccion}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="ciudad">
                Ciudad <span className="required">*</span>
              </label>
              <input
                type="text"
                id="ciudad"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleChange}
                placeholder="Ej: Buenos Aires, Córdoba"
                className={errores.ciudad ? 'error' : ''}
              />
              {errores.ciudad && <span className="error-mensaje">{errores.ciudad}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="capacidad">
                  Capacidad <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="capacidad"
                  name="capacidad"
                  value={formData.capacidad}
                  onChange={handleChange}
                  placeholder="Ej: 500"
                  min="10"
                  max="10000"
                  className={errores.capacidad ? 'error' : ''}
                />
                {errores.capacidad && <span className="error-mensaje">{errores.capacidad}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="precio">
                  Precio ($) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="precio"
                  name="precio"
                  value={formData.precio}
                  onChange={handleChange}
                  placeholder="Ej: 2500"
                  min="0"
                  max="100000"
                  className={errores.precio ? 'error' : ''}
                />
                {errores.precio && <span className="error-mensaje">{errores.precio}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Preview opcional */}
        <div className="form-preview">
          <button 
            type="button"
            className="btn-preview"
            onClick={() => setMostrarPreview(!mostrarPreview)}
          >
            {mostrarPreview ? '👁️ Ocultar vista previa' : '👁️ Ver vista previa'}
          </button>

          {mostrarPreview && (
            <div className="preview-card">
              <h3>Vista previa del evento</h3>
              <div className="preview-content">
                <div className="preview-header">
                  <h4>{formData.nombre || 'Nombre del evento'}</h4>
                  <span className="preview-badge">Próximo</span>
                </div>
                <p className="preview-descripcion">
                  {formData.descripcion || 'Descripción del evento...'}
                </p>
                <div className="preview-detalles">
                  <p>📅 {formData.fecha ? new Date(formData.fecha).toLocaleDateString('es-ES') : 'Fecha'}</p>
                  <p>⏰ {formData.hora || 'Hora'}</p>
                  <p>📍 {formData.ubicacion || 'Ubicación'}</p>
                  <p>🏙️ {formData.ciudad || 'Ciudad'}</p>
                </div>
                <div className="preview-footer">
                  <span className="preview-precio">${formData.precio || '0'}</span>
                  <span className="preview-capacidad">Capacidad: {formData.capacidad || '0'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Campos requeridos note */}
        <div className="campos-requeridos-note">
          <span className="required">*</span> Campos requeridos
        </div>

        {/* Botones de acción */}
        <div className="form-acciones">
          <button 
            type="button" 
            className="btn-cancelar-form"
            onClick={handleCancelar}
            disabled={cargando}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn-guardar"
            disabled={cargando}
          >
            {cargando ? (
              <>
                <span className="spinner-small"></span>
                {isEditing ? 'Actualizando...' : 'Creando...'}
              </>
            ) : (
              isEditing ? 'Actualizar Evento' : 'Crear Evento'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FormularioEvento;