/**
 * Tab: Portfolio — Canvas Editor estilo Hero
 * Editor visual com layers livres (texto + imagem), fundo customizável
 * (imagem, cor sólida ou gradiente).
 */

import { appState } from '../state.js';
import { resolveImagePath } from '../utils/helpers.js';
import { uploadImage } from '../utils/upload.js';
import { apiPut } from '../utils/api.js';
import { HeroCanvasEditor } from '../utils/heroCanvas.js';

// ── Instância global do canvas (sobrevive trocas de sub-aba) ─────────────────
export let _portfolioCanvasEditor = null;
export let _portfolioBgState = {};

// Sincroniza portfolio para o site
async function syncPortfolioToSite(layers, background) {
  // Extrai fotos das layers de imagem para o campo legado photos
  const photos = (layers || [])
    .filter(l => l.type === 'image' && l.url)
    .map(l => ({ url: l.url }));

  const currentSiteContent = appState.configData?.siteContent || {};

  await apiPut('/api/site/admin/config', {
    siteContent: {
      ...currentSiteContent,
      portfolio: {
        ...currentSiteContent.portfolio,
        photos,
        canvasLayers: layers || [],
        canvasBg: background || {},
      }
    }
  });
}

/**
 * Monta o canvas do portfolio dentro do #builder-iframe-wrap.
 * Chamado por meu-site.js — similar ao renderHeroStudio.
 */
export function renderPortfolio(container) {
  // Se canvas já existe → apenas mostrar (não recriar)
  if (_portfolioCanvasEditor) {
    const canvasEl = document.getElementById('portfolio-canvas-container');
    const iframe = document.getElementById('builder-iframe');
    if (canvasEl) canvasEl.style.display = 'flex';
    if (iframe) iframe.style.display = 'none';
    _renderPortfolioSidebar(container);
    return;
  }

  const siteContent = appState.configData?.siteContent || {};
  const portfolioData = siteContent.portfolio || {};

  // Background inicial
  _portfolioBgState = { ...(portfolioData.canvasBg || {}) };

  // Layers iniciais — migração: se não tem layers, criar a partir de photos legadas
  let layers = portfolioData.canvasLayers || [];
  if (layers.length === 0 && portfolioData.photos?.length > 0) {
    const cols = 3;
    const spacing = 30;
    const startX = 17;
    const startY = 20;
    const cellW = 28;
    const cellH = 32;
    layers = portfolioData.photos.slice(0, 9).map((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        id: 'pl_' + Date.now() + '_' + i,
        type: 'image',
        url: p.url || p.image || p,
        name: `Foto ${i + 1}`,
        x: startX + col * spacing,
        y: startY + row * (cellH + 5),
        width: cellW,
        height: cellH,
        rotation: 0,
        opacity: 100,
        borderRadius: 4,
        shadow: false,
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.5)',
        presets: {},
      };
    });
  }

  // Tomar conta da área de preview (substituir iframe pelo canvas)
  const iframeWrap = document.getElementById('builder-iframe-wrap');
  const iframe = document.getElementById('builder-iframe');
  if (iframe) iframe.style.display = 'none';

  const canvasContainer = document.createElement('div');
  canvasContainer.id = 'portfolio-canvas-container';
  canvasContainer.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0a0b10;position:absolute;inset:0;z-index:2;';
  if (iframeWrap) iframeWrap.appendChild(canvasContainer);

  // Instanciar canvas editor
  const canvasEditor = new HeroCanvasEditor(canvasContainer, {
    onSelect: (layer) => {
      _renderPropsForLayer(container, layer, canvasEditor);
    },
    onChange: () => {
      window._meuSitePostPreview?.();
    },
    resolveImagePath: resolveImagePath,
  });

  // Definir background
  _applyBgToCanvas(canvasEditor, _portfolioBgState);
  canvasEditor.setLayers(layers);
  _portfolioCanvasEditor = canvasEditor;

  // Renderizar sidebar
  _renderPortfolioSidebar(container);
}

// ── Aplica o background ao canvas ────────────────────────────────────────────
function _applyBgToCanvas(canvasEditor, bg) {
  if (bg.type === 'image' && bg.url) {
    canvasEditor.setBackground({ url: bg.url, scale: bg.scale || 1, posX: bg.posX || 50, posY: bg.posY || 50 });
    canvasEditor.setOverlay({ opacity: bg.overlayOpacity || 0, topBarHeight: 0, bottomBarHeight: 0 });
    if (canvasEditor.root) canvasEditor.root.style.background = '#111';
  } else if (bg.type === 'solid') {
    canvasEditor.setBackground({ url: '' });
    canvasEditor.setOverlay({ opacity: 0, topBarHeight: 0, bottomBarHeight: 0 });
    if (canvasEditor.root) canvasEditor.root.style.background = bg.color || '#111111';
    if (canvasEditor.bgEl) {
      canvasEditor.bgEl.style.backgroundImage = 'none';
      canvasEditor.bgEl.style.background = bg.color || '#111111';
    }
  } else if (bg.type === 'gradient') {
    canvasEditor.setBackground({ url: '' });
    canvasEditor.setOverlay({ opacity: 0, topBarHeight: 0, bottomBarHeight: 0 });
    const grad = `linear-gradient(${bg.gradAngle || 135}deg, ${bg.gradColor1 || '#1a1a2e'} 0%, ${bg.gradColor2 || '#16213e'} 100%)`;
    if (canvasEditor.root) canvasEditor.root.style.background = grad;
    if (canvasEditor.bgEl) {
      canvasEditor.bgEl.style.backgroundImage = 'none';
      canvasEditor.bgEl.style.background = grad;
    }
  } else {
    // Padrão: fundo neutro escuro
    canvasEditor.setBackground({ url: '' });
    canvasEditor.setOverlay({ opacity: 0, topBarHeight: 0, bottomBarHeight: 0 });
    if (canvasEditor.root) canvasEditor.root.style.background = '#111111';
    if (canvasEditor.bgEl) {
      canvasEditor.bgEl.style.backgroundImage = 'none';
      canvasEditor.bgEl.style.background = '#111111';
    }
  }
}

// ── Sidebar de propriedades ───────────────────────────────────────────────────
function _renderPortfolioSidebar(container) {
  const siteContent = appState.configData?.siteContent || {};
  const portfolioData = siteContent.portfolio || {};
  const bg = _portfolioBgState;

  container.innerHTML = `
    <style>
      #config-portfolio { display:flex; flex-direction:column; height:100%; overflow:hidden; }
      .pc-sidebar { display:flex; flex-direction:column; flex:1; min-height:0; overflow-y:auto; }
      .pc-sidebar::-webkit-scrollbar { width:4px; }
      .pc-sidebar::-webkit-scrollbar-thumb { background:#374151; border-radius:2px; }
      .pc-section { border-bottom:1px solid #1f2937; }
      .pc-section-head { padding:0.6rem 0.75rem; font-size:0.7rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; display:flex; align-items:center; justify-content:space-between; }
      .pc-row { padding:0.4rem 0.75rem; display:flex; flex-direction:column; gap:0.2rem; }
      .pc-label { font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }
      .pc-input { width:100%; padding:0.35rem 0.5rem; background:#1f2937; border:1px solid #374151; border-radius:0.375rem; color:#f3f4f6; font-size:0.78rem; outline:none; box-sizing:border-box; }
      .pc-input:focus { border-color:#3b82f6; }
      .pc-range { width:100%; accent-color:#3b82f6; }
      .pc-range-row { display:flex; align-items:center; gap:0.4rem; }
      .pc-range-val { font-size:0.65rem; font-family:monospace; color:#9ca3af; min-width:2.2rem; text-align:right; }
      .pc-btn { padding:0.4rem 0.6rem; border-radius:0.375rem; border:1px solid #374151; background:#1f2937; color:#d1d5db; font-size:0.75rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.3rem; }
      .pc-btn:hover { background:#374151; color:#fff; }
      .pc-btn.primary { background:#1d4ed8; border-color:#1d4ed8; color:#fff; }
      .pc-btn.primary:hover { background:#2563eb; }
      .pc-btn.success { background:#16a34a; border-color:#16a34a; color:#fff; font-weight:700; }
      .pc-btn.success:hover { background:#15803d; }
      .pc-btn.danger { border-color:#dc2626; color:#ef4444; }
      .pc-btn.danger:hover { background:#dc2626; color:#fff; }
      .pc-btn-group { display:flex; gap:0.35rem; padding:0.4rem 0.75rem; flex-wrap:wrap; }
      .pc-layer-item { margin:0 0.5rem 0.35rem; padding:0.4rem 0.6rem; background:#1f2937; border:1px solid #374151; border-radius:0.375rem; display:flex; align-items:center; gap:0.4rem; cursor:pointer; font-size:0.75rem; color:#d1d5db; }
      .pc-layer-item:hover { background:#2d3748; }
      .pc-layer-item.active { border-color:#3b82f6; background:#172554; }
      .pc-layer-item .layer-icon { font-size:0.8rem; opacity:0.6; }
      .pc-layer-item .layer-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .pc-layer-item .layer-del { color:#ef4444; cursor:pointer; font-size:0.85rem; opacity:0.6; }
      .pc-layer-item .layer-del:hover { opacity:1; }
      .pc-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:0.35rem; }
      .pc-tabs { display:flex; border-bottom:1px solid #374151; }
      .pc-tab { flex:1; padding:0.45rem 0.25rem; font-size:0.68rem; font-weight:600; text-align:center; cursor:pointer; color:#6b7280; border-bottom:2px solid transparent; background:none; border-left:none; border-right:none; border-top:none; }
      .pc-tab.active { color:#3b82f6; border-bottom-color:#3b82f6; }
    </style>

    <div class="pc-sidebar">

      <!-- BG TABS: tema / imagem / sólida / gradiente -->
      <div class="pc-section">
        <div class="pc-section-head">🖼 Fundo da Seção</div>
        <div class="pc-tabs">
          <button class="pc-tab ${(!bg.type || bg.type === 'none') ? 'active' : ''}" data-bg-tab="none">Tema</button>
          <button class="pc-tab ${bg.type === 'image' ? 'active' : ''}" data-bg-tab="image">Imagem</button>
          <button class="pc-tab ${bg.type === 'solid' ? 'active' : ''}" data-bg-tab="solid">Cor</button>
          <button class="pc-tab ${bg.type === 'gradient' ? 'active' : ''}" data-bg-tab="gradient">Gradiente</button>
        </div>

        <!-- Sem fundo (padrão do tema) -->
        <div id="pc-bg-none" style="display:${(!bg.type || bg.type === 'none') ? 'block' : 'none'}; padding:0.5rem 0.75rem;">
          <p style="font-size:0.72rem; color:#6b7280; text-align:center; margin:0;">Usa a cor padrão do tema escolhido.</p>
        </div>

        <!-- Imagem -->
        <div id="pc-bg-image" style="display:${bg.type === 'image' ? 'flex' : 'none'}; flex-direction:column; gap:0.35rem; padding:0.4rem 0.75rem;">
          <input type="hidden" id="pcBgImageUrl" value="${bg.url || ''}">
          <label class="pc-btn primary" style="font-size:0.72rem; cursor:pointer; text-align:center;">
            📷 Upload de Fundo
            <input type="file" accept=".jpg,.jpeg,.png" id="pcBgImageUpload" style="display:none;">
          </label>
          ${bg.url ? `<img src="${resolveImagePath(bg.url)}" style="width:100%; border-radius:4px; max-height:80px; object-fit:cover;">` : ''}
          <div class="pc-row" style="padding:0;">
            <span class="pc-label">Overlay escuro</span>
            <div class="pc-range-row">
              <input type="range" class="pc-range" id="pcBgOverlay" min="0" max="80" value="${bg.overlayOpacity || 0}">
              <span class="pc-range-val" id="pcBgOverlayVal">${bg.overlayOpacity || 0}%</span>
            </div>
          </div>
        </div>

        <!-- Sólida -->
        <div id="pc-bg-solid" style="display:${bg.type === 'solid' ? 'flex' : 'none'}; flex-direction:column; gap:0.35rem; padding:0.4rem 0.75rem;">
          <div class="pc-row" style="padding:0;">
            <span class="pc-label">Cor de Fundo</span>
            <input type="color" id="pcBgSolidColor" value="${bg.color || '#111111'}" style="width:100%; height:36px; border:1px solid #374151; border-radius:4px; background:none; cursor:pointer;">
          </div>
        </div>

        <!-- Gradiente -->
        <div id="pc-bg-gradient" style="display:${bg.type === 'gradient' ? 'flex' : 'none'}; flex-direction:column; gap:0.35rem; padding:0.4rem 0.75rem;">
          <div class="pc-grid2">
            <div class="pc-row" style="padding:0;">
              <span class="pc-label">Cor 1</span>
              <input type="color" id="pcGradColor1" value="${bg.gradColor1 || '#1a1a2e'}" style="width:100%; height:32px; border:1px solid #374151; border-radius:4px; background:none; cursor:pointer;">
            </div>
            <div class="pc-row" style="padding:0;">
              <span class="pc-label">Cor 2</span>
              <input type="color" id="pcGradColor2" value="${bg.gradColor2 || '#16213e'}" style="width:100%; height:32px; border:1px solid #374151; border-radius:4px; background:none; cursor:pointer;">
            </div>
          </div>
          <div class="pc-row" style="padding:0;">
            <span class="pc-label">Ângulo: <span id="pcGradAngleVal">${bg.gradAngle || 135}°</span></span>
            <input type="range" class="pc-range" id="pcGradAngle" min="0" max="360" value="${bg.gradAngle || 135}">
          </div>
        </div>
      </div>

      <!-- LAYERS: Adicionar -->
      <div class="pc-section">
        <div class="pc-section-head">✦ Adicionar Elemento</div>
        <div class="pc-btn-group">
          <button class="pc-btn primary" id="pcAddText" style="flex:1;">T+ Texto</button>
          <label class="pc-btn primary" style="flex:1; cursor:pointer; justify-content:center;">
            🖼 Foto
            <input type="file" accept=".jpg,.jpeg,.png" id="pcAddImageInput" multiple style="display:none;">
          </label>
        </div>
      </div>

      <!-- PROPS LAYER SELECIONADO -->
      <div id="pc-layer-props" class="pc-section" style="display:none;">
        <div class="pc-section-head">⚙️ Propriedades</div>
        <div id="pc-layer-props-content"></div>
      </div>

      <!-- LISTA DE LAYERS -->
      <div class="pc-section">
        <div class="pc-section-head">
          <span>Camadas</span>
          <span style="font-size:0.6rem; color:#4b5563; font-weight:400;">Arraste p/ reordenar · 2× renomear</span>
        </div>
        <div id="pc-layer-list" style="padding:0.35rem 0; min-height:2rem;"></div>
      </div>

      <!-- SALVAR -->
      <div style="padding:0.75rem;">
        <button class="pc-btn success" id="pcSaveBtn" style="width:100%; font-size:0.875rem; padding:0.6rem;">
          💾 Salvar Portfólio
        </button>
      </div>

    </div>
  `;

  const canvasEditor = _portfolioCanvasEditor;
  if (!canvasEditor) return;


  // ── Background tabs ───────────────────────────────────────────────────────
  function switchBgTab(type) {
    _portfolioBgState.type = type;
    container.querySelectorAll('[data-bg-tab]').forEach(t => {
      t.classList.toggle('active', t.dataset.bgTab === type);
    });
    container.querySelector('#pc-bg-none').style.display = type === 'none' ? 'block' : 'none';
    container.querySelector('#pc-bg-image').style.display = type === 'image' ? 'flex' : 'none';
    container.querySelector('#pc-bg-solid').style.display = type === 'solid' ? 'flex' : 'none';
    container.querySelector('#pc-bg-gradient').style.display = type === 'gradient' ? 'flex' : 'none';
    _applyBgToCanvas(canvasEditor, _portfolioBgState);
    window._meuSitePostPreview?.();
  }

  container.querySelectorAll('[data-bg-tab]').forEach(tab => {
    tab.onclick = () => switchBgTab(tab.dataset.bgTab);
  });

  // Overlay slider
  const overlaySlider = container.querySelector('#pcBgOverlay');
  const overlayVal = container.querySelector('#pcBgOverlayVal');
  if (overlaySlider) {
    overlaySlider.oninput = () => {
      _portfolioBgState.overlayOpacity = parseInt(overlaySlider.value);
      if (overlayVal) overlayVal.textContent = overlaySlider.value + '%';
      _applyBgToCanvas(canvasEditor, _portfolioBgState);
      window._meuSitePostPreview?.();
    };
  }

  // Upload fundo imagem
  container.querySelector('#pcBgImageUpload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, appState.authToken);
      _portfolioBgState.url = result.url;
      _portfolioBgState.type = 'image';
      const urlInput = container.querySelector('#pcBgImageUrl');
      if (urlInput) urlInput.value = result.url;
      switchBgTab('image');
      e.target.value = '';
    } catch (err) {
      window.showToast?.('Erro no upload: ' + err.message, 'error');
    }
  });

  // Cor sólida
  container.querySelector('#pcBgSolidColor')?.addEventListener('input', (e) => {
    _portfolioBgState.color = e.target.value;
    _applyBgToCanvas(canvasEditor, _portfolioBgState);
    window._meuSitePostPreview?.();
  });

  // Gradiente
  function updateGradient() {
    _portfolioBgState.gradColor1 = container.querySelector('#pcGradColor1')?.value || '#1a1a2e';
    _portfolioBgState.gradColor2 = container.querySelector('#pcGradColor2')?.value || '#16213e';
    _portfolioBgState.gradAngle = parseInt(container.querySelector('#pcGradAngle')?.value || '135');
    const angleValEl = container.querySelector('#pcGradAngleVal');
    if (angleValEl) angleValEl.textContent = _portfolioBgState.gradAngle + '°';
    _applyBgToCanvas(canvasEditor, _portfolioBgState);
    window._meuSitePostPreview?.();
  }
  container.querySelector('#pcGradColor1')?.addEventListener('input', updateGradient);
  container.querySelector('#pcGradColor2')?.addEventListener('input', updateGradient);
  container.querySelector('#pcGradAngle')?.addEventListener('input', updateGradient);

  // ── Adicionar texto ───────────────────────────────────────────────────────
  container.querySelector('#pcAddText')?.addEventListener('click', () => {
    const layers = canvasEditor.getLayers();
    const textCount = layers.filter(l => (l.type || 'text') === 'text').length;
    const id = 'pl_' + Date.now();
    canvasEditor.addLayer({
      id,
      type: 'text',
      text: 'Texto',
      name: `Texto ${textCount + 1}`,
      x: 50, y: 50,
      fontSize: 48,
      fontFamily: '',
      color: '#ffffff',
      fontWeight: 'bold',
      align: 'center',
      shadow: true,
      opacity: 100,
      presets: {},
    });
    _renderLayerList(container, canvasEditor);
  });

  // ── Adicionar imagens (múltiplas) ─────────────────────────────────────────
  container.querySelector('#pcAddImageInput')?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const btn = container.querySelector('#pcAddImageInput')?.closest('label');
    if (btn) btn.style.opacity = '0.6';
    let erros = 0;
    for (const file of files) {
      try {
        const result = await uploadImage(file, appState.authToken);
        const layers = canvasEditor.getLayers();
        const imgCount = layers.filter(l => l.type === 'image').length;
        canvasEditor.addLayer({
          id: 'pl_' + Date.now() + '_' + Math.random().toString(36).slice(2),
          type: 'image',
          url: result.url,
          name: `Foto ${imgCount + 1}`,
          x: 50, y: 50,
          width: 25,
          height: 30,
          rotation: 0,
          opacity: 100,
          borderRadius: 0,
          shadow: false,
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.5)',
          flipH: false,
          flipV: false,
          presets: {},
        });
        _renderLayerList(container, canvasEditor);
      } catch (err) {
        erros++;
      }
    }
    if (btn) btn.style.opacity = '';
    e.target.value = '';
    if (erros > 0) window.showToast?.(`${erros} foto(s) falharam no upload`, 'error');
    else window.showToast?.(`${files.length} foto(s) adicionada(s)!`, 'success');
  });

  // ── Salvar ────────────────────────────────────────────────────────────────
  container.querySelector('#pcSaveBtn')?.addEventListener('click', async () => {
    const btn = container.querySelector('#pcSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Salvando...';
    try {
      if (canvasEditor._saveCurrentPreset) {
        canvasEditor._saveCurrentPreset();
      }
      const layers = canvasEditor.getLayers();
      await syncPortfolioToSite(layers, _portfolioBgState);
      if (!appState.configData.siteContent) appState.configData.siteContent = {};
      if (!appState.configData.siteContent.portfolio) appState.configData.siteContent.portfolio = {};
      appState.configData.siteContent.portfolio.canvasLayers = layers;
      appState.configData.siteContent.portfolio.canvasBg = _portfolioBgState;
      window.showToast?.('Portfólio salvo!', 'success');
    } catch (err) {
      window.showToast?.('Erro ao salvar: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Salvar Portfólio';
    }
  });

  // Renderizar lista de layers
  _renderLayerList(container, canvasEditor);
}

// ── Lista de camadas ──────────────────────────────────────────────────────────
function _renderLayerList(container, canvasEditor) {
  const listEl = container.querySelector('#pc-layer-list');
  if (!listEl) return;

  const layers = canvasEditor.getLayers();
  const reversed = [...layers].reverse();

  if (reversed.length === 0) {
    listEl.innerHTML = '<p style="font-size:0.72rem; color:#4b5563; text-align:center; padding:0.5rem; margin:0;">Nenhuma camada. Adicione texto ou foto.</p>';
    return;
  }

  listEl.innerHTML = reversed.map((layer, i) => {
    const isFirst = i === 0;
    const isLast = i === reversed.length - 1;
    const icon = (layer.type || 'text') === 'image' ? '🖼' : 'T';
    const name = layer.name || (layer.type === 'image' ? `Foto ${i + 1}` : `Texto ${i + 1}`);
    const isSelected = canvasEditor.selectedId === layer.id;
    const badge = isFirst
      ? `<span style="font-size:0.55rem;color:#6366f1;background:#1e1b4b;padding:0.1rem 0.3rem;border-radius:2px;margin-left:2px;flex-shrink:0;">Frente</span>`
      : isLast
      ? `<span style="font-size:0.55rem;color:#6b7280;background:#1f2937;padding:0.1rem 0.3rem;border-radius:2px;margin-left:2px;flex-shrink:0;">Fundo</span>`
      : '';
    return `
      <div class="pc-layer-item${isSelected ? ' active' : ''}" draggable="true" data-layer-id="${layer.id}">
        <span class="layer-icon">${icon}</span>
        <span class="layer-name" title="${name}">${name}</span>
        ${badge}
        <span class="layer-del" data-del-layer="${layer.id}" title="Remover">✕</span>
      </div>
    `;
  }).join('');

  // Clique para selecionar
  listEl.querySelectorAll('.pc-layer-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.dataset.delLayer) return;
      const layerId = item.dataset.layerId;
      canvasEditor.selectLayer(layerId);
      _renderLayerList(container, canvasEditor);
      const layer = canvasEditor._getLayer(layerId);
      _renderPropsForLayer(container, layer, canvasEditor);
    });

    // Double-click para renomear
    item.addEventListener('dblclick', (e) => {
      if (e.target.dataset.delLayer) return;
      const layerId = item.dataset.layerId;
      const layer = canvasEditor._getLayer(layerId);
      if (!layer) return;
      const nameEl = item.querySelector('.layer-name');
      const currentName = layer.name || nameEl.textContent.trim();
      nameEl.contentEditable = 'true';
      nameEl.style.outline = '1px solid #3b82f6';
      nameEl.style.borderRadius = '2px';
      nameEl.focus();
      const range = document.createRange();
      range.selectNodeContents(nameEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      const finish = () => {
        const newName = nameEl.textContent.trim() || currentName;
        nameEl.contentEditable = 'false';
        nameEl.style.outline = '';
        layer.name = newName;
        _renderLayerList(container, canvasEditor);
      };
      nameEl.addEventListener('blur', finish, { once: true });
      nameEl.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); nameEl.blur(); }
        if (ev.key === 'Escape') { nameEl.textContent = currentName; nameEl.blur(); }
      });
    });
  });

  // Deletar camada
  listEl.querySelectorAll('[data-del-layer]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ok = await window.showConfirm?.('Remover esta camada?', { confirmText: 'Remover', danger: true });
      if (!ok) return;
      canvasEditor.removeLayer(btn.dataset.delLayer);
      _renderLayerList(container, canvasEditor);
      const propsEl = container.querySelector('#pc-layer-props');
      if (propsEl) propsEl.style.display = 'none';
    });
  });

  // Drag-to-reorder
  let draggedLayerId = null;
  listEl.querySelectorAll('.pc-layer-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedLayerId = item.dataset.layerId;
      item.style.opacity = '0.4';
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.style.opacity = '';
      draggedLayerId = null;
    });
    item.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!draggedLayerId || draggedLayerId === item.dataset.layerId) return;
      const curLayers = canvasEditor.getLayers();
      const reversedIds = [...curLayers].reverse().map(l => l.id);
      const fromIdx = reversedIds.indexOf(draggedLayerId);
      const toIdx = reversedIds.indexOf(item.dataset.layerId);
      if (fromIdx === -1 || toIdx === -1) return;
      reversedIds.splice(fromIdx, 1);
      reversedIds.splice(toIdx, 0, draggedLayerId);
      canvasEditor.reorderLayers([...reversedIds].reverse());
      _renderLayerList(container, canvasEditor);
    });
  });
}

// ── Propriedades da layer selecionada ─────────────────────────────────────────
function _renderPropsForLayer(container, layer, canvasEditor) {
  const propsSection = container.querySelector('#pc-layer-props');
  const propsContent = container.querySelector('#pc-layer-props-content');
  if (!propsSection || !propsContent) return;

  if (!layer) {
    propsSection.style.display = 'none';
    return;
  }

  propsSection.style.display = 'block';
  const type = layer.type || 'text';

  if (type === 'text') {
    propsContent.innerHTML = `
      <div class="pc-row">
        <span class="pc-label">Texto</span>
        <input type="text" class="pc-input" id="pcLayerText" value="${(layer.text || '').replace(/"/g, '&quot;').replace(/</g, '&lt;')}">
      </div>
      <div class="pc-row">
        <span class="pc-label">Cor</span>
        <input type="color" id="pcLayerColor" value="${layer.color || '#ffffff'}" style="width:100%;height:32px;border:1px solid #374151;border-radius:4px;background:none;cursor:pointer;">
      </div>
      <div class="pc-row">
        <span class="pc-label">Tamanho: <span id="pcFontSizeVal">${layer.fontSize || 48}px</span></span>
        <input type="range" class="pc-range" id="pcFontSize" min="8" max="300" value="${layer.fontSize || 48}">
      </div>
      <div class="pc-row">
        <span class="pc-label">Fonte</span>
        <select class="pc-input" id="pcFontFamily">
          <option value="" ${!layer.fontFamily ? 'selected' : ''}>Padrão do Tema</option>
          <option value="'Playfair Display', serif" ${layer.fontFamily === "'Playfair Display', serif" ? 'selected' : ''}>Playfair Display</option>
          <option value="'Inter', sans-serif" ${layer.fontFamily === "'Inter', sans-serif" ? 'selected' : ''}>Inter</option>
          <option value="'Poppins', sans-serif" ${layer.fontFamily === "'Poppins', sans-serif" ? 'selected' : ''}>Poppins</option>
          <option value="'Montserrat', sans-serif" ${layer.fontFamily === "'Montserrat', sans-serif" ? 'selected' : ''}>Montserrat</option>
          <option value="'Lato', sans-serif" ${layer.fontFamily === "'Lato', sans-serif" ? 'selected' : ''}>Lato</option>
        </select>
      </div>
      <div class="pc-btn-group">
        <button class="pc-btn${layer.fontWeight === 'bold' ? ' primary' : ''}" id="pcBold" title="Negrito" style="font-weight:700;">B</button>
        <button class="pc-btn${layer.align === 'left' ? ' primary' : ''}" data-align="left" title="Esquerda">←</button>
        <button class="pc-btn${(layer.align || 'center') === 'center' ? ' primary' : ''}" data-align="center" title="Centro">≡</button>
        <button class="pc-btn${layer.align === 'right' ? ' primary' : ''}" data-align="right" title="Direita">→</button>
        <button class="pc-btn${layer.shadow !== false ? ' primary' : ''}" id="pcTextShadow" title="Sombra">☁</button>
      </div>
      <div class="pc-row">
        <span class="pc-label">Opacidade: <span id="pcOpacityVal">${layer.opacity ?? 100}%</span></span>
        <input type="range" class="pc-range" id="pcOpacity" min="0" max="100" value="${layer.opacity ?? 100}">
      </div>
    `;

    container.querySelector('#pcLayerText').oninput = (e) => {
      canvasEditor.updateLayer(layer.id, { text: e.target.value });
    };
    container.querySelector('#pcLayerColor').oninput = (e) => {
      canvasEditor.updateLayer(layer.id, { color: e.target.value });
    };
    container.querySelector('#pcFontSize').oninput = (e) => {
      container.querySelector('#pcFontSizeVal').textContent = e.target.value + 'px';
      canvasEditor.updateLayer(layer.id, { fontSize: parseInt(e.target.value) });
    };
    container.querySelector('#pcFontFamily').onchange = (e) => {
      canvasEditor.updateLayer(layer.id, { fontFamily: e.target.value });
    };
    container.querySelector('#pcBold').onclick = () => {
      const fw = layer.fontWeight === 'bold' ? 'normal' : 'bold';
      canvasEditor.updateLayer(layer.id, { fontWeight: fw });
      _renderPropsForLayer(container, canvasEditor._getLayer(layer.id), canvasEditor);
    };
    container.querySelectorAll('[data-align]').forEach(b => {
      b.onclick = () => {
        canvasEditor.updateLayer(layer.id, { align: b.dataset.align });
        _renderPropsForLayer(container, canvasEditor._getLayer(layer.id), canvasEditor);
      };
    });
    container.querySelector('#pcTextShadow').onclick = () => {
      canvasEditor.updateLayer(layer.id, { shadow: layer.shadow === false ? true : false });
      _renderPropsForLayer(container, canvasEditor._getLayer(layer.id), canvasEditor);
    };
    container.querySelector('#pcOpacity').oninput = (e) => {
      container.querySelector('#pcOpacityVal').textContent = e.target.value + '%';
      canvasEditor.updateLayer(layer.id, { opacity: parseInt(e.target.value) });
    };

  } else if (type === 'image') {
    propsContent.innerHTML = `
      <div class="pc-btn-group">
        <label class="pc-btn primary" style="flex:1; cursor:pointer; justify-content:center; font-size:0.72rem;">
          🔄 Trocar Foto
          <input type="file" accept=".jpg,.jpeg,.png" id="pcLayerImgReplace" style="display:none;">
        </label>
      </div>
      <div class="pc-row">
        <span class="pc-label">Opacidade: <span id="pcImgOpacityVal">${layer.opacity ?? 100}%</span></span>
        <input type="range" class="pc-range" id="pcImgOpacity" min="0" max="100" value="${layer.opacity ?? 100}">
      </div>
      <div class="pc-row">
        <span class="pc-label">Bordas: <span id="pcBorderRadiusVal">${layer.borderRadius || 0}px</span></span>
        <input type="range" class="pc-range" id="pcBorderRadius" min="0" max="100" value="${layer.borderRadius || 0}">
      </div>
      <div class="pc-section-head" style="padding:0.4rem 0.75rem 0.2rem;">Sombra</div>
      <div style="padding:0 0.75rem 0.5rem;">
        <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-size:0.75rem;color:#d1d5db;margin-bottom:0.35rem;">
          <input type="checkbox" id="pcShadowEnabled" ${layer.shadow ? 'checked' : ''}>
          Ativar sombra
        </label>
        <div id="pcShadowOptions" style="display:${layer.shadow ? 'flex' : 'none'};flex-direction:column;gap:0.3rem;">
          <div class="pc-row" style="padding:0;">
            <span class="pc-label">Intensidade: <span id="pcShadowBlurVal">${layer.shadowBlur || 10}px</span></span>
            <input type="range" class="pc-range" id="pcShadowBlur" min="0" max="60" value="${layer.shadowBlur || 10}">
          </div>
          <div class="pc-row" style="padding:0;">
            <span class="pc-label">Cor da Sombra</span>
            <input type="color" id="pcShadowColor" value="${_shadowColorToHex(layer.shadowColor || 'rgba(0,0,0,0.5)')}" style="width:100%;height:28px;border:1px solid #374151;border-radius:4px;background:none;cursor:pointer;">
          </div>
        </div>
      </div>
      <div class="pc-btn-group">
        <button class="pc-btn${layer.flipH ? ' primary' : ''}" id="pcFlipH" title="Espelhar horizontal">↔ H</button>
        <button class="pc-btn${layer.flipV ? ' primary' : ''}" id="pcFlipV" title="Espelhar vertical">↕ V</button>
      </div>
    `;

    container.querySelector('#pcImgOpacity').oninput = (e) => {
      container.querySelector('#pcImgOpacityVal').textContent = e.target.value + '%';
      canvasEditor.updateLayer(layer.id, { opacity: parseInt(e.target.value) });
    };
    container.querySelector('#pcBorderRadius').oninput = (e) => {
      container.querySelector('#pcBorderRadiusVal').textContent = e.target.value + 'px';
      canvasEditor.updateLayer(layer.id, { borderRadius: parseInt(e.target.value) });
    };

    // Sombra
    const shadowCheck = container.querySelector('#pcShadowEnabled');
    const shadowOptions = container.querySelector('#pcShadowOptions');
    shadowCheck.onchange = () => {
      shadowOptions.style.display = shadowCheck.checked ? 'flex' : 'none';
      canvasEditor.updateLayer(layer.id, { shadow: shadowCheck.checked });
      _applyShadowToLayer(canvasEditor, layer.id);
    };
    container.querySelector('#pcShadowBlur').oninput = (e) => {
      container.querySelector('#pcShadowBlurVal').textContent = e.target.value + 'px';
      canvasEditor.updateLayer(layer.id, { shadowBlur: parseInt(e.target.value) });
      _applyShadowToLayer(canvasEditor, layer.id);
    };
    container.querySelector('#pcShadowColor').oninput = (e) => {
      const rgba = _hexToRgba(e.target.value, 0.5);
      canvasEditor.updateLayer(layer.id, { shadowColor: rgba });
      _applyShadowToLayer(canvasEditor, layer.id);
    };

    container.querySelector('#pcFlipH').onclick = () => {
      canvasEditor.updateLayer(layer.id, { flipH: !layer.flipH });
      _renderPropsForLayer(container, canvasEditor._getLayer(layer.id), canvasEditor);
    };
    container.querySelector('#pcFlipV').onclick = () => {
      canvasEditor.updateLayer(layer.id, { flipV: !layer.flipV });
      _renderPropsForLayer(container, canvasEditor._getLayer(layer.id), canvasEditor);
    };

    container.querySelector('#pcLayerImgReplace').onchange = async (e) => {
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

    // Aplicar sombra inicial
    _applyShadowToLayer(canvasEditor, layer.id);
  }
}

// ── Sombra nas imagens ────────────────────────────────────────────────────────
function _applyShadowToLayer(canvasEditor, layerId) {
  const layer = canvasEditor._getLayer(layerId);
  if (!layer || layer.type !== 'image') return;
  const el = canvasEditor.layersEl?.querySelector(`[data-hc-layer="${layerId}"]`);
  if (!el) return;
  if (layer.shadow) {
    const blur = layer.shadowBlur || 10;
    const color = layer.shadowColor || 'rgba(0,0,0,0.5)';
    el.style.filter = `drop-shadow(0px 4px ${blur}px ${color})`;
  } else {
    el.style.filter = '';
  }
}

// ── Utilitários de cor ────────────────────────────────────────────────────────
function _shadowColorToHex(rgba) {
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return '#000000';
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

function _hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Retorna o estado atual do canvas para preview/save
 */
export function getPortfolioCanvasState() {
  if (!_portfolioCanvasEditor) return null;
  if (_portfolioCanvasEditor._saveCurrentPreset) {
    _portfolioCanvasEditor._saveCurrentPreset();
  }
  const layers = _portfolioCanvasEditor.getLayers();
  return { layers, bg: _portfolioBgState };
}

/**
 * Destrói o canvas (chamado ao sair do builder mode)
 */
export function destroyPortfolioCanvas() {
  if (_portfolioCanvasEditor) {
    _portfolioCanvasEditor.destroy();
    _portfolioCanvasEditor = null;
  }
  const el = document.getElementById('portfolio-canvas-container');
  if (el) el.remove();
}
