'use client';

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Send,
  Trash2,
  Search,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Layers,
  X,
  Check,
  Plus
} from 'lucide-react';
import { STOKY_CATALOG, CatalogSticker } from '@/lib/stoky-catalog-data';

const ITEMS_PER_PAGE = 6; // 6 stickers por "hoja" (cuadrícula compacta de 2 o 3 columnas)

export default function StokyCatalogoPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageDirection, setPageDirection] = useState<'next' | 'prev' | null>(null);
  const [isTurning, setIsTurning] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CatalogSticker[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeModalSticker, setActiveModalSticker] = useState<CatalogSticker | null>(null);

  // Filtrado
  const filteredStickers = useMemo(() => {
    return STOKY_CATALOG.filter((item) => {
      const q = searchQuery.toLowerCase();
      return item.code.toLowerCase().includes(q) || item.title.toLowerCase().includes(q);
    });
  }, [searchQuery]);

  // Paginación por hojas
  const totalPages = Math.max(1, Math.ceil(filteredStickers.length / ITEMS_PER_PAGE));
  const pageStickers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStickers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStickers, currentPage]);

  const handlePageChange = (newPage: number, direction: 'next' | 'prev') => {
    if (newPage >= 1 && newPage <= totalPages && !isTurning) {
      setPageDirection(direction);
      setIsTurning(true);
      setTimeout(() => {
        setCurrentPage(newPage);
        setIsTurning(false);
      }, 280);
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

  // Enlace oficial de WhatsApp (Click-to-chat Meta)
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8 min-h-screen">
      {/* Encabezado Editorial */}
      <header className="space-y-4 border-b border-neutral-800 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase tracking-widest">
              <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
              <span>Álbum de Estampas / Catálogo Físico</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif-editorial font-light tracking-tight text-white">
              Catálogo de Stickers Stoky
            </h1>
          </div>

          {/* Botón de Carrito */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2 bg-white text-neutral-950 rounded-sm font-mono text-xs uppercase tracking-wider font-semibold hover:bg-neutral-200 transition-colors shadow-sm"
          >
            <ShoppingBag className="w-4 h-4 text-neutral-950" />
            <span>Carrito</span>
            <span className="bg-neutral-950 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {cart.length}
            </span>
          </button>
        </div>

        {/* Buscador */}
        <div className="pt-2">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código (ej: A1, A2)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-neutral-900/70 border border-neutral-800 pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 rounded-sm focus:outline-none focus:border-neutral-600 font-mono"
            />
          </div>
        </div>
      </header>

      {/* Indicador de Hoja y Controles Superiores */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-3 text-xs font-mono text-neutral-500">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-neutral-400" />
          <span>Hoja {currentPage} de {totalPages}</span>
        </span>
        <span>{filteredStickers.length} stickers archivados</span>
      </div>

      {/* Área del Catálogo con Efecto de Vuelta de Hoja (Page Turn) */}
      <div className="relative overflow-hidden perspective-1000 min-h-[360px] py-2">
        <div
          className={`transition-all duration-300 transform ${
            isTurning
              ? pageDirection === 'next'
                ? 'opacity-0 -translate-x-12 rotate-y-6 scale-95'
                : 'opacity-0 translate-x-12 -rotate-y-6 scale-95'
              : 'opacity-100 translate-x-0 rotate-y-0 scale-100'
          }`}
        >
          {pageStickers.length === 0 ? (
            <div className="py-20 text-center space-y-2 border border-dashed border-neutral-800 rounded-sm">
              <p className="text-neutral-400 font-serif-editorial text-sm">
                No hay stickers registrados con ese código.
              </p>
            </div>
          ) : (
            /* Cuadrícula compacta: 2 columnas en móvil, 3 columnas en escritorio */
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {pageStickers.map((sticker) => {
                const inCart = isInCart(sticker.id);
                return (
                  <div
                    key={sticker.id}
                    className="group relative border border-neutral-800/90 bg-neutral-900/50 hover:bg-neutral-900 rounded-sm p-3 space-y-2.5 hover:border-neutral-600 transition-all flex flex-col justify-between shadow-sm"
                  >
                    {/* Código de Estampa */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="px-2 py-0.5 bg-neutral-800 text-neutral-100 border border-neutral-700/80 rounded-sm font-semibold tracking-wider text-[11px]">
                        {sticker.code}
                      </span>
                      <button
                        onClick={() => toggleCart(sticker)}
                        className={`p-1 rounded-sm border transition-colors ${
                          inCart
                            ? 'bg-neutral-800 text-emerald-400 border-neutral-700'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-600'
                        }`}
                        title={inCart ? 'En Carrito' : 'Añadir al Carrito'}
                      >
                        {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Contenedor compacto del Sticker WebP */}
                    <div
                      onClick={() => setActiveModalSticker(sticker)}
                      className="relative w-full aspect-square bg-neutral-950/80 border border-neutral-800/60 rounded-sm overflow-hidden flex items-center justify-center p-2.5 cursor-pointer group-hover:border-neutral-700 transition-colors"
                    >
                      <img
                        src={sticker.previewUrl}
                        alt={sticker.title}
                        className="max-h-28 max-w-28 sm:max-h-32 sm:max-w-32 object-contain filter drop-shadow group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>

                    {/* Botón inferior rápido */}
                    <button
                      onClick={() => setActiveModalSticker(sticker)}
                      className="w-full py-1 text-[11px] font-mono uppercase tracking-wider text-neutral-400 hover:text-white border border-neutral-800/80 hover:border-neutral-700 rounded-sm text-center transition-colors"
                    >
                      Ver Ficha
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Navegación de Hojas del Catálogo */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4 border-t border-neutral-900 font-mono text-xs">
          <button
            onClick={() => handlePageChange(currentPage - 1, 'prev')}
            disabled={currentPage === 1 || isTurning}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-800 rounded-sm text-neutral-300 hover:text-white hover:border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Hoja Anterior</span>
          </button>

          <span className="px-3 py-1.5 text-neutral-500">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1, 'next')}
            disabled={currentPage === totalPages || isTurning}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-800 rounded-sm text-neutral-300 hover:text-white hover:border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <span>Hoja Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal de Detalle */}
      {activeModalSticker && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-sm p-5 space-y-5 shadow-2xl">
            <button
              onClick={() => setActiveModalSticker(null)}
              className="absolute top-3.5 right-3.5 text-neutral-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                Sticker ID
              </span>
              <h2 className="text-2xl font-mono font-semibold text-white tracking-wider">
                {activeModalSticker.code}
              </h2>
            </div>

            {/* Vista previa en tamaño de WhatsApp */}
            <div className="w-full aspect-square max-h-56 bg-neutral-950 border border-neutral-800 rounded-sm p-4 flex items-center justify-center">
              <img
                src={activeModalSticker.previewUrl}
                alt={activeModalSticker.title}
                className="max-h-44 max-w-44 object-contain filter drop-shadow-lg"
              />
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => {
                  toggleCart(activeModalSticker);
                  setActiveModalSticker(null);
                }}
                className="w-full py-2 px-3 bg-neutral-800 text-white hover:bg-neutral-700 font-mono text-xs uppercase tracking-wider rounded-sm transition-colors border border-neutral-700 flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>
                  {isInCart(activeModalSticker.id) ? 'Quitar del Carrito' : 'Añadir al Carrito'}
                </span>
              </button>

              <a
                href={getWhatsAppSingleUrl(activeModalSticker.code)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 bg-white text-neutral-950 hover:bg-neutral-200 font-mono text-xs uppercase tracking-wider font-semibold rounded-sm transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Pedir Solo Este</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Lateral del Carrito */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-sm bg-neutral-900 border-l border-neutral-800 h-full p-5 flex flex-col justify-between shadow-2xl">
            {/* Cabecera */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2 font-mono text-xs text-white uppercase tracking-wider">
                  <ShoppingBag className="w-4 h-4 text-white" />
                  <span>Tu Carrito de Stickers</span>
                  <span className="text-neutral-500">({cart.length})</span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-neutral-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <ShoppingBag className="w-7 h-7 text-neutral-600 mx-auto" />
                  <p className="text-xs font-mono text-neutral-400">
                    Tu carrito está vacío.
                  </p>
                  <p className="text-[11px] font-mono text-neutral-500">
                    Añade stickers desde el catálogo para pedirlos juntos.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-2 bg-neutral-950 border border-neutral-800/80 rounded-sm"
                    >
                      <div className="w-10 h-10 bg-neutral-900 border border-neutral-800 rounded-sm p-1 flex-shrink-0 flex items-center justify-center">
                        <img
                          src={item.previewUrl}
                          alt={item.title}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-mono font-semibold text-white bg-neutral-800 px-1.5 py-0.5 rounded-sm">
                          {item.code}
                        </span>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-neutral-500 hover:text-red-400 p-1 transition-colors"
                        title="Quitar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pie del Carrito */}
            {cart.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-neutral-800">
                <div className="bg-neutral-950 p-2.5 border border-neutral-800 rounded-sm">
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block">
                    Mensaje generado:
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
                    className="w-full py-2.5 px-3 bg-white text-neutral-950 hover:bg-neutral-200 font-mono text-xs uppercase tracking-wider font-semibold rounded-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5 text-neutral-950" />
                    <span>Pedir Carrito a Stoky ({cart.length})</span>
                  </a>

                  <button
                    onClick={clearCart}
                    className="w-full py-1.5 text-center text-[11px] font-mono text-neutral-500 hover:text-neutral-300 transition-colors"
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
