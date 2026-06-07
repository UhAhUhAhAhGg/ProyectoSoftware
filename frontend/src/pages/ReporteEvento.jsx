import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReporteEventoComponent from '../components/dashboard/ReporteEvento';

const ReporteEventoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="dashboard-content" style={{ padding: '20px' }}>
      <button 
        onClick={() => navigate('/dashboard')} 
        style={{ marginBottom: '20px', padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        ← Volver al Dashboard
      </button>
      <ReporteEventoComponent eventId={id} />
    </div>
  );
};

export default ReporteEventoPage;
