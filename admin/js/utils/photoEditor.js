/**
 * Componente reutilizavel: Editor de Foto com Crop e Aspect Ratio
 * Usado em: portfolio.js, sobre.js, estudio.js, albuns.js, hero.js, depoimentos
 *
 * API publica (mesma assinatura anterior):
 *   photoEditorHtml(modalId, aspectRatio) → string HTML
 *   setupPhotoEditor(container, modalId, imageUrl, currentPos, onSave)
 *
 * currentPos: { scale, posX, posY, cropRatio? }
 * onSave callback recebe: { scale, posX, posY, cropRatio }
 */

import { resolveImagePath } from './helpers.js';

const ASPECT_RATIOS = [
  { id: '3/4',  label: '3:4',  w: 3,  h: 4  },
  { id: '4/3',  label: '4:3',  w: 4,  h: 3  },
  { id: '1/1',  label: '1:1',  w: 1,  h: 1  },
  { id: '9/16', label: '9:16', w: 9,  h: 16 },
  { id: '16/9', label: '16:9', w: 16, h: 9  },
  { id: '2/3',  label: '2:3',  w: 2,  h: 3  },
  { id: 'livre', label: 'Livre', w: 0, h: 0  },
];

export function photoEditorHtml(modalId, aspectRatio) {
  return `
    <div id="${modalId}" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:50; flex-direction:column;">
      <!-- Header -->
      <div style="background:#1f2937; border-bottom:1px solid #374151; padding:0.875rem 1.5rem; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
        <h3 style="font-size:1.125rem; font-weight:bold; color:#f3f4f6;">Editor de Foto</h3>
        <div style="display:flex; gap:0.75rem; align-items:center;">
          <button data-editor-rotate style="padding:0.5rem 0.75rem; color:#d1d5db; background:#374151; border:none; border-radius:0.375rem; cursor:pointer; font-size:0.875rem;" title="Girar 90°">↻ Girar</button>
          <button data-editor-cancel style="padding:0.5rem 1rem; color:#9ca3af; background:none; border:1px solid #374151; border-radius:0.375rem; cursor:pointer;">Cancelar</button>
          <button data-editor-save style="padding:0.5rem 1.25rem; background:#2563eb; color:white; border:none; border-radius:0.375rem; cursor:pointer; font-weight:600;">Aplicar</button>
        </div>
      </div>

      <!-- Body -->
      <div style="flex:1; display:flex; overflow:hidden; min-height:0;">

        <!-- Painel lateral -->
        <div style="width:15rem; background:#1f2937; border-right:1px solid #374151; padding:1.25rem; overflow-y:auto; display:flex; flex-direction:column; gap:1.25rem; flex-shrink:0;">

          <!-- Aspect Ratio -->
          <div>
            <label style="display:block; font-size:0.7rem; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.5rem;">Proporção</label>
            <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:0.375rem;" data-ratio-btns>
              ${ASPECT_RATIOS.map(r => `
                <button data-ratio="${r.id}" style="padding:0.375rem 0.25rem; font-size:0.75rem; font-weight:600; border-radius:0.25rem; border:1px solid #374151; background:#111827; color:#9ca3af; cursor:pointer; transition:all 0.15s;">
                  ${r.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Zoom -->
          <div>
            <label style="display:block; font-size:0.7rem; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.5rem;">Zoom</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" data-editor-zoom min="0.5" max="3" step="0.01" value="1" style="flex:1; accent-color:#2563eb;">
              <span data-editor-zoom-val style="font-size:0.8rem; font-family:monospace; color:#f3f4f6; min-width:3.5rem; text-align:right;">1.00×</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:0.375rem;">
              <button data-zoom-reset style="font-size:0.7rem; color:#6b7280; background:none; border:none; cursor:pointer;">Reset</button>
              <button data-zoom-fit style="font-size:0.7rem; color:#6b7280; background:none; border:none; cursor:pointer;">Ajustar</button>
            </div>
          </div>

          <!-- Posição X -->
          <div>
            <label style="display:block; font-size:0.7rem; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.5rem;">Posição Horizontal</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" data-editor-pos-x min="0" max="100" step="1" value="50" style="flex:1; accent-color:#2563eb;">
              <span data-editor-pos-x-val style="font-size:0.8rem; font-family:monospace; color:#f3f4f6; min-width:2.5rem; text-align:right;">50%</span>
            </div>
          </div>

          <!-- Posição Y -->
          <div>
            <label style="display:block; font-size:0.7rem; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.5rem;">Posição Vertical</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" data-editor-pos-y min="0" max="100" step="1" value="50" style="flex:1; accent-color:#2563eb;">
              <span data-editor-pos-y-val style="font-size:0.8rem; font-family:monospace; color:#f3f4f6; min-width:2.5rem; text-align:right;">50%</span>
            </div>
          </div>

          <!-- Dica -->
          <p style="font-size:0.7rem; color:#6b7280; line-height:1.5; margin-top:auto;">
            💡 Use os sliders para ajustar o enquadramento. A proporção define o recorte da imagem no site.
          </p>
        </div>

        <!-- Área de preview -->
        <div style="flex:1; display:flex; align-items:center; justify-content:center; background:#0d1117; padding:2rem; overflow:hidden;">
          <div data-editor-frame style="background:#374151; border-radius:0.5rem; overflow:hidden; position:relative; max-width:min(500px,80vw); max-height:80vh; width:100%;">
            <img data-editor-img src="" alt="Preview" style="width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.05s, object-position 0.05s;">
          </div>
        </div>

      </div>
    </div>
  `;
}

export function setupPhotoEditor(container, modalId, imageUrl, currentPos, onSave) {
  const modal = container.querySelector(`#${modalId}`);
  if (!modal) return;

  const img        = modal.querySelector('[data-editor-img]');
  const frame      = modal.querySelector('[data-editor-frame]');
  const zoomSlider = modal.querySelector('[data-editor-zoom]');
  const posXSlider = modal.querySelector('[data-editor-pos-x]');
  const posYSlider = modal.querySelector('[data-editor-pos-y]');
  const zoomVal    = modal.querySelector('[data-editor-zoom-val]');
  const posXVal    = modal.querySelector('[data-editor-pos-x-val]');
  const posYVal    = modal.querySelector('[data-editor-pos-y-val]');

  // Estado atual
  let currentRatio = currentPos.cropRatio || '3/4';
  let rotation = 0;

  // Inicializar valores
  img.src = resolveImagePath(imageUrl);
  zoomSlider.value = currentPos.scale ?? 1;
  posXSlider.value = currentPos.posX ?? 50;
  posYSlider.value = currentPos.posY ?? 50;

  // Aplicar aspect ratio inicial no frame
  applyRatio(currentRatio);

  // Marcar botão ativo
  function applyRatio(ratioId) {
    currentRatio = ratioId;
    const ratio = ASPECT_RATIOS.find(r => r.id === ratioId) || ASPECT_RATIOS[0];
    if (ratio.id === 'livre') {
      frame.style.aspectRatio = 'auto';
      frame.style.height = '70vh';
    } else {
      frame.style.aspectRatio = `${ratio.w} / ${ratio.h}`;
      frame.style.height = '';
    }
    // Atualizar botões
    modal.querySelectorAll('[data-ratio]').forEach(btn => {
      const active = btn.dataset.ratio === ratioId;
      btn.style.background = active ? '#2563eb' : '#111827';
      btn.style.color = active ? 'white' : '#9ca3af';
      btn.style.borderColor = active ? '#2563eb' : '#374151';
    });
    updatePreview();
  }

  function updatePreview() {
    const zoom = parseFloat(zoomSlider.value);
    const px = parseInt(posXSlider.value);
    const py = parseInt(posYSlider.value);

    img.style.objectPosition = `${px}% ${py}%`;
    img.style.transform = `scale(${zoom}) rotate(${rotation}deg)`;
    img.style.transformOrigin = `${px}% ${py}%`;

    zoomVal.textContent = zoom.toFixed(2) + '×';
    posXVal.textContent = px + '%';
    posYVal.textContent = py + '%';
  }

  // Event listeners dos controles
  zoomSlider.oninput = updatePreview;
  posXSlider.oninput = updatePreview;
  posYSlider.oninput = updatePreview;

  modal.querySelector('[data-zoom-reset]').onclick = () => {
    zoomSlider.value = 1;
    posXSlider.value = 50;
    posYSlider.value = 50;
    updatePreview();
  };

  modal.querySelector('[data-zoom-fit]').onclick = () => {
    zoomSlider.value = 1;
    updatePreview();
  };

  modal.querySelector('[data-editor-rotate]').onclick = () => {
    rotation = (rotation + 90) % 360;
    updatePreview();
  };

  // Botões de aspect ratio
  modal.querySelectorAll('[data-ratio]').forEach(btn => {
    btn.onclick = () => applyRatio(btn.dataset.ratio);
  });

  // Arrastar para reposicionar
  let isDragging = false;
  let dragStart = { x: 0, y: 0, px: 50, py: 50 };

  frame.style.cursor = 'grab';
  frame.onmousedown = (e) => {
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY, px: parseInt(posXSlider.value), py: parseInt(posYSlider.value) };
    frame.style.cursor = 'grabbing';
    e.preventDefault();
  };
  document.onmousemove = (e) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStart.x) / frame.offsetWidth * -100;
    const dy = (e.clientY - dragStart.y) / frame.offsetHeight * -100;
    posXSlider.value = Math.max(0, Math.min(100, dragStart.px + dx));
    posYSlider.value = Math.max(0, Math.min(100, dragStart.py + dy));
    updatePreview();
  };
  document.onmouseup = () => {
    isDragging = false;
    frame.style.cursor = 'grab';
  };

  updatePreview();

  // Salvar
  modal.querySelector('[data-editor-save]').onclick = () => {
    onSave({
      scale: parseFloat(parseFloat(zoomSlider.value).toFixed(2)),
      posX: parseInt(posXSlider.value),
      posY: parseInt(posYSlider.value),
      cropRatio: currentRatio
    });
    modal.style.display = 'none';
  };

  // Cancelar
  modal.querySelector('[data-editor-cancel]').onclick = () => {
    modal.style.display = 'none';
  };

  // Fechar com ESC
  const onKeyDown = (e) => {
    if (e.key === 'Escape') { modal.style.display = 'none'; document.removeEventListener('keydown', onKeyDown); }
  };
  document.addEventListener('keydown', onKeyDown);

  // Abrir modal
  modal.style.display = 'flex';
}
