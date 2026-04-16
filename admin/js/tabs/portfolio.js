/**
 * Tab: Portfólio
 * Gerenciamento de galeria de fotos com preview em tempo real no iframe.
 */

import { appState, saveAppData } from '../state.js';
import { resolveImagePath } from '../utils/helpers.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';

export function renderPortfolio(container) {
  if (!appState.appData.portfolio) {
    appState.appData.portfolio = { photos: [] };
  }

  container.innerHTML = `
    <style>
      .p-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .p-item {
        position: relative; aspect-ratio: 1/1; border-radius: 6px; overflow: hidden;
        background: var(--bg-elevated); border: 1px solid var(--border); cursor: grab;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .p-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
      .p-item img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
      .p-del {
        position: absolute; top: 4px; right: 4px;
        background: rgba(220,38,38,0.9); color: white;
        width: 22px; height: 22px; border-radius: 50%; border: none;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; cursor: pointer; opacity: 0; transition: opacity 0.2s; z-index: 10;
      }
      .p-item:hover .p-del { opacity: 1; }
      .p-empty {
        padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem;
        grid-column: span 3; background: rgba(0,0,0,0.2);
        border: 1px dashed var(--border); border-radius: 8px;
      }
    </style>

    <div style="padding-bottom:2rem;">
      <div style="padding:1rem 0; border-bottom:1px solid var(--border); margin-bottom:1.5rem;">
        <h2 style="font-size:1.1rem; font-weight:bold; color:var(--text-primary); margin:0;">Galeria de Portfólio</h2>
        <p style="font-size:0.75rem; color:var(--text-secondary); margin:0.25rem 0 0;">Arraste para reordenar as fotos no site.</p>
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
  const photos = appState.appData.portfolio.photos || [];

  if (photos.length === 0) {
    grid.innerHTML = '<div class="p-empty">Nenhuma foto adicionada. Clique acima para subir seus trabalhos!</div>';
    clearBtn.style.display = 'none';
    return;
  }

  clearBtn.style.display = 'block';
  grid.innerHTML = photos.map((photo, i) => `
    <div class="p-item" draggable="true" data-index="${i}">
      <img src="${resolveImagePath(photo.url)}" alt="Foto ${i + 1}">
      <button class="p-del" data-index="${i}" title="Remover foto">✕</button>
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

    const results = await Promise.allSettled(
      files.map(file => uploadImage(file, appState.authToken, (p) => showUploadProgress('pUploadProgress', p)))
    );

    let uploaded = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        appState.appData.portfolio.photos.push({ url: r.value.url });
        uploaded++;
      } else {
        window.showToast?.('Erro ao subir uma foto', 'error');
      }
    }

    if (uploaded > 0) {
      renderPhotos(container);
      window._meuSitePostPreview?.();
      saveAppData('portfolio', appState.appData.portfolio);
    }
    uploadInput.value = '';
  };

  clearBtn.onclick = async () => {
    const ok = await window.showConfirm?.('Tem certeza que deseja remover TODAS as fotos do portfólio?', {
      title: 'Limpar Portfólio', confirmText: 'Sim, remover tudo', danger: true
    });
    if (!ok) return;
    appState.appData.portfolio.photos = [];
    renderPhotos(container);
    window._meuSitePostPreview?.();
    saveAppData('portfolio', appState.appData.portfolio);
  };

  grid.onclick = (e) => {
    const delBtn = e.target.closest('.p-del');
    if (!delBtn) return;
    const idx = parseInt(delBtn.dataset.index);
    appState.appData.portfolio.photos.splice(idx, 1);
    renderPhotos(container);
    window._meuSitePostPreview?.();
    saveAppData('portfolio', appState.appData.portfolio);
  };

  let draggedIdx = null;

  grid.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.p-item');
    if (!item) return;
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
    const photos = appState.appData.portfolio.photos;
    const [moved] = photos.splice(draggedIdx, 1);
    photos.splice(dropIdx, 0, moved);
    draggedIdx = null;
    renderPhotos(container);
    window._meuSitePostPreview?.();
    saveAppData('portfolio', appState.appData.portfolio);
  });

  grid.addEventListener('dragend', () => {
    draggedIdx = null;
    // renderPhotos garante que a opacidade seja restaurada no re-render
  });
}
