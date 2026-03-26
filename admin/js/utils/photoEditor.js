/**
 * Editor de Foto com Cropper.js
 * Crop real (destrutivo), rotação, flip, zoom, aspect ratio
 *
 * API publica:
 *   photoEditorHtml(modalId, aspectRatio) → string HTML do modal
 *   setupPhotoEditor(container, modalId, imageUrl, currentPos, onSave)
 *
 * onSave callback recebe: { url: string } — URL da imagem cropada já salva no servidor
 *
 * Cropper.js é carregado dinamicamente do CDN na primeira chamada.
 */

import { appState } from '../state.js';

const ASPECT_RATIOS = [
  { id: 'livre', label: 'Livre',  w: NaN, h: NaN },
  { id: '1/1',   label: '1:1',   w: 1,   h: 1   },
  { id: '4/3',   label: '4:3',   w: 4,   h: 3   },
  { id: '3/4',   label: '3:4',   w: 3,   h: 4   },
  { id: '3/2',   label: '3:2',   w: 3,   h: 2   },
  { id: '16/9',  label: '16:9',  w: 16,  h: 9   },
  { id: '9/16',  label: '9:16',  w: 9,   h: 16  },
];

let cropperJsLoaded = false;

function loadCropperJs() {
  if (cropperJsLoaded || window.Cropper) {
    cropperJsLoaded = true;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    // CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css';
    document.head.appendChild(link);

    // JS
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js';
    script.onload = () => { cropperJsLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Falha ao carregar Cropper.js'));
    document.head.appendChild(script);
  });
}

function uploadBlob(blob, filename, authToken) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('image', blob, filename || 'edited.jpg');

    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success || res.ok) resolve({ url: res.url, filename: res.filename });
          else reject(new Error(res.error || 'Upload falhou'));
        } catch (e) {
          reject(new Error('Resposta invalida do servidor'));
        }
      } else {
        reject(new Error(`Erro ${xhr.status}`));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Erro de conexao')));
    xhr.open('POST', '/api/admin/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.send(formData);
  });
}

export function photoEditorHtml(modalId, _aspectRatio) {
  return `
    <div id="${modalId}" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.97); z-index:9999; flex-direction:column; font-family:Inter,sans-serif;">

      <!-- Header -->
      <div style="background:#1a1f2e; border-bottom:1px solid #2d3748; padding:0.75rem 1.25rem; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
        <h3 style="font-size:1rem; font-weight:700; color:#f3f4f6; margin:0;">✂️ Editor de Foto</h3>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <button data-ed-reset style="padding:0.4rem 0.75rem; color:#9ca3af; background:#2d3748; border:1px solid #374151; border-radius:0.375rem; cursor:pointer; font-size:0.8rem;">↩ Resetar</button>
          <button data-ed-cancel style="padding:0.4rem 0.75rem; color:#9ca3af; background:none; border:1px solid #374151; border-radius:0.375rem; cursor:pointer; font-size:0.8rem;">Cancelar</button>
          <button data-ed-save style="padding:0.4rem 1rem; background:#2563eb; color:white; border:none; border-radius:0.375rem; cursor:pointer; font-weight:700; font-size:0.875rem; min-width:9rem;">
            Aplicar e Salvar
          </button>
        </div>
      </div>

      <!-- Body -->
      <div style="flex:1; display:flex; overflow:hidden; min-height:0;">

        <!-- Painel lateral esquerdo -->
        <div style="width:13rem; background:#1a1f2e; border-right:1px solid #2d3748; padding:1rem; overflow-y:auto; display:flex; flex-direction:column; gap:1rem; flex-shrink:0;">

          <!-- Proporção -->
          <div>
            <div style="font-size:0.65rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.5rem;">Proporção</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.3rem;" data-ed-ratios>
              ${ASPECT_RATIOS.map(r => `
                <button data-ratio="${r.id}" style="padding:0.35rem 0.25rem; font-size:0.75rem; font-weight:600; border-radius:0.25rem; border:1px solid #374151; background:#111827; color:#6b7280; cursor:pointer;">
                  ${r.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Zoom -->
          <div>
            <div style="font-size:0.65rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.5rem;">Zoom</div>
            <input type="range" data-ed-zoom min="0.1" max="3" step="0.05" value="1" style="width:100%; accent-color:#2563eb; margin-bottom:0.3rem;">
            <div style="display:flex; gap:0.3rem;">
              <button data-ed-zoom-out style="flex:1; padding:0.3rem; background:#2d3748; border:none; border-radius:0.25rem; color:#d1d5db; cursor:pointer; font-size:1rem;">−</button>
              <button data-ed-zoom-in  style="flex:1; padding:0.3rem; background:#2d3748; border:none; border-radius:0.25rem; color:#d1d5db; cursor:pointer; font-size:1rem;">+</button>
            </div>
          </div>

          <!-- Girar -->
          <div>
            <div style="font-size:0.65rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.5rem;">Girar</div>
            <div style="display:flex; gap:0.3rem;">
              <button data-ed-rot-left  style="flex:1; padding:0.4rem; background:#2d3748; border:none; border-radius:0.25rem; color:#d1d5db; cursor:pointer; font-size:1rem;" title="Girar esquerda">↺</button>
              <button data-ed-rot-right style="flex:1; padding:0.4rem; background:#2d3748; border:none; border-radius:0.25rem; color:#d1d5db; cursor:pointer; font-size:1rem;" title="Girar direita">↻</button>
            </div>
          </div>

          <!-- Espelhar -->
          <div>
            <div style="font-size:0.65rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.5rem;">Espelhar</div>
            <div style="display:flex; gap:0.3rem;">
              <button data-ed-flip-h style="flex:1; padding:0.4rem; background:#2d3748; border:none; border-radius:0.25rem; color:#d1d5db; cursor:pointer; font-size:0.7rem; font-weight:600;" title="Flip horizontal">⇆ H</button>
              <button data-ed-flip-v style="flex:1; padding:0.4rem; background:#2d3748; border:none; border-radius:0.25rem; color:#d1d5db; cursor:pointer; font-size:0.7rem; font-weight:600;" title="Flip vertical">⇅ V</button>
            </div>
          </div>

          <!-- Dica -->
          <p style="font-size:0.68rem; color:#4b5563; line-height:1.5; margin-top:auto; padding-top:0.5rem; border-top:1px solid #2d3748;">
            Arraste para reposicionar. Scroll para zoom. Selecione proporção antes de cortar.
          </p>
        </div>

        <!-- Área do cropper -->
        <div style="flex:1; background:#0d1117; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center;">
          <div style="max-width:100%; max-height:100%; width:100%; height:100%; position:relative;">
            <img data-ed-img src="" alt="" style="max-width:100%; max-height:100%; display:block;">
          </div>
          <!-- Overlay de loading -->
          <div data-ed-loading style="display:none; position:absolute; inset:0; background:rgba(0,0,0,0.8); align-items:center; justify-content:center; flex-direction:column; gap:1rem;">
            <div style="width:2.5rem; height:2.5rem; border:3px solid #374151; border-top-color:#2563eb; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
            <p style="color:#9ca3af; font-size:0.875rem;">Processando imagem...</p>
          </div>
        </div>

      </div>

      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </div>
  `;
}

export async function setupPhotoEditor(container, modalId, imageUrl, _currentPos, onSave) {
  const modal = container.querySelector(`#${modalId}`);
  if (!modal) return;

  // Carregar Cropper.js
  try {
    await loadCropperJs();
  } catch (e) {
    alert('Erro ao carregar editor: ' + e.message);
    return;
  }

  const img       = modal.querySelector('[data-ed-img]');
  const loading   = modal.querySelector('[data-ed-loading]');
  const saveBtn   = modal.querySelector('[data-ed-save]');
  const cancelBtn = modal.querySelector('[data-ed-cancel]');
  const resetBtn  = modal.querySelector('[data-ed-reset]');
  const zoomSlider = modal.querySelector('[data-ed-zoom]');

  let cropper = null;
  let currentRatioId = 'livre';
  // Rastreia flip para alternância
  let flipState = { h: 1, v: 1 };

  // URL original para reset
  const originalUrl = imageUrl;

  function destroyCropper() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  }

  function initCropper(src, ratioId) {
    destroyCropper();
    img.src = src;
    img.onload = () => {
      const ratio = ASPECT_RATIOS.find(r => r.id === ratioId);
      const aspectRatio = (ratio && !isNaN(ratio.w)) ? ratio.w / ratio.h : NaN;
      cropper = new window.Cropper(img, {
        aspectRatio,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.85,
        restore: false,
        guides: true,
        center: true,
        highlight: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        zoom(e) {
          // Sincroniza slider com zoom do cropper
          const val = Math.min(3, Math.max(0.1, e.detail.ratio));
          zoomSlider.value = val;
        }
      });
      flipState = { h: 1, v: 1 };
    };
  }

  function setActiveRatio(ratioId) {
    currentRatioId = ratioId;
    modal.querySelectorAll('[data-ratio]').forEach(btn => {
      const active = btn.dataset.ratio === ratioId;
      btn.style.background = active ? '#2563eb' : '#111827';
      btn.style.color = active ? 'white' : '#6b7280';
      btn.style.borderColor = active ? '#2563eb' : '#374151';
    });
  }

  // Inicializar com a imagem atual
  setActiveRatio('livre');
  initCropper(imageUrl, 'livre');

  // Botões de aspect ratio
  modal.querySelectorAll('[data-ratio]').forEach(btn => {
    btn.onclick = () => {
      setActiveRatio(btn.dataset.ratio);
      if (cropper) {
        const ratio = ASPECT_RATIOS.find(r => r.id === btn.dataset.ratio);
        const ar = (ratio && !isNaN(ratio.w)) ? ratio.w / ratio.h : NaN;
        cropper.setAspectRatio(ar);
      }
    };
  });

  // Zoom slider
  zoomSlider.oninput = () => {
    if (cropper) cropper.zoomTo(parseFloat(zoomSlider.value));
  };
  modal.querySelector('[data-ed-zoom-in]').onclick  = () => { if (cropper) cropper.zoom(0.1); };
  modal.querySelector('[data-ed-zoom-out]').onclick = () => { if (cropper) cropper.zoom(-0.1); };

  // Rotação
  modal.querySelector('[data-ed-rot-left]').onclick  = () => { if (cropper) cropper.rotate(-90); };
  modal.querySelector('[data-ed-rot-right]').onclick = () => { if (cropper) cropper.rotate(90); };

  // Flip
  modal.querySelector('[data-ed-flip-h]').onclick = () => {
    if (!cropper) return;
    flipState.h *= -1;
    cropper.scaleX(flipState.h);
  };
  modal.querySelector('[data-ed-flip-v]').onclick = () => {
    if (!cropper) return;
    flipState.v *= -1;
    cropper.scaleY(flipState.v);
  };

  // Reset
  resetBtn.onclick = () => {
    setActiveRatio('livre');
    initCropper(originalUrl, 'livre');
    zoomSlider.value = 1;
  };

  // Cancelar
  cancelBtn.onclick = () => {
    destroyCropper();
    modal.style.display = 'none';
    document.removeEventListener('keydown', onKeyDown);
  };

  // Salvar: crop → blob → upload → onSave
  saveBtn.onclick = async () => {
    if (!cropper) return;

    // Mostrar loading
    loading.style.display = 'flex';
    saveBtn.disabled = true;
    saveBtn.textContent = 'Processando...';

    try {
      const canvas = cropper.getCroppedCanvas({
        maxWidth: 2400,
        maxHeight: 2400,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        fillColor: '#fff',
      });

      if (!canvas) throw new Error('Nao foi possivel gerar o canvas');

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Falha ao gerar blob'));
        }, 'image/jpeg', 0.9);
      });

      // Gerar nome de arquivo
      const originalName = (originalUrl.split('/').pop() || 'edited').replace(/\.[^.]+$/, '');
      const filename = `${originalName}-cropped-${Date.now()}.jpg`;

      const authToken = appState.authToken;
      if (!authToken) throw new Error('Token de autenticacao ausente');

      const result = await uploadBlob(blob, filename, authToken);

      destroyCropper();
      modal.style.display = 'none';
      document.removeEventListener('keydown', onKeyDown);

      // Chamar callback com a nova URL
      await onSave({ url: result.url });

    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      loading.style.display = 'none';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Aplicar e Salvar';
    }
  };

  // Fechar com ESC
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cancelBtn.onclick();
    }
  }
  document.addEventListener('keydown', onKeyDown);

  // Abrir modal
  modal.style.display = 'flex';
}
