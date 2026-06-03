// Passo 4 do wizard — Acompanhar Seleção do Cliente.
// Grid de fotos com película escura mostrando que é o momento do cliente.
// Fotos com comentário ganham borda pulsante verde e perdem a película.
// Polling adaptativo: 30s default → 10s por 2 min após detectar mudança → 30s.
// Com modal de comentário aberto, intervalo cai pra 8s. Pausa quando a aba perde foco.

import { apiGet, apiPut } from '../../../../utils/api.js';
import { resolveImagePath, escapeHtml } from '../../../../utils/helpers.js';
import { wizardState, stopWizardPolling } from '../state.js';
import { openOverlayModal } from '../utils.js';

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

export function renderStepTracking({ session, refresh }) {
  // Limpa polling anterior + listener de visibilidade
  stopWizardPolling();

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.25rem; max-width:1200px;';

  const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';
  const isSubmitted = isMulti
    ? allParticipantsSubmitted(session)
    : ['submitted', 'delivered'].includes(session.selectionStatus);

  // Header + botão "Atualizar agora"
  const headerRow = document.createElement('div');
  headerRow.style.cssText = 'display:flex; align-items:flex-start; gap:1rem; flex-wrap:wrap;';

  const header = document.createElement('div');
  header.style.cssText = 'flex:1; min-width:240px;';
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

  if (!isSubmitted) {
    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.title = 'Forçar atualização agora';
    refreshBtn.innerHTML = '🔄 Atualizar';
    refreshBtn.style.cssText = `
      background: var(--bg-surface); border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 0.5rem 0.875rem; border-radius: 0.375rem;
      cursor: pointer; font-size: 0.8125rem; font-weight: 500;
      align-self: flex-start;
    `;
    refreshBtn.onclick = async () => {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '⏳ Atualizando…';
      try {
        await refresh();
      } finally {
        // refresh re-renderiza o passo, esse botão deixa de existir; sem mais o que fazer.
      }
    };
    headerRow.appendChild(refreshBtn);
  }

  // Reabrir seleção (iniciada pelo fotógrafo, independente do pedido do cliente).
  // Em single: aparece quando o cliente já enviou. Em multi: por participante na tabela.
  if (!isMulti && session.selectionStatus === 'submitted') {
    const reopenBtn = document.createElement('button');
    reopenBtn.type = 'button';
    reopenBtn.title = 'Reabrir a seleção para o cliente alterar as fotos';
    reopenBtn.innerHTML = '🔓 Reabrir seleção';
    reopenBtn.style.cssText = `
      background: transparent; border: 1px solid var(--orange);
      color: var(--orange);
      padding: 0.5rem 0.875rem; border-radius: 0.375rem;
      cursor: pointer; font-size: 0.8125rem; font-weight: 600;
      align-self: flex-start;
    `;
    reopenBtn.onclick = () => reopenSelection(session, refresh);
    headerRow.appendChild(reopenBtn);
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
      border-radius: 0.5rem; padding: 0.75rem 1rem;
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
  bar.appendChild(stat('Status', isSubmitted ? '✓ Finalizada' : '⏳ Aguardando', isSubmitted ? 'var(--green)' : 'var(--yellow)'));

  return bar;
}

// Tabela com cada participante e seu progresso de seleção.
function renderParticipantsProgress(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius: 0.5rem; overflow: hidden;
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
    empty.style.cssText = 'padding:1rem; text-align:center; font-size:0.875rem; color:var(--text-muted);';
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
        </div>
      `;

      // Reabrir seleção deste participante (independente de pedido) — só se já enviou
      if (status === 'submitted' || status === 'delivered') {
        const reopenBtn = document.createElement('button');
        reopenBtn.type = 'button';
        reopenBtn.title = `Reabrir a seleção de ${p.name}`;
        reopenBtn.innerHTML = '🔓 Reabrir';
        reopenBtn.style.cssText = `
          background: transparent; border: 1px solid var(--orange);
          color: var(--orange);
          padding: 0.25rem 0.625rem; border-radius: 0.375rem;
          cursor: pointer; font-size: 0.75rem; font-weight: 600; white-space: nowrap;
        `;
        reopenBtn.onclick = () => reopenSelection(session, refresh, p._id, p.name);
        row.appendChild(reopenBtn);
      }

      list.appendChild(row);
    });
  }

  wrap.appendChild(list);
  return wrap;
}

function renderTrackingGrid(session, isSubmitted, refresh, isMulti) {
  const grid = document.createElement('div');
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.5rem;
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

    const cell = document.createElement('div');
    cell.style.cssText = `
      position: relative; aspect-ratio: 3/2;
      background: var(--bg-surface); border-radius: 0.375rem;
      overflow: hidden;
      ${hasComments ? 'animation: wizardChatPulse 2s ease-in-out infinite;' : 'border: 1px solid var(--border);'}
      ${photo.hidden ? 'opacity: 0.3;' : ''}
    `;

    const img = document.createElement('img');
    img.src = resolveImagePath(photo.url);
    img.alt = photo.filename || '';
    img.loading = 'lazy';
    img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
    cell.appendChild(img);

    // Película: só aplica se NÃO finalizado E NÃO tem comentários
    if (!isSubmitted && !hasComments) {
      const film = document.createElement('div');
      film.style.cssText = `
        position: absolute; inset: 0;
        background: rgba(0,0,0, ${isSelected ? '0.35' : '0.55'});
        display: flex; align-items: ${isMulti && isSelected ? 'flex-end' : 'center'}; justify-content: center;
        color: rgba(255,255,255,0.85); font-size: 0.6875rem; font-weight: 600;
        pointer-events: none; padding: 4px;
      `;
      if (isMulti && isSelected) {
        // Em multi, lista os participantes que selecionaram (até 3, depois "+N")
        film.innerHTML = renderSelectorChips(selectorNames);
      } else {
        film.textContent = isSelected ? '✓ Selecionada' : '🔒';
      }
      cell.appendChild(film);
    }

    // Badge "selecionada" sempre visível quando isSubmitted (sem película)
    if (isSubmitted && isSelected) {
      if (isMulti) {
        // Múltiplos selecionadores: badge com nomes no fundo
        const sel = document.createElement('div');
        sel.style.cssText = `
          position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.7));
          color: white; padding: 8px 6px 6px;
          font-size: 0.6875rem; font-weight: 600;
          display: flex; flex-wrap: wrap; gap: 3px; justify-content: center;
        `;
        sel.innerHTML = renderSelectorChips(selectorNames);
        cell.appendChild(sel);
      } else {
        const sel = document.createElement('div');
        sel.textContent = '✓';
        sel.style.cssText = `
          position: absolute; top: 4px; right: 4px;
          background: var(--green); color: white;
          width: 22px; height: 22px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 700;
        `;
        cell.appendChild(sel);
      }
    }

    // Badge de mensagens (sempre visível se tiver)
    if (hasComments) {
      const chat = document.createElement('button');
      chat.type = 'button';
      chat.style.cssText = `
        position: absolute; bottom: 4px; left: 4px;
        background: var(--green); color: white;
        padding: 3px 8px; border: none; border-radius: 999px;
        font-size: 0.6875rem; font-weight: 600;
        cursor: pointer; display: flex; align-items: center; gap: 3px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      `;
      chat.innerHTML = `💬 ${photo.comments.length}`;
      chat.title = 'Abrir mensagens';
      chat.onclick = () => {
        if (!window.openComments) return;
        openOverlayModal({
          modalSelector: '#commentsModal',
          opener: () => window.openComments(session._id, photo.id)
        });
      };
      cell.appendChild(chat);
    }

    grid.appendChild(cell);
  });

  if ((session.photos || []).length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:2rem; text-align:center; color:var(--text-muted); font-size:0.875rem; grid-column:1/-1;';
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
