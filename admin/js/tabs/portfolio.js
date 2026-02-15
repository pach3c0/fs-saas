/**
 * Tab: Portfolio
 */

import { appState, saveAppData } from '../state.js';
import { resolveImagePath, generateId } from '../utils/helpers.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { photoEditorHtml, setupPhotoEditor } from '../utils/photoEditor.js';

let draggedIndex = null;

export async function renderPortfolio(container) {
  const portfolio = appState.appData.portfolio || [];

  let gridHtml = '';
  portfolio.forEach((p, idx) => {
    const posX = p.posX ?? 50;
    const posY = p.posY ?? 50;
    const scale = p.scale ?? 1;
    const imgSrc = resolveImagePath(p.image);

    gridHtml += `
      <div class="portfolio-item" draggable="true" data-index="${idx}"
        style="position:relative; aspect-ratio:3/4; background:#374151; border-radius:0.5rem; overflow:hidden; border:2px solid transparent; cursor:move;">
        <img src="${imgSrc}" alt="Portfolio ${idx + 1}"
          style="width:100%; height:100%; object-fit:cover; pointer-events:none; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%;">
        <div class="photo-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.5); opacity:0; transition:opacity 0.2s; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
          <button onclick="event.stopPropagation(); openPhotoEditor(${idx})" style="background:#3b82f6; color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer;" title="Ajustar posição">
            ✏️
          </button>
          <button onclick="event.stopPropagation(); deletePortfolioImage(${idx})" style="background:#ef4444; color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer;" title="Remover">
            🗑️
          </button>
        </div>
        <div style="position:absolute; bottom:0.5rem; left:0.5rem; background:rgba(0,0,0,0.7); color:white; font-size:0.75rem; padding:0.125rem 0.5rem; border-radius:0.25rem; font-weight:500;">
          ${idx + 1}
        </div>
      </div>
    `;
  });

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Portfolio</h2>
          <p style="font-size:0.875rem; color:#9ca3af;">Arraste para reordenar, passe o mouse para editar</p>
        </div>
        <label style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:0.5rem;">
          Upload de Fotos
          <input type="file" accept=".jpg,.jpeg,.png" multiple id="portfolioUploadInput" style="display:none;">
        </label>
      </div>

      <div id="portfolioUploadProgress"></div>

      <div id="portfolioGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:0.75rem;">
        ${gridHtml}
      </div>

      ${portfolio.length === 0 ? '<p style="color:#9ca3af; text-align:center; padding:3rem 0;">Nenhuma foto no portfolio. Use o botao acima para adicionar.</p>' : ''}
    </div>

    ${photoEditorHtml('photoEditorModal', '3/4')}
  `;

  // Hover effect nos itens
  container.querySelectorAll('.portfolio-item').forEach(item => {
    const overlay = item.querySelector('.photo-overlay');
    item.onmouseenter = () => { overlay.style.opacity = '1'; };
    item.onmouseleave = () => { overlay.style.opacity = '0'; };
  });

  // Upload de fotos
  const uploadInput = container.querySelector('#portfolioUploadInput');
  uploadInput.onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    let addedCount = 0;
    let errors = [];

    for (const file of files) {
      try {
        showUploadProgress('portfolioUploadProgress', Math.round((addedCount / files.length) * 100));
        const result = await uploadImage(file, appState.authToken);
        portfolio.push({ image: result.url, posX: 50, posY: 50, scale: 1 });
        addedCount++;
      } catch (error) {
        errors.push(error.message);
      }
    }

    showUploadProgress('portfolioUploadProgress', 100);
    uploadInput.value = '';

    if (addedCount > 0) {
      appState.appData.portfolio = portfolio;
      await saveAppData('portfolio', portfolio, true);
      renderPortfolio(container);
    }

    if (errors.length > 0) {
      alert('Erros no upload:\n' + errors.join('\n'));
    }
  };

  // Drag & Drop para reordenar
  const grid = container.querySelector('#portfolioGrid');
  grid.addEventListener('dragstart', (e) => {
    const item = e.target.closest('[data-index]');
    if (!item) return;
    draggedIndex = parseInt(item.dataset.index);
    item.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
  });

  grid.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  grid.addEventListener('drop', async (e) => {
    e.preventDefault();
    const target = e.target.closest('[data-index]');
    if (!target || draggedIndex === null) return;

    const targetIdx = parseInt(target.dataset.index);
    if (draggedIndex === targetIdx) return;

    const item = portfolio.splice(draggedIndex, 1)[0];
    portfolio.splice(targetIdx, 0, item);

    appState.appData.portfolio = portfolio;
    await saveAppData('portfolio', portfolio, true);
    renderPortfolio(container);
  });

  grid.addEventListener('dragend', (e) => {
    e.target.style.opacity = '1';
    draggedIndex = null;
  });

  // Delete foto
  window.deletePortfolioImage = async (idx) => {
    if (!confirm('Remover esta foto da galeria?')) return;
    portfolio.splice(idx, 1);
    appState.appData.portfolio = portfolio;
    await saveAppData('portfolio', portfolio, true);
    renderPortfolio(container);
  };

  // Abrir editor de foto
  window.openPhotoEditor = (idx) => {
    const photo = portfolio[idx];
    setupPhotoEditor(container, 'photoEditorModal', photo.image,
      { scale: photo.scale, posX: photo.posX, posY: photo.posY },
      async (pos) => {
        portfolio[idx] = { ...portfolio[idx], ...pos };
        appState.appData.portfolio = portfolio;
        await saveAppData('portfolio', portfolio, true);
        renderPortfolio(container);
      }
    );
  };
}
