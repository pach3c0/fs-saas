import { resolveImagePath, escapeHtml } from '../../utils/helpers.js';
import { uploadImage, showUploadProgress } from '../../utils/upload.js';
import { apiGet, apiPost, apiPut } from '../../utils/api.js';
import { appState } from '../../state.js';
import { setupClientModal, abrirModalClienteNovo } from '../../utils/client-modal.js';

export function setupModalForm(container, state, renderSessoes) {
  _setupNewSessionModal(container, state, renderSessoes);
  _setupEditSessionModal(container, state, renderSessoes);
}

function _setupNewSessionModal(container, state, renderSessoes) {
  const newSessionModal = container.querySelector('#newSessionModal');

  // Toggle campos de seleção
  const modeSelect = container.querySelector('#sessionMode');
  const selectionFields = container.querySelector('#selectionFields');
  const extraConfigFields = container.querySelector('#extraConfigFields');
  const multiHint = container.querySelector('#multiSelectionHint');
  const deadlineLabel = container.querySelector('#deadlineLabel');
  modeSelect.onchange = () => {
    const isSelection = modeSelect.value === 'selection';
    const isGallery = modeSelect.value === 'gallery';
    selectionFields.style.display = isSelection ? 'flex' : 'none';
    extraConfigFields.style.display = isSelection ? 'flex' : 'none';
    multiHint.style.display = modeSelect.value === 'multi_selection' ? 'block' : 'none';
    if (deadlineLabel) deadlineLabel.textContent = isGallery ? 'Prazo de Acesso' : 'Prazo de Seleção';
  };

  // Upload de foto de capa
  container.querySelector('#coverInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, appState.authToken, (percent) => {
        showUploadProgress('coverProgress', percent);
      });
      container.querySelector('#sessionCoverPhoto').value = result.url;
      container.querySelector('#coverPreview').innerHTML = `<img src="${resolveImagePath(result.url)}" style="width:100%; height:100%; object-fit:cover;">`;
      e.target.value = '';
    } catch (error) {
      window.showToast?.('Erro no upload: ' + error.message, 'error');
    }
  };

  // Abrir modal
  container.querySelector('#addSessionBtn').onclick = () => {
    container.querySelector('#clientSearchInput').value = '';
    container.querySelector('#sessionClientId').value = '';
    container.querySelector('#clientSearchHint').textContent = '';
    container.querySelector('#clientSearchDropdown').style.display = 'none';
    container.querySelector('#sessionName').value = '';
    container.querySelector('#dateValidationMsg').style.display = 'none';
    container.querySelector('#sessionCoverPhoto').value = '';
    container.querySelector('#coverPreview').innerHTML = '<span style="color:var(--text-muted); font-size:0.625rem;">Sem capa</span>';
    const today = new Date().toISOString().split('T')[0];
    container.querySelector('#sessionCreatedAtDate').value = today;
    container.querySelector('#sessionDate').value = '';
    container.querySelector('#sessionDeadline').value = '';
    newSessionModal.style.display = 'flex';
  };

  // Autocomplete de clientes
  const clientSearchInput = container.querySelector('#clientSearchInput');
  const clientSearchDropdown = container.querySelector('#clientSearchDropdown');
  const clientSearchHint = container.querySelector('#clientSearchHint');
  let _searchTimer = null;

  function renderClientDropdown(clients, query) {
    clientSearchDropdown.innerHTML = '';
    clients.forEach(c => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:0.5rem 0.75rem; cursor:pointer; color:var(--text-primary); font-size:0.875rem; border-top:1px solid var(--border);';
      item.innerHTML = `<strong>${escapeHtml(c.name)}</strong>${c.email ? `<span style="color:var(--text-muted); font-size:0.75rem;"> · ${escapeHtml(c.email)}</span>` : ''}`;
      item.onmouseenter = () => item.style.background = 'var(--bg-hover)';
      item.onmouseleave = () => item.style.background = '';
      item.onclick = () => {
        clientSearchInput.value = c.name;
        container.querySelector('#sessionClientId').value = c._id;
        if (!container.querySelector('#sessionName').value) container.querySelector('#sessionName').value = c.name;
        clientSearchHint.textContent = c.email ? `✓ Cliente vinculado · E-mail: ${c.email}` : '✓ Cliente vinculado';
        clientSearchHint.style.color = 'var(--green)';
        clientSearchDropdown.style.display = 'none';
      };
      clientSearchDropdown.appendChild(item);
    });

    if (query.trim()) {
      const criar = document.createElement('div');
      criar.style.cssText = 'padding:0.5rem 0.75rem; cursor:pointer; color:var(--accent); font-size:0.875rem; border-top:1px solid var(--border); font-weight:500;';
      criar.textContent = `+ Cadastrar "${query.trim()}" como novo cliente`;
      criar.onmouseenter = () => criar.style.background = 'var(--bg-hover)';
      criar.onmouseleave = () => criar.style.background = '';
      criar.onclick = () => {
        clientSearchDropdown.style.display = 'none';
        setupClientModal();
        abrirModalClienteNovo(query.trim(), (newClient) => {
          clientSearchInput.value = newClient.name;
          container.querySelector('#sessionClientId').value = newClient._id;
          if (!container.querySelector('#sessionName').value) container.querySelector('#sessionName').value = newClient.name;
          clientSearchHint.textContent = `✓ Novo cliente cadastrado!`;
          clientSearchHint.style.color = 'var(--green)';
        });
      };
      clientSearchDropdown.appendChild(criar);
    }

    clientSearchDropdown.style.display = 'block';
  }

  clientSearchInput.oninput = () => {
    clearTimeout(_searchTimer);
    const q = clientSearchInput.value.trim();
    if (!q) {
      clientSearchDropdown.style.display = 'none';
      container.querySelector('#sessionClientId').value = '';
      clientSearchHint.textContent = '';
      return;
    }
    _searchTimer = setTimeout(async () => {
      try {
        const data = await apiGet(`/api/clients/search?q=${encodeURIComponent(q)}`);
        renderClientDropdown(data.clients || [], q);
      } catch (e) { /* silencioso */ }
    }, 300);
  };

  document.addEventListener('click', (e) => {
    if (!clientSearchInput.contains(e.target) && !clientSearchDropdown.contains(e.target)) {
      clientSearchDropdown.style.display = 'none';
    }
  }, { capture: true });

  // Validação cruzada de datas
  function validateDates() {
    const createdVal = container.querySelector('#sessionCreatedAtDate').value;
    const eventVal = container.querySelector('#sessionDate').value;
    const deadlineVal = container.querySelector('#sessionDeadline').value;
    const msg = container.querySelector('#dateValidationMsg');
    if (createdVal && eventVal && eventVal < createdVal) {
      msg.textContent = '⚠ A Data do Evento não pode ser anterior ao "Criado em".';
      msg.style.display = 'block';
      return false;
    }
    if (eventVal && deadlineVal) {
      const eventDate = new Date(eventVal + 'T00:00:00');
      const deadline = new Date(deadlineVal);
      const isGalleryMode = container.querySelector('#sessionMode')?.value === 'gallery';
      const prazoLabel = isGalleryMode ? 'Prazo de Acesso' : 'Prazo de Seleção';
      if (deadline < eventDate) {
        msg.textContent = `⚠ O ${prazoLabel} não pode ser anterior à Data do Evento.`;
        msg.style.display = 'block';
        return false;
      }
    }
    msg.style.display = 'none';
    return true;
  }

  container.querySelector('#sessionCreatedAtDate').oninput = validateDates;
  container.querySelector('#sessionDate').oninput = validateDates;
  container.querySelector('#sessionDeadline').oninput = validateDates;

  container.querySelector('#cancelNewSession').onclick = () => { newSessionModal.style.display = 'none'; };

  container.querySelector('#confirmNewSession').onclick = async () => {
    const name = container.querySelector('#sessionName').value.trim();
    const clientId = container.querySelector('#sessionClientId').value || null;
    const date = container.querySelector('#sessionDate').value;
    const selectionDeadline = container.querySelector('#sessionDeadline').value || null;
    const mode = container.querySelector('#sessionMode').value;
    const packageLimit = parseInt(container.querySelector('#sessionLimit').value) || 30;
    const extraPhotoPrice = parseFloat(container.querySelector('#sessionExtraPrice').value) || 25;
    const coverPhoto = container.querySelector('#sessionCoverPhoto').value;
    const allowExtraPurchase = container.querySelector('#sessionAllowExtraPurchase')?.checked || false;
    const allowReopen = container.querySelector('#sessionAllowReopen')?.checked || false;

    let hasError = false;
    const nameInput = container.querySelector('#sessionName');
    if (!name) {
      nameInput.style.borderColor = 'var(--red)';
      window.showToast?.('Nome da sessão é obrigatório', 'warning');
      hasError = true;
    } else { nameInput.style.borderColor = ''; }

    const clientInput = container.querySelector('#clientSearchInput');
    if (!clientId) {
      clientInput.style.borderColor = 'var(--red)';
      if (!hasError) window.showToast?.('Selecione ou cadastre um cliente para continuar', 'warning');
      hasError = true;
    } else { clientInput.style.borderColor = ''; }

    if (hasError) return;
    if (!validateDates()) return;

    let clientEmail = '';
    try {
      const data = await apiGet(`/api/clients/search?q=${encodeURIComponent(clientInput.value)}`);
      const linked = (data.clients || []).find(c => c._id === clientId);
      if (linked) clientEmail = linked.email || '';
    } catch (e) { /* silencioso */ }

    try {
      const result = await apiPost('/api/sessions', {
        name, clientEmail, date, selectionDeadline, mode, packageLimit,
        extraPhotoPrice, coverPhoto, clientId,
        allowExtraPurchasePostSubmit: allowExtraPurchase, allowReopen
      });
      newSessionModal.style.display = 'none';
      window.showToast?.(`Sessão criada! Código: ${result.accessCode || result.session?.accessCode}`, 'success', 6000);
      await renderSessoes(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };
}

function _setupEditSessionModal(container, state, renderSessoes) {
  const editModal = container.querySelector('#editSessionModal');
  const editModeSelect = container.querySelector('#editMode');
  const editSelFields = container.querySelector('#editSelectionFields');
  const editExtraLabel = container.querySelector('#editAllowExtraPurchase')?.closest('label');
  const editReopenLabel = container.querySelector('#editAllowReopen')?.closest('label');

  const editDeadlineLabel = container.querySelector('#editDeadlineLabel');
  function _toggleEditSelectionFields() {
    const isSelection = editModeSelect.value === 'selection';
    const isGallery = editModeSelect.value === 'gallery';
    editSelFields.style.display = isSelection ? 'flex' : 'none';
    if (editExtraLabel) editExtraLabel.style.display = isSelection ? 'flex' : 'none';
    if (editReopenLabel) editReopenLabel.style.display = isSelection ? 'flex' : 'none';
    if (editDeadlineLabel) editDeadlineLabel.textContent = isGallery ? 'Prazo de Acesso' : 'Prazo de Seleção';
  }

  editModeSelect.onchange = _toggleEditSelectionFields;

  // Upload de capa no modal de edição
  const editCoverInput = container.querySelector('#editCoverInput');
  const editCoverPreview = container.querySelector('#editCoverPreview');
  const editCoverPhotoInput = container.querySelector('#editCoverPhoto');
  const editCoverRemoveBtn = container.querySelector('#editCoverRemoveBtn');
  const editCoverProgress = container.querySelector('#editCoverProgress');

  function _renderEditCoverPreview(url) {
    if (url) {
      editCoverPreview.innerHTML = `<img src="${resolveImagePath(url)}" style="width:100%; height:100%; object-fit:cover;">`;
      editCoverRemoveBtn.style.display = 'block';
    } else {
      editCoverPreview.innerHTML = '<span style="color:var(--text-muted); font-size:0.625rem; text-align:center;">Sem capa</span>';
      editCoverRemoveBtn.style.display = 'none';
    }
  }

  editCoverInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    editCoverProgress.style.display = 'block';
    try {
      const result = await uploadImage(file, appState.authToken, (percent) => {
        editCoverProgress.textContent = `Enviando... ${percent}%`;
      });
      editCoverPhotoInput.value = result.url;
      _renderEditCoverPreview(result.url);
      e.target.value = '';
    } catch (error) {
      window.showToast?.('Erro no upload: ' + error.message, 'error');
    } finally {
      editCoverProgress.style.display = 'none';
    }
  };

  editCoverRemoveBtn.onclick = () => {
    editCoverPhotoInput.value = '';
    _renderEditCoverPreview('');
  };

  window.editSession = async (sessionId) => {
    const session = state.sessionsData.find(s => s._id === sessionId);
    if (!session) return;
    state.editingSessionId = sessionId;

    container.querySelector('#editSessionName').value = session.name || '';
    container.querySelector('#editSessionDeadline').value = session.selectionDeadline ? new Date(session.selectionDeadline).toISOString().slice(0, 16) : '';
    editModeSelect.value = session.mode || 'selection';
    editModeSelect.disabled = session.selectionStatus === 'submitted' || session.selectionStatus === 'delivered';
    container.querySelector('#editLimit').value = session.packageLimit || 30;
    container.querySelector('#editExtraPrice').value = session.extraPhotoPrice || 25;
    container.querySelector('#editCommentsEnabled').checked = session.commentsEnabled !== false;
    container.querySelector('#editAllowExtraPurchase').checked = session.allowExtraPurchasePostSubmit !== false;
    container.querySelector('#editAllowReopen').checked = session.allowReopen !== false;
    _toggleEditSelectionFields();

    editCoverPhotoInput.value = session.coverPhoto || '';
    _renderEditCoverPreview(session.coverPhoto || '');

    editModal.style.display = 'flex';
  };

  container.querySelector('#cancelEditSession').onclick = () => {
    editModal.style.display = 'none';
    state.editingSessionId = null;
  };

  container.querySelector('#confirmEditSession').onclick = async () => {
    if (!state.editingSessionId) return;
    const name = container.querySelector('#editSessionName').value.trim();
    const mode = editModeSelect.value;
    const selectionDeadline = container.querySelector('#editSessionDeadline').value || null;
    const packageLimit = parseInt(container.querySelector('#editLimit').value) || 30;
    const extraPhotoPrice = parseFloat(container.querySelector('#editExtraPrice').value) || 25;
    const commentsEnabled = container.querySelector('#editCommentsEnabled').checked;
    const allowExtraPurchasePostSubmit = container.querySelector('#editAllowExtraPurchase').checked;
    const allowReopen = container.querySelector('#editAllowReopen').checked;
    const coverPhoto = container.querySelector('#editCoverPhoto').value;

    try {
      await apiPut(`/api/sessions/${state.editingSessionId}`, {
        name, mode, selectionDeadline, packageLimit,
        extraPhotoPrice, commentsEnabled, allowExtraPurchasePostSubmit, allowReopen, coverPhoto
      });
      editModal.style.display = 'none';
      state.editingSessionId = null;
      window.showToast?.('Configuração salva!', 'success');
      await renderSessoes(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };
}
