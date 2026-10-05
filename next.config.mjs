const dev = process.env.NODE_ENV !== 'production';

// Política de contenido: todo sale del propio sitio. Las imágenes pueden ser data: o
// blob: (vistas previas del panel antes de subir). Next inyecta scripts y estilos en
// línea, por eso 'unsafe-inline'; en desarrollo además necesita eval y el websocket
// de recarga.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // El sitio no se puede meter dentro de un marco de otra página
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Solo tiene efecto cuando el sitio se sirve por HTTPS (detrás del proxy)
  { key: 'Strict-Transport-Security', value: 'max-age=15552000' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone: genera un server.js autocontenido, ideal para la imagen Docker
  output: 'standalone',
  // Sin el botón flotante de Next.js en desarrollo (tapa la página, sobre todo en el celular).
  // En producción no existe igual.
  devIndicators: false,
  // No anunciar con qué está hecho el sitio
  poweredByHeader: false,
  // El sitio no usa el optimizador de imágenes de Next (las fotos ya se procesan al
  // subirlas). Abierto, cualquiera podía hacerle gastar procesador y disco al servidor.
  images: { unoptimized: true },

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Lo del panel no se guarda en cachés intermedios ni aparece en buscadores
      { source: '/api/admin/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default nextConfig;
