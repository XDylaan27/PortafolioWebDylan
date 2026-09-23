'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';
import { BetRoom, BetParticipant, RankedParticipant } from '@/lib/bets';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Lock,
  LockOpen,
  EyeOff,
  Users,
  User,
  UserCheck,
  Target,
  KeyRound,
  ShieldCheck,
  Copy,
  Check,
  Share2,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Radio,
  FileText
} from 'lucide-react';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default function BetRoomPage({ params }: PageProps) {
  const { code: rawCode } = use(params);
  const roomCode = rawCode?.toUpperCase();

  // Estados de datos
  const [room, setRoom] = useState<BetRoom | null>(null);
  const [participants, setParticipants] = useState<BetParticipant[]>([]);
  const [rankings, setRankings] = useState<RankedParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Estado del participante local
  const [userName, setUserName] = useState('');
  const [userScore, setUserScore] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [myStoredName, setMyStoredName] = useState<string | null>(null);
  const [myStoredScore, setMyStoredScore] = useState<number | null>(null);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  // Estado del creador / resolución
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [finalScoreInput, setFinalScoreInput] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Estado de copiado
  const [copied, setCopied] = useState(false);

  // Función para disparar celebración de confeti (sin emojis)
  const triggerConfetti = () => {
    try {
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        colors: ['#10b981', '#38bdf8', '#f59e0b', '#ec4899', '#ffffff'],
      };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    } catch {
      // Ignorar si falla canvas-confetti
    }
  };

  // Carga de la sala
  const fetchRoomData = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(`/api/bets/${roomCode}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo cargar la sala.');
      }

      setRoom(data.room);
      setParticipants(data.participants || []);
      setRankings(data.rankings || []);

      // Si la sala recién se finalizó y no lo sabíamos, disparar confeti
      if (data.room.status === 'finished') {
        triggerConfetti();
      }
    } catch (err: any) {
      setFetchError(err.message || 'Error al conectar con la sala.');
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [roomCode]);

  // Verificar si ya participó localmente
  useEffect(() => {
    if (!roomCode) return;
    try {
      const voteData = localStorage.getItem(`bet_vote_${roomCode}`);
      if (voteData) {
        const parsed = JSON.parse(voteData);
        setHasVoted(true);
        setMyStoredName(parsed.name);
        setMyStoredScore(parsed.score);
      }

      // Pre-cargar password de admin si fue el creador
      const savedAdminPassword = localStorage.getItem(`bet_admin_${roomCode}`);
      if (savedAdminPassword) {
        setAdminPassword(savedAdminPassword);
        setShowAdminPanel(true);
      }
    } catch {
      // Ignorar
    }
  }, [roomCode]);

  // Carga inicial y suscripción a Supabase Realtime
  useEffect(() => {
    fetchRoomData(true);
  }, [fetchRoomData]);

  useEffect(() => {
    if (!room?.id) return;

    // Crear canal de escucha en tiempo real para esta sala
    const channel = supabase
      .channel(`room_${room.id}`)
      // Escuchar nuevos participantes insertados
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bet_participants',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const newPart = payload.new as BetParticipant;
          setParticipants((prev) => {
            // Evitar duplicados si ya está en la lista
            if (prev.some((p) => p.id === newPart.id)) return prev;
            return [...prev, { ...newPart, predicted_score: null }];
          });
        }
      )
      // Escuchar actualización de la sala (cuando el creador finaliza y define el resultado)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bet_rooms',
          filter: `id=eq.${room.id}`,
        },
        () => {
          // Re-consultar la API para obtener todos los puntajes revelados y los rankings oficiales
          fetchRoomData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, fetchRoomData]);

  // Copiar enlace al portapapeles
  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Compartir nativo en dispositivos móviles
  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: room?.title || 'Apuesta de Puntaje',
          text: `¡Participa en la apuesta "${room?.title}" y coloca tu puntaje pronosticado!`,
          url: window.location.href,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  // Enviar pronóstico de participante
  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVoteError(null);

    if (!userName.trim()) {
      setVoteError('Por favor ingresa tu nombre.');
      return;
    }

    if (userScore === '' || isNaN(Number(userScore))) {
      setVoteError('Ingresa un número válido para tu puntaje.');
      return;
    }

    setIsSubmittingVote(true);

    try {
      const res = await fetch(`/api/bets/${roomCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName.trim(),
          score: Number(userScore),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo registrar la predicción.');
      }

      // Guardar localmente
      const voteRecord = { name: userName.trim(), score: Number(userScore) };
      localStorage.setItem(`bet_vote_${roomCode}`, JSON.stringify(voteRecord));

      // Agregar a historial general como participante
      try {
        const stored = localStorage.getItem('bet_recent_rooms');
        const history = stored ? JSON.parse(stored) : [];
        const updated = [
          {
            code: roomCode,
            title: room?.title || 'Apuesta de Puntaje',
            role: 'participant',
            timestamp: Date.now(),
          },
          ...history.filter((h: any) => h.code !== roomCode).slice(0, 4),
        ];
        localStorage.setItem('bet_recent_rooms', JSON.stringify(updated));
      } catch {}

      setHasVoted(true);
      setMyStoredName(userName.trim());
      setMyStoredScore(Number(userScore));

      // Actualizar lista
      fetchRoomData(false);
    } catch (err: any) {
      setVoteError(err.message || 'Error al enviar tu pronóstico.');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  // Resolver la apuesta (Creador)
  const handleResolveBet = async (e: React.FormEvent) => {
    e.preventDefault();
    setResolveError(null);

    if (!adminPassword.trim()) {
      setResolveError('Ingresa la contraseña del creador.');
      return;
    }

    if (finalScoreInput === '' || isNaN(Number(finalScoreInput))) {
      setResolveError('Ingresa el resultado oficial final.');
      return;
    }

    setIsResolving(true);

    try {
      const res = await fetch(`/api/bets/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: adminPassword.trim(),
          finalScore: Number(finalScoreInput),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo resolver la apuesta.');
      }

      // Guardar contraseña de nuevo para futuras consultas
      localStorage.setItem(`bet_admin_${roomCode}`, adminPassword.trim());

      // Recargar sala completa
      await fetchRoomData(false);
      triggerConfetti();
    } catch (err: any) {
      setResolveError(err.message || 'Error al finalizar la apuesta.');
    } finally {
      setIsResolving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin" />
        <p className="text-sm font-mono text-neutral-400">Cargando sala de apuesta...</p>
      </div>
    );
  }

  if (fetchError || !room) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800 mx-auto flex items-center justify-center text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-medium text-white">Sala no disponible</h2>
          <p className="text-xs text-neutral-400">{fetchError || 'No encontramos esta sala de apuesta.'}</p>
        </div>
        <Link
          href="/lab/apuesta-puntaje"
          className="inline-flex items-center gap-2 text-xs font-mono text-neutral-300 hover:text-white border border-neutral-800 px-4 py-2 rounded bg-neutral-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio</span>
        </Link>
      </div>
    );
  }

  const isFinished = room.status === 'finished';
  const winners = rankings.filter((r) => r.isWinner);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      {/* Barra Superior con Navegación y Acciones de Compartir */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/lab/apuesta-puntaje"
              className="text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Lista de Apuestas</span>
            </Link>
            <span className="text-neutral-700">/</span>
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
              Código: <strong className="text-white tracking-widest">{room.code}</strong>
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif-editorial font-light text-white">
            {room.title}
          </h1>
          {room.description && (
            <p className="text-xs text-neutral-400 font-sans mt-0.5 max-w-xl">
              {room.description}
            </p>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs font-mono px-3.5 py-2 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Enlace copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                <span>Copiar Enlace</span>
              </>
            )}
          </button>

          <button
            onClick={handleShare}
            aria-label="Compartir sala"
            className="p-2 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Indicador de Estado en Vivo */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-neutral-800 bg-neutral-900/30 text-xs font-mono">
        <div className="flex items-center gap-2">
          {isFinished ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Apuesta Finalizada &bull; Resultados Revelados</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Apuesta Abierta &bull; Esperando pronósticos</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-neutral-400">
          <Users className="w-3.5 h-3.5 text-neutral-500" />
          <span>{participants.length} {participants.length === 1 ? 'participante' : 'participantes'}</span>
        </div>
      </div>

      {/* VISTA 1: CUANDO LA APUESTA YA FINALIZÓ (RESULTADOS Y PODIO) */}
      {isFinished && (
        <div className="space-y-8 animate-fadeIn">
          {/* Banner de Resultado Oficial */}
          <div className="p-6 md:p-8 bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl text-center space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-neutral-400 flex items-center justify-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>Resultado Oficial Final</span>
            </span>
            <div className="text-5xl md:text-7xl font-mono font-light text-white tracking-tight">
              {room.final_score}
            </div>
            <p className="text-xs text-neutral-500 font-mono">
              Registrado por {room.creator_name || 'el creador'}
            </p>
          </div>

          {/* Podio / Ganador Destacado */}
          {winners.length > 0 && (
            <div className="p-6 md:p-8 bg-amber-950/20 border border-amber-600/40 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>{winners.length > 1 ? 'Ganadores (Empate en Cercanía)' : 'Ganador de la Apuesta'}</span>
                </span>
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {winners.map((winner) => (
                  <div
                    key={winner.id}
                    className="p-4 bg-neutral-950/80 border border-amber-700/30 rounded-lg flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span className="text-base font-medium text-white">{winner.name}</span>
                      </div>
                      <p className="text-xs font-mono text-neutral-400">
                        Pronosticó: <strong className="text-amber-300">{winner.predicted_score}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {winner.difference === 0 ? '¡Puntaje Exacto!' : `Diferencia: ${winner.difference}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabla de Clasificación Completa */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                <Medal className="w-4 h-4 text-neutral-400" />
                <span>Tabla de Resultados y Cercanía</span>
              </h2>
              <span className="text-xs font-mono text-neutral-500">Ordenado por cercanía al {room.final_score}</span>
            </div>

            <div className="border border-neutral-800 rounded-lg overflow-hidden divide-y divide-neutral-800/80 bg-neutral-900/30">
              <div className="grid grid-cols-12 px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider text-neutral-500 bg-neutral-950">
                <div className="col-span-2">Posición</div>
                <div className="col-span-5">Participante</div>
                <div className="col-span-3 text-right">Pronóstico</div>
                <div className="col-span-2 text-right">Diferencia</div>
              </div>

              {rankings.map((p) => {
                const isFirst = p.rank === 1;
                return (
                  <div
                    key={p.id}
                    className={`grid grid-cols-12 px-4 py-3 text-xs items-center transition-colors ${
                      isFirst ? 'bg-amber-950/10 text-white' : 'text-neutral-300 hover:bg-neutral-900/40'
                    }`}
                  >
                    <div className="col-span-2 font-mono flex items-center gap-1.5">
                      {isFirst ? (
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <span className="text-neutral-500 text-[11px]">#{p.rank}</span>
                      )}
                    </div>
                    <div className="col-span-5 font-medium flex items-center gap-2 truncate">
                      <span>{p.name}</span>
                      {myStoredName === p.name && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                          Tú
                        </span>
                      )}
                    </div>
                    <div className="col-span-3 text-right font-mono font-medium text-white">
                      {p.predicted_score}
                    </div>
                    <div className="col-span-2 text-right font-mono text-neutral-400">
                      {p.difference === 0 ? (
                        <span className="text-emerald-400 font-medium">0</span>
                      ) : (
                        `±${p.difference}`
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/lab/apuesta-puntaje"
              className="inline-flex items-center gap-2 text-xs font-mono text-neutral-200 hover:text-white border border-neutral-700 hover:border-neutral-500 px-4 py-2.5 rounded bg-neutral-900 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la Lista de Apuestas</span>
            </Link>

            <Link
              href="/lab/apuesta-puntaje?create=true"
              className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2.5 rounded bg-neutral-950 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear nueva apuesta</span>
            </Link>
          </div>
        </div>
      )}

      {/* VISTA 2: CUANDO LA APUESTA ESTÁ ABIERTA */}
      {!isFinished && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Columna Izquierda: Formulario de Participación o Tarjeta de Ya Votó */}
          <div className="md:col-span-7 space-y-6">
            {!hasVoted ? (
              <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-6 space-y-5">
                <div className="space-y-1">
                  <h2 className="text-base font-medium text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-sky-400" />
                    <span>Tu Pronóstico</span>
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Ingresa tu nombre y tu puntaje pronosticado. Solo puedes participar una vez.
                  </p>
                </div>

                {voteError && (
                  <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-red-300 text-xs flex items-center gap-2 font-mono">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{voteError}</span>
                  </div>
                )}

                <form onSubmit={handleVoteSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-neutral-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Nombre o Apodo *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Tu nombre completo o apodo"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-neutral-300 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Puntaje Pronosticado *</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={userScore}
                      onChange={(e) => setUserScore(e.target.value)}
                      placeholder="Ej: 85, 3, 102..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 font-mono"
                    />
                  </div>

                  {/* Aviso de Secreto */}
                  <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded flex items-start gap-2.5 text-xs text-neutral-400">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Tu puntaje permanecerá en secreto y protegido. Los demás solo verán tu nombre hasta que el creador finalice la apuesta.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingVote}
                    className="w-full bg-neutral-100 hover:bg-white text-neutral-950 font-medium py-2.5 px-4 rounded text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingVote ? (
                      <span>Registrando pronóstico...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Enviar Pronóstico</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* Tarjeta: Ya Participó */
              <div className="bg-neutral-900/30 border border-neutral-800 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">¡Pronóstico Guardado con Éxito!</h3>
                    <p className="text-xs text-neutral-400 font-mono">Participando como {myStoredName}</p>
                  </div>
                </div>

                <div className="p-4 bg-neutral-950 border border-neutral-800/80 rounded space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-neutral-400">Tu predicción secreta:</span>
                    <strong className="text-white text-sm">{myStoredScore}</strong>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Los demás participantes solo ven tu nombre. El número se revelará cuando se cierre la apuesta.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 pt-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-500" />
                  <span>Esperando a que el creador ingrese el resultado final...</span>
                </div>
              </div>
            )}

            {/* Panel del Creador (Accordion / Desplegable) */}
            <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/20">
              <button
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-mono text-neutral-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>¿Eres el creador de la apuesta? Finalizar</span>
                </div>
                <span className="text-neutral-500">{showAdminPanel ? 'Ocultar' : 'Abrir'}</span>
              </button>

              {showAdminPanel && (
                <div className="p-5 border-t border-neutral-800 space-y-4 bg-neutral-950/60">
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Ingresa tu contraseña de creador y el resultado final oficial para calcular las diferencias y proclamar al ganador.
                  </p>

                  {resolveError && (
                    <div className="p-2.5 bg-red-950/40 border border-red-800/60 rounded text-red-300 text-xs flex items-center gap-2 font-mono">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{resolveError}</span>
                    </div>
                  )}

                  <form onSubmit={handleResolveBet} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-neutral-300 flex items-center gap-1.5">
                        <KeyRound className="w-3 h-3 text-amber-400" />
                        <span>Contraseña del Creador</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Contraseña definida al crear la sala"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-neutral-300 flex items-center gap-1.5">
                        <Target className="w-3 h-3 text-emerald-400" />
                        <span>Resultado Final Oficial</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={finalScoreInput}
                        onChange={(e) => setFinalScoreInput(e.target.value)}
                        placeholder="Marcador o puntaje final exacto"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isResolving}
                      className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isResolving ? (
                        <span>Calculando y revelando...</span>
                      ) : (
                        <>
                          <Trophy className="w-3.5 h-3.5" />
                          <span>Finalizar y Revelar Ganador en Vivo</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Lista de Participantes Conectados */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-neutral-900/30 border border-neutral-800 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Participantes ({participants.length})</span>
                </h3>
                <span className="text-[10px] font-mono text-neutral-500">En tiempo real</span>
              </div>

              {participants.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <User className="w-8 h-8 text-neutral-600 mx-auto" />
                  <p className="text-xs text-neutral-400">Aún no hay participantes en esta sala.</p>
                  <p className="text-[11px] text-neutral-500">Comparte el enlace o sé el primero en votar.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-800/60 max-h-96 overflow-y-auto pr-1">
                  {participants.map((p, index) => (
                    <div
                      key={p.id || index}
                      className="py-2.5 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate max-w-[170px]">
                        <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-mono text-neutral-300 uppercase shrink-0">
                          {p.name.charAt(0)}
                        </div>
                        <span className="font-medium text-neutral-200 truncate">
                          {p.name}
                        </span>
                        {myStoredName === p.name && (
                          <span className="text-[9px] font-mono px-1 rounded bg-neutral-800 text-neutral-400 shrink-0">
                            Tú
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-neutral-500 font-mono text-[11px] shrink-0">
                        <Lock className="w-3 h-3 text-amber-500/80" />
                        <span>Oculto</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tarjeta Informativa de la Sala */}
            <div className="border border-neutral-800/60 rounded-lg p-4 bg-neutral-950 space-y-2 text-xs text-neutral-400">
              <div className="flex items-center gap-2 text-neutral-300 font-mono text-[11px]">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Sincronización Automática</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-normal">
                Esta pantalla se actualizará de forma instantánea cuando el creador ingrese el resultado final. No necesitas recargar el navegador.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
