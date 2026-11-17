'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, Send } from 'lucide-react';
import { disablePushTopic, enablePushTopic, syncPushTopic, testPushTopic, type PushTopic } from '@/lib/push';

export default function PushControls({ userId, topic = 'orders' }: { userId: string; topic?: PushTopic }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Activa los avisos de este proyecto en cada dispositivo donde quieras recibirlos.');
  const [failed, setFailed] = useState(false);

  const sync = useCallback(async () => {
    try {
      setEnabled(await syncPushTopic(userId, topic));
    } catch {
      setEnabled(false);
    }
  }, [userId, topic]);

  useEffect(() => {
    void sync();
    const onVisibility = () => { if (document.visibilityState === 'visible') void sync(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [sync]);

  const act = async (action: 'enable' | 'disable' | 'test') => {
    setBusy(true);
    setFailed(false);
    try {
      if (action === 'disable') {
        await disablePushTopic(topic);
        setEnabled(false);
        setMessage('Notificaciones desactivadas en este dispositivo.');
      } else {
        if (action === 'test') await testPushTopic(userId, topic);
        else await enablePushTopic(userId, topic);
        setEnabled(true);
        setMessage(action === 'test' ? 'Prueba enviada. Comprueba la notificación del sistema.' : 'Recibirás avisos de este proyecto aunque cierres la página. El envío puede tardar aproximadamente un minuto.');
      }
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : 'No se pudieron activar las notificaciones.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={() => void act(enabled ? 'disable' : 'enable')} className="inline-flex items-center gap-2 rounded border border-neutral-700 px-3 py-2 text-xs text-neutral-200 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : enabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {enabled ? 'Desactivar en este dispositivo' : 'Activar notificaciones'}
        </button>
        <button type="button" disabled={busy} onClick={() => void act('test')} className="inline-flex items-center gap-2 rounded border border-neutral-700 px-3 py-2 text-xs text-neutral-200 disabled:opacity-50">
          <Send className="h-4 w-4" /> Probar notificación push
        </button>
        <span className="text-xs text-neutral-400">{enabled ? 'Este dispositivo está suscrito' : 'Este dispositivo no está suscrito'}</span>
      </div>
      <p role={failed ? 'alert' : 'status'} className={`text-xs ${failed ? 'text-amber-300' : 'text-neutral-400'}`}>{message}</p>
      <p className="text-xs text-neutral-500">En iPhone, añade la web a la pantalla de inicio. Revisa también los permisos del sistema y el modo No molestar.</p>
    </div>
  );
}
