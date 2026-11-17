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
  visibility?: 'public' | 'private';
}

export const PROJECTS: Project[] = [
  {
    slug: 'cuenta-clara',
    title: 'Cuenta Clara',
    category: 'web-app',
    summary: 'Cuenta compartida privada con movimientos y confirmaciones.',
    description: 'Registro privado de deudas y abonos, comprobantes y anulaciones con aprobación de ambos participantes.',
    year: '2026',
    status: 'live',
    tags: ['Supabase', 'Realtime', 'Web Push'],
    featured: false,
    visibility: 'private',
  },
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
    summary: 'Habla desde el celular y muestra subtítulos en vivo en la pantalla de tu portátil.',
    description: 'Este portafolio aloja la interfaz móvil: captura el micrófono, envía el audio mediante Supabase Realtime y permite ajustar los subtítulos. Una aplicación independiente instalada en el portátil recibe el audio, lo transcribe y muestra el texto en vivo. La aplicación del portátil se mantiene fuera de este repositorio.',
    year: '2026',
    status: 'live',
    tags: ['Supabase Realtime', 'Web Audio API', 'TypeScript', 'Subtítulos en vivo'],
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
];
