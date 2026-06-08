// Wizard de Sessões — entry point.
// Abre um modal fullscreen com sidebar de etapas (stepper.js) à esquerda
// e conteúdo do passo ativo à direita.

import { apiGet, apiPut, apiPost } from '../../../utils/api.js';
import { wizardState, resetWizardState, stopWizardPolling } from './state.js';
import { computeWizardSteps, renderStepper, injectWizardStyles } from './stepper.js';
import { openOverlayModal } from './utils.js';
import { mountWizardBell, unmountWizardBell } from './notifications-bell.js';
import { renderStepUpload } from './steps/1-upload.js';
import { renderStepShare } from './steps/2-share.js';
import { renderStepTracking } from './steps/4-tracking.js';
import { renderStepEdited } from './steps/5-edited.js';
import { renderStepDeliver } from './steps/6-deliver.js';
import { renderHistoryPanel } from './history-panel.js';

const STEP_RENDERERS = {
  1: renderStepUpload,
  2: renderStepShare,
  4: renderStepTracking,
  5: renderStepEdited,
  6: renderStepDeliver
};

// Abre o wizard para uma sessão específica.
// Busca a sessão fresca da API, monta o modal e renderiza o primeiro passo aplicável.
export async function openSessionWizard(sessionId) {
  injectWizardStyles();

  try {
    const data = await apiGet(`/api/sessions/${sessionId}`);
    const session = data.session || data;
    if (!session) {
      window.showToast?.('Sessão não encontrada', 'error');
      return;
    }

    wizardState.session = session;
    wizardState.currentStepId = pickInitialStep(session);

    const modal = buildModal();
    wizardState.modalEl = modal;
    document.body.appendChild(modal);

    // Trava scroll do body enquanto wizard está aberto
    document.body.style.overflow = 'hidden';

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
    position: fixed; inset: 0; z-index: 1100;
    background: rgba(0,0,0,0.7);
    display: flex; align-items: stretch; justify-content: stretch;
  `;

  const shell = document.createElement('div');
  shell.style.cssText = `
    background: var(--bg-base);
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    overflow: hidden;
  `;

  // Header
  const header = document.createElement('div');
  header.id = 'wizardHeader';
  header.style.cssText = `
    flex-shrink: 0;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-surface);
    display: flex; align-items: center; gap: 0.75rem;
  `;
  shell.appendChild(header);

  // Body: sidebar + content
  const body = document.createElement('div');
  body.style.cssText = 'flex: 1; display: flex; min-height: 0; overflow: hidden;';

  const sidebarSlot = document.createElement('div');
  sidebarSlot.id = 'wizardSidebar';
  sidebarSlot.style.cssText = 'display: flex; flex-shrink: 0;';
  body.appendChild(sidebarSlot);

  const content = document.createElement('div');
  content.id = 'wizardContent';
  content.style.cssText = `
    flex: 1; overflow-y: auto;
    padding: 1.5rem 2rem;
    background: var(--bg-base);
  `;
  body.appendChild(content);

  shell.appendChild(body);
  modal.appendChild(shell);
  return modal;
}

// Re-renderiza header + sidebar + content com os dados atuais.
function refreshWizard() {
  const modal = wizardState.modalEl;
  const session = wizardState.session;
  if (!modal || !session) return;

  // Header — desmonta o sininho antes de limpar (pra não vazar polling)
  const header = modal.querySelector('#wizardHeader');
  unmountWizardBell();
  header.innerHTML = '';
  header.appendChild(buildHeader(session));

  // Modo arquivado: sem stepper, conteúdo congelado
  if (session.archivedAt) {
    modal.querySelector('#wizardSidebar').innerHTML = '';
    const content = modal.querySelector('#wizardContent');
    content.innerHTML = '';
    content.appendChild(buildArchivedView(session));
    return;
  }

  // Sidebar
  const sidebarSlot = modal.querySelector('#wizardSidebar');
  sidebarSlot.innerHTML = '';
  const steps = computeWizardSteps(session, wizardState.currentStepId);
  sidebarSlot.appendChild(renderStepper(steps, switchStep));

  // Content
  const content = modal.querySelector('#wizardContent');
  content.innerHTML = '';

  // Banner de alerta quando acesso do cliente está bloqueado
  if (session.clientAccessBlocked) {
    const banner = document.createElement('div');
    banner.style.cssText = `
      background: color-mix(in srgb, var(--red) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--red) 35%, transparent);
      border-radius: 0.5rem; padding: 0.625rem 1rem; margin-bottom: 1rem;
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.8125rem; color: var(--red); font-weight: 600;
    `;
    banner.innerHTML = '🔒 Acesso do cliente bloqueado. O código não funciona até você desbloquear (botão 🔓 no cabeçalho).';
    content.appendChild(banner);
  }

  // Verifica se o conteúdo atual é o painel de histórico
  if (wizardState.currentStepId === 'history') {
    content.appendChild(renderHistoryPanel(session));
    return;
  }

  const renderer = STEP_RENDERERS[wizardState.currentStepId];
  if (renderer) {
    const stepEl = renderer({
      session,
      refresh: refreshWizardFromServer,
      switchStep
    });
    if (stepEl) content.appendChild(stepEl);
  } else {
    content.textContent = 'Passo não implementado.';
  }
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

// Header do wizard: voltar, título da sessão, config, deletar, fechar.
function buildHeader(session) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; align-items:center; gap:0.75rem; width:100%;';

  const title = document.createElement('div');
  title.style.cssText = 'flex:1; display:flex; align-items:center; gap:0.5rem; min-width:0;';
  const name = document.createElement('strong');
  name.textContent = session.name || 'Sessão';
  name.style.cssText = 'font-size:1rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
  title.appendChild(name);

  if (session.clientId?.name) {
    const sep = document.createElement('span');
    sep.textContent = '·';
    sep.style.cssText = 'color:var(--text-muted);';
    const client = document.createElement('span');
    client.textContent = session.clientId.name;
    client.style.cssText = 'color:var(--text-secondary); font-size:0.875rem;';
    title.appendChild(sep);
    title.appendChild(client);
  }

  wrap.appendChild(title);

  // Botões à direita
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex; gap:0.5rem; align-items:center; flex-shrink:0;';

  // Sininho de notificações (próprio do wizard — o global fica atrás)
  mountWizardBell(actions, session._id);

  // Botão de bloqueio de emergência
  const isBlocked = Boolean(session.clientAccessBlocked);
  const lockBtn = makeIconButton(
    isBlocked ? '🔒' : '🔓',
    isBlocked ? 'Acesso do cliente BLOQUEADO — clique para desbloquear' : 'Bloquear acesso do cliente (emergência)',
    async () => {
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
    }
  );
  if (isBlocked) {
    lockBtn.style.background = 'color-mix(in srgb, var(--red) 15%, transparent)';
    lockBtn.style.borderColor = 'var(--red)';
    lockBtn.style.color = 'var(--red)';
  }
  actions.appendChild(lockBtn);

  // Botão histórico — toggle: abre o painel ou volta ao passo atual
  const histBtn = makeIconButton('📋', 'Histórico da sessão', () => {
    if (wizardState.currentStepId === 'history') {
      wizardState.currentStepId = pickInitialStep(session);
    } else {
      wizardState.currentStepId = 'history';
    }
    refreshWizard();
  });
  if (wizardState.currentStepId === 'history') {
    histBtn.style.background = 'var(--bg-hover)';
    histBtn.style.borderColor = 'var(--accent)';
  }
  actions.appendChild(histBtn);

  if (!session.archivedAt) {
    actions.appendChild(makeIconButton('⚙️', 'Editar configurações da sessão', () => {
      if (!window.editSession) return;
      openOverlayModal({
        modalSelector: '#editSessionModal',
        opener: () => window.editSession(session._id),
        onClose: refreshWizardFromServer
      });
    }));
  }

  actions.appendChild(makeIconButton('🗑️', 'Excluir sessão', async () => {
    const ok = await window.showConfirm?.(`Excluir a sessão "${session.name}"?`, {
      confirmText: 'Excluir', cancelText: 'Cancelar', danger: true
    });
    if (!ok) return;
    closeWizard();
    window.deleteSession?.(session._id);
  }));

  actions.appendChild(makeIconButton('✕', 'Fechar', closeWizard));

  wrap.appendChild(actions);
  return wrap;
}

function makeIconButton(icon, title, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.title = title;
  b.textContent = icon;
  b.style.cssText = `
    background: transparent; border: 1px solid var(--border);
    color: var(--text-secondary); width: 32px; height: 32px;
    border-radius: 0.375rem; cursor: pointer; font-size: 0.9rem;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  `;
  b.onmouseenter = () => { b.style.background = 'var(--bg-hover)'; };
  b.onmouseleave = () => { b.style.background = 'transparent'; };
  b.onclick = onClick;
  return b;
}

// Conteúdo exibido quando a sessão está arquivada (archivedAt setado).
// Todos os passos ficam desativados; só o link externo e o histórico ficam acessíveis.
function buildArchivedView(session) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.5rem; max-width:680px;';

  // Badge arquivada
  const badge = document.createElement('div');
  badge.style.cssText = `
    display:inline-flex; align-items:center; gap:0.5rem;
    background:#6b728022; border:1px solid #6b7280;
    border-radius:0.5rem; padding:0.5rem 1rem; width:fit-content;
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
      border-radius:0.625rem; padding:1rem 1.25rem;
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

function closeWizard() {
  unmountWizardBell();
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
