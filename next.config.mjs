/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone: genera un server.js autocontenido, ideal para la imagen Docker
  output: 'standalone',
  // Sin el botón flotante de Next.js en desarrollo (tapa la página, sobre todo en el celular).
  // En producción no existe igual.
  devIndicators: false,
};

export default nextConfig;
