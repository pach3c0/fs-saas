/**
 * Tab: Portfólio — Versão Simplificada (Geral-Site Pattern)
 * Gerenciamento de galeria de fotos com preview real no iframe.
 */

import { appState, saveAppData } from '../state.js';
import { resolveImagePath } from '../utils/helpers.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';

/**
 * Renderiza a interface de portfólio no painel lateral
 */
export function renderPortfolio(container) {
  // Garantir estrutura inicial
  if (!appState.appData.portfolio) {
    appState.appData.portfolio = { photos: [] };
  }
  
  // Migração de dados legados (se houver canvasLayers mas não photos)
  if (appState.appData.portfolio.photos.length === 0 && appState.appData.portfolio.canvasLayers?.length > 0) {
    appState.appData.portfolio.photos = appState.appData.portfolio.canvasLayers
      .filter(l => l.type === 'image' && l.url)
      .map(l => ({ url: l.url }));
  }

  const portfolio = appState.appData.portfolio;

  // Estilos específicos para o portfólio simplificado
  const styles = `
    <style>
      .p-grid { 
        display: grid; 
        grid-template-columns: repeat(3, 1fr); 
        gap: 8px; 
      }
      .p-item { 
        position: relative; 
        aspect-ratio: 1/1; 
        border-radius: 6px; 
        overflow: hidden; 
        background: #1a1a1b; 
        border: 1px solid #333; 
        cursor: grab;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .p-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      .p-item:active { cursor: grabbing; opacity: 0.7; }
      .p-item img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
      .p-item .p-del { 
        position: absolute; 
        top: 4px; 
        right: 4px; 
        background: rgba(220, 38, 38, 0.9); 
        color: white; 
        width: 22px; 
        height: 22px; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: 14px; 
        cursor: pointer; 
        opacity: 0; 
        transition: opacity 0.2s;
        z-index: 10;
        border: none;
      }
      .p-item:hover .p-del { opacity: 1; }
      .p-empty { 
        padding: 40px 20px; 
        text-align: center; 
        color: #6b7280; 
        font-size: 0.85rem; 
        grid-column: span 3;
        background: rgba(0,0,0,0.2);
        border: 1px dashed #374151;
        border-radius: 8px;
      }
      .p-header { padding: 1rem 0; border-bottom: 1px solid #374151; margin-bottom: 1.5rem; }
      .p-btn-upload { 
        background: #2563eb; 
        color: white; 
        padding: 0.75rem; 
        border-radius: 0.375rem; 
        font-size: 0.875rem; 
        font-weight: 600; 
        cursor: pointer; 
        text-align: center; 
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        width: 100%; 
        transition: background 0.2s;
      }
      .p-btn-upload:hover { background: #1d4ed8; }
      .p-btn-clear { 
        background: transparent; 
        color: #ef4444; 
        border: 1px solid rgba(239, 68, 68, 0.3); 
        padding: 0.5rem; 
        border-radius: 0.375rem; 
        font-size: 0.75rem; 
        cursor: pointer; 
        margin-top: 2rem; 
        width: 100%; 
        transition: all 0.2s;
      }
      .p-btn-clear:hover { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; }
    </style>
  `;

  container.innerHTML = `
    ${styles}
    <div style="display:flex; flex-direction:column; min-height:100%; padding-bottom: 2rem;">
      <div class="p-header">
        <h2 style="font-size:1.1rem; font-weight:bold; color:#f3f4f6; margin:0;">Galeria de Portfólio</h2>
        <p style="font-size:0.75rem; color:#9ca3af; margin:0.25rem 0 0;">Arraste para reordenar as fotos no site real.</p>
      </div>

      <div style="flex: 1;">
        <label class="p-btn-upload">
          <span class="material-symbols-outlined" style="font-size: 20px;">add_photo_alternate</span>
          Carregar Fotos
          <input type="file" id="pUploadInput" multiple accept="image/*" style="display:none;">
        </label>
        <div id="pUploadProgress"></div>

        <div id="pPhotoGrid" class="p-grid" style="margin-top: 1.5rem;">
          <!-- Fotos aqui -->
        </div>

        <button id="pClearBtn" class="p-btn-clear">
          Remover Todas as Fotos
        </button>
      </div>
    </div>
  `;

  renderPhotos(container);
  setupEvents(container);
}

function renderPhotos(container) {
  const grid = container.querySelector('#pPhotoGrid');
  const clearBtn = container.querySelector('#pClearBtn');
  const portfolio = appState.appData.portfolio;
  const photos = portfolio.photos || [];
  
  if (photos.length === 0) {
    grid.innerHTML = '<div class="p-empty">Nenhuma foto adicionada. Clique acima para subir seus trabalhos!</div>';
    clearBtn.style.display = 'none';
    return;
  }

  clearBtn.style.display = 'block';
  grid.innerHTML = photos.map((photo, index) => `
    <div class="p-item" draggable="true" data-index="${index}">
      <img src="${resolveImagePath(photo.url)}" alt="Foto ${index + 1}">
      <button class="p-del" data-index="${index}" title="Remover foto">✕</button>
    </div>
  `).join('');
}

function setupEvents(container) {
  const uploadInput = container.querySelector('#pUploadInput');
  const clearBtn = container.querySelector('#pClearBtn');
  const grid = container.querySelector('#pPhotoGrid');

  uploadInput.onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    let successCount = 0;
    for (const file of files) {
      try {
        const result = await uploadImage(file, appState.authToken, (p) => {
          showUploadProgress('pUploadProgress', p);
        });
        
        if (!appState.appData.portfolio.photos) appState.appData.portfolio.photos = [];
        appState.appData.portfolio.photos.push({ url: result.url });
        successCount++;
        
        // Atualiza preview em tempo real e lista
        window._meuSitePostPreview?.();
        renderPhotos(container);
      } catch (err) {
        console.error('Erro no upload:', err);
        window.showToast?.('Erro ao subir arquivo: ' + file.name, 'error');
      }
    }

    if (successCount > 0) {
      saveAppData('portfolio', appState.appData.portfolio, true);
    }
    uploadInput.value = '';
  };

  clearBtn.onclick = async () => {
    const ok = await window.showConfirm?.('Tem certeza que deseja remover TODAS as fotos do portfólio?', { 
      title: 'Limpar Portfólio',
      confirmText: 'Sim, remover tudo',
      danger: true 
    });
    if (!ok) return;

    appState.appData.portfolio.photos = [];
    renderPhotos(container);
    window._meuSitePostPreview?.();
    saveAppData('portfolio', appState.appData.portfolio);
  };

  // Clique para deletar individual
  grid.onclick = (e) => {
    const delBtn = e.target.closest('.p-del');
    if (delBtn) {
      const idx = parseInt(delBtn.dataset.index);
      appState.appData.portfolio.photos.splice(idx, 1);
      renderPhotos(container);
      window._meuSitePostPreview?.();
      saveAppData('portfolio', appState.appData.portfolio, true);
    }
  };

  // Lógica de Reordenação (Drag and Drop)
  let draggedIdx = null;

  grid.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.p-item');
    if (item) {
      draggedIdx = parseInt(item.dataset.index);
      item.style.opacity = '0.5';
      e.dataTransfer.effectAllowed = 'move';
    }
  });

  grid.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  grid.addEventListener('drop', (e) => {
    e.preventDefault();
    const item = e.target.closest('.p-item');
    if (item && draggedIdx !== null) {
      const dropIdx = parseInt(item.dataset.index);
      if (draggedIdx !== dropIdx) {
        const photos = appState.appData.portfolio.photos;
        const [moved] = photos.splice(draggedIdx, 1);
        photos.splice(dropIdx, 0, moved);
        
        renderPhotos(container);
        window._meuSitePostPreview?.();
        saveAppData('portfolio', appState.appData.portfolio, true);
      }
    }
  });

  grid.addEventListener('dragend', (e) => {
    const item = grid.querySelector(`[data-index="${draggedIdx}"]`);
    if (item) item.style.opacity = '1';
    draggedIdx = null;
  });
}
