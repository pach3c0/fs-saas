/**
 * Tab: Perfil e Identidade Visual
 * Editor de Marca D'água em Camadas (Layers)
 */

import { apiGet, apiPut } from '../utils/api.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { resolveImagePath, escapeHtml } from '../utils/helpers.js';
import { appState } from '../state.js';

let organizationData = {};

// ============================================================
// ESTADO DO EDITOR DE LAYERS
// ============================================================
let wmLayers = [];
let selectedLayerId = null;
let _dragState = null;
let _resizeState = null;
let _canvasEl = null;
let _panelEl = null;
let _saveTimeout = null;
let _containerRef = null;

const FONT_OPTIONS = [
  'Arial', 'Playfair Display', 'Georgia', 'Inter',
  'Montserrat', 'Dancing Script', 'Oswald', 'Roboto Slab'
];

const PLACEHOLDER_LOGO = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iNTAiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzNzQxNTEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZpbGw9IiNmZmYiPkxvZ288L3RleHQ+PC9zdmc+';

// ============================================================
// UTILITÁRIOS
// ============================================================

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function getDefaultLayers() {
  const orgName = organizationData.name || 'Seu Negócio';
  const logo = organizationData.logo ? resolveImagePath(organizationData.logo) : null;
  const layers = [
    {
      id: genId(), type: 'text',
      x: 5, y: 38, w: 90, h: 18,
      opacity: 0.35, rotation: -30,
      text: 'Cópia não autorizada',
      fontSize: 30, fontFamily: 'Arial', fontWeight: 'bold',
      fontStyle: 'normal', color: '#ffffff', letterSpacing: 3, shadow: true
    },
    {
      id: genId(), type: 'text',
      x: 52, y: 83, w: 45, h: 10,
      opacity: 0.30, rotation: 0,
      text: orgName,
      fontSize: 16, fontFamily: 'Playfair Display', fontWeight: 'normal',
      fontStyle: 'italic', color: '#ffffff', letterSpacing: 1, shadow: true
    }
  ];
  if (logo) {
    layers.unshift({
      id: genId(), type: 'image',
      x: 3, y: 4, w: 22, h: 18,
      opacity: 0.40, rotation: 0,
      url: logo, filter: 'white'
    });
  }
  return layers;
}

function getFilterCSS(filter) {
  switch (filter) {
    case 'grayscale': return 'grayscale(1)';
    case 'invert': return 'invert(1)';
    case 'white': return 'brightness(0) invert(1)';
    default: return 'none';
  }
}

// ============================================================
// RENDER DO CANVAS
// ============================================================

function renderCanvas() {
  if (!_canvasEl) return;
  _canvasEl.querySelectorAll('.wm-layer').forEach(el => el.remove());

  wmLayers.forEach(layer => {
    const el = document.createElement('div');
    el.className = 'wm-layer';
    el.dataset.id = layer.id;
    const isSelected = layer.id === selectedLayerId;

    el.style.cssText = [
      'position:absolute',
      `left:${layer.x}%`,
      `top:${layer.y}%`,
      `width:${layer.w}%`,
      `height:${layer.h}%`,
      `opacity:${layer.opacity}`,
      `transform:rotate(${layer.rotation}deg)`,
      'transform-origin:center center',
      'cursor:move',
      'box-sizing:border-box',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'overflow:visible',
      `border:2px solid ${isSelected ? 'rgba(99,102,241,0.9)' : 'transparent'}`,
      'border-radius:2px',
      'user-select:none'
    ].join(';');

    if (layer.type === 'text') {
      const fw = layer.fontWeight === 'bold' ? '700' : layer.fontWeight === 'light' ? '300' : '400';
      const shadow = layer.shadow ? '0 0 6px rgba(0,0,0,0.9),0 0 3px rgba(0,0,0,0.7)' : 'none';
      const span = document.createElement('span');
      span.style.cssText = [
        `font-family:'${layer.fontFamily}',sans-serif`,
        `font-size:${layer.fontSize}px`,
        `font-weight:${fw}`,
        `font-style:${layer.fontStyle}`,
        `color:${layer.color}`,
        `letter-spacing:${layer.letterSpacing}px`,
        `text-shadow:${shadow}`,
        'white-space:nowrap',
        'pointer-events:none'
      ].join(';');
      span.textContent = layer.text || '';
      el.appendChild(span);
    } else {
      const img = document.createElement('img');
      img.src = layer.url || PLACEHOLDER_LOGO;
      img.onerror = () => { img.src = PLACEHOLDER_LOGO; };
      img.style.cssText = [
        'width:100%',
        'height:100%',
        'object-fit:contain',
        `filter:${getFilterCSS(layer.filter)}`,
        'pointer-events:none',
        'display:block'
      ].join(';');
      el.appendChild(img);
    }

    if (isSelected) {
      ['nw', 'ne', 'sw', 'se'].forEach(dir => {
        const h = document.createElement('div');
        h.className = 'wm-handle';
        h.dataset.dir = dir;
        h.style.cssText = [
          'position:absolute',
          'width:10px', 'height:10px',
          'background:#6366f1',
          'border:2px solid white',
          'border-radius:50%',
          `cursor:${dir}-resize`,
          'z-index:10',
          dir.includes('n') ? 'top:-5px' : 'bottom:-5px',
          dir.includes('w') ? 'left:-5px' : 'right:-5px'
        ].join(';');
        h.addEventListener('mousedown', e => startResize(e, layer.id, dir));
        el.appendChild(h);
      });
    }

    el.addEventListener('mousedown', e => {
      if (e.target.classList.contains('wm-handle')) return;
      selectLayer(layer.id);
      startDrag(e, layer.id);
    });

    _canvasEl.appendChild(el);
  });
}

// ============================================================
// DRAG
// ============================================================

function startDrag(e, id) {
  e.preventDefault();
  const canvas = _canvasEl.getBoundingClientRect();
  const layer = wmLayers.find(l => l.id === id);
  if (!layer) return;

  _dragState = { id, startX: e.clientX, startY: e.clientY, origX: layer.x, origY: layer.y };

  const onMove = (ev) => {
    if (!_dragState) return;
    const dx = ((ev.clientX - _dragState.startX) / canvas.width) * 100;
    const dy = ((ev.clientY - _dragState.startY) / canvas.height) * 100;
    const l = wmLayers.find(l => l.id === _dragState.id);
    if (!l) return;
    l.x = Math.max(0, Math.min(100 - l.w, _dragState.origX + dx));
    l.y = Math.max(0, Math.min(100 - l.h, _dragState.origY + dy));
    renderCanvas();
  };

  const onUp = () => {
    _dragState = null;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    scheduleSave();
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ============================================================
// RESIZE
// ============================================================

function startResize(e, id, dir) {
  e.preventDefault();
  e.stopPropagation();
  const canvas = _canvasEl.getBoundingClientRect();
  const layer = wmLayers.find(l => l.id === id);
  if (!layer) return;

  _resizeState = {
    id, dir,
    startX: e.clientX, startY: e.clientY,
    origX: layer.x, origY: layer.y,
    origW: layer.w, origH: layer.h
  };

  const onMove = (ev) => {
    if (!_resizeState) return;
    const dx = ((ev.clientX - _resizeState.startX) / canvas.width) * 100;
    const dy = ((ev.clientY - _resizeState.startY) / canvas.height) * 100;
    const l = wmLayers.find(l => l.id === _resizeState.id);
    if (!l) return;
    const { dir: d, origX, origY, origW, origH } = _resizeState;

    if (d.includes('e')) l.w = Math.max(5, origW + dx);
    if (d.includes('s')) l.h = Math.max(3, origH + dy);
    if (d.includes('w')) { const nw = Math.max(5, origW - dx); l.x = origX + (origW - nw); l.w = nw; }
    if (d.includes('n')) { const nh = Math.max(3, origH - dy); l.y = origY + (origH - nh); l.h = nh; }
    renderCanvas();
  };

  const onUp = () => {
    _resizeState = null;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    scheduleSave();
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ============================================================
// SELEÇÃO
// ============================================================

function selectLayer(id) {
  selectedLayerId = id;
  renderCanvas();
  renderPanel();
  if (_containerRef) renderLayerList(_containerRef);
}

// ============================================================
// PAINEL LATERAL
// ============================================================

function renderPanel() {
  if (!_panelEl) return;
  const layer = wmLayers.find(l => l.id === selectedLayerId);

  if (!layer) {
    _panelEl.innerHTML = `
      <div style="text-align:center; padding:2rem 1rem; color:var(--text-secondary);">
        <div style="font-size:2rem; margin-bottom:0.5rem;">👆</div>
        <p style="font-size:0.8125rem;">Clique numa camada para editar</p>
      </div>`;
    return;
  }

  const fw = layer.fontWeight || 'bold';
  const fi = layer.filter || 'none';

  if (layer.type === 'text') {
    _panelEl.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:0.75rem;padding:0.75rem;">
        <div style="font-size:0.6875rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em;padding-bottom:0.25rem;border-bottom:1px solid var(--border);">✏️ Camada de Texto</div>

        <div>
          <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:0.25rem;">Texto</label>
          <input id="lp-text" type="text" class="input" value="${escapeHtml(layer.text || '')}" style="font-size:0.8125rem;">
        </div>

        <div style="display:grid;grid-template-columns:1fr 80px;gap:0.5rem;">
          <div>
            <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:0.25rem;">Fonte</label>
            <select id="lp-family" class="input" style="font-size:0.75rem;">
              ${FONT_OPTIONS.map(f => `<option value="${f}" ${layer.fontFamily === f ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:0.25rem;">Tamanho</label>
            <input id="lp-size" type="number" class="input" min="8" max="120" value="${layer.fontSize}" style="font-size:0.8125rem;">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:auto 1fr;gap:0.5rem;align-items:center;">
          <div>
            <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:0.25rem;">Cor</label>
            <input id="lp-color" type="color" value="${layer.color || '#ffffff'}" style="width:40px;height:32px;border:1px solid var(--border);border-radius:0.25rem;cursor:pointer;background:none;">
          </div>
          <div>
            <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:0.25rem;">Peso</label>
            <div style="display:flex;gap:0.25rem;">
              ${['light','normal','bold'].map(w => `
                <label style="flex:1;text-align:center;padding:0.3rem 0;border:1px solid var(--border);border-radius:0.25rem;cursor:pointer;font-size:0.6875rem;font-weight:${w==='bold'?'700':w==='light'?'300':'400'};transition:all 0.1s;${fw===w?'background:var(--accent);color:white;border-color:var(--accent);':'color:var(--text-primary);'}">
                  <input type="radio" name="lp-weight" value="${w}" ${fw===w?'checked':''} style="display:none;">${w==='light'?'Thin':w==='bold'?'Bold':'Reg'}
                </label>`).join('')}
            </div>
          </div>
        </div>

        <div style="display:flex;gap:0.5rem;">
          <label style="display:flex;align-items:center;gap:0.25rem;cursor:pointer;font-size:0.75rem;padding:0.25rem 0.625rem;border:1px solid var(--border);border-radius:0.25rem;${layer.fontStyle==='italic'?'background:var(--accent);color:white;border-color:var(--accent);':'color:var(--text-primary);'}">
            <input type="checkbox" id="lp-italic" ${layer.fontStyle==='italic'?'checked':''} style="display:none;"><em>Itálico</em>
          </label>
          <label style="display:flex;align-items:center;gap:0.25rem;cursor:pointer;font-size:0.75rem;padding:0.25rem 0.625rem;border:1px solid var(--border);border-radius:0.25rem;${layer.shadow?'background:var(--accent);color:white;border-color:var(--accent);':'color:var(--text-primary);'}">
            <input type="checkbox" id="lp-shadow" ${layer.shadow?'checked':''} style="display:none;">Sombra
          </label>
        </div>

        <div>
          <div style="display:flex;justify-content:space-between;">
            <label style="font-size:0.75rem;color:var(--text-secondary);">Espaçamento</label>
            <span id="lp-spacing-lbl" style="font-size:0.75rem;color:var(--text-primary);">${layer.letterSpacing}px</span>
          </div>
          <input id="lp-spacing" type="range" min="0" max="20" value="${layer.letterSpacing}" style="width:100%;accent-color:var(--accent);">
        </div>

        ${_commonControls(layer)}
      </div>`;
  } else {
    _panelEl.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:0.75rem;padding:0.75rem;">
        <div style="font-size:0.6875rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em;padding-bottom:0.25rem;border-bottom:1px solid var(--border);">🖼️ Camada de Imagem</div>

        <div style="text-align:center;">
          <img id="lp-img-preview" src="${layer.url || PLACEHOLDER_LOGO}" style="max-height:70px;max-width:100%;object-fit:contain;filter:${getFilterCSS(layer.filter)};border-radius:4px;border:1px solid var(--border);" onerror="this.src='${PLACEHOLDER_LOGO}'">
        </div>

        <label style="background:var(--bg-hover);color:var(--text-primary);padding:0.4rem;border-radius:0.375rem;font-size:0.75rem;font-weight:600;cursor:pointer;text-align:center;display:block;border:1px solid var(--border);">
          Trocar Imagem
          <input type="file" id="lp-img-upload" accept=".jpg,.jpeg,.png,.svg,.webp" style="display:none;">
        </label>

        <div>
          <label style="font-size:0.75rem;color:var(--text-secondary);display:block;margin-bottom:0.375rem;">Filtro</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.25rem;">
            ${[['none','Original','🎨'],['grayscale','P&B','⬛'],['invert','Invertido','🔄'],['white','Branco','⬜']].map(([v,l,icon]) => `
              <label style="text-align:center;padding:0.375rem;border:1px solid var(--border);border-radius:0.25rem;cursor:pointer;font-size:0.6875rem;transition:all 0.1s;${fi===v?'background:var(--accent);color:white;border-color:var(--accent);':'color:var(--text-primary);'}">
                <input type="radio" name="lp-filter" value="${v}" ${fi===v?'checked':''} style="display:none;">${icon} ${l}
              </label>`).join('')}
          </div>
        </div>

        ${_commonControls(layer)}
      </div>`;
  }

  _bindPanelEvents(layer);
}

function _commonControls(layer) {
  return `
    <div>
      <div style="display:flex;justify-content:space-between;">
        <label style="font-size:0.75rem;color:var(--text-secondary);">Opacidade</label>
        <span id="lp-opacity-lbl" style="font-size:0.75rem;color:var(--text-primary);">${Math.round(layer.opacity * 100)}%</span>
      </div>
      <input id="lp-opacity" type="range" min="5" max="100" value="${Math.round(layer.opacity * 100)}" style="width:100%;accent-color:var(--accent);">
    </div>
    <div>
      <div style="display:flex;justify-content:space-between;">
        <label style="font-size:0.75rem;color:var(--text-secondary);">Rotação</label>
        <span id="lp-rot-lbl" style="font-size:0.75rem;color:var(--text-primary);">${layer.rotation}°</span>
      </div>
      <input id="lp-rotation" type="range" min="-180" max="180" value="${layer.rotation}" style="width:100%;accent-color:var(--accent);">
    </div>`;
}

function _bindPanelEvents(layer) {
  const $ = sel => _panelEl.querySelector(sel);
  const update = (key, val) => {
    const l = wmLayers.find(l => l.id === layer.id);
    if (!l) return;
    l[key] = val;
    renderCanvas();
    // o label da lista de camadas exibe o texto — manter em sincronia ao editar
    if (key === 'text' && _containerRef) renderLayerList(_containerRef);
    scheduleSave();
  };
  const toggleLabel = (el, active) => {
    if (!el) return;
    el.style.background = active ? 'var(--accent)' : '';
    el.style.color = active ? 'white' : 'var(--text-primary)';
    el.style.borderColor = active ? 'var(--accent)' : 'var(--border)';
  };

  // Texto
  $('#lp-text')?.addEventListener('input', e => update('text', e.target.value));
  $('#lp-family')?.addEventListener('change', e => update('fontFamily', e.target.value));
  $('#lp-size')?.addEventListener('input', e => update('fontSize', parseInt(e.target.value) || 16));
  $('#lp-color')?.addEventListener('input', e => update('color', e.target.value));

  $('#lp-italic')?.addEventListener('change', e => {
    update('fontStyle', e.target.checked ? 'italic' : 'normal');
    toggleLabel(e.target.closest('label'), e.target.checked);
  });
  $('#lp-shadow')?.addEventListener('change', e => {
    update('shadow', e.target.checked);
    toggleLabel(e.target.closest('label'), e.target.checked);
  });
  $('#lp-spacing')?.addEventListener('input', e => {
    update('letterSpacing', parseFloat(e.target.value));
    const lbl = $('#lp-spacing-lbl');
    if (lbl) lbl.textContent = e.target.value + 'px';
  });

  _panelEl.querySelectorAll('input[name="lp-weight"]').forEach(r => {
    r.addEventListener('change', () => {
      update('fontWeight', r.value);
      _panelEl.querySelectorAll('input[name="lp-weight"]').forEach(rb => {
        toggleLabel(rb.closest('label'), rb.checked);
      });
    });
  });

  _panelEl.querySelectorAll('input[name="lp-filter"]').forEach(r => {
    r.addEventListener('change', () => {
      update('filter', r.value);
      const prev = $('#lp-img-preview');
      if (prev) prev.style.filter = getFilterCSS(r.value);
      _panelEl.querySelectorAll('input[name="lp-filter"]').forEach(rb => {
        toggleLabel(rb.closest('label'), rb.checked);
      });
    });
  });

  $('#lp-img-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      window.showToast?.('Enviando imagem...', 'info');
      const result = await uploadImage(file, appState.authToken);
      update('url', resolveImagePath(result.url));
      const prev = $('#lp-img-preview');
      if (prev) prev.src = resolveImagePath(result.url);
    } catch (err) {
      window.showToast?.('Erro: ' + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  });

  $('#lp-opacity')?.addEventListener('input', e => {
    update('opacity', parseFloat(e.target.value) / 100);
    const lbl = $('#lp-opacity-lbl');
    if (lbl) lbl.textContent = e.target.value + '%';
  });

  $('#lp-rotation')?.addEventListener('input', e => {
    update('rotation', parseFloat(e.target.value));
    const lbl = $('#lp-rot-lbl');
    if (lbl) lbl.textContent = e.target.value + '°';
  });
}

// ============================================================
// LISTA DE CAMADAS
// ============================================================

function renderLayerList(container) {
  const list = container.querySelector('#wmLayerList');
  if (!list) return;

  if (wmLayers.length === 0) {
    list.innerHTML = `<p style="font-size:0.75rem;color:var(--text-secondary);text-align:center;padding:0.5rem;">Nenhuma camada. Clique em + Texto ou + Imagem.</p>`;
    return;
  }

  list.innerHTML = '';
  [...wmLayers].reverse().forEach((layer, revIdx) => {
    const realIdx = wmLayers.length - 1 - revIdx;
    const isSelected = layer.id === selectedLayerId;
    const label = layer.type === 'text'
      ? `✏️ ${(layer.text || 'Texto').slice(0, 26)}`
      : `🖼️ Imagem`;
    const el = document.createElement('div');
    el.dataset.layerId = layer.id;
    el.style.cssText = [
      'display:flex', 'align-items:center', 'justify-content:space-between',
      'padding:0.375rem 0.75rem', 'border-radius:0.375rem',
      `background:${isSelected ? 'var(--accent)' : 'var(--bg-base)'}`,
      `color:${isSelected ? 'white' : 'var(--text-primary)'}`,
      `border:1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
      'cursor:pointer', 'font-size:0.75rem', 'transition:all 0.15s'
    ].join(';');
    el.innerHTML = `<span>${label}</span><span style="opacity:0.5;font-size:0.6875rem;">camada ${realIdx + 1}</span>`;
    el.addEventListener('click', () => selectLayer(layer.id));
    list.appendChild(el);
  });
}

// ============================================================
// AUTO-SAVE
// ============================================================

function scheduleSave() {
  clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(saveLayers, 800);
}

async function saveLayers() {
  try {
    await apiPut('/api/organization/profile', { watermarkLayers: wmLayers });
    organizationData.watermarkLayers = wmLayers;
    window.showToast?.('Marca d\'água salva!', 'success');
  } catch (err) {
    window.showToast?.('Erro ao salvar: ' + err.message, 'error');
  }
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export async function renderPerfil(container) {
  _containerRef = container;
  try {
    const response = await apiGet('/api/organization/profile');
    organizationData = response.data || response;
  } catch (error) {
    container.innerHTML = `<p style="color:var(--red);">Erro ao carregar dados do perfil.</p>`;
    return;
  }

  wmLayers = (organizationData.watermarkLayers && organizationData.watermarkLayers.length > 0)
    ? organizationData.watermarkLayers
    : getDefaultLayers();
  selectedLayerId = null;

  const data = organizationData;

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:2.5rem;">
      <h2 style="font-size:1.5rem;font-weight:bold;color:var(--text-primary);">Perfil e Identidade Visual</h2>

      <!-- DADOS DO ESTÚDIO -->
      <div style="background:var(--bg-surface);padding:1.5rem;border-radius:0.5rem;border:1px solid var(--border);">
        <h3 style="font-size:1.25rem;font-weight:600;color:var(--text-primary);margin-bottom:1rem;">Dados do Negócio</h3>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">
          <div class="input-group" style="margin-bottom:0;"><label>Nome do Negócio</label><input type="text" id="orgName" class="input" value="${escapeHtml(data.name || '')}"></div>
          <div class="input-group" style="margin-bottom:0;"><label>Email de Contato</label><input type="email" id="orgEmail" class="input" value="${escapeHtml(data.email || '')}"></div>
          <div class="input-group" style="margin-bottom:0;"><label>Telefone / WhatsApp</label><input type="text" id="orgWhatsapp" class="input" value="${escapeHtml(data.whatsapp || '')}"></div>
          <div class="input-group" style="margin-bottom:0;"><label>Website</label><input type="text" id="orgWebsite" class="input" value="${escapeHtml(data.website || '')}"></div>
        </div>
      </div>

      <!-- LOGOTIPO -->
      <div style="background:var(--bg-surface);padding:1.5rem;border-radius:0.5rem;border:1px solid var(--border);">
        <h3 style="font-size:1.25rem;font-weight:600;color:var(--text-primary);margin-bottom:1rem;">Logotipo</h3>
        <div style="display:flex;align-items:center;gap:1.5rem;">
          <img id="logoPreview" src="${data.logo ? resolveImagePath(data.logo) : PLACEHOLDER_LOGO}" onerror="this.src='${PLACEHOLDER_LOGO}'" style="height:50px;max-width:150px;background:white;padding:5px;border-radius:4px;object-fit:contain;">
          <div>
            <label style="background:var(--bg-hover);color:var(--text-primary);padding:0.5rem 1rem;border-radius:0.375rem;font-weight:600;cursor:pointer;border:1px solid var(--border);">
              Enviar Logo <input type="file" id="logoUpload" accept=".jpg,.jpeg,.png,.svg,.webp" style="display:none;">
            </label>
            <div id="logoUploadProgress" style="margin-top:0.5rem;"></div>
          </div>
        </div>
      </div>

      <!-- EDITOR DE CAMADAS -->
      <div style="background:var(--bg-surface);padding:1.5rem;border-radius:0.5rem;border:1px solid var(--border);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <h3 style="font-size:1.25rem;font-weight:600;color:var(--text-primary);margin:0 0 0.2rem;">Marca D'água</h3>
            <p style="font-size:0.75rem;color:var(--text-secondary);margin:0;">Arraste para posicionar · Handles para redimensionar · Clique para editar</p>
          </div>
          <div style="display:flex;gap:0.375rem;flex-wrap:wrap;align-items:center;">
            <button id="wmAddText" style="background:var(--accent);color:white;border:none;padding:0.375rem 0.875rem;border-radius:0.375rem;font-size:0.8125rem;font-weight:600;cursor:pointer;">+ Texto</button>
            <button id="wmAddImage" style="background:var(--bg-hover);color:var(--text-primary);border:1px solid var(--border);padding:0.375rem 0.875rem;border-radius:0.375rem;font-size:0.8125rem;cursor:pointer;">+ Imagem</button>
            <span style="width:1px;height:20px;background:var(--border);"></span>
            <button id="wmDuplicate" title="Duplicar camada" style="background:transparent;color:var(--text-primary);border:1px solid var(--border);padding:0.375rem 0.625rem;border-radius:0.375rem;font-size:0.875rem;cursor:pointer;">⧉</button>
            <button id="wmMoveUp" title="Mover para frente" style="background:transparent;color:var(--text-primary);border:1px solid var(--border);padding:0.375rem 0.625rem;border-radius:0.375rem;font-size:0.875rem;cursor:pointer;">↑</button>
            <button id="wmMoveDown" title="Mover para trás" style="background:transparent;color:var(--text-primary);border:1px solid var(--border);padding:0.375rem 0.625rem;border-radius:0.375rem;font-size:0.875rem;cursor:pointer;">↓</button>
            <button id="wmDelete" title="Deletar camada" style="background:transparent;color:var(--red);border:1px solid var(--red);padding:0.375rem 0.625rem;border-radius:0.375rem;font-size:0.875rem;cursor:pointer;">🗑</button>
            <button id="wmReset" title="Restaurar padrão" style="background:transparent;color:var(--text-secondary);border:1px solid var(--border);padding:0.375rem 0.625rem;border-radius:0.375rem;font-size:0.75rem;cursor:pointer;">↺ Padrão</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 260px;gap:1.25rem;align-items:start;">
          <!-- Canvas -->
          <div>
            <div style="display:flex;gap:0.375rem;margin-bottom:0.5rem;align-items:center;">
              <span style="font-size:0.6875rem;color:var(--text-secondary);">Fundo:</span>
              <button class="wm-bg-btn" data-bg="dark" style="width:20px;height:20px;border-radius:3px;border:2px solid var(--accent);cursor:pointer;background:#1a1a2e;" title="Escuro"></button>
              <button class="wm-bg-btn" data-bg="light" style="width:20px;height:20px;border-radius:3px;border:2px solid transparent;cursor:pointer;background:#c0c0c0;" title="Claro"></button>
              <button class="wm-bg-btn" data-bg="photo" style="width:20px;height:20px;border-radius:3px;border:2px solid transparent;cursor:pointer;background:linear-gradient(135deg,#667eea,#764ba2);" title="Colorido"></button>
            </div>
            <div id="wmCanvas" style="position:relative;width:100%;aspect-ratio:4/3;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border-radius:0.5rem;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.3);"></div>
            <div id="wmLayerList" style="margin-top:0.625rem;display:flex;flex-direction:column;gap:0.25rem;"></div>
          </div>

          <!-- Painel -->
          <div id="wmPanel" style="background:var(--bg-base);border:1px solid var(--border);border-radius:0.5rem;min-height:320px;overflow-y:auto;max-height:520px;"></div>
        </div>
      </div>

      <!-- SALVAR PERFIL -->
      <div style="display:flex;justify-content:flex-end;">
        <button id="saveProfileBtn" style="background:var(--accent);color:white;padding:0.75rem 2rem;border-radius:0.375rem;border:none;font-weight:600;cursor:pointer;">Salvar Perfil</button>
      </div>
    </div>
  `;

  _canvasEl = container.querySelector('#wmCanvas');
  _panelEl = container.querySelector('#wmPanel');

  renderCanvas();
  renderPanel();
  renderLayerList(container);

  // ---- EVENTOS ----

  // Logo upload
  container.querySelector('#logoUpload').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, appState.authToken, (pct) => showUploadProgress('logoUploadProgress', pct));
      organizationData.logo = result.url;
      container.querySelector('#logoPreview').src = resolveImagePath(result.url);
    } catch (err) {
      window.showToast?.('Erro: ' + err.message, 'error');
    } finally {
      e.target.value = '';
      showUploadProgress('logoUploadProgress', 0);
    }
  };

  // Background switcher
  container.querySelectorAll('.wm-bg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bgs = {
        dark: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)',
        light: 'linear-gradient(135deg,#c8c8c8 0%,#a0a0a0 100%)',
        photo: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)'
      };
      _canvasEl.style.background = bgs[btn.dataset.bg] || bgs.dark;
      container.querySelectorAll('.wm-bg-btn').forEach(b => {
        b.style.borderColor = b === btn ? 'var(--accent)' : 'transparent';
      });
    });
  });

  // + Texto
  container.querySelector('#wmAddText').addEventListener('click', () => {
    const layer = {
      id: genId(), type: 'text',
      x: 15, y: 40, w: 70, h: 15,
      opacity: 0.35, rotation: 0,
      text: 'Novo texto', fontSize: 22, fontFamily: 'Arial',
      fontWeight: 'bold', fontStyle: 'normal', color: '#ffffff',
      letterSpacing: 0, shadow: true
    };
    wmLayers.push(layer);
    selectLayer(layer.id);
    scheduleSave();
  });

  // + Imagem
  const imgInput = document.createElement('input');
  imgInput.type = 'file';
  imgInput.accept = '.jpg,.jpeg,.png,.svg,.webp';
  imgInput.style.display = 'none';
  document.body.appendChild(imgInput);

  container.querySelector('#wmAddImage').addEventListener('click', () => imgInput.click());
  imgInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      window.showToast?.('Enviando...', 'info');
      const result = await uploadImage(file, appState.authToken);
      const layer = {
        id: genId(), type: 'image',
        x: 5, y: 5, w: 25, h: 20,
        opacity: 0.5, rotation: 0,
        url: resolveImagePath(result.url), filter: 'none'
      };
      wmLayers.push(layer);
      selectLayer(layer.id);
      scheduleSave();
    } catch (err) {
      window.showToast?.('Erro: ' + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  });

  // Duplicar
  container.querySelector('#wmDuplicate').addEventListener('click', () => {
    if (!selectedLayerId) { window.showToast?.('Selecione uma camada', 'warning'); return; }
    const orig = wmLayers.find(l => l.id === selectedLayerId);
    if (!orig) return;
    const clone = { ...orig, id: genId(), x: orig.x + 3, y: orig.y + 3 };
    wmLayers.push(clone);
    selectLayer(clone.id);
    scheduleSave();
  });

  // Mover frente
  container.querySelector('#wmMoveUp').addEventListener('click', () => {
    if (!selectedLayerId) return;
    const idx = wmLayers.findIndex(l => l.id === selectedLayerId);
    if (idx < wmLayers.length - 1) {
      [wmLayers[idx], wmLayers[idx + 1]] = [wmLayers[idx + 1], wmLayers[idx]];
      renderCanvas(); renderLayerList(container); scheduleSave();
    }
  });

  // Mover trás
  container.querySelector('#wmMoveDown').addEventListener('click', () => {
    if (!selectedLayerId) return;
    const idx = wmLayers.findIndex(l => l.id === selectedLayerId);
    if (idx > 0) {
      [wmLayers[idx], wmLayers[idx - 1]] = [wmLayers[idx - 1], wmLayers[idx]];
      renderCanvas(); renderLayerList(container); scheduleSave();
    }
  });

  // Deletar
  container.querySelector('#wmDelete').addEventListener('click', () => {
    if (!selectedLayerId) { window.showToast?.('Selecione uma camada', 'warning'); return; }
    wmLayers = wmLayers.filter(l => l.id !== selectedLayerId);
    selectedLayerId = null;
    renderCanvas(); renderPanel(); renderLayerList(container); scheduleSave();
  });

  // Reset padrão
  container.querySelector('#wmReset').addEventListener('click', async () => {
    const ok = await window.showConfirm?.('Restaurar o template padrão? As camadas atuais serão perdidas.', { confirmText: 'Restaurar' });
    if (!ok) return;
    wmLayers = getDefaultLayers();
    selectedLayerId = null;
    renderCanvas(); renderPanel(); renderLayerList(container); scheduleSave();
  });

  // Deselect ao clicar fundo do canvas
  _canvasEl.addEventListener('mousedown', e => {
    if (e.target === _canvasEl) {
      selectedLayerId = null;
      renderCanvas(); renderPanel();
    }
  });

  // Salvar perfil (dados do estúdio)
  container.querySelector('#saveProfileBtn').onclick = async (e) => {
    const btn = e.target;
    btn.textContent = 'Salvando...'; btn.disabled = true;
    const name = container.querySelector('#orgName').value.trim();
    if (!name) {
      window.showToast?.('O nome do negócio é obrigatório.', 'warning');
      btn.textContent = 'Salvar Perfil'; btn.disabled = false; return;
    }
    try {
      await apiPut('/api/organization/profile', {
        name,
        email: container.querySelector('#orgEmail').value,
        whatsapp: container.querySelector('#orgWhatsapp').value,
        website: container.querySelector('#orgWebsite').value,
        logo: organizationData.logo,
        watermarkLayers: wmLayers
      });
      Object.assign(organizationData, { name });
      window.showToast?.('Perfil salvo!', 'success');
    } catch (err) {
      window.showToast?.('Erro: ' + err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Salvar Perfil';
    }
  };
}
