import type { Metadata, Viewport } from 'next';
import { Albert_Sans } from 'next/font/google';
import './globals.css';

const albert = Albert_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Catálogo',
  description: 'Catálogo de productos con pedidos por WhatsApp',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={albert.className}>
      <body>{children}</body>
    </html>
  );
}
