self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Network-first passthrough so Next.js and Supabase realtime always stay fresh
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
  const targetUrl = (event.notification.data && event.notification.data.url) || '/lab/pedidos-amigos';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
