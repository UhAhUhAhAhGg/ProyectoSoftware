'use client';

import { AuthProvider } from '../context/AuthContext';
import ForbiddenToast from '../components/ForbiddenToast';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
      <ForbiddenToast />
    </AuthProvider>
  );
}
