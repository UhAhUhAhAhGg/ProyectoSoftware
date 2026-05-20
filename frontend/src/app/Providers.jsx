'use client';

import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import { NotificationProvider } from '../context/NotificationContext';
import ForbiddenToast from '../components/ForbiddenToast';

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <FavoritesProvider>
            {children}
            <ForbiddenToast />
          </FavoritesProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
