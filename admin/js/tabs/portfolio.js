/**
 * Tab: Portfólio
 * Gerenciamento de galeria de fotos com preview em tempo real no iframe.
 */

import { apiGet, apiPut } from '../utils/api.js';
import { resolveImagePath } from '../utils/helpers.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';

async function savePortfolio(silent = false) {
  const ok = await apiPut('/api/site/admin/config', {
    siteContent: { portfolio: { photos: _portfolioPhotos } }
  });
  if (!silent && ok !== false) window.showToast?.('Portfólio salvo!', 'success');
  return ok;
}


// Estado local isolado do SiteData legado
let _portfolioPhotos = null;

function ensurePortfolio() {
  if (!Array.isArray(_portfolioPhotos)) _portfolioPhotos = [];
}

export async function renderPortfolio(container) {
  // Carregar de siteContent (onde o site público lê), isolado do SiteData legado
  try {
    const config = await apiGet('/api/site/admin/config');
    _portfolioPhotos = config?.siteContent?.portfolio?.photos || [];
  } catch (_) {
    if (!Array.isArray(_portfolioPhotos)) _portfolioPhotos = [];
  }
  ensurePortfolio();

  // Estado local para seleção em massa
  container._selectedIndices = new Set();

  container.innerHTML = `
    <style>
      .p-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
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
      <div style="padding:1rem 0; border-bottom:1px solid var(--border); margin-bottom:1.5rem;">
        <h2 style="font-size:1.1rem; font-weight:bold; color:var(--text-primary); margin:0;">Galeria de Portfólio</h2>
        <p style="font-size:0.75rem; color:var(--text-secondary); margin:0.25rem 0 0;">Fase 2: Gestão de Legendas & Seleção em Massa</p>
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
          <button id="pBulkCancelBtn" style="background:rgba(255,255,255,0.2); border:none; color:white; padding:0.4rem 0.8rem; border-radius:0.25rem; cursor:pointer; font-size:0.75rem;">Limpar</button>
          <button id="pBulkDelBtn" style="background:#f85149; border:none; color:white; padding:0.4rem 0.8rem; border-radius:0.25rem; cursor:pointer; font-size:0.75rem; font-weight:bold;">Excluir</button>
        </div>
      </div>

      <button id="pClearBtn" style="display:none; background:transparent; color:var(--red);
              border:1px solid rgba(248,81,73,0.3); padding:0.5rem; border-radius:0.375rem;
              font-size:0.75rem; cursor:pointer; margin-top:2rem; width:100%;">
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
    grid.innerHTML = '<div class="p-empty">Nenhuma foto adicionada. Clique acima para subir seus trabalhos!</div>';
    clearBtn.style.display = 'none';
    bulkBar.style.display = 'none';
    return;
  }

  clearBtn.style.display = (selected.size === 0) ? 'block' : 'none';
  bulkBar.style.display = (selected.size > 0) ? 'flex' : 'none';
  bulkCount.textContent = `${selected.size} selecionada${selected.size > 1 ? 's' : ''}`;

  grid.innerHTML = photos.map((photo, i) => {
    const isSelected = selected.has(i);
    return `
      <div class="p-item ${isSelected ? 'selected' : ''}" draggable="${selected.size === 0}" data-index="${i}">
        <img src="${resolveImagePath(photo.url)}" alt="Foto ${i + 1}" loading="lazy">
        
        <div class="p-btn-check">
          <span class="material-symbols-outlined" style="font-size:16px; color:white;">${isSelected ? 'check' : ''}</span>
        </div>

        <div class="p-actions">
          <button class="p-action-btn p-btn-edit" data-index="${i}" title="Editar legenda">
            <span class="material-symbols-outlined" style="font-size:16px;">edit_note</span>
          </button>
          <button class="p-action-btn p-btn-del" data-index="${i}" title="Remover foto">✕</button>
        </div>

        <div class="p-edit-overlay">
          <input type="text" class="p-edit-input" placeholder="Legenda (SEO)..." value="${photo.caption || ''}" data-index="${i}">
          <div style="display:flex; justify-content:flex-end;">
            <span class="material-symbols-outlined p-edit-close" style="font-size:16px; color:#9ca3af; cursor:pointer;">expand_more</span>
          </div>
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
        _portfolioPhotos.push({ url: r.value.url, caption: '' });
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

    // 3. Botão Editar Legenda
    const editBtn = target.closest('.p-btn-edit');
    if (editBtn) {
      item.classList.toggle('editing');
      if (item.classList.contains('editing')) {
        item.querySelector('.p-edit-input').focus();
      }
      return;
    }

    // 4. Fechar Legenda
    if (target.closest('.p-edit-close')) {
      item.classList.remove('editing');
      return;
    }
  };

  // Input de Legenda (Auto-save ao digitar)
  grid.oninput = (e) => {
    if (e.target.classList.contains('p-edit-input')) {
      ensurePortfolio();
      const idx = parseInt(e.target.dataset.index);
      _portfolioPhotos[idx].caption = e.target.value;
      // Salvar com debounce seria ideal, mas saveAppData já é eficiente. 
      // Por ser SEO, salvar ao terminar de digitar é ok.
      window._meuSitePostPreview?.();
    }
  };
  
  // Salvar legenda efetivamente ao sair do campo
  grid.onchange = (e) => {
    if (e.target.classList.contains('p-edit-input')) {
      savePortfolio(true);
    }
  };

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
