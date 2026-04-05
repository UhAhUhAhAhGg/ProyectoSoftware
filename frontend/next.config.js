/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desactiva el indicador "N" de Next.js en desarrollo
  devIndicators: false,
  // Solo procesa como rutas de Next.js los archivos que terminen en .page.tsx o .page.jsx
  // Esto previene que Next.js lea `src/pages` y genere rutas fantasma conflictivas
  pageExtensions: ['page.tsx', 'page.ts', 'page.jsx', 'page.js'],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'http', hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
