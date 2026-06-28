// Criação de sessão via cards de tipo (substitui o antigo modal de criação).
// O painel #newSessionCardsPanel fica fixo no topo da aba; clicar num card cria a
// sessão NA HORA — como rascunho — e abre o wizard direto. Todos os detalhes
// (cliente, datas, pacote, etc.) são preenchidos no painel lateral do wizard.
//
// O rascunho intocado é auto-descartado ao fechar o wizard vazio (ver wizard/index.js).

import { apiPost } from '../../utils/api.js';

const DEFAULT_DRAFT_NAME = 'Nova sessão';

export function setupModalForm(container, state, renderSessoes) {
  const panel = container.querySelector('#newSessionCardsPanel');
  if (!panel) return;

  panel.querySelectorAll('.session-type-card[data-mode]').forEach(card => {
    const mode = card.dataset.mode;
    if (!mode) return; // "Galeria em Grupo" (Em breve) — card desabilitado, sem ação
    card.onclick = () => createSessionFromCard(mode, { container, renderSessoes });
  });

  // Renderiza os ícones Lucide dos cards (painel fixo, sempre visível no topo da aba).
  window.lucide?.createIcons?.();

  // Expõe o refresh da lista para o wizard chamar após auto-descartar um rascunho vazio.
  // Reescrito a cada render — sempre aponta para o renderSessoes/container atuais.
  window.__czRefreshSessoes = () => renderSessoes(container);
}

// Cria a sessão no modo escolhido e abre o wizard marcando-a como rascunho descartável.
// Os padrões do fotógrafo (Configurações › Sessões) são aplicados pelo BACKEND — fonte
// única em src/utils/sessionDefaults.js — pra qualquer origem (menu, Triagem) gerar uma
// sessão idêntica. Por isso o card manda só { mode, name }; o restante o wizard edita.
async function createSessionFromCard(mode, { container, renderSessoes }) {
  const payload = { mode, name: DEFAULT_DRAFT_NAME };

  try {
    const created = await apiPost('/api/sessions', payload);
    const newId = created?.session?._id;
    if (!newId) throw new Error('Resposta inesperada do servidor');
    await renderSessoes(container);
    // Abre o wizard sinalizando que é um rascunho recém-criado (auto-descarte se fechar vazio).
    if (window.openSessionWizard) window.openSessionWizard(newId, { freshDraft: true });
  } catch (error) {
    window.showToast?.('Erro ao criar sessão: ' + error.message, 'error');
  }
}
