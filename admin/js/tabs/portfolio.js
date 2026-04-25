/**
 * Tab: Portfólio
 * Gerenciamento de galeria de fotos com preview em tempo real no iframe.
 */

import { apiGet, apiPut } from '../utils/api.js';
import { resolveImagePath } from '../utils/helpers.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';

async function savePortfolio(silent = false) {
  const ok = await apiPut('/api/site/admin/config', {
    siteContent: { portfolio: { photos: _portfolioPhotos, gridStyle: _gridStyle } }
  });
  if (!silent && ok !== false) window.showToast?.('Portfólio salvo!', 'success');
  return ok;
}


// Estado local isolado do SiteData legado
let _portfolioPhotos = null;
let _gridStyle = 'standard';

function ensurePortfolio() {
  if (!Array.isArray(_portfolioPhotos)) _portfolioPhotos = [];
}

export async function renderPortfolio(container) {
  // Carregar de siteContent (onde o site público lê), isolado do SiteData legado
  try {
    const config = await apiGet('/api/site/admin/config');
    _portfolioPhotos = config?.siteContent?.portfolio?.photos || [];
    _gridStyle = config?.siteContent?.portfolio?.gridStyle || 'standard';
  } catch (_) {
    if (!Array.isArray(_portfolioPhotos)) _portfolioPhotos = [];
  }
  ensurePortfolio();

  // Estado local para seleção em massa
  container._selectedIndices = new Set();

  container.innerHTML = `
    <style>
      .p-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
      .p-item {
        position: relative; aspect-ratio: 16/9; border-radius: 6px; overflow: hidden;
        background: var(--bg-elevated); border: 1px solid var(--border); cursor: grab;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .p-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
      .p-item img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
      
      /* Botões de ação na foto */
      .p-actions {
        position: absolute; top: 4px; right: 4px; left: 4px;
        display: flex; justify-content: space-between; align-items: flex-start;
        opacity: 0; transition: opacity 0.2s; z-index: 10;
      }
      .p-item:hover .p-actions { opacity: 1; }
      
      .p-action-btn {
        width: 24px; height: 24px; border-radius: 50%; border: none;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; cursor: pointer; color: white; transition: transform 0.1s;
      }
      .p-action-btn:active { transform: scale(0.9); }
      .p-btn-del { background: rgba(220,38,38,0.9); }
      .p-btn-edit { background: rgba(37,99,235,0.9); }
      .p-btn-check { 
        position: absolute; bottom: 4px; left: 4px; width: 20px; height: 20px; 
        background: var(--bg-surface); border: 2px solid var(--border); border-radius: 4px;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
        opacity: 0; transition: all 0.2s; z-index: 10;
      }
      .p-item:hover .p-btn-check, .p-item.selected .p-btn-check { opacity: 1; }
      .p-item.selected .p-btn-check { background: var(--accent); border-color: var(--accent); }
      .p-item.selected { border-color: var(--accent); border-width: 2px; }

      .p-empty {
        padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem;
        grid-column: span 3; background: rgba(0,0,0,0.2);
        border: 1px dashed var(--border); border-radius: 8px;
      }

      /* Overlay de Legenda */
      .p-edit-overlay {
        position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.85);
        padding: 8px; transform: translateY(100%); transition: transform 0.3s;
        display: flex; flex-direction: column; gap: 4px; z-index: 20;
      }
      .p-item.editing .p-edit-overlay { transform: translateY(0); }
      .p-edit-input {
        background: #111; border: 1px solid #444; color: white; font-size: 0.7rem;
        padding: 4px; border-radius: 4px; width: 100%; box-sizing: border-box;
      }

      /* Barra de Ações em Massa */
      #pBulkActions {
        display: none; position: sticky; bottom: 1rem; left: 0; right: 0;
        background: var(--accent); color: white; padding: 0.75rem 1rem;
        border-radius: 0.5rem; justify-content: space-between; align-items: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5); z-index: 100; margin-top: 1rem;
      }
    </style>

    <div style="padding-bottom:2rem; position:relative;">
      <div style="padding:1rem 0; border-bottom:1px solid var(--border); margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h2 style="font-size:1.1rem; font-weight:bold; color:var(--text-primary); margin:0;">Galeria de Portfólio</h2>
          <p style="font-size:0.75rem; color:var(--text-secondary); margin:0.25rem 0 0;">Editor Avançado: Posição, Zoom e Formato Misto</p>
        </div>
        
        <div style="display:flex; gap:0.25rem; background:var(--bg-surface); padding:0.25rem; border-radius:0.375rem; border:1px solid var(--border);">
          <button id="styleStandardBtn" class="btn ${_gridStyle === \'standard\' ? \'btn-primary\' : \'btn-ghost\'}">Padrão</button>
          <button id="styleMixedBtn" class="btn ${_gridStyle === \'mixed\' ? \'btn-primary\' : \'btn-ghost\'}">Misto (Dinâmico)</button>
        </div>
      </div>

      <label style="background:var(--accent); color:white; padding:0.75rem; border-radius:0.375rem;
                    font-size:0.875rem; font-weight:600; cursor:pointer; display:flex;
                    align-items:center; justify-content:center; gap:0.5rem; width:100%; box-sizing:border-box;">
        <span class="material-symbols-outlined" style="font-size:20px;">add_photo_alternate</span>
        Carregar Fotos
        <input type="file" id="pUploadInput" multiple accept="image/*" style="display:none;">
      </label>
      <div id="pUploadProgress"></div>

      <div id="pPhotoGrid" class="p-grid" style="margin-top:1.5rem;"></div>

      <div id="pBulkActions">
        <span id="pBulkCount" style="font-size:0.85rem; font-weight:600;">0 selecionadas</span>
        <div style="display:flex; gap:0.5rem;">
          <button id="pBulkCancelBtn" class="btn btn-ghost" style="color:white;">Limpar</button>
          <button id="pBulkDelBtn" class="btn btn-danger" style="background:var(--red); color:white; border-color:var(--red);">Excluir</button>
        </div>
      </div>

      <button id="pClearBtn" class="btn btn-danger" style="display:none; margin-top:2rem; width:100%;">
        Remover Todas as Fotos
      </button>
    </div>
  `;

  renderPhotos(container);
  setupEvents(container);
}

function renderPhotos(container) {
  const grid = container.querySelector('#pPhotoGrid');
  const clearBtn = container.querySelector('#pClearBtn');
  const bulkBar = container.querySelector('#pBulkActions');
  const bulkCount = container.querySelector('#pBulkCount');
  const photos = _portfolioPhotos || [];
  const selected = container._selectedIndices || new Set();

  if (photos.length === 0) {
    grid.innerHTML = '<div class="p-empty">Nenhuma foto no portfólio. Envie a primeira para começar.</div>';
    clearBtn.style.display = 'none';
    bulkBar.style.display = 'none';
    return;
  }

  clearBtn.style.display = (selected.size === 0) ? 'block' : 'none';
  bulkBar.style.display = (selected.size > 0) ? 'flex' : 'none';
  bulkCount.textContent = `${selected.size} selecionada${selected.size > 1 ? 's' : ''}`;

  grid.innerHTML = photos.map((photo, i) => {
    const isSelected = selected.has(i);
    const transform = photo.transform || { scale: 1, x: 50, y: 50 };
    return `
      <div class="p-item ${isSelected ? 'selected' : ''}" draggable="${selected.size === 0}" data-index="${i}">
        <img src="${resolveImagePath(photo.url)}" alt="Foto ${i + 1}" loading="lazy" style="object-position:${transform.x}% ${transform.y}%; transform:scale(${transform.scale});">
        
        <div class="p-btn-check">
          <span class="material-symbols-outlined" style="font-size:16px; color:white;">${isSelected ? 'check' : ''}</span>
        </div>

        <div class="p-actions">
          <button class="p-action-btn p-btn-edit" data-index="${i}" title="Editar Imagem e Legenda">
            <span class="material-symbols-outlined" style="font-size:16px;">edit</span>
          </button>
          <button class="p-action-btn p-btn-del" data-index="${i}" title="Remover foto">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function setupEvents(container) {
  const uploadInput = container.querySelector('#pUploadInput');
  const clearBtn = container.querySelector('#pClearBtn');
  const grid = container.querySelector('#pPhotoGrid');
  const bulkDelBtn = container.querySelector('#pBulkDelBtn');
  const bulkCancelBtn = container.querySelector('#pBulkCancelBtn');

  const updateAndSave = () => {
    renderPhotos(container);
    if (appState.configData && appState.configData.siteContent) {
      appState.configData.siteContent.portfolio = {
        photos: _portfolioPhotos,
        gridStyle: _gridStyle
      };
    }
    window._meuSitePostPreview?.();
    savePortfolio();
  };

  uploadInput.onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const results = await Promise.allSettled(
      files.map(file => uploadImage(file, appState.authToken, (p) => showUploadProgress('pUploadProgress', p)))
    );

    ensurePortfolio();
    let uploaded = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        _portfolioPhotos.push({ 
          url: r.value.url, 
          caption: '', 
          format: '16/9', 
          transform: { scale: 1, x: 50, y: 50 } 
        });
        uploaded++;
      } else {
        window.showToast?.('Erro ao subir uma foto', 'error');
      }
    }

    if (uploaded > 0) updateAndSave();
    uploadInput.value = '';
  };

  clearBtn.onclick = async () => {
    const ok = await window.showConfirm?.('Remover TODAS as fotos do portfólio?', {
      title: 'Limpar Portfólio', confirmText: 'Remover Tudo', danger: true
    });
    if (!ok) return;
    ensurePortfolio();
    _portfolioPhotos = [];
    updateAndSave();
  };

  // Clique delegado no Grid
  grid.onclick = async (e) => {
    const target = e.target;
    const item = target.closest('.p-item');
    if (!item) return;

    const idx = parseInt(item.dataset.index);

    // 1. Botão Deletar Individual
    const delBtn = target.closest('.p-btn-del');
    if (delBtn) {
      const ok = await window.showConfirm?.('Deseja remover esta foto?', { danger: true });
      if (ok) {
        ensurePortfolio();
        _portfolioPhotos.splice(idx, 1);
        container._selectedIndices?.delete(idx);
        updateAndSave();
      }
      return;
    }

    // 2. Botão Selecionar (Checkbox)
    const checkBtn = target.closest('.p-btn-check');
    if (checkBtn) {
      if (container._selectedIndices.has(idx)) {
        container._selectedIndices.delete(idx);
      } else {
        container._selectedIndices.add(idx);
      }
      renderPhotos(container);
      return;
    }

    // 3. Botão Editar Legenda / Imagem (Abre Modal)
    const editBtn = target.closest('.p-btn-edit');
    if (editBtn) {
      openPhotoEditor(idx, container);
      return;
    }
  };

  // Botões de Estilo do Grid
  const styleStandardBtn = container.querySelector('#styleStandardBtn');
  const styleMixedBtn = container.querySelector('#styleMixedBtn');
  
  if (styleStandardBtn) {
    styleStandardBtn.onclick = () => {
      _gridStyle = 'standard';
      updateAndSave();
      styleStandardBtn.style.background = 'var(--accent)';
      styleStandardBtn.style.color = 'white';
      styleMixedBtn.style.background = 'transparent';
      styleMixedBtn.style.color = 'var(--text-secondary)';
    };
  }
  
  if (styleMixedBtn) {
    styleMixedBtn.onclick = () => {
      _gridStyle = 'mixed';
      updateAndSave();
      styleMixedBtn.style.background = 'var(--accent)';
      styleMixedBtn.style.color = 'white';
      styleStandardBtn.style.background = 'transparent';
      styleStandardBtn.style.color = 'var(--text-secondary)';
    };
  }

  // Auto-saves delegados foram movidos para a Modal

  // Ações em Massa
  bulkCancelBtn.onclick = () => {
    container._selectedIndices.clear();
    renderPhotos(container);
  };

  bulkDelBtn.onclick = async () => {
    const count = container._selectedIndices.size;
    const ok = await window.showConfirm?.(`Remover as ${count} fotos selecionadas?`, { danger: true });
    if (!ok) return;

    // Filtrar fotos que NÃO estão nos selecionados
    ensurePortfolio();
    const newPhotos = _portfolioPhotos.filter((_, i) => !container._selectedIndices.has(i));
    _portfolioPhotos = newPhotos;
    container._selectedIndices.clear();
    updateAndSave();
  };

  // Reordenação (apenas se nada estiver selecionado/editando)
  let draggedIdx = null;

  grid.addEventListener('dragstart', (e) => {
    if (container._selectedIndices?.size > 0) { e.preventDefault(); return; }
    const item = e.target.closest('.p-item');
    if (!item || item.classList.contains('editing')) return;
    draggedIdx = parseInt(item.dataset.index);
    item.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
  });

  grid.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  grid.addEventListener('drop', (e) => {
    e.preventDefault();
    const item = e.target.closest('.p-item');
    if (!item || draggedIdx === null) return;
    const dropIdx = parseInt(item.dataset.index);
    if (draggedIdx === dropIdx) return;
    
    ensurePortfolio();
    const photos = _portfolioPhotos;
    const [moved] = photos.splice(draggedIdx, 1);
    photos.splice(dropIdx, 0, moved);
    
    draggedIdx = null;
    updateAndSave();
  });

  grid.addEventListener('dragend', () => {
    draggedIdx = null;
  });
}

function openPhotoEditor(idx, container) {
  const photo = _portfolioPhotos[idx];
  if (!photo.transform) photo.transform = { scale: 1, x: 50, y: 50 };
  if (!photo.format) photo.format = '16/9';
  
  const modal = document.createElement('div');
  modal.id = 'pPhotoModal';
  modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:9999; display:flex; align-items:center; justify-content:center; padding:1rem; backdrop-filter:blur(4px);';
  
  modal.innerHTML = `
    <style>
      .p-modal-body { display:flex; flex:1; overflow:hidden; flex-direction:column; }
      @media (min-width: 768px) { .p-modal-body { flex-direction:row; } }
      .p-modal-preview { flex:1; background:#000; padding:1.5rem; display:flex; align-items:center; justify-content:center; position:relative; min-height:300px; overflow:hidden; }
      .p-modal-controls { width:100%; padding:1.5rem; overflow-y:auto; display:flex; flex-direction:column; gap:1.5rem; }
      @media (min-width: 768px) { .p-modal-controls { width:320px; border-left:1px solid var(--border); } }
      #pModalPreviewWrapper { max-width:100%; max-height:100%; width:100%; aspect-ratio:16/9; overflow:hidden; border:2px solid var(--border); border-radius:8px; transition:aspect-ratio 0.3s, width 0.3s, height 0.3s; }
      /* Usa object-fit nativo da div com auto pra não forçar 100% quando estourar altura */
      .aspect-fit { width:auto !important; height:auto !important; min-width:0; min-height:0; }
    </style>
    <div style="background:var(--bg-surface); width:100%; max-width:1200px; height:90vh; border-radius:0.75rem; border:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden;">
      <div style="padding:1rem 1.5rem; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:var(--bg-elevated); flex-shrink:0;">
        <h3 style="margin:0; font-size:1.1rem; color:white;">Editar Foto</h3>
        <button id="pModalClose" class="btn btn-ghost btn-sm"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      
      <div class="p-modal-body">
        <!-- Preview area -->
        <div class="p-modal-preview">
          <div id="pModalPreviewWrapper" class="aspect-fit" style="aspect-ratio:${photo.format === '9/16' ? '9/16' : photo.format === '1/1' ? '1/1' : '16/9'};">
            <img id="pModalImg" src="${resolveImagePath(photo.url)}" style="width:100%; height:100%; object-fit:cover; object-position:${photo.transform.x}% ${photo.transform.y}%; transform:scale(${photo.transform.scale});">
          </div>
        </div>
        
        <!-- Controls area -->
        <div class="p-modal-controls">
          
          <div style="${_gridStyle === 'standard' ? 'display:none;' : ''}">
            <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem;">Formato no Grid Misto</label>
            <div style="display:flex; gap:0.5rem;">
              <button class="p-fmt-btn ${photo.format === '16/9' ? 'active' : ''}" data-fmt="16/9" style="flex:1; padding:0.5rem; background:var(--bg-elevated); border:1px solid ${photo.format === '16/9' ? 'var(--accent)' : 'var(--border)'}; border-radius:0.375rem; color:white; cursor:pointer;">16:9</button>
              <button class="p-fmt-btn ${photo.format === '9/16' ? 'active' : ''}" data-fmt="9/16" style="flex:1; padding:0.5rem; background:var(--bg-elevated); border:1px solid ${photo.format === '9/16' ? 'var(--accent)' : 'var(--border)'}; border-radius:0.375rem; color:white; cursor:pointer;">9:16</button>
              <button class="p-fmt-btn ${photo.format === '1/1' ? 'active' : ''}" data-fmt="1/1" style="flex:1; padding:0.5rem; background:var(--bg-elevated); border:1px solid ${photo.format === '1/1' ? 'var(--accent)' : 'var(--border)'}; border-radius:0.375rem; color:white; cursor:pointer;">1:1</button>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
              <label style="font-size:0.75rem; color:var(--text-secondary);">Zoom (<span id="pValZoom">${photo.transform.scale}</span>x)</label>
            </div>
            <input type="range" id="pSliderZoom" min="1" max="3" step="0.1" value="${photo.transform.scale}" style="width:100%;">
          </div>
          
          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
              <label style="font-size:0.75rem; color:var(--text-secondary);">Posição X (<span id="pValX">${photo.transform.x}</span>%)</label>
            </div>
            <input type="range" id="pSliderX" min="0" max="100" step="1" value="${photo.transform.x}" style="width:100%;">
          </div>
          
          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
              <label style="font-size:0.75rem; color:var(--text-secondary);">Posição Y (<span id="pValY">${photo.transform.y}</span>%)</label>
            </div>
            <input type="range" id="pSliderY" min="0" max="100" step="1" value="${photo.transform.y}" style="width:100%;">
          </div>
          
          <div style="margin-top:auto;">
            <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem;">Legenda (SEO)</label>
            <input type="text" id="pInputCaption" class="input" value="${photo.caption || ''}" placeholder="Descreva a foto...">
          </div>
          
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const img = modal.querySelector('#pModalImg');
  const wrapper = modal.querySelector('#pModalPreviewWrapper');
  const zoomSlider = modal.querySelector('#pSliderZoom');
  const xSlider = modal.querySelector('#pSliderX');
  const ySlider = modal.querySelector('#pSliderY');
  const captionInput = modal.querySelector('#pInputCaption');
  
  const updateVisuals = () => {
    img.style.transform = `scale(${photo.transform.scale})`;
    img.style.objectPosition = `${photo.transform.x}% ${photo.transform.y}%`;
    
    // Atualiza a proporção e força redimensionamento flex
    const ratio = photo.format === '9/16' ? '9/16' : photo.format === '1/1' ? '1/1' : '16/9';
    wrapper.style.aspectRatio = ratio;
    
    // Se for 9/16 e tela pequena, precisamos garantir que a altura limite a largura nativamente
    // CSS moderno lida com isso através do flexbox se height: auto e max-height: 100%
    if (appState.configData && appState.configData.siteContent) {
      appState.configData.siteContent.portfolio = { photos: _portfolioPhotos, gridStyle: _gridStyle };
    }
    window._meuSitePostPreview?.();
  };

  zoomSlider.oninput = (e) => { photo.transform.scale = parseFloat(e.target.value); modal.querySelector('#pValZoom').textContent = photo.transform.scale; updateVisuals(); };
  xSlider.oninput = (e) => { photo.transform.x = parseInt(e.target.value); modal.querySelector('#pValX').textContent = photo.transform.x; updateVisuals(); };
  ySlider.oninput = (e) => { photo.transform.y = parseInt(e.target.value); modal.querySelector('#pValY').textContent = photo.transform.y; updateVisuals(); };
  captionInput.oninput = (e) => { 
    photo.caption = e.target.value; 
    if (appState.configData && appState.configData.siteContent) {
      appState.configData.siteContent.portfolio = { photos: _portfolioPhotos, gridStyle: _gridStyle };
    }
    window._meuSitePostPreview?.(); 
  };
  
  modal.querySelectorAll('.p-fmt-btn').forEach(btn => {
    btn.onclick = (e) => {
      modal.querySelectorAll('.p-fmt-btn').forEach(b => { b.style.borderColor = 'var(--border)'; });
      e.target.style.borderColor = 'var(--accent)';
      photo.format = e.target.dataset.fmt;
      updateVisuals();
      // Não precisa renderPhotos(container) até fechar, pois window._meuSitePostPreview atualiza o site.
      // Porém, o background da Modal esconde o preview. Quando fechar, renderizamos.
    };
  });

  const closeModal = () => {
    modal.remove();
    savePortfolio(true);
    renderPhotos(container);
  };

  modal.querySelector('#pModalClose').onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
}
