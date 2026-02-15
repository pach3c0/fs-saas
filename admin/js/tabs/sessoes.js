/**
 * Tab: Sessoes de Clientes
 */

import { appState } from '../state.js';
import { formatDate, copyToClipboard, resolveImagePath } from '../utils/helpers.js';

const STATUS_LABELS = {
  pending: { text: 'Pendente', color: '#9ca3af', bg: '#1f2937' },
  in_progress: { text: 'Em seleção', color: '#fbbf24', bg: '#422006' },
  submitted: { text: 'Seleção enviada', color: '#34d399', bg: '#064e3b' },
  delivered: { text: 'Entregue', color: '#60a5fa', bg: '#1e3a5f' }
};

export async function renderSessoes(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Sessoes de Clientes</h2>
        <button id="addSessionBtn" style="background:#16a34a; color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:500;">
          + Nova Sessao
        </button>
      </div>

      <div id="sessionsList" style="display:flex; flex-direction:column; gap:0.75rem;">
        <p style="color:#9ca3af; text-align:center;">Carregando...</p>
      </div>
    </div>

    <!-- Modal Nova Sessao -->
    <div id="newSessionModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:50; align-items:center; justify-content:center;">
      <div style="background:#1f2937; border:1px solid #374151; border-radius:0.75rem; padding:1.5rem; width:28rem; display:flex; flex-direction:column; gap:1rem; max-height:90vh; overflow-y:auto;">
        <h3 style="font-size:1.125rem; font-weight:bold; color:#f3f4f6;">Nova Sessao</h3>
        <div>
          <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Nome do Cliente</label>
          <input type="text" id="sessionName" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;" placeholder="Ex: Maria Silva">
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Tipo</label>
          <select id="sessionType" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
            <option value="Familia">Familia</option>
            <option value="Casamento">Casamento</option>
            <option value="Evento">Evento</option>
            <option value="Ensaio">Ensaio</option>
            <option value="Corporativo">Corporativo</option>
          </select>
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Data</label>
          <input type="date" id="sessionDate" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
        </div>

        <div style="border-top:1px solid #374151; padding-top:1rem;">
          <h4 style="font-size:0.875rem; font-weight:600; color:#d1d5db; margin-bottom:0.75rem;">Configuracao da Galeria</h4>
          <div>
            <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Modo</label>
            <select id="sessionMode" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
              <option value="selection">Selecao (cliente escolhe favoritas)</option>
              <option value="gallery">Galeria (cliente so visualiza/baixa)</option>
            </select>
          </div>
          <div id="selectionFields" style="display:flex; gap:0.75rem; margin-top:0.75rem;">
            <div style="flex:1;">
              <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Fotos do pacote</label>
              <input type="number" id="sessionLimit" value="30" min="1" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
            </div>
            <div style="flex:1;">
              <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Preco foto extra (R$)</label>
              <input type="number" id="sessionExtraPrice" value="25" min="0" step="0.01" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
            </div>
          </div>
        </div>

        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
          <button id="cancelNewSession" style="padding:0.5rem 1rem; color:#9ca3af; background:none; border:1px solid #374151; border-radius:0.375rem; cursor:pointer;">Cancelar</button>
          <button id="confirmNewSession" style="padding:0.5rem 1rem; background:#16a34a; color:white; border:none; border-radius:0.375rem; cursor:pointer; font-weight:600;">Criar</button>
        </div>
      </div>
    </div>

    <!-- Modal Ver Fotos -->
    <div id="sessionPhotosModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:50; flex-direction:column;">
      <div style="background:#1f2937; border-bottom:1px solid #374151; padding:1rem 1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <h3 id="photosModalTitle" style="font-size:1.125rem; font-weight:bold; color:#f3f4f6;">Fotos da Sessao</h3>
        <div style="display:flex; gap:0.75rem;">
          <label id="uploadMoreBtn" style="padding:0.5rem 1rem; background:#2563eb; color:white; border-radius:0.375rem; cursor:pointer; font-weight:600; font-size:0.875rem;">
            + Upload
            <input type="file" id="sessionUploadInput" accept="image/*" multiple style="display:none;">
          </label>
          <button id="closePhotosModal" style="padding:0.5rem 1rem; color:#9ca3af; background:none; border:1px solid #374151; border-radius:0.375rem; cursor:pointer;">Fechar</button>
        </div>
      </div>
      <div style="flex:1; overflow-y:auto; padding:1.5rem;">
        <div id="sessionPhotosGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:0.75rem;">
        </div>
      </div>
    </div>

    <!-- Modal Editar Sessao -->
    <div id="editSessionModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:50; align-items:center; justify-content:center;">
      <div style="background:#1f2937; border:1px solid #374151; border-radius:0.75rem; padding:1.5rem; width:28rem; display:flex; flex-direction:column; gap:1rem; max-height:90vh; overflow-y:auto;">
        <h3 style="font-size:1.125rem; font-weight:bold; color:#f3f4f6;">Editar Sessao</h3>
        <div style="background:#111827; border-radius:0.5rem; padding:0.75rem 1rem;">
          <span id="editSessionName" style="color:#f3f4f6; font-weight:600;"></span>
          <span id="editSessionType" style="color:#9ca3af; font-size:0.875rem; margin-left:0.5rem;"></span>
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Modo</label>
          <select id="editMode" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
            <option value="selection">Selecao (cliente escolhe favoritas)</option>
            <option value="gallery">Galeria (cliente so visualiza/baixa)</option>
          </select>
        </div>
        <div id="editSelectionFields" style="display:flex; gap:0.75rem;">
          <div style="flex:1;">
            <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Fotos do pacote</label>
            <input type="number" id="editLimit" min="1" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
          </div>
          <div style="flex:1;">
            <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Preco foto extra (R$)</label>
            <input type="number" id="editExtraPrice" min="0" step="0.01" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
          </div>
        </div>
        <p style="font-size:0.6875rem; color:#6b7280;">Cada cliente pode ter valores diferentes de pacote e preco de extras.</p>
        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
          <button id="cancelEditSession" style="padding:0.5rem 1rem; color:#9ca3af; background:none; border:1px solid #374151; border-radius:0.375rem; cursor:pointer;">Cancelar</button>
          <button id="confirmEditSession" style="padding:0.5rem 1rem; background:#2563eb; color:white; border:none; border-radius:0.375rem; cursor:pointer; font-weight:600;">Salvar</button>
        </div>
      </div>
    </div>

    <!-- Modal Ver Selecao -->
    <div id="selectionModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:50; flex-direction:column;">
      <div style="background:#1f2937; border-bottom:1px solid #374151; padding:1rem 1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 id="selectionModalTitle" style="font-size:1.125rem; font-weight:bold; color:#f3f4f6;">Selecao do Cliente</h3>
          <p id="selectionModalInfo" style="font-size:0.75rem; color:#9ca3af; margin-top:0.25rem;"></p>
        </div>
        <div style="display:flex; gap:0.75rem;">
          <button id="exportSelectionBtn" style="padding:0.5rem 1rem; background:#16a34a; color:white; border-radius:0.375rem; border:none; cursor:pointer; font-weight:600; font-size:0.875rem;">Exportar Lightroom</button>
          <button id="closeSelectionModal" style="padding:0.5rem 1rem; color:#9ca3af; background:none; border:1px solid #374151; border-radius:0.375rem; cursor:pointer;">Fechar</button>
        </div>
      </div>
      <div style="flex:1; overflow-y:auto; padding:1.5rem;">
        <div id="selectionPhotosGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:0.75rem;">
        </div>
      </div>
    </div>
  `;

  // Carrega sessoes
  let sessionsData = [];
  try {
    const response = await fetch('/api/sessions', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });

    if (!response.ok) throw new Error('Erro ao carregar');

    const result = await response.json();
    sessionsData = result.sessions || [];
    const list = container.querySelector('#sessionsList');

    if (sessionsData.length > 0) {
      list.innerHTML = sessionsData.map(session => {
        const status = STATUS_LABELS[session.selectionStatus] || STATUS_LABELS.pending;
        const mode = session.mode || 'gallery';
        const selectedCount = (session.selectedPhotos || []).length;
        const limit = session.packageLimit || 30;
        const extras = Math.max(0, selectedCount - limit);
        const extraPrice = session.extraPhotoPrice || 25;

        return `
        <div style="border:1px solid #374151; border-radius:0.75rem; padding:1rem; background:#1f2937;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <strong style="color:#f3f4f6; font-size:1.125rem;">${session.name}</strong>
                <span style="color:#9ca3af; font-size:0.875rem;">${session.type}</span>
                <span style="font-size:0.625rem; padding:0.125rem 0.5rem; border-radius:9999px; color:${status.color}; background:${status.bg}; font-weight:600;">
                  ${status.text}
                </span>
                <span style="font-size:0.625rem; padding:0.125rem 0.5rem; border-radius:9999px; color:#818cf8; background:#1e1b4b; font-weight:500;">
                  ${mode === 'selection' ? 'Selecao' : 'Galeria'}
                </span>
              </div>
              <div style="color:#9ca3af; font-size:0.75rem; margin-top:0.25rem;">
                ${formatDate(session.date)} • ${session.photos?.length || 0} fotos
                ${mode === 'selection' ? ` • ${selectedCount}/${limit} selecionadas` : ''}
                ${extras > 0 ? ` • <span style="color:#fbbf24;">${extras} extras (R$ ${(extras * extraPrice).toFixed(2)})</span>` : ''}
              </div>
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center; flex-shrink:0;">
              <button onclick="viewSessionPhotos('${session._id}')" style="background:#2563eb; color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">
                Fotos
              </button>
              ${mode === 'selection' && selectedCount > 0 ? `
              <button onclick="viewSelection('${session._id}')" style="background:#7c3aed; color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">
                Selecao
              </button>` : ''}
              ${session.selectionStatus === 'submitted' ? `
              <button onclick="reopenSelection('${session._id}')" style="background:#f59e0b; color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">
                Reabrir
              </button>
              <button onclick="deliverSession('${session._id}')" style="background:#16a34a; color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">
                Entregar
              </button>` : ''}
              <button onclick="editSession('${session._id}')" style="background:#d97706; color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">
                Config
              </button>
              <button onclick="copySessionCode('${session.accessCode}')" style="background:#374151; color:#d1d5db; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem;" title="Copiar codigo">
                Codigo
              </button>
              <button onclick="deleteSession('${session._id}')" style="background:#7f1d1d; color:#fca5a5; padding:0.375rem 0.5rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem;" title="Deletar">
                X
              </button>
            </div>
          </div>
          <div style="font-size:0.75rem; background:#111827; border-radius:0.25rem; padding:0.375rem 0.75rem; font-family:monospace; color:#60a5fa; margin-top:0.5rem;">
            Codigo: ${session.accessCode}
          </div>
        </div>
      `}).join('');
    } else {
      list.innerHTML = '<p style="color:#9ca3af; text-align:center; padding:2rem;">Nenhuma sessao criada</p>';
    }
  } catch (error) {
    const list = container.querySelector('#sessionsList');
    if (list) list.innerHTML = `<p style="color:#f87171;">${error.message}</p>`;
  }

  // Toggle campos de selecao no modal
  const modeSelect = container.querySelector('#sessionMode');
  const selectionFields = container.querySelector('#selectionFields');
  modeSelect.onchange = () => {
    selectionFields.style.display = modeSelect.value === 'selection' ? 'flex' : 'none';
  };

  // Nova sessao - modal
  const newSessionModal = container.querySelector('#newSessionModal');
  container.querySelector('#addSessionBtn').onclick = () => {
    newSessionModal.style.display = 'flex';
  };

  container.querySelector('#cancelNewSession').onclick = () => {
    newSessionModal.style.display = 'none';
  };

  container.querySelector('#confirmNewSession').onclick = async () => {
    const name = container.querySelector('#sessionName').value.trim();
    const type = container.querySelector('#sessionType').value;
    const date = container.querySelector('#sessionDate').value;
    const mode = container.querySelector('#sessionMode').value;
    const packageLimit = parseInt(container.querySelector('#sessionLimit').value) || 30;
    const extraPhotoPrice = parseFloat(container.querySelector('#sessionExtraPrice').value) || 25;

    if (!name) { alert('Nome obrigatorio'); return; }
    if (!date) { alert('Data obrigatoria'); return; }

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appState.authToken}`
        },
        body: JSON.stringify({ name, type, date, mode, packageLimit, extraPhotoPrice })
      });

      if (!response.ok) throw new Error('Erro ao criar');

      const result = await response.json();
      const session = result.session || result;
      newSessionModal.style.display = 'none';
      alert(`Sessao criada!\nCodigo de acesso: ${session.accessCode}`);
      await renderSessoes(container);
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };

  // Copiar codigo
  window.copySessionCode = (code) => {
    copyToClipboard(code);
  };

  // Ver fotos da sessao
  let currentSessionId = null;
  window.viewSessionPhotos = async (sessionId) => {
    currentSessionId = sessionId;
    const session = sessionsData.find(s => s._id === sessionId);
    if (!session) return;

    const modal = container.querySelector('#sessionPhotosModal');
    const title = container.querySelector('#photosModalTitle');
    const grid = container.querySelector('#sessionPhotosGrid');

    title.textContent = `Fotos - ${session.name}`;
    const photos = session.photos || [];

    if (photos.length > 0) {
      const selectedIds = session.selectedPhotos || [];
      grid.innerHTML = photos.map((photo, idx) => {
        const isSelected = selectedIds.includes(photo.id);
        return `
        <div style="position:relative; aspect-ratio:3/4; background:#374151; border-radius:0.5rem; overflow:hidden; ${isSelected ? 'border:3px solid #34d399;' : ''}">
          <img src="${resolveImagePath(photo.url)}" alt="Foto ${idx + 1}" style="width:100%; height:100%; object-fit:cover;">
          ${isSelected ? '<div style="position:absolute; top:0.25rem; right:0.25rem; background:#16a34a; color:white; font-size:0.625rem; padding:0.125rem 0.375rem; border-radius:0.25rem;">Selecionada</div>' : ''}
          <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); opacity:0; transition:opacity 0.2s; display:flex; align-items:center; justify-content:center;"
            onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0'">
            <button onclick="deleteSessionPhoto('${sessionId}', '${photo.id}')" style="background:#ef4444; color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer;" title="Remover">
              X
            </button>
          </div>
          <div style="position:absolute; bottom:0.25rem; left:0.25rem; background:rgba(0,0,0,0.7); color:white; font-size:0.625rem; padding:0.125rem 0.375rem; border-radius:0.25rem;">${idx + 1}</div>
        </div>
      `}).join('');
    } else {
      grid.innerHTML = '<p style="color:#9ca3af; text-align:center; grid-column:1/-1; padding:3rem;">Nenhuma foto. Use o botao Upload acima.</p>';
    }

    modal.style.display = 'flex';
  };

  // Ver selecao do cliente
  window.viewSelection = async (sessionId) => {
    const session = sessionsData.find(s => s._id === sessionId);
    if (!session) return;

    const modal = container.querySelector('#selectionModal');
    const title = container.querySelector('#selectionModalTitle');
    const info = container.querySelector('#selectionModalInfo');
    const grid = container.querySelector('#selectionPhotosGrid');

    const selectedIds = session.selectedPhotos || [];
    const limit = session.packageLimit || 30;
    const extras = Math.max(0, selectedIds.length - limit);
    const extraPrice = session.extraPhotoPrice || 25;

    title.textContent = `Selecao - ${session.name}`;
    let infoText = `${selectedIds.length}/${limit} fotos selecionadas`;
    if (extras > 0) {
      infoText += ` • ${extras} extras (R$ ${(extras * extraPrice).toFixed(2)})`;
    }
    info.textContent = infoText;

    const photos = session.photos || [];
    // Mostrar selecionadas primeiro, depois as demais
    const sorted = [...photos].sort((a, b) => {
      const aSelected = selectedIds.includes(a.id) ? 0 : 1;
      const bSelected = selectedIds.includes(b.id) ? 0 : 1;
      return aSelected - bSelected;
    });

    grid.innerHTML = sorted.map((photo, idx) => {
      const isSelected = selectedIds.includes(photo.id);
      return `
        <div style="position:relative; aspect-ratio:3/4; background:#374151; border-radius:0.5rem; overflow:hidden; ${isSelected ? 'border:3px solid #34d399;' : 'opacity:0.4;'}">
          <img src="${resolveImagePath(photo.url)}" alt="${photo.filename}" style="width:100%; height:100%; object-fit:cover;">
          ${isSelected ? '<div style="position:absolute; top:0.25rem; right:0.25rem; background:#16a34a; color:white; font-size:0.625rem; padding:0.125rem 0.375rem; border-radius:9999px; font-weight:bold;">&#10003;</div>' : ''}
        </div>
      `;
    }).join('');

    // Exportar
    container.querySelector('#exportSelectionBtn').onclick = () => {
      window.open(`/api/sessions/${sessionId}/export?token=${appState.authToken}`, '_blank');
    };

    modal.style.display = 'flex';
  };

  // Reabrir selecao
  window.reopenSelection = async (sessionId) => {
    if (!confirm('Reabrir selecao? O cliente podera alterar as fotos selecionadas.')) return;
    try {
      const response = await fetch(`/api/sessions/${sessionId}/reopen`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${appState.authToken}` }
      });
      if (response.ok) {
        await renderSessoes(container);
      }
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };

  // Entregar sessao
  window.deliverSession = async (sessionId) => {
    if (!confirm('Marcar esta sessao como entregue? O watermark sera removido e o cliente podera baixar as fotos.')) return;
    try {
      const response = await fetch(`/api/sessions/${sessionId}/deliver`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${appState.authToken}` }
      });
      if (response.ok) {
        await renderSessoes(container);
      }
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };

  // Editar sessao
  let editingSessionId = null;
  const editModal = container.querySelector('#editSessionModal');
  const editModeSelect = container.querySelector('#editMode');
  const editSelFields = container.querySelector('#editSelectionFields');

  editModeSelect.onchange = () => {
    editSelFields.style.display = editModeSelect.value === 'selection' ? 'flex' : 'none';
  };

  window.editSession = (sessionId) => {
    const session = sessionsData.find(s => s._id === sessionId);
    if (!session) return;
    editingSessionId = sessionId;

    container.querySelector('#editSessionName').textContent = session.name;
    container.querySelector('#editSessionType').textContent = session.type;
    editModeSelect.value = session.mode || 'selection';
    container.querySelector('#editLimit').value = session.packageLimit || 30;
    container.querySelector('#editExtraPrice').value = session.extraPhotoPrice || 25;
    editSelFields.style.display = editModeSelect.value === 'selection' ? 'flex' : 'none';

    editModal.style.display = 'flex';
  };

  container.querySelector('#cancelEditSession').onclick = () => {
    editModal.style.display = 'none';
    editingSessionId = null;
  };

  container.querySelector('#confirmEditSession').onclick = async () => {
    if (!editingSessionId) return;
    const mode = editModeSelect.value;
    const packageLimit = parseInt(container.querySelector('#editLimit').value) || 30;
    const extraPhotoPrice = parseFloat(container.querySelector('#editExtraPrice').value) || 25;

    try {
      const response = await fetch(`/api/sessions/${editingSessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appState.authToken}`
        },
        body: JSON.stringify({ mode, packageLimit, extraPhotoPrice })
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      editModal.style.display = 'none';
      editingSessionId = null;
      alert('Configuracao salva!');
      await renderSessoes(container);
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };

  // Fechar modal de fotos
  container.querySelector('#closePhotosModal').onclick = () => {
    container.querySelector('#sessionPhotosModal').style.display = 'none';
    currentSessionId = null;
  };

  // Fechar modal de selecao
  container.querySelector('#closeSelectionModal').onclick = () => {
    container.querySelector('#selectionModal').style.display = 'none';
  };

  // Upload de fotos na sessao
  container.querySelector('#sessionUploadInput').onchange = async (e) => {
    if (!currentSessionId) return;
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
      const formData = new FormData();
      formData.append('photos', file);
      await fetch(`/api/sessions/${currentSessionId}/photos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${appState.authToken}` },
        body: formData
      });
    }

    e.target.value = '';
    await renderSessoes(container);
    viewSessionPhotos(currentSessionId);
  };

  // Deletar foto individual
  window.deleteSessionPhoto = async (sessionId, photoId) => {
    if (!confirm('Remover esta foto?')) return;
    try {
      await fetch(`/api/sessions/${sessionId}/photos/${photoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${appState.authToken}` }
      });
      await renderSessoes(container);
      viewSessionPhotos(sessionId);
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };

  // Deletar sessao
  window.deleteSession = async (sessionId) => {
    if (!confirm('Tem certeza que deseja deletar esta sessao e todas as fotos?')) return;
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${appState.authToken}` }
      });
      if (response.ok) {
        await renderSessoes(container);
      }
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };
}
