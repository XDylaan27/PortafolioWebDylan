'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  Target,
  KeyRound,
  User,
  Plus,
  ArrowRight,
  ShieldCheck,
  Users,
  EyeOff,
  History,
  AlertCircle,
  Radio,
  FileText
} from 'lucide-react';

interface RecentRoom {
  code: string;
  title: string;
  role: 'creator' | 'participant';
  timestamp: number;
}

export default function ApuestaPuntajeHome() {
  const router = useRouter();

  // Estado del formulario de creación
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado de unión rápida
  const [quickCode, setQuickCode] = useState('');
  const [quickCodeError, setQuickCodeError] = useState<string | null>(null);

  // Historial de salas
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bet_recent_rooms');
      if (stored) {
        setRecentRooms(JSON.parse(stored));
      }
    } catch {
      // Ignorar errores de localStorage
    }
  }, []);

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

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
      {/* Encabezado del Proyecto */}
      <div className="space-y-4 border-b border-neutral-800 pb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-widest">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Tiempo Real &bull; Supabase Sync</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-serif-editorial font-light tracking-tight text-white flex items-center gap-3">
          <Trophy className="w-8 h-8 md:w-10 md:h-10 text-amber-400 shrink-0" />
          <span>Apuesta de Puntaje en Vivo</span>
        </h1>
        <p className="text-neutral-400 font-serif-editorial text-base md:text-lg max-w-2xl leading-relaxed">
          Crea una sala de pronósticos para partidos, torneos o desafíos. Cada participante registra su puntaje en secreto y, al finalizar, el creador revela el resultado oficial coronando a quien estuvo más cerca.
        </p>
      </div>

      {/* Grid: Crear Apuesta / Unirse */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Formulario de Creación */}
        <div className="md:col-span-7 bg-neutral-900/50 border border-neutral-800 rounded-lg p-6 md:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Crear Nueva Apuesta</span>
            </h2>
            <p className="text-xs text-neutral-400">
              Define las reglas y tu contraseña para resolver la apuesta cuando termine.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-red-300 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div className="space-y-1.5">
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
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Clave para ingresar el resultado final"
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 font-mono"
              />
              <p className="text-[11px] text-neutral-500 font-mono">
                Solo con esta clave podrás ingresar el marcador oficial y revelar al ganador.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-neutral-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-neutral-500" />
                <span>Detalles o Reglas (Opcional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Adivina el puntaje exacto acumulado al minuto 90"
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-neutral-100 hover:bg-white text-neutral-950 font-medium py-2.5 px-4 rounded text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Creando sala...</span>
              ) : (
                <>
                  <span>Crear Sala y Obtener Enlace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Columna Derecha: Unirse con Código & Historial */}
        <div className="md:col-span-5 space-y-6">
          {/* Card: Unirse con Código */}
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-6 space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <Target className="w-4 h-4 text-sky-400" />
              <span>Unirse con Código</span>
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Si un amigo te compartió un código de sala de 6 letras, ingrésalo aquí.
            </p>

            <form onSubmit={handleQuickJoin} className="space-y-3">
              <input
                type="text"
                maxLength={8}
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
                placeholder="CÓDIGO (EJ: B7X9Q2)"
                className="w-full uppercase tracking-widest text-center font-mono text-base bg-neutral-950 border border-neutral-800 rounded px-3.5 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-sky-500"
              />
              {quickCodeError && (
                <p className="text-xs text-red-400 font-mono">{quickCodeError}</p>
              )}
              <button
                type="submit"
                className="w-full border border-neutral-700 hover:border-neutral-500 bg-neutral-800/60 hover:bg-neutral-800 text-neutral-200 text-xs font-mono py-2 rounded transition-colors flex items-center justify-center gap-2"
              >
                <span>Entrar a la Sala</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Card: Historial Local */}
          {recentRooms.length > 0 && (
            <div className="bg-neutral-900/20 border border-neutral-800/80 rounded-lg p-5 space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-neutral-500" />
                <span>Salas Recientes</span>
              </h4>
              <div className="divide-y divide-neutral-800 text-xs">
                {recentRooms.map((r) => (
                  <Link
                    key={r.code}
                    href={`/lab/apuesta-puntaje/${r.code}`}
                    className="py-2.5 flex items-center justify-between group hover:text-white transition-colors"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium text-neutral-300 group-hover:text-white truncate max-w-[170px]">
                        {r.title}
                      </p>
                      <p className="font-mono text-[10px] text-neutral-500">
                        Código: {r.code} &bull; {r.role === 'creator' ? 'Creador' : 'Participante'}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-300 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Características Clave */}
          <div className="border border-neutral-800/60 rounded-lg p-5 space-y-3 bg-neutral-950">
            <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-500">
              Mecánica del Juego
            </h4>
            <div className="space-y-2.5 text-xs text-neutral-400">
              <div className="flex items-start gap-2.5">
                <EyeOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Puntajes ocultos durante la ronda para evitar copias.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Users className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>Una sola participación por nombre en cada sala.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>El creador revela el resultado oficial con su clave.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Radio className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Actualización automática en todas las pantallas en vivo.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
