// Service Worker do PAINEL do fotógrafo — foco em Web Push.
// Deliberadamente SEM cache/offline: o admin é uma SPA grande de módulos ES e cachear aqui
// arrisca servir versão velha (o próprio cliente/sw.js documenta essa dor). Sem handler de
// 'fetch', este SW não intercepta o carregamento do app — só cuida de push + clique.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push recebido: mostra a notificação nativa do SO (funciona com o app fechado).
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = {}; }

  const title = data.title || 'CliqueZoom';
  const options = {
    body: data.body || '',
    icon: '/admin/icons/icon-192.png',
    badge: '/admin/icons/icon-192.png',
    tag: data.tag || undefined,       // agrupa/atualiza notificações do mesmo contexto
    renotify: !!data.tag,             // re-alerta quando a mesma tag é atualizada (ex.: "baixou N fotos")
    data: { url: data.url || '/admin/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Clique na notificação: foca uma janela do admin já aberta (navegando pro deep-link) ou abre uma.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          if ('navigate' in client) { try { client.navigate(url); } catch (_) {} }
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
