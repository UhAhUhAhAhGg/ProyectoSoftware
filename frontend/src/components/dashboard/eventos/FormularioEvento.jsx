import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useNavigate, useParams } from 'react-router-dom';
import { eventosService } from '../../../services/eventosService';
import { adminEventsService } from '../../../services/adminEventsService';
import { useAuth } from '../../../context/AuthContext';
import GestionTiposEntrada from './GestionTiposEntrada';
import VenueLayoutPreview from './VenueLayoutPreview';
import './FormularioEvento.css';

// adminMode=true: el SuperAdmin/Admin edita un evento de cualquier promotor.
// Reusa todo el formulario del promotor y agrega secciones administrativas
// (Control Administrativo, Notas) abajo, antes del Gestor de Tipos de Entrada.
function FormularioEvento({ adminMode = false }) {
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
    imagen: null,
    // Campos visibles solo en adminMode
    status: 'published',
    admin_reason: '',
  });

  const STATUS_OPTIONS = [
    { value: 'draft', label: 'Borrador', icon: '📝' },
    { value: 'published', label: 'Activo', icon: '✓' },
    { value: 'cancelled', label: 'Dado de baja', icon: '🚫' },
    { value: 'completed', label: 'Finalizado', icon: '✓' },
  ];

  // Layout en tabs: 'info' = datos del evento, 'zonas' = tipos de entrada,
  // 'admin' = solo visible cuando adminMode && isEditing
  const [activeTab, setActiveTab] = useState('info');

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
          // Mapear estado interno (español) → status backend (inglés) para el selector admin
          const ESTADO_TO_STATUS = {
            borrador: 'draft',
            activo: 'published',
            cancelado: 'cancelled',
            finalizado: 'completed',
          };
          const statusBack = ESTADO_TO_STATUS[evento.estado] || evento.estado || 'published';
          setFormData(prev => ({
            ...prev,
            ...evento,
            categoria: catId || '',
            status: statusBack,
          }));
        } else {
          navigate(adminMode ? '/admin/dashboard' : '/dashboard/mis-eventos');
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
          if (adminMode) {
            // Admin: usar endpoint administrativo /admin/events/{id}/
            // que admite cambiar status y registra la accion en EventAuditLog
            await adminEventsService.editEvent(id, {
              name: datosAGuardar.nombre,
              description: datosAGuardar.descripcion,
              event_date: datosAGuardar.fecha,
              event_time: datosAGuardar.hora,
              location: datosAGuardar.ubicacion,
              capacity: datosAGuardar.capacidad,
              category: datosAGuardar.categoria || undefined,
              status: datosAGuardar.status,
              admin_reason: datosAGuardar.admin_reason || 'Modificación administrativa',
            });
            alert('✅ Evento actualizado correctamente (modo administrador)');
          } else {
            await eventosService.actualizarEvento(id, datosAGuardar);
            alert('✅ Evento actualizado exitosamente');
          }
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
        // En adminMode el destino /admin/dashboard vive en Next.js App Router,
        // asi que navigate() de react-router no basta — forzamos full reload.
        if (adminMode) {
          window.location.href = '/admin/dashboard';
        } else {
          navigate('/dashboard/mis-eventos');
        }
      } catch (error) {
        alert('Error al guardar el evento: ' + (error.message || ''));
      } finally {
        setCargando(false);
      }
    } else {
      setErrores(nuevosErrores);
      // Todos los errores conocidos hoy viven en la tab 'info'. Si en el
      // futuro hay errores de la tab admin, hay que mover el cursor alli.
      setActiveTab('info');
      // Esperar al render del tab para que el scrollIntoView funcione
      setTimeout(() => {
        const primerError = document.querySelector('.error-mensaje');
        if (primerError) {
          primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 80);
    }
  };

  // Lista de campos de error por tab, para mostrar badge rojo si la tab
  // tiene problemas pendientes.
  const TAB_FIELDS = {
    info: ['nombre', 'descripcion', 'categoria', 'fecha', 'hora', 'ubicacion', 'direccion', 'ciudad', 'capacidad'],
    zonas: [],
    admin: [],
  };
  const tabHasError = (tab) =>
    TAB_FIELDS[tab].some((f) => !!errores[f]);

  const handleCancelar = () => {
    if (adminMode) {
      window.location.href = '/admin/dashboard';
    } else {
      navigate('/dashboard/mis-eventos');
    }
  };

  return (
    <div className="formulario-evento-container">
      <div className="formulario-header">
        <h2>
          {adminMode ? '🛡️ Editar Evento (Administrador)' : (isEditing ? 'Editar Evento' : 'Crear Nuevo Evento')}
        </h2>
        <p className="formulario-subtitulo">
          {adminMode
            ? 'Estás editando este evento con privilegios administrativos. Tus cambios quedan registrados en la auditoría.'
            : isEditing
              ? 'Actualiza la información de tu evento'
              : 'Completa los datos para publicar tu evento'}
        </p>
      </div>

      {/* Tabs sticky de navegacion entre secciones */}
      <div className="form-tabs-bar">
        <button
          type="button"
          className={`form-tab ${activeTab === 'info' ? 'active' : ''} ${tabHasError('info') ? 'has-error' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <span className="form-tab-icon">📝</span>
          <span className="form-tab-label">Información del evento</span>
          {tabHasError('info') && <span className="form-tab-badge">!</span>}
        </button>
        <button
          type="button"
          className={`form-tab ${activeTab === 'zonas' ? 'active' : ''}`}
          onClick={() => setActiveTab('zonas')}
        >
          <span className="form-tab-icon">🎟️</span>
          <span className="form-tab-label">Zonas y entradas</span>
        </button>
        {adminMode && isEditing && (
          <button
            type="button"
            className={`form-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <span className="form-tab-icon">🛡️</span>
            <span className="form-tab-label">Control administrativo</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="formulario-evento">
        <div
          className="formulario-grid"
          style={{ display: activeTab === 'info' ? 'grid' : 'none' }}
        >
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
                  step="10"
                  className={errores.capacidad ? 'error' : ''}
                />
                {errores.capacidad && <span className="error-mensaje">{errores.capacidad}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Preview opcional (solo en tab 'info') */}
        <div
          className="form-preview"
          style={{ display: activeTab === 'info' ? 'block' : 'none' }}
        >
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

        {/* Campos requeridos note (solo en tab info) */}
        <div
          className="campos-requeridos-note"
          style={{ display: activeTab === 'info' ? 'block' : 'none' }}
        >
          <span className="required">*</span> Campos requeridos
        </div>

        {/* Control Administrativo (solo en adminMode y en su tab) */}
        {adminMode && isEditing && activeTab === 'admin' && (
          <div className="form-admin-block">
            <h3 className="form-admin-title">🔧 Control Administrativo</h3>

            <div className="form-group">
              <label>Estado del Evento</label>
              <div className="admin-status-selector">
                {STATUS_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`admin-status-option ${formData.status === opt.value ? 'on' : ''}`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={opt.value}
                      checked={formData.status === opt.value}
                      onChange={handleChange}
                    />
                    <span className="admin-status-icon">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="admin_reason">Motivo / Notas Administrativas</label>
              <textarea
                id="admin_reason"
                name="admin_reason"
                value={formData.admin_reason}
                onChange={handleChange}
                placeholder="Explica brevemente por qué estás modificando este evento. Quedará registrado en la auditoría."
                rows="3"
              />
              <small style={{ color: '#9aa3b2', fontSize: '0.78rem' }}>
                ℹ️ Este motivo se registra en el historial de auditoría junto a los campos modificados.
              </small>
            </div>

            {formData.status === 'cancelled' && (
              <div className="form-admin-warning">
                ⚠️ Vas a marcar este evento como <b>dado de baja</b>. El promotor lo verá inmediatamente.
              </div>
            )}
          </div>
        )}

      </form>

      {/* GestionTiposEntrada solo visible en tab 'zonas' */}
      <div
        className="form-zonas-tab"
        style={{ display: activeTab === 'zonas' ? 'block' : 'none', marginTop: 16 }}
      >
        <GestionTiposEntrada
           eventoId={isEditing ? id : null}
           evento={formData}
           onChange={handleTiposChange}
        />
      </div>

      {/* Footer sticky de acciones (siempre visible, fuera del form) */}
      <div className="form-footer-sticky">
        <button
          type="button"
          className="btn-cancelar-form"
          onClick={handleCancelar}
          disabled={cargando}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="btn-guardar"
          onClick={(e) => handleSubmit(e)}
          disabled={cargando}
        >
          {cargando ? (
            <>
              <span className="spinner-small"></span>
              {isEditing ? 'Actualizando...' : 'Creando...'}
            </>
          ) : (
            isEditing ? (adminMode ? 'Guardar como Administrador' : 'Actualizar Evento') : 'Crear Evento'
          )}
        </button>
      </div>
    </div>
  );
}

export default FormularioEvento;