// Web Push (client-side) do painel do fotógrafo.
// Fluxo: registrar SW (feito no boot em app.js) → pedir permissão → pushManager.subscribe →
// POST /api/push/subscribe. Desativar faz o caminho inverso. Usado pelo card em configuracoes.js.

import { apiGet, apiPost } from './api.js';

// VAPID public key (base64url) → Uint8Array exigido pelo applicationServerKey.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function isSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Estado atual para a UI decidir o que mostrar (máquina de estados iOS/Android/desktop).
export async function getPushState() {
  const supported = isSupported();
  const state = {
    supported,
    isIos: isIos(),
    isStandalone: isStandalone(),
    permission: ('Notification' in window) ? Notification.permission : 'unsupported',
    isSubscribed: false
  };
  if (supported) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      state.isSubscribed = !!sub;
    } catch (_) { /* mantém false */ }
  }
  return state;
}

// Ativa o push: permissão + subscribe + registra no backend. Lança em falha (a UI trata).
export async function enablePush() {
  if (!isSupported()) throw new Error('Este navegador não suporta notificações push.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(permission === 'denied'
      ? 'Permissão negada. Reative nas configurações do navegador/sistema.'
      : 'Permissão não concedida.');
  }

  const { publicKey, enabled } = await apiGet('/api/push/public-key');
  if (!enabled || !publicKey) throw new Error('O servidor ainda não está configurado para push.');

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  }

  const json = sub.toJSON();
  await apiPost('/api/push/subscribe', {
    endpoint: json.endpoint,
    keys: json.keys,
    userAgent: navigator.userAgent
  });
  return true;
}

// Desativa neste dispositivo: remove do backend + cancela a subscription local.
export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await apiPost('/api/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
  } catch (_) { /* idempotente */ }
  return true;
}

export async function sendTest() {
  return apiPost('/api/push/test');
}

export async function listDevices() {
  const { subscriptions } = await apiGet('/api/push/subscriptions');
  return subscriptions || [];
}
