// Painel direito do wizard — configurações da sessão sempre visíveis e editáveis.
// Substitui (para o fotógrafo) a maior parte do modal de edição: o que pode mudar,
// muda inline com autosave; o que não pode (resolução após o 1º upload, modo após o
// envio do cliente, pacote após a entrega) aparece travado com a explicação do porquê.
//
// Salva via PUT /api/sessions/:id (pass-through) e usa a sessão retornada como verdade.

import { apiPut } from '../../../utils/api.js';
import { uploadImage } from '../../../utils/upload.js';
import { resolveImagePath } from '../../../utils/helpers.js';
import { appState } from '../../../state.js';
import { wizardState } from './state.js';
import { icon } from '../../../utils/icons.js';

const EVENT_OPTIONS = [
  ['outro', 'Outro'], ['aniversario', 'Aniversário'], ['casamento', 'Casamento'],
  ['formatura', 'Formatura'], ['corporativo', 'Corporativo'], ['show', 'Show'],
  ['ensaio', 'Ensaio'], ['gestante', 'Gestante'], ['newborn', 'Newborn'],
  ['debutante', 'Debutante'], ['batizado', 'Batizado'],
];
const MODE_OPTIONS = [['selection', 'Seleção'], ['gallery', 'Galeria'], ['multi_selection', 'Multi-Seleção']];
const RES_OPTIONS = [['960', '960px'], ['1200', '1200px (padrão)'], ['1400', '1400px'], ['1600', '1600px']];

const INPUT_CSS = 'width:100%; background:var(--bg-base); border:1px solid var(--border); border-radius:var(--r-field); padding:0.375rem 0.5rem; color:var(--text-primary); font-size:0.8125rem; font-family:inherit; text-align:center; text-align-last:center;';

function estado(session) {
  return {
    hasPhotos: (session.photos?.length || 0) > 0,
    submitted: ['submitted', 'delivered'].includes(session.selectionStatus),
    delivered: session.selectionStatus === 'delivered',
    selectedCount: (session.selectedPhotos?.length) || 0,
  };
}

// Barra encolhida: trilho estreito com botão de expandir. O wizard sempre abre com
// o painel aberto (wizardState.configCollapsed reseta ao abrir/fechar).
function renderCollapsedRail(onToggleCollapse) {
  const rail = document.createElement('aside');
  rail.id = 'wizardConfigPanel';
  rail.style.cssText = `
    width: 48px; flex-shrink: 0;
    background: var(--glass-bg);
    backdrop-filter: saturate(180%) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(180%) blur(var(--glass-blur));
    border-left: 1px solid var(--border);
    display: flex; flex-direction: column; align-items: center; gap: 0.875rem;
    padding: 0.875rem 0;
  `;

  const expand = document.createElement('button');
  expand.type = 'button';
  expand.title = 'Abrir configurações da sessão';
  expand.innerHTML = icon('chevronEsquerda', 18);
  expand.style.cssText = `
    background: transparent; border: 1px solid var(--border); color: var(--text-secondary);
    width: 32px; height: 32px; border-radius: var(--r-field); cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: background 0.15s;
  `;
  expand.onmouseenter = () => { expand.style.background = 'var(--bg-hover)'; };
  expand.onmouseleave = () => { expand.style.background = 'transparent'; };
  expand.onclick = () => { wizardState.configCollapsed = false; onToggleCollapse?.(); };
  rail.appendChild(expand);

  const gear = document.createElement('div');
  gear.innerHTML = icon('config', 18);
  gear.style.cssText = 'color: var(--text-muted); display: flex;';
  rail.appendChild(gear);

  const label = document.createElement('div');
  label.textContent = 'Configurações';
  label.style.cssText = `
    writing-mode: vertical-rl; transform: rotate(180deg);
    font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--text-muted);
  `;
  rail.appendChild(label);

  return rail;
}

// onChange() é chamado após salvar um campo "impactante" (que altera passo/stepper):
// modo, resolução, pacote, nome. Os demais salvam inline sem re-renderizar o wizard.
// onToggleCollapse() re-renderiza só este slot quando o usuário encolhe/expande o painel.
export function renderConfigPanel({ session, onChange, onToggleCollapse }) {
  if (wizardState.configCollapsed) return renderCollapsedRail(onToggleCollapse);

  const isGallery = session.mode === 'gallery';
  const isSelection = session.mode === 'selection';
  const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';
  const st = estado(session);

  const panel = document.createElement('aside');
  panel.id = 'wizardConfigPanel';
  panel.style.cssText = `
    width: 300px; flex-shrink: 0;
    background: var(--glass-bg);
    backdrop-filter: saturate(180%) blur(var(--glass-blur));
    -webkit-backdrop-filter: saturate(180%) blur(var(--glass-blur));
    border-left: 1px solid var(--border);
    overflow-y: auto; padding: 1.25rem 1rem;
    display: flex; flex-direction: column; gap: 0.875rem;
  `;

  // Cabeçalho + status "✓ salvo"
  const head = document.createElement('div');
  head.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:0.5rem;';
  const headTitle = document.createElement('span');
  headTitle.textContent = 'Configurações da sessão';
  headTitle.style.cssText = 'font-size:0.6875rem; font-weight:700; letter-spacing:0.08em; color:var(--text-muted); text-transform:uppercase;';
  const status = document.createElement('span');
  status.style.cssText = 'font-size:0.6875rem; color:var(--green); opacity:0; transition:opacity 0.2s; white-space:nowrap;';
  status.textContent = '✓ salvo';

  // Grupo à direita: status "salvo" + botão de encolher o painel.
  const headRight = document.createElement('div');
  headRight.style.cssText = 'display:flex; align-items:center; gap:0.375rem; flex-shrink:0;';
  const collapseBtn = document.createElement('button');
  collapseBtn.type = 'button';
  collapseBtn.title = 'Encolher painel';
  collapseBtn.innerHTML = icon('chevronDireita', 16);
  collapseBtn.style.cssText = `
    background: transparent; border: none; color: var(--text-muted); cursor: pointer;
    padding: 0.125rem; display: flex; align-items: center; border-radius: var(--r-field);
  `;
  collapseBtn.onmouseenter = () => { collapseBtn.style.color = 'var(--text-primary)'; };
  collapseBtn.onmouseleave = () => { collapseBtn.style.color = 'var(--text-muted)'; };
  collapseBtn.onclick = () => { wizardState.configCollapsed = true; onToggleCollapse?.(); };
  headRight.appendChild(status);
  headRight.appendChild(collapseBtn);

  head.appendChild(headTitle);
  head.appendChild(headRight);
  panel.appendChild(head);

  let flashTimer = null;
  const flashSaved = () => {
    status.style.opacity = '1';
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { status.style.opacity = '0'; }, 1500);
  };

  // session === wizardState.session (mesma referência) — mutamos no lugar p/ não divergir.
  async function salvar(patch, { impactful = false } = {}) {
    try {
      const res = await apiPut(`/api/sessions/${session._id}`, patch);
      Object.assign(session, res?.session || patch);
      flashSaved();
      if (impactful && onChange) onChange();
    } catch (e) {
      window.showToast?.('Erro ao salvar: ' + e.message, 'error');
      if (onChange) onChange(); // re-render reverte o visual ao estado salvo
    }
  }

  // ---------- builders ----------
  const grupo = (titulo) => {
    const h = document.createElement('div');
    h.textContent = titulo;
    h.style.cssText = 'font-size:0.6875rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.04em; margin-top:0.375rem; border-bottom:1px solid var(--border); padding-bottom:0.25rem; text-align:center; width:100%;';
    return h;
  };

  // Envolve um controle com label e nota (hint normal ou lock).
  const field = (label, control, { hint, lockMsg } = {}) => {
    const w = document.createElement('div');
    w.style.cssText = 'display:flex; flex-direction:column; gap:0.25rem; align-items:center; text-align:center; width:100%;';
    const l = document.createElement('label');
    l.textContent = label;
    l.style.cssText = 'font-size:0.75rem; font-weight:500; color:var(--text-secondary); text-align:center; width:100%;';
    w.appendChild(l);
    w.appendChild(control);
    const note = lockMsg || hint;
    if (note) {
      const n = document.createElement('div');
      n.style.cssText = 'display:flex; justify-content:center; align-items:flex-start; gap:0.25rem; font-size:0.625rem; color:var(--text-muted); line-height:1.3; text-align:center; width:100%;';
      if (lockMsg) {
        n.innerHTML = `<span style="margin-top:1px; flex-shrink:0;">${icon('cadeado', 12)}</span><span style="text-align:left;">${note}</span>`;
      } else {
        n.textContent = note;
      }
      w.appendChild(n);
    }
    return w;
  };

  const selectCtl = (key, value, options, { locked, impactful, onLocalChange } = {}) => {
    const s = document.createElement('select');
    s.dataset.cfg = key;
    s.style.cssText = INPUT_CSS + (locked ? ' opacity:0.55; cursor:not-allowed;' : '');
    s.disabled = !!locked;
    options.forEach(([v, lbl]) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = lbl;
      if (String(v) === String(value)) o.selected = true;
      s.appendChild(o);
    });
    if (!locked) s.onchange = () => { onLocalChange?.(s.value); salvar({ [key]: s.value }, { impactful }); };
    return s;
  };

  const numberCtl = (key, value, { locked, impactful, min, step } = {}) => {
    const i = document.createElement('input');
    i.type = 'number';
    i.dataset.cfg = key;
    if (min != null) i.min = String(min);
    if (step != null) i.step = String(step);
    i.value = value;
    i.style.cssText = INPUT_CSS + (locked ? ' opacity:0.55; cursor:not-allowed;' : '');
    i.disabled = !!locked;
    if (!locked) i.onchange = () => {
      let v = parseFloat(i.value);
      if (Number.isNaN(v)) return;
      if (min != null && v < min) { v = min; i.value = String(min); }
      salvar({ [key]: v }, { impactful });
    };
    return i;
  };

  const dateCtl = (key, value, type, { onLocalChange } = {}) => {
    const i = document.createElement('input');
    i.type = type; // 'date' | 'datetime-local'
    i.dataset.cfg = key;
    i.value = value || '';
    i.style.cssText = INPUT_CSS;
    i.onchange = () => { onLocalChange?.(i.value); salvar({ [key]: i.value || null }); };
    return i;
  };

  const textCtl = (key, value, { impactful } = {}) => {
    const i = document.createElement('input');
    i.type = 'text';
    i.dataset.cfg = key;
    i.value = value || '';
    i.style.cssText = INPUT_CSS;
    i.onchange = () => { if (i.value.trim()) salvar({ [key]: i.value.trim() }, { impactful }); };
    return i;
  };

  // Linha de checkbox (com hint opcional embaixo).
  const checkRow = (key, checked, labelText, { hint, patchKey } = {}) => {
    const outer = document.createElement('div');
    outer.style.cssText = 'display:flex; flex-direction:column; gap:0.125rem; align-items:center; text-align:center; width:100%;';
    const row = document.createElement('label');
    row.style.cssText = 'display:inline-flex; align-items:center; gap:0.5rem; cursor:pointer; justify-content:center;';
    const c = document.createElement('input');
    c.type = 'checkbox';
    c.dataset.cfg = patchKey || key;
    c.checked = !!checked;
    c.style.cssText = 'margin-top:0; width:1rem; height:1rem; accent-color:var(--accent); cursor:pointer; flex-shrink:0;';
    c.onchange = () => salvar({ [patchKey || key]: c.checked });
    const span = document.createElement('span');
    span.style.cssText = 'font-size:0.8125rem; color:var(--text-primary);';
    span.textContent = labelText;
    row.appendChild(c);
    row.appendChild(span);
    outer.appendChild(row);
    if (hint) {
      const n = document.createElement('div');
      n.textContent = hint;
      n.style.cssText = 'font-size:0.625rem; color:var(--text-muted); line-height:1.3; text-align:center; width:100%;';
      outer.appendChild(n);
    }
    return outer;
  };

  // Foto de capa — upload inline com autosave. Era a única coisa que vivia só no modal
  // de edição antigo (já removido); agora a capa se configura na criação e aqui.
  const coverField = () => {
    const w = document.createElement('div');
    w.style.cssText = 'display:flex; flex-direction:column; gap:0.25rem; align-items:center; text-align:center; width:100%;';
    const l = document.createElement('label');
    l.textContent = 'Foto de capa';
    l.style.cssText = 'font-size:0.75rem; font-weight:500; color:var(--text-secondary); text-align:center; width:100%;';
    w.appendChild(l);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:0.75rem; text-align:center; width:100%;';

    const preview = document.createElement('div');
    preview.style.cssText = 'width:4.5rem; height:4.5rem; border-radius:50%; background:var(--bg-base); border:1px solid var(--border); overflow:hidden; display:flex; align-items:center; justify-content:center; flex-shrink:0;';
    const renderPreview = () => {
      preview.innerHTML = session.coverPhoto
        ? `<img src="${resolveImagePath(session.coverPhoto)}" style="width:100%; height:100%; object-fit:cover;">`
        : '<span style="color:var(--text-muted); font-size:0.5625rem; text-align:center;">Sem capa</span>';
    };
    renderPreview();
    row.appendChild(preview);

    const col = document.createElement('div');
    col.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:0.25rem; min-width:0;';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.jpg,.jpeg,.png';
    fileInput.dataset.cfg = 'coverPhoto';
    fileInput.style.display = 'none';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = `${icon('camera', 14)} <span>Alterar capa</span>`;
    btn.style.cssText = 'display:flex; align-items:center; justify-content:center; gap:0.35rem; background:var(--bg-base); border:1px solid var(--border); color:var(--text-primary); border-radius:var(--r-field); padding:0.3rem 0.6rem; font-size:0.75rem; cursor:pointer; width:fit-content;';
    btn.onclick = () => fileInput.click();
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✕ Remover capa';
    removeBtn.style.cssText = `background:none; border:none; color:var(--red); font-size:0.6875rem; cursor:pointer; text-align:center; padding:0; width:fit-content; display:${session.coverPhoto ? 'block' : 'none'};`;

    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      btn.disabled = true; btn.innerHTML = `${icon('camera', 14)} <span>Enviando...</span>`;
      try {
        const result = await uploadImage(file, appState.authToken);
        await salvar({ coverPhoto: result.url });
        renderPreview();
        removeBtn.style.display = 'block';
      } catch (err) {
        window.showToast?.('Erro no upload: ' + err.message, 'error');
      } finally {
        btn.disabled = false; btn.innerHTML = `${icon('camera', 14)} <span>Alterar capa</span>`;
        e.target.value = '';
      }
    };
    removeBtn.onclick = async () => {
      await salvar({ coverPhoto: '' });
      renderPreview();
      removeBtn.style.display = 'none';
    };

    col.appendChild(btn);
    col.appendChild(removeBtn);
    col.appendChild(fileInput);
    row.appendChild(col);
    w.appendChild(row);
    return w;
  };

  // ===== GERAL =====
  panel.appendChild(grupo('Geral'));

  panel.appendChild(field('Nome da sessão', textCtl('name', session.name, { impactful: true })));
  panel.appendChild(coverField());

  panel.appendChild(field('Modo',
    selectCtl('mode', session.mode, MODE_OPTIONS, { locked: st.submitted, impactful: true }),
    { lockMsg: st.submitted ? 'O modo trava após o cliente enviar a seleção.' : undefined }
  ));

  const deadlineVal = session.selectionDeadline ? new Date(session.selectionDeadline).toISOString().slice(0, 16) : '';
  panel.appendChild(field(isGallery ? 'Prazo de acesso' : 'Prazo de seleção',
    dateCtl('selectionDeadline', deadlineVal, 'datetime-local')
  ));

  if (!isGallery) {
    panel.appendChild(field('Tipo de evento', selectCtl('eventType', session.eventType || 'outro', EVENT_OPTIONS)));
  }

  panel.appendChild(field('Resolução do preview',
    selectCtl('photoResolution', String(session.photoResolution || 1200), RES_OPTIONS, { locked: st.hasPhotos, impactful: true }),
    st.hasPhotos
      ? { lockMsg: 'Trava após o 1º upload — fotos já enviadas não são reprocessadas.' }
      : { hint: 'Tamanho da miniatura que o cliente vê no grid.' }
  ));

  panel.appendChild(checkRow('watermark', session.watermark !== false, "Ativar marca d'água", {
    hint: "Protege visualmente as fotos da sessão"
  }));

  // ===== SELEÇÃO =====
  if (isSelection) {
    panel.appendChild(grupo('Seleção'));
    const minPkg = Math.max(1, st.selectedCount);
    panel.appendChild(field('Fotos do pacote',
      numberCtl('packageLimit', session.packageLimit || 30, { locked: st.delivered, impactful: true, min: minPkg }),
      st.delivered
        ? { lockMsg: 'Trava após a entrega.' }
        : (st.selectedCount > 0 ? { hint: `Mínimo ${minPkg} — o cliente já escolheu ${st.selectedCount}.` } : undefined)
    ));
    panel.appendChild(field('Preço foto extra (R$)', numberCtl('extraPhotoPrice', session.extraPhotoPrice ?? 25, { min: 0, step: 0.01 })));
    panel.appendChild(checkRow('allowExtraPurchasePostSubmit', session.allowExtraPurchasePostSubmit !== false, 'Permitir venda de fotos extras'));
    panel.appendChild(checkRow('allowReopen', session.allowReopen !== false, 'Permitir pedido de reabertura'));
  }

  if (isSelection || isMulti) {
    panel.appendChild(checkRow('commentsEnabled', session.commentsEnabled !== false, 'Mensagens por foto'));
  }

  // ===== VENDAS (não em galeria) =====
  if (!isGallery) {
    panel.appendChild(grupo('Vendas'));
    panel.appendChild(checkRow('salesAutomationEnabled', session.salesAutomation?.enabled !== false, 'Automação de vendas (escassez)', {
      patchKey: 'salesAutomation.enabled',
      hint: 'Robô envia e-mails de urgência conforme o prazo se aproxima.',
    }));
  }

  // ===== ARMAZENAMENTO =====
  panel.appendChild(grupo('Armazenamento'));
  const retVal = session.storageRetentionUntil ? new Date(session.storageRetentionUntil).toISOString().slice(0, 10) : '';
  const autoDelBlock = document.createElement('div');
  autoDelBlock.style.cssText = `display:${retVal ? 'flex' : 'none'}; flex-direction:column; gap:0.5rem; margin-top:0.25rem;`;
  autoDelBlock.appendChild(checkRow('storageAutoDelete', Boolean(session.storageAutoDelete), 'Deletar automaticamente nessa data'));
  autoDelBlock.appendChild(checkRow('storageBackupOnExpire', Boolean(session.storageBackupOnExpire), 'Gerar backup ZIP antes de deletar'));

  panel.appendChild(field('Guardar fotos até',
    dateCtl('storageRetentionUntil', retVal, 'date', { onLocalChange: (v) => { autoDelBlock.style.display = v ? 'flex' : 'none'; } }),
    { hint: 'Em branco = sem prazo. Você é avisado quando a data chegar.' }
  ));
  panel.appendChild(autoDelBlock);

  return panel;
}
