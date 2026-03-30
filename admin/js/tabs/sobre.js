/**
 * Tab: Sobre — Canvas Editor para foto de retrato
 * Canvas 3:4 (600×800) embutido no painel de props (igual ao Hero).
 * O iframe permanece visível como preview real do site.
 */

import { appState } from '../state.js';
import { resolveImagePath } from '../utils/helpers.js';
import { uploadImage } from '../utils/upload.js';
import { apiPut } from '../utils/api.js';
import { HeroCanvasEditor } from '../utils/heroCanvas.js';

// ── Instância global (sobrevive trocas de sub-aba) ───────────────────────────
export let _sobreCanvasEditor = null;
let _sobreSidebarContainer = null; // referência ao container para coletar estilos

// Dimensões do canvas — retrato 3:4
const SOBRE_W = 300;
const SOBRE_H = 400;

async function syncSobreToSite(layers, title, text, styles = {}) {
  const imgLayer = (layers || []).find(l => l.type === 'image' && l.url);
  const currentSiteContent = appState.configData?.siteContent || {};

  await apiPut('/api/site/admin/config', {
    siteContent: {
      ...currentSiteContent,
      sobre: {
        ...currentSiteContent.sobre,
        title,
        text,
        ...styles,
        image: imgLayer?.url || currentSiteContent.sobre?.image || '',
        canvasLayers: layers || [],
      }
    }
  });
}

/**
 * Monta o canvas do sobre DENTRO do container do props panel (igual ao Hero).
 * O iframe permanece visível — não é ocultado.
 * Chamado por meu-site.js ao clicar na sub-aba Sobre.
 */
export function renderSobre(container) {
  // Se canvas já existe → apenas re-renderizar o sidebar (canvas sobrevive)
  if (_sobreCanvasEditor) {
    _renderSobreSidebar(container);
    return;
  }

  const siteContent = appState.configData?.siteContent || {};
  const sobreData = siteContent.sobre || {};

  // Layers iniciais — migração: se não tem canvasLayers mas tem image legada
  let layers = sobreData.canvasLayers || [];
  if (layers.length === 0 && sobreData.image) {
    layers = [{
      id: 'sb_' + Date.now(),
      type: 'image',
      url: sobreData.image,
      name: 'Foto',
      x: 50,
      y: 50,
      width: 70,
      height: 70,
      rotation: 0,
      opacity: 100,
      borderRadius: 0,
      shadow: false,
      shadowBlur: 10,
      shadowColor: 'rgba(0,0,0,0.5)',
      flipH: false,
      flipV: false,
      presets: {},
    }];
  }

  // Canvas instalado DENTRO do container do props panel
  // Wrapper externo controla tamanho; o mount interno é passado ao HeroCanvasEditor
  // (HeroCanvasEditor sobrescreve o cssText do container passado a ele)
  const canvasWrapper = document.createElement('div');
  canvasWrapper.id = 'sobre-canvas-wrapper';
  canvasWrapper.style.cssText = 'width:100%; height:285px; border-radius:8px; overflow:hidden; margin-bottom:0.5rem; flex-shrink:0;';

  const canvasMount = document.createElement('div');
  canvasMount.style.cssText = 'width:100%;height:100%;';
  canvasWrapper.appendChild(canvasMount);

  // Canvas com dimensões de retrato 3:4 — deviceSizes fixo para todos os devices
  const sobreSizes = {
    desktop: { w: SOBRE_W, h: SOBRE_H },
    tablet:  { w: SOBRE_W, h: SOBRE_H },
    mobile:  { w: SOBRE_W, h: SOBRE_H },
  };
  const canvasEditor = new HeroCanvasEditor(canvasMount, {
    onSelect: (layer) => {
      _renderPropsForLayer(_sobreSidebarContainer, layer, canvasEditor);
    },
    onChange: () => {
      window._meuSitePostPreview?.();
    },
    resolveImagePath: resolveImagePath,
    deviceSizes: sobreSizes,
  });

  // Fundo neutro escuro
  if (canvasEditor.root) canvasEditor.root.style.background = '#1a1a1a';
  if (canvasEditor.bgEl) {
    canvasEditor.bgEl.style.backgroundImage = 'none';
    canvasEditor.bgEl.style.background = '#1a1a1a';
  }
  canvasEditor.setOverlay({ opacity: 0, topBarHeight: 0, bottomBarHeight: 0 });
  canvasEditor.setLayers(layers);
  _sobreCanvasEditor = canvasEditor;

  // Renderiza o sidebar completo (vai injetar o canvasWrapper dentro)
  _renderSobreSidebar(container, canvasWrapper);
}

// ── Sidebar de propriedades ───────────────────────────────────────────────────
function _renderSobreSidebar(container, canvasWrapper) {
  _sobreSidebarContainer = container;
  const siteContent = appState.configData?.siteContent || {};
  const sobreData = siteContent.sobre || {};

  container.innerHTML = `
    <style>
      #config-sobre { display:flex; flex-direction:column; height:100%; overflow:hidden; }
      .sc-sidebar { display:flex; flex-direction:column; flex:1; min-height:0; overflow-y:auto; }
      .sc-sidebar::-webkit-scrollbar { width:4px; }
      .sc-sidebar::-webkit-scrollbar-thumb { background:#374151; border-radius:2px; }
      .sc-section { border-bottom:1px solid #1f2937; }
      .sc-section-head { padding:0.6rem 0.75rem; font-size:0.7rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; }
      .sc-row { padding:0.4rem 0.75rem; display:flex; flex-direction:column; gap:0.2rem; }
      .sc-label { font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }
      .sc-input { width:100%; padding:0.35rem 0.5rem; background:#1f2937; border:1px solid #374151; border-radius:0.375rem; color:#f3f4f6; font-size:0.78rem; outline:none; box-sizing:border-box; }
      .sc-input:focus { border-color:#3b82f6; }
      .sc-textarea { width:100%; padding:0.35rem 0.5rem; background:#1f2937; border:1px solid #374151; border-radius:0.375rem; color:#f3f4f6; font-size:0.78rem; outline:none; box-sizing:border-box; resize:vertical; min-height:80px; }
      .sc-range { width:100%; accent-color:#3b82f6; }
      .sc-range-row { display:flex; align-items:center; gap:0.4rem; }
      .sc-range-val { font-size:0.65rem; font-family:monospace; color:#9ca3af; min-width:2.2rem; text-align:right; }
      .sc-btn { padding:0.4rem 0.6rem; border-radius:0.375rem; border:1px solid #374151; background:#1f2937; color:#d1d5db; font-size:0.75rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.3rem; }
      .sc-btn:hover { background:#374151; color:#fff; }
      .sc-btn.primary { background:#1d4ed8; border-color:#1d4ed8; color:#fff; }
      .sc-btn.primary:hover { background:#2563eb; }
      .sc-btn.success { background:#16a34a; border-color:#16a34a; color:#fff; font-weight:700; }
      .sc-btn.success:hover { background:#15803d; }
      .sc-btn-group { display:flex; gap:0.35rem; padding:0.4rem 0.75rem; flex-wrap:wrap; }
      .sc-layer-item { margin:0 0.5rem 0.35rem; padding:0.4rem 0.6rem; background:#1f2937; border:1px solid #374151; border-radius:0.375rem; display:flex; align-items:center; gap:0.4rem; cursor:pointer; font-size:0.75rem; color:#d1d5db; }
      .sc-layer-item:hover { background:#2d3748; }
      .sc-layer-item.active { border-color:#3b82f6; background:#172554; }
      .sc-layer-item .layer-del { color:#ef4444; cursor:pointer; font-size:0.85rem; opacity:0.6; margin-left:auto; }
      .sc-layer-item .layer-del:hover { opacity:1; }
    </style>

    <div class="sc-sidebar">

      <!-- Canvas preview inline -->
      <div id="sc-canvas-mount" style="padding:0.75rem; padding-bottom:0.25rem;"></div>

      <!-- Foto: adicionar -->
      <div class="sc-section">
        <div class="sc-section-head">🖼 Foto</div>
        <div class="sc-btn-group">
          <label class="sc-btn primary" style="flex:1; cursor:pointer; justify-content:center;">
            📷 Adicionar Foto
            <input type="file" accept=".jpg,.jpeg,.png" id="scAddPhoto" style="display:none;">
          </label>
        </div>
      </div>

      <!-- Props da layer selecionada -->
      <div id="sc-layer-props" class="sc-section" style="display:none;">
        <div class="sc-section-head">⚙️ Propriedades da Foto</div>
        <div id="sc-layer-props-content"></div>
      </div>

      <!-- Lista de camadas -->
      <div class="sc-section">
        <div class="sc-section-head">Camadas</div>
        <div id="sc-layer-list" style="padding:0.35rem 0; min-height:2rem;"></div>
      </div>

      <!-- Texto do Sobre -->
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

      <!-- Estilo do Título -->
      <div class="sc-section">
        <div class="sc-section-head">🔤 Estilo do Título</div>
        <div class="sc-row">
          <span class="sc-label">Fonte</span>
          <select class="sc-input" id="scTitleFont">
            <option value="" ${!(sobreData.titleStyle?.fontFamily) ? 'selected' : ''}>Padrão do Tema</option>
            <option value="'Playfair Display', serif" ${sobreData.titleStyle?.fontFamily === "'Playfair Display', serif" ? 'selected' : ''}>Playfair Display</option>
            <option value="'Inter', sans-serif" ${sobreData.titleStyle?.fontFamily === "'Inter', sans-serif" ? 'selected' : ''}>Inter</option>
            <option value="'Poppins', sans-serif" ${sobreData.titleStyle?.fontFamily === "'Poppins', sans-serif" ? 'selected' : ''}>Poppins</option>
            <option value="'Montserrat', sans-serif" ${sobreData.titleStyle?.fontFamily === "'Montserrat', sans-serif" ? 'selected' : ''}>Montserrat</option>
            <option value="'Lato', sans-serif" ${sobreData.titleStyle?.fontFamily === "'Lato', sans-serif" ? 'selected' : ''}>Lato</option>
            <option value="'Raleway', sans-serif" ${sobreData.titleStyle?.fontFamily === "'Raleway', sans-serif" ? 'selected' : ''}>Raleway</option>
            <option value="'Oswald', sans-serif" ${sobreData.titleStyle?.fontFamily === "'Oswald', sans-serif" ? 'selected' : ''}>Oswald</option>
          </select>
        </div>
        <div class="sc-row">
          <span class="sc-label">Tamanho: <span id="scTitleSizeVal">${sobreData.titleStyle?.fontSize || 32}px</span></span>
          <input type="range" class="sc-range" id="scTitleSize" min="14" max="80" value="${sobreData.titleStyle?.fontSize || 32}">
        </div>
        <div class="sc-row">
          <span class="sc-label">Cor</span>
          <input type="color" id="scTitleColor" value="${sobreData.titleStyle?.color || '#ffffff'}" style="width:100%;height:32px;border:1px solid #374151;border-radius:4px;background:none;cursor:pointer;">
        </div>
        <div class="sc-btn-group">
          <button class="sc-btn${sobreData.titleStyle?.fontWeight === 'bold' ? ' primary' : ''}" id="scTitleBold" style="font-weight:700;">B</button>
          <button class="sc-btn${sobreData.titleStyle?.fontStyle === 'italic' ? ' primary' : ''}" id="scTitleItalic" style="font-style:italic;">I</button>
        </div>
      </div>

      <!-- Estilo do Texto -->
      <div class="sc-section">
        <div class="sc-section-head">📝 Estilo do Texto</div>
        <div class="sc-row">
          <span class="sc-label">Fonte</span>
          <select class="sc-input" id="scTextFont">
            <option value="" ${!(sobreData.textStyle?.fontFamily) ? 'selected' : ''}>Padrão do Tema</option>
            <option value="'Playfair Display', serif" ${sobreData.textStyle?.fontFamily === "'Playfair Display', serif" ? 'selected' : ''}>Playfair Display</option>
            <option value="'Inter', sans-serif" ${sobreData.textStyle?.fontFamily === "'Inter', sans-serif" ? 'selected' : ''}>Inter</option>
            <option value="'Poppins', sans-serif" ${sobreData.textStyle?.fontFamily === "'Poppins', sans-serif" ? 'selected' : ''}>Poppins</option>
            <option value="'Montserrat', sans-serif" ${sobreData.textStyle?.fontFamily === "'Montserrat', sans-serif" ? 'selected' : ''}>Montserrat</option>
            <option value="'Lato', sans-serif" ${sobreData.textStyle?.fontFamily === "'Lato', sans-serif" ? 'selected' : ''}>Lato</option>
            <option value="'Raleway', sans-serif" ${sobreData.textStyle?.fontFamily === "'Raleway', sans-serif" ? 'selected' : ''}>Raleway</option>
            <option value="'Oswald', sans-serif" ${sobreData.textStyle?.fontFamily === "'Oswald', sans-serif" ? 'selected' : ''}>Oswald</option>
          </select>
        </div>
        <div class="sc-row">
          <span class="sc-label">Tamanho: <span id="scTextSizeVal">${sobreData.textStyle?.fontSize || 16}px</span></span>
          <input type="range" class="sc-range" id="scTextSize" min="10" max="40" value="${sobreData.textStyle?.fontSize || 16}">
        </div>
        <div class="sc-row">
          <span class="sc-label">Cor</span>
          <input type="color" id="scTextColor" value="${sobreData.textStyle?.color || '#cccccc'}" style="width:100%;height:32px;border:1px solid #374151;border-radius:4px;background:none;cursor:pointer;">
        </div>
        <div class="sc-btn-group">
          <button class="sc-btn${sobreData.textStyle?.fontWeight === 'bold' ? ' primary' : ''}" id="scTextBold" style="font-weight:700;">B</button>
          <button class="sc-btn${sobreData.textStyle?.fontStyle === 'italic' ? ' primary' : ''}" id="scTextItalic" style="font-style:italic;">I</button>
        </div>
      </div>

      <!-- Salvar -->
      <div style="padding:0.75rem;">
        <button class="sc-btn success" id="scSaveBtn" style="width:100%; font-size:0.875rem; padding:0.6rem;">
          💾 Salvar Sobre
        </button>
      </div>

    </div>
  `;

  // Montar o canvasWrapper no mount point do sidebar
  const mountEl = container.querySelector('#sc-canvas-mount');
  if (mountEl) {
    const wrapperEl = canvasWrapper || document.getElementById('sobre-canvas-wrapper');
    if (wrapperEl) mountEl.appendChild(wrapperEl);
  }

  const canvasEditor = _sobreCanvasEditor;
  if (!canvasEditor) return;

  // Preview em tempo real ao digitar
  container.querySelector('#scTitle').oninput = () => window._meuSitePostPreview?.();
  container.querySelector('#scText').oninput  = () => window._meuSitePostPreview?.();

  // ── Estilo do Título ──
  const pp = () => window._meuSitePostPreview?.();
  container.querySelector('#scTitleSize').oninput = (e) => {
    container.querySelector('#scTitleSizeVal').textContent = e.target.value + 'px'; pp();
  };
  container.querySelector('#scTitleFont').onchange  = pp;
  container.querySelector('#scTitleColor').oninput  = pp;
  container.querySelector('#scTitleBold').onclick = () => {
    const btn = container.querySelector('#scTitleBold');
    btn.classList.toggle('primary');
    pp();
  };
  container.querySelector('#scTitleItalic').onclick = () => {
    const btn = container.querySelector('#scTitleItalic');
    btn.classList.toggle('primary');
    pp();
  };

  // ── Estilo do Texto ──
  container.querySelector('#scTextSize').oninput = (e) => {
    container.querySelector('#scTextSizeVal').textContent = e.target.value + 'px'; pp();
  };
  container.querySelector('#scTextFont').onchange  = pp;
  container.querySelector('#scTextColor').oninput  = pp;
  container.querySelector('#scTextBold').onclick = () => {
    container.querySelector('#scTextBold').classList.toggle('primary'); pp();
  };
  container.querySelector('#scTextItalic').onclick = () => {
    container.querySelector('#scTextItalic').classList.toggle('primary'); pp();
  };

  // Adicionar foto
  container.querySelector('#scAddPhoto').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, appState.authToken);
      const layers = canvasEditor.getLayers();
      const imgCount = layers.filter(l => l.type === 'image').length;
      canvasEditor.addLayer({
        id: 'sb_' + Date.now(),
        type: 'image',
        url: result.url,
        name: `Foto ${imgCount + 1}`,
        x: 50, y: 50,
        width: 70, height: 70,
        rotation: 0,
        opacity: 100,
        borderRadius: 0,
        shadow: false,
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.5)',
        flipH: false, flipV: false,
        presets: {},
      });
      _renderLayerList(container, canvasEditor);
      e.target.value = '';
    } catch (err) {
      window.showToast?.('Erro no upload: ' + err.message, 'error');
    }
  });

  // Coleta os estilos atuais dos controles
  function collectStyles() {
    return {
      titleStyle: {
        fontFamily:  container.querySelector('#scTitleFont')?.value  || '',
        fontSize:    parseInt(container.querySelector('#scTitleSize')?.value  || 32),
        color:       container.querySelector('#scTitleColor')?.value || '',
        fontWeight:  container.querySelector('#scTitleBold')?.classList.contains('primary')  ? 'bold'   : 'normal',
        fontStyle:   container.querySelector('#scTitleItalic')?.classList.contains('primary') ? 'italic' : 'normal',
      },
      textStyle: {
        fontFamily:  container.querySelector('#scTextFont')?.value  || '',
        fontSize:    parseInt(container.querySelector('#scTextSize')?.value  || 16),
        color:       container.querySelector('#scTextColor')?.value || '',
        fontWeight:  container.querySelector('#scTextBold')?.classList.contains('primary')  ? 'bold'   : 'normal',
        fontStyle:   container.querySelector('#scTextItalic')?.classList.contains('primary') ? 'italic' : 'normal',
      },
    };
  }

  // Salvar
  container.querySelector('#scSaveBtn').addEventListener('click', async () => {
    const btn = container.querySelector('#scSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Salvando...';
    try {
      const layers = canvasEditor.getLayers();
      const title  = container.querySelector('#scTitle').value;
      const text   = container.querySelector('#scText').value;
      const styles = collectStyles();
      await syncSobreToSite(layers, title, text, styles);
      if (!appState.configData.siteContent) appState.configData.siteContent = {};
      appState.configData.siteContent.sobre = {
        ...appState.configData.siteContent.sobre,
        title, text,
        ...styles,
        image: layers.find(l => l.type === 'image')?.url || '',
        canvasLayers: layers,
      };
      window.showToast?.('Sobre salvo!', 'success');
      // Atualizar preview do iframe
      window._meuSitePostPreview?.();
    } catch (err) {
      window.showToast?.('Erro ao salvar: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Salvar Sobre';
    }
  });

  _renderLayerList(container, canvasEditor);
}

// ── Lista de camadas ──────────────────────────────────────────────────────────
function _renderLayerList(container, canvasEditor) {
  const listEl = container.querySelector('#sc-layer-list');
  if (!listEl) return;

  const layers = canvasEditor.getLayers();
  if (layers.length === 0) {
    listEl.innerHTML = '<p style="font-size:0.72rem; color:#4b5563; text-align:center; padding:0.5rem; margin:0;">Nenhuma foto. Adicione acima.</p>';
    return;
  }

  listEl.innerHTML = [...layers].reverse().map((layer) => {
    const isSelected = canvasEditor.selectedId === layer.id;
    const name = layer.name || 'Foto';
    return `
      <div class="sc-layer-item${isSelected ? ' active' : ''}" data-layer-id="${layer.id}">
        <span>🖼</span>
        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</span>
        <span class="layer-del" data-del-layer="${layer.id}" title="Remover">✕</span>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.sc-layer-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.dataset.delLayer) return;
      const layerId = item.dataset.layerId;
      canvasEditor.selectLayer(layerId);
      _renderLayerList(container, canvasEditor);
      const layer = canvasEditor._getLayer(layerId);
      _renderPropsForLayer(container, layer, canvasEditor);
    });
  });

  listEl.querySelectorAll('[data-del-layer]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ok = await window.showConfirm?.('Remover esta foto?', { confirmText: 'Remover', danger: true });
      if (!ok) return;
      canvasEditor.removeLayer(btn.dataset.delLayer);
      _renderLayerList(container, canvasEditor);
      const propsEl = container.querySelector('#sc-layer-props');
      if (propsEl) propsEl.style.display = 'none';
    });
  });
}

// ── Propriedades da layer ─────────────────────────────────────────────────────
function _renderPropsForLayer(container, layer, canvasEditor) {
  const propsSection = container.querySelector('#sc-layer-props');
  const propsContent = container.querySelector('#sc-layer-props-content');
  if (!propsSection || !propsContent) return;

  if (!layer || layer.type !== 'image') {
    propsSection.style.display = 'none';
    return;
  }

  propsSection.style.display = 'block';

  propsContent.innerHTML = `
    <div class="sc-btn-group">
      <label class="sc-btn primary" style="flex:1; cursor:pointer; justify-content:center; font-size:0.72rem;">
        🔄 Trocar Foto
        <input type="file" accept=".jpg,.jpeg,.png" id="scLayerImgReplace" style="display:none;">
      </label>
    </div>
    <div class="sc-row">
      <span class="sc-label">Opacidade: <span id="scImgOpacityVal">${layer.opacity ?? 100}%</span></span>
      <input type="range" class="sc-range" id="scImgOpacity" min="0" max="100" value="${layer.opacity ?? 100}">
    </div>
    <div class="sc-row">
      <span class="sc-label">Bordas: <span id="scBorderRadiusVal">${layer.borderRadius || 0}px</span></span>
      <input type="range" class="sc-range" id="scBorderRadius" min="0" max="200" value="${layer.borderRadius || 0}">
    </div>
    <div class="sc-section-head" style="padding:0.4rem 0.75rem 0.2rem;">Sombra</div>
    <div style="padding:0 0.75rem 0.5rem;">
      <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-size:0.75rem;color:#d1d5db;margin-bottom:0.35rem;">
        <input type="checkbox" id="scShadowEnabled" ${layer.shadow ? 'checked' : ''}>
        Ativar sombra
      </label>
      <div id="scShadowOptions" style="display:${layer.shadow ? 'flex' : 'none'};flex-direction:column;gap:0.3rem;">
        <div class="sc-row" style="padding:0;">
          <span class="sc-label">Intensidade: <span id="scShadowBlurVal">${layer.shadowBlur || 10}px</span></span>
          <input type="range" class="sc-range" id="scShadowBlur" min="0" max="60" value="${layer.shadowBlur || 10}">
        </div>
      </div>
    </div>
    <div class="sc-btn-group">
      <button class="sc-btn${layer.flipH ? ' primary' : ''}" id="scFlipH">↔ H</button>
      <button class="sc-btn${layer.flipV ? ' primary' : ''}" id="scFlipV">↕ V</button>
    </div>
  `;

  container.querySelector('#scImgOpacity').oninput = (e) => {
    container.querySelector('#scImgOpacityVal').textContent = e.target.value + '%';
    canvasEditor.updateLayer(layer.id, { opacity: parseInt(e.target.value) });
  };
  container.querySelector('#scBorderRadius').oninput = (e) => {
    container.querySelector('#scBorderRadiusVal').textContent = e.target.value + 'px';
    canvasEditor.updateLayer(layer.id, { borderRadius: parseInt(e.target.value) });
  };

  const shadowCheck = container.querySelector('#scShadowEnabled');
  const shadowOptions = container.querySelector('#scShadowOptions');
  shadowCheck.onchange = () => {
    shadowOptions.style.display = shadowCheck.checked ? 'flex' : 'none';
    canvasEditor.updateLayer(layer.id, { shadow: shadowCheck.checked });
    _applyShadowToLayer(canvasEditor, layer.id);
  };
  container.querySelector('#scShadowBlur').oninput = (e) => {
    container.querySelector('#scShadowBlurVal').textContent = e.target.value + 'px';
    canvasEditor.updateLayer(layer.id, { shadowBlur: parseInt(e.target.value) });
    _applyShadowToLayer(canvasEditor, layer.id);
  };

  container.querySelector('#scFlipH').onclick = () => {
    canvasEditor.updateLayer(layer.id, { flipH: !layer.flipH });
    _renderPropsForLayer(container, canvasEditor._getLayer(layer.id), canvasEditor);
  };
  container.querySelector('#scFlipV').onclick = () => {
    canvasEditor.updateLayer(layer.id, { flipV: !layer.flipV });
    _renderPropsForLayer(container, canvasEditor._getLayer(layer.id), canvasEditor);
  };

  container.querySelector('#scLayerImgReplace').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, appState.authToken);
      canvasEditor.updateLayer(layer.id, { url: result.url });
      e.target.value = '';
    } catch (err) {
      window.showToast?.('Erro no upload: ' + err.message, 'error');
    }
  };

  _applyShadowToLayer(canvasEditor, layer.id);
}

function _applyShadowToLayer(canvasEditor, layerId) {
  const layer = canvasEditor._getLayer(layerId);
  if (!layer) return;
  const el = canvasEditor.layersEl?.querySelector(`[data-hc-layer="${layerId}"]`);
  if (!el) return;
  if (layer.shadow) {
    el.style.filter = `drop-shadow(0px 4px ${layer.shadowBlur || 10}px ${layer.shadowColor || 'rgba(0,0,0,0.5)'})`;
  } else {
    el.style.filter = '';
  }
}

/**
 * Retorna dados atuais para preview (chamado por meu-site.js postPreviewData)
 */
export function getSobreCanvasState() {
  if (!_sobreCanvasEditor) return null;
  const layers = _sobreCanvasEditor.getLayers();
  const imgLayer = layers.find(l => l.type === 'image' && l.url);
  const c = _sobreSidebarContainer;
  const styles = c ? {
    titleStyle: {
      fontFamily: c.querySelector('#scTitleFont')?.value  || '',
      fontSize:   parseInt(c.querySelector('#scTitleSize')?.value  || 32),
      color:      c.querySelector('#scTitleColor')?.value || '',
      fontWeight: c.querySelector('#scTitleBold')?.classList.contains('primary')  ? 'bold'   : 'normal',
      fontStyle:  c.querySelector('#scTitleItalic')?.classList.contains('primary') ? 'italic' : 'normal',
    },
    textStyle: {
      fontFamily: c.querySelector('#scTextFont')?.value  || '',
      fontSize:   parseInt(c.querySelector('#scTextSize')?.value  || 16),
      color:      c.querySelector('#scTextColor')?.value || '',
      fontWeight: c.querySelector('#scTextBold')?.classList.contains('primary')  ? 'bold'   : 'normal',
      fontStyle:  c.querySelector('#scTextItalic')?.classList.contains('primary') ? 'italic' : 'normal',
    },
  } : {};
  return { layers, image: imgLayer?.url || '', ...styles };
}

/**
 * Destrói o canvas (chamado ao sair do builder mode)
 */
export function destroySobreCanvas() {
  if (_sobreCanvasEditor) {
    _sobreCanvasEditor.destroy?.();
    _sobreCanvasEditor = null;
  }
  const el = document.getElementById('sobre-canvas-wrapper');
  if (el) el.remove();
  _sobreSidebarContainer = null;
}
