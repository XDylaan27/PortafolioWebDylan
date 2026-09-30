import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaManager from '@/components/PwaManager';

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  title: 'Dylan | Software Engineer & Creative Developer',
  description: 'Portafolio modular y laboratorio de ideas independientes en un solo dominio.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Dylan Lab',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className="min-h-screen antialiased selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
        <PwaManager />
        {children}
      </body>
    </html>
  );
}
