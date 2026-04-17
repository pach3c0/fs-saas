/**
 * Tab: Hero / Capa
 */

import { apiGet, apiPut } from '../utils/api.js';
import { resolveImagePath } from '../utils/helpers.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';

let _hero = null;

async function saveHero(silent = false) {
  await apiPut('/api/site/admin/config', { siteConfig: _hero });
  if (!silent) window.showToast?.('Hero salvo!', 'success');
  window._meuSitePostPreview?.();
}

export async function renderHero(container) {
  if (_hero === null) {
    const config = await apiGet('/api/site/admin/config');
    const h = config?.siteConfig || {};
    _hero = {
      heroImage: h.heroImage || '',
      heroScale: h.heroScale ?? 1,
      heroPosX: h.heroPosX ?? 50,
      heroPosY: h.heroPosY ?? 50,
      heroTitle: h.heroTitle || '',
      heroSubtitle: h.heroSubtitle || '',
      titlePosX: h.titlePosX ?? 50,
      titlePosY: h.titlePosY ?? 40,
      titleFontSize: h.titleFontSize ?? 80,
      subtitlePosX: h.subtitlePosX ?? 50,
      subtitlePosY: h.subtitlePosY ?? 55,
      subtitleFontSize: h.subtitleFontSize ?? 40,
      overlayOpacity: h.overlayOpacity ?? 30,
      topBarHeight: h.topBarHeight ?? 0,
      bottomBarHeight: h.bottomBarHeight ?? 0,
    };
  }

  const styles = `
    <style>
      .custom-scrollbar::-webkit-scrollbar { width: 6px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: var(--bg-elevated); }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
      details > summary { list-style: none; outline: none; }
      details > summary::-webkit-details-marker { display: none; }
      details[open] > summary { border-bottom: 1px solid var(--border); }
      .range-group { display: flex; align-items: center; gap: 0.5rem; }
      .range-label { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.25rem; }
      .range-val { font-size: 0.75rem; font-family: monospace; color: var(--text-primary); min-width: 3rem; text-align: right; }
    </style>
  `;

  container.innerHTML = `
    ${styles}
    <div style="display:flex; height:calc(100vh - 140px); margin:-1rem; overflow:hidden; background:var(--bg-base); border-radius:0.5rem; border:1px solid var(--border);">

      <!-- SIDEBAR -->
      <div class="custom-scrollbar" style="width:350px; background:var(--bg-elevated); border-right:1px solid var(--border); display:flex; flex-direction:column; flex-shrink:0; overflow-y:auto;">

        <div style="padding:1.5rem; border-bottom:1px solid var(--border); position:sticky; top:0; background:var(--bg-elevated); z-index:10;">
          <h2 style="font-size:1.25rem; font-weight:bold; color:var(--text-primary);">Hero Studio</h2>
          <p style="font-size:0.75rem; color:var(--text-secondary);">Personalize a capa do site</p>
        </div>

        <div style="padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">

          <!-- 1. TEXTOS -->
          <details open style="border:1px solid var(--border); border-radius:0.5rem; background:var(--bg-surface); overflow:hidden;">
            <summary style="padding:1rem; cursor:pointer; font-weight:600; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center; background:var(--bg-hover);">
              Textos
              <span style="font-size:0.75rem;">▼</span>
            </summary>
            <div style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
              <div>
                <label class="range-label">Titulo Principal</label>
                <input type="text" id="heroTitle" style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary);" value="${_hero.heroTitle}">
              </div>
              <div>
                <label class="range-label">Subtitulo</label>
                <input type="text" id="heroSubtitle" style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary);" value="${_hero.heroSubtitle}">
              </div>
            </div>
          </details>

          <!-- 2. IMAGEM -->
          <details style="border:1px solid var(--border); border-radius:0.5rem; background:var(--bg-surface); overflow:hidden;">
            <summary style="padding:1rem; cursor:pointer; font-weight:600; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center; background:var(--bg-hover);">
              Imagem
              <span style="font-size:0.75rem;">▼</span>
            </summary>
            <div style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
              <label style="background:var(--accent); color:white; padding:0.75rem; border-radius:0.375rem; font-size:0.875rem; font-weight:600; cursor:pointer; text-align:center; display:block;">
                Substituir Imagem
                <input type="file" id="heroImage" accept="image/*" style="display:none;">
              </label>
              <div id="heroUploadProgress"></div>

              <div>
                <div class="range-group"><label class="range-label" style="flex:1">Zoom</label><span id="scaleValue" class="range-val"></span></div>
                <input type="range" id="heroScale" min="0.5" max="2" step="0.05" value="${_hero.heroScale}" style="width:100%;">
              </div>
              <input type="hidden" id="heroPosX" value="${_hero.heroPosX}">
              <input type="hidden" id="heroPosY" value="${_hero.heroPosY}">
            </div>
          </details>

          <!-- 3. POSICAO TITULO -->
          <details style="border:1px solid var(--border); border-radius:0.5rem; background:var(--bg-surface); overflow:hidden;">
            <summary style="padding:1rem; cursor:pointer; font-weight:600; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center; background:var(--bg-hover);">
              Título
              <span style="font-size:0.75rem;">▼</span>
            </summary>
            <div style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
              <input type="hidden" id="titlePosX" value="${_hero.titlePosX}">
              <input type="hidden" id="titlePosY" value="${_hero.titlePosY}">
              <div>
                <label class="range-label">Tamanho (px)</label>
                <input type="number" id="titleFontSize" min="10" max="200" step="1" value="${_hero.titleFontSize}" style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary);">
              </div>
            </div>
          </details>

          <!-- 4. POSICAO SUBTITULO -->
          <details style="border:1px solid var(--border); border-radius:0.5rem; background:var(--bg-surface); overflow:hidden;">
            <summary style="padding:1rem; cursor:pointer; font-weight:600; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center; background:var(--bg-hover);">
              Subtítulo
              <span style="font-size:0.75rem;">▼</span>
            </summary>
            <div style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
              <input type="hidden" id="subtitlePosX" value="${_hero.subtitlePosX}">
              <input type="hidden" id="subtitlePosY" value="${_hero.subtitlePosY}">
              <div>
                <label class="range-label">Tamanho (px)</label>
                <input type="number" id="subtitleFontSize" min="10" max="100" step="1" value="${_hero.subtitleFontSize}" style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary);">
              </div>
            </div>
          </details>

          <!-- 5. EFEITOS -->
          <details style="border:1px solid var(--border); border-radius:0.5rem; background:var(--bg-surface); overflow:hidden;">
            <summary style="padding:1rem; cursor:pointer; font-weight:600; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center; background:var(--bg-hover);">
              Efeitos
              <span style="font-size:0.75rem;">▼</span>
            </summary>
            <div style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
              <div>
                <div class="range-group"><label class="range-label" style="flex:1">Overlay</label><span id="overlayVal" class="range-val"></span></div>
                <input type="range" id="overlayOpacity" min="0" max="80" step="5" value="${_hero.overlayOpacity}" style="width:100%;">
              </div>
              <div>
                <div class="range-group"><label class="range-label" style="flex:1">Barra Sup.</label><span id="topBarVal" class="range-val"></span></div>
                <input type="range" id="topBarHeight" min="0" max="20" step="1" value="${_hero.topBarHeight}" style="width:100%;">
              </div>
              <div>
                <div class="range-group"><label class="range-label" style="flex:1">Barra Inf.</label><span id="bottomBarVal" class="range-val"></span></div>
                <input type="range" id="bottomBarHeight" min="0" max="20" step="1" value="${_hero.bottomBarHeight}" style="width:100%;">
              </div>
            </div>
          </details>

        </div>

        <div style="padding:1.5rem; border-top:1px solid var(--border); background:var(--bg-elevated); margin-top:auto;">
          <button id="saveHeroBtn" style="width:100%; background:var(--accent); color:white; padding:1rem; border-radius:0.5rem; border:none; font-weight:bold; cursor:pointer; text-transform:uppercase; letter-spacing:0.05em;">
            Salvar Design
          </button>
        </div>
      </div>

      <!-- PREVIEW AREA -->
      <div style="flex:1; background:var(--bg-base); display:flex; flex-direction:column; position:relative;">

        <!-- Toolbar -->
        <div style="padding:1rem; display:flex; justify-content:center; gap:0.5rem; position:absolute; top:0; left:0; right:0; z-index:20; pointer-events:none;">
          <div style="background:rgba(13,17,23,0.8); backdrop-filter:blur(4px); padding:0.25rem; border-radius:0.5rem; border:1px solid var(--border); pointer-events:auto; display:flex; gap:0.25rem;">
            <button id="previewDesktop" style="background:var(--border); color:white; border:none; padding:0.375rem 0.75rem; border-radius:0.25rem; cursor:pointer; font-size:0.75rem; font-weight:500;">Desktop</button>
            <button id="previewMobile" style="background:transparent; color:var(--text-secondary); border:none; padding:0.375rem 0.75rem; border-radius:0.25rem; cursor:pointer; font-size:0.75rem; font-weight:500;">Mobile</button>
          </div>
        </div>

        <!-- Canvas Wrapper -->
        <div style="flex:1; display:flex; align-items:center; justify-content:center; padding:2rem; overflow:hidden;">
          <div id="heroPreview" style="border:1px solid var(--border); border-radius:0.75rem; width:100%; background:#000; overflow:hidden; position:relative; box-shadow:0 20px 25px -5px rgba(0,0,0,0.5); container-type:inline-size; transition:all 0.3s ease; box-sizing:border-box;">
            <p style="text-align:center; color:var(--text-secondary); position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);">Carregando Preview...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  const previewContainer = container.querySelector('#heroPreview');
  const btnDesktop = container.querySelector('#previewDesktop');
  const btnMobile = container.querySelector('#previewMobile');
  let previewMode = 'desktop';

  btnDesktop.onclick = () => {
    previewMode = 'desktop';
    btnDesktop.style.background = 'var(--border)';
    btnDesktop.style.color = 'white';
    btnMobile.style.background = 'transparent';
    btnMobile.style.color = 'var(--text-secondary)';
    handleResize();
  };

  btnMobile.onclick = () => {
    previewMode = 'mobile';
    btnMobile.style.background = 'var(--border)';
    btnMobile.style.color = 'white';
    btnDesktop.style.background = 'transparent';
    btnDesktop.style.color = 'var(--text-secondary)';
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

  const sliderBindings = [
    [scaleInput, container.querySelector('#scaleValue'), v => parseFloat(v).toFixed(2) + 'x'],
    [overlayInput, container.querySelector('#overlayVal'), v => v + '%'],
    [topBarInput, container.querySelector('#topBarVal'), v => v + '%'],
    [bottomBarInput, container.querySelector('#bottomBarVal'), v => v + '%'],
  ];

  sliderBindings.forEach(([input, display, format]) => {
    display.textContent = format(input.value);
    input.oninput = () => {
      display.textContent = format(input.value);
      updatePreview();
    };
  });

  [posXInput, posYInput, titlePosXInput, titlePosYInput, subtitlePosXInput, subtitlePosYInput].forEach(input => {
    input.oninput = updatePreview;
  });

  titleInput.oninput = updatePreview;
  subtitleInput.oninput = updatePreview;
  titleFSInput.oninput = updatePreview;
  subtitleFSInput.oninput = updatePreview;

  imageInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, (percent) => {
        showUploadProgress('heroUploadProgress', percent);
      });
      _hero.heroImage = result.url;
      updatePreview();
      e.target.value = '';
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  container.querySelector('#saveHeroBtn').onclick = async () => {
    _hero = {
      ..._hero,
      heroTitle: titleInput.value,
      heroSubtitle: subtitleInput.value,
      heroScale: parseFloat(scaleInput.value),
      heroPosX: parseInt(posXInput.value),
      heroPosY: parseInt(posYInput.value),
      titlePosX: parseInt(titlePosXInput.value),
      titlePosY: parseInt(titlePosYInput.value),
      titleFontSize: parseInt(titleFSInput.value),
      subtitlePosX: parseInt(subtitlePosXInput.value),
      subtitlePosY: parseInt(subtitlePosYInput.value),
      subtitleFontSize: parseInt(subtitleFSInput.value),
      overlayOpacity: parseInt(overlayInput.value),
      topBarHeight: parseInt(topBarInput.value),
      bottomBarHeight: parseInt(bottomBarInput.value),
    };
    await saveHero();
  };

  function updatePreview() {
    const image = _hero.heroImage || '';
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

    const windowW = window.innerWidth;
    const titleMaxW = (800 / windowW) * 100;
    const subMaxW = (600 / windowW) * 100;
    const titleFontSizeCqw = (tfs / windowW) * 100;
    const subFontSizeCqw = (sfs / windowW) * 100;
    const titleMinCqw = (28 / windowW) * 100;
    const subMinCqw = (14 / windowW) * 100;

    const imgHtml = image
      ? `<img src="${resolveImagePath(image)}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:${px}% ${py}%; transform:scale(${scale}); transform-origin:${px}% ${py}%; pointer-events:none; user-select:none;">`
      : '';

    previewContainer.innerHTML = `
      ${imgHtml}
      <div data-type="bg" style="position:absolute; inset:0; background:rgba(0,0,0,${overlay/100}); cursor:move;"></div>
      <div style="position:absolute; top:0; left:0; right:0; height:${topBar}%; background:#000; z-index:2; pointer-events:none;"></div>
      <div style="position:absolute; bottom:0; left:0; right:0; height:${bottomBar}%; background:#000; z-index:2; pointer-events:none;"></div>
      <h1 data-type="title" style="position:absolute; left:${tpx}%; top:${tpy}%; transform:translate(-50%,-50%); color:white; font-family:'Playfair Display',serif; font-size:clamp(${titleMinCqw}cqw, 6cqw, ${titleFontSizeCqw}cqw); font-weight:bold; text-align:center; text-shadow:2px 2px 4px rgba(0,0,0,0.7); z-index:3; line-height:1.15; width:100%; max-width:min(90cqw, ${titleMaxW}cqw); white-space:normal; cursor:move; user-select:none; border:1px dashed rgba(255,255,255,0.3); padding:0.5rem;">${titleInput.value || ''}</h1>
      <p data-type="subtitle" style="position:absolute; left:${spx}%; top:${spy}%; transform:translate(-50%,-50%); color:#e5e7eb; font-size:clamp(${subMinCqw}cqw, 3.5cqw, ${subFontSizeCqw}cqw); text-align:center; text-shadow:1px 1px 2px rgba(0,0,0,0.7); z-index:3; line-height:1.6; width:100%; max-width:min(90cqw, ${subMaxW}cqw); white-space:normal; cursor:move; user-select:none; border:1px dashed rgba(255,255,255,0.3); padding:0.5rem;">${subtitleInput.value || ''}</p>
    `;
  }

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

  // Drag and Drop
  let isDragging = false;
  let dragType = null;
  let startX = 0;
  let startY = 0;
  let initialVals = {};

  previewContainer.addEventListener('mousedown', (e) => {
    const type = e.target.getAttribute('data-type');
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
      e.preventDefault();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = previewContainer.getBoundingClientRect();
    const deltaPctX = ((e.clientX - startX) / rect.width) * 100;
    const deltaPctY = ((e.clientY - startY) / rect.height) * 100;
    const newX = Math.max(0, Math.min(100, initialVals.x + deltaPctX));
    const newY = Math.max(0, Math.min(100, initialVals.y + deltaPctY));

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
    titlePosXInput.dispatchEvent(new Event('input'));
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    dragType = null;
  });
}
