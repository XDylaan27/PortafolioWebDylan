'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Send,
  Trash2,
  Search,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Info,
  X,
  Check,
  Plus,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { STOKY_CATALOG, CatalogSticker } from '@/lib/stoky-catalog-data';

const ITEMS_PER_PAGE = 6; // 6 stickers por "hoja" del catálogo

export default function StokyCatalogoPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CatalogSticker[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeModalSticker, setActiveModalSticker] = useState<CatalogSticker | null>(null);

  // Filtrado
  const filteredStickers = useMemo(() => {
    return STOKY_CATALOG.filter((item) => {
      const matchesCategory = selectedCategory === 'todos' || item.category === selectedCategory;
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Paginación por hojas
  const totalPages = Math.max(1, Math.ceil(filteredStickers.length / ITEMS_PER_PAGE));
  const pageStickers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStickers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStickers, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Carrito
  const isInCart = (stickerId: string) => cart.some((s) => s.id === stickerId);

  const toggleCart = (sticker: CatalogSticker) => {
    if (isInCart(sticker.id)) {
      setCart((prev) => prev.filter((s) => s.id !== sticker.id));
    } else {
      setCart((prev) => [...prev, sticker]);
    }
  };

  const removeFromCart = (stickerId: string) => {
    setCart((prev) => prev.filter((s) => s.id !== stickerId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Generador de enlace a WhatsApp oficial (Click-to-chat Meta)
  const getWhatsAppCartUrl = () => {
    if (cart.length === 0) return '#';
    const codesString = cart.map((s) => s.code).join(' ');
    const message = `stickers ${codesString}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const getWhatsAppSingleUrl = (code: string) => {
    const message = `sticker ${code}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-10 min-h-screen">
      {/* Encabezado Editorial */}
      <header className="space-y-4 border-b border-neutral-800 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase tracking-widest">
              <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
              <span>Edición Impresa / Catálogo Digital</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif-editorial font-light tracking-tight text-white">
              Catálogo de Stickers Stoky
            </h1>
          </div>

          {/* Botón flotante de Carrito */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-3 px-5 py-2.5 bg-white text-neutral-950 rounded-sm font-mono text-xs uppercase tracking-wider font-medium hover:bg-neutral-200 transition-colors shadow-sm"
          >
            <ShoppingBag className="w-4 h-4 text-neutral-950" />
            <span>Carrito</span>
            <span className="bg-neutral-950 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
              {cart.length}
            </span>
          </button>
        </div>

        <p className="text-neutral-400 font-serif-editorial text-lg max-w-3xl leading-relaxed">
          Explora la colección de stickers generados y optimizados. Selecciona los stickers que desees en tu pedido y solicítalos a Stoky en un único envío a través de WhatsApp con cero consumo de cuota de red.
        </p>

        {/* Buscador y Filtros */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código o título..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-neutral-900/60 border border-neutral-800 pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 rounded-sm focus:outline-none focus:border-neutral-600 font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {['todos', 'memes', 'reacciones', 'gatos', 'anime', 'random'].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-colors border ${
                  selectedCategory === cat
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Indicador de Hoja del Catálogo */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-3 text-xs font-mono text-neutral-500">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          <span>Hoja {currentPage} de {totalPages}</span>
        </span>
        <span>{filteredStickers.length} piezas archivadas</span>
      </div>

      {/* Cuadrícula de Stickers (Estilo Álbum / Estampillas) */}
      {pageStickers.length === 0 ? (
        <div className="py-20 text-center space-y-3 border border-dashed border-neutral-800 rounded-sm">
          <Info className="w-6 h-6 text-neutral-600 mx-auto" />
          <p className="text-neutral-400 font-serif-editorial text-base">
            No se encontraron stickers con los criterios de búsqueda actuales.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {pageStickers.map((sticker) => {
            const inCart = isInCart(sticker.id);
            return (
              <div
                key={sticker.id}
                className="group relative border border-neutral-800 bg-neutral-900/40 rounded-sm p-4 space-y-4 hover:border-neutral-600 transition-all flex flex-col justify-between"
              >
                {/* Cabecera de la ficha */}
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="px-2 py-0.5 bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-sm font-semibold tracking-wider">
                    {sticker.code}
                  </span>
                  <span className="text-neutral-500 uppercase tracking-widest text-[10px]">
                    {sticker.category}
                  </span>
                </div>

                {/* Vista previa / Contenedor de Estampa */}
                <div
                  onClick={() => setActiveModalSticker(sticker)}
                  className="relative aspect-square w-full bg-neutral-950 border border-neutral-800/80 rounded-sm overflow-hidden flex items-center justify-center p-4 cursor-pointer group-hover:border-neutral-700 transition-colors"
                >
                  <img
                    src={sticker.previewUrl}
                    alt={sticker.title}
                    className="max-h-full max-w-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1 bg-white text-neutral-950 text-xs font-mono uppercase tracking-wider rounded-sm font-medium">
                      Ver Ficha
                    </span>
                  </div>
                </div>

                {/* Título y Pie */}
                <div className="space-y-3 pt-2">
                  <h3
                    onClick={() => setActiveModalSticker(sticker)}
                    className="text-sm font-serif-editorial text-neutral-200 line-clamp-1 cursor-pointer hover:text-white"
                  >
                    {sticker.title}
                  </h3>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/60">
                    <button
                      onClick={() => toggleCart(sticker)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm text-xs font-mono uppercase tracking-wider font-medium transition-colors ${
                        inCart
                          ? 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700'
                          : 'bg-white text-neutral-950 hover:bg-neutral-200'
                      }`}
                    >
                      {inCart ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>En Carrito</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveModalSticker(sticker)}
                      className="p-1.5 border border-neutral-800 text-neutral-400 hover:text-white rounded-sm hover:border-neutral-700"
                      title="Detalle completo"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Controles de Paginación por Hojas */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-8 border-t border-neutral-900 font-mono text-xs">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-4 py-2 border border-neutral-800 rounded-sm text-neutral-300 hover:text-white hover:border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Hoja Anterior</span>
          </button>

          <span className="px-4 py-2 text-neutral-500">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-4 py-2 border border-neutral-800 rounded-sm text-neutral-300 hover:text-white hover:border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span>Hoja Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal de Detalle del Sticker */}
      {activeModalSticker && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-sm p-6 space-y-6 shadow-2xl">
            {/* Botón Cerrar */}
            <button
              onClick={() => setActiveModalSticker(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                Identificador: {activeModalSticker.code}
              </span>
              <h2 className="text-2xl font-serif-editorial font-light text-white">
                {activeModalSticker.title}
              </h2>
            </div>

            {/* Imagen ampliada */}
            <div className="aspect-square w-full max-h-72 bg-neutral-950 border border-neutral-800 rounded-sm p-6 flex items-center justify-center">
              <img
                src={activeModalSticker.previewUrl}
                alt={activeModalSticker.title}
                className="max-h-full max-w-full object-contain filter drop-shadow-xl"
              />
            </div>

            {/* Metadatos */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono py-2 border-y border-neutral-800/80 text-neutral-400">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Categoría</span>
                <span className="text-neutral-200 capitalize">{activeModalSticker.category}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Autor / Fuente</span>
                <span className="text-neutral-200">{activeModalSticker.author}</span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => {
                  toggleCart(activeModalSticker);
                  setActiveModalSticker(null);
                }}
                className="w-full sm:flex-1 py-2.5 px-4 bg-neutral-800 text-white hover:bg-neutral-700 font-mono text-xs uppercase tracking-wider rounded-sm transition-colors border border-neutral-700 flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {isInCart(activeModalSticker.id) ? 'Quitar del Carrito' : 'Añadir al Carrito'}
                </span>
              </button>

              <a
                href={getWhatsAppSingleUrl(activeModalSticker.code)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 py-2.5 px-4 bg-white text-neutral-950 hover:bg-neutral-200 font-mono text-xs uppercase tracking-wider font-medium rounded-sm transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Pedir Solo Este</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Lateral del Carrito */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-neutral-900 border-l border-neutral-800 h-full p-6 flex flex-col justify-between shadow-2xl">
            {/* Cabecera del Drawer */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-2 font-mono text-sm text-white uppercase tracking-wider">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Tu Pedido de Stickers</span>
                  <span className="text-xs text-neutral-500">({cart.length})</span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-neutral-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <ShoppingBag className="w-8 h-8 text-neutral-600 mx-auto" />
                  <p className="text-sm font-serif-editorial text-neutral-400">
                    Tu carrito de stickers está vacío.
                  </p>
                  <p className="text-xs font-mono text-neutral-500">
                    Explora las hojas del catálogo y agrega tus favoritos.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded-sm"
                    >
                      <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-sm p-1 flex-shrink-0 flex items-center justify-center">
                        <img
                          src={item.previewUrl}
                          alt={item.title}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-semibold text-white bg-neutral-800 px-1.5 py-0.5 rounded-sm">
                            {item.code}
                          </span>
                          <span className="text-xs font-serif-editorial text-neutral-300 truncate">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500 capitalize">
                          {item.category}
                        </span>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-neutral-500 hover:text-red-400 p-1 transition-colors"
                        title="Quitar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pie del Drawer */}
            {cart.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-neutral-800">
                <div className="space-y-1 bg-neutral-950 p-3 border border-neutral-800 rounded-sm">
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block">
                    Comando generado para WhatsApp:
                  </span>
                  <code className="text-xs font-mono text-white block truncate">
                    stickers {cart.map((s) => s.code).join(' ')}
                  </code>
                </div>

                <div className="space-y-2">
                  <a
                    href={getWhatsAppCartUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 bg-white text-neutral-950 hover:bg-neutral-200 font-mono text-xs uppercase tracking-wider font-semibold rounded-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Send className="w-4 h-4 text-neutral-950" />
                    <span>Pedir Carrito a Stoky ({cart.length})</span>
                  </a>

                  <button
                    onClick={clearCart}
                    className="w-full py-2 text-center text-xs font-mono text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    Vaciar selección
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
