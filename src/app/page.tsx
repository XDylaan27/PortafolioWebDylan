'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PROJECTS, ProjectCategory } from '@/content/projects';
import { ArrowUpRight, FolderGit2, Sparkles, Terminal, Code2, Layers, Mail, ExternalLink, Trophy } from 'lucide-react';

const CATEGORIES: { key: 'all' | ProjectCategory; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'web-app', label: 'Web Apps' },
  { key: 'tool', label: 'Herramientas' },
  { key: 'ai', label: 'IA & Skills' },
  { key: 'experiment', label: 'Experimentos' },
];

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<'all' | ProjectCategory>('all');

  const filteredProjects = activeCategory === 'all'
    ? PROJECTS
    : PROJECTS.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen flex flex-col justify-between max-w-5xl mx-auto px-6 py-12 md:py-20">
      {/* Encabezado Editorial */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-neutral-500 font-mono">
              Portfolio & Lab / 2026
            </span>
            <h1 className="text-4xl md:text-6xl font-serif-editorial font-light tracking-tight mt-1 text-neutral-900 dark:text-neutral-50">
              Dylan
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-mono text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Disponible para proyectos
            </span>
            <span className="text-neutral-300 dark:text-neutral-700">/</span>
            <a
              href="mailto:contacto@dylan.dev"
              className="hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              contacto
            </a>
          </div>
        </div>

        {/* Declaración editorial / Bio */}
        <p className="mt-8 text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 font-serif-editorial max-w-3xl leading-relaxed">
          Ingeniero de software y creador digital. Construyo sistemas modulares, herramientas interactivas y experimentos web alojados bajo un único universo de rutas.
        </p>

        {/* Tarjeta de Acceso Directo al Proyecto de Apuestas */}
        <div className="mt-8 p-6 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/40 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-neutral-400 dark:hover:border-neutral-700">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Proyecto en Vivo
              </span>
              <span className="text-neutral-400 dark:text-neutral-600 text-xs font-mono">&bull;</span>
              <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
                Quiniela en Tiempo Real
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-serif-editorial font-medium text-neutral-900 dark:text-neutral-100">
              Apuesta & Quiniela de Puntajes
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Crea salas de apuestas con pronósticos numéricos secretos, invita amigos y corona en directo al participante más cercano cuando se defina el resultado.
            </p>
          </div>

          <Link
            href="/lab/apuesta-puntaje"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-950 font-mono text-xs font-medium transition-colors shrink-0 shadow-sm"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Explorar Apuestas</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Sección Principal de Proyectos */}
      <main className="py-12 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 gap-4">
          <div>
            <h2 className="text-sm uppercase tracking-widest font-mono text-neutral-500">
              Índice de Proyectos & Experimentos
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Cada proyecto se ejecuta en su propia subruta dedicada (/lab/...)
            </p>
          </div>

          {/* Filtros editoriales */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`text-xs px-3 py-1 font-mono transition-all border ${
                  activeCategory === cat.key
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-black font-medium'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla / Lista Editorial de Proyectos */}
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-b border-neutral-200 dark:border-neutral-800">
          {filteredProjects.map((project) => (
            <article
              key={project.slug}
              className="group py-6 md:py-8 flex flex-col md:flex-row md:items-baseline justify-between gap-4 transition-colors hover:bg-neutral-100/50 dark:hover:bg-neutral-900/30 px-3 -mx-3"
            >
              <div className="space-y-1.5 md:max-w-xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-neutral-400">
                    {project.year}
                  </span>
                  <span className="text-xs font-mono uppercase px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 text-neutral-500">
                    {project.status === 'live' ? 'Activo' : project.status === 'wip' ? 'En proceso' : 'Concepto'}
                  </span>
                </div>
                
                <h3 className="text-xl md:text-2xl font-serif-editorial font-medium text-neutral-900 dark:text-neutral-100 group-hover:underline underline-offset-4 decoration-1">
                  <Link href={`/lab/${project.slug}`} className="flex items-center gap-2">
                    {project.title}
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </h3>
                
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-normal">
                  {project.summary}
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Botón de Entrada directa a la subruta */}
              <div className="flex items-center gap-4 pt-2 md:pt-0 font-mono text-xs">
                <span className="text-neutral-400 dark:text-neutral-600">/lab/{project.slug}</span>
                <Link
                  href={`/lab/${project.slug}`}
                  className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-100 transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Explorar</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Guía rápida para añadir proyectos */}
        <section className="mt-16 p-6 border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/20">
          <div className="flex items-start gap-3">
            <Terminal className="w-5 h-5 text-neutral-600 dark:text-neutral-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-mono font-medium text-neutral-900 dark:text-neutral-200">
                ¿Cómo agregar un nuevo proyecto a este portafolio?
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                1. Duplica la carpeta <code className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded font-mono">src/app/lab/template-lab</code> con el nombre de tu nuevo proyecto (ej. <code className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded font-mono">src/app/lab/mi-proyecto</code>).<br />
                2. Agrega la ficha del proyecto en <code className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded font-mono">src/content/projects.ts</code>.<br />
                3. ¡Listo! Tendrás tu proyecto funcionando en <code className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded font-mono">tudominio.com/lab/mi-proyecto</code> sin tocar el resto de la web.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Editorial */}
      <footer className="pt-10 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-mono text-neutral-500">
        <div>
          © {new Date().getFullYear()} Dylan. Todos los derechos reservados.
        </div>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </a>
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            Vercel
          </a>
        </div>
      </footer>
    </div>
  );
}
