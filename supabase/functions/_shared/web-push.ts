import webpush from 'npm:web-push@3.6.7';
export type Subscription = { id?: string; endpoint: string; p256dh: string; auth: string };
export type PushConfig = { public_key: string; private_key: string; subject: string; cron_secret: string };

export function validEndpoint(endpoint: string) {
  const url = new URL(endpoint);
  return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') && (
    ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'].includes(url.hostname)
    || /^[a-z0-9.-]+\.notify\.windows\.com$/.test(url.hostname)
  );
}

export async function sendPush(subscription: Subscription, config: PushConfig, message: { title: string; body: string; tag: string; url: string }) {
  if (!validEndpoint(subscription.endpoint)) return { ok: false, expired: true };
  const request = webpush.generateRequestDetails({
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  }, JSON.stringify(message), {
    TTL: 3600, urgency: 'high',
    vapidDetails: { subject: config.subject, publicKey: config.public_key, privateKey: config.private_key },
  });
  const response = await fetch(request.endpoint, {
    method: request.method, headers: request.headers, body: request.body,
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  await response.body?.cancel();
  return { ok: response.ok, expired: response.status === 404 || response.status === 410 };
}
