self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Network-first passthrough so Next.js and Supabase realtime always stay fresh
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* Usa el mensaje predeterminado. */ }
  if (!data || typeof data !== 'object') data = {};
  event.waitUntil(self.registration.showNotification(data.title || 'Recordatorio de pedido', {
    body: data.body || '¿Ya hiciste pedido? Entra para registrarlo.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag || 'order-reminder',
    data: { url: data.url === '/lab/cuenta-clara' ? '/lab/cuenta-clara' : '/lab/pedidos-amigos?action=new-order' },
  }));
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'SHOW_ORDER_REMINDER') {
    const title = data.title || '¿Ya hiciste pedido? Regístralo';
    const options = {
      body: data.body || 'Tenías programado hacer un pedido. Entra para registrarlo en tu lista.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || 'order-reminder',
      renotify: true,
      data: {
        url: data.url || '/lab/pedidos-amigos?action=new-order',
      },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = event.notification.data && event.notification.data.url === '/lab/cuenta-clara'
    ? '/lab/cuenta-clara' : '/lab/pedidos-amigos?action=new-order';
  const targetUrl = new URL(destination, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          await client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
