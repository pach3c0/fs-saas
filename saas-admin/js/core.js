/**
 * SaaS Admin — núcleo compartilhado: auth state, API, toast/confirm, helpers.
 * Extraído de app.js no split em módulos (SaaS Admin v2).
 */

// ── Auth state ───────────────────────────────────────────────────────────
let authToken = localStorage.getItem('saas_token') || '';
let userEmail = localStorage.getItem('saas_email') || '';

export function getToken() { return authToken; }
export function getUserEmail() { return userEmail; }

export function setAuth(token, email) {
  authToken = token;
  userEmail = email;
  localStorage.setItem('saas_token', token);
  localStorage.setItem('saas_email', email);
}

export function clearAuth() {
  authToken = '';
  userEmail = '';
  localStorage.removeItem('saas_token');
  localStorage.removeItem('saas_email');
}

// app.js registra o logout aqui — evita dependência circular core→app
let _onUnauthorized = null;
export function setUnauthorizedHandler(fn) { _onUnauthorized = fn; }

// ============================================================================
// TOAST & CONFIRM
// ============================================================================

function saasToast(msg, type = 'info') {
  const container = document.getElementById('saasToastContainer');
  if (!container) return;
  const colors = { success: '#22c55e', error: '#f87171', warning: '#facc15', info: '#60a5fa' };
  const toast = document.createElement('div');
  toast.style.cssText = `background:#1e293b; border:1px solid ${colors[type] || colors.info}; color:#f1f5f9; padding:0.75rem 1rem; border-radius:8px; font-size:0.875rem; pointer-events:auto; box-shadow:0 4px 12px rgba(0,0,0,0.4); max-width:320px; border-left:3px solid ${colors[type] || colors.info};`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

let saasConfirmResolve = null;
function saasConfirm(msg, { title = 'Confirmar', confirmText = 'Confirmar', danger = false } = {}) {
  return new Promise(resolve => {
    saasConfirmResolve = (val) => {
      document.getElementById('saasConfirmModal').classList.remove('active');
      saasConfirmResolve = null;
      resolve(val);
    };
    document.getElementById('saasConfirmTitle').textContent = title;
    document.getElementById('saasConfirmMsg').textContent = msg;
    const okBtn = document.getElementById('saasConfirmOkBtn');
    okBtn.textContent = confirmText;
    okBtn.style.background = danger ? '#ef4444' : '#3b82f6';
    okBtn.style.color = 'white';
    document.getElementById('saasConfirmModal').classList.add('active');
  });
}
window.saasConfirmResolve = (val) => saasConfirmResolve?.(val);

async function apiRequest(method, url, body = null) {
  const headers = { 'Authorization': `Bearer ${authToken}` };
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  if (res.status === 401 || res.status === 403) {
    if (_onUnauthorized) _onUnauthorized();
    throw new Error('Sessao expirada');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erro ${res.status}`);
  }
  return res.json();
}

// Helper para formatar tamanho
function formatSize(bytes) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// UTILS
// ============================================================================

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export { apiRequest, saasToast, saasConfirm, esc, formatSize };

// componentes.js (script clássico) usa saasToast como global
window.saasToast = saasToast;
