// unified-grid/stats.js — Painel de status: progresso dos participantes (multi) ou
// status da seleção individual (single), incluindo aceitar/recusar extras nível-sessão.
// Extraído de unified-photo-grid.js sem alteração de comportamento.

import { apiPut } from '../../../../utils/api.js';
import { icon } from '../../../../utils/icons.js';
import { makeExtraActionBtn } from './helpers.js';
import { renderParticipantsTable } from './participants.js';

// ── Stats Panel ────────────────────────────────────────────────────────────
export function renderStatsPanel(session, isMulti, selectionDone, countSelected, countEdited, refresh) {
  const panel = document.createElement('div');
  panel.style.cssText = `
    background:var(--bg-surface); border:1px solid var(--border);
    border-radius:var(--r-card); overflow:hidden;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    padding:.5rem .875rem;
    display:flex; align-items:center; justify-content:space-between; gap:.75rem;
    border-bottom:1px solid var(--border); cursor:pointer; user-select:none;
  `;

  const titleEl = document.createElement('span');
  titleEl.style.cssText = 'font-size:.75rem; font-weight:600; color:var(--text-secondary); letter-spacing:.05em; text-transform:uppercase;';
  titleEl.textContent = isMulti ? 'Progresso dos Participantes' : 'Status da Seleção';
  header.appendChild(titleEl);

  const toggleIcon = document.createElement('span');
  toggleIcon.style.cssText = 'color:var(--text-muted); display:flex; align-items:center; transition:transform .2s;';
  toggleIcon.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
  header.appendChild(toggleIcon);

  const body = document.createElement('div');
  body.style.cssText = 'padding:.625rem .875rem;';

  let collapsed = false;
  header.onclick = () => {
    collapsed = !collapsed;
    body.style.display = collapsed ? 'none' : 'block';
    toggleIcon.style.transform = collapsed ? 'rotate(180deg)' : '';
  };

  // Conteúdo do body
  if (isMulti) {
    body.appendChild(renderParticipantsTable(session, refresh));
  } else {
    body.appendChild(renderSingleStats(session, selectionDone, countSelected, countEdited, refresh));
  }

  panel.appendChild(header);
  panel.appendChild(body);
  return panel;
}

export function renderSingleStats(session, selectionDone, countSelected, countEdited, refresh) {
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:.5rem;';

  const photos = session.photos || [];
  const totalComments = photos.reduce((acc, p) => acc + (p.comments?.length || 0), 0);
  const isSubmitted = ['submitted', 'delivered'].includes(session.selectionStatus);

  const statCard = (label, value, color = 'var(--text-primary)') => {
    const c = document.createElement('div');
    c.style.cssText = 'background:var(--bg-base); border:1px solid var(--border); border-radius:var(--r-card); padding:.5rem .75rem;';
    c.innerHTML = `
      <div style="font-size:.625rem; font-weight:600; letter-spacing:.05em; color:var(--text-muted); text-transform:uppercase; margin-bottom:.125rem;">${label}</div>
      <div style="font-size:1.0625rem; font-weight:600; color:${color};">${value}</div>
    `;
    return c;
  };

  grid.appendChild(statCard('Selecionadas', String(countSelected), 'var(--accent)'));
  grid.appendChild(statCard('Editadas', String(countEdited), countEdited === countSelected && countSelected > 0 ? 'var(--green)' : 'var(--text-primary)'));
  grid.appendChild(statCard('Mensagens', String(totalComments), totalComments > 0 ? 'var(--green)' : 'var(--text-muted)'));

  const statusHtml = isSubmitted
    ? `<span style="display:inline-flex;align-items:center;gap:.25rem;">${icon('checkCircle', 14)} Finalizada</span>`
    : `<span style="display:inline-flex;align-items:center;gap:.25rem;">${icon('relogio', 14)} Aguardando</span>`;
  grid.appendChild(statCard('Status', statusHtml, isSubmitted ? 'var(--green)' : 'var(--yellow)'));

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:.5rem;';
  wrap.appendChild(grid);

  // Fotos extras solicitadas pelo cliente — aceitar/recusar (nível-sessão).
  if (session.extraRequest?.status === 'pending') {
    const extraCount = session.extraRequest.photos?.length || 0;
    const extraRow = document.createElement('div');
    extraRow.style.cssText = `
      display:flex; align-items:center; gap:.5rem; flex-wrap:wrap;
      background:color-mix(in srgb, var(--yellow) 8%, transparent);
      border:1px solid color-mix(in srgb, var(--yellow) 30%, transparent);
      border-radius:var(--r-card); padding:.5rem .75rem;
    `;
    const label = document.createElement('span');
    label.style.cssText = 'font-size:.8125rem; color:var(--text-primary); font-weight:600; flex:1; min-width:140px;';
    label.textContent = `📸 Cliente pediu ${extraCount} foto(s) extra(s)`;
    extraRow.appendChild(label);

    const acceptBtn = makeExtraActionBtn(`${icon('checkCircle', 13)} Aceitar`, 'var(--green)');
    acceptBtn.title = `Aceitar ${extraCount} foto(s) extra(s) e adicionar à seleção`;
    acceptBtn.onclick = () => handleAcceptExtra(session, refresh);
    extraRow.appendChild(acceptBtn);

    const rejectBtn = makeExtraActionBtn(`${icon('x', 13)} Recusar`, 'var(--red)');
    rejectBtn.title = 'Recusar o pedido de fotos extras';
    rejectBtn.onclick = () => handleRejectExtra(session, refresh);
    extraRow.appendChild(rejectBtn);

    wrap.appendChild(extraRow);
  }

  // Botão reabrir (quando já submetido)
  if (session.selectionStatus === 'submitted') {
    const reopenBtn = document.createElement('button');
    reopenBtn.type = 'button';
    reopenBtn.className = 'cz-ug-pill';
    reopenBtn.style.cssText += 'border-color:var(--orange); color:var(--orange); align-self:flex-start;';
    reopenBtn.innerHTML = `<span style="display:flex;align-items:center;">${icon('reabrir', 14)}</span><span>Reabrir seleção</span>`;
    reopenBtn.onclick = async () => {
      const ok = await window.showConfirm?.('Reabrir a seleção? O cliente poderá alterar as fotos.', { confirmText: 'Reabrir', cancelText: 'Cancelar' });
      if (!ok) return;
      try {
        await apiPut(`/api/sessions/${session._id}/reopen`, {});
        window.showToast?.('Seleção reaberta.', 'success');
        await refresh();
      } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
    };
    wrap.appendChild(reopenBtn);
  }

  return wrap;
}

// Aceita as fotos extras solicitadas pelo cliente (seleção individual, nível-sessão).
async function handleAcceptExtra(session, refresh) {
  const count = session.extraRequest?.photos?.length || 0;
  const ok = await window.showConfirm?.(
    `Aceitar ${count} foto(s) extra(s) solicitada(s)? Elas serão adicionadas à seleção do cliente.`,
    { confirmText: 'Aceitar', cancelText: 'Cancelar' }
  );
  if (!ok) return;
  try {
    await apiPut(`/api/sessions/${session._id}/extra-request/accept`, {});
    window.showToast?.('Extras aceitas e adicionadas à seleção!', 'success');
    await refresh();
  } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
}

// Recusa as fotos extras (nível-sessão). Modal com motivo obrigatório — vai no e-mail ao cliente.
function handleRejectExtra(session, refresh) {
  document.getElementById('ugRejectExtraModal')?.remove();
  const modalHtml = `
    <div id="ugRejectExtraModal" style="position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.75);">
      <div style="background:var(--bg-elevated); padding:1.5rem; border-radius:var(--r-card); width:100%; max-width:400px; border:1px solid var(--border); box-shadow:0 10px 15px -3px rgba(0,0,0,0.5);">
        <h3 style="color:var(--text-primary); font-size:1.125rem; font-weight:600; margin-bottom:1rem;">Recusar Fotos Extras</h3>
        <p style="color:var(--text-secondary); font-size:0.875rem; margin-bottom:0.5rem;">Informe ao cliente o motivo da recusa (obrigatório):</p>
        <textarea id="ugRejectReasonInput" rows="3" style="width:100%; padding:0.5rem; background:var(--bg-base); border:1px solid var(--border); color:var(--text-primary); border-radius:var(--r-field); margin-bottom:1rem; font-family:inherit; resize:none;" placeholder="Ex: O pacote escolhido não permite extras, ou o pagamento não foi confirmado..."></textarea>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
          <button id="ugCancelRejectBtn" style="padding:0.5rem 1rem; background:transparent; border:1px solid var(--border); color:var(--text-secondary); border-radius:var(--r-field); cursor:pointer;">Cancelar</button>
          <button id="ugConfirmRejectBtn" style="padding:0.5rem 1rem; background:var(--red); border:none; color:white; border-radius:var(--r-field); cursor:pointer; font-weight:600;">Recusar Pedido</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = document.getElementById('ugRejectExtraModal');
  document.getElementById('ugCancelRejectBtn').onclick = () => modal.remove();
  document.getElementById('ugConfirmRejectBtn').onclick = async () => {
    const reason = document.getElementById('ugRejectReasonInput').value.trim();
    if (!reason) {
      window.showToast?.('Por favor, informe um motivo para o cliente.', 'warning');
      return;
    }
    const btn = document.getElementById('ugConfirmRejectBtn');
    btn.textContent = 'Aguarde...';
    btn.disabled = true;
    try {
      await apiPut(`/api/sessions/${session._id}/extra-request/reject`, { reason });
      modal.remove();
      window.showToast?.('Solicitação recusada e cliente notificado.', 'success');
      await refresh();
    } catch (e) {
      btn.textContent = 'Recusar Pedido';
      btn.disabled = false;
      window.showToast?.('Erro ao recusar: ' + e.message, 'error');
    }
  };
}
