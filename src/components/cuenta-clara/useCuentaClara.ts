'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { CuentaState } from '@/lib/cuenta-clara';

export function useCuentaClara() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [state, setState] = useState<CuentaState | null>(null);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState<'connecting' | 'live' | 'offline'>('connecting');
  const currentUser = useRef<string | undefined>(undefined);
  const version = useRef(0);
  currentUser.current = user?.id;

  const refresh = useCallback(async () => {
    const uid = currentUser.current;
    if (!uid) return;
    const request = ++version.current;
    const { data, error: rpcError } = await supabase.rpc('cc_state');
    if (request !== version.current || uid !== currentUser.current) return;
    if (rpcError) { setError(rpcError.message); return; }
    setState(data as CuentaState);
    setError('');
  }, []);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => { if (active) setUser(data.session?.user ?? null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    setState(null);
    setError('');
    version.current++;
    if (!user?.id) return;
    void refresh();
    const channel = supabase.channel(`cuenta-clara-${user.id}`);
    for (const table of ['cc_members', 'cc_join_requests', 'cc_movements', 'cc_void_requests', 'cc_events']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => void refresh());
    }
    channel.subscribe((status) => {
      setConnection(status === 'SUBSCRIBED' ? 'live' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED' ? 'offline' : 'connecting');
      if (status === 'SUBSCRIBED') void refresh();
    });
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const online = () => { setConnection('connecting'); void refresh(); };
    const offline = () => setConnection('offline');
    const interval = setInterval(visible, 30000);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      version.current++;
      void supabase.removeChannel(channel);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [user?.id, refresh]);

  return { user, state, error, connection, refresh };
}
