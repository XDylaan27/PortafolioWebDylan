import { supabase } from '@/lib/supabase';

export type PushTopic = 'orders' | 'cuenta-clara';

function checkSupport() {
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('Este navegador no admite notificaciones push. En iPhone, instala la web en la pantalla de inicio y ábrela desde allí.');
  }
}

async function registration() {
  checkSupport();
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return reg;
}

function decodeKey(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
}

async function saveSubscription(subscription: PushSubscription, userId: string) {
  const json = subscription.toJSON();
  const { data, error } = await supabase.from('order_push_subscriptions').upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' }).select('id').single();
  if (error || !data) throw Object.assign(new Error('No se pudo vincular este dispositivo a tu cuenta. Vuelve a activar las notificaciones.'), { code: error?.code });
  return data.id as string;
}

export async function enablePushTopic(userId: string, topic: PushTopic) {
  checkSupport();
  if (await Notification.requestPermission() !== 'granted') {
    throw new Error('Permite las notificaciones en la configuración del navegador para recibir recordatorios.');
  }
  const { data: publicKey, error } = await supabase.rpc('get_order_push_public_key');
  if (error || !publicKey) throw new Error('El servicio de notificaciones todavía no está configurado.');
  const reg = await registration();
  let subscription = await reg.pushManager.getSubscription();
  const key = decodeKey(publicKey);
  if (subscription) {
    const currentKey = subscription.options.applicationServerKey;
    if (currentKey && new Uint8Array(currentKey).join() !== key.join()) {
      await subscription.unsubscribe();
      subscription = null;
    }
  }
  subscription ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  let subscriptionId: string;
  try {
    subscriptionId = await saveSubscription(subscription, userId);
  } catch (error) {
    if (!['42501', '23505'].includes((error as { code?: string }).code ?? '')) throw error;
    // Un dispositivo compartido debe obtener un endpoint nuevo al cambiar de cuenta.
    await subscription.unsubscribe();
    subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    subscriptionId = await saveSubscription(subscription, userId);
  }
  const { error: topicError } = await supabase.rpc('set_push_topic', { p_subscription_id: subscriptionId, p_topic: topic, p_enabled: true });
  if (topicError) throw new Error(topicError.message);
}

export async function syncPushTopic(userId: string, topic: PushTopic): Promise<boolean> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  const reg = await registration();
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return false;
  const id = await saveSubscription(subscription, userId);
  const { data, error } = await supabase.from('push_topic_preferences').select('enabled').eq('subscription_id', id).eq('topic', topic).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.enabled === true;
}

export async function disableAllPush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration('/');
  const subscription = await reg?.pushManager.getSubscription();
  if (!subscription) return;
  // Primero corta la entrega en este navegador, incluso si falla la petición de borrado.
  await subscription.unsubscribe();
  await supabase.from('order_push_subscriptions').delete().eq('endpoint', subscription.endpoint);
}

export async function testPushTopic(userId: string, topic: PushTopic) {
  await enablePushTopic(userId, topic);
  const reg = await registration();
  const subscription = await reg.pushManager.getSubscription();
  const { error } = await supabase.functions.invoke(topic === 'orders' ? 'send-order-reminders' : 'send-cuenta-clara', {
    body: { action: 'test', endpoint: subscription?.endpoint },
  });
  if (error) throw new Error('No se pudo enviar la prueba push. Revisa los permisos o inténtalo de nuevo.');
}

export async function disablePushTopic(topic: PushTopic) {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration('/');
  const subscription = await reg?.pushManager.getSubscription();
  if (!subscription) return;
  const { data, error } = await supabase.from('order_push_subscriptions').select('id').eq('endpoint', subscription.endpoint).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return;
  const { error: topicError } = await supabase.rpc('set_push_topic', { p_subscription_id: data.id, p_topic: topic, p_enabled: false });
  if (topicError) throw new Error(topicError.message);
}
