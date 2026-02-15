/**
 * Estado global e funções compartilhadas do admin
 * Módulo separado para evitar dependências circulares
 */

export let appState = {
  authToken: localStorage.getItem('authToken') || '',
  organizationId: localStorage.getItem('organizationId') || '',
  appData: {},
  currentTab: 'hero'
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
      alert('Erro: dados nao carregados. Recarregue a pagina e tente novamente.');
      return false;
    }

    // Enviar APENAS a secao que esta sendo salva
    // O backend usa $set, entao so atualiza esta secao no MongoDB
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

    const result = await response.json();

    // Sincronizar estado local: atualizar apenas a secao salva
    // NAO substituir appState.appData inteiro para evitar invalidar
    // referencias locais que as tabs mantem aos dados
    appState.appData[section] = data;

    if (!silent) {
      alert('Salvo com sucesso!');
    }
    console.log(`Secao '${section}' salva com sucesso`);
    return true;
  } catch (error) {
    alert('Erro: ' + error.message);
    return false;
  }
}
