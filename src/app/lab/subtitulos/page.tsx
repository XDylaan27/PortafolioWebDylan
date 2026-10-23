'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, ShieldCheck, Radio, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SubtitulosMobilePage() {
  const [targetServer, setTargetServer] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [lastPartial, setLastPartial] = useState('');
  const [confirmedList, setConfirmedList] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Leer parámetro tunnel o ip desde la URL o localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryTunnel = params.get('tunnel');
    const queryIp = params.get('ip');

    if (queryTunnel) {
      setTargetServer(queryTunnel);
      localStorage.setItem('subtitulos_server_target', queryTunnel);
    } else if (queryIp) {
      setTargetServer(queryIp);
      localStorage.setItem('subtitulos_server_target', queryIp);
    } else {
      const saved = localStorage.getItem('subtitulos_server_target');
      if (saved) setTargetServer(saved);
      else setTargetServer('192.168.1.8');
    }
  }, []);

  // Conversión Float32 a Int16 PCM (16 kHz Little Endian)
  const floatToInt16PCM = (float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const connectWebSocket = () => {
    if (!targetServer) {
      setErrorMsg('Por favor ingresa la dirección o túnel del portátil.');
      return;
    }

    setErrorMsg(null);
    localStorage.setItem('subtitulos_server_target', targetServer);

    try {
      let wsUrl = targetServer.trim();

      // Si es una URL https:// de túnel (ej: https://xxx.loca.lt)
      if (wsUrl.startsWith('https://')) {
        wsUrl = wsUrl.replace('https://', 'wss://');
      } else if (wsUrl.startsWith('http://')) {
        wsUrl = wsUrl.replace('http://', 'ws://');
      } else if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
        // Es una IP o dominio sin protocolo
        if (wsUrl.includes('loca.lt') || wsUrl.includes('trycloudflare')) {
          wsUrl = `wss://${wsUrl}`;
        } else {
          // IP local
          const port = wsUrl.includes(':') ? '' : ':3000';
          wsUrl = `ws://${wsUrl}${port}`;
        }
      }

      console.log('Conectando WebSocket a:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setErrorMsg(null);
      };

      ws.onclose = () => {
        setIsConnected(false);
        stopRecording();
      };

      ws.onerror = () => {
        setErrorMsg(`No se pudo conectar a ${wsUrl}. Verifica que la app de subtítulos esté abierta en el portátil.`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'partial') {
            setLastPartial(data.text);
          } else if (data.type === 'confirmed') {
            setConfirmedList((prev) => [...prev.slice(-3), data.text]);
            setLastPartial('');
          }
        } catch {
          // Ignorar
        }
      };

      wsRef.current = ws;
    } catch (err: any) {
      setErrorMsg('Error de conexión: ' + err.message);
    }
  };

  const disconnectWebSocket = () => {
    stopRecording();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
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
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        setVolumeLevel(Math.min(100, Math.round(rms * 450)));

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const pcmData = floatToInt16PCM(inputData);
          wsRef.current.send(pcmData);
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      setIsRecording(true);
    } catch (err: any) {
      setErrorMsg('Error accediendo al micrófono: ' + err.message);
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
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
    }
    setIsRecording(false);
    setVolumeLevel(0);
  };

  return (
    <div className="min-h-[calc(100vh-50px)] bg-neutral-950 text-neutral-100 p-4 sm:p-6 flex flex-col items-center justify-start">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-6">
        
        {/* Cabecera */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sky-400 font-mono text-xs uppercase tracking-wider">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Transmisor de Voz Móvil</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Micrófono para Subtítulos</h1>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Envía tu voz en tiempo real para mostrar los subtítulos sobre tu portátil.
          </p>
        </div>

        {/* Estado y Conexión */}
        <div className="bg-neutral-950/80 p-4 rounded-xl border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-mono">Estado de enlace:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono font-medium text-[11px] ${
                isConnected
                  ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/80'
                  : 'bg-red-950/70 text-red-400 border border-red-800/80'
              }`}
            >
              {isConnected ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertCircle className="w-3 h-3 text-red-400" />}
              {isConnected ? 'Conectado al portátil' : 'Desconectado'}
            </span>
          </div>

          {!isConnected ? (
            <div className="space-y-2 pt-1">
              <label className="text-xs text-neutral-400 font-mono">Túnel Seguro WSS o IP del Portátil:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetServer}
                  onChange={(e) => setTargetServer(e.target.value)}
                  placeholder="https://xxx.loca.lt o 192.168.1.8"
                  className="flex-1 bg-neutral-900 border border-neutral-700 px-3 py-2 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500 transition"
                />
                <button
                  onClick={connectWebSocket}
                  className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Conectar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-neutral-400 font-mono truncate max-w-[200px]">
                {targetServer}
              </span>
              <button
                onClick={disconnectWebSocket}
                className="text-xs text-neutral-400 hover:text-red-400 underline font-mono transition cursor-pointer"
              >
                Desconectar
              </button>
            </div>
          )}
        </div>

        {/* Errores */}
        {errorMsg && (
          <div className="bg-red-950/40 border border-red-800/60 text-red-300 text-xs p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Botón de Grabación */}
        <div className="flex flex-col items-center gap-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={!isConnected}
              className={`w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2.5 shadow-lg transition cursor-pointer ${
                isConnected
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98]'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
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
              <span>Nivel de audio</span>
              <span>{isRecording ? 'Transmitiendo' : 'En espera'}</span>
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
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-medium">
              Monitor de transcripción
            </span>
            <span className="flex items-center gap-1 text-[10px] text-neutral-500 font-mono">
              <ShieldCheck className="w-3 h-3 text-sky-400" />
              <span>Flotando en PC</span>
            </span>
          </div>

          <div className="text-sm leading-relaxed">
            {confirmedList.map((chunk, idx) => (
              <span key={idx} className="text-neutral-300 mr-1.5">{chunk}</span>
            ))}
            {lastPartial && (
              <span className="text-sky-400 font-medium italic">{lastPartial}</span>
            )}
            {!confirmedList.length && !lastPartial && (
              <span className="text-neutral-600 italic text-xs">
                Inicia la captura y habla al micrófono...
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
