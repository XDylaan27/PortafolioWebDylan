import { createClient } from 'npm:@supabase/supabase-js@2.117.0';
import { sendPush } from '../_shared/web-push.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});

type Subscription = { id?: string; endpoint: string; p256dh: string; auth: string };
type Delivery = Subscription & {
  reminder_id: string; subscription_id: string; scheduled_for: string;
  lease_token: string; user_id: string; note: string | null; friend_name: string | null;
};
type PushConfig = { public_key: string; private_key: string; subject: string; cron_secret: string };

async function send(subscription: Subscription, config: PushConfig, body: string, tag: string) {
  return sendPush(subscription, config, { title: '¿Ya hiciste pedido? Regístralo', body, tag, url: '/lab/pedidos-amigos?action=new-order' });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Método no permitido.' }, 405);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const body = await request.json().catch(() => ({}));
    const { data: config, error: configError } = await admin.rpc('get_order_push_config');
    if (configError || !config) return reply({ error: 'Servicio no configurado.' }, 503);

    if (body.action === 'test') {
      const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) return reply({ error: 'Inicia sesión.' }, 401);
      const { data: { user }, error } = await admin.auth.getUser(token);
      if (error || !user) return reply({ error: 'Sesión inválida.' }, 401);
      if (typeof body.endpoint !== 'string') return reply({ error: 'Dispositivo inválido.' }, 400);
      // La prueba solo puede enviarse a una suscripción del usuario verificado, una vez por minuto.
      const { data: subscription, error: subError } = await admin.from('order_push_subscriptions')
        .update({ last_test_at: new Date().toISOString() })
        .eq('user_id', user.id).eq('endpoint', body.endpoint)
        .or(`last_test_at.is.null,last_test_at.lt.${new Date(Date.now() - 60000).toISOString()}`)
        .select('id,endpoint,p256dh,auth').maybeSingle();
      if (subError) throw subError;
      if (!subscription) return reply({ error: 'Activa este dispositivo o espera un minuto antes de repetir la prueba.' }, 429);
      const result = await send(subscription, config, 'Prueba push: puedes recibir recordatorios con la página cerrada.', 'test-order-push');
      if (result.expired) await admin.from('order_push_subscriptions').delete().eq('id', subscription.id);
      return reply({ success: result.ok }, result.ok ? 200 : 502);
    }

    // El cron no usa un JWT de usuario: exige su propio secreto guardado en Vault.
    if (!config.cron_secret || request.headers.get('x-cron-secret') !== config.cron_secret) {
      return reply({ error: 'No autorizado.' }, 401);
    }
    if (body.action === 'health') return reply({ configured: true });
    if (body.action !== 'dispatch') return reply({ error: 'Acción inválida.' }, 400);
    const { data, error } = await admin.rpc('claim_order_push_deliveries');
    if (error) throw error;
    const deliveries: Delivery[] = data || [];
    let sent = 0;
    let failed = 0;
    for (let start = 0; start < deliveries.length; start += 5) {
      await Promise.all(deliveries.slice(start, start + 5).map(async (delivery) => {
        let result = { ok: false, expired: false };
        try {
          // Comprueba cancelaciones o ediciones posteriores a la reserva del envío.
          const { data: current, error: currentError } = await admin.from('friend_order_reminders')
            .select('remind_at,note,notified').eq('id', delivery.reminder_id).maybeSingle();
          if (currentError) throw currentError;
          if (!current || current.notified || current.note !== delivery.note || new Date(current.remind_at).getTime() !== new Date(delivery.scheduled_for).getTime()) return;
          const { data: preference } = await admin.from('push_topic_preferences').select('enabled').eq('subscription_id', delivery.subscription_id).eq('topic', 'orders').maybeSingle();
          if (!preference?.enabled) return;
          const text = delivery.note
            ? `${delivery.note}${delivery.friend_name ? ` (Con ${delivery.friend_name})` : ''}`
            : 'Tenías programado hacer un pedido. Entra para registrarlo.';
          result = await send(delivery, config, text, `order-${delivery.reminder_id}`);
          if (result.ok) sent++; else failed++;
        } catch {
          failed++;
        }
        const { error: finishError } = await admin.rpc('complete_order_push_delivery', {
          p_reminder_id: delivery.reminder_id, p_subscription_id: delivery.subscription_id,
          p_scheduled_for: delivery.scheduled_for, p_lease_token: delivery.lease_token,
          p_success: result.ok, p_expired: result.expired,
        });
        if (finishError) throw finishError;
      }));
    }
    return reply({ claimed: deliveries.length, sent, failed });
  } catch {
    // No incluir endpoints, notas ni claves privadas en respuestas o logs.
    return reply({ error: 'No se pudieron procesar las notificaciones.' }, 500);
  }
});
