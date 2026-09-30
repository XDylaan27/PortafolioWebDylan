import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dylan | Portfolio & Lab',
    short_name: 'Dylan Lab',
    description: 'Portafolio modular, control de pedidos con amigos y herramientas interactivas.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Pedidos con Amigos',
        short_name: 'Pedidos',
        description: 'Ver pedidos en curso, amigos y recordatorios',
        url: '/lab/pedidos-amigos',
        icons: [{ src: '/icon.svg', sizes: '192x192', type: 'image/svg+xml' }],
      },
      {
        name: 'Apuesta & Quiniela',
        short_name: 'Quiniela',
        description: 'Salas de pronósticos en tiempo real',
        url: '/lab/apuesta-puntaje',
        icons: [{ src: '/icon.svg', sizes: '192x192', type: 'image/svg+xml' }],
      },
    ],
  };
}
