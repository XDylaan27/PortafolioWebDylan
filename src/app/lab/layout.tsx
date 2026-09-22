import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
      {/* Barra de navegación superior persistente para la zona de proyectos */}
      <header className="border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md px-6 py-3 sticky top-0 z-50 flex items-center justify-between text-xs font-mono">
        <Link
          href="/"
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al portafolio</span>
        </Link>
        <div className="flex items-center gap-2 text-neutral-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Lab Environment</span>
        </div>
      </header>

      {/* Contenido aislado del proyecto */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
