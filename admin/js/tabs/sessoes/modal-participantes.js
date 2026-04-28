import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/api.js';
import { appState } from '../../state.js';
import { escapeHtml } from '../../utils/helpers.js';

const STATUS_LABELS = {
  pending: { text: 'Pendente', class: 'badge-neutral' },
  in_progress: { text: 'Em seleção', class: 'badge-warning' },
  submitted: { text: 'Seleção enviada', class: 'badge-success' },
  delivered: { text: 'Entregue', class: 'badge-blue' },
  expired: { text: 'Expirado', class: 'badge-danger' }
};

export function setupParticipantes(container, state, renderSessoes) {
  const participantsModal = container.querySelector('#participantsModal');
  const participantsList = container.querySelector('#participantsList');

  const partNameInput = container.querySelector('#newPartName');
  const partEmailInput = container.querySelector('#newPartEmail');
  const partDropdown = container.querySelector('#partClientDropdown');
  let _partSearchTimer = null;

  function renderPartDropdown(clients) {
    partDropdown.innerHTML = '';
    if (!clients.length) {
      partDropdown.style.display = 'none';
      return;
    }
    clients.forEach(c => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:0.5rem 0.75rem; cursor:pointer; color:var(--ad-text); font-size:0.875rem; border-top:1px solid var(--ad-border);';
      item.innerHTML = `<strong>${escapeHtml(c.name)}</strong>${c.email ? `<span style="color:var(--ad-text-muted); font-size:0.75rem;"> · ${escapeHtml(c.email)}</span>` : ''}`;
      item.onmouseenter = () => item.style.background = 'var(--ad-bg-hover)';
      item.onmouseleave = () => item.style.background = '';
      item.onclick = () => {
        partNameInput.value = c.name;
        partEmailInput.value = c.email || '';
        container.querySelector('#newPartClientId').value = c._id;
        partDropdown.style.display = 'none';
      };
      partDropdown.appendChild(item);
    });
    partDropdown.style.display = 'block';
  }

  partNameInput.oninput = () => {
    clearTimeout(_partSearchTimer);
    container.querySelector('#newPartClientId').value = '';
    const q = partNameInput.value.trim();
    if (!q) { partDropdown.style.display = 'none'; return; }
    _partSearchTimer = setTimeout(async () => {
      try {
        const data = await apiGet(`/api/clients/search?q=${encodeURIComponent(q)}`);
        renderPartDropdown(data.clients || []);
      } catch { partDropdown.style.display = 'none'; }
    }, 300);
  };

  document.addEventListener('click', (e) => {
    if (!partNameInput.contains(e.target) && !partDropdown.contains(e.target)) {
      partDropdown.style.display = 'none';
    }
  }, { capture: true });

  function renderParticipantsList(participants) {
    if (!participants || participants.length === 0) {
      participantsList.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">Nenhum participante adicionado.</p>';
      return;
    }
    participantsList.innerHTML = participants.map(p => {
      const status = STATUS_LABELS[p.selectionStatus] || STATUS_LABELS.pending;
      const count = (p.selectedPhotos || []).length;
      return `
        <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:0.75rem; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="color:var(--text-primary); font-weight:600;">${p.name}</div>
            <div style="color:var(--text-secondary); font-size:0.75rem;">
              Código: <span style="font-family:monospace; color:var(--accent); cursor:pointer;" onclick="copySessionCode('${p.accessCode}')" title="Copiar">${p.accessCode}</span>
              • ${count}/${p.packageLimit} fotos
              • <span>${status.text}</span>
            </div>
          </div>
          <div style="display:flex; gap:0.5rem;">
            ${p.selectionStatus === 'submitted' ? `
            <button onclick="deliverParticipant('${p._id}')" class="btn btn-sm btn-success">Entregar</button>
            ` : ''}
            <button onclick="deleteParticipant('${p._id}')" class="btn btn-sm btn-danger">X</button>
          </div>
        </div>
      `;
    }).join('');
  }

  window.viewParticipants = async (sessionId) => {
    state.currentParticipantsSessionId = sessionId;
    const session = state.sessionsData.find(s => s._id === sessionId);
    if (!session) return;
    container.querySelector('#participantsModalTitle').textContent = `Participantes - ${session.name}`;
    renderParticipantsList(session.participants || []);
    participantsModal.style.display = 'flex';
  };

  container.querySelector('#addParticipantBtn').onclick = async () => {
    const name = partNameInput.value.trim();
    const email = partEmailInput.value.trim();
    const packageLimit = container.querySelector('#newPartLimit').value;
    const clientId = container.querySelector('#newPartClientId').value || undefined;
    if (!name) return window.showToast?.('Nome é obrigatório', 'warning');
    try {
      const result = await apiPost(`/api/sessions/${state.currentParticipantsSessionId}/participants`, { name, email, packageLimit, clientId });
      if (result.success || result.participants) {
        renderParticipantsList(result.participants || result.session.participants);
        partNameInput.value = '';
        partEmailInput.value = '';
        container.querySelector('#newPartClientId').value = '';
      }
    } catch (e) { window.showToast?.(e.message, 'error'); }
  };

  window.deleteParticipant = async (pid) => {
    const ok = await window.showConfirm?.('Remover participante?');
    if (!ok) return;
    try {
      await apiDelete(`/api/sessions/${state.currentParticipantsSessionId}/participants/${pid}`);
      await renderSessoes(container);
      window.viewParticipants(state.currentParticipantsSessionId);
    } catch (e) { window.showToast?.(e.message, 'error'); }
  };

  window.deliverParticipant = async (pid) => {
    const ok = await window.showConfirm?.('Marcar como entregue?');
    if (!ok) return;
    try {
      await apiPut(`/api/sessions/${state.currentParticipantsSessionId}/participants/${pid}/deliver`);
      await renderSessoes(container);
      window.viewParticipants(state.currentParticipantsSessionId);
    } catch (e) { window.showToast?.(e.message, 'error'); }
  };

  container.querySelector('#closeParticipantsModal').onclick = () => {
    participantsModal.style.display = 'none';
  };

  container.querySelector('#exportParticipantsBtn').onclick = () => {
    window.open(`/api/sessions/${state.currentParticipantsSessionId}/participants/export?token=${appState.authToken}`, '_blank');
  };
}
