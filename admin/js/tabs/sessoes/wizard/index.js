// Wizard de Sessões — entry point.
// Abre um modal fullscreen com a barra de etapas (stepper.js) no header,
// o conteúdo do passo ativo no centro e o painel de configurações (encolhível)
// à direita.

import { apiGet, apiPut, apiPost, apiDelete } from '../../../utils/api.js';
import { icon } from '../../../utils/icons.js';
import { wizardState, resetWizardState, stopWizardPolling } from './state.js';
import { computeWizardSteps, renderHeaderStepper, injectWizardStyles } from './stepper.js';
import { unmountWizardBell } from './notifications-bell.js';
import { renderStepUpload } from './steps/1-upload.js';
import { renderStepShare } from './steps/2-share.js';
import { renderStepTracking } from './steps/4-tracking.js';
import { renderStepEdited } from './steps/5-edited.js';
import { renderStepDeliver } from './steps/6-deliver.js';
import { renderHistoryPanel } from './history-panel.js';
import { renderConfigPanel } from './config-panel.js';
import { renderSelectionSinglePage } from './selection-single-page.js';
import { renderGallerySinglePage } from './gallery-single-page.js';
import { renderMultiSinglePage } from './multi-single-page.js';
import { renderMultiGallerySinglePage } from './multi-gallery-single-page.js';

// Modos que usam o layout de página única (sem stepper horizontal): empilham as seções
// numa única tela. Multi_instant (V2, oculto) continua no stepper como fallback.
const SINGLE_PAGE_MODES = ['selection', 'gallery', 'multi_selection', 'multi_gallery'];

const STEP_RENDERERS = {
  1: renderStepUpload,
  2: renderStepShare,
  4: renderStepTracking,
  5: renderStepEdited,
  6: renderStepDeliver
};

// Centraliza horizontalmente o conteúdo do passo dentro do #wizardContent.
// Cada wrap de passo já tem seu próprio max-width; as margens automáticas o
// centralizam quando a área é mais larga (e não fazem nada em telas estreitas).
function centerInContent(el) {
  if (el) { el.style.marginLeft = 'auto'; el.style.marginRight = 'auto'; }
  return el;
}

// Injetar CSS para botões morph sempre expandidos com efeitos (uma vez)
// Aplica a TODOS os .header-expand-btn na página (header, wizard content, etc)
function injectHeaderButtonStyles() {
  if (document.getElementById('cz-header-btn-expanded-styles')) return;
  const s = document.createElement('style');
  s.id = 'cz-header-btn-expanded-styles';
  s.textContent = `
    .header-expand-btn {
      padding: 0 1.25rem !important;
      min-width: auto !important;
      gap: 0.75rem !important;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      display: inline-flex !important;
      align-items: center !important;
      height: 44px !important;
    }
    .header-expand-btn .header-expand-label {
      max-width: 12rem !important;
      opacity: 1 !important;
      padding-right: 0 !important;
      overflow: visible !important;
      white-space: nowrap !important;
    }
    .header-expand-btn:not([disabled]):hover {
      background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface)) !important;
      color: var(--accent) !important;
      border-color: var(--accent) !important;
      transform: translateY(-2px) !important;
      box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 20%, transparent) !important;
    }
  `;
  document.head.appendChild(s);
}

// Abre o wizard para uma sessão específica.
// Busca a sessão fresca da API, monta o modal e renderiza o primeiro passo aplicável.
export async function openSessionWizard(sessionId, opts = {}) {
  injectWizardStyles();
  injectHeaderButtonStyles();

  try {
    const data = await apiGet(`/api/sessions/${sessionId}`);
    const session = data.session || data;
    if (!session) {
      window.showToast?.('Sessão não encontrada', 'error');
      return;
    }

    // Só marca como rascunho descartável quando esta abertura veio de um card de criação.
    // Toda outra abertura (cards da lista, sininho) passa freshDraft=false → nunca auto-apaga.
    wizardState.freshDraft = opts.freshDraft === true;
    wizardState.session = session;
    wizardState.currentStepId = pickInitialStep(session);

    const modal = buildModal();
    wizardState.modalEl = modal;
    document.body.appendChild(modal);

    // Trava scroll do body enquanto wizard está aberto
    document.body.style.overflow = 'hidden';

    // Modos de página única (selection/gallery): marca codeViewedAt ao abrir,
    // já que não há mais o passo Compartilhar separado que disparava isso.
    if ((session.mode === 'selection' || session.mode === 'gallery') && !session.codeViewedAt) {
      apiPut(`/api/sessions/${session._id}/view-code`, {}).catch(() => {});
    }

    refreshWizard();
  } catch (err) {
    window.showToast?.('Erro ao carregar sessão: ' + err.message, 'error');
  }
}

// Define qual passo abrir primeiro: o primeiro não-concluído (ou o último, se tudo done).
// Se wizardState.openAtStep estiver definido, usa esse passo diretamente.
function pickInitialStep(session) {
  if (wizardState.openAtStep !== null) {
    const step = wizardState.openAtStep;
    wizardState.openAtStep = null;
    return step;
  }
  const steps = computeWizardSteps(session, null);
  const firstPending = steps.find(s => !s.done && !s.locked);
  if (firstPending) return firstPending.id;
  // tudo concluído → vai pro último passo
  return steps[steps.length - 1]?.id || 1;
}

// Constrói o esqueleto do modal (header + body com sidebar + content).
function buildModal() {
  const modal = document.createElement('div');
  modal.id = 'sessionWizardModal';
  modal.style.cssText = `
    position: fixed;
    top: var(--header-h, 56px);
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 990;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: stretch; justify-content: stretch;
  `;

  const shell = document.createElement('div');
  shell.style.cssText = `
    background: var(--bg-base);
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    overflow: hidden;
  `;

  // Body: conteúdo + painel de configurações à direita
  const body = document.createElement('div');
  body.style.cssText = 'flex: 1; display: flex; min-height: 0; overflow: hidden;';

  const content = document.createElement('div');
  content.id = 'wizardContent';
  content.style.cssText = `
    flex: 1; overflow-y: auto;
    padding: 1.5rem 2rem;
    background: var(--bg-base);
  `;
  body.appendChild(content);

  // Sidebar direita: configurações da sessão (sempre visíveis e editáveis).
  const configSlot = document.createElement('div');
  configSlot.id = 'wizardConfigSlot';
  configSlot.style.cssText = 'display: flex; flex-shrink: 0;';
  body.appendChild(configSlot);

  shell.appendChild(body);
  modal.appendChild(shell);
  return modal;
}

// Re-renderiza sidebar + content com os dados atuais.
function refreshWizard() {
  const modal = wizardState.modalEl;
  const session = wizardState.session;
  if (!modal || !session) return;

  unmountWizardBell();

  // Modo arquivado: sem painel, conteúdo congelado
  if (session.archivedAt) {
    const configSlot = modal.querySelector('#wizardConfigSlot');
    if (configSlot) configSlot.innerHTML = '';
    const content = modal.querySelector('#wizardContent');
    content.innerHTML = '';
    content.appendChild(centerInContent(buildArchivedView(session)));
    return;
  }

  // Painel direito (configurações da sessão — encolhível, sempre abre aberto)
  renderConfigSlot();

  // Content
  const content = modal.querySelector('#wizardContent');
  content.innerHTML = '';

  // Stepper horizontal apenas para modos que não são de página única (ex.: multi_instant V2)
  if (!SINGLE_PAGE_MODES.includes(session.mode)) {
    const steps = computeWizardSteps(session, wizardState.currentStepId);
    const stepperEl = renderHeaderStepper(steps, switchStep);
    stepperEl.style.marginBottom = '1rem';
    content.appendChild(stepperEl);
  }

  // Banner de alerta quando acesso do cliente está bloqueado
  if (session.clientAccessBlocked) {
    const banner = document.createElement('div');
    banner.style.cssText = `
      background: color-mix(in srgb, var(--red) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--red) 35%, transparent);
      border-radius:var(--r-card); padding: 0.625rem 1rem; margin-bottom: 1rem;
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.8125rem; color: var(--red); font-weight: 600;
    `;
    banner.innerHTML = '🔒 Acesso do cliente bloqueado. O código não funciona até você desbloquear (botão 🔓 na barra lateral).';
    content.appendChild(banner);
  }

  // Verifica se o conteúdo atual é o painel de histórico
  if (wizardState.currentStepId === 'history') {
    content.appendChild(centerInContent(renderHistoryPanel(session)));
    return;
  }

  // Modo selection: renderiza página única com 4 seções empilhadas
  if (session.mode === 'selection') {
    content.appendChild(renderSelectionSinglePage(session, refreshWizardFromServer));
    return;
  }

  // Modo gallery: página única com 2 seções (Upload, Compartilhar + Entregar)
  if (session.mode === 'gallery') {
    content.appendChild(renderGallerySinglePage(session, refreshWizardFromServer));
    return;
  }

  // Modo multi_selection (Seleção em Grupo): página única com 4 seções (Upload,
  // Compartilhar, Acompanhar, Editadas) — mesmo padrão da Seleção, focado em participantes.
  if (session.mode === 'multi_selection') {
    content.appendChild(renderMultiSinglePage(session, refreshWizardFromServer));
    return;
  }

  // Modo multi_gallery (Galeria em Grupo): página única com 2 seções (Upload,
  // Compartilhar com os Convidados) — entrega direta por participante, sem seleção.
  if (session.mode === 'multi_gallery') {
    content.appendChild(renderMultiGallerySinglePage(session, refreshWizardFromServer));
    return;
  }

  const renderer = STEP_RENDERERS[wizardState.currentStepId];
  if (renderer) {
    const stepEl = renderer({
      session,
      refresh: refreshWizardFromServer,
      switchStep
    });
    if (stepEl) content.appendChild(centerInContent(stepEl));
  } else {
    content.textContent = 'Passo não implementado.';
  }
}

// (Re)desenha só o painel direito de configurações — respeita o estado encolhido
// (wizardState.configCollapsed) e serve de callback do próprio botão de encolher,
// evitando re-renderizar o wizard inteiro a cada toggle.
function renderConfigSlot() {
  const modal = wizardState.modalEl;
  const session = wizardState.session;
  if (!modal || !session) return;
  const configSlot = modal.querySelector('#wizardConfigSlot');
  if (!configSlot) return;
  configSlot.innerHTML = '';

  // Callbacks de ação da sessão — vivem aqui para acessar os fechamentos do módulo
  const onBlock = async () => {
    const isBlocked = Boolean(session.clientAccessBlocked);
    const action = isBlocked ? 'desbloquear' : 'bloquear';
    const msg = isBlocked
      ? 'Desbloquear o acesso? O cliente voltará a conseguir entrar na galeria.'
      : 'Bloquear o acesso do cliente? Ele não conseguirá entrar na galeria até você desbloquear. Os dados ficam intactos.';
    const ok = await window.showConfirm?.(msg, { confirmText: action.charAt(0).toUpperCase() + action.slice(1), cancelText: 'Cancelar' });
    if (!ok) return;
    try {
      const res = await apiPut(`/api/sessions/${session._id}/toggle-client-access`, {});
      wizardState.session.clientAccessBlocked = res.clientAccessBlocked;
      window.showToast?.(res.clientAccessBlocked ? '🔒 Acesso do cliente bloqueado' : '🔓 Acesso do cliente desbloqueado', res.clientAccessBlocked ? 'warning' : 'success');
      refreshWizard();
    } catch (e) {
      window.showToast?.('Erro: ' + e.message, 'error');
    }
  };

  const onHistory = () => {
    if (wizardState.currentStepId === 'history') {
      wizardState.currentStepId = pickInitialStep(session);
    } else {
      wizardState.currentStepId = 'history';
    }
    refreshWizard();
  };

  const onDelete = async () => {
    const ok = await window.showConfirm?.(`Excluir a sessão "${session.name}"?`, {
      confirmText: 'Excluir', cancelText: 'Cancelar', danger: true
    });
    if (!ok) return;
    closeWizard();
    window.deleteSession?.(session._id);
  };

  configSlot.appendChild(renderConfigPanel({
    session,
    onChange: refreshWizard,
    onToggleCollapse: renderConfigSlot,
    onBlock,
    onHistory,
    onDelete,
    onClose: closeWizard
  }));
}

// Recarrega sessão do servidor e re-renderiza.
async function refreshWizardFromServer() {
  if (!wizardState.session) return;
  try {
    const data = await apiGet(`/api/sessions/${wizardState.session._id}`);
    wizardState.session = data.session || data;
    refreshWizard();
  } catch (err) {
    window.showToast?.('Erro ao atualizar sessão: ' + err.message, 'error');
  }
}

// Troca de passo. Side-effect: se for passo 2 e ainda não visualizado, marca codeViewedAt.
async function switchStep(stepId) {
  // Saindo do passo de acompanhamento: encerra o polling. O renderer do passo 4
  // reabre o polling quando o usuário voltar.
  if (wizardState.currentStepId === 4 && stepId !== 4) {
    stopWizardPolling();
  }
  wizardState.currentStepId = stepId;
  refreshWizard();

  if (stepId === 2 && wizardState.session && !wizardState.session.codeViewedAt) {
    try {
      await apiPut(`/api/sessions/${wizardState.session._id}/view-code`, {});
      // Atualiza local sem precisar buscar tudo
      wizardState.session.codeViewedAt = new Date().toISOString();
      refreshWizard();
    } catch (err) {
      // não bloqueia UX; só registra
    }
  }
}


// Conteúdo exibido quando a sessão está arquivada (archivedAt setado).
// Todos os passos ficam desativados; só o link externo e o histórico ficam acessíveis.
function buildArchivedView(session) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.5rem; margin:0; width:100%;';

  // Badge arquivada
  const badge = document.createElement('div');
  badge.style.cssText = `
    display:inline-flex; align-items:center; gap:0.5rem;
    background:#6b728022; border:1px solid #6b7280;
    border-radius:var(--r-card); padding:0.5rem 1rem; width:fit-content;
  `;
  badge.innerHTML = `<span style="font-size:1rem;">📦</span><span style="font-size:0.875rem; font-weight:600; color:var(--text-secondary);">Sessão arquivada em ${new Date(session.archivedAt).toLocaleDateString('pt-BR')}</span>`;
  wrap.appendChild(badge);

  // Explicação
  const info = document.createElement('p');
  info.textContent = 'As fotos desta sessão foram removidas do servidor. Os dados e o histórico foram preservados. O cliente não consegue mais acessar a galeria de fotos.';
  info.style.cssText = 'color:var(--text-secondary); font-size:0.875rem; margin:0; line-height:1.6;';
  wrap.appendChild(info);

  // Link externo (se cadastrado)
  if (session.externalStorageUrl) {
    const linkCard = document.createElement('div');
    linkCard.style.cssText = `
      background:var(--bg-surface); border:1px solid var(--border);
      border-radius:var(--r-card); padding:1rem 1.25rem;
      display:flex; flex-direction:column; gap:0.5rem;
    `;
    const linkTitle = document.createElement('strong');
    linkTitle.textContent = 'Armazenamento externo';
    linkTitle.style.cssText = 'font-size:0.875rem; color:var(--text-primary);';
    const linkEl = document.createElement('a');
    linkEl.href = session.externalStorageUrl;
    linkEl.target = '_blank';
    linkEl.rel = 'noopener';
    linkEl.textContent = session.externalStorageUrl;
    linkEl.style.cssText = 'font-size:0.8rem; color:#3b82f6; word-break:break-all;';
    linkCard.appendChild(linkTitle);
    linkCard.appendChild(linkEl);
    wrap.appendChild(linkCard);
  }

  // Histórico
  wrap.appendChild(renderHistoryPanel(session));

  return wrap;
}

// Um rascunho recém-criado está "intocado" se não tem fotos, participantes, cliente
// vinculado nem código compartilhado, e o nome ainda é o padrão. Conservador de propósito:
// se o fotógrafo mexeu em qualquer coisa (até renomear), a sessão é preservada.
function isUntouchedDraft(session) {
  if (!session) return false;
  const hasPhotos = (session.photos?.length || 0) > 0;
  const hasParticipants = (session.participants?.length || 0) > 0;
  const hasClient = !!(session.clientId || session.rhynoCustomerId || session.clientEmail);
  const shared = !!session.codeSentAt;
  const nameIsDefault = !session.name || session.name.trim() === 'Nova sessão';
  return !hasPhotos && !hasParticipants && !hasClient && !shared && nameIsDefault;
}

function closeWizard() {
  unmountWizardBell();
  // Auto-descarte: rascunho criado AGORA (via card) e fechado sem nada preenchido.
  // Fire-and-forget: apaga no servidor (DELETE devolve a vaga no plano) e atualiza a lista.
  const session = wizardState.session;
  const shouldDiscard = wizardState.freshDraft && isUntouchedDraft(session);
  if (shouldDiscard && session?._id) {
    apiDelete(`/api/sessions/${session._id}`)
      .then(() => window.__czRefreshSessoes?.())
      .catch(() => { /* silencioso — rascunho fica na lista, fotógrafo pode apagar manualmente */ });
  }
  if (wizardState.modalEl) {
    wizardState.modalEl.remove();
  }
  document.body.style.overflow = '';
  resetWizardState();
}

// Expor globalmente para chamadas via onclick="" e cards da lista.
window.openSessionWizard = openSessionWizard;
window.closeSessionWizard = closeWizard;
window.openSessionWizardHistory = async (sessionId) => {
  wizardState.openAtStep = 'history';
  await openSessionWizard(sessionId);
};
