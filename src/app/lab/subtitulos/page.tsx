'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function SubtitulosMobilePage() {
  const [ipAddress, setIpAddress] = useState('');
  const [port, setPort] = useState('3000');
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

  // Leer IP guardada en localStorage o parámetro URL (?ip=192.168.1.8)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryIp = params.get('ip');
    const queryPort = params.get('port');

    if (queryIp) {
      setIpAddress(queryIp);
      localStorage.setItem('subtitulos_laptop_ip', queryIp);
    } else {
      const savedIp = localStorage.getItem('subtitulos_laptop_ip');
      if (savedIp) setIpAddress(savedIp);
    }

    if (queryPort) {
      setPort(queryPort);
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
    if (!ipAddress) {
      setErrorMsg('Por favor ingresa la IP local de tu portátil.');
      return;
    }

    setErrorMsg(null);
    localStorage.setItem('subtitulos_laptop_ip', ipAddress);

    try {
      // ws://<ip_portatil>:<puerto>
      const wsUrl = `ws://${ipAddress.trim()}:${port.trim()}`;
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
        setErrorMsg(`No se pudo conectar a ${wsUrl}. Verifica que estés en la misma red Wi-Fi y que el servidor esté activo.`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'partial') {
            setLastPartial(data.text);
          } else if (data.type === 'confirmed') {
            setConfirmedList((prev) => [...prev.slice(-4), data.text]);
            setLastPartial('');
          }
        } catch (e) {
          // Ignorar mensajes no JSON
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
      // Fragmentos de 2048 muestras a 16kHz = ~128 ms de latencia
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

        // Enviar audio en PCM al portátil
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 flex flex-col items-center justify-start">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Cabecera */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-sky-400">Micrófono Móvil para Subtítulos</h1>
          <p className="text-xs text-slate-400">Captura de voz desde Android hacia el portátil</p>
        </div>

        {/* Estado y Configuración IP */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Estado:</span>
            <span
              className={`px-2.5 py-1 rounded-full font-semibold ${
                isConnected ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
              }`}
            >
              {isConnected ? '● Enlazado al portátil' : '○ Desconectado'}
            </span>
          </div>

          {!isConnected ? (
            <div className="space-y-2">
              <label className="text-xs text-slate-400">IP local del portátil:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="Ej: 192.168.1.8"
                  className="flex-1 bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                />
                <button
                  onClick={connectWebSocket}
                  className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                >
                  Conectar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">IP: {ipAddress}:{port}</span>
              <button
                onClick={disconnectWebSocket}
                className="text-xs text-red-400 hover:text-red-300 underline"
              >
                Cambiar IP / Desconectar
              </button>
            </div>
          )}
        </div>

        {/* Errores */}
        {errorMsg && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-xs p-3 rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Botón principal de Micrófono */}
        <div className="flex flex-col items-center gap-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={!isConnected}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition ${
                isConnected
                  ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>🎤</span> Hablar ahora
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white shadow-lg shadow-red-900/40 transition"
            >
              <span>⏹</span> Detener captura
            </button>
          )}

          {/* Vúmetro de audio */}
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-75"
              style={{ width: `${volumeLevel}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-500">
            {isRecording ? 'Transmitiendo voz al portátil en tiempo real...' : 'Micrófono en pausa'}
          </span>
        </div>

        {/* Retroalimentación de lo que se está transcribiendo */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 min-h-[100px] flex flex-col justify-end space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
            Lo que el portátil está transcribiendo:
          </span>
          <div className="text-sm leading-relaxed">
            {confirmedList.map((c, i) => (
              <span key={i} className="text-slate-300 mr-1.5">{c}</span>
            ))}
            {lastPartial && (
              <span className="text-sky-400 italic font-medium">{lastPartial}</span>
            )}
            {!confirmedList.length && !lastPartial && (
              <span className="text-slate-600 italic">Pulsa &quot;Hablar ahora&quot; y di algo...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
