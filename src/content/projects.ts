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
    slug: 'stoky-catalogo',
    title: 'Stoky — Catálogo & Mercado de Stickers',
    category: 'web-app',
    summary: 'Catálogo editorial por hojas con carrito de pedidos masivos para WhatsApp con cero peticiones a la API.',
    description: 'Galería paginada estilo álbum para explorar y seleccionar stickers animados generados desde TikTok. Permite armar un carrito de stickers favoritos y solicitar la entrega por lotes a Stoky en WhatsApp sin consumo de cuotas.',
    year: '2026',
    status: 'live',
    tags: ['Next.js 15', 'WhatsApp Bot', 'Catálogo Editorial', 'Carrito', 'Tailwind v4'],
    featured: true,
  },
  {
    slug: 'subtitulos',
    title: 'Subtítulos en Tiempo Real — Móvil a PC',
    category: 'ai',
    summary: 'Captura de voz remota desde Android y transcripción en streaming mediante sherpa-onnx local.',
    description: 'Herramienta de accesibilidad que convierte el micrófono del celular en un emisor de audio de baja latencia vía WebSocket. Procesa el audio localmente en la laptop mediante modelos Zipformer en español sin enviar datos a servidores externos.',
    year: '2026',
    status: 'live',
    tags: ['sherpa-onnx', 'WebSockets', 'Web Audio API', 'TypeScript', 'AI Streaming'],
    featured: true,
  },
  {
    slug: 'codigo-node',
    title: 'Visor de Código Node — CRUD MySQL',
    category: 'tool',
    summary: 'Visor de código estático optimizado para celular horizontal con tema VS Code Dark+.',
    description: 'Explorador y visor de código de la clase Node.js CRUD con MySQL y Express. Permite navegar entre carpetas y archivos con colores de VS Code.',
    year: '2026',
    status: 'live',
    tags: ['Node.js', 'Express', 'MySQL', 'VS Code Theme', 'Mobile IDE'],
    featured: true,
  },
  {
    slug: 'calculadora',
    title: 'HyperCalc — Calculadora Hiper-Animada',
    category: 'tool',
    summary: 'Calculadora táctil con animaciones de React Bits (Spotlight, ClickSpark, Magnet, BorderBeam), punto de mil y pegado rápido.',
    description: 'Calculadora personal inspirada en componentes interactivos de reactbits.dev. Cuenta con física magnética en botones, haz de luz láser perimetral, ráfagas de chispas en cada pulsación, formateo automático cada tres ceros, atajos completos de teclado y detector inteligente para pegar números directamente desde el portapapeles.',
    year: '2026',
    status: 'live',
    tags: ['React Bits', 'Canvas Particles', 'Web Audio', 'Next.js 15', 'Tailwind CSS'],
    featured: true,
  },
  {
    slug: 'pedidos-amigos',
    title: 'Pedidos con Amigos & Recordatorios',
    category: 'web-app',
    summary: 'Control personal de encargos compartidos, artículos con fotos en la nube, estado de pago y recordatorios.',
    description: 'Gestiona tus pedidos hechos a través de amigos: revisa qué pedidos están en curso, consulta el historial completo por cada amigo, sube capturas o fotos opcionales por artículo, controla pagos y programa notificaciones para no olvidar registrar tus compras.',
    year: '2026',
    status: 'live',
    tags: ['Supabase Auth', 'Storage', 'RLS', 'PWA', 'Notificaciones'],
    featured: true,
  },
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
