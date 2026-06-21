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
      const relInfo = p.relationship ? ` · ${escapeHtml(p.relationship)}` : '';
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
              ${relInfo ? `<span>·</span><span style="color:var(--accent);">${relInfo}</span>` : ''}
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
            ${!p.clientId ? `
            <button onclick="convertParticipantToClient('${p._id}')" class="header-expand-btn" title="Tornar Cliente" style="cursor: pointer;">
              <span class="header-expand-icon" style="display: flex !important; align-items: center !important; justify-content: center !important; width: 34px !important; height: 34px !important;">
                ${icon('perfil', 16)}
              </span>
              <span class="header-expand-label">Tornar Cliente</span>
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

  // ────────────────────────────────────────────────────────────────────────────
  // Auto-inscrição QR Code
  // ────────────────────────────────────────────────────────────────────────────

  // Injeta QRCode.js uma única vez (biblioteca CDN, sem dependência de build).
  // SEMPRE resolve — em caso de falha/lentidão do CDN, resolve mesmo assim para
  // nunca travar quem dá `await` (a renderização tem fallback se window.QRCode faltar).
  function injectQRLib() {
    if (window.QRCode) return Promise.resolve();
    const existing = document.getElementById('czQRLib');
    if (existing) {
      // Script já no DOM mas pode não ter terminado de carregar — aguarda window.QRCode
      // sem bloquear indefinidamente (máx ~5s).
      return new Promise((resolve) => {
        let tries = 0;
        const iv = setInterval(() => {
          if (window.QRCode || ++tries > 50) { clearInterval(iv); resolve(); }
        }, 100);
      });
    }
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.id = 'czQRLib';
      s.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
      s.onload = resolve;
      // Sem onerror, uma falha de CDN deixaria a Promise pendurada para sempre.
      // Remove o id para permitir nova tentativa numa próxima abertura.
      s.onerror = () => { s.removeAttribute('id'); resolve(); };
      document.head.appendChild(s);
    });
  }

  async function renderSelfRegSection(sessionId) {
    const slot = container.querySelector('#selfRegSection');
    if (!slot) return;

    const session = state.sessionsData.find(s => s._id === sessionId);
    // Só mostra para multi_selection
    if (!session || session.mode !== 'multi_selection') {
      slot.style.display = 'none';
      return;
    }
    slot.style.display = '';

    slot.innerHTML = `<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;"><div style="width:20px;height:2px;background:var(--border);"></div><span style="font-size:0.75rem;font-weight:600;color:var(--text-muted);letter-spacing:.04em;text-transform:uppercase;">Auto-inscrição via QR Code</span><div style="flex:1;height:2px;background:var(--border);"></div></div><div style="display:flex;align-items:center;justify-content:center;padding:1.5rem;"><div style="font-size:0.8125rem;color:var(--text-muted);">Carregando...</div></div>`;

    try {
      const data = await apiGet(`/api/sessions/${sessionId}/register-link`);
      const url = data.url || '';
      const isEnabled = !!data.selfRegEnabled;
      const deadline = data.selfRegDeadline || '';

      await injectQRLib();

      slot.innerHTML = `
        <div style="margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem;">
          <div style="width:20px;height:2px;background:var(--border);"></div>
          <span style="font-size:0.75rem;font-weight:600;color:var(--text-muted);letter-spacing:.04em;text-transform:uppercase;">Auto-inscrição via QR Code</span>
          <div style="flex:1;height:2px;background:var(--border);"></div>
        </div>

        <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--r-card);padding:1rem;display:flex;flex-direction:column;gap:0.875rem;">

          <!-- Toggle ativo/inativo -->
          <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;">
            <div>
              <div style="font-size:0.875rem;font-weight:600;color:var(--text-primary);margin-bottom:0.125rem;">Inscrição pública ativa</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Qualquer pessoa com o link/QR pode se inscrever</div>
            </div>
            <label id="selfRegToggleLabel" style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;">
              <input type="checkbox" id="selfRegToggle" ${isEnabled ? 'checked' : ''}
                style="opacity:0;width:0;height:0;"
                onchange="toggleSelfReg(this.checked)" />
              <span id="selfRegTrack" style="
                position:absolute;inset:0;border-radius:99px;
                background:${isEnabled ? 'var(--accent)' : 'var(--border)'};
                transition:background .2s;
              "></span>
              <span id="selfRegThumb" style="
                position:absolute;top:3px;left:${isEnabled ? '23px' : '3px'};
                width:18px;height:18px;border-radius:50%;
                background:var(--bg-base);transition:left .2s;
              "></span>
            </label>
          </div>

          <!-- Prazo de inscrição -->
          <div style="display:flex;flex-direction:column;gap:0.25rem;">
            <label style="font-size:0.75rem;font-weight:600;color:var(--text-muted);">Prazo de inscrição (opcional)</label>
            <input type="datetime-local" id="selfRegDeadlineInput" value="${deadline ? new Date(deadline).toISOString().slice(0,16) : ''}" 
              style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--r-field);padding:0.45rem 0.6rem;color:var(--text-primary);font-size:0.875rem;font-family:inherit;outline:none;"
              onchange="saveSelfRegDeadline(this.value)" />
            <span style="font-size:0.6875rem;color:var(--text-muted);">Vazio = mesmo prazo da sessão. Quando expirar, o link não aceita mais inscrições.</span>
          </div>

          <!-- Link copiável -->
          <div style="display:flex;gap:0.5rem;align-items:center;">
            <input id="selfRegLinkInput" type="text" readonly value="${escapeHtml(url)}"
              style="flex:1;background:var(--bg-base);border:1px solid var(--border);border-radius:var(--r-field);padding:0.45rem 0.75rem;font-size:0.75rem;color:var(--text-primary);font-family:monospace;outline:none;cursor:text;" />
            <button onclick="copySelfRegLink()" class="header-expand-btn" title="Copiar link" style="flex-shrink:0;">
              <span class="header-expand-icon" style="display:flex !important;align-items:center !important;justify-content:center !important;width:34px !important;height:34px !important;">${icon('copiar', 16)}</span>
              <span class="header-expand-label">Copiar</span>
            </button>
          </div>

          <!-- QR Code -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:0.75rem;">
            <div id="selfRegQRCode" style="background:white;padding:12px;border-radius:12px;display:inline-block;"></div>
            <button onclick="downloadSelfRegQR()" class="header-expand-btn" style="">
              <span class="header-expand-icon" style="display:flex !important;align-items:center !important;justify-content:center !important;width:34px !important;height:34px !important;">${icon('baixar', 16)}</span>
              <span class="header-expand-label">Baixar QR Code</span>
            </button>
          </div>
        </div>
      `;

      // Gerar QR Code (com fallback caso a lib de CDN não tenha carregado)
      const qrSlot = document.getElementById('selfRegQRCode');
      if (window.QRCode && url && qrSlot) {
        new window.QRCode(qrSlot, {
          text: url,
          width: 160,
          height: 160,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.M
        });
      } else if (qrSlot) {
        qrSlot.style.background = 'transparent';
        qrSlot.innerHTML = `<div style="font-size:0.75rem;color:var(--text-muted);text-align:center;max-width:160px;line-height:1.4;">Não foi possível gerar o QR Code agora.<br>Use o link acima — ele funciona normalmente.</div>`;
      }

      // Handlers globais
      window.toggleSelfReg = async (enabled) => {
        const track = document.getElementById('selfRegTrack');
        const thumb = document.getElementById('selfRegThumb');
        if (track) track.style.background = enabled ? 'var(--accent)' : 'var(--border)';
        if (thumb) thumb.style.left = enabled ? '23px' : '3px';
        try {
          await apiPut(`/api/sessions/${sessionId}/self-reg`, { selfRegEnabled: enabled });
          window.showToast?.(enabled ? 'Auto-inscrição ativada' : 'Auto-inscrição desativada', 'success');
        } catch (e) { window.showToast?.(e.message, 'error'); }
      };

      window.saveSelfRegDeadline = async (val) => {
        try {
          await apiPut(`/api/sessions/${sessionId}/self-reg`, {
            selfRegDeadline: val || null
          });
          window.showToast?.('Prazo salvo', 'success');
        } catch (e) { window.showToast?.(e.message, 'error'); }
      };

      window.copySelfRegLink = () => {
        navigator.clipboard.writeText(url).then(() => window.showToast?.('Link copiado!', 'success'));
      };

      window.downloadSelfRegQR = () => {
        const canvas = document.querySelector('#selfRegQRCode canvas');
        if (!canvas) { window.showToast?.('QR Code não gerado', 'error'); return; }
        const link = document.createElement('a');
        link.download = `qrcode-inscricao.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };

    } catch (e) {
      slot.innerHTML = `<div style="font-size:0.8125rem;color:var(--text-muted);text-align:center;padding:0.75rem;">Erro ao carregar dados de inscrição.</div>`;
    }
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
    // Abre o modal IMEDIATAMENTE — a abertura não pode depender de rede/CDN.
    participantsModal.style.display = 'flex';
    // Carrega a seção de auto-inscrição + QR Code de forma assíncrona (não bloqueia).
    renderSelfRegSection(sessionId);
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

  // Converte participante em cliente: busca dados e abre modal Rhyno pré-preenchido.
  // O fotógrafo finaliza o cadastro completo no Rhyno sem perder o contexto.
  window.convertParticipantToClient = async (pid) => {
    try {
      const data = await apiGet(`/api/sessions/${state.currentParticipantsSessionId}/participants/${pid}/to-client`);
      if (!data.participant) return window.showToast?.('Participante não encontrado', 'error');
      setupClientModal();
      abrirModalClienteNovo(data.participant.name, (newClient) => {
        // Após criar o cliente no Rhyno, atualiza o participante com o clientId
        if (newClient?._id) {
          apiPut(`/api/sessions/${state.currentParticipantsSessionId}/participants/${pid}`, {
            clientId: String(newClient._id)
          }).then(() => {
            window.showToast?.('Participante vinculado como cliente!', 'success');
            renderSessoes(container).then(() => window.viewParticipants(state.currentParticipantsSessionId));
          }).catch(e => window.showToast?.(e.message, 'error'));
        }
      }, {
        target: 'rhyno',
        prefill: {
          phone: data.participant.phone,
          email: data.participant.email
        }
      });
    } catch (e) { window.showToast?.(e.message, 'error'); }
  };

  container.querySelector('#closeParticipantsModal').onclick = () => {
    participantsModal.style.display = 'none';
  };

  container.querySelector('#exportParticipantsBtn').onclick = () => {
    window.open(`/api/sessions/${state.currentParticipantsSessionId}/participants/export?token=${appState.authToken}`, '_blank');
  };
}
