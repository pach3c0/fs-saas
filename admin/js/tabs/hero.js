/**
 * Tab: Hero / Capa
 */

import { appState, saveAppData } from '../state.js';
import { resolveImagePath } from '../utils/helpers.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';

export async function renderHero(container) {
  const hero = appState.appData.hero || {};

  // Estilos CSS injetados para scrollbar personalizada e detalhes
  const styles = `
    <style>
      .custom-scrollbar::-webkit-scrollbar { width: 6px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: #111827; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
      details > summary { list-style: none; outline: none; }
      details > summary::-webkit-details-marker { display: none; }
      details[open] > summary { border-bottom: 1px solid #374151; }
      .range-group { display: flex; align-items: center; gap: 0.5rem; }
      .range-label { font-size: 0.75rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; margin-bottom: 0.25rem; }
      .range-val { font-size: 0.75rem; font-family: monospace; color: #f3f4f6; min-width: 3rem; text-align: right; }
    </style>
  `;

  container.innerHTML = `
    ${styles}
    <div style="display:flex; height:calc(100vh - 140px); margin:-1rem; overflow:hidden; background:#020617; border-radius:0.5rem; border:1px solid #374151;">
      
      <!-- SIDEBAR -->
      <div class="custom-scrollbar" style="width:350px; background:#111827; border-right:1px solid #374151; display:flex; flex-direction:column; flex-shrink:0; overflow-y:auto;">
        
        <div style="padding:1.5rem; border-bottom:1px solid #374151; position:sticky; top:0; background:#111827; z-index:10;">
          <h2 style="font-size:1.25rem; font-weight:bold; color:#f3f4f6;">Hero Studio</h2>
          <p style="font-size:0.75rem; color:#9ca3af;">Personalize a capa do site</p>
        </div>

        <div style="padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
          
          <!-- 1. TEXTOS -->
          <details open style="border:1px solid #374151; border-radius:0.5rem; background:#1f2937; overflow:hidden;">
            <summary style="padding:1rem; cursor:pointer; font-weight:600; color:#d1d5db; display:flex; justify-content:space-between; align-items:center; background:#2d3748;">
              Textos
              <span style="font-size:0.75rem;">▼</span>
            </summary>
            <div style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
              <div>
                <label class="range-label">Titulo Principal</label>
                <input type="text" id="heroTitle" style="width:100%; padding:0.5rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;" value="${hero.title || ''}">
              </div>
              <div>
                <label class="range-label">Subtitulo</label>
                <input type="text" id="heroSubtitle" style="width:100%; padding:0.5rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;" value="${hero.subtitle || ''}">
              </div>
            </div>
          </details>

          <!-- 2. IMAGEM -->
          <details style="border:1px solid #374151; border-radius:0.5rem; background:#1f2937; overflow:hidden;">
            <summary style="padding:1rem; cursor:pointer; font-weight:600; color:#d1d5db; display:flex; justify-content:space-between; align-items:center; background:#2d3748;">
              Imagem
              <span style="font-size:0.75rem;">▼</span>
            </summary>
            <div style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
              <label style="background:#2563eb; color:white; padding:0.75rem; border-radius:0.375rem; font-size:0.875rem; font-weight:600; cursor:pointer; text-align:center; display:block;">
                Substituir Imagem
                <input type="file" id="heroImage" accept="image/*" style="display:none;">
              </label>
              <div id="heroUploadProgress"></div>
              
              <div>
                <div class="range-group"><label class="range-label" style="flex:1">Zoom</label><span id="scaleValue" class="range-val"></span></div>
                <input type="range" id="heroScale" min="0.5" max="2" step="0.05" value="${hero.imageScale ?? 1}" style="width:100%;">
              </div>
              <input type="hidden" id="heroPosX" value="${hero.imagePosX ?? 50}">
              <input type="hidden" id="heroPosY" value="${hero.imagePosY ?? 50}">
            </div>
          </details>

          <!-- 3. POSICAO TITULO -->
          <details style="border:1px solid #374151; border-radius:0.5rem; background:#1f2937; overflow:hidden;">
            <summary style="padding:1rem; cursor:pointer; font-weight:600; color:#d1d5db; display:flex; justify-content:space-between; align-items:center; background:#2d3748;">
              Título
              <span style="font-size:0.75rem;">▼</span>
            </summary>
            <div style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
              <input type="hidden" id="titlePosX" value="${hero.titlePosX ?? 50}">
              <input type="hidden" id="titlePosY" value="${hero.titlePosY ?? 40}">
              <div>
                <label class="range-label">Tamanho (px)</label>
                <input type="number" id="titleFontSize" min="10" max="200" step="1" value="${hero.titleFontSize ?? 80}" style="width:100%; padding:0.5rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
              </div>
            </div>
          </details>

          <!-- 4. POSICAO SUBTITULO -->
          <details style="border:1px solid #374151; border-radius:0.5rem; background:#1f2937; overflow:hidden;">
            <summary style="padding:1rem; cursor:pointer; font-weight:600; color:#d1d5db; display:flex; justify-content:space-between; align-items:center; background:#2d3748;">
              Subtítulo
              <span style="font-size:0.75rem;">▼</span>
            </summary>
            <div style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
              <input type="hidden" id="subtitlePosX" value="${hero.subtitlePosX ?? 50}">
              <input type="hidden" id="subtitlePosY" value="${hero.subtitlePosY ?? 55}">
              <div>
                <label class="range-label">Tamanho (px)</label>
                <input type="number" id="subtitleFontSize" min="10" max="100" step="1" value="${hero.subtitleFontSize ?? 40}" style="width:100%; padding:0.5rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
              </div>
            </div>
          </details>

          <!-- 5. EFEITOS -->
          <details style="border:1px solid #374151; border-radius:0.5rem; background:#1f2937; overflow:hidden;">
            <summary style="padding:1rem; cursor:pointer; font-weight:600; color:#d1d5db; display:flex; justify-content:space-between; align-items:center; background:#2d3748;">
              Efeitos
              <span style="font-size:0.75rem;">▼</span>
            </summary>
            <div style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
              <div>
                <div class="range-group"><label class="range-label" style="flex:1">Overlay</label><span id="overlayVal" class="range-val"></span></div>
                <input type="range" id="overlayOpacity" min="0" max="80" step="5" value="${hero.overlayOpacity ?? 30}" style="width:100%;">
              </div>
              <div>
                <div class="range-group"><label class="range-label" style="flex:1">Barra Sup.</label><span id="topBarVal" class="range-val"></span></div>
                <input type="range" id="topBarHeight" min="0" max="20" step="1" value="${hero.topBarHeight ?? 0}" style="width:100%;">
              </div>
              <div>
                <div class="range-group"><label class="range-label" style="flex:1">Barra Inf.</label><span id="bottomBarVal" class="range-val"></span></div>
                <input type="range" id="bottomBarHeight" min="0" max="20" step="1" value="${hero.bottomBarHeight ?? 0}" style="width:100%;">
              </div>
            </div>
          </details>

        </div>

        <div style="padding:1.5rem; border-top:1px solid #374151; background:#111827; margin-top:auto;">
          <button id="saveHeroBtn" style="width:100%; background:#2563eb; color:white; padding:1rem; border-radius:0.5rem; border:none; font-weight:bold; cursor:pointer; text-transform:uppercase; letter-spacing:0.05em; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
            Salvar Design
          </button>
        </div>
      </div>

      <!-- PREVIEW AREA -->
      <div style="flex:1; background:#020617; display:flex; flex-direction:column; position:relative;">
        
        <!-- Toolbar -->
        <div style="padding:1rem; display:flex; justify-content:center; gap:0.5rem; position:absolute; top:0; left:0; right:0; z-index:20; pointer-events:none;">
          <div style="background:rgba(17,24,39,0.8); backdrop-filter:blur(4px); padding:0.25rem; border-radius:0.5rem; border:1px solid #374151; pointer-events:auto; display:flex; gap:0.25rem;">
            <button id="previewDesktop" style="background:#374151; color:white; border:none; padding:0.375rem 0.75rem; border-radius:0.25rem; cursor:pointer; font-size:0.75rem; font-weight:500;">Desktop</button>
            <button id="previewMobile" style="background:transparent; color:#9ca3af; border:none; padding:0.375rem 0.75rem; border-radius:0.25rem; cursor:pointer; font-size:0.75rem; font-weight:500;">Mobile</button>
          </div>
        </div>

        <!-- Canvas Wrapper -->
        <div style="flex:1; display:flex; align-items:center; justify-content:center; padding:2rem; overflow:hidden;">
          <div id="heroPreview" style="border:1px solid #374151; border-radius:0.75rem; width:100%; background:#000; overflow:hidden; position:relative; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); container-type: inline-size; transition: all 0.3s ease; box-sizing: border-box;">
            <p style="text-align:center; color:#9ca3af; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);">Carregando Preview...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Refs
  const previewContainer = container.querySelector('#heroPreview');
  const btnDesktop = container.querySelector('#previewDesktop');
  const btnMobile = container.querySelector('#previewMobile');
  let previewMode = 'desktop';

  btnDesktop.onclick = () => {
    previewMode = 'desktop';
    btnDesktop.style.background = '#374151';
    btnDesktop.style.color = 'white';
    btnMobile.style.background = 'transparent';
    btnMobile.style.color = '#9ca3af';
    handleResize();
  };

  btnMobile.onclick = () => {
    previewMode = 'mobile';
    btnMobile.style.background = '#374151';
    btnMobile.style.color = 'white';
    btnDesktop.style.background = 'transparent';
    btnDesktop.style.color = '#9ca3af';
    handleResize();
  };

  const titleInput = container.querySelector('#heroTitle');
  const subtitleInput = container.querySelector('#heroSubtitle');
  const imageInput = container.querySelector('#heroImage');
  const scaleInput = container.querySelector('#heroScale');
  const posXInput = container.querySelector('#heroPosX');
  const posYInput = container.querySelector('#heroPosY');
  const titlePosXInput = container.querySelector('#titlePosX');
  const titlePosYInput = container.querySelector('#titlePosY');
  const titleFSInput = container.querySelector('#titleFontSize');
  const subtitlePosXInput = container.querySelector('#subtitlePosX');
  const subtitlePosYInput = container.querySelector('#subtitlePosY');
  const subtitleFSInput = container.querySelector('#subtitleFontSize');
  const overlayInput = container.querySelector('#overlayOpacity');
  const topBarInput = container.querySelector('#topBarHeight');
  const bottomBarInput = container.querySelector('#bottomBarHeight');

  // Bind sliders to display values
  const sliderBindings = [
    [scaleInput, container.querySelector('#scaleValue'), v => parseFloat(v).toFixed(2) + 'x'],
    [overlayInput, container.querySelector('#overlayVal'), v => v + '%'],
    [topBarInput, container.querySelector('#topBarVal'), v => v + '%'],
    [bottomBarInput, container.querySelector('#bottomBarVal'), v => v + '%'],
  ];

  sliderBindings.forEach(([input, display, format]) => {
    input.oninput = () => {
      display.textContent = format(input.value);
      updatePreview();
    };
  });

  // Listeners para inputs ocultos (atualizados via drag and drop)
  [posXInput, posYInput, titlePosXInput, titlePosYInput, subtitlePosXInput, subtitlePosYInput].forEach(input => {
    input.oninput = updatePreview;
  });

  titleInput.oninput = updatePreview;
  subtitleInput.oninput = updatePreview;
  titleFSInput.oninput = updatePreview;
  subtitleFSInput.oninput = updatePreview;

  // Upload
  imageInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, appState.authToken, (percent) => {
        showUploadProgress('heroUploadProgress', percent);
      });
      hero.image = result.url;
      updatePreview();
      e.target.value = '';
    } catch (error) {
      alert('Erro no upload: ' + error.message);
    }
  };

  // Salvar
  container.querySelector('#saveHeroBtn').onclick = async () => {
    const newHero = {
      title: titleInput.value,
      subtitle: subtitleInput.value,
      image: hero.image || '',
      imageScale: parseFloat(scaleInput.value),
      imagePosX: parseInt(posXInput.value),
      imagePosY: parseInt(posYInput.value),
      titlePosX: parseInt(titlePosXInput.value),
      titlePosY: parseInt(titlePosYInput.value),
      titleFontSize: parseInt(titleFSInput.value),
      subtitlePosX: parseInt(subtitlePosXInput.value),
      subtitlePosY: parseInt(subtitlePosYInput.value),
      subtitleFontSize: parseInt(subtitleFSInput.value),
      overlayOpacity: parseInt(overlayInput.value),
      topBarHeight: parseInt(topBarInput.value),
      bottomBarHeight: parseInt(bottomBarInput.value)
    };
    await saveAppData('hero', newHero);
  };

  function updatePreview() {
    const preview = container.querySelector('#heroPreview');
    const image = hero.image || '';
    const scale = parseFloat(scaleInput.value);
    const px = parseInt(posXInput.value);
    const py = parseInt(posYInput.value);
    const tpx = parseInt(titlePosXInput.value);
    const tpy = parseInt(titlePosYInput.value);
    const tfs = parseInt(titleFSInput.value);
    const spx = parseInt(subtitlePosXInput.value);
    const spy = parseInt(subtitlePosYInput.value);
    const sfs = parseInt(subtitleFSInput.value);
    const overlay = parseInt(overlayInput.value);
    const topBar = parseInt(topBarInput.value);
    const bottomBar = parseInt(bottomBarInput.value);

    // Para um espelho perfeito, convertemos os limites de PX do site para unidades relativas ao container (CQW)
    // Baseado na largura atual da janela para manter a proporção exata do que você vê no site público
    const windowW = window.innerWidth;
    
    // Proporções exatas do main.js traduzidas para o preview
    const titleMaxW = (800 / windowW) * 100;
    const subMaxW = (600 / windowW) * 100;
    const titleFontSizeCqw = (tfs / windowW) * 100;
    const subFontSizeCqw = (sfs / windowW) * 100;
    const titleMinCqw = (28 / windowW) * 100;
    const subMinCqw = (14 / windowW) * 100;

    const imgHtml = image ? `<img src="${resolveImagePath(image)}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:${px}% ${py}%; transform:scale(${scale}); transform-origin:${px}% ${py}%; pointer-events:none; user-select:none;">` : '';

    preview.innerHTML = `
      ${imgHtml}
      <div data-type="bg" style="position:absolute; inset:0; background:rgba(0,0,0,${overlay/100}); cursor:move;"></div>
      <div style="position:absolute; top:0; left:0; right:0; height:${topBar}%; background:#000; z-index:2; pointer-events:none;"></div>
      <div style="position:absolute; bottom:0; left:0; right:0; height:${bottomBar}%; background:#000; z-index:2; pointer-events:none;"></div>
      <h1 data-type="title" style="position:absolute; left:${tpx}%; top:${tpy}%; transform:translate(-50%,-50%); color:white; font-family:'Playfair Display',serif; font-size:clamp(${titleMinCqw}cqw, 6cqw, ${titleFontSizeCqw}cqw); font-weight:bold; text-align:center; text-shadow:2px 2px 4px rgba(0,0,0,0.7); z-index:3; line-height:1.15; width:100%; max-width:min(90cqw, ${titleMaxW}cqw); white-space:normal; cursor:move; user-select:none; border:1px dashed rgba(255,255,255,0.3); padding:0.5rem;">${titleInput.value || ''}</h1>
      <p data-type="subtitle" style="position:absolute; left:${spx}%; top:${spy}%; transform:translate(-50%,-50%); color:#e5e7eb; font-size:clamp(${subMinCqw}cqw, 3.5cqw, ${subFontSizeCqw}cqw); text-align:center; text-shadow:1px 1px 2px rgba(0,0,0,0.7); z-index:3; line-height:1.6; width:100%; max-width:min(90cqw, ${subMaxW}cqw); white-space:normal; cursor:move; user-select:none; border:1px dashed rgba(255,255,255,0.3); padding:0.5rem;">${subtitleInput.value || ''}</p>
    `;
  }

  // Sincroniza redimensionamento e atualiza calculos matematicos (CQW)
  const handleResize = () => {
    if (!document.body.contains(previewContainer)) {
      window.removeEventListener('resize', handleResize);
      return;
    }
    if (previewMode === 'mobile') {
      previewContainer.style.aspectRatio = '9/16';
      previewContainer.style.width = '300px';
      previewContainer.style.margin = '0 auto';
    } else {
      previewContainer.style.aspectRatio = '16/9';
      previewContainer.style.width = '100%';
      previewContainer.style.margin = '0';
    }
    updatePreview();
  };
  window.addEventListener('resize', handleResize);
  handleResize();

  // Drag and Drop Logic
  let isDragging = false;
  let dragType = null; // 'title', 'subtitle', 'bg'
  let startX = 0;
  let startY = 0;
  let initialVals = {};

  previewContainer.addEventListener('mousedown', (e) => {
    const target = e.target;
    const type = target.getAttribute('data-type');
    
    if (type) {
      isDragging = true;
      dragType = type;
      startX = e.clientX;
      startY = e.clientY;

      if (type === 'title') {
        initialVals = { x: parseInt(titlePosXInput.value), y: parseInt(titlePosYInput.value) };
      } else if (type === 'subtitle') {
        initialVals = { x: parseInt(subtitlePosXInput.value), y: parseInt(subtitlePosYInput.value) };
      } else if (type === 'bg') {
        initialVals = { x: parseInt(posXInput.value), y: parseInt(posYInput.value) };
      }
      
      e.preventDefault(); // Prevent text selection
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const rect = previewContainer.getBoundingClientRect();
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Convert pixel delta to percentage delta
    const deltaPctX = (deltaX / rect.width) * 100;
    const deltaPctY = (deltaY / rect.height) * 100;

    let newX = initialVals.x + deltaPctX;
    let newY = initialVals.y + deltaPctY;

    // Clamp values between 0 and 100
    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));

    if (dragType === 'title') {
      titlePosXInput.value = Math.round(newX);
      titlePosYInput.value = Math.round(newY);
    } else if (dragType === 'subtitle') {
      subtitlePosXInput.value = Math.round(newX);
      subtitlePosYInput.value = Math.round(newY);
    } else if (dragType === 'bg') {
      posXInput.value = Math.round(newX);
      posYInput.value = Math.round(newY);
    }

    // Trigger input event to update UI labels and preview
    titlePosXInput.dispatchEvent(new Event('input'));
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    dragType = null;
  });
}
