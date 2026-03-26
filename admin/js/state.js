/**
 * Estado global e funções compartilhadas do admin
 */

export let appState = {
  authToken: localStorage.getItem('authToken') || '',
  organizationId: localStorage.getItem('organizationId') || '',
  appData: {},
  currentTab: 'dashboard',
  orgSlug: localStorage.getItem('orgSlug') || ''
};

export async function loadAppData() {
  try {
    const response = await fetch('/api/site-data', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });

    if (!response.ok) throw new Error('Erro ao carregar dados');

    appState.appData = await response.json();
    console.log('Dados carregados:', Object.keys(appState.appData));
  } catch (error) {
    console.error('Erro:', error.message);
    appState.appData = {};
  }
}

export async function saveAppData(section, data, silent = false) {
  try {
    // Protecao: nao salvar se os dados nao foram carregados
    if (!appState.appData || Object.keys(appState.appData).length === 0) {
      window.showToast?.('Dados não carregados. Recarregue a página.', 'error');
      return false;
    }

    const payload = {};
    payload[section] = data;

    const response = await fetch('/api/site-data', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appState.authToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Erro ao salvar dados');

    appState.appData[section] = data;

    if (!silent) {
      window.showToast?.('Salvo com sucesso!', 'success');
    }
    console.log(`Seção '${section}' salva com sucesso`);
    return true;
  } catch (error) {
    window.showToast?.('Erro: ' + error.message, 'error');
    return false;
  }
}
