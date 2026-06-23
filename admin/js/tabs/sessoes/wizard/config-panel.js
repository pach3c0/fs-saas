// Painel direito do wizard — configurações da sessão sempre visíveis e editáveis.
// Substitui (para o fotógrafo) a maior parte do modal de edição: o que pode mudar,
// muda inline com autosave; o que não pode (resolução após o 1º upload, modo após o
// envio do cliente, pacote após a entrega) aparece travado com a explicação do porquê.
//
// Salva via PUT /api/sessions/:id (pass-through) e usa a sessão retornada como verdade.

import { apiPut, apiGet } from '../../../utils/api.js';
import { uploadImage } from '../../../utils/upload.js';
import { resolveImagePath, escapeHtml } from '../../../utils/helpers.js';
import { appState } from '../../../state.js';
import { wizardState } from './state.js';
import { icon } from '../../../utils/icons.js';
import { setupClientModal, abrirModalClienteNovo } from '../../../utils/client-modal.js';

const EVENT_OPTIONS = [
  ['outro', 'Outro'], ['aniversario', 'Aniversário'], ['casamento', 'Casamento'],
  ['formatura', 'Formatura'], ['corporativo', 'Corporativo'], ['show', 'Show'],
  ['ensaio', 'Ensaio'], ['gestante', 'Gestante'], ['newborn', 'Newborn'],
  ['debutante', 'Debutante'], ['batizado', 'Batizado'],
];
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
function renderCollapsedRail(onToggleCollapse, onClose) {
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

  // Botão fechar — sempre visível mesmo com painel encolhido
  if (onClose) {
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.title = 'Fechar';
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: transparent; border: 1px solid var(--border); color: var(--text-secondary);
      width: 32px; height: 32px; border-radius: var(--r-field); cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 0.875rem;
      transition: background 0.15s;
    `;
    closeBtn.onmouseenter = () => { closeBtn.style.background = 'var(--bg-hover)'; };
    closeBtn.onmouseleave = () => { closeBtn.style.background = 'transparent'; };
    closeBtn.onclick = onClose;
    rail.appendChild(closeBtn);
  }

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
// onBlock/onHistory/onDelete/onClose são callbacks de ação passados do wizard/index.js.
export function renderConfigPanel({ session, onChange, onToggleCollapse, onBlock, onHistory, onDelete, onClose }) {
  if (wizardState.configCollapsed) return renderCollapsedRail(onToggleCollapse, onClose);

  // isGallery = "gallery-like" (entrega direta, sem seleção): Galeria e Galeria em Grupo.
  // isMulti = tem participantes (cada um com código): Seleção em Grupo, Multi-Instant e Galeria em Grupo.
  // isMultiSelection = multi COM etapa de seleção (exclui Galeria em Grupo).
  const isGallery = session.mode === 'gallery' || session.mode === 'multi_gallery';
  const isSelection = session.mode === 'selection';
  const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant' || session.mode === 'multi_gallery';
  const isMultiSelection = session.mode === 'multi_selection' || session.mode === 'multi_instant';
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

  // ===== TOPO DA SIDEBAR: modo, nome e ações da sessão =====
  const MODE_META = {
    selection:       { label: 'Seleção',          color: 'var(--green)' },
    gallery:         { label: 'Galeria',           color: 'var(--purple)' },
    multi_selection: { label: 'Seleção em Grupo',  color: 'var(--orange)' },
    multi_instant:   { label: 'Seleção em Grupo',  color: 'var(--orange)' },
    multi_gallery:   { label: 'Galeria em Grupo',  color: 'var(--purple)' },
  };
  const _mode = MODE_META[session.mode] || { label: session.mode || '—', color: 'var(--text-muted)' };

  // Linha 1: badge de modo + nome da sessão
  const nameRow = document.createElement('div');
  nameRow.style.cssText = 'display:flex; align-items:center; gap:0.5rem; min-width:0;';

  const modeBadge = document.createElement('span');
  modeBadge.textContent = _mode.label;
  modeBadge.style.cssText = `
    background: color-mix(in srgb, ${_mode.color} 15%, transparent);
    border: 1px solid color-mix(in srgb, ${_mode.color} 35%, transparent);
    color: ${_mode.color};
    font-size: 0.625rem; font-weight: 700; padding: 0.1rem 0.45rem;
    border-radius: var(--r-chip); white-space: nowrap; flex-shrink: 0;
    text-transform: uppercase; letter-spacing: 0.04em;
  `;
  nameRow.appendChild(modeBadge);

  const nameEl = document.createElement('span');
  nameEl.textContent = session.name || 'Sessão';
  nameEl.title = session.name || 'Sessão';
  nameEl.style.cssText = 'font-size:0.875rem; font-weight:700; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0;';
  nameRow.appendChild(nameEl);
  panel.appendChild(nameRow);

  // Linha 2: botões de ação compactos
  const mkActionBtn = (glyphHtml, label, onClick, extra = {}) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = label;
    const { color = 'var(--text-secondary)', bg = 'var(--bg-base)', border = 'var(--border)' } = extra;
    b.style.cssText = `
      display:inline-flex; align-items:center; gap:0.3rem; cursor:pointer;
      background:${bg}; border:1px solid ${border}; color:${color};
      border-radius:var(--r-field); padding:0.3rem 0.55rem;
      font-size:0.75rem; transition:background 0.15s; white-space:nowrap; flex:1;
      justify-content:center;
    `;
    b.onmouseenter = () => { b.style.background = `color-mix(in srgb, ${bg === 'var(--bg-base)' ? 'var(--accent)' : bg} 12%, var(--bg-hover))`; };
    b.onmouseleave = () => { b.style.background = bg; };
    const iconSpan = document.createElement('span');
    if (glyphHtml.trim().startsWith('<svg')) {
      iconSpan.innerHTML = glyphHtml;
      const svg = iconSpan.querySelector('svg');
      if (svg) { svg.setAttribute('width', '14'); svg.setAttribute('height', '14'); svg.style.display = 'block'; }
    } else {
      iconSpan.textContent = glyphHtml;
    }
    iconSpan.style.cssText = 'display:flex; align-items:center; flex-shrink:0;';
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    b.appendChild(iconSpan);
    b.appendChild(labelSpan);
    b.onclick = onClick;
    return b;
  };

  const actionsRow = document.createElement('div');
  actionsRow.style.cssText = 'display:flex; gap:0.25rem; flex-wrap:wrap;';

  if (onBlock) {
    const isBlocked = Boolean(session.clientAccessBlocked);
    actionsRow.appendChild(mkActionBtn(
      icon(isBlocked ? 'cadeado' : 'cadeadoAberto', 14),
      isBlocked ? 'Liberar' : 'Bloquear',
      onBlock,
      isBlocked ? { color: 'var(--red)', border: 'color-mix(in srgb, var(--red) 30%, transparent)', bg: 'color-mix(in srgb, var(--red) 8%, transparent)' } : {}
    ));
  }
  if (onHistory) {
    const isHist = wizardState.currentStepId === 'history';
    actionsRow.appendChild(mkActionBtn(
      icon('historico', 14),
      'Histórico',
      onHistory,
      isHist ? { bg: 'color-mix(in srgb, var(--accent) 10%, var(--bg-base))', border: 'var(--accent)' } : {}
    ));
  }
  if (onDelete) {
    actionsRow.appendChild(mkActionBtn(
      icon('lixeira', 14),
      'Excluir',
      onDelete,
      { color: 'var(--red)', border: 'color-mix(in srgb, var(--red) 25%, transparent)', bg: 'color-mix(in srgb, var(--red) 5%, transparent)' }
    ));
  }
  if (onClose) {
    actionsRow.appendChild(mkActionBtn('✕', 'Fechar', onClose));
  }
  panel.appendChild(actionsRow);

  // Separador antes das configurações
  const sep = document.createElement('div');
  sep.style.cssText = 'height:1px; background:var(--border);';
  panel.appendChild(sep);

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

  // Cliente — busca no Rhyno (CRM principal) + cadastrar novo. Vive na sidebar (não na
  // criação): a sessão nasce sem cliente e o vínculo acontece aqui. O cliente só é exigido
  // no passo Compartilhar (back retorna 400 sem cliente). Multi não usa este campo
  // (cada participante tem o seu) — chamado só em selection/gallery.
  const clientField = () => {
    let linkedName = session.clientName || '';
    let linkedEmail = session.clientEmail || '';
    const hasClient = !!(session.clientId || session.rhynoCustomerId || session.clientEmail);

    const w = document.createElement('div');
    w.style.cssText = 'display:flex; flex-direction:column; gap:0.25rem; align-items:center; text-align:center; width:100%;';
    const l = document.createElement('label');
    l.textContent = 'Cliente';
    l.style.cssText = 'font-size:0.75rem; font-weight:500; color:var(--text-secondary); text-align:center; width:100%;';
    w.appendChild(l);

    const body = document.createElement('div');
    body.style.cssText = 'width:100%; position:relative;';
    w.appendChild(body);

    const note = document.createElement('div');
    note.style.cssText = 'font-size:0.625rem; color:var(--text-muted); line-height:1.3; text-align:center; width:100%;';
    w.appendChild(note);

    // Salva o vínculo e re-renderiza o wizard (impactful) para refletir o cliente.
    async function linkClient(c) {
      const patch = { clientEmail: c.email || '', clientName: c.name || '', clientPhone: c.phone || '' };
      if (String(c._id).startsWith('rhyno:')) {
        patch.rhynoCustomerId = String(c._id).slice(6);
        patch.clientId = null;
      } else {
        patch.clientId = c._id;
        patch.rhynoCustomerId = null;
      }
      // Se o nome ainda é o padrão do rascunho, adota o nome do cliente.
      if ((!session.name || session.name.trim() === 'Nova sessão') && c.name) patch.name = c.name;
      await salvar(patch, { impactful: true });
    }

    function renderLinked() {
      body.innerHTML = '';
      const box = document.createElement('div');
      box.style.cssText = 'display:flex; flex-direction:column; gap:0.15rem; align-items:center; background:var(--bg-base); border:1px solid var(--border); border-radius:var(--r-field); padding:0.4rem 0.5rem; width:100%;';
      const nm = document.createElement('div');
      nm.style.cssText = 'font-size:0.8125rem; font-weight:600; color:var(--text-primary);';
      nm.textContent = linkedName || linkedEmail || 'Cliente vinculado';
      box.appendChild(nm);
      if (linkedEmail) {
        const em = document.createElement('div');
        em.style.cssText = 'font-size:0.6875rem; color:var(--text-muted);';
        em.textContent = linkedEmail;
        box.appendChild(em);
      }
      const change = document.createElement('button');
      change.type = 'button';
      change.textContent = 'Trocar cliente';
      change.style.cssText = 'background:none; border:none; color:var(--accent); font-size:0.6875rem; cursor:pointer; padding:0.1rem;';
      change.onclick = renderSearch;
      box.appendChild(change);
      body.appendChild(box);
      note.textContent = '';
    }

    function renderDropdown(dd, clients, query) {
      dd.innerHTML = '';
      clients.forEach(c => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:0.4rem 0.6rem; cursor:pointer; color:var(--text-primary); font-size:0.8125rem; border-top:1px solid var(--border);';
        item.innerHTML = `<strong>${escapeHtml(c.name)}</strong>${c.email ? `<span style="color:var(--text-muted); font-size:0.6875rem;"> · ${escapeHtml(c.email)}</span>` : ''}`;
        item.onmouseenter = () => { item.style.background = 'var(--bg-hover)'; };
        item.onmouseleave = () => { item.style.background = ''; };
        item.onclick = () => linkClient(c);
        dd.appendChild(item);
      });
      if (query.trim()) {
        const criar = document.createElement('div');
        criar.style.cssText = 'padding:0.4rem 0.6rem; cursor:pointer; color:var(--accent); font-size:0.8125rem; border-top:1px solid var(--border); font-weight:500;';
        criar.textContent = `+ Cadastrar "${query.trim()}"`;
        criar.onmouseenter = () => { criar.style.background = 'var(--bg-hover)'; };
        criar.onmouseleave = () => { criar.style.background = ''; };
        criar.onclick = () => {
          dd.style.display = 'none';
          setupClientModal();
          abrirModalClienteNovo(query.trim(), (nc) => linkClient(nc), { target: 'rhyno' });
        };
        dd.appendChild(criar);
      }
      dd.style.display = 'block';
    }

    function renderSearch() {
      body.innerHTML = '';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Buscar ou cadastrar cliente...';
      input.autocomplete = 'off';
      input.style.cssText = INPUT_CSS;
      body.appendChild(input);
      const dd = document.createElement('div');
      dd.style.cssText = 'display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-elevated); border:1px solid var(--border); border-radius:var(--r-field); z-index:20; max-height:200px; overflow-y:auto; margin-top:2px; text-align:left;';
      body.appendChild(dd);
      note.textContent = 'Exigido só na hora de compartilhar o código.';

      let timer = null;
      input.oninput = () => {
        clearTimeout(timer);
        const q = input.value.trim();
        if (!q) { dd.style.display = 'none'; return; }
        timer = setTimeout(async () => {
          try {
            const data = await apiGet(`/api/gestao/customers?search=${encodeURIComponent(q)}`);
            renderDropdown(dd, data.clients || [], q);
          } catch (_) { /* silencioso */ }
        }, 300);
      };
      setTimeout(() => input.focus(), 30);
    }

    if (hasClient) renderLinked(); else renderSearch();
    return w;
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
  if (!isMulti) panel.appendChild(clientField());
  panel.appendChild(coverField());

  // O modo NÃO é editável aqui: foi escolhido no card de criação. O tipo aparece como
  // etiqueta read-only no header do wizard (ver buildHeader em wizard/index.js).

  // Data do evento — grava em `date` e `eventDate` (o modal antigo setava os dois).
  const eventDateVal = session.date
    ? new Date(session.date).toISOString().slice(0, 10)
    : (session.eventDate ? new Date(session.eventDate).toISOString().slice(0, 10) : '');
  const eventDateInput = document.createElement('input');
  eventDateInput.type = 'date';
  eventDateInput.dataset.cfg = 'date';
  eventDateInput.value = eventDateVal;
  eventDateInput.style.cssText = INPUT_CSS;
  eventDateInput.onchange = () => salvar({ date: eventDateInput.value || null, eventDate: eventDateInput.value || null });
  panel.appendChild(field('Data do evento', eventDateInput, { hint: 'Quando o ensaio/evento aconteceu.' }));

  const deadlineVal = session.selectionDeadline ? new Date(session.selectionDeadline).toISOString().slice(0, 16) : '';
  panel.appendChild(field(isGallery ? 'Prazo de acesso' : 'Prazo de seleção',
    dateCtl('selectionDeadline', deadlineVal, 'datetime-local'),
    { hint: 'Deve ser após a data do evento.' }
  ));

  if (!isGallery) {
    panel.appendChild(field('Tipo de evento', selectCtl('eventType', session.eventType || 'outro', EVENT_OPTIONS)));
  }

  // Resolução do preview: vale para Seleção e Seleção em Grupo (preview baixo → entrega alta).
  // Só a Galeria não usa, pois entrega o arquivo original direto.
  if (!isGallery) {
    panel.appendChild(field('Resolução do preview',
      selectCtl('photoResolution', String(session.photoResolution || 1200), RES_OPTIONS, { locked: st.hasPhotos, impactful: true }),
      st.hasPhotos
        ? { lockMsg: 'Trava após o 1º upload — fotos já enviadas não são reprocessadas.' }
        : { hint: 'Tamanho da miniatura que o cliente vê no grid.' }
    ));
  }

  panel.appendChild(checkRow('watermark', session.watermark !== false, "Ativar marca d'água", {
    hint: "Protege visualmente as fotos da sessão"
  }));

  // ===== SELEÇÃO / SELEÇÃO EM GRUPO =====
  // Os dois modos usam pacote + valores de fotos. A diferença: na Seleção individual o
  // packageLimit é o limite do cliente (com lock pós-entrega); no multi ele é o padrão
  // de fotos por participante (cada participante pode ter o seu ao ser cadastrado).
  if (isSelection || isMultiSelection) {
    panel.appendChild(grupo(isMulti ? 'Seleção em Grupo' : 'Seleção'));
    if (isMulti) {
      panel.appendChild(field('Fotos do pacote (padrão)',
        numberCtl('packageLimit', session.packageLimit ?? 30, { impactful: true, min: 0 }),
        { hint: 'Padrão por participante. 0 = sem fotos grátis (cobra desde a 1ª foto).' }
      ));
    } else {
      const minPkg = Math.max(0, st.selectedCount);
      panel.appendChild(field('Fotos do pacote',
        numberCtl('packageLimit', session.packageLimit ?? 30, { locked: st.delivered, impactful: true, min: minPkg }),
        st.delivered
          ? { lockMsg: 'Trava após a entrega.' }
          : (st.selectedCount > 0 ? { hint: `Mínimo ${minPkg} — o cliente já escolheu ${st.selectedCount}.` } : undefined)
      ));
    }
    panel.appendChild(field(isMulti ? 'Preço foto extra (padrão)' : 'Preço foto extra (R$)',
      numberCtl('extraPhotoPrice', session.extraPhotoPrice ?? 25, { min: 0, step: 0.01 }),
      isMulti ? { hint: 'Padrão por participante — pode ser ajustado ao cadastrar cada um.' } : undefined
    ));
    panel.appendChild(checkRow('allowExtraPurchasePostSubmit', session.allowExtraPurchasePostSubmit !== false, 'Permitir venda de fotos extras'));
    panel.appendChild(checkRow('allowReopen', session.allowReopen !== false, 'Permitir pedido de reabertura'));

    // Tabela de preços progressiva (apenas Seleção em Grupo)
    if (isMulti) {
      const pricingWrap = document.createElement('div');
      pricingWrap.style.cssText = 'display:flex; flex-direction:column; gap:0.5rem; align-items:center; text-align:center; width:100%;';

      const pricingLabel = document.createElement('label');
      pricingLabel.textContent = 'Tabela de preços por faixa';
      pricingLabel.style.cssText = 'font-size:0.75rem; font-weight:500; color:var(--text-secondary); text-align:center; width:100%;';
      pricingWrap.appendChild(pricingLabel);

      const pricingHint = document.createElement('div');
      pricingHint.textContent = 'Cada faixa vale "a partir de N fotos extras". O cálculo é cumulativo: cada foto é cobrada pela faixa em que cai, então o total sempre cresce com a quantidade.';
      pricingHint.style.cssText = 'font-size:0.625rem; color:var(--text-muted); line-height:1.3; text-align:center; width:100%;';
      pricingWrap.appendChild(pricingHint);

      // Cálculo CUMULATIVO — ⚠️ DEVE ser idêntico ao calcExtraCost de cliente/js/gallery.js.
      const calcExtraCost = (qty, pricingTable, flatPrice) => {
        qty = Math.max(0, Math.floor(Number(qty) || 0));
        const flat = Number(flatPrice) || 0;
        if (qty === 0) return 0;
        const tiers = (Array.isArray(pricingTable) ? pricingTable : [])
          .filter(t => t && Number.isFinite(t.from) && Number.isFinite(t.price))
          .map(t => ({ from: Math.max(1, Math.floor(t.from)), price: Math.max(0, Number(t.price)) }))
          .sort((a, b) => a.from - b.from);
        if (tiers.length === 0) return qty * flat;
        let total = 0;
        for (let n = 1; n <= qty; n++) {
          let price = flat;
          for (const t of tiers) { if (t.from <= n) price = t.price; else break; }
          total += price;
        }
        return total;
      };

      let rows = Array.isArray(session.pricingTable) ? [...session.pricingTable] : [];
      const rowsContainer = document.createElement('div');
      rowsContainer.style.cssText = 'display:flex; flex-direction:column; gap:0.375rem; width:100%;';

      const savePricingTable = async () => {
        try {
          await apiPut(`/api/sessions/${session._id}/pricing-table`, { pricingTable: rows });
          session.pricingTable = [...rows];
          flashSaved();
        } catch (e) {
          window.showToast?.('Erro ao salvar tabela: ' + e.message, 'error');
        }
      };

      // Prévia ao vivo dos totais — usa o MESMO calcExtraCost do cliente, então o
      // fotógrafo vê exatamente o que o cliente verá (sem conflito de valores).
      const previewEl = document.createElement('div');
      previewEl.style.cssText = 'font-size:0.625rem; color:var(--text-muted); line-height:1.5; text-align:center; width:100%; margin-top:0.125rem;';
      const updatePreview = () => {
        const valid = rows.filter(r => Number.isFinite(Number(r.from)) && Number.isFinite(Number(r.price)));
        if (valid.length === 0) { previewEl.innerHTML = ''; return; }
        const flat = Number(session.extraPhotoPrice) || 0;
        const froms = valid.map(r => Math.max(1, Math.floor(r.from))).sort((a, b) => a - b);
        const samples = Array.from(new Set([...froms, froms[froms.length - 1] + 5])).slice(0, 5);
        const lines = samples.map(q =>
          `${q} extra${q > 1 ? 's' : ''} → <strong>R$ ${calcExtraCost(q, rows, flat).toFixed(2).replace('.', ',')}</strong>`
        );
        previewEl.innerHTML = 'Prévia (cumulativa): ' + lines.join(' · ');
      };

      const renderRows = () => {
        rowsContainer.innerHTML = '';
        rows.forEach((r, i) => {
          const rowEl = document.createElement('div');
          rowEl.style.cssText = 'display:flex; gap:0.25rem; align-items:center; width:100%;';

          const fromIn = document.createElement('input');
          fromIn.type = 'number'; fromIn.min = '1'; fromIn.value = String(r.from);
          fromIn.placeholder = 'De'; fromIn.title = 'A partir de quantas fotos';
          fromIn.style.cssText = INPUT_CSS + ' flex:1; min-width:0;';
          fromIn.onchange = () => { rows[i].from = parseInt(fromIn.value) || 1; savePricingTable(); updatePreview(); };

          const sep = document.createElement('span');
          sep.textContent = '→ R$';
          sep.style.cssText = 'font-size:0.6875rem; color:var(--text-muted); white-space:nowrap; flex-shrink:0;';

          const priceIn = document.createElement('input');
          priceIn.type = 'number'; priceIn.min = '0'; priceIn.step = '0.01'; priceIn.value = String(r.price);
          priceIn.placeholder = 'Preço';
          priceIn.style.cssText = INPUT_CSS + ' flex:1; min-width:0;';
          priceIn.onchange = () => { rows[i].price = parseFloat(priceIn.value) || 0; savePricingTable(); updatePreview(); };

          const del = document.createElement('button');
          del.type = 'button'; del.innerHTML = icon('lixeira', 12);
          del.title = 'Remover faixa';
          del.style.cssText = 'background:none; border:none; color:var(--red); cursor:pointer; display:flex; align-items:center; padding:0.125rem; flex-shrink:0;';
          del.onclick = () => { rows.splice(i, 1); renderRows(); savePricingTable(); };

          rowEl.appendChild(fromIn);
          rowEl.appendChild(sep);
          rowEl.appendChild(priceIn);
          rowEl.appendChild(del);
          rowsContainer.appendChild(rowEl);
        });

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.textContent = '+ Adicionar faixa';
        addBtn.style.cssText = 'background:none; border:1px dashed var(--border); border-radius:var(--r-field); color:var(--accent); font-size:0.6875rem; cursor:pointer; padding:0.25rem; width:100%; text-align:center; margin-top:0.125rem;';
        addBtn.onclick = () => {
          const lastFrom = rows.length > 0 ? rows[rows.length - 1].from : 0;
          rows.push({ from: lastFrom + 10, price: 0 });
          renderRows();
        };
        rowsContainer.appendChild(addBtn);
        updatePreview();
      };

      renderRows();
      pricingWrap.appendChild(rowsContainer);
      pricingWrap.appendChild(previewEl);
      panel.appendChild(pricingWrap);
    }
  }

  if (isSelection || isMultiSelection) {
    panel.appendChild(checkRow('commentsEnabled', session.commentsEnabled !== false, 'Mensagens por foto'));
  }

  // Seleção em Grupo: cada participante pode ver sua posição na fila de entrega (urgência).
  if (isMultiSelection) {
    panel.appendChild(checkRow('showDeliveryQueuePosition', Boolean(session.showDeliveryQueuePosition), 'Mostrar posição na fila', {
      hint: 'Cada participante vê quantos estão à frente — incentiva finalizar logo.'
    }));
  }

  // ===== VENDAS (não em galeria) =====
  if (!isGallery) {
    panel.appendChild(grupo('Vendas'));
    panel.appendChild(checkRow('salesAutomationEnabled', session.salesAutomation?.enabled !== false, 'Automação de vendas (escassez)', {
      patchKey: 'salesAutomation.enabled',
      hint: 'Robô envia e-mails de urgência conforme o prazo se aproxima.',
    }));
  }

  return panel;
}
