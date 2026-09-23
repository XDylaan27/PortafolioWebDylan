'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Trophy,
  Target,
  KeyRound,
  User,
  Plus,
  ArrowRight,
  ShieldCheck,
  Users,
  Eye,
  EyeOff,
  History,
  AlertCircle,
  Radio,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  X
} from 'lucide-react';

interface BetRoomSummary {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  creator_name: string;
  status: 'open' | 'finished';
  final_score: number | null;
  created_at: string;
  participantsCount: number;
}

interface RecentRoom {
  code: string;
  title: string;
  role: 'creator' | 'participant';
  timestamp: number;
}

export default function ApuestaPuntajeHome() {
  const router = useRouter();

  // Lista de todas las apuestas desde la base de datos
  const [allRooms, setAllRooms] = useState<BetRoomSummary[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  // Filtros de búsqueda
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'finished'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Estado del modal/acordeón de creación
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Estado del formulario de creación
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado de unión rápida por código
  const [quickCode, setQuickCode] = useState('');
  const [quickCodeError, setQuickCodeError] = useState<string | null>(null);

  // Historial local
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);

  // Cargar lista de todas las apuestas
  const fetchAllRooms = useCallback(async () => {
    try {
      setRoomsError(null);
      const res = await fetch('/api/bets');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudieron cargar las apuestas.');
      }
      setAllRooms(data.rooms || []);
    } catch (err: any) {
      setRoomsError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    fetchAllRooms();

    // Comprobar si en la URL viene ?create=true
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('create') === 'true') {
        setShowCreateForm(true);
      }
    }

    // Cargar historial local
    try {
      const stored = localStorage.getItem('bet_recent_rooms');
      if (stored) {
        setRecentRooms(JSON.parse(stored));
      }
    } catch {
      // Ignorar errores de localStorage
    }
  }, [fetchAllRooms]);

  // Suscripción en tiempo real a nuevas salas o cambios de estado
  useEffect(() => {
    const channel = supabase
      .channel('public_bet_rooms_list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bet_rooms' },
        () => {
          fetchAllRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllRooms]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Por favor escribe un nombre para la apuesta.');
      return;
    }

    if (!password.trim() || password.trim().length < 3) {
      setErrorMessage('La contraseña debe tener al menos 3 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          creatorName,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo crear la sala');
      }

      // Guardar en historial local como creador
      const updatedHistory: RecentRoom[] = [
        {
          code: data.code,
          title: title.trim(),
          role: 'creator',
          timestamp: Date.now(),
        },
        ...recentRooms.filter((r) => r.code !== data.code).slice(0, 4),
      ];

      localStorage.setItem('bet_recent_rooms', JSON.stringify(updatedHistory));
      localStorage.setItem(`bet_admin_${data.code}`, password.trim());

      router.push(`/lab/apuesta-puntaje/${data.code}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión al crear la sala.');
      setIsSubmitting(false);
    }
  };

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickCodeError(null);
    const cleaned = quickCode.trim().toUpperCase();
    if (!cleaned) {
      setQuickCodeError('Ingresa un código de sala.');
      return;
    }
    router.push(`/lab/apuesta-puntaje/${cleaned}`);
  };

  // Filtrado de salas
  const filteredRooms = allRooms.filter((room) => {
    const matchesFilter =
      activeFilter === 'all'
        ? true
        : activeFilter === 'open'
        ? room.status === 'open'
        : room.status === 'finished';

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      query === '' ||
      room.title.toLowerCase().includes(query) ||
      room.code.toLowerCase().includes(query) ||
      room.creator_name.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const openCount = allRooms.filter((r) => r.status === 'open').length;
  const finishedCount = allRooms.filter((r) => r.status === 'finished').length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-800 pb-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-widest">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Sincronización en Tiempo Real</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-serif-editorial font-light tracking-tight text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 md:w-10 md:h-10 text-amber-400 shrink-0" />
            <span>Apuestas & Quinielas</span>
          </h1>
          <p className="text-neutral-400 font-serif-editorial text-base md:text-lg max-w-2xl leading-relaxed">
            Explora las salas de apuestas creadas, únete con tu pronóstico secreto o crea una nueva sala con tu contraseña para definir al ganador.
          </p>
        </div>

        {/* Botón de acción principal: Crear Sala */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded bg-white hover:bg-neutral-200 text-neutral-950 font-mono text-xs font-medium transition-colors shadow-sm cursor-pointer"
          >
            {showCreateForm ? (
              <>
                <X className="w-4 h-4" />
                <span>Cerrar Formulario</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-neutral-950" />
                <span>Crear Nueva Apuesta</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Formulario Desplegable para Crear Nueva Apuesta */}
      {showCreateForm && (
        <div className="bg-neutral-900/60 border border-neutral-700/80 rounded-xl p-6 md:p-8 space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="space-y-1">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Crear Nueva Sala de Apuesta</span>
              </h2>
              <p className="text-xs text-neutral-400">
                Define el nombre y tu contraseña para resolver la apuesta cuando finalice el evento.
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-neutral-500 hover:text-white p-1 rounded"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-red-300 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreateRoom} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-mono text-neutral-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-neutral-400" />
                <span>Nombre de la Apuesta *</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Final Champions League, Puntos totales..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-neutral-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                <span>Tu Nombre o Apodo (Creador)</span>
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Ej: Dylan (opcional)"
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-neutral-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Contraseña del Administrador *</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Clave para ingresar el resultado final"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-3.5 py-2.5 pr-10 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1 cursor-pointer"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-mono text-neutral-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-neutral-500" />
                <span>Reglas o Detalles (Opcional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Pronostica el puntaje total acumulado al minuto 90"
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 font-sans"
              />
            </div>

            <div className="md:col-span-2 pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white rounded text-xs font-mono transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-neutral-100 hover:bg-white text-neutral-950 font-medium py-2 px-5 rounded text-xs font-mono transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Creando sala...</span>
                ) : (
                  <>
                    <span>Guardar y Obtener Enlace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barra de Acceso Rápido por Código & Historial */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Unirse con Código */}
        <div className="md:col-span-7 bg-neutral-900/30 border border-neutral-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-sky-400" />
              <span>Unirse Directo con Código</span>
            </h3>
            <p className="text-[11px] text-neutral-500">¿Tienes un código de 6 letras? Ingrésalo para entrar directo.</p>
          </div>

          <form onSubmit={handleQuickJoin} className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              maxLength={8}
              value={quickCode}
              onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              className="w-28 uppercase text-center font-mono text-xs bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white placeholder-neutral-600 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="border border-neutral-700 hover:border-neutral-500 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono px-3 py-1.5 rounded transition-colors flex items-center gap-1"
            >
              <span>Entrar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </form>
        </div>

        {/* Historial rápido (si existe) */}
        <div className="md:col-span-5 bg-neutral-900/20 border border-neutral-800/80 rounded-lg p-4 flex items-center justify-between">
          <div className="space-y-0.5 truncate">
            <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-neutral-500" />
              <span>Tus Salas Recientes</span>
            </h4>
            <p className="text-[11px] text-neutral-500 truncate">
              {recentRooms.length > 0
                ? `${recentRooms.length} ${recentRooms.length === 1 ? 'sala guardada' : 'salas guardadas'}`
                : 'Aún no has creado ni participado en salas.'}
            </p>
          </div>

          {recentRooms.length > 0 && (
            <Link
              href={`/lab/apuesta-puntaje/${recentRooms[0].code}`}
              className="text-xs font-mono text-neutral-300 hover:text-white flex items-center gap-1 shrink-0 px-2.5 py-1 bg-neutral-900 rounded border border-neutral-800"
            >
              <span>Última: {recentRooms[0].code}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL: LISTA DE TODAS LAS APUESTAS */}
      <div className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <h2 className="text-base font-medium text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Lista de Todas las Apuestas</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Haz clic en cualquier sala para participar o ver los resultados finales.
            </p>
          </div>

          {/* Filtros de estado */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`text-xs px-3 py-1 font-mono rounded border transition-colors ${
                activeFilter === 'all'
                  ? 'border-neutral-500 bg-neutral-800 text-white font-medium'
                  : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              Todas ({allRooms.length})
            </button>
            <button
              onClick={() => setActiveFilter('open')}
              className={`text-xs px-3 py-1 font-mono rounded border transition-colors flex items-center gap-1.5 ${
                activeFilter === 'open'
                  ? 'border-emerald-600/80 bg-emerald-950/40 text-emerald-300 font-medium'
                  : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Abiertas ({openCount})</span>
            </button>
            <button
              onClick={() => setActiveFilter('finished')}
              className={`text-xs px-3 py-1 font-mono rounded border transition-colors flex items-center gap-1.5 ${
                activeFilter === 'finished'
                  ? 'border-neutral-500 bg-neutral-800 text-white font-medium'
                  : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
              <span>Finalizadas ({finishedCount})</span>
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar apuesta por nombre, creador o código..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 font-sans"
          />
        </div>

        {/* Renderizado de la Lista de Apuestas */}
        {isLoadingRooms ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-neutral-500 animate-spin mx-auto" />
            <p className="text-xs font-mono text-neutral-500">Cargando salas de apuestas...</p>
          </div>
        ) : roomsError ? (
          <div className="p-4 bg-red-950/30 border border-red-800/60 rounded text-red-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{roomsError}</span>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-neutral-800 rounded-xl space-y-3 bg-neutral-900/10">
            <Target className="w-8 h-8 text-neutral-600 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-300">No se encontraron apuestas</p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {searchQuery
                  ? 'Ninguna apuesta coincide con tu búsqueda.'
                  : 'Aún no hay apuestas en esta categoría. ¡Crea la primera ahora!'}
              </p>
            </div>
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-1.5 text-xs font-mono px-3.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear la primera apuesta</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRooms.map((room) => {
              const isOpen = room.status === 'open';
              return (
                <article
                  key={room.id}
                  className="p-5 rounded-lg border border-neutral-800/80 bg-neutral-900/30 hover:bg-neutral-900/60 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-2.5">
                    {/* Badge de estado y código */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400">
                        CÓDIGO: <strong className="text-white">{room.code}</strong>
                      </span>

                      {isOpen ? (
                        <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>Abierta</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 px-2 py-0.5 rounded bg-neutral-800/60 border border-neutral-700/60">
                          <CheckCircle2 className="w-3 h-3 text-neutral-400" />
                          <span>Finalizada</span>
                        </span>
                      )}
                    </div>

                    {/* Título y descripción */}
                    <div className="space-y-1">
                      <h3 className="text-base font-medium text-white group-hover:text-emerald-400 transition-colors">
                        {room.title}
                      </h3>
                      {room.description && (
                        <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                          {room.description}
                        </p>
                      )}
                    </div>

                    {/* Si finalizó, mostrar resultado */}
                    {!isOpen && room.final_score !== null && (
                      <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono flex items-center justify-between text-neutral-300">
                        <span className="text-neutral-500">Resultado Oficial:</span>
                        <strong className="text-white text-sm">{room.final_score}</strong>
                      </div>
                    )}
                  </div>

                  {/* Metadata y botón de entrada */}
                  <div className="pt-3 border-t border-neutral-800/70 flex items-center justify-between text-xs font-mono text-neutral-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="truncate max-w-[100px]">{room.creator_name}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{room.participantsCount}</span>
                      </span>
                    </div>

                    <Link
                      href={`/lab/apuesta-puntaje/${room.code}`}
                      className="inline-flex items-center gap-1 text-xs text-neutral-300 group-hover:text-white group-hover:translate-x-0.5 transition-all font-medium"
                    >
                      <span>{isOpen ? 'Participar' : 'Ver Ganador'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
