/**
 * Componente reutilizavel: Editor de Enquadramento de Foto
 * Usado em: portfolio.js, sobre.js, estudio.js
 */

import { resolveImagePath } from './helpers.js';

/**
 * Retorna HTML do modal de editor de foto
 * @param {string} modalId - ID unico do modal (ex: 'photoEditorModal')
 * @param {string} aspectRatio - Aspect ratio do preview (ex: '3/4', '1/1', '16/9')
 */
export function photoEditorHtml(modalId, aspectRatio) {
  return `
    <div id="${modalId}" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:50; flex-direction:column;">
      <div style="background:#1f2937; border-bottom:1px solid #374151; padding:1rem 1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <h3 style="font-size:1.125rem; font-weight:bold; color:#f3f4f6;">Editor de Enquadramento</h3>
        <div style="display:flex; gap:0.75rem;">
          <button data-editor-cancel style="padding:0.5rem 1rem; color:#9ca3af; background:none; border:1px solid #374151; border-radius:0.375rem; cursor:pointer;">Cancelar</button>
          <button data-editor-save style="padding:0.5rem 1rem; background:#2563eb; color:white; border:none; border-radius:0.375rem; cursor:pointer; font-weight:600;">Aplicar</button>
        </div>
      </div>
      <div style="flex:1; display:flex; overflow:hidden;">
        <div style="width:16rem; background:#1f2937; border-right:1px solid #374151; padding:1.5rem; overflow-y:auto;">
          <div style="margin-bottom:1.5rem;">
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.5rem;">Zoom</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" data-editor-zoom min="1" max="2" step="0.05" value="1" style="flex:1;">
              <span data-editor-zoom-val style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">1.00x</span>
            </div>
          </div>
          <div style="margin-bottom:1.5rem;">
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.5rem;">Posicao X</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" data-editor-pos-x min="0" max="100" step="1" value="50" style="flex:1;">
              <span data-editor-pos-x-val style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">50%</span>
            </div>
          </div>
          <div style="margin-bottom:1.5rem;">
            <label style="display:block; font-size:0.75rem; font-weight:600; color:#9ca3af; text-transform:uppercase; margin-bottom:0.5rem;">Posicao Y</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" data-editor-pos-y min="0" max="100" step="1" value="50" style="flex:1;">
              <span data-editor-pos-y-val style="font-size:0.875rem; font-family:monospace; color:#f3f4f6; min-width:3rem; text-align:right;">50%</span>
            </div>
          </div>
        </div>
        <div style="flex:1; display:flex; align-items:center; justify-content:center; background:#111827; padding:2rem;">
          <div style="width:100%; max-width:500px; aspect-ratio:${aspectRatio}; background:#374151; border-radius:0.5rem; overflow:hidden; position:relative;">
            <img data-editor-img src="" alt="Preview" style="width:100%; height:100%; object-fit:cover;">
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Configura e abre o editor de foto
 * @param {HTMLElement} container - Container do tab
 * @param {string} modalId - ID do modal
 * @param {string} imageUrl - URL da imagem para editar
 * @param {{scale?: number, posX?: number, posY?: number}} currentPos - Posicao atual
 * @param {function} onSave - Callback chamado com {scale, posX, posY} ao salvar
 */
export function setupPhotoEditor(container, modalId, imageUrl, currentPos, onSave) {
  const modal = container.querySelector(`#${modalId}`);
  if (!modal) return;

  const img = modal.querySelector('[data-editor-img]');
  const zoomSlider = modal.querySelector('[data-editor-zoom]');
  const posXSlider = modal.querySelector('[data-editor-pos-x]');
  const posYSlider = modal.querySelector('[data-editor-pos-y]');
  const zoomVal = modal.querySelector('[data-editor-zoom-val]');
  const posXVal = modal.querySelector('[data-editor-pos-x-val]');
  const posYVal = modal.querySelector('[data-editor-pos-y-val]');

  // Inicializar valores
  img.src = resolveImagePath(imageUrl);
  zoomSlider.value = currentPos.scale ?? 1;
  posXSlider.value = currentPos.posX ?? 50;
  posYSlider.value = currentPos.posY ?? 50;

  function updatePreview() {
    const zoom = parseFloat(zoomSlider.value);
    const px = parseInt(posXSlider.value);
    const py = parseInt(posYSlider.value);

    img.style.objectPosition = `${px}% ${py}%`;
    img.style.transform = `scale(${zoom})`;
    zoomVal.textContent = zoom.toFixed(2) + 'x';
    posXVal.textContent = px + '%';
    posYVal.textContent = py + '%';
  }

  zoomSlider.oninput = updatePreview;
  posXSlider.oninput = updatePreview;
  posYSlider.oninput = updatePreview;
  updatePreview();

  // Salvar
  modal.querySelector('[data-editor-save]').onclick = () => {
    onSave({
      scale: parseFloat(parseFloat(zoomSlider.value).toFixed(2)),
      posX: parseInt(posXSlider.value),
      posY: parseInt(posYSlider.value)
    });
    modal.style.display = 'none';
  };

  // Cancelar
  modal.querySelector('[data-editor-cancel]').onclick = () => {
    modal.style.display = 'none';
  };

  // Abrir modal
  modal.style.display = 'flex';
}
