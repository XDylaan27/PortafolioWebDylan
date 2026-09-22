import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dylan | Software Engineer & Creative Developer',
  description: 'Portafolio modular y laboratorio de ideas independientes en un solo dominio.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className="min-h-screen antialiased selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
        {children}
      </body>
    </html>
  );
}
