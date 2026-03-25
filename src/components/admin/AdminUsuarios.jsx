import React from 'react';

function AdminUsuarios({ module }) {
  const titles = {
    usuarios: 'Gestión de Usuarios',
    promotores: 'Gestión de Promotores',
    compradores: 'Gestión de Compradores',
    administradores: 'Gestión de Administradores'
  };

  return (
    <div className="admin-module">
      <h2>{titles[module] || 'Gestión de Usuarios'}</h2>
      <p>Listado y gestión de {module || 'usuarios'} en la plataforma</p>
    </div>
  );
}

export default AdminUsuarios;