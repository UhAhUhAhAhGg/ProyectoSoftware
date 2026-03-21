'use client';

import { useAuth } from '../../../context/AuthContext';
import { authService } from '../../../services/authService';
import { useRouter } from 'next/navigation';

export default function DashboardComprador() {
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
        <h1>Panel del Comprador</h1>
        <button 
          onClick={handleLogout}
          style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Cerrar Sesión
        </button>
      </div>
      <p>Bienvenido. Aquí podrás ver los eventos disponibles y comprar tus entradas.</p>
    </main>
  );
}
