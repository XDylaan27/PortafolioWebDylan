'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Plus,
  CheckSquare,
  Square,
  SlidersHorizontal,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { STOKY_CATALOG, CatalogSticker } from '@/lib/stoky-catalog-data';

const ITEMS_PER_PAGE = 6; // 6 stickers por "hoja"

export default function StokyCatalogoPage() {
  const [stickers, setStickers] = useState<CatalogSticker[]>(STOKY_CATALOG);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageDirection, setPageDirection] = useState<'next' | 'prev' | null>(null);
  const [isTurning, setIsTurning] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CatalogSticker[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeModalSticker, setActiveModalSticker] = useState<CatalogSticker | null>(null);

  // Modo edición secreto (5 clicks en "Catálogo")
  const [secretClicks, setSecretClicks] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar stickers desde Supabase con sincronización Realtime
  const fetchStickers = async () => {
    try {
      const { data, error } = await supabase
        .from('stoky_stickers')
        .select('*')
        .order('code', { ascending: true });

      if (error) {
        console.warn('Error consultando Supabase, usando catálogo local:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const mapped: CatalogSticker[] = data.map((item) => ({
          id: item.id,
          code: item.code,
          title: item.title || `Sticker ${item.code}`,
          previewUrl: item.preview_url
        }));
        setStickers(mapped);
      }
    } catch (err) {
      console.warn('Fallo de conexión con Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStickers();

    // Suscripción Realtime a cambios en la tabla stoky_stickers
    const channel = supabase
      .channel('stoky_stickers_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stoky_stickers' },
        () => {
          fetchStickers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Manejador del clic secreto en la palabra "Catálogo" (5 clics)
  const handleSecretClick = () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    setSecretClicks((prev) => {
      const nextClicks = prev + 1;
      if (nextClicks >= 5) {
        setIsEditMode((current) => {
          const nextState = !current;
          if (nextState) {
            setActionNotice('Modo administración activado. Selecciona los stickers que deseas eliminar.');
          } else {
            setActionNotice(null);
            setSelectedForDeletion([]);
          }
          return nextState;
        });
        return 0;
      }
      return nextClicks;
    });

    clickTimeoutRef.current = setTimeout(() => {
      setSecretClicks(0);
    }, 3500);
  };

  // Selección individual para eliminación
  const toggleSelectForDeletion = (stickerId: string) => {
    setSelectedForDeletion((prev) =>
      prev.includes(stickerId) ? prev.filter((id) => id !== stickerId) : [...prev, stickerId]
    );
  };

  // Filtrado de búsqueda
  const filteredStickers = useMemo(() => {
    return stickers.filter((item) => {
      const q = searchQuery.toLowerCase();
      return item.code.toLowerCase().includes(q) || item.title.toLowerCase().includes(q);
    });
  }, [stickers, searchQuery]);

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

  // Eliminar stickers seleccionados en Supabase
  const handleDeleteSelected = async () => {
    if (selectedForDeletion.length === 0) return;

    const confirmMsg = `¿Deseas eliminar permanentemente los ${selectedForDeletion.length} stickers seleccionados?`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('stoky_stickers')
        .delete()
        .in('id', selectedForDeletion);

      if (error) {
        alert(`Error al eliminar: ${error.message}`);
        return;
      }

      // Remover del estado local
      setStickers((prev) => prev.filter((s) => !selectedForDeletion.includes(s.id)));
      setCart((prev) => prev.filter((s) => !selectedForDeletion.includes(s.id)));
      setSelectedForDeletion([]);
      setActionNotice('Stickers eliminados correctamente del catálogo.');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      alert(`Fallo al eliminar: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAllPage = () => {
    const pageIds = pageStickers.map((s) => s.id);
    const allSelected = pageIds.every((id) => selectedForDeletion.includes(id));
    if (allSelected) {
      setSelectedForDeletion((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedForDeletion((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  // Enlace oficial de WhatsApp
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
            <h1 className="text-3xl sm:text-4xl font-serif-editorial font-light tracking-tight text-white select-none">
              <span
                onClick={handleSecretClick}
                className="cursor-pointer transition-colors hover:text-neutral-200"
                title="Catálogo"
              >
                Catálogo
              </span>{' '}
              de Stickers Stoky
            </h1>
          </div>

          {/* Botones Superiores: Carrito y Actualizar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchStickers()}
              className="p-2 border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-sm transition-colors"
              title="Refrescar catálogo en vivo"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-white' : ''}`} />
            </button>

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

        {/* Barra de Modo Edición Secreto */}
        {isEditMode && (
          <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-sm space-y-2 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-red-300">
                <SlidersHorizontal className="w-4 h-4 text-red-400" />
                <span className="font-semibold uppercase tracking-wider">Modo Administración Activo</span>
                <span className="text-neutral-400">({selectedForDeletion.length} seleccionados)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAllPage}
                  className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white rounded-sm text-[11px] uppercase tracking-wider transition-colors"
                >
                  Seleccionar Hoja
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedForDeletion.length === 0 || isDeleting}
                  className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-sm font-semibold text-[11px] uppercase tracking-wider transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Eliminando...' : `Eliminar (${selectedForDeletion.length})`}</span>
                </button>
                <button
                  onClick={() => {
                    setIsEditMode(false);
                    setSelectedForDeletion([]);
                  }}
                  className="p-1 text-neutral-400 hover:text-white rounded-sm transition-colors"
                  title="Cerrar modo edición"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-[11px] font-mono text-neutral-400">
              Toca cualquier sticker para marcarlo o desmarcarlo para eliminación permanente.
            </p>
          </div>
        )}

        {/* Mensaje de Notificación */}
        {actionNotice && !isEditMode && (
          <div className="flex items-center gap-2 p-2.5 bg-neutral-900 border border-neutral-700 rounded-sm text-xs font-mono text-neutral-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
        )}
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
                const isSelectedForDel = selectedForDeletion.includes(sticker.id);

                return (
                  <div
                    key={sticker.id}
                    onClick={() => {
                      if (isEditMode) {
                        toggleSelectForDeletion(sticker.id);
                      }
                    }}
                    className={`group relative border rounded-sm p-3 space-y-2.5 transition-all flex flex-col justify-between shadow-sm cursor-pointer ${
                      isEditMode
                        ? isSelectedForDel
                          ? 'border-red-600 bg-red-950/20 ring-1 ring-red-600'
                          : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-600'
                        : 'border-neutral-800/90 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-600'
                    }`}
                  >
                    {/* Código de Estampa y Selección */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="px-2 py-0.5 bg-neutral-800 text-neutral-100 border border-neutral-700/80 rounded-sm font-semibold tracking-wider text-[11px]">
                        {sticker.code}
                      </span>

                      {isEditMode ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectForDeletion(sticker.id);
                          }}
                          className={`p-1 rounded-sm border transition-colors ${
                            isSelectedForDel
                              ? 'bg-red-600 text-white border-red-500'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                          }`}
                        >
                          {isSelectedForDel ? (
                            <CheckSquare className="w-3.5 h-3.5" />
                          ) : (
                            <Square className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCart(sticker);
                          }}
                          className={`p-1 rounded-sm border transition-colors ${
                            inCart
                              ? 'bg-neutral-800 text-emerald-400 border-neutral-700'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-600'
                          }`}
                          title={inCart ? 'En Carrito' : 'Añadir al Carrito'}
                        >
                          {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Contenedor compacto del Sticker WebP */}
                    <div
                      onClick={(e) => {
                        if (!isEditMode) {
                          e.stopPropagation();
                          setActiveModalSticker(sticker);
                        }
                      }}
                      className="relative w-full aspect-square bg-neutral-950/80 border border-neutral-800/60 rounded-sm overflow-hidden flex items-center justify-center p-2.5 group-hover:border-neutral-700 transition-colors"
                    >
                      <img
                        src={sticker.previewUrl}
                        alt={sticker.title}
                        className="max-h-28 max-w-28 sm:max-h-32 sm:max-w-32 object-contain filter drop-shadow group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>

                    {/* Botón inferior rápido */}
                    {isEditMode ? (
                      <div className="w-full py-1 text-[11px] font-mono uppercase tracking-wider text-center text-red-400 border border-red-950 rounded-sm">
                        {isSelectedForDel ? 'Marcado para borrar' : 'Toca para marcar'}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveModalSticker(sticker)}
                        className="w-full py-1 text-[11px] font-mono uppercase tracking-wider text-neutral-400 hover:text-white border border-neutral-800/80 hover:border-neutral-700 rounded-sm text-center transition-colors"
                      >
                        Ver Ficha
                      </button>
                    )}
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
