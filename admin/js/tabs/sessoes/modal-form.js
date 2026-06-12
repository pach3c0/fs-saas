import { resolveImagePath, escapeHtml } from '../../utils/helpers.js';
import { uploadImage, showUploadProgress } from '../../utils/upload.js';
import { apiGet, apiPost, apiPut } from '../../utils/api.js';
import { appState } from '../../state.js';
import { setupClientModal, abrirModalClienteNovo } from '../../utils/client-modal.js';

export function setupModalForm(container, state, renderSessoes) {
  _setupNewSessionModal(container, state, renderSessoes);
  // Modal de edição (⚙️) aposentado: configurações vivem no painel lateral do wizard
  // (autosave) e a capa também — ver wizard/config-panel.js.
}

function _setupNewSessionModal(container, state, renderSessoes) {
  const newSessionModal = container.querySelector('#newSessionModal');

  // Elementos do modal
  const modeSelect = container.querySelector('#sessionMode');
  const fieldsWrapper = container.querySelector('#sessionFieldsWrapper');
  const clientRowWrapper = container.querySelector('#clientRowWrapper');
  const selectionFields = container.querySelector('#selectionFields');
  const extraConfigFields = container.querySelector('#extraConfigFields');
  const commentsConfigField = container.querySelector('#commentsConfigField');
  const multiOptionsField = container.querySelector('#multiOptionsField');
  const crmFields = container.querySelector('#crmFields');
  const storageRetentionInput = container.querySelector('#sessionStorageRetentionUntil');
  const storageAutoDeleteField = container.querySelector('#storageAutoDeleteField');
  const multiHint = container.querySelector('#multiSelectionHint');
  const deadlineLabel = container.querySelector('#deadlineLabel');
  const allDisabledInputs = fieldsWrapper.querySelectorAll('input, select');

  modeSelect.onchange = () => {
    const mode = modeSelect.value;
    const hasMode = mode !== '';
    const isSelection = mode === 'selection';
    const isGallery = mode === 'gallery';
    const isMulti = mode === 'multi_selection' || mode === 'multi_instant';

    // Habilita/desabilita todos os campos baseado na escolha do modo
    allDisabledInputs.forEach(input => {
      input.disabled = !hasMode;
    });
    fieldsWrapper.style.opacity = hasMode ? '1' : '0.4';
    fieldsWrapper.style.pointerEvents = hasMode ? 'auto' : 'none';

    // Oculta campo cliente em multi_selection
    clientRowWrapper.style.display = isMulti ? 'none' : '';

    // Ajusta campos condicionais
    selectionFields.style.display = (isSelection || isMulti) ? 'flex' : 'none';
    extraConfigFields.style.display = isSelection ? 'flex' : 'none';
    if (commentsConfigField) commentsConfigField.style.display = (isSelection || isMulti) ? 'flex' : 'none';
    if (multiOptionsField) multiOptionsField.style.display = isMulti ? 'flex' : 'none';
    if (crmFields) crmFields.style.display = isGallery ? 'none' : 'flex';
    multiHint.style.display = isMulti ? 'block' : 'none';
    if (deadlineLabel) deadlineLabel.textContent = isGallery ? 'Prazo de Acesso' : 'Prazo de Seleção';
    if (storageRetentionInput) storageRetentionInput.disabled = !hasMode;
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
    const evtSel = container.querySelector('#sessionEventType');
    if (evtSel) evtSel.value = 'outro';
    const autoChk = container.querySelector('#sessionSalesAutomation');
    if (autoChk) autoChk.checked = true;
    const commentsChk = container.querySelector('#sessionCommentsEnabled');
    if (commentsChk) commentsChk.checked = false;
    const queueChk = container.querySelector('#sessionShowQueuePosition');
    if (queueChk) queueChk.checked = false;
    if (storageRetentionInput) storageRetentionInput.value = '';
    if (storageAutoDeleteField) storageAutoDeleteField.style.display = 'none';
    const autoDelChk = container.querySelector('#sessionStorageAutoDelete');
    if (autoDelChk) autoDelChk.checked = false;
    const backupChk = container.querySelector('#sessionStorageBackupOnExpire');
    if (backupChk) backupChk.checked = false;

    // Pré-preenche os padrões do fotógrafo (Configurações › Sessões)
    const sd = appState.appData?.organization?.preferences?.sessionDefaults || {};
    const limitInput = container.querySelector('#sessionLimit');
    if (limitInput && sd.packageLimit != null) limitInput.value = sd.packageLimit;
    const extraInput = container.querySelector('#sessionExtraPrice');
    if (extraInput && sd.extraPhotoPrice != null) extraInput.value = sd.extraPhotoPrice;
    const resSelect = container.querySelector('#sessionResolution');
    if (resSelect && sd.photoResolution != null) resSelect.value = String(sd.photoResolution);
    if (commentsChk && sd.commentsEnabled != null) commentsChk.checked = sd.commentsEnabled !== false;
    const allowExtraChk = container.querySelector('#sessionAllowExtraPurchase');
    if (allowExtraChk && sd.allowExtraPurchase != null) allowExtraChk.checked = sd.allowExtraPurchase !== false;
    const allowReopenChk = container.querySelector('#sessionAllowReopen');
    if (allowReopenChk && sd.allowReopen != null) allowReopenChk.checked = sd.allowReopen !== false;
    const deadlineInput = container.querySelector('#sessionDeadline');
    if (deadlineInput && sd.deadlineDays > 0) {
      const dl = new Date();
      dl.setDate(dl.getDate() + sd.deadlineDays);
      deadlineInput.value = `${dl.toISOString().split('T')[0]}T23:59`;
    }

    newSessionModal.style.display = 'flex';
  };

  // Autocomplete de clientes
  const clientSearchInput = container.querySelector('#clientSearchInput');
  const clientSearchDropdown = container.querySelector('#clientSearchDropdown');
  const clientSearchHint = container.querySelector('#clientSearchHint');
  let _searchTimer = null;
  let _selectedClient = null; // cliente escolhido no seletor (Rhyno: _id "rhyno:<id>")

  function renderClientDropdown(clients, query) {
    clientSearchDropdown.innerHTML = '';
    clients.forEach(c => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:0.5rem 0.75rem; cursor:pointer; color:var(--text-primary); font-size:0.875rem; border-top:1px solid var(--border);';
      item.innerHTML = `<strong>${escapeHtml(c.name)}</strong>${c.email ? `<span style="color:var(--text-muted); font-size:0.75rem;"> · ${escapeHtml(c.email)}</span>` : ''}`;
      item.onmouseenter = () => item.style.background = 'var(--bg-hover)';
      item.onmouseleave = () => item.style.background = '';
      item.onclick = () => {
        _selectedClient = c;
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
          _selectedClient = newClient;
          clientSearchInput.value = newClient.name;
          container.querySelector('#sessionClientId').value = newClient._id;
          if (!container.querySelector('#sessionName').value) container.querySelector('#sessionName').value = newClient.name;
          clientSearchHint.textContent = `✓ Novo cliente cadastrado no Rhyno!`;
          clientSearchHint.style.color = 'var(--green)';
        }, { target: 'rhyno' });
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
      _selectedClient = null;
      return;
    }
    _searchTimer = setTimeout(async () => {
      try {
        const data = await apiGet(`/api/gestao/customers?search=${encodeURIComponent(q)}`);
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
    const eventVal = container.querySelector('#sessionDate').value;
    const deadlineVal = container.querySelector('#sessionDeadline').value;
    const msg = container.querySelector('#dateValidationMsg');
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

  if (storageRetentionInput && storageAutoDeleteField) {
    storageRetentionInput.oninput = () => {
      storageAutoDeleteField.style.display = storageRetentionInput.value ? 'flex' : 'none';
      if (!storageRetentionInput.value) {
        const chk = container.querySelector('#sessionStorageAutoDelete');
        if (chk) chk.checked = false;
      }
    };
  }

  container.querySelector('#cancelNewSession').onclick = () => { newSessionModal.style.display = 'none'; };

  container.querySelector('#confirmNewSession').onclick = async () => {
    const mode = container.querySelector('#sessionMode').value;
    const name = container.querySelector('#sessionName').value.trim();
    const clientId = container.querySelector('#sessionClientId').value || null;
    const date = container.querySelector('#sessionDate').value || null;
    const selectionDeadline = container.querySelector('#sessionDeadline').value || null;
    const packageLimit = parseInt(container.querySelector('#sessionLimit').value) || 30;
    const extraPhotoPrice = parseFloat(container.querySelector('#sessionExtraPrice').value) || 25;
    const coverPhoto = container.querySelector('#sessionCoverPhoto').value;
    const allowExtraPurchase = container.querySelector('#sessionAllowExtraPurchase')?.checked || false;
    const allowReopen = container.querySelector('#sessionAllowReopen')?.checked || false;
    const eventType = container.querySelector('#sessionEventType')?.value || 'outro';
    const photoResolution = parseInt(container.querySelector('#sessionResolution')?.value) || 1200;
    const salesAutomationEnabled = container.querySelector('#sessionSalesAutomation')?.checked !== false;
    const commentsEnabled = container.querySelector('#sessionCommentsEnabled')?.checked || false;
    const showDeliveryQueuePosition = container.querySelector('#sessionShowQueuePosition')?.checked || false;
    const storageRetentionUntil = container.querySelector('#sessionStorageRetentionUntil')?.value || null;
    const storageAutoDelete = container.querySelector('#sessionStorageAutoDelete')?.checked || false;
    const storageBackupOnExpire = container.querySelector('#sessionStorageBackupOnExpire')?.checked || false;
    const isMulti = mode === 'multi_selection' || mode === 'multi_instant';

    let hasError = false;

    // Validar modo
    const modeSelect = container.querySelector('#sessionMode');
    if (!mode) {
      modeSelect.style.borderColor = 'var(--red)';
      window.showToast?.('Escolha o modo da sessão para continuar', 'warning');
      hasError = true;
    } else { modeSelect.style.borderColor = ''; }

    // Validar nome
    const nameInput = container.querySelector('#sessionName');
    if (!name) {
      nameInput.style.borderColor = 'var(--red)';
      if (!hasError) window.showToast?.('Nome da sessão é obrigatório', 'warning');
      hasError = true;
    } else { nameInput.style.borderColor = ''; }

    // Validar cliente (obrigatório apenas se não for multi_selection)
    const clientInput = container.querySelector('#clientSearchInput');
    if (!isMulti && !clientId) {
      clientInput.style.borderColor = 'var(--red)';
      if (!hasError) window.showToast?.('Selecione ou cadastre um cliente para continuar', 'warning');
      hasError = true;
    } else { clientInput.style.borderColor = ''; }

    if (hasError) return;
    if (!validateDates()) return;

    // Resolver cliente escolhido (snapshot). Suporta cliente do Rhyno (id "rhyno:<n>")
    // ou Client legado do Mongo (ObjectId).
    let clientEmail = '';
    let clientName = '';
    let clientPhone = '';
    let rhynoCustomerId = null;
    let mongoClientId = null;
    if (!isMulti && _selectedClient) {
      clientEmail = _selectedClient.email || '';
      clientName = _selectedClient.name || '';
      clientPhone = _selectedClient.phone || '';
      if (String(_selectedClient._id).startsWith('rhyno:')) {
        rhynoCustomerId = String(_selectedClient._id).slice(6);
      } else {
        mongoClientId = _selectedClient._id;
      }
    }

    try {
      const payload = {
        name, date, selectionDeadline, mode, packageLimit,
        extraPhotoPrice, coverPhoto, photoResolution,
        allowExtraPurchasePostSubmit: allowExtraPurchase, allowReopen,
        commentsEnabled,
        showDeliveryQueuePosition: isMulti ? showDeliveryQueuePosition : false,
        storageRetentionUntil: storageRetentionUntil || null,
        storageAutoDelete,
        storageBackupOnExpire,
        eventType,
        eventDate: date || null,
        salesAutomation: { enabled: salesAutomationEnabled, sentTriggers: [] }
      };

      // Vincular cliente (non-multi): Rhyno (CRM principal) ou Client legado do Mongo
      if (!isMulti) {
        payload.clientEmail = clientEmail;
        if (rhynoCustomerId) {
          payload.rhynoCustomerId = rhynoCustomerId;
          payload.clientName = clientName;
          payload.clientPhone = clientPhone;
        } else {
          payload.clientId = mongoClientId;
        }
      }

      const created = await apiPost('/api/sessions', payload);
      newSessionModal.style.display = 'none';
      window.showToast?.('Sessão criada!', 'success');
      await renderSessoes(container);
      // Entra direto no wizard — config detalhada fica no painel direito (sempre visível).
      const newId = created?.session?._id;
      if (newId && window.openSessionWizard) window.openSessionWizard(newId);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };
}
