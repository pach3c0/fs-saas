/**
 * Tab: Sobre — Edição direta no preview real do site
 * Substitui o Canvas Editor isolado por controles na barra lateral
 * que refletem instantaneamente no iframe do site.
 */

import { appState } from '../state.js';
import { resolveImagePath } from '../utils/helpers.js';
import { uploadImage } from '../utils/upload.js';
import { apiPut } from '../utils/api.js';
import { addInlineToolbar, createRichEditor } from '../utils/richtext.js';

let _sobreSidebarContainer = null;
let _sobreSelectedLayerId = null;

/**
 * Renderiza a interface do módulo Sobre na barra lateral.
 * Diferente da versão anterior, não oculta o iframe e não cria canvas próprio.
 */
export function renderSobre(container) {
  _sobreSidebarContainer = container;
  const siteContent = appState.configData?.siteContent || {};
  
  if (!siteContent.sobre) siteContent.sobre = {};
  const sobreData = siteContent.sobre;

  // Garantir que canvasLayers existe
  if (!sobreData.canvasLayers) sobreData.canvasLayers = [];
  
  _renderSobreSidebar(container);
}

function _renderSobreSidebar(container) {
  const siteContent = appState.configData?.siteContent || {};
  const sobreData = siteContent.sobre || {};
  const layers = sobreData.canvasLayers || [];

  container.innerHTML = `
    <style>
      #config-sobre { display:flex; flex-direction:column; height:100%; overflow:hidden; }
      .sc-sidebar { display:flex; flex-direction:column; flex:1; min-height:0; overflow-y:auto; }
      .sc-sidebar::-webkit-scrollbar { width:4px; }
      .sc-sidebar::-webkit-scrollbar-thumb { background:#374151; border-radius:2px; }
      .sc-section { border-bottom:1px solid #1f2937; }
      .sc-section-head { padding:0.6rem 0.75rem; font-size:0.7rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; display:flex; align-items:center; justify-content:center; text-align:center; }
      .sc-row { padding:0.4rem 0.75rem; display:flex; flex-direction:column; gap:0.2rem; }
      .sc-label { font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; text-align:center; display:block; width:100%; }
      .sc-input { width:100%; padding:0.35rem 0.5rem; background:#1f2937; border:1px solid #374151; border-radius:0.375rem; color:#f3f4f6; font-size:0.78rem; outline:none; box-sizing:border-box; }
      .sc-input:focus { border-color:#3b82f6; }
      .sc-textarea { width:100%; padding:0.35rem 0.5rem; background:#1f2937; border:1px solid #374151; border-radius:0.375rem; color:#f3f4f6; font-size:0.78rem; outline:none; box-sizing:border-box; resize:vertical; min-height:80px; }
      .sc-range-row { display:flex; align-items:center; justify-content:center; gap:0.4rem; width:100%; }
      .sc-range { flex:1; accent-color:#3b82f6; }
      .sc-range-val { font-size:0.65rem; font-family:monospace; color:#9ca3af; min-width:2.2rem; text-align:right; }
      .sc-btn { padding:0.4rem 0.6rem; border-radius:0.375rem; border:1px solid #374151; background:#1f2937; color:#d1d5db; font-size:0.75rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.3rem; }
      .sc-btn:hover { background:#374151; color:#fff; }
      .sc-btn.primary { background:#1d4ed8; border-color:#1d4ed8; color:#fff; }
      .sc-btn.success { background:#16a34a; border-color:#16a34a; color:#fff; font-weight:700; }
      .sc-layer-item { margin:0 0.5rem 0.35rem; padding:0.625rem 0.875rem; background:transparent; border:1px solid var(--border); border-radius:0.5rem; display:flex; align-items:center; gap:0.625rem; cursor:pointer; opacity:0.55; transition:all 0.15s; user-select:none; min-width:0; overflow:hidden; }
      .sc-layer-item:hover { background:var(--bg-hover); opacity:0.8; }
      .sc-layer-item.active { border-color:var(--accent); background:var(--bg-elevated); opacity:1; }
      .sc-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:0.35rem; }
    </style>

    <div class="sc-sidebar">
      <div class="sc-section">
        <div class="sc-section-head">Conteúdo</div>
        <div class="sc-row">
          <span class="sc-label">Título</span>
          <div id="scTitleWrap"></div>
          <input type="text" class="sc-input" id="scTitle" value="${(sobreData.title || '').replace(/"/g, '&quot;')}" style="display:none;">
        </div>
        <div class="sc-row">
          <span class="sc-label">Texto / Bio</span>
          <div id="scTextWrap"></div>
          <textarea class="sc-textarea" id="scText" style="display:none;">${sobreData.text || ''}</textarea>
        </div>
      </div>

      <div class="sc-section">
        <div class="sc-section-head">Foto</div>
        <div style="padding:0.4rem 0.75rem; display:flex; justify-content:center;" id="scAddPhotoWrapper">
          <label class="header-expand-btn" style="cursor:pointer;" title="Adicionar Foto">
            <span class="header-expand-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-camera">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                <circle cx="12" cy="13" r="3"></circle>
              </svg>
            </span>
            <span class="header-expand-label" style="font-weight: 600;">Adicionar Foto</span>
            <input type="file" accept=".jpg,.jpeg,.png" id="scAddPhoto" style="display:none;">
          </label>
        </div>
      </div>

      <div id="sc-layer-props" class="sc-section" style="display:none;">
        <div class="sc-section-head">Ajustes da Foto</div>
        <div id="sc-layer-props-content"></div>
      </div>

      <!-- CAMADAS -->
      <div class="sc-section">
        <div class="sc-section-head">Camadas</div>
        <div id="sc-layer-list"></div>
      </div>
    </div>
  `;

  // Bind events
  const liveNotify = () => window._meuSitePostPreview?.();

  // Função central para Auto-Salvar
  const saveSobreData = async () => {
    try {
      const indicator = document.getElementById('builder-save-indicator');
      if (indicator) {
        indicator.textContent = 'Salvando...';
        indicator.style.opacity = '1';
      }
      const title = titleRte.getValue();
      const text = textRte.getValue();
      const updatedSobre = {
        ...sobreData,
        title,
        text,
        canvasLayers: layers,
        image: layers[0]?.url || ''
      };
      await apiPut('/api/site/admin/config', {
        siteContent: {
          ...siteContent,
          sobre: updatedSobre
        }
      });
      appState.configData.siteContent.sobre = updatedSobre;
      if (indicator) {
        indicator.textContent = 'Salvo!';
        setTimeout(() => {
          indicator.style.opacity = '0';
        }, 1500);
      }
      liveNotify();
    } catch (err) {
      console.error('Erro ao salvar Sobre auto-save:', err);
      const indicator = document.getElementById('builder-save-indicator');
      if (indicator) {
        indicator.textContent = 'Erro ao salvar!';
        indicator.style.color = 'var(--red,#f85149)';
      }
    }
  };

  // ── Rich text editor para Título ──
  const titleInput = container.querySelector('#scTitle');
  const titleRte = addInlineToolbar(
    titleInput,
    async (html) => { sobreData.title = html; liveNotify(); await saveSobreData(); },
    { placeholder: 'Título da seção Sobre', features: ['bold', 'italic', 'emoji'] }
  );
  titleRte.setValue(sobreData.title || '');

  // ── Rich text editor para Texto/Bio ──
  const textWrap = container.querySelector('#scTextWrap');
  const textRte = createRichEditor(
    textWrap,
    sobreData.text || '',
    async (html) => { sobreData.text = html; liveNotify(); await saveSobreData(); },
    {
      placeholder: 'Conte sua história como fotógrafo...',
      minHeight: 120,
      features: ['bold', 'italic', 'underline', 'br', 'list', 'emoji', 'clear'],
    }
  );

  container.querySelector('#scAddPhoto').onchange = async (e) => {
    if (layers.length >= 4) {
      window.showToast?.('Limite máximo de 4 fotos atingido.', 'warning');
      e.target.value = '';
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, appState.authToken);
      const newLayer = {
        id: 'sb_' + Date.now(),
        type: 'image',
        url: result.url,
        name: `Foto ${layers.length + 1}`,
        x: 50, y: 50, width: 70, height: 70, rotation: 0, opacity: 100, borderRadius: 0, shadow: false, shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)', flipH: false, flipV: false, presets: {}
      };
      layers.push(newLayer);
      _sobreSelectedLayerId = newLayer.id;
      _renderLayerList();
      _renderPropsForLayer(newLayer);
      await saveSobreData();
      e.target.value = '';
    } catch (err) { window.showToast?.('Erro no upload', 'error'); }
  };

  const _renderLayerList = () => {
    const list = container.querySelector('#sc-layer-list');
    const addPhotoWrap = container.querySelector('#scAddPhotoWrapper');
    if (addPhotoWrap) {
      addPhotoWrap.style.display = layers.length >= 4 ? 'none' : 'flex';
    }
    
    if (!layers.length) {
      list.innerHTML = '<p style="padding:0.75rem; color:#4b5563; font-size:0.7rem; text-align:center;">Nenhuma foto adicionada</p>';
      return;
    }
    list.innerHTML = [...layers].reverse().map((l, idx) => `
      <div class="sc-layer-item ${l.id === _sobreSelectedLayerId ? 'active' : ''}" data-id="${l.id}" data-idx="${idx}" draggable="true">
        <span style="cursor:grab; color:#4b5563; font-size:1rem; flex-shrink:0;" class="layer-drag">⠿</span>
        <span style="flex:1; min-width:0; color:${l.id === _sobreSelectedLayerId ? 'var(--text-primary)' : 'var(--text-secondary)'}; font-weight:500; font-size:0.8125rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${l.name}</span>
        <div style="display:flex; gap:0.25rem; flex-shrink:0; align-items:center;">
          <button onclick="event.stopPropagation(); moveSobreLayer(${idx}, -1)" class="header-expand-btn" style="width:24px !important; min-width:24px !important; height:24px !important; border-radius:50% !important; display:inline-flex !important; align-items:center; justify-content:center; padding:0 !important; cursor:pointer; background:var(--bg-elevated); border:1px solid var(--border);" ${idx === 0 ? 'disabled style="opacity:0.2; cursor:not-allowed;"' : ''}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          </button>
          <button onclick="event.stopPropagation(); moveSobreLayer(${idx}, 1)" class="header-expand-btn" style="width:24px !important; min-width:24px !important; height:24px !important; border-radius:50% !important; display:inline-flex !important; align-items:center; justify-content:center; padding:0 !important; cursor:pointer; background:var(--bg-elevated); border:1px solid var(--border);" ${idx === layers.length - 1 ? 'disabled style="opacity:0.2; cursor:not-allowed;"' : ''}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <button onclick="event.stopPropagation(); removeSobreLayer('${l.id}')" class="header-expand-btn" style="width:24px !important; min-width:24px !important; height:24px !important; border-radius:50% !important; display:inline-flex !important; align-items:center; justify-content:center; padding:0 !important; cursor:pointer; background:var(--bg-elevated); border:1px solid var(--border); color:var(--red,#f85149);" title="Remover Foto">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    let dragLayerIdx = null;
    list.querySelectorAll('.sc-layer-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        dragLayerIdx = parseInt(item.dataset.idx);
        item.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', () => { 
        item.style.opacity = '1'; 
        list.querySelectorAll('.sc-layer-item').forEach(i => i.style.borderTop = ''); 
      });
      item.addEventListener('dragover', (e) => { 
        e.preventDefault(); 
        item.style.borderTop = '2px solid #3b82f6'; 
      });
      item.addEventListener('dragleave', () => { 
        item.style.borderTop = ''; 
      });
      item.addEventListener('drop', async (e) => {
        e.preventDefault();
        item.style.borderTop = '';
        const targetIdx = parseInt(item.dataset.idx);
        if (dragLayerIdx === null || dragLayerIdx === targetIdx) return;
        
        const realLen = layers.length;
        const realDrag = realLen - 1 - dragLayerIdx;
        const realTarget = realLen - 1 - targetIdx;
        
        const moved = layers.splice(realDrag, 1)[0];
        layers.splice(realTarget, 0, moved);
        
        dragLayerIdx = null;
        _renderLayerList();
        await saveSobreData();
      });

      item.onclick = async (e) => {
        const id = item.dataset.id;
        if (e.target.closest('button') || e.target.closest('.layer-drag')) return;
        
        _sobreSelectedLayerId = id;
        _renderLayerList();
        _renderPropsForLayer(layers.find(l => l.id === _sobreSelectedLayerId));
        
        const iframe = document.getElementById('builder-iframe');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'cz_highlight_layer', layerId: id }, window.location.origin);
        }
      };
    });

    window.moveSobreLayer = async (idx, dir) => {
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= layers.length) return;
      
      const realLen = layers.length;
      const realIdx = realLen - 1 - idx;
      const realNewIdx = realLen - 1 - newIdx;
      
      [layers[realIdx], layers[realNewIdx]] = [layers[realNewIdx], layers[realIdx]];
      _renderLayerList();
      if (_sobreSelectedLayerId) {
        _renderPropsForLayer(layers.find(l => l.id === _sobreSelectedLayerId));
      }
      await saveSobreData();
    };

    window.removeSobreLayer = async (id) => {
      const ok = await window.showConfirm?.('Remover esta foto?', { confirmText: 'Remover', danger: true });
      if (!ok) return;
      const idx = layers.findIndex(l => l.id === id);
      if (idx !== -1) layers.splice(idx, 1);
      if (_sobreSelectedLayerId === id) _sobreSelectedLayerId = null;
      _renderLayerList(); _renderPropsForLayer(null);
      await saveSobreData();
    };
  };

  const _renderPropsForLayer = (l) => {
    const props = container.querySelector('#sc-layer-props');
    const content = container.querySelector('#sc-layer-props-content');
    if (!l) { props.style.display = 'none'; return; }
    props.style.display = 'block';

    content.innerHTML = `
      <div class="sc-grid2">
        <div class="sc-row">
          <span class="sc-label">Pos X (%)</span>
          <div class="sc-range-row">
            <input type="range" class="sc-range" id="lpX" min="0" max="100" value="${l.x ?? 50}">
            <span class="sc-range-val" id="lpXVal">${l.x ?? 50}%</span>
          </div>
        </div>
        <div class="sc-row">
          <span class="sc-label">Pos Y (%)</span>
          <div class="sc-range-row">
            <input type="range" class="sc-range" id="lpY" min="0" max="100" value="${l.y ?? 50}">
            <span class="sc-range-val" id="lpYVal">${l.y ?? 50}%</span>
          </div>
        </div>
      </div>
      <div class="sc-row">
        <span class="sc-label">Escala / Zoom (%)</span>
        <div class="sc-range-row">
          <input type="range" class="sc-range" id="lpScale" min="10" max="300" value="${l.scale ?? 100}">
          <span class="sc-range-val" id="lpScaleVal">${l.scale ?? 100}%</span>
        </div>
      </div>
      <div class="sc-grid2">
        <div class="sc-row">
          <span class="sc-label">Largura (%)</span>
          <div class="sc-range-row">
            <input type="range" class="sc-range" id="lpW" min="5" max="150" value="${l.width ?? 70}">
            <span class="sc-range-val" id="lpWVal">${l.width ?? 70}%</span>
          </div>
        </div>
        <div class="sc-row">
          <span class="sc-label">Altura (%)</span>
          <div class="sc-range-row">
            <input type="range" class="sc-range" id="lpH" min="5" max="150" value="${l.height ?? 70}">
            <span class="sc-range-val" id="lpHVal">${l.height ?? 70}%</span>
          </div>
        </div>
      </div>
      <div class="sc-row">
        <span class="sc-label">Rotação</span>
        <div class="sc-range-row">
          <input type="range" class="sc-range" id="lpRot" min="-180" max="180" value="${l.rotation ?? 0}">
          <span class="sc-range-val" id="lpRotVal">${l.rotation ?? 0}°</span>
        </div>
      </div>
      <div class="sc-row">
        <span class="sc-label">Opacidade</span>
        <div class="sc-range-row">
          <input type="range" class="sc-range" id="lpOp" min="0" max="100" value="${l.opacity ?? 100}">
          <span class="sc-range-val" id="lpOpVal">${l.opacity ?? 100}%</span>
        </div>
      </div>
      <div class="sc-row">
        <span class="sc-label">Bordas</span>
        <div class="sc-range-row">
          <input type="range" class="sc-range" id="lpRad" min="0" max="200" value="${l.borderRadius ?? 0}">
          <span class="sc-range-val" id="lpRadVal">${l.borderRadius ?? 0}px</span>
        </div>
      </div>
      <div class="sc-row" style="align-items:center;">
        <label style="display:inline-flex; align-items:center; justify-content:center; gap:0.5rem; cursor:pointer; padding:0.2rem 0; margin:0 auto;">
          <input type="checkbox" id="lpShadow" ${l.shadow ? 'checked' : ''}>
          <span class="sc-label" style="margin:0; text-align:left; width:auto;">Ativar Sombra</span>
        </label>
      </div>
      <div class="sc-row" id="lpShadowBlurRow" style="display:${l.shadow ? 'block' : 'none'}">
        <span class="sc-label">Intensidade Sombra</span>
        <div class="sc-range-row">
          <input type="range" class="sc-range" id="lpShadowBlur" min="0" max="60" value="${l.shadowBlur ?? 10}">
          <span class="sc-range-val" id="lpShadowBlurVal">${l.shadowBlur ?? 10}px</span>
        </div>
      </div>
      <div style="display:flex; justify-content:center; gap:0.5rem; padding:0.4rem 0.75rem;">
        <button class="sc-btn ${l.flipH ? 'primary' : ''}" id="lpFlipH" style="flex:1; max-width:80px;">↔ H</button>
        <button class="sc-btn ${l.flipV ? 'primary' : ''}" id="lpFlipV" style="flex:1; max-width:80px;">↕ V</button>
      </div>
    `;

    const update = async (field, val) => {
      l[field] = val;
      const label = content.querySelector(`#lp${field.charAt(0).toUpperCase() + field.slice(1)}Val`);
      if (label) {
        const suffix = field === 'rotation' ? '°' : (field === 'borderRadius' || field === 'shadowBlur' ? 'px' : '%');
        label.textContent = val + suffix;
      }
      liveNotify();
      await saveSobreData();
    };

    content.querySelector('#lpX').oninput = (e) => update('x', parseInt(e.target.value));
    content.querySelector('#lpY').oninput = (e) => update('y', parseInt(e.target.value));
    content.querySelector('#lpScale').oninput = (e) => update('scale', parseInt(e.target.value));
    content.querySelector('#lpW').oninput = (e) => update('width', parseInt(e.target.value));
    content.querySelector('#lpH').oninput = (e) => update('height', parseInt(e.target.value));
    content.querySelector('#lpRot').oninput = (e) => update('rotation', parseInt(e.target.value));
    content.querySelector('#lpOp').oninput = (e) => update('opacity', parseInt(e.target.value));
    content.querySelector('#lpRad').oninput = (e) => update('borderRadius', parseInt(e.target.value));
    content.querySelector('#lpShadow').onchange = async (e) => {
      l.shadow = e.target.checked;
      content.querySelector('#lpShadowBlurRow').style.display = e.target.checked ? 'block' : 'none';
      liveNotify();
      await saveSobreData();
    };
    content.querySelector('#lpShadowBlur').oninput = (e) => update('shadowBlur', parseInt(e.target.value));
    content.querySelector('#lpFlipH').onclick = async () => { l.flipH = !l.flipH; _renderPropsForLayer(l); liveNotify(); await saveSobreData(); };
    content.querySelector('#lpFlipV').onclick = async () => { l.flipV = !l.flipV; _renderPropsForLayer(l); liveNotify(); await saveSobreData(); };
  };

  _renderLayerList();
  if (_sobreSelectedLayerId) {
    const l = layers.find(l => l.id === _sobreSelectedLayerId);
    if (l) _renderPropsForLayer(l);
  }
}

/**
 * Retorna dados atuais para preview (chamado por meu-site.js postPreviewData)
 */
export function getSobreCanvasState() {
  const siteContent = appState.configData?.siteContent || {};
  const sobreData = siteContent.sobre || {};
  const layers = sobreData.canvasLayers || [];
  const imgLayer = layers.find(l => l.type === 'image' && l.url);
  return { layers, image: imgLayer?.url || '' };
}

/**
 * Limpeza ao sair da aba.
 */
export function destroySobreCanvas() {
  _sobreSelectedLayerId = null;
  _sobreSidebarContainer = null;
}
