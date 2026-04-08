import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useNavigate, useParams } from 'react-router-dom';
import { eventosService } from '../../../services/eventosService';
import { useAuth } from '../../../context/AuthContext';
import GestionTiposEntrada from './GestionTiposEntrada';
import VenueLayoutPreview from './VenueLayoutPreview';
import './FormularioEvento.css';

function FormularioEvento() {
  const { id } = useParams(); // Si hay ID, es edición
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    fecha: '',
    hora: '',
    ubicacion: '',
    direccion: '',
    ciudad: '',
    capacidad: '',
    imagen: null
  });

  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const mostrarPreviewRef = useRef(mostrarPreview);
  mostrarPreviewRef.current = mostrarPreview;
  const [imagePreviewUrl, setImagePreviewUrl] = useState('https://via.placeholder.com/300x200?text=Evento');
  const [previewTickets, setPreviewTickets] = useState([]);
  const [nuevosTiposEntrada, setNuevosTiposEntrada] = useState([]);

  const handleTiposChange = useCallback((tipos) => {
    if (!isEditing) {
      setNuevosTiposEntrada(tipos);
    }
    if (mostrarPreviewRef.current) {
      setPreviewTickets(tipos.filter(t => t.estado === 'activo'));
    }
  }, [isEditing]);

  // Cargar preview cuando la imagen cambia
  useEffect(() => {
    if (!formData.imagen) {
        setImagePreviewUrl('https://via.placeholder.com/300x200?text=Evento');
        return;
    }
    if (typeof formData.imagen === 'string') {
        setImagePreviewUrl(formData.imagen);
        return;
    }
    if (formData.imagen instanceof File) {
        const objectUrl = URL.createObjectURL(formData.imagen);
        setImagePreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }
  }, [formData.imagen]);

  const [categorias, setCategorias] = useState([]);

  const previewTicketList = isEditing ? previewTickets : nuevosTiposEntrada;

  const getZoneLabel = (tipoZona) => {
    const labels = {
      general: 'General',
      platea: 'Platea',
      preferencial: 'Preferencial',
      vip: 'VIP',
      palco: 'Palco',
    };

    return labels[tipoZona] || tipoZona || 'Zona';
  };

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const cats = await eventosService.getCategorias();
        setCategorias(cats || []);
      } catch (error) {
        console.error("Error al cargar categorías:", error);
      }

      if (isEditing) {
        const evento = await eventosService.getEventoById(id);
        if (evento) {
          // Asegurarnos de que el select apunte al ID correcto si el backend devuelve un objeto
          const catId = typeof evento.categoria === 'object' && evento.categoria !== null ? evento.categoria.id : evento.categoria;
          setFormData(prev => ({ ...prev, ...evento, categoria: catId || '' }));
        } else {
          navigate('/dashboard/mis-eventos');
        }
      }
    };
    cargarDatos();
  }, [id, isEditing, navigate]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData({
        ...formData,
        [name]: files[0]
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
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

    // Validar categoria
    if (!formData.categoria) {
      nuevosErrores.categoria = 'La categoría es requerida';
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

    return nuevosErrores;
  };

  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const nuevosErrores = validarFormulario();
    
    if (Object.keys(nuevosErrores).length === 0) {
      setCargando(true);
      try {
        let datosAGuardar = { ...formData };
        if (formData.imagen instanceof File) {
          datosAGuardar.imagen = await getBase64(formData.imagen);
        }
        delete datosAGuardar.tiposEntrada;

        if (isEditing) {
          await eventosService.actualizarEvento(id, datosAGuardar);
          alert('✅ Evento actualizado exitosamente');
        } else {
          const eventoCreado = await eventosService.crearEvento(datosAGuardar, user.id);
          // Crear tipos de entrada asociados
          for (const tipo of nuevosTiposEntrada) {
            const tipoLimpio = { ...tipo };
            delete tipoLimpio.id;
            await eventosService.crearTipoEntrada(eventoCreado.id, tipoLimpio);
          }
          alert('✅ Evento creado exitosamente');
        }
        navigate('/dashboard/mis-eventos');
      } catch (error) {
        alert('Error al guardar el evento: ' + (error.message || ''));
      } finally {
        setCargando(false);
      }
    } else {
      setErrores(nuevosErrores);
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

            <div className="form-group">
              <label htmlFor="imagen">
                Imagen del Evento (Opcional)
              </label>
              <input
                type="file"
                id="imagen"
                name="imagen"
                onChange={handleChange}
                accept="image/*"
              />
            </div>
          </div>

          {/* Columna derecha */}
          <div className="form-columna">
            <div className="form-group">
              <label htmlFor="categoria">
                Categoría <span className="required">*</span>
              </label>
              <select
                id="categoria"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                className={errores.categoria ? 'error' : ''}
                style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem', background: '#f9f9f9', color: '#555' }}
              >
                <option value="">Selecciona una categoría</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {errores.categoria && <span className="error-mensaje">{errores.categoria}</span>}
            </div>

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
            </div>
          </div>
        </div>

        {/* Preview opcional */}
        <div className="form-preview">
          <button 
            type="button"
            className="btn-preview"
            onClick={async () => {
              setMostrarPreview(!mostrarPreview);
              if (!mostrarPreview && isEditing) {
                const tipos = await eventosService.getTiposEntradaByEvento(id);
                setPreviewTickets(tipos.filter(t => t.estado === 'activo') || []);
              }
            }}
          >
            {mostrarPreview ? '👁️ Ocultar vista previa' : '👁️ Ver vista previa'}
          </button>

          {mostrarPreview && (
            <div className="preview-card">
              <h3>Vista previa del evento</h3>
              <div className="preview-content">
                <div className="preview-image-wrapper">
                  <Image
                    src={imagePreviewUrl}
                    alt={formData.nombre || 'Vista previa'}
                    width={1200}
                    height={350}
                    unoptimized
                    className="preview-image"
                  />
                </div>
                <div className="preview-header">
                  <h4>{formData.nombre || 'Nombre del evento'}</h4>
                  <span className="preview-badge">Próximo</span>
                </div>
                {formData.categoria && (
                  <div style={{ display: 'inline-block', background: '#e0e0e0', color: '#333', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '10px' }}>
                    🏷️ {formData.categoria}
                  </div>
                )}
                <p className="preview-descripcion">
                  {formData.descripcion || 'Descripción del evento...'}
                </p>
                <div className="preview-detalles">
                  <p>📅 {formData.fecha ? new Date(formData.fecha).toLocaleDateString('es-ES') : 'Fecha'}</p>
                  <p>⏰ {formData.hora || 'Hora'}</p>
                  <p>📍 {formData.ubicacion || 'Ubicación'}</p>
                  <p>🏙️ {formData.ciudad || 'Ciudad'}</p>
                </div>
                <div className="preview-footer" style={{ borderTop: "1px solid #eee", paddingTop: "15px", marginTop: "15px" }}>
                  <div className="preview-capacidad" style={{ textAlign: "right", color: "gray", fontSize: "14px", marginBottom: "10px" }}>Capacidad: {formData.capacidad || '0'}</div>
                  {previewTicketList.length > 0 ? (
                    <div className="preview-tickets-list">
                      <h5 style={{ margin: '0 0 10px 0', color: '#666' }}>Zonas y precios</h5>
                      {previewTicketList.map(t => (
                        <div key={t.id} className="preview-zone-card">
                          <div>
                            <span style={{ fontWeight: 'bold' }}>{t.nombre}</span>
                            <div className="preview-zone-meta">
                              <span>{getZoneLabel(t.tipoZona)}</span>
                              {t.esVIP && <span>VIP</span>}
                              <span>{t.filas || 0} x {t.asientosPorFila || 0}</span>
                            </div>
                          </div>
                          <span style={{ color: 'var(--color-marron)', fontWeight: 'bold' }}>${t.precio}</span>
                        </div>
                      ))}
                      <VenueLayoutPreview
                        tiposEntrada={previewTicketList}
                        capacidadTotal={formData.capacidad}
                        titulo="Distribucion visual del recinto"
                        subtitulo="Confirma que la relacion entre zonas, cupos y precios refleja tu estrategia de monetizacion."
                        compact
                      />
                    </div>
                  ) : (
                    <div style={{ fontStyle: "italic", color: "#999", fontSize: "14px" }}>No hay entradas definidas aún. Guarda el evento para agregarlas.</div>
                  )}
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

      {/* Render GestionTiposEntrada siempre */}
      <div style={{ marginTop: '40px' }}>
        <hr />
        <h2 style={{ padding: '20px 0' }}>Gestión de Tipos de Entradas</h2>
        <GestionTiposEntrada 
           eventoId={isEditing ? id : null} 
           evento={formData} 
           onChange={handleTiposChange}
        />
      </div>
    </div>
  );
}

export default FormularioEvento;