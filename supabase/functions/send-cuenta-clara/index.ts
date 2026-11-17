import { createClient } from 'npm:@supabase/supabase-js@2.117.0';
import { sendPush, type Subscription } from '../_shared/web-push.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
type Delivery = Subscription & { event_id: string; subscription_id: string; lease_token: string };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Método no permitido.' }, 405);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const body = await request.json().catch(() => ({}));
    const { data: config, error: configError } = await admin.rpc('get_order_push_config');
    if (configError || !config) return reply({ error: 'Servicio no configurado.' }, 503);
    if (body.action === 'test') {
      const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) return reply({ error: 'Inicia sesión.' }, 401);
      const { data: { user }, error: authError } = await admin.auth.getUser(token);
      if (authError || !user) return reply({ error: 'Sesión inválida.' }, 401);
      if (typeof body.endpoint !== 'string') return reply({ error: 'Dispositivo inválido.' }, 400);
      const { data: own, error: ownError } = await admin.from('order_push_subscriptions').select('id').eq('user_id', user.id).eq('endpoint', body.endpoint).maybeSingle();
      if (ownError) throw ownError;
      if (!own) return reply({ error: 'Activa este dispositivo.' }, 403);
      const { data: preference } = await admin.from('push_topic_preferences').select('enabled').eq('subscription_id', own.id).eq('topic', 'cuenta-clara').maybeSingle();
      if (!preference?.enabled) return reply({ error: 'Activa los avisos de Cuenta Clara.' }, 403);
      const { data: subscription, error: subError } = await admin.from('order_push_subscriptions')
        .update({ last_test_at: new Date().toISOString() }).eq('id', own.id)
        .or(`last_test_at.is.null,last_test_at.lt.${new Date(Date.now() - 60000).toISOString()}`)
        .select('id,endpoint,p256dh,auth').maybeSingle();
      if (subError) throw subError;
      if (!subscription) return reply({ error: 'Espera un minuto antes de repetir la prueba.' }, 429);
      const result = await sendPush(subscription, config, { title: 'Cuenta Clara', body: 'Los avisos privados están activos en este dispositivo.', tag: 'test-cuenta-clara', url: '/lab/cuenta-clara' });
      if (result.expired) await admin.from('order_push_subscriptions').delete().eq('id', subscription.id);
      return reply({ success: result.ok }, result.ok ? 200 : 502);
    }
    if (!config.cron_secret || request.headers.get('x-cron-secret') !== config.cron_secret) return reply({ error: 'No autorizado.' }, 401);
    if (body.action === 'health') return reply({ configured: true });
    if (body.action !== 'dispatch') return reply({ error: 'Acción inválida.' }, 400);
    const { data, error } = await admin.rpc('claim_cc_push');
    if (error) throw error;
    const deliveries: Delivery[] = data ?? [];
    let sent = 0; let failed = 0;
    for (let offset = 0; offset < deliveries.length; offset += 5) {
      await Promise.all(deliveries.slice(offset, offset + 5).map(async (delivery) => {
        let result = { ok: false, expired: false };
        try {
          const [{ data: event }, { data: pref }] = await Promise.all([
            admin.from('cc_events').select('read_at').eq('id', delivery.event_id).maybeSingle(),
            admin.from('push_topic_preferences').select('enabled').eq('subscription_id', delivery.subscription_id).eq('topic', 'cuenta-clara').maybeSingle(),
          ]);
          if (!event || event.read_at || !pref?.enabled) return;
          result = await sendPush(delivery, config, { title: 'Cuenta Clara', body: 'Tienes una actualización privada por revisar.', tag: `cc-${delivery.event_id}`, url: '/lab/cuenta-clara' });
          if (result.ok) sent++; else failed++;
        } catch { failed++; }
        const { error: finishError } = await admin.rpc('complete_cc_push', {
          p_event_id: delivery.event_id, p_subscription_id: delivery.subscription_id, p_lease_token: delivery.lease_token,
          p_success: result.ok, p_expired: result.expired,
        });
        if (finishError) throw finishError;
      }));
    }
    return reply({ claimed: deliveries.length, sent, failed });
  } catch {
    return reply({ error: 'No se pudieron procesar los avisos.' }, 500);
  }
});
