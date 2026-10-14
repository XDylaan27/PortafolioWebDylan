'use client';

import React, { useState } from 'react';
import { Database, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SupabaseKeepAlive() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [latency, setLatency] = useState<number | null>(null);

  const handlePing = async () => {
    setLoading(true);
    setStatus('idle');
    setMessage('');
    try {
      const res = await fetch('/api/supabase-ping');
      const data = await res.json();

      if (data.success) {
        setStatus('success');
        setLatency(data.latencyMs);
        setMessage(`Despierta y activa (${data.latencyMs}ms)`);
      } else {
        setStatus('error');
        setMessage(data.error || 'Error en la respuesta');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePing}
        disabled={loading}
        title="Hacer ping manual a Supabase para evitar congelamiento"
        className="group relative flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono border border-neutral-300 dark:border-neutral-800 rounded bg-neutral-100/80 dark:bg-neutral-900/60 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors disabled:opacity-50"
      >
        <Database className="w-3 h-3 text-emerald-500" />
        <span>DB Ping</span>
        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-300'}`} />
      </button>

      {status === 'success' && (
        <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-500 animate-fade-in">
          <CheckCircle2 className="w-3 h-3" />
          <span>{message}</span>
        </span>
      )}

      {status === 'error' && (
        <span className="flex items-center gap-1 text-[11px] font-mono text-rose-500 animate-fade-in" title={message}>
          <AlertCircle className="w-3 h-3" />
          <span>Fallo ({message.slice(0, 20)}...)</span>
        </span>
      )}
    </div>
  );
}
