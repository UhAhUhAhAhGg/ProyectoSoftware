'use client';

import React from 'react';
import AdminEventsTable from './AdminEventsTable';

function AdminEventos() {
  return (
    <div className="admin-module">
      <div className="module-header">
        <h2>📅 Gestión de Eventos</h2>
        <p>Administra todos los eventos de la plataforma: activos, borradores y dados de baja</p>
      </div>
      <AdminEventsTable />
    </div>
  );
}

export default AdminEventos;
