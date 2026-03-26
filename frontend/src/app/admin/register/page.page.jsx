'use client';

import { Suspense } from 'react';
import AdminRegister from '../../../pages/AdminRegister';
import '../../../pages/AdminLogin.css';

export default function AdminRegisterPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <AdminRegister />
    </Suspense>
  );
}
