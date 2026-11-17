const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function worker(clients = []) {
  const handlers = new Map();
  const calls = [];
  const self = {
    location: { origin: 'https://portfolio.example' },
    addEventListener: (name, fn) => handlers.set(name, fn),
    registration: { showNotification: async (...args) => calls.push(['notification', ...args]) },
    clients: {
      matchAll: async () => clients,
      openWindow: async (url) => calls.push(['open', url]),
    },
  };
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), { self, URL });
  return { handlers, calls };
}

test('push recibido muestra el contenido y conserva el tag del recordatorio', async () => {
  const { handlers, calls } = worker();
  let completion;
  handlers.get('push')({
    data: { json: () => ({ title: 'Pedido', body: 'Registra tu compra', tag: 'order-123' }) },
    waitUntil: (promise) => { completion = promise; },
  });
  await completion;
  assert.equal(calls[0][1], 'Pedido');
  assert.equal(calls[0][2].body, 'Registra tu compra');
  assert.equal(calls[0][2].tag, 'order-123');
});

test('payload nulo o inválido sigue mostrando una notificación válida', async () => {
  for (const json of [() => null, () => { throw new Error('Invalid JSON'); }]) {
    const { handlers, calls } = worker();
    let completion;
    handlers.get('push')({ data: { json }, waitUntil: (promise) => { completion = promise; } });
    await completion;
    assert.equal(calls[0][1], 'Recordatorio de pedido');
  }
});

test('pulsar el aviso espera la navegación antes de enfocar una ventana', async () => {
  const sequence = [];
  const { handlers } = worker([{
    navigate: async (url) => { await Promise.resolve(); sequence.push(['navigate', url]); },
    focus: async () => { sequence.push(['focus']); },
  }]);
  let completion;
  handlers.get('notificationclick')({
    notification: { close: () => sequence.push(['close']), data: { url: 'https://untrusted.example' } },
    waitUntil: (promise) => { completion = promise; },
  });
  await completion;
  assert.deepEqual(sequence, [
    ['close'], ['navigate', 'https://portfolio.example/lab/pedidos-amigos?action=new-order'], ['focus'],
  ]);
});

test('pulsar el aviso sin pestañas abiertas crea una ventana de pedidos', async () => {
  const { handlers, calls } = worker();
  let completion;
  handlers.get('notificationclick')({
    notification: { close() {} }, waitUntil: (promise) => { completion = promise; },
  });
  await completion;
  assert.deepEqual(calls, [['open', 'https://portfolio.example/lab/pedidos-amigos?action=new-order']]);
});

test('un aviso de Cuenta Clara conserva su destino privado al abrirlo', async () => {
  const { handlers, calls } = worker();
  let completion;
  handlers.get('push')({ data: { json: () => ({ title: 'Cuenta Clara', body: 'Actualización privada', url: '/lab/cuenta-clara', tag: 'cc-event' }) }, waitUntil: (promise) => { completion = promise; } });
  await completion;
  assert.equal(calls[0][2].data.url, '/lab/cuenta-clara');
  handlers.get('notificationclick')({ notification: { close() {}, data: calls[0][2].data }, waitUntil: (promise) => { completion = promise; } });
  await completion;
  assert.deepEqual(calls[1], ['open', 'https://portfolio.example/lab/cuenta-clara']);
});
