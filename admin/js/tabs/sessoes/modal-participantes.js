import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/api.js';
import { appState } from '../../state.js';
import { escapeHtml } from '../../utils/helpers.js';
import { icon } from '../../utils/icons.js';
import { setupClientModal, abrirModalClienteNovo } from '../../utils/client-modal.js';

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
  let _currentParticipants = [];

  // Preenche os campos do participante a partir de um cliente do banco (Rhyno).
  // clientId só guarda ObjectId do Mongo; IDs do Rhyno (prefixo 'rhyno:') ficam só no snapshot.
  function fillFromClient(c) {
    if (!c) return;
    partNameInput.value = c.name || '';
    partEmailInput.value = c.email || '';
    container.querySelector('#newPartPhone').value = c.phone || '';
    const idStr = String(c._id || '');
    container.querySelector('#newPartClientId').value = idStr.startsWith('rhyno:') ? '' : idStr;
    partDropdown.style.display = 'none';
  }

  // Abre o modal de cadastro de cliente (no Rhyno) sem sair da sessão; ao salvar,
  // preenche o participante com o cliente recém-criado.
  function abrirCadastroCliente(nome) {
    partDropdown.style.display = 'none';
    setupClientModal();
    abrirModalClienteNovo(nome, (nc) => fillFromClient(nc), { target: 'rhyno' });
  }

  function renderPartDropdown(clients, query) {
    partDropdown.innerHTML = '';
    clients.forEach(c => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:0.5rem 0.75rem; cursor:pointer; color:var(--text-primary); font-size:0.875rem; border-top:1px solid var(--border); background:var(--bg-surface);';
      item.innerHTML = `<strong>${escapeHtml(c.name)}</strong>${c.email ? `<span style="color:var(--text-muted); font-size:0.75rem;"> · ${escapeHtml(c.email)}</span>` : ''}`;
      item.onmouseenter = () => item.style.background = 'var(--bg-hover)';
      item.onmouseleave = () => item.style.background = 'var(--bg-surface)';
      item.onclick = () => fillFromClient(c);
      partDropdown.appendChild(item);
    });

    // Opção de cadastrar quando há texto digitado (não achou ou quer um novo).
    if (query) {
      const criar = document.createElement('div');
      criar.style.cssText = 'padding:0.5rem 0.75rem; cursor:pointer; color:var(--accent); font-size:0.875rem; font-weight:500; border-top:1px solid var(--border); background:var(--bg-surface);';
      criar.textContent = `+ Cadastrar "${query}"`;
      criar.onmouseenter = () => criar.style.background = 'var(--bg-hover)';
      criar.onmouseleave = () => criar.style.background = 'var(--bg-surface)';
      criar.onclick = () => abrirCadastroCliente(query);
      partDropdown.appendChild(criar);
    }

    partDropdown.style.display = (clients.length || query) ? 'block' : 'none';
  }

  partNameInput.oninput = () => {
    clearTimeout(_partSearchTimer);
    container.querySelector('#newPartClientId').value = '';
    container.querySelector('#newPartPhone').value = '';
    const q = partNameInput.value.trim();
    if (!q) { partDropdown.style.display = 'none'; return; }
    _partSearchTimer = setTimeout(async () => {
      try {
        const data = await apiGet(`/api/gestao/customers?search=${encodeURIComponent(q)}`);
        renderPartDropdown(data.clients || [], q);
      } catch { renderPartDropdown([], q); }
    }, 300);
  };

  document.addEventListener('click', (e) => {
    if (!partNameInput.contains(e.target) && !partDropdown.contains(e.target)) {
      partDropdown.style.display = 'none';
    }
  }, { capture: true });

  function renderParticipantsList(participants) {
    _currentParticipants = participants || [];
    if (!participants || participants.length === 0) {
      participantsList.innerHTML = '<p style="color:var(--text-muted); text-align:center;">Nenhum participante adicionado.</p>';
      return;
    }
    participantsList.innerHTML = participants.map(p => {
      const status = STATUS_LABELS[p.selectionStatus] || STATUS_LABELS.pending;
      const count = (p.selectedPhotos || []).length;
      const phoneInfo = p.phone ? ` · ${escapeHtml(p.phone)}` : '';
      return `
        <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--r-card); padding:0.75rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
          <div style="min-width:0; flex:1;">
            <div style="color:var(--text-primary); font-weight:600; margin-bottom:0.25rem;">${escapeHtml(p.name)}</div>
            <div style="color:var(--text-muted); font-size:0.75rem; display:flex; flex-wrap:wrap; gap:0.375rem; align-items:center;">
              <span>Código: <span style="font-family:monospace; color:var(--accent); cursor:pointer;" onclick="copySessionCode('${p.accessCode}')" title="Copiar">${p.accessCode}</span></span>
              <span>·</span>
              <span>${count}/${p.packageLimit} fotos</span>
              ${p.extraPhotoPrice != null ? `<span>·</span><span>R$ ${Number(p.extraPhotoPrice).toFixed(2).replace('.', ',')}/extra</span>` : ''}
              ${phoneInfo ? `<span>·</span><span>${phoneInfo}</span>` : ''}
              <span class="badge ${status.class}">${status.text}</span>
            </div>
          </div>
          <div style="display:flex; gap:0.5rem; flex-shrink:0; align-items:center;">
            ${p.selectionStatus === 'submitted' ? `
            <button onclick="deliverParticipant('${p._id}')" class="header-expand-btn" title="Entregar" style="cursor: pointer;">
              <span class="header-expand-icon" style="display: flex !important; align-items: center !important; justify-content: center !important; width: 34px !important; height: 34px !important;">
                ${icon('enviar', 16)}
              </span>
              <span class="header-expand-label">Entregar</span>
            </button>
            ` : ''}
            <button onclick="editParticipant('${p._id}')" class="header-expand-btn" title="Editar" style="cursor: pointer;">
              <span class="header-expand-icon" style="display: flex !important; align-items: center !important; justify-content: center !important; width: 34px !important; height: 34px !important;">
                ${icon('editar', 16)}
              </span>
              <span class="header-expand-label">Editar</span>
            </button>
            <button onclick="deleteParticipant('${p._id}')" class="header-expand-btn" title="Remover" style="cursor: pointer; color: var(--red); border-color: color-mix(in srgb, var(--red) 25%, transparent); background: color-mix(in srgb, var(--red) 5%, transparent);">
              <span class="header-expand-icon" style="display: flex !important; align-items: center !important; justify-content: center !important; width: 34px !important; height: 34px !important;">
                ${icon('lixeira', 16)}
              </span>
              <span class="header-expand-label">Remover</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Pré-preenche pacote e preço do form com os padrões da sessão (definidos na sidebar).
  // Cada participante pode sobrescrever — mas a base vem da sidebar.
  function applyFormDefaults() {
    const session = state.sessionsData.find(s => s._id === state.currentParticipantsSessionId);
    container.querySelector('#newPartLimit').value = session?.packageLimit ?? 30;
    container.querySelector('#newPartPrice').value = session?.extraPhotoPrice ?? 25;
    partNameInput.value = '';
    partEmailInput.value = '';
    container.querySelector('#newPartClientId').value = '';
    container.querySelector('#newPartPhone').value = '';
  }

  window.viewParticipants = async (sessionId) => {
    state.currentParticipantsSessionId = sessionId;
    const session = state.sessionsData.find(s => s._id === sessionId);
    if (!session) return;
    container.querySelector('#participantsModalTitle').textContent = `Participantes - ${session.name}`;
    renderParticipantsList(session.participants || []);
    applyFormDefaults();
    participantsModal.style.display = 'flex';
  };

  container.querySelector('#addParticipantBtn').onclick = async () => {
    const name = partNameInput.value.trim();
    const email = partEmailInput.value.trim();
    const phone = container.querySelector('#newPartPhone').value.trim();
    const packageLimit = container.querySelector('#newPartLimit').value;
    const extraPhotoPrice = container.querySelector('#newPartPrice').value;
    const clientId = container.querySelector('#newPartClientId').value || undefined;
    if (!name) return window.showToast?.('Nome é obrigatório', 'warning');
    try {
      const result = await apiPost(`/api/sessions/${state.currentParticipantsSessionId}/participants`, { name, email, phone, packageLimit, extraPhotoPrice, clientId });
      if (result.success || result.participants) {
        renderParticipantsList(result.participants || result.session.participants);
        applyFormDefaults();
      }
    } catch (e) { window.showToast?.(e.message, 'error'); }
  };

  // Edita um participante (nome, e-mail, telefone, fotos do pacote e preço da foto extra).
  // Preço vazio = herda o padrão da sessão (sidebar). Overlay próprio acima do modal de participantes.
  window.editParticipant = (pid) => {
    const p = _currentParticipants.find(x => String(x._id) === String(pid));
    if (!p) return;
    const session = state.sessionsData.find(s => s._id === state.currentParticipantsSessionId);
    const defaultPrice = session?.extraPhotoPrice ?? 25;

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:1300; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); padding:1rem;';

    const box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--r-card); padding:1.5rem; width:420px; max-width:95vw; display:flex; flex-direction:column; gap:0.875rem; box-shadow:0 20px 60px rgba(0,0,0,0.4);';

    const title = document.createElement('div');
    title.style.cssText = 'font-size:1.05rem; font-weight:700; color:var(--text-primary);';
    title.textContent = `Editar ${p.name}`;
    box.appendChild(title);

    const mkField = (label, input) => {
      const w = document.createElement('div');
      w.style.cssText = 'display:flex; flex-direction:column; gap:0.25rem;';
      const l = document.createElement('label');
      l.textContent = label;
      l.style.cssText = 'font-size:0.75rem; font-weight:500; color:var(--text-secondary);';
      input.style.cssText = 'width:100%; background:var(--bg-base); border:1px solid var(--border); border-radius:var(--r-field); padding:0.45rem 0.6rem; color:var(--text-primary); font-size:0.875rem; font-family:inherit; box-sizing:border-box;';
      w.appendChild(l); w.appendChild(input);
      return w;
    };
    const mkInput = (type, value, extra = {}) => {
      const i = document.createElement('input');
      i.type = type;
      i.value = value;
      Object.assign(i, extra);
      return i;
    };

    const nameI = mkInput('text', p.name || '');
    const emailI = mkInput('email', p.email || '');
    const phoneI = mkInput('text', p.phone || '');
    const limitI = mkInput('number', p.packageLimit ?? '', { min: 1 });
    const priceI = mkInput('number', p.extraPhotoPrice ?? '', { min: 0, step: 0.01, placeholder: `Padrão: R$ ${defaultPrice}` });

    box.appendChild(mkField('Nome', nameI));
    box.appendChild(mkField('E-mail', emailI));
    box.appendChild(mkField('Telefone', phoneI));
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:0.75rem;';
    const limitW = mkField('Fotos do pacote', limitI); limitW.style.flex = '1';
    const priceW = mkField('Preço foto extra (R$)', priceI); priceW.style.flex = '1';
    row.appendChild(limitW); row.appendChild(priceW);
    box.appendChild(row);

    const priceHint = document.createElement('div');
    priceHint.style.cssText = 'font-size:0.6875rem; color:var(--text-muted); margin-top:-0.5rem;';
    priceHint.textContent = 'Deixe o preço vazio para herdar o padrão da sessão.';
    box.appendChild(priceHint);

    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.25rem;';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.cssText = 'background:transparent; color:var(--text-secondary); border:1px solid var(--border); padding:0.5rem 1rem; border-radius:var(--r-field); cursor:pointer; font-size:0.875rem;';
    cancelBtn.onclick = () => overlay.remove();
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Salvar';
    saveBtn.style.cssText = 'background:var(--accent); color:var(--bg-base); border:none; padding:0.5rem 1.25rem; border-radius:var(--r-field); cursor:pointer; font-size:0.875rem; font-weight:600;';
    saveBtn.onclick = async () => {
      const name = nameI.value.trim();
      if (!name) return window.showToast?.('Nome é obrigatório', 'warning');
      saveBtn.disabled = true; saveBtn.textContent = 'Salvando...';
      try {
        await apiPut(`/api/sessions/${state.currentParticipantsSessionId}/participants/${pid}`, {
          name,
          email: emailI.value.trim(),
          phone: phoneI.value.trim(),
          packageLimit: limitI.value,
          extraPhotoPrice: priceI.value // '' = herda o padrão (back zera para null)
        });
        overlay.remove();
        window.showToast?.('Participante atualizado', 'success');
        await renderSessoes(container);
        window.viewParticipants(state.currentParticipantsSessionId);
      } catch (e) {
        window.showToast?.(e.message, 'error');
        saveBtn.disabled = false; saveBtn.textContent = 'Salvar';
      }
    };
    btns.appendChild(cancelBtn); btns.appendChild(saveBtn);
    box.appendChild(btns);

    overlay.appendChild(box);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
    setTimeout(() => nameI.focus(), 30);
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
