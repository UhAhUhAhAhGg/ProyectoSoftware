'use client';

import { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import './AdminTable.css';

function AdminTable() {
  const [administrators, setAdministrators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAdmins, setSelectedAdmins] = useState(new Set());
  const [actionMessage, setActionMessage] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [modalAction, setModalAction] = useState(null);

  // Permisos disponibles
  const availablePermissions = [
    { id: 'manage_users', label: 'Gestionar Usuarios', icon: '👥' },
    { id: 'manage_events', label: 'Gestionar Eventos', icon: '📅' },
    { id: 'manage_admins', label: 'Gestionar Administradores', icon: '⚙️' },
    { id: 'view_reports', label: 'Ver Reportes', icon: '📊' },
    { id: 'manage_queue', label: 'Gestionar Cola', icon: '⏳' },
    { id: 'system_config', label: 'Configuración del Sistema', icon: '🔧' },
  ];

  useEffect(() => {
    cargarAdministradores();
  }, []);

  const cargarAdministradores = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAdministradores();
      setAdministrators(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar administradores');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (message) => {
    setActionMessage(message);
    setTimeout(() => setActionMessage(''), 3000);
  };

  // Filtrado y búsqueda
  const filteredAdmins = administrators
    .filter(admin => {
      const matchesSearch =
        admin.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && admin.is_active) ||
        (filterStatus === 'inactive' && !admin.is_active);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const handleSelectAdmin = (adminId) => {
    const newSelected = new Set(selectedAdmins);
    if (newSelected.has(adminId)) {
      newSelected.delete(adminId);
    } else {
      newSelected.add(adminId);
    }
    setSelectedAdmins(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedAdmins.size === filteredAdmins.length) {
      setSelectedAdmins(new Set());
    } else {
      setSelectedAdmins(new Set(filteredAdmins.map(a => a.id)));
    }
  };

  const openPermissionsModal = (admin) => {
    setSelectedAdmin(admin);
    setModalAction('permissions');
    setModalOpen(true);
  };

  const openStatusModal = (admin, action) => {
    setSelectedAdmin(admin);
    setModalAction(action);
    setModalOpen(true);
  };

  const handleTogglePermission = (permissionId) => {
    if (!selectedAdmin) return;
    
    const currentPermissions = selectedAdmin.permissions || [];
    const updatedPermissions = currentPermissions.includes(permissionId)
      ? currentPermissions.filter(p => p !== permissionId)
      : [...currentPermissions, permissionId];
    
    setSelectedAdmin({ ...selectedAdmin, permissions: updatedPermissions });
  };

  const handleSavePermissions = async () => {
    try {
      await adminService.updateAdminPermissions(selectedAdmin.id, selectedAdmin.permissions);
      showMessage('✅ Permisos actualizados correctamente');
      await cargarAdministradores();
      setModalOpen(false);
    } catch (error) {
      showMessage('❌ Error al actualizar permisos');
    }
  };

  const handleToggleStatus = async (admin) => {
    try {
      if (admin.is_active) {
        await adminService.deactivateAdmin(admin.id, 'Desactivado por SuperAdmin');
      } else {
        await adminService.reactivateAdmin(admin.id);
      }
      showMessage(`✅ Administrador ${admin.is_active ? 'desactivado' : 'reactivado'}`);
      await cargarAdministradores();
      setModalOpen(false);
    } catch (error) {
      showMessage('❌ Error al cambiar estado');
    }
  };

  const SortableHeader = ({ label, sortKey }) => (
    <th onClick={() => handleSort(sortKey)} className="sortable-header">
      {label}
      {sortConfig.key === sortKey && (
        <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
      )}
    </th>
  );

  const StatusBadge = ({ isActive }) => (
    <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
      {isActive ? '✓ Activo' : '✗ Inactivo'}
    </span>
  );

  const PermissionBadges = ({ permissions }) => (
    <div className="permission-badges">
      {permissions && permissions.length > 0 ? (
        permissions.slice(0, 2).map(perm => (
          <span key={perm} className="permission-badge">
            {availablePermissions.find(p => p.id === perm)?.label || perm}
          </span>
        ))
      ) : (
        <span className="permission-badge gray">Sin permisos</span>
      )}
      {permissions && permissions.length > 2 && (
        <span className="permission-badge gray">+{permissions.length - 2}</span>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="admin-table-container loading">
        <div className="spinner"></div>
        <p>Cargando administradores...</p>
      </div>
    );
  }

  return (
    <div className="admin-table-container">
      {actionMessage && (
        <div className={`action-message ${actionMessage.includes('✅') ? 'success' : 'error'}`}>
          {actionMessage}
        </div>
      )}

      <div className="table-controls">
        <div className="search-controls">
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>

        <div className="table-stats">
          <span>Total: {filteredAdmins.length}</span>
          <span>Activos: {filteredAdmins.filter(a => a.is_active).length}</span>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input
                  type="checkbox"
                  checked={selectedAdmins.size === filteredAdmins.length && filteredAdmins.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <SortableHeader label="Nombre" sortKey="nombre" />
              <SortableHeader label="Email" sortKey="email" />
              <th>Permisos Activos</th>
              <SortableHeader label="Estado" sortKey="is_active" />
              <th className="actions-column">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredAdmins.length > 0 ? (
              filteredAdmins.map(admin => (
                <tr key={admin.id} className={`admin-row ${!admin.is_active ? 'inactive' : ''}`}>
                  <td className="checkbox-column">
                    <input
                      type="checkbox"
                      checked={selectedAdmins.has(admin.id)}
                      onChange={() => handleSelectAdmin(admin.id)}
                    />
                  </td>
                  <td className="name-cell">
                    <div className="admin-info">
                      <div className="admin-avatar">{admin.nombre?.charAt(0) || 'A'}</div>
                      <span>{admin.nombre || 'Sin nombre'}</span>
                    </div>
                  </td>
                  <td>{admin.email}</td>
                  <td>
                    <PermissionBadges permissions={admin.permissions} />
                  </td>
                  <td>
                    <StatusBadge isActive={admin.is_active} />
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => openPermissionsModal(admin)}
                      className="btn-icon btn-permissions"
                      title="Gestionar permisos"
                    >
                      🔐
                    </button>
                    <button
                      onClick={() => openStatusModal(admin, admin.is_active ? 'deactivate' : 'reactivate')}
                      className={`btn-icon ${admin.is_active ? 'btn-deactivate' : 'btn-reactivate'}`}
                      title={admin.is_active ? 'Desactivar' : 'Reactivar'}
                    >
                      {admin.is_active ? '⛔' : '✅'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="no-data">
                  No se encontraron administradores
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para gestionar permisos */}
      {modalOpen && modalAction === 'permissions' && selectedAdmin && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Gestionar Permisos: {selectedAdmin.nombre}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="permissions-grid">
                {availablePermissions.map(perm => (
                  <label key={perm.id} className="permission-checkbox">
                    <input
                      type="checkbox"
                      checked={(selectedAdmin.permissions || []).includes(perm.id)}
                      onChange={() => handleTogglePermission(perm.id)}
                    />
                    <span className="permission-label">
                      <span className="permission-icon">{perm.icon}</span>
                      <span>{perm.label}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={handleSavePermissions} className="btn btn-primary">
                Guardar Permisos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para cambiar estado */}
      {modalOpen && (modalAction === 'deactivate' || modalAction === 'reactivate') && selectedAdmin && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalAction === 'deactivate' ? '⛔ Desactivar' : '✅ Reactivar'} Administrador</h3>
            </div>

            <div className="modal-body">
              <p>¿Estás seguro de que deseas {modalAction === 'deactivate' ? 'desactivar' : 'reactivar'} a <strong>{selectedAdmin.nombre}</strong>?</p>
              {modalAction === 'deactivate' && (
                <p className="warning-text">
                  Este administrador no podrá acceder al sistema hasta que sea reactivado.
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button
                onClick={() => handleToggleStatus(selectedAdmin)}
                className={`btn ${modalAction === 'deactivate' ? 'btn-danger' : 'btn-success'}`}
              >
                {modalAction === 'deactivate' ? 'Desactivar' : 'Reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTable;
