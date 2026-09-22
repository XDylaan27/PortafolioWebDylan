import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Box, CheckCircle2, Code2, Sparkles } from 'lucide-react';

export default function TemplateLabPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">
      <div className="space-y-4 border-b border-neutral-800 pb-8">
        <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
          Plantilla de Proyecto / Lab Template
        </span>
        <h1 className="text-4xl font-serif-editorial font-light tracking-tight text-white">
          Plantilla para Nuevos Proyectos
        </h1>
        <p className="text-neutral-400 font-serif-editorial text-lg max-w-2xl leading-relaxed">
          Esta es la ruta base <code className="text-sm font-mono text-neutral-300">/lab/template-lab</code>. Puedes duplicar esta carpeta para crear tus propias aplicaciones, herramientas, dashboards o experimentos sin que interfieran con el resto de la web.
        </p>
      </div>

      {/* Características del aislamiento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border border-neutral-800 bg-neutral-900/40 rounded-sm space-y-2">
          <div className="flex items-center gap-2 text-white font-medium text-sm font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Aislamiento Total de Rutas</span>
          </div>
          <p className="text-xs text-neutral-400 leading-normal">
            Todo componente, estado de React o librería externa que importes aquí funcionará exclusivamente dentro de esta subruta.
          </p>
        </div>

        <div className="p-6 border border-neutral-800 bg-neutral-900/40 rounded-sm space-y-2">
          <div className="flex items-center gap-2 text-white font-medium text-sm font-mono">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Mismo Dominio & Despliegue</span>
          </div>
          <p className="text-xs text-neutral-400 leading-normal">
            No necesitas pagar más dominios ni crear nuevos proyectos en Vercel. Todo se despliega en una sola compilación.
          </p>
        </div>
      </div>

      {/* Demo interactivo de prueba */}
      <div className="p-8 border border-neutral-800 bg-neutral-900/20 rounded-sm space-y-4">
        <h3 className="text-sm font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-2">
          <Box className="w-4 h-4 text-neutral-300" />
          Área de Trabajo de tu Proyecto
        </h3>
        <p className="text-sm text-neutral-400">
          Aquí puedes colocar tus formularios, canvas de Three.js, visualizaciones de datos, editores o llamadas a APIs.
        </p>
        <div className="p-4 bg-neutral-950 border border-neutral-800 rounded font-mono text-xs text-neutral-400">
          // Tu código de proyecto aquí<br />
          const proyecto = &#123; nombre: &quot;Mi Nueva Idea&quot;, estado: &quot;activo&quot; &#125;;
        </div>
      </div>
    </div>
  );
}
