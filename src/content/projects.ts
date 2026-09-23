export type ProjectCategory = 'web-app' | 'tool' | 'ai' | 'experiment' | 'design-system';

export interface Project {
  slug: string; // Ruta bajo /lab/[slug]
  title: string;
  category: ProjectCategory;
  summary: string;
  description: string;
  year: string;
  status: 'live' | 'wip' | 'concept';
  tags: string[];
  externalUrl?: string; // Por si algún proyecto vive fuera o tiene repo específico
  githubUrl?: string;
  featured?: boolean;
}

export const PROJECTS: Project[] = [
  {
    slug: 'apuesta-puntaje',
    title: 'Apuesta & Quiniela de Puntajes',
    category: 'web-app',
    summary: 'Salas de pronósticos en tiempo real con sincronización Supabase, puntajes secretos y resolución por clave.',
    description: 'Aplicación colaborativa donde amigos crean salas de predicciones numéricas, envían pronósticos ocultos y ven en vivo cómo se revela al participante más cercano cuando el creador ingresa el resultado oficial.',
    year: '2026',
    status: 'live',
    tags: ['Supabase', 'Realtime', 'Next.js', 'TypeScript', 'Tailwind'],
    featured: true,
  },
  {
    slug: 'template-lab',
    title: 'Template de Experimento',
    category: 'tool',
    summary: 'Estructura base aislada lista para duplicar al construir nuevas ideas interactivas.',
    description: 'Plantilla inicial con navegación de retorno al portafolio principal, layout configurable y estilos independientes.',
    year: '2026',
    status: 'live',
    tags: ['Next.js', 'React', 'Lab'],
    featured: false,
  },
  {
    slug: 'analizador-de-rutas',
    title: 'Inspector de Arquitectura Modular',
    category: 'experiment',
    summary: 'Visualizador de rutas y micro-aplicaciones integradas en un solo dominio.',
    description: 'Exploración conceptual de cómo desacoplar módulos independientes dentro de una misma instancia de Next.js sin colisión de estado.',
    year: '2026',
    status: 'concept',
    tags: ['Arquitectura', 'App Router', 'Rutas'],
    featured: true,
  },
  {
    slug: 'agente-skills-hub',
    title: 'Skills Hub & Automation System',
    category: 'ai',
    summary: 'Gestor y creador de skills de automatización e IA para flujos de desarrollo ágil.',
    description: 'Espacio para diseñar, probar y descargar skills y agentes personalizados listos para Antigravity y Claude Code.',
    year: '2026',
    status: 'wip',
    tags: ['AI Agents', 'Automation', 'Custom Skills'],
    featured: true,
  }
];
