'use client';

import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import ForbiddenToast from '../components/ForbiddenToast';

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <ForbiddenToast />
      </AuthProvider>
    </ThemeProvider>
  );
}
