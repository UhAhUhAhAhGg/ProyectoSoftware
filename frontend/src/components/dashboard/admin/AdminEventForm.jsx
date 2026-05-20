'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminEventsService } from '../../../services/adminEventsService';
import './AdminEventForm.css';

function AdminEventForm({ eventId, onSave }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_date: '',
    event_time: '',
    location: '',
    capacity: '',
    status: 'published',
    category: '',
    admin_note: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [categories, setCategories] = useState([]);
  const [statusOptions] = useState([
    { value: 'draft', label: 'Borrador', icon: '📝' },
    { value: 'published', label: 'Activo', icon: '✓' },
    { value: 'suspended', label: 'Dado de baja', icon: '🚫' },
    { value: 'completed', label: 'Finalizado', icon: '✓' }
  ]);

  useEffect(() => {
    cargarEvento();
  }, [eventId]);

  const cargarEvento = async () => {
    try {
      setLoading(true);
      const event = await adminEventsService.getEventForEdit(eventId);
      
      // Precarga de datos
      setFormData({
        name: event.name || '',
        description: event.description || '',
        event_date: event.event_date ? event.event_date.split('T')[0] : '',
        event_time: event.event_time || '',
        location: event.location || '',
        capacity: event.capacity || '',
        status: event.status || 'published',
        category: event.category || '',
        admin_note: event.admin_note || ''
      });
    } catch (error) {
      console.error('Error al cargar evento:', error);
      setError('Error al cargar los datos del evento');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('El nombre del evento es requerido');
      return;
    }

    try {
      setSaving(true);
      setError('');

      await adminEventsService.editEvent(eventId, formData);
      
      setSuccessMessage('✅ Evento actualizado correctamente');
      setTimeout(() => {
        if (onSave) {
          onSave();
        } else {
          router.push('/admin/dashboard?section=eventos');
        }
      }, 1500);
    } catch (error) {
      setError('❌ Error al guardar el evento: ' + error.message);
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="event-form-container loading">
        <div className="spinner"></div>
        <p>Cargando evento...</p>
      </div>
    );
  }

  return (
    <div className="event-form-container">
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      <div className="form-header">
        <h2>Editar Evento</h2>
        <p>Modifica los datos del evento como administrador</p>
      </div>

      <form onSubmit={handleSubmit} className="event-form">
        {/* Información Básica */}
        <section className="form-section">
          <h3>📋 Información Básica</h3>
          
          <div className="form-group">
            <label htmlFor="name">Nombre del evento *</label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Nombre del evento"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Descripción</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe el evento..."
              className="form-textarea"
              rows="4"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Categoría</label>
              <input
                id="category"
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="Categoría"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Ubicación</label>
              <input
                id="location"
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Ubicación"
                className="form-input"
              />
            </div>
          </div>
        </section>

        {/* Detalles del Evento */}
        <section className="form-section">
          <h3>📅 Detalles del Evento</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="event_date">Fecha *</label>
              <input
                id="event_date"
                type="date"
                name="event_date"
                value={formData.event_date}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="event_time">Hora</label>
              <input
                id="event_time"
                type="time"
                name="event_time"
                value={formData.event_time}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="capacity">Capacidad</label>
              <input
                id="capacity"
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                placeholder="Capacidad"
                className="form-input"
                min="1"
              />
            </div>
          </div>
        </section>

        {/* Control Administrativo */}
        <section className="form-section admin-section">
          <h3>🔧 Control Administrativo</h3>
          
          <div className="form-group">
            <label htmlFor="status">Estado del Evento</label>
            <div className="status-selector">
              {statusOptions.map(option => (
                <label key={option.value} className={`status-option ${formData.status === option.value ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={formData.status === option.value}
                    onChange={handleInputChange}
                  />
                  <span className="status-label">
                    <span className="icon">{option.icon}</span>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="admin_note">Notas Administrativas</label>
            <textarea
              id="admin_note"
              name="admin_note"
              value={formData.admin_note}
              onChange={handleInputChange}
              placeholder="Notas internas para otros administradores..."
              className="form-textarea"
              rows="3"
            />
            <small className="help-text">
              ℹ️ Estas notas solo son visibles para administradores
            </small>
          </div>

          {formData.status === 'suspended' && (
            <div className="alert alert-warning">
              ⚠️ Este evento está marcado como "Dado de baja". El promotor será notificado.
            </div>
          )}
        </section>

        {/* Estado Actual */}
        <section className="form-section info-section">
          <h3>ℹ️ Información del Evento</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">ID:</span>
              <span className="info-value">{eventId}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Creado:</span>
              <span className="info-value">2024-05-18</span>
            </div>
            <div className="info-item">
              <span className="info-label">Última actualización:</span>
              <span className="info-value">Hoy</span>
            </div>
          </div>
        </section>

        {/* Botones de Acción */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.back()}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminEventForm;
