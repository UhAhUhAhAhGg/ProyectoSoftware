'use client';

import { useState } from 'react';
import './AdminActionModal.css';

/**
 * Modal genérico para confirmar acciones de usuario (suspender/dar de baja)
 * con campo de motivo
 */
function AdminActionModal({
  isOpen,
  title,
  mensaje,
  actionType, // 'suspend' | 'deactivate'
  usuario,
  onConfirm,
  onCancel,
  loading,
}) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!motivo.trim()) {
      setError('El motivo es obligatorio');
      return;
    }

    if (motivo.trim().length < 10) {
      setError('El motivo debe tener al menos 10 caracteres');
      return;
    }

    onConfirm(motivo);
    setMotivo('');
    setError('');
  };

  const handleCancel = () => {
    setMotivo('');
    setError('');
    onCancel();
  };

  if (!isOpen) return null;

  const accionTexto = actionType === 'suspend' ? 'Suspender' : 'Dar de Baja';
  const accionColor = actionType === 'suspend' ? '#f39c12' : '#e74c3c';
  const accionBg = actionType === 'suspend' ? 'rgba(243, 156, 18, 0.1)' : 'rgba(231, 76, 60, 0.1)';

  return (
    <div className="admin-modal-overlay" onClick={handleCancel}>
      <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="admin-modal-header">
          <h3>{title}</h3>
          <button className="admin-modal-close" onClick={handleCancel}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="admin-modal-body">
          <p className="admin-modal-mensaje">{mensaje}</p>

          {/* Información del usuario */}
          {usuario && (
            <div className="admin-modal-user-info">
              <div className="info-row">
                <span className="label">Email:</span>
                <span className="value">{usuario.email}</span>
              </div>
              {usuario.nombre && (
                <div className="info-row">
                  <span className="label">Nombre:</span>
                  <span className="value">{usuario.nombre}</span>
                </div>
              )}
              {usuario.tipo_cuenta && (
                <div className="info-row">
                  <span className="label">Tipo:</span>
                  <span className="value">{usuario.tipo_cuenta}</span>
                </div>
              )}
            </div>
          )}

          {/* Campo de motivo */}
          <div className="admin-modal-field">
            <label htmlFor="motivo">
              Motivo de la acción <span className="required">*</span>
            </label>
            <textarea
              id="motivo"
              placeholder={`Ejemplo: Violación de términos de servicio, Comportamiento inapropiado, etc.`}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setError('');
              }}
              disabled={loading}
              className="admin-modal-textarea"
              rows={4}
            />
            <span className="char-count">
              {motivo.length}/500 caracteres
            </span>
            {error && <span className="admin-modal-error">{error}</span>}
          </div>

          {/* Advertencia importante */}
          <div className="admin-modal-warning" style={{ background: accionBg, borderLeft: `4px solid ${accionColor}` }}>
            <strong>⚠️ Advertencia importante:</strong>
            <p>
              {actionType === 'suspend'
                ? 'Esta acción suspenderá la cuenta del usuario. Podrá ser reactivada posteriormente si lo desea.'
                : 'Esta acción eliminará permanentemente la cuenta del usuario y todos sus datos asociados. NO se puede deshacer.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="admin-modal-footer">
          <button
            className="admin-modal-btn admin-modal-btn-cancel"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="admin-modal-btn admin-modal-btn-action"
            onClick={handleConfirm}
            disabled={loading || !motivo.trim()}
            style={{ background: accionColor }}
          >
            {loading ? 'Procesando...' : accionTexto}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminActionModal;
