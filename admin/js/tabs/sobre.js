/**
 * Tab: Sobre — Edição direta no preview real do site
 * Substitui o Canvas Editor isolado por controles na barra lateral
 * que refletem instantaneamente no iframe do site.
 */

import { appState } from '../state.js';
import { resolveImagePath } from '../utils/helpers.js';
import { uploadImage } from '../utils/upload.js';
import { apiPut } from '../utils/api.js';

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
      .sc-section-head { padding:0.6rem 0.75rem; font-size:0.7rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; display:flex; align-items:center; justify-content:space-between; }
      .sc-row { padding:0.4rem 0.75rem; display:flex; flex-direction:column; gap:0.2rem; }
      .sc-label { font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }
      .sc-input { width:100%; padding:0.35rem 0.5rem; background:#1f2937; border:1px solid #374151; border-radius:0.375rem; color:#f3f4f6; font-size:0.78rem; outline:none; box-sizing:border-box; }
      .sc-input:focus { border-color:#3b82f6; }
      .sc-textarea { width:100%; padding:0.35rem 0.5rem; background:#1f2937; border:1px solid #374151; border-radius:0.375rem; color:#f3f4f6; font-size:0.78rem; outline:none; box-sizing:border-box; resize:vertical; min-height:80px; }
      .sc-range-row { display:flex; align-items:center; gap:0.4rem; }
      .sc-range { flex:1; accent-color:#3b82f6; }
      .sc-range-val { font-size:0.65rem; font-family:monospace; color:#9ca3af; min-width:2.2rem; text-align:right; }
      .sc-btn { padding:0.4rem 0.6rem; border-radius:0.375rem; border:1px solid #374151; background:#1f2937; color:#d1d5db; font-size:0.75rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.3rem; }
      .sc-btn:hover { background:#374151; color:#fff; }
      .sc-btn.primary { background:#1d4ed8; border-color:#1d4ed8; color:#fff; }
      .sc-btn.success { background:#16a34a; border-color:#16a34a; color:#fff; font-weight:700; }
      .sc-layer-item { margin:0 0.5rem 0.35rem; padding:0.4rem 0.6rem; background:#1f2937; border:1px solid #374151; border-radius:0.375rem; display:flex; align-items:center; gap:0.4rem; cursor:pointer; font-size:0.75rem; color:#d1d5db; }
      .sc-layer-item:hover { background:#2d3748; }
      .sc-layer-item.active { border-color:#3b82f6; background:#172554; }
      .sc-layer-item .layer-del { color:#ef4444; margin-left:auto; opacity:0.6; font-size:0.85rem; }
      .sc-layer-item .layer-del:hover { opacity:1; }
      .sc-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:0.35rem; }
    </style>

    <div class="sc-sidebar">
      <!-- CONTEÚDO -->
      <div class="sc-section">
        <div class="sc-section-head">✏️ Conteúdo</div>
        <div class="sc-row">
          <span class="sc-label">Título</span>
          <input type="text" class="sc-input" id="scTitle" value="${(sobreData.title || '').replace(/"/g, '&quot;')}">
        </div>
        <div class="sc-row">
          <span class="sc-label">Texto / Bio</span>
          <textarea class="sc-textarea" id="scText">${sobreData.text || ''}</textarea>
        </div>
      </div>

      <!-- ADICIONAR FOTO -->
      <div class="sc-section">
        <div class="sc-section-head">🖼 Foto</div>
        <div style="padding:0.4rem 0.75rem;">
          <label class="sc-btn primary" style="width:100%; cursor:pointer;">
            📷 Adicionar Foto
            <input type="file" accept=".jpg,.jpeg,.png" id="scAddPhoto" style="display:none;">
          </label>
        </div>
      </div>

      <!-- PROPRIEDADES DA FOTO -->
      <div id="sc-layer-props" class="sc-section" style="display:none;">
        <div class="sc-section-head">⚙️ Ajustes da Foto</div>
        <div id="sc-layer-props-content"></div>
      </div>

      <!-- CAMADAS -->
      <div class="sc-section">
        <div class="sc-section-head">Camadas</div>
        <div id="sc-layer-list"></div>
      </div>

      <!-- SALVAR -->
      <div style="padding:1rem 0.75rem; margin-top:auto;">
        <button class="sc-btn success" id="scSaveBtn" style="width:100%; padding:0.75rem;">Salvar Sobre</button>
      </div>
    </div>
  `;

  // Bind events
  const liveNotify = () => window._meuSitePostPreview?.();

  container.querySelector('#scTitle').oninput = (e) => { sobreData.title = e.target.value; liveNotify(); };
  container.querySelector('#scText').oninput = (e) => { sobreData.text = e.target.value; liveNotify(); };

  container.querySelector('#scAddPhoto').onchange = async (e) => {
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
      liveNotify();
      e.target.value = '';
    } catch (err) { window.showToast?.('Erro no upload', 'error'); }
  };

  container.querySelector('#scSaveBtn').onclick = async (e) => {
    const btn = e.currentTarget;
    const oldText = btn.textContent;
    btn.disabled = true; btn.textContent = 'Salvando...';
    try {
      const title = container.querySelector('#scTitle').value;
      const text = container.querySelector('#scText').value;
      await apiPut('/api/site/admin/config', {
        siteContent: {
          ...siteContent,
          sobre: { ...sobreData, title, text, canvasLayers: layers, image: layers[0]?.url || '' }
        }
      });
      // Atualizar estado global
      appState.configData.siteContent.sobre = { ...sobreData, title, text, canvasLayers: layers, image: layers[0]?.url || '' };
      window.showToast?.('Sobre salvo!', 'success');
      liveNotify();
    } catch (err) { window.showToast?.('Erro ao salvar', 'error'); }
    finally { btn.disabled = false; btn.textContent = oldText; }
  };

  const _renderLayerList = () => {
    const list = container.querySelector('#sc-layer-list');
    if (!layers.length) {
      list.innerHTML = '<p style="padding:0.75rem; color:#4b5563; font-size:0.7rem; text-align:center;">Nenhuma foto adicionada</p>';
      return;
    }
    list.innerHTML = [...layers].reverse().map(l => `
      <div class="sc-layer-item ${l.id === _sobreSelectedLayerId ? 'active' : ''}" data-id="${l.id}">
        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.name}</span>
        <span class="layer-del" data-del="${l.id}">✕</span>
      </div>
    `).join('');

    list.querySelectorAll('.sc-layer-item').forEach(item => {
      item.onclick = async (e) => {
        const id = item.dataset.id;
        if (e.target.dataset.del) {
          e.stopPropagation();
          const ok = await window.showConfirm?.('Remover esta foto?', { confirmText: 'Remover', danger: true });
          if (!ok) return;
          const idx = layers.findIndex(l => l.id === id);
          if (idx !== -1) layers.splice(idx, 1);
          if (_sobreSelectedLayerId === id) _sobreSelectedLayerId = null;
          _renderLayerList(); _renderPropsForLayer(null); liveNotify();
          return;
        }
        _sobreSelectedLayerId = id;
        _renderLayerList();
        _renderPropsForLayer(layers.find(l => l.id === _sobreSelectedLayerId));
      };
    });
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
      <div class="sc-row">
        <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; padding:0.2rem 0;">
          <input type="checkbox" id="lpShadow" ${l.shadow ? 'checked' : ''}>
          <span class="sc-label" style="margin:0;">Ativar Sombra</span>
        </label>
      </div>
      <div class="sc-row" id="lpShadowBlurRow" style="display:${l.shadow ? 'block' : 'none'}">
        <span class="sc-label">Intensidade Sombra</span>
        <div class="sc-range-row">
          <input type="range" class="sc-range" id="lpShadowBlur" min="0" max="60" value="${l.shadowBlur ?? 10}">
          <span class="sc-range-val" id="lpShadowBlurVal">${l.shadowBlur ?? 10}px</span>
        </div>
      </div>
      <div class="sc-grid2" style="padding:0.4rem 0.75rem;">
        <button class="sc-btn ${l.flipH ? 'primary' : ''}" id="lpFlipH">↔ H</button>
        <button class="sc-btn ${l.flipV ? 'primary' : ''}" id="lpFlipV">↕ V</button>
      </div>
    `;

    const update = (field, val) => {
      l[field] = val;
      const label = content.querySelector(`#lp${field.charAt(0).toUpperCase() + field.slice(1)}Val`);
      if (label) {
        const suffix = field === 'rotation' ? '°' : (field === 'borderRadius' || field === 'shadowBlur' ? 'px' : '%');
        label.textContent = val + suffix;
      }
      liveNotify();
    };

    content.querySelector('#lpX').oninput = (e) => update('x', parseInt(e.target.value));
    content.querySelector('#lpY').oninput = (e) => update('y', parseInt(e.target.value));
    content.querySelector('#lpScale').oninput = (e) => update('scale', parseInt(e.target.value));
    content.querySelector('#lpW').oninput = (e) => update('width', parseInt(e.target.value));
    content.querySelector('#lpH').oninput = (e) => update('height', parseInt(e.target.value));
    content.querySelector('#lpRot').oninput = (e) => update('rotation', parseInt(e.target.value));
    content.querySelector('#lpOp').oninput = (e) => update('opacity', parseInt(e.target.value));
    content.querySelector('#lpRad').oninput = (e) => update('borderRadius', parseInt(e.target.value));
    content.querySelector('#lpShadow').onchange = (e) => {
      l.shadow = e.target.checked;
      content.querySelector('#lpShadowBlurRow').style.display = e.target.checked ? 'block' : 'none';
      liveNotify();
    };
    content.querySelector('#lpShadowBlur').oninput = (e) => update('shadowBlur', parseInt(e.target.value));
    content.querySelector('#lpFlipH').onclick = () => { l.flipH = !l.flipH; _renderPropsForLayer(l); liveNotify(); };
    content.querySelector('#lpFlipV').onclick = () => { l.flipV = !l.flipV; _renderPropsForLayer(l); liveNotify(); };
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
