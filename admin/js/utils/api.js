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

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erro ${res.status}`);
  }
  return res.json();
}

export const apiGet = (url) => apiRequest('GET', url);
export const apiPost = (url, body) => apiRequest('POST', url, body);
export const apiPut = (url, body) => apiRequest('PUT', url, body);
export const apiDelete = (url) => apiRequest('DELETE', url);
