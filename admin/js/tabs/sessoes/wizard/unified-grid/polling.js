// unified-grid/polling.js — Polling adaptativo da seleção (rápido após mudança, lento ocioso).
// Extraído de unified-photo-grid.js sem alteração de comportamento.

import { apiGet } from '../../../../utils/api.js';
import { wizardState } from '../state.js';
import { buildSnapshot } from './helpers.js';

// ── Constantes de polling ──────────────────────────────────────────────────
const POLL_DEFAULT_MS  = 30_000;
const POLL_FAST_MS     = 10_000;
const FAST_WINDOW_MS   = 120_000;

export function setupPolling(session, refresh) {
  const tick = async () => {
    if (document.visibilityState === 'hidden') {
      wizardState.pollingTimer = null;
      return;
    }
    try {
      const data = await apiGet(`/api/sessions/${session._id}`);
      const fresh = data.session || data;
      const newSnap = buildSnapshot(fresh);
      const oldSnap = wizardState.lastSelectionSnapshot;
      if (oldSnap && oldSnap !== newSnap) {
        wizardState.lastSelectionSnapshot = newSnap;
        wizardState.pollingLastChangeAt = Date.now();
        window.showToast?.('Seleção atualizada pelo cliente', 'info');
        await refresh();
        return;
      }
      if (!oldSnap) wizardState.lastSelectionSnapshot = newSnap;
    } catch (err) {
      // silencioso — sem toast de erro de polling
    }
    const sinceChange = Date.now() - (wizardState.pollingLastChangeAt || 0);
    const interval    = sinceChange < FAST_WINDOW_MS ? POLL_FAST_MS : POLL_DEFAULT_MS;
    wizardState.pollingTimer = setTimeout(tick, interval);
  };

  if (!wizardState.lastSelectionSnapshot) {
    wizardState.lastSelectionSnapshot = buildSnapshot(session);
  }
  wizardState.pollingTimer = setTimeout(tick, POLL_DEFAULT_MS);

  wizardState.pollingVisibilityHandler = () => {
    if (document.visibilityState === 'visible' && !wizardState.pollingTimer) tick();
  };
  document.addEventListener('visibilitychange', wizardState.pollingVisibilityHandler);
}
