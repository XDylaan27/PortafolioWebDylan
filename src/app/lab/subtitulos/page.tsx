'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  AlertCircle,
  Sliders,
  Maximize2,
  Minimize2,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  AlignCenter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SubtitulosMobilePage() {
  const [roomCode, setRoomCode] = useState('DYLAN');
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [lastPartial, setLastPartial] = useState('');
  const [confirmedList, setConfirmedList] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Configuraciones de los subtítulos en el portátil
  const [fontSize, setFontSize] = useState(24);
  const [bgOpacity, setBgOpacity] = useState(0.7);
  const [bgColor, setBgColor] = useState('#0f172a');
  const [textColor, setTextColor] = useState('#ffffff');
  const [position, setPosition] = useState<'bottom' | 'middle' | 'top'>('bottom');
  const [maxWords, setMaxWords] = useState(15);
  const [showSettings, setShowSettings] = useState(false);

  const channelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    const savedRoom = localStorage.getItem('subtitulos_room_code');
    if (savedRoom) setRoomCode(savedRoom);

    // Auto-conectar por defecto a la sala segura
    connectToRoom(savedRoom || 'DYLAN');

    return () => {
      disconnect();
    };
  }, []);

  const connectToRoom = (code: string) => {
    if (!code) return;
    const cleanCode = code.trim().toUpperCase();
    setRoomCode(cleanCode);
    localStorage.setItem('subtitulos_room_code', cleanCode);

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelName = `subtitulos_room_${cleanCode.toLowerCase()}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { ack: false, self: false } },
    });

    channel
      .on('broadcast', { event: 'subtitle_feedback' }, ({ payload }) => {
        if (payload.type === 'partial') {
          setLastPartial(payload.text);
        } else if (payload.type === 'confirmed') {
          setConfirmedList((prev) => [...prev.slice(-3), payload.text]);
          setLastPartial('');
        }
      })
      .on('broadcast', { event: 'pc_pong' }, () => {
        setIsConnected(true);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setErrorMsg(null);
          // Notificar presencia al PC
          channel.send({ type: 'broadcast', event: 'mobile_ping', payload: {} });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;
  };

  const disconnect = () => {
    stopRecording();
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsConnected(false);
  };

  // Enviar cambios de personalización al portátil
  const broadcastSettings = (overrides: Partial<any> = {}) => {
    if (!channelRef.current) return;
    const current = {
      fontSize,
      bgOpacity,
      bgColor,
      textColor,
      position,
      maxWords,
      ...overrides,
    };
    channelRef.current.send({
      type: 'broadcast',
      event: 'settings_update',
      payload: { settings: current },
    });
  };

  // Conversión Float32 a Int16 Base64 para transmisión rápida y segura
  const float32ToBase64Int16 = (float32Array: Float32Array): string => {
    const len = float32Array.length;
    const int16Array = new Int16Array(len);
    for (let i = 0; i < len; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const byteLen = uint8Array.byteLength;
    for (let i = 0; i < byteLen; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return window.btoa(binary);
  };

  const startRecording = async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      // Chunks de ~128 ms para mínima latencia
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Medidor de volumen
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        setVolumeLevel(Math.min(100, Math.round(rms * 450)));

        // Transmitir fragmento de audio al PC
        if (channelRef.current) {
          const base64Audio = float32ToBase64Int16(inputData);
          channelRef.current.send({
            type: 'broadcast',
            event: 'audio_chunk',
            payload: { base64: base64Audio },
          });
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      setIsRecording(true);
    } catch (err: any) {
      setErrorMsg('Error de micrófono: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'audio_stop',
        payload: {},
      });
    }
    setIsRecording(false);
    setVolumeLevel(0);
  };

  return (
    <div className="min-h-[calc(100vh-50px)] bg-neutral-950 text-neutral-100 p-4 sm:p-6 flex flex-col items-center justify-start">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-6">
        
        {/* Cabecera */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sky-400 font-mono text-xs uppercase tracking-wider">
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Conexión Cifrada SSL</span>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Estilo</span>
            </button>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Control Remoto de Subtítulos</h1>
          <p className="text-xs text-neutral-400">Habla y personaliza el aspecto en la pantalla de tu portátil.</p>
        </div>

        {/* Estado y Código de Emparejamiento */}
        <div className="bg-neutral-950/80 p-4 rounded-xl border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-mono">Canal Seguro:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono font-medium text-[11px] ${
                isConnected
                  ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/80'
                  : 'bg-amber-950/70 text-amber-400 border border-amber-800/80'
              }`}
            >
              {isConnected ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {isConnected ? 'Enlace Directo Activo' : 'Conectando...'}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <label className="text-xs text-neutral-400 font-mono">Código:</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="DYLAN"
              className="flex-1 bg-neutral-900 border border-neutral-700 px-3 py-1.5 rounded-lg text-sm text-center font-mono font-bold tracking-widest text-sky-400 uppercase focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={() => connectToRoom(roomCode)}
              className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer"
            >
              Unir
            </button>
          </div>
        </div>

        {/* Panel Desplegable de Personalización en Vivo */}
        {showSettings && (
          <div className="bg-neutral-950/90 border border-sky-900/50 rounded-xl p-4 space-y-4 text-xs font-mono">
            <div className="font-bold text-sky-400 flex items-center justify-between">
              <span>Personalizar Ventana en Pantalla</span>
              <span className="text-[10px] text-neutral-400">En vivo</span>
            </div>

            {/* Posición de la ventana */}
            <div className="space-y-1.5">
              <label className="text-neutral-400">Posición en la pantalla:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setPosition('top');
                    broadcastSettings({ position: 'top' });
                  }}
                  className={`py-1.5 rounded flex items-center justify-center gap-1 border ${
                    position === 'top' ? 'bg-sky-950 border-sky-500 text-sky-400' : 'bg-neutral-900 border-neutral-800'
                  }`}
                >
                  <ArrowUp className="w-3 h-3" /> Arriba
                </button>
                <button
                  onClick={() => {
                    setPosition('middle');
                    broadcastSettings({ position: 'middle' });
                  }}
                  className={`py-1.5 rounded flex items-center justify-center gap-1 border ${
                    position === 'middle' ? 'bg-sky-950 border-sky-500 text-sky-400' : 'bg-neutral-900 border-neutral-800'
                  }`}
                >
                  <AlignCenter className="w-3 h-3" /> Centro
                </button>
                <button
                  onClick={() => {
                    setPosition('bottom');
                    broadcastSettings({ position: 'bottom' });
                  }}
                  className={`py-1.5 rounded flex items-center justify-center gap-1 border ${
                    position === 'bottom' ? 'bg-sky-950 border-sky-500 text-sky-400' : 'bg-neutral-900 border-neutral-800'
                  }`}
                >
                  <ArrowDown className="w-3 h-3" /> Abajo
                </button>
              </div>
            </div>

            {/* Tamaño de Fuente */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-400">Tamaño de letra:</span>
                <span className="text-white font-bold">{fontSize}px</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const next = Math.max(16, fontSize - 2);
                    setFontSize(next);
                    broadcastSettings({ fontSize: next });
                  }}
                  className="flex-1 py-1.5 bg-neutral-900 border border-neutral-800 rounded hover:bg-neutral-800 flex items-center justify-center gap-1"
                >
                  <Minimize2 className="w-3 h-3" /> Reducir
                </button>
                <button
                  onClick={() => {
                    const next = Math.min(42, fontSize + 2);
                    setFontSize(next);
                    broadcastSettings({ fontSize: next });
                  }}
                  className="flex-1 py-1.5 bg-neutral-900 border border-neutral-800 rounded hover:bg-neutral-800 flex items-center justify-center gap-1"
                >
                  <Maximize2 className="w-3 h-3" /> Aumentar
                </button>
              </div>
            </div>

            {/* Límite de palabras en pantalla */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-400">Cantidad de palabras visibles:</span>
                <span className="text-white font-bold">{maxWords}</span>
              </div>
              <input
                type="range"
                min="6"
                max="30"
                step="2"
                value={maxWords}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMaxWords(val);
                  broadcastSettings({ maxWords: val });
                }}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Opacidad del Fondo */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-400">Opacidad del fondo:</span>
                <span className="text-white font-bold">{Math.round(bgOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={bgOpacity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setBgOpacity(val);
                  broadcastSettings({ bgOpacity: val });
                }}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Color del Fondo */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-neutral-400">Color de fondo:</span>
              <div className="flex gap-2">
                {['#0f172a', '#000000', '#1e1b4b', '#064e3b'].map((col) => (
                  <button
                    key={col}
                    onClick={() => {
                      setBgColor(col);
                      broadcastSettings({ bgColor: col });
                    }}
                    style={{ backgroundColor: col }}
                    className={`w-6 h-6 rounded-full border-2 transition ${
                      bgColor === col ? 'border-sky-400 scale-110' : 'border-neutral-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Errores */}
        {errorMsg && (
          <div className="bg-red-950/40 border border-red-800/60 text-red-300 text-xs p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Botón Principal de Grabación */}
        <div className="flex flex-col items-center gap-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2.5 shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98] transition cursor-pointer"
            >
              <Mic className="w-5 h-5" />
              <span>Iniciar captura de voz</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2.5 bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50 active:scale-[0.98] transition cursor-pointer"
            >
              <MicOff className="w-5 h-5 animate-pulse" />
              <span>Detener captura</span>
            </button>
          )}

          {/* Vúmetro */}
          <div className="w-full space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
              <span>Nivel de micrófono</span>
              <span>{isRecording ? 'Transmitiendo' : 'En pausa'}</span>
            </div>
            <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800">
              <div
                className="bg-emerald-500 h-full transition-all duration-75"
                style={{ width: `${volumeLevel}%` }}
              />
            </div>
          </div>
        </div>

        {/* Monitor local en el celular */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 min-h-[90px] flex flex-col justify-between space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-medium">
            Lo que se proyecta en tu portátil:
          </span>

          <div className="text-sm leading-relaxed">
            {confirmedList.map((chunk, idx) => (
              <span key={idx} className="text-neutral-300 mr-1.5">{chunk}</span>
            ))}
            {lastPartial && (
              <span className="text-sky-400 font-medium italic">{lastPartial}</span>
            )}
            {!confirmedList.length && !lastPartial && (
              <span className="text-neutral-600 italic text-xs">
                Inicia la captura y habla...
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
