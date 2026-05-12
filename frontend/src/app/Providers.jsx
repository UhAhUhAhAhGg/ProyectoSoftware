'use client';

import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import ForbiddenToast from '../components/ForbiddenToast';

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FavoritesProvider>
          {children}
          <ForbiddenToast />
        </FavoritesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
