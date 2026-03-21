'use client';

import { useAuth } from '../../../context/AuthContext';
import { authService } from '../../../services/authService';
import { useRouter } from 'next/navigation';

export default function DashboardPromotor() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await authService.logout();
    logout();
    router.push('/login');
  };

  return (
    <main style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Panel del Promotor</h1>
        <button 
          onClick={handleLogout}
          style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Cerrar Sesión
        </button>
      </div>
      <p>Bienvenido. Aquí podrás crear y gestionar tus eventos.</p>
    </main>
  );
}
