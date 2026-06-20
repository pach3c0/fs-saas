// Passo 4 do wizard — Acompanhar Seleção do Cliente.
// Grid de fotos com película escura mostrando que é o momento do cliente.
// Fotos com comentário ganham borda pulsante verde e perdem a película.
// Polling adaptativo: 30s default → 10s por 2 min após detectar mudança → 30s.
// Com modal de comentário aberto, intervalo cai pra 8s. Pausa quando a aba perde foco.

import { apiGet, apiPut } from '../../../../utils/api.js';
import { resolveImagePath, escapeHtml } from '../../../../utils/helpers.js';
import { wizardState, stopWizardPolling } from '../state.js';
import { openOverlayModal } from '../utils.js';
import { icon } from '../../../../utils/icons.js';

const POLL_DEFAULT_MS = 30000;       // sem atividade recente
const POLL_FAST_MS = 10000;          // janela "quente" após mudança
const POLL_CHAT_OPEN_MS = 8000;      // modal de chat aberto → conversa exige reatividade
const FAST_WINDOW_MS = 120000;       // 2 min de polling rápido após cada mudança

function buildSnapshot(session) {
  return JSON.stringify({
    selected: (session.selectedPhotos || []).slice().sort(),
    status: session.selectionStatus,
    comments: (session.photos || []).map(p => `${p.id}:${p.comments?.length || 0}`).sort(),
    participants: (session.participants || []).map(p => `${p._id}:${p.selectionStatus}:${(p.selectedPhotos || []).length}`).sort()
  });
}

// Reabre a seleção pelo fotógrafo. participantId opcional reabre só um participante (multi).
async function reopenSelection(session, refresh, participantId = null, participantName = '') {
  const msg = participantId
    ? `Reabrir a seleção de ${participantName}? Ele(a) poderá alterar as fotos escolhidas.`
    : 'Reabrir a seleção? O cliente poderá alterar as fotos escolhidas.';
  const ok = await window.showConfirm?.(msg, { confirmText: 'Reabrir', cancelText: 'Cancelar' });
  if (!ok) return;
  try {
    await apiPut(`/api/sessions/${session._id}/reopen`, participantId ? { participantId } : {});
    window.showToast?.('Seleção reaberta. O cliente pode alterar as fotos.', 'success');
    await refresh();
  } catch (e) {
    window.showToast?.('Erro ao reabrir: ' + e.message, 'error');
  }
}

// Recusa o pedido de reabertura de um participante (limpa o flag, sem reabrir a seleção).
async function dismissReopenParticipant(session, refresh, participantId, participantName) {
  const ok = await window.showConfirm?.(
    `Recusar o pedido de reabertura de ${participantName}? A seleção dele continua finalizada.`,
    { confirmText: 'Recusar', cancelText: 'Cancelar' }
  );
  if (!ok) return;
  try {
    await apiPut(`/api/sessions/${session._id}/dismiss-reopen`, { participantId });
    window.showToast?.('Pedido de reabertura recusado.', 'success');
    await refresh();
  } catch (e) {
    window.showToast?.('Erro ao recusar: ' + e.message, 'error');
  }
}

// Aceita as fotos extras solicitadas por um participante (adiciona à seleção dele).
async function acceptExtraParticipant(session, refresh, participantId, participantName, count) {
  const ok = await window.showConfirm?.(
    `Aceitar ${count} foto(s) extra(s) de ${participantName}? Elas serão adicionadas à seleção dele(a).`,
    { confirmText: 'Aceitar', cancelText: 'Cancelar' }
  );
  if (!ok) return;
  try {
    await apiPut(`/api/sessions/${session._id}/extra-request/accept`, { participantId });
    window.showToast?.(`Extras de ${participantName} adicionadas à seleção.`, 'success');
    await refresh();
  } catch (e) {
    window.showToast?.('Erro ao aceitar: ' + e.message, 'error');
  }
}

// Recusa as fotos extras solicitadas por um participante. Abre modal com motivo
// obrigatório (espelha a recusa da seleção individual em actions.js) — o motivo
// vai no e-mail enviado ao participante.
async function rejectExtraParticipant(session, refresh, participantId, participantName) {
  const modalHtml = `
    <div id="rejectExtraPartModal" style="position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.75);">
      <div style="background:var(--bg-elevated); padding:1.5rem; border-radius:var(--r-card); width:100%; max-width:400px; border:1px solid var(--border); box-shadow:0 10px 15px -3px rgba(0,0,0,0.5);">
        <h3 style="color:var(--text-primary); font-size:1.125rem; font-weight:600; margin-bottom:1rem;">Recusar Fotos Extras</h3>
        <p style="color:var(--text-secondary); font-size:0.875rem; margin-bottom:0.5rem;">Informe a <strong>${escHtml(participantName)}</strong> o motivo da recusa (obrigatório):</p>
        <textarea id="rejectPartReasonInput" rows="3" style="width:100%; padding:0.5rem; background:var(--bg-base); border:1px solid var(--border); color:var(--text-primary); border-radius:var(--r-field); margin-bottom:1rem; font-family:inherit; resize:none;" placeholder="Ex: O pacote escolhido não permite extras, ou o pagamento não foi confirmado..."></textarea>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
          <button id="cancelRejectPartBtn" style="padding:0.5rem 1rem; background:transparent; border:1px solid var(--border); color:var(--text-secondary); border-radius:var(--r-field); cursor:pointer;">Cancelar</button>
          <button id="confirmRejectPartBtn" style="padding:0.5rem 1rem; background:var(--red); border:none; color:white; border-radius:var(--r-field); cursor:pointer; font-weight:600;">Recusar Pedido</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = document.getElementById('rejectExtraPartModal');
  document.getElementById('cancelRejectPartBtn').onclick = () => modal.remove();
  document.getElementById('confirmRejectPartBtn').onclick = async () => {
    const reason = document.getElementById('rejectPartReasonInput').value.trim();
    if (!reason) {
      window.showToast?.('Por favor, informe um motivo para o participante.', 'warning');
      return;
    }
    const btn = document.getElementById('confirmRejectPartBtn');
    btn.textContent = 'Aguarde...';
    btn.disabled = true;
    try {
      await apiPut(`/api/sessions/${session._id}/extra-request/reject`, { participantId, reason });
      modal.remove();
      window.showToast?.('Solicitação recusada e participante notificado.', 'success');
      await refresh();
    } catch (e) {
      btn.textContent = 'Recusar Pedido';
      btn.disabled = false;
      window.showToast?.('Erro ao recusar: ' + e.message, 'error');
    }
  };
}

// Escape mínimo para interpolar nome do participante no HTML do modal.
function escHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function isCommentsModalOpen() {
  const m = document.getElementById('commentsModal');
  return m && m.style.display && m.style.display !== 'none';
}

function pickNextInterval() {
  if (isCommentsModalOpen()) return POLL_CHAT_OPEN_MS;
  const sinceChange = Date.now() - (wizardState.pollingLastChangeAt || 0);
  if (sinceChange < FAST_WINDOW_MS) return POLL_FAST_MS;
  return POLL_DEFAULT_MS;
}

export function renderStepTracking({ session, refresh, inSinglePage = false }) {
  // Limpa polling anterior + listener de visibilidade
  stopWizardPolling();

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.25rem; margin:0; width:100%;';

  const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';
  const isSubmitted = isMulti
    ? allParticipantsSubmitted(session)
    : ['submitted', 'delivered'].includes(session.selectionStatus);

  // Header + botões de ação
  const headerRow = document.createElement('div');
  headerRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; width:100%; gap:1rem; flex-wrap:wrap;';

  const header = document.createElement('div');
  header.style.cssText = 'flex:1; min-width:300px;';
  header.innerHTML = `
    <h2 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin:0 0 0.25rem;">
      Acompanhar ${isMulti ? 'Participantes' : 'Seleção'}
      ${isSubmitted ? '<span style="color:var(--green); font-size:0.875rem;">— Tudo finalizado</span>' : ''}
    </h2>
    <p style="color:var(--text-secondary); font-size:0.875rem; margin:0;">
      ${isSubmitted
      ? (isMulti
        ? 'Todos os participantes enviaram. Você pode prosseguir para subir as fotos editadas.'
        : 'O cliente já enviou a seleção. Você pode prosseguir para subir as fotos editadas.')
      : (isMulti
        ? 'Cada participante seleciona suas fotos individualmente. Acompanhe abaixo o progresso de cada um.'
        : 'Aguardando o cliente escolher as fotos. As fotos abaixo aparecem escurecidas — não interfira durante a seleção. Você só interage onde há comentários.')}
    </p>
  `;
  headerRow.appendChild(header);

  const buttonsRow = document.createElement('div');
  buttonsRow.style.cssText = 'display:flex; gap:0.5rem; align-items:center;';

  if (!isSubmitted) {
    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.title = 'Forçar atualização agora';
    refreshBtn.className = 'header-expand-btn';
    refreshBtn.style.cssText = 'border:1px solid var(--border);';
    refreshBtn.innerHTML = `
      <span class="header-expand-icon" style="display:flex; align-items:center; justify-content:center;">
        ${icon('reabrir', 18)}
      </span>
      <span class="header-expand-label">Atualizar</span>
    `;
    refreshBtn.onclick = async () => {
      refreshBtn.disabled = true;
      refreshBtn.style.opacity = '0.6';
      try {
        await refresh();
      } finally {
        // refresh re-renderiza o passo, esse botão deixa de existir; sem mais o que fazer.
      }
    };
    buttonsRow.appendChild(refreshBtn);
  }

  // Reabrir seleção (iniciada pelo fotógrafo, independente do pedido do cliente).
  // Em single: aparece quando o cliente já enviou. Em multi: por participante na tabela.
  if (!isMulti && session.selectionStatus === 'submitted') {
    const reopenBtn = document.createElement('button');
    reopenBtn.type = 'button';
    reopenBtn.title = 'Reabrir a seleção para o cliente alterar as fotos';
    reopenBtn.className = 'header-expand-btn';
    reopenBtn.style.cssText = 'border:1px solid var(--orange); color:var(--orange); background:color-mix(in srgb, var(--orange) 6%, transparent);';
    reopenBtn.innerHTML = `
      <span class="header-expand-icon" style="display:flex; align-items:center; justify-content:center;">
        ${icon('reabrir', 18)}
      </span>
      <span class="header-expand-label">Reabrir seleção</span>
    `;
    reopenBtn.onclick = () => reopenSelection(session, refresh);
    buttonsRow.appendChild(reopenBtn);
  }

  if (buttonsRow.children.length > 0) {
    headerRow.appendChild(buttonsRow);
  }
  wrap.appendChild(headerRow);

  // Stats em tempo real
  const stats = computeStats(session);
  const statsBar = renderStatsBar(stats, isSubmitted, isMulti);
  wrap.appendChild(statsBar);

  // Multi: tabela de progresso por participante (em cima do grid)
  if (isMulti) {
    wrap.appendChild(renderParticipantsProgress(session, refresh));
  }

  // Grid de fotos com película (compartilhado entre os participantes em multi)
  const grid = renderTrackingGrid(session, isSubmitted, refresh, isMulti);
  wrap.appendChild(grid);

  // Polling adaptativo (só se ainda não submetido)
  if (!isSubmitted) {
    setupAdaptivePolling(session, refresh);
  }

  return wrap;
}

function setupAdaptivePolling(session, refresh) {
  const tick = async () => {
    // Pausa se a aba não estiver visível (não reagenda; o visibilitychange acorda).
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
        window.showToast?.('Atualização do cliente detectada', 'info');
        await refresh(); // re-renderiza o passo (e reagenda o polling de lá)
        return;
      }
      if (!oldSnap) wizardState.lastSelectionSnapshot = newSnap;
    } catch (err) {
      console.warn('[wizard polling] erro:', err && err.message);
    }
    wizardState.pollingTimer = setTimeout(tick, pickNextInterval());
  };

  // Inicializa snapshot na primeira render, sem disparar toast
  if (!wizardState.lastSelectionSnapshot) {
    wizardState.lastSelectionSnapshot = buildSnapshot(session);
  }
  wizardState.pollingTimer = setTimeout(tick, pickNextInterval());

  // Visibility: quando aba volta a ficar visível, dispara um tick imediato
  wizardState.pollingVisibilityHandler = () => {
    if (document.visibilityState === 'visible' && !wizardState.pollingTimer) {
      tick();
    }
  };
  document.addEventListener('visibilitychange', wizardState.pollingVisibilityHandler);
}

function allParticipantsSubmitted(session) {
  const ps = session.participants || [];
  if (!ps.length) return false;
  return ps.every(p => ['submitted', 'delivered'].includes(p.selectionStatus));
}

// União das seleções de todos os participantes (para o grid compartilhado).
function unionSelectedIds(session) {
  const set = new Set();
  (session.participants || []).forEach(p => (p.selectedPhotos || []).forEach(id => set.add(id)));
  return set;
}

function computeStats(session) {
  const photos = session.photos || [];
  const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';
  const selected = isMulti ? Array.from(unionSelectedIds(session)) : (session.selectedPhotos || []);
  const totalComments = photos.reduce((acc, p) => acc + (p.comments?.length || 0), 0);
  return {
    selectedCount: selected.length,
    photosCount: photos.length,
    limit: session.packageLimit || 0,
    totalComments,
    participantsCount: (session.participants || []).length,
    submittedCount: (session.participants || []).filter(p => ['submitted', 'delivered'].includes(p.selectionStatus)).length
  };
}

function renderStatsBar(stats, isSubmitted, isMulti) {
  const bar = document.createElement('div');
  bar.style.cssText = `
    display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem;
  `;

  const stat = (label, value, color = 'var(--text-primary)') => {
    const c = document.createElement('div');
    c.style.cssText = `
      background: var(--bg-surface); border: 1px solid var(--border);
      border-radius:var(--r-card); padding: 0.75rem 1rem;
    `;
    c.innerHTML = `
      <div style="font-size:0.6875rem; font-weight:600; letter-spacing:0.05em; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.25rem;">${label}</div>
      <div style="font-size:1.25rem; font-weight:600; color:${color};">${value}</div>
    `;
    return c;
  };

  if (isMulti) {
    bar.appendChild(stat('Participantes', `${stats.submittedCount} / ${stats.participantsCount}`, stats.submittedCount === stats.participantsCount && stats.participantsCount > 0 ? 'var(--green)' : 'var(--accent)'));
    bar.appendChild(stat('Fotos selecionadas (união)', String(stats.selectedCount), 'var(--accent)'));
  } else {
    bar.appendChild(stat('Selecionadas', `${stats.selectedCount}${stats.limit ? ` / ${stats.limit}` : ''}`, 'var(--accent)'));
  }
  bar.appendChild(stat('Fotos na galeria', String(stats.photosCount)));
  bar.appendChild(stat('Mensagens', String(stats.totalComments), stats.totalComments > 0 ? 'var(--green)' : 'var(--text-muted)'));
  const statusHtml = isSubmitted
    ? `<span style="display:inline-flex; align-items:center; gap:0.375rem; vertical-align:middle;">${icon('checkCircle', 18)} Finalizada</span>`
    : `<span style="display:inline-flex; align-items:center; gap:0.375rem; vertical-align:middle;">${icon('relogio', 18)} Aguardando</span>`;

  bar.appendChild(stat('Status', statusHtml, isSubmitted ? 'var(--green)' : 'var(--yellow)'));

  return bar;
}

// Tabela com cada participante e seu progresso de seleção.
function renderParticipantsProgress(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius:var(--r-card); overflow: hidden;
  `;
  const head = document.createElement('div');
  head.style.cssText = `
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid var(--border);
    font-size: 0.75rem; font-weight: 600; color: var(--text-secondary);
    letter-spacing: 0.05em; text-transform: uppercase;
  `;
  head.textContent = 'Progresso dos participantes';
  wrap.appendChild(head);

  const list = document.createElement('div');
  list.style.cssText = 'display:flex; flex-direction:column;';

  const participants = session.participants || [];
  if (participants.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:1rem; text-align:left; font-size:0.875rem; color:var(--text-muted);';
    empty.textContent = 'Nenhum participante cadastrado.';
    list.appendChild(empty);
  } else {
    participants.forEach((p, i) => {
      const row = document.createElement('div');
      row.style.cssText = `
        padding: 0.625rem 0.875rem;
        display: flex; align-items: center; gap: 0.75rem;
        ${i > 0 ? 'border-top: 1px solid var(--border);' : ''}
      `;
      const status = p.selectionStatus || 'pending';
      const statusInfo = {
        pending: { label: 'Não iniciou', color: 'var(--text-muted)' },
        in_progress: { label: 'Selecionando', color: 'var(--yellow)' },
        submitted: { label: '✓ Enviou', color: 'var(--green)' },
        delivered: { label: 'Entregue', color: 'var(--accent)' }
      }[status] || { label: status, color: 'var(--text-muted)' };

      const count = (p.selectedPhotos || []).length;
      const limit = p.packageLimit || 0;

      row.innerHTML = `
        <div style="flex:1; min-width:120px;">
          <div style="font-weight:500; color:var(--text-primary); font-size:0.875rem;">${escapeHtml(p.name)}</div>
          <div style="font-size:0.6875rem; color:var(--text-muted); font-family:monospace;">${p.accessCode}</div>
        </div>
        <div style="font-size:0.8125rem; color:var(--text-secondary); white-space:nowrap;">
          ${count}${limit ? ` / ${limit}` : ''} fotos
        </div>
        <div style="font-size:0.75rem; color:${statusInfo.color}; font-weight:500; white-space:nowrap;">
          ${statusInfo.label}
          ${p.reopenRequested ? `<div style="margin-top:2px; color:var(--orange); font-weight:600;">⚠ pediu reabertura</div>` : ''}
          ${p.extraRequest?.status === 'pending' ? `<div style="margin-top:2px; color:var(--yellow); font-weight:600;">📸 pediu ${p.extraRequest.photos?.length || 0} extra(s)</div>` : ''}
        </div>
      `;

      // Reabrir seleção deste participante (independente de pedido) — só se já enviou
      if (status === 'submitted' || status === 'delivered') {
        const reopenBtn = document.createElement('button');
        reopenBtn.type = 'button';
        // Quando o participante pediu, o botão "aceita" o pedido (e fica destacado).
        reopenBtn.title = p.reopenRequested ? `Aceitar reabertura de ${p.name}` : `Reabrir a seleção de ${p.name}`;
        reopenBtn.className = 'header-expand-btn';
        reopenBtn.style.cssText = 'border:1px solid var(--orange); color:var(--orange); background:color-mix(in srgb, var(--orange) 6%, transparent); padding:0 1rem;';
        reopenBtn.innerHTML = `
          <span class="header-expand-icon" style="display:flex; align-items:center; justify-content:center;">
            ${icon('reabrir', 16)}
          </span>
          <span class="header-expand-label">${p.reopenRequested ? 'Aceitar reabertura' : 'Reabrir'}</span>
        `;
        reopenBtn.onclick = () => reopenSelection(session, refresh, p._id, p.name);
        row.appendChild(reopenBtn);
      }

      // Recusar o pedido de reabertura deste participante (só quando ele pediu).
      if (p.reopenRequested) {
        const dismissBtn = document.createElement('button');
        dismissBtn.type = 'button';
        dismissBtn.title = `Recusar pedido de ${p.name}`;
        dismissBtn.className = 'header-expand-btn';
        dismissBtn.style.cssText = 'border:1px solid var(--border); color:var(--text-secondary); padding:0 1rem;';
        dismissBtn.innerHTML = `
          <span class="header-expand-icon" style="display:flex; align-items:center; justify-content:center;">
            ${icon('x', 16)}
          </span>
          <span class="header-expand-label">Recusar</span>
        `;
        dismissBtn.onclick = () => dismissReopenParticipant(session, refresh, p._id, p.name);
        row.appendChild(dismissBtn);
      }

      // Fotos extras solicitadas por este participante — aceitar/recusar
      if (p.extraRequest?.status === 'pending') {
        const extraCount = p.extraRequest.photos?.length || 0;

        const acceptExtraBtn = document.createElement('button');
        acceptExtraBtn.type = 'button';
        acceptExtraBtn.title = `Aceitar ${extraCount} foto(s) extra(s) de ${p.name}`;
        acceptExtraBtn.className = 'header-expand-btn';
        acceptExtraBtn.style.cssText = 'border:1px solid var(--green); color:var(--green); background:color-mix(in srgb, var(--green) 6%, transparent); padding:0 1rem;';
        acceptExtraBtn.innerHTML = `
          <span class="header-expand-icon" style="display:flex; align-items:center; justify-content:center;">
            ${icon('checkCircle', 16)}
          </span>
          <span class="header-expand-label">Aceitar ${extraCount} extra(s)</span>
        `;
        acceptExtraBtn.onclick = () => acceptExtraParticipant(session, refresh, p._id, p.name, extraCount);
        row.appendChild(acceptExtraBtn);

        const rejectExtraBtn = document.createElement('button');
        rejectExtraBtn.type = 'button';
        rejectExtraBtn.title = `Recusar fotos extras de ${p.name}`;
        rejectExtraBtn.className = 'header-expand-btn';
        rejectExtraBtn.style.cssText = 'border:1px solid var(--border); color:var(--text-secondary); padding:0 1rem;';
        rejectExtraBtn.innerHTML = `
          <span class="header-expand-icon" style="display:flex; align-items:center; justify-content:center;">
            ${icon('x', 16)}
          </span>
          <span class="header-expand-label">Recusar extras</span>
        `;
        rejectExtraBtn.onclick = () => rejectExtraParticipant(session, refresh, p._id, p.name);
        row.appendChild(rejectExtraBtn);
      }

      list.appendChild(row);
    });
  }

  wrap.appendChild(list);
  return wrap;
}

function renderTrackingGrid(session, isSubmitted, refresh, isMulti) {
  // ── Wrapper flex centralizado (padrão círculo morph) ──────────────────
  const grid = document.createElement('div');
  grid.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 1.25rem;
    width: 100%;
  `;

  // Em multi, mapeia foto → array de participantes que a selecionaram.
  // Em single, foto → boolean (selecionada pelo cliente).
  const photoSelectors = isMulti
    ? buildPhotoSelectorsMap(session)
    : null;
  const selectedSet = isMulti
    ? new Set(photoSelectors.keys())
    : new Set(session.selectedPhotos || []);

  (session.photos || []).forEach(photo => {
    const hasComments = (photo.comments?.length || 0) > 0;
    const isSelected = selectedSet.has(photo.id);
    const selectorNames = isMulti && isSelected ? photoSelectors.get(photo.id) : null;

    // Calcula aspect ratio para o tamanho do hover
    const w = photo.width;
    const h = photo.height;
    const aspect = (w && h) ? (w / h) : 1.5;
    const hoverHeight = 200;
    const hoverWidth = Math.round(hoverHeight * aspect);

    // Cor da borda: verde se selecionada/finalizada, amarela se pendente, padrão se sem comentários
    const borderColor = hasComments
      ? 'var(--green)'
      : isSelected
        ? (isSubmitted ? 'var(--green)' : 'var(--accent)')
        : 'var(--border)';

    const cell = document.createElement('div');
    cell.style.cssText = `
      position: relative;
      width: 200px;
      height: 150px;
      border-radius: var(--r-card);
      background: var(--bg-surface);
      overflow: hidden;
      border: 2px solid ${borderColor};
      ${photo.hidden ? 'opacity: 0.35;' : ''}
      ${hasComments ? 'animation: wizardChatPulse 2s ease-in-out infinite;' : ''}
      transition: border-color 0.15s;
    `;

    const img = document.createElement('img');
    img.src = resolveImagePath(photo.url);
    img.alt = photo.filename || '';
    img.loading = 'lazy';
    img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
    cell.appendChild(img);

    // Película escura (não selecionada ou aguardando) — visível antes de submeter
    if (!isSubmitted && !hasComments) {
      const film = document.createElement('div');
      film.style.cssText = `
        position: absolute; inset: 0;
        background: rgba(0,0,0, ${isSelected ? '0.35' : '0.55'});
        display: flex; align-items: ${isMulti && isSelected ? 'flex-end' : 'center'}; justify-content: center;
        color: rgba(255,255,255,0.85); font-size: 0.6875rem; font-weight: 600;
        pointer-events: none; padding: 4px;
        opacity: 0; transition: opacity 0.18s;
      `;
      film.dataset.film = '1';
      if (isMulti && isSelected) {
        film.innerHTML = renderSelectorChips(selectorNames);
      } else {
        film.textContent = isSelected ? '✓' : '🔒';
      }
      cell.appendChild(film);
    }

    // Badge check verde (selecionada e submetida) — canto superior direito
    if (isSubmitted && isSelected && !isMulti) {
      const sel = document.createElement('div');
      sel.textContent = '✓';
      sel.style.cssText = `
        position: absolute; top: 4px; right: 4px;
        background: var(--green); color: white;
        width: 18px; height: 18px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.625rem; font-weight: 700;
        transition: top 0.3s cubic-bezier(0.4,0,0.2,1), right 0.3s cubic-bezier(0.4,0,0.2,1);
      `;
      sel.dataset.badge = 'check';
      cell.appendChild(sel);
    }

    // Multi: chips de participantes — aparecem no hover
    if (isSubmitted && isSelected && isMulti) {
      const sel = document.createElement('div');
      sel.style.cssText = `
        position: absolute; bottom: 0; left: 0; right: 0;
        background: linear-gradient(transparent, rgba(0,0,0,0.7));
        color: white; padding: 8px 6px 6px;
        font-size: 0.5625rem; font-weight: 600;
        display: flex; flex-wrap: wrap; gap: 2px; justify-content: center;
        opacity: 0; transition: opacity 0.18s;
      `;
      sel.dataset.selchips = '1';
      sel.innerHTML = renderSelectorChips(selectorNames);
      cell.appendChild(sel);
    }

    // Badge de mensagens (sempre visível quando hover; ativo se tem comentários)
    if (hasComments) {
      const chat = document.createElement('button');
      chat.type = 'button';
      chat.style.cssText = `
        position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%);
        background: var(--green); color: white;
        padding: 2px 8px; border: none; border-radius: 999px;
        font-size: 0.5625rem; font-weight: 700;
        cursor: pointer; display: flex; align-items: center; gap: 3px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        white-space: nowrap; opacity: 0;
        transition: opacity 0.18s, bottom 0.3s cubic-bezier(0.4,0,0.2,1);
      `;
      chat.innerHTML = `💬 ${photo.comments.length}`;
      chat.title = 'Abrir mensagens';
      chat.dataset.chat = '1';
      chat.onclick = (e) => {
        e.stopPropagation();
        if (!window.openComments) return;
        openOverlayModal({
          modalSelector: '#commentsModal',
          opener: () => window.openComments(session._id, photo.id)
        });
      };
      cell.appendChild(chat);
    }

    // ── Hover: mostrar overlay ─────────────────────────────────────────
    cell.addEventListener('mouseenter', () => {
      const film = cell.querySelector('[data-film]');
      if (film) film.style.opacity = '1';

      const selChips = cell.querySelector('[data-selchips]');
      if (selChips) selChips.style.opacity = '1';

      const chat = cell.querySelector('[data-chat]');
      if (chat) { chat.style.opacity = '1'; chat.style.bottom = '6px'; }

      const badge = cell.querySelector('[data-badge="check"]');
      if (badge) { badge.style.top = '6px'; badge.style.right = '6px'; }
    });

    cell.addEventListener('mouseleave', () => {
      const film = cell.querySelector('[data-film]');
      if (film) film.style.opacity = '0';

      const selChips = cell.querySelector('[data-selchips]');
      if (selChips) selChips.style.opacity = '0';

      const chat = cell.querySelector('[data-chat]');
      if (chat) { chat.style.opacity = '0'; }

      const badge = cell.querySelector('[data-badge="check"]');
      if (badge) { badge.style.top = '4px'; badge.style.right = '4px'; }
    });

    grid.appendChild(cell);
  });

  if ((session.photos || []).length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:2rem; text-align:left; color:var(--text-muted); font-size:0.875rem; width:100%';
    empty.textContent = 'Nenhuma foto na sessão.';
    grid.appendChild(empty);
  }

  return grid;
}

// Em multi: mapeia photoId → array de primeiros nomes dos participantes que a selecionaram.
function buildPhotoSelectorsMap(session) {
  const map = new Map();
  (session.participants || []).forEach(p => {
    const firstName = String(p.name || '').split(' ')[0] || 'P';
    (p.selectedPhotos || []).forEach(photoId => {
      if (!map.has(photoId)) map.set(photoId, []);
      map.get(photoId).push(firstName);
    });
  });
  return map;
}

// Renderiza chips compactos com nomes (até 3 + "+N" se mais). Cor verde da seleção.
function renderSelectorChips(names) {
  if (!names || !names.length) return '';
  const visible = names.slice(0, 3);
  const extra = names.length - visible.length;
  let html = visible.map(n => `
    <span style="background:var(--green); color:white; padding:1px 6px; border-radius:999px; font-size:0.625rem; line-height:1.2; white-space:nowrap;">
      ✓ ${escapeHtml(n)}
    </span>
  `).join('');
  if (extra > 0) {
    html += `<span style="background:var(--bg-elevated); color:var(--text-primary); padding:1px 6px; border-radius:999px; font-size:0.625rem; line-height:1.2;">+${extra}</span>`;
  }
  return html;
}
