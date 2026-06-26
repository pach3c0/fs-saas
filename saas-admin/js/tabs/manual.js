// Manual do Usuário — criador de módulos com blocos
import { apiRequest, saasToast, saasConfirm, esc, formatSize, getToken } from '../core.js';

// ============================================================================
// MANUAL DO USUÁRIO — Criador de Módulos
// ============================================================================

let _manualModules   = [];
let _manualEditMode  = null; // null | 'new' | { id }
let _manualEditData  = null; // módulo sendo editado (copia local)

// ── Helpers ──────────────────────────────────────────────────────────────────

const COLOR_OPTS = [
  { value: 'accent', label: 'Roxo (accent)' },
  { value: 'green',  label: 'Verde' },
  { value: 'yellow', label: 'Amarelo' },
  { value: 'red',    label: 'Vermelho' },
];
const WHO_OPTS = ['fotógrafo', 'cliente', 'sistema'];

function _mLabel(color) { return COLOR_OPTS.find(c => c.value === color)?.label || color; }

function _inp(style = '') {
  return `background:#0f172a; color:#f1f5f9; border:1px solid #334155; border-radius:0.375rem; padding:0.4rem 0.6rem; font-size:0.8125rem; font-family:inherit; outline:none; ${style}`;
}

// ── Tela 1: lista de módulos ─────────────────────────────────────────────────

async function loadManual() {
  const el = document.getElementById('tabManual');
  if (!el) return;
  el.innerHTML = '<div class="loading">Carregando manual...</div>';
  try {
    const data = await apiRequest('GET', '/api/admin/manual');
    _manualModules = data.modules || [];
    renderManualList(el);
  } catch (err) {
    el.innerHTML = `<div class="loading" style="color:#f87171">Erro: ${err.message}</div>`;
  }
}

function renderManualList(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <!-- header -->
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem;">
        <div>
          <h2 style="font-size:1.2rem; font-weight:700; color:#f1f5f9; margin:0;">Manual do Usuário</h2>
          <p style="font-size:0.78rem; color:#64748b; margin:0.25rem 0 0;">Módulos que aparecem no painel dos fotógrafos (aba Ajuda → Manual).</p>
        </div>
        <button onclick="window.openManualNew()" style="background:#6366f1; color:#fff; border:none; border-radius:0.375rem; padding:0.5rem 1.125rem; font-size:0.8125rem; font-weight:600; cursor:pointer;">+ Novo Módulo</button>
      </div>

      <!-- lista -->
      <div id="manualModuleList" style="display:flex; flex-direction:column; gap:0.5rem;">
        ${_manualModules.length === 0
          ? '<div style="color:#64748b; font-size:0.875rem; padding:1.5rem; text-align:center;">Nenhum módulo cadastrado. Clique em "+ Novo Módulo" para começar.</div>'
          : _manualModules.map((m, i) => `
            <div data-mid="${m.id}" style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:0.75rem 1rem; display:flex; align-items:center; gap:0.75rem;">
              <span style="cursor:grab; color:#475569; font-size:1.1rem; user-select:none;">⠿</span>
              <div style="width:32px; height:32px; border-radius:6px; background:#0f172a; display:flex; align-items:center; justify-content:center; border:1px solid #334155; flex-shrink:0;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${m.icon || ''}</svg>
              </div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:0.875rem; font-weight:600; color:#f1f5f9;">${esc(m.label)}</div>
                <div style="font-size:0.7rem; color:#64748b;">${m.blocks?.length || 0} bloco(s) · id: ${m.id}</div>
              </div>
              <span style="font-size:0.6875rem; font-weight:700; padding:0.2rem 0.55rem; border-radius:9999px; ${m.isPublished ? 'background:#064e3b; color:#34d399;' : 'background:#1e293b; color:#64748b; border:1px solid #334155;'}">
                ${m.isPublished ? 'Publicado' : 'Rascunho'}
              </span>
              <button onclick="window.toggleManualPublish('${m.id}', ${m.isPublished})" style="background:${m.isPublished ? '#7f1d1d' : '#14532d'}; color:#fff; border:none; border-radius:0.25rem; padding:0.3rem 0.625rem; font-size:0.7rem; cursor:pointer; white-space:nowrap;">
                ${m.isPublished ? 'Rascunho' : 'Publicar'}
              </button>
              <button onclick="window.openManualEdit('${m.id}')" style="background:#1e3a5f; color:#93c5fd; border:none; border-radius:0.25rem; padding:0.3rem 0.625rem; font-size:0.7rem; cursor:pointer;">Editar</button>
              <button onclick="window.deleteManualModule('${m.id}', '${esc(m.label)}')" style="background:#450a0a; color:#fca5a5; border:none; border-radius:0.25rem; padding:0.3rem 0.625rem; font-size:0.7rem; cursor:pointer;">Excluir</button>
            </div>
          `).join('')
        }
      </div>
    </div>
  `;
}

// ── Toggle publicado ─────────────────────────────────────────────────────────

window.toggleManualPublish = async (id, current) => {
  try {
    await apiRequest('PUT', `/api/admin/manual/${id}`, { isPublished: !current });
    saasToast(!current ? 'Módulo publicado!' : 'Módulo movido para rascunho.', 'success');
    await loadManual();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

// ── Excluir módulo ───────────────────────────────────────────────────────────

window.deleteManualModule = async (id, label) => {
  if (!await saasConfirm(`Excluir o módulo "${label}"? Esta ação não pode ser desfeita.`, { title: 'Excluir Módulo', confirmText: 'Excluir', danger: true })) return;
  try {
    await apiRequest('DELETE', `/api/admin/manual/${id}`);
    saasToast(`Módulo "${label}" excluído.`, 'success');
    await loadManual();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

// ── Tela 2: editor de módulo ─────────────────────────────────────────────────

window.openManualNew = () => {
  _manualEditMode = 'new';
  _manualEditData = { id: '', label: '', icon: '', order: _manualModules.length, isPublished: false, blocks: [] };
  renderManualEditor();
};

window.openManualEdit = (id) => {
  const mod = _manualModules.find(m => m.id === id);
  if (!mod) return;
  _manualEditMode = id;
  _manualEditData = JSON.parse(JSON.stringify(mod)); // deep clone
  renderManualEditor();
};

function renderManualEditor() {
  const el = document.getElementById('tabManual');
  const d  = _manualEditData;
  const isNew = _manualEditMode === 'new';

  el.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem; max-width:860px;">

      <!-- Cabeçalho -->
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <button onclick="window.backToManualList()" style="background:#1e293b; color:#94a3b8; border:1px solid #334155; border-radius:0.375rem; padding:0.375rem 0.75rem; font-size:0.8rem; cursor:pointer;">← Voltar</button>
        <h2 style="font-size:1.1rem; font-weight:700; color:#f1f5f9; margin:0;">${isNew ? 'Novo Módulo' : `Editar: ${esc(d.label)}`}</h2>
      </div>

      <!-- Dados do módulo -->
      <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:1.25rem; display:flex; flex-direction:column; gap:0.875rem;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
          <label style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:#94a3b8;">
            Label (nome exibido)
            <input id="mLabel" type="text" value="${esc(d.label)}" placeholder="ex: Dashboard"
              style="${_inp('width:100%;')}">
          </label>
          <label style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:#94a3b8;">
            ID / Slug
            <input id="mId" type="text" value="${esc(d.id)}" placeholder="ex: dashboard" ${isNew ? '' : 'readonly style="opacity:0.5;"'}
              style="${_inp('width:100%;')}">
          </label>
        </div>
        <label style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:#94a3b8;">
          Ícone (SVG path do Lucide — cole o conteúdo interno do &lt;svg&gt;)
          <input id="mIcon" type="text" value="${esc(d.icon)}" placeholder="ex: &lt;polygon points=&quot;12 2 2 7 ...&quot;/&gt;"
            style="${_inp('width:100%;')}">
        </label>
        <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.8125rem; color:#94a3b8; cursor:pointer;">
          <input id="mPublished" type="checkbox" ${d.isPublished ? 'checked' : ''}>
          Publicado (visível para fotógrafos)
        </label>
      </div>

      <!-- Blocos -->
      <div>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
          <span style="font-size:0.8125rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em;">Blocos</span>
        </div>
        <div id="mBlockList" style="display:flex; flex-direction:column; gap:0.75rem;">
          ${d.blocks.map((b, i) => renderBlockItem(b, i)).join('')}
        </div>
        <div style="display:flex; gap:0.5rem; margin-top:0.875rem; flex-wrap:wrap;">
          <button onclick="window.addManualBlock('intro')"    style="background:#1e3a5f; color:#93c5fd; border:none; border-radius:0.375rem; padding:0.4rem 0.875rem; font-size:0.8rem; cursor:pointer;">+ Introdução</button>
          <button onclick="window.addManualBlock('callout')"  style="background:#1e3a5f; color:#93c5fd; border:none; border-radius:0.375rem; padding:0.4rem 0.875rem; font-size:0.8rem; cursor:pointer;">+ Callout</button>
          <button onclick="window.addManualBlock('steps')"    style="background:#1e3a5f; color:#93c5fd; border:none; border-radius:0.375rem; padding:0.4rem 0.875rem; font-size:0.8rem; cursor:pointer;">+ Passo a Passo</button>
          <button onclick="window.addManualBlock('image')"    style="background:#1e3a5f; color:#93c5fd; border:none; border-radius:0.375rem; padding:0.4rem 0.875rem; font-size:0.8rem; cursor:pointer;">+ Imagem</button>
        </div>
      </div>

      <!-- Rodapé -->
      <div style="display:flex; justify-content:flex-end; gap:0.75rem; border-top:1px solid #334155; padding-top:1rem;">
        <button onclick="window.backToManualList()" style="background:#1e293b; color:#94a3b8; border:1px solid #334155; border-radius:0.375rem; padding:0.5rem 1rem; font-size:0.875rem; cursor:pointer;">Cancelar</button>
        <button onclick="window.saveManualModule()" style="background:#6366f1; color:#fff; border:none; border-radius:0.375rem; padding:0.5rem 1.25rem; font-size:0.875rem; font-weight:600; cursor:pointer;">Salvar</button>
      </div>
    </div>
  `;

  _bindBlockDrag();
}

// Drag & drop dos blocos: segure a alça ⠿, arraste e solte sobre outro bloco.
// O card só vira draggable no mousedown da alça (senão o drag rouba a seleção de texto
// dos textareas). Coleta o form antes de mover para não perder edições não salvas.
function _bindBlockDrag() {
  const list = document.getElementById('mBlockList');
  if (!list) return;
  let dragIdx = null;
  // só os cards de bloco (filhos diretos) — os inputs internos também têm data-bidx
  Array.from(list.children).forEach(card => {
    const handle = card.querySelector('.m-drag-handle');
    if (!handle) return;
    handle.addEventListener('mousedown', () => { card.draggable = true; });
    card.addEventListener('dragstart', (e) => {
      dragIdx = Number(card.dataset.bidx);
      _collectManualForm();
      e.dataTransfer.effectAllowed = 'move';
      card.style.opacity = '0.4';
    });
    card.addEventListener('dragend', () => {
      card.draggable = false;
      card.style.opacity = '';
      Array.from(list.children).forEach(c => { c.style.outline = ''; });
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (Number(card.dataset.bidx) !== dragIdx) card.style.outline = '2px solid #6366f1';
    });
    card.addEventListener('dragleave', () => { card.style.outline = ''; });
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const to = Number(card.dataset.bidx);
      if (dragIdx === null || to === dragIdx) return;
      const [movido] = _manualEditData.blocks.splice(dragIdx, 1);
      _manualEditData.blocks.splice(to, 0, movido);
      dragIdx = null;
      renderManualEditor();
    });
  });
}

function renderBlockItem(b, i) {
  const removeBtn = `<button onclick="window.removeManualBlock(${i})" title="Remover bloco" style="background:#450a0a; color:#fca5a5; border:none; border-radius:0.25rem; padding:0.2rem 0.5rem; font-size:0.7rem; cursor:pointer; flex-shrink:0;">✕</button>`;
  // Alça de arrasto — segure aqui e solte sobre outro bloco para reordenar
  const dragHandle = `<span class="m-drag-handle" title="Arraste para reordenar" style="cursor:grab; color:#64748b; font-size:1rem; line-height:1; user-select:none; padding:0.1rem 0.25rem; flex-shrink:0;">⠿</span>`;

  if (b.type === 'intro') return `
    <div data-bidx="${i}" style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1rem;">
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
        ${dragHandle}
        <span style="font-size:0.65rem; font-weight:700; text-transform:uppercase; color:#6366f1; background:#1e1b4b; padding:0.15rem 0.45rem; border-radius:4px;">Introdução</span>
        ${removeBtn}
      </div>
      ${tbarHtml(i, 'content')}
      <textarea data-bidx="${i}" data-field="content" rows="4"
        style="${_inp('width:100%; resize:vertical; margin-top:0.25rem;')}">${esc(b.content || '')}</textarea>
    </div>`;

  if (b.type === 'callout') return `
    <div data-bidx="${i}" style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1rem;">
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
        ${dragHandle}
        <span style="font-size:0.65rem; font-weight:700; text-transform:uppercase; color:#f59e0b; background:#1c1003; padding:0.15rem 0.45rem; border-radius:4px;">Callout</span>
        <select data-bidx="${i}" data-field="color" style="${_inp('')}">
          ${COLOR_OPTS.map(c => `<option value="${c.value}" ${b.color === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
        </select>
        ${removeBtn}
      </div>
      ${tbarHtml(i, 'content')}
      <textarea data-bidx="${i}" data-field="content" rows="4"
        style="${_inp('width:100%; resize:vertical; margin-top:0.25rem;')}">${esc(b.content || '')}</textarea>
    </div>`;

  if (b.type === 'image') return `
    <div data-bidx="${i}" style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1rem;">
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
        ${dragHandle}
        <span style="font-size:0.65rem; font-weight:700; text-transform:uppercase; color:#38bdf8; background:#082f49; padding:0.15rem 0.45rem; border-radius:4px;">Imagem</span>
        ${removeBtn}
      </div>
      ${b.url
        ? `<img src="${esc(b.url)}" style="max-width:100%; max-height:260px; object-fit:contain; border-radius:0.375rem; border:1px solid #334155; display:block; margin-bottom:0.625rem; background:#1e293b;">`
        : `<div style="border:2px dashed #334155; border-radius:0.375rem; padding:1.5rem; text-align:center; color:#64748b; font-size:0.8rem; margin-bottom:0.625rem;">Nenhuma imagem — envie a captura de tela abaixo</div>`}
      <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
        <label style="background:#1e3a5f; color:#93c5fd; border-radius:0.375rem; padding:0.35rem 0.875rem; font-size:0.78rem; cursor:pointer;">
          ${b.url ? 'Trocar imagem' : 'Enviar imagem'}
          <input type="file" accept=".jpg,.jpeg,.png,.webp" style="display:none;" onchange="window.uploadManualImage(${i}, this)">
        </label>
        <span id="mImgStatus_${i}" style="font-size:0.75rem; color:#64748b;"></span>
      </div>
      ${b.url ? `
        <div style="margin-top:0.625rem; display:flex; flex-direction:column; gap:0.3rem;">
          <span style="font-size:0.7rem; color:#94a3b8;">Código HTML da imagem (copie e cole dentro da descrição do passo):</span>
          <div style="display:flex; gap:0.5rem;">
            <input type="text" readonly value="${esc(`<img src="${b.url}" style="max-width:100%; max-height:240px; border-radius:8px; margin-top:0.5rem; display:block; border:1px solid var(--border); object-fit:contain;" />`)}" style="${_inp('flex:1; font-family:monospace; font-size:0.72rem; opacity:0.8; background:#0b0f19; color:#94a3b8;')}" onclick="this.select()">
            <button type="button" onclick="navigator.clipboard.writeText(this.previousElementSibling.value); saasToast('Código HTML copiado!', 'success')" style="background:#1e3a5f; color:#93c5fd; border:none; border-radius:0.25rem; padding:0.35rem 0.75rem; font-size:0.72rem; cursor:pointer; font-weight:600; white-space:nowrap;">Copiar Tag</button>
          </div>
        </div>
      ` : ''}
      <input type="text" data-bidx="${i}" data-field="caption" value="${esc(b.caption || '')}" placeholder="Legenda (opcional)"
        style="${_inp('width:100%; margin-top:0.625rem;')}">
    </div>`;

  if (b.type === 'steps') return `
    <div data-bidx="${i}" style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1rem;">
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
        ${dragHandle}
        <span style="font-size:0.65rem; font-weight:700; text-transform:uppercase; color:#22c55e; background:#052e16; padding:0.15rem 0.45rem; border-radius:4px;">Passo a Passo</span>
        ${removeBtn}
      </div>
      <div id="mStepList_${i}" style="display:flex; flex-direction:column; gap:0.625rem;">
        ${(b.steps || []).map((s, si) => renderStepItem(i, si, s)).join('')}
      </div>
      <button onclick="window.addManualStep(${i})" style="margin-top:0.625rem; background:#14532d; color:#86efac; border:none; border-radius:0.25rem; padding:0.3rem 0.75rem; font-size:0.75rem; cursor:pointer;">+ Passo</button>
    </div>`;

  return '';
}

function renderStepItem(bi, si, s) {
  return `
    <div data-si="${si}" style="display:grid; grid-template-columns:auto 1fr 1fr 2fr auto; gap:0.5rem; align-items:start; background:#1e293b; border-radius:0.375rem; padding:0.625rem;">
      <div style="width:24px; height:24px; border-radius:50%; background:#6366f1; color:#fff; font-size:0.6875rem; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:0.25rem;">${s.n}</div>
      <select data-bi="${bi}" data-si="${si}" data-field="who" style="${_inp('width:100%;')}">
        ${WHO_OPTS.map(w => `<option value="${w}" ${s.who === w ? 'selected' : ''}>${w}</option>`).join('')}
      </select>
      <select data-bi="${bi}" data-si="${si}" data-field="color" style="${_inp('width:100%;')}">
        ${COLOR_OPTS.map(c => `<option value="${c.value}" ${s.color === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
      </select>
      <div style="display:flex; flex-direction:column; gap:0.3rem;">
        <input type="text" data-bi="${bi}" data-si="${si}" data-field="title" value="${esc(s.title)}" placeholder="Título do passo"
          style="${_inp('width:100%;')}">
        <textarea data-bi="${bi}" data-si="${si}" data-field="desc" rows="2" placeholder="Descrição"
          style="${_inp('width:100%; resize:vertical;')}">${esc(s.desc)}</textarea>
      </div>
      <button onclick="window.removeManualStep(${bi}, ${si})" style="background:#450a0a; color:#fca5a5; border:none; border-radius:0.25rem; padding:0.2rem 0.4rem; font-size:0.7rem; cursor:pointer; margin-top:0.25rem;">✕</button>
    </div>`;
}

// Toolbar B / I simples
function tbarHtml(bi, field) {
  return `<div style="display:flex; gap:0.3rem; margin-bottom:0.2rem;">
    <button type="button" onclick="_mInsertTag(${bi},'${field}','strong')" title="Negrito" style="background:#1e293b; border:1px solid #334155; color:#f1f5f9; border-radius:0.25rem; width:26px; height:24px; font-size:0.75rem; font-weight:700; cursor:pointer; font-family:serif;">B</button>
    <button type="button" onclick="_mInsertTag(${bi},'${field}','em')" title="Itálico" style="background:#1e293b; border:1px solid #334155; color:#f1f5f9; border-radius:0.25rem; width:26px; height:24px; font-size:0.75rem; cursor:pointer; font-style:italic; font-family:serif;">I</button>
  </div>`;
}

window._mInsertTag = (bi, field, tag) => {
  const ta = document.querySelector(`textarea[data-bidx="${bi}"][data-field="${field}"]`);
  if (!ta) return;
  const [s, e] = [ta.selectionStart, ta.selectionEnd];
  const selected = ta.value.slice(s, e) || 'texto';
  const insert = `<${tag}>${selected}</${tag}>`;
  ta.value = ta.value.slice(0, s) + insert + ta.value.slice(e);
  ta.focus();
};

// ── Adicionar / remover blocos ────────────────────────────────────────────────

window.addManualBlock = (type) => {
  const defaults = {
    intro:   { type: 'intro',   content: '' },
    callout: { type: 'callout', content: '', color: 'accent' },
    steps:   { type: 'steps',  steps: [{ n: 1, who: 'fotógrafo', color: 'accent', title: '', desc: '' }] },
    image:   { type: 'image',  url: '', caption: '' }
  };
  _manualEditData.blocks.push(defaults[type]);
  renderManualEditor();
};

// Upload da captura de tela do bloco de imagem (POST /api/admin/upload, campo "image")
window.uploadManualImage = async (i, input) => {
  const file = input.files && input.files[0];
  if (!file) return;
  const status = document.getElementById(`mImgStatus_${i}`);
  if (status) status.textContent = 'Enviando...';
  try {
    _collectManualForm(); // preserva edições feitas nos outros blocos antes do re-render
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: fd
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
    _manualEditData.blocks[i].url = json.url;
    renderManualEditor();
    saasToast('Imagem enviada!', 'success');
  } catch (err) {
    if (status) status.textContent = '';
    saasToast('Erro no upload: ' + err.message, 'error');
  } finally {
    input.value = '';
  }
};

window.removeManualBlock = (i) => {
  _manualEditData.blocks.splice(i, 1);
  renderManualEditor();
};

window.addManualStep = (bi) => {
  const steps = _manualEditData.blocks[bi].steps || [];
  steps.push({ n: steps.length + 1, who: 'fotógrafo', color: 'accent', title: '', desc: '' });
  _manualEditData.blocks[bi].steps = steps;
  renderManualEditor();
};

window.removeManualStep = (bi, si) => {
  _manualEditData.blocks[bi].steps.splice(si, 1);
  // renumerar
  _manualEditData.blocks[bi].steps.forEach((s, i) => { s.n = i + 1; });
  renderManualEditor();
};

// ── Coletar dados do DOM antes de salvar ──────────────────────────────────────

function _collectManualForm() {
  _manualEditData.label       = document.getElementById('mLabel')?.value.trim() || '';
  _manualEditData.id          = _manualEditMode === 'new' ? (document.getElementById('mId')?.value.trim() || '') : _manualEditData.id;
  _manualEditData.icon        = document.getElementById('mIcon')?.value.trim() || '';
  _manualEditData.isPublished = document.getElementById('mPublished')?.checked || false;

  _manualEditData.blocks.forEach((b, i) => {
    if (b.type === 'intro' || b.type === 'callout') {
      const ta = document.querySelector(`textarea[data-bidx="${i}"][data-field="content"]`);
      if (ta) b.content = ta.value;
      if (b.type === 'callout') {
        const sel = document.querySelector(`select[data-bidx="${i}"][data-field="color"]`);
        if (sel) b.color = sel.value;
      }
    } else if (b.type === 'steps') {
      (b.steps || []).forEach((s, si) => {
        ['who', 'color', 'title', 'desc'].forEach(f => {
          const el = document.querySelector(`[data-bi="${i}"][data-si="${si}"][data-field="${f}"]`);
          if (el) s[f] = el.tagName === 'TEXTAREA' ? el.value : el.value;
        });
      });
    } else if (b.type === 'image') {
      // url é setada direto no upload; aqui só a legenda
      const cap = document.querySelector(`input[data-bidx="${i}"][data-field="caption"]`);
      if (cap) b.caption = cap.value;
    }
  });
}

// ── Salvar ───────────────────────────────────────────────────────────────────

window.saveManualModule = async () => {
  _collectManualForm();

  const d = _manualEditData;
  if (!d.label.trim()) { saasToast('Label é obrigatório.', 'error'); return; }
  if (!d.id.trim())    { saasToast('ID é obrigatório.', 'error');    return; }

  const btn = document.querySelector('button[onclick*="saveManualModule"]');
  if (btn) { btn.textContent = 'Salvando...'; btn.disabled = true; }

  try {
    if (_manualEditMode === 'new') {
      await apiRequest('POST', '/api/admin/manual', d);
      saasToast('Módulo criado!', 'success');
    } else {
      await apiRequest('PUT', `/api/admin/manual/${d.id}`, d);
      saasToast('Módulo salvo!', 'success');
    }
    await loadManual();
    _manualEditMode = null;
    _manualEditData = null;
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
    if (btn) { btn.textContent = 'Salvar'; btn.disabled = false; }
  }
};

window.backToManualList = () => {
  _manualEditMode = null;
  _manualEditData = null;
  loadManual();
};


export { loadManual };
