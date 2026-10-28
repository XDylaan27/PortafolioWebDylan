export interface CatalogSticker {
  id: string;
  code: string;
  title: string;
  category: 'memes' | 'reacciones' | 'gatos' | 'anime' | 'random';
  previewUrl: string;
  author: string;
  addedDate: string;
  downloadsCount: number;
}

export const STOKY_CATALOG: CatalogSticker[] = [
  {
    id: 'stk_01',
    code: 'A1',
    title: 'Gato Sospechoso Mirando de Reojo',
    category: 'gatos',
    previewUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&auto=format&fit=crop&q=80',
    author: 'Stoky Bot',
    addedDate: '2026-10-24',
    downloadsCount: 42
  },
  {
    id: 'stk_02',
    code: 'A2',
    title: 'Danna Soto Bata Al Revés',
    category: 'memes',
    previewUrl: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=400&auto=format&fit=crop&q=80',
    author: 'Comunidad TikTok',
    addedDate: '2026-10-25',
    downloadsCount: 89
  },
  {
    id: 'stk_03',
    code: 'A3',
    title: 'Perrito Confundido Inocente',
    category: 'reacciones',
    previewUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&auto=format&fit=crop&q=80',
    author: 'Stoky Bot',
    addedDate: '2026-10-25',
    downloadsCount: 31
  },
  {
    id: 'stk_04',
    code: 'A4',
    title: 'Risa Sarcástica sin Esperanza',
    category: 'memes',
    previewUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    author: 'Comunidad TikTok',
    addedDate: '2026-10-26',
    downloadsCount: 57
  },
  {
    id: 'stk_05',
    code: 'A5',
    title: 'Gatito Durmiendo Modo Bolita',
    category: 'gatos',
    previewUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&auto=format&fit=crop&q=80',
    author: 'Stoky Bot',
    addedDate: '2026-10-26',
    downloadsCount: 64
  },
  {
    id: 'stk_06',
    code: 'A6',
    title: 'Shock Total Ojos Abiertos',
    category: 'reacciones',
    previewUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    author: 'Comunidad TikTok',
    addedDate: '2026-10-27',
    downloadsCount: 95
  },
  {
    id: 'stk_07',
    code: 'A7',
    title: 'Baile Anime Energético',
    category: 'anime',
    previewUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80',
    author: 'Stoky Bot',
    addedDate: '2026-10-27',
    downloadsCount: 78
  },
  {
    id: 'stk_08',
    code: 'A8',
    title: 'Pulgar Arriba de Aprobación',
    category: 'reacciones',
    previewUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    author: 'Stoky Bot',
    addedDate: '2026-10-28',
    downloadsCount: 110
  },
  {
    id: 'stk_09',
    code: 'B1',
    title: 'Gato Programador Escribiendo',
    category: 'gatos',
    previewUrl: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=400&auto=format&fit=crop&q=80',
    author: 'Stoky Bot',
    addedDate: '2026-10-28',
    downloadsCount: 125
  },
  {
    id: 'stk_10',
    code: 'B2',
    title: 'Explosión Mental Cósmica',
    category: 'memes',
    previewUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop&q=80',
    author: 'Comunidad TikTok',
    addedDate: '2026-10-28',
    downloadsCount: 88
  },
  {
    id: 'stk_11',
    code: 'B3',
    title: 'Capibara en Calma Absoluta',
    category: 'random',
    previewUrl: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef6?w=400&auto=format&fit=crop&q=80',
    author: 'Stoky Bot',
    addedDate: '2026-10-28',
    downloadsCount: 140
  },
  {
    id: 'stk_12',
    code: 'B4',
    title: 'Lágrima Dramática de Novela',
    category: 'reacciones',
    previewUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&auto=format&fit=crop&q=80',
    author: 'Comunidad TikTok',
    addedDate: '2026-10-28',
    downloadsCount: 52
  }
];
