// Estado local do wizard de sessões.
// Mantém referência ao modal, sessão atual, passo ativo e estado do polling adaptativo.
export const wizardState = {
  modalEl: null,
  session: null,
  currentStepId: 1,
  // Polling adaptativo do passo "Acompanhar":
  // - timer: handle do setTimeout atual
  // - lastChangeAt: timestamp da última mudança detectada (ativa janela rápida de 2 min)
  // - visibilityHandler: handler do visibilitychange registrado em document
  pollingTimer: null,
  pollingLastChangeAt: 0,
  pollingVisibilityHandler: null,
  // Snapshot da última seleção do cliente para detectar mudanças no polling
  lastSelectionSnapshot: null
};

export function stopWizardPolling() {
  if (wizardState.pollingTimer) {
    clearTimeout(wizardState.pollingTimer);
    wizardState.pollingTimer = null;
  }
  if (wizardState.pollingVisibilityHandler) {
    document.removeEventListener('visibilitychange', wizardState.pollingVisibilityHandler);
    wizardState.pollingVisibilityHandler = null;
  }
}

export function resetWizardState() {
  stopWizardPolling();
  wizardState.modalEl = null;
  wizardState.session = null;
  wizardState.currentStepId = 1;
  wizardState.lastSelectionSnapshot = null;
  wizardState.pollingLastChangeAt = 0;
}
