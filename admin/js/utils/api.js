/**
 * API wrapper com auth automatico
 */

import { appState } from '../state.js';

async function apiRequest(method, url, body = null) {
  const headers = { 'Authorization': `Bearer ${appState.authToken}` };
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    ...(body && { body: body instanceof FormData ? body : JSON.stringify(body) })
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('organizationId');
    window.showToast?.('Sua sessão expirou. Faça login novamente.', 'warning', 0);
    window.location.reload();
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const friendly =
      res.status === 429 ? 'Muitas requisições em pouco tempo. Aguarde um minuto e tente de novo.' :
      res.status === 503 ? 'Servidor temporariamente indisponível. Tente de novo em alguns instantes.' :
      res.status >= 500 ? 'Erro interno do servidor. Tente de novo em alguns instantes.' :
      (err.error || `Erro ${res.status}`);
    const error = new Error(friendly);
    error.status = res.status;
    error.retriable = res.status === 429 || res.status >= 500;
    throw error;
  }
  return res.json();
}

// Envolve a chamada e mostra toast com botão "Tentar de novo" em erros retriáveis.
// Uso: apiWithRetry(() => apiPost('/api/sessions', data))
export async function apiWithRetry(fn, { label = 'Operação' } = {}) {
  try {
    return await fn();
  } catch (err) {
    if (err.retriable && window.showToastWithRetry) {
      window.showToastWithRetry(err.message, () => apiWithRetry(fn, { label }));
    } else if (window.showToast) {
      window.showToast(err.message || `Erro em ${label}`, 'error');
    }
    throw err;
  }
}

export const apiGet = (url) => apiRequest('GET', url);
export const apiPost = (url, body) => apiRequest('POST', url, body);
export const apiPut = (url, body) => apiRequest('PUT', url, body);
export const apiDelete = (url) => apiRequest('DELETE', url);
