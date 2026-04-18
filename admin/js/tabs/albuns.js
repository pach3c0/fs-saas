/**
 * Tab: Álbuns
 */

import { apiGet, apiPut } from '../utils/api.js';
import { resolveImagePath, generateId } from '../utils/helpers.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { appState } from '../state.js';

let _albums = null;
let draggedAlbumIdx = null;
let draggedPhotoIdx = null;

async function saveAlbuns(silent = false) {
  if (appState.configData && appState.configData.siteContent) {
    appState.configData.siteContent.albums = _albums;
  }
  await apiPut('/api/site/admin/config', { siteContent: { albums: _albums } });
  if (!silent) window.showToast?.('Álbuns salvos!', 'success');
  window._meuSitePostPreview?.();
}

export async function renderAlbuns(container) {
  if (_albums === null) {
    try {
      const config = await apiGet('/api/site/admin/config');
      _albums = config?.siteContent?.albums || [];
    } catch (_) { _albums = []; }
  }
  
  // Migração em memória: garante que as fotos antigas em array de strings virem objetos
  _albums.forEach(album => {
    if (!album.gridStyle) album.gridStyle = 'standard';
    if (album.photos && album.photos.length > 0) {
      album.photos = album.photos.map(photo => {
        if (typeof photo === 'string') {
          return { url: photo, caption: '', format: '16/9', transform: { scale: 1, x: 50, y: 50 } };
        }
        if (!photo.transform) photo.transform = { scale: 1, x: 50, y: 50 };
        if (!photo.format) photo.format = '16/9';
        return photo;
      });
    }
  });

  const albums = _albums;

  let albumsHtml = '';
  albums.forEach((album, idx) => {
    const coverUrl = album.cover || (album.photos && album.photos[0] && album.photos[0].url) || '';
    const photos = Array.isArray(album.photos) ? album.photos : [];

    let photosGridHtml = '';
    photos.forEach((photoObj, photoIdx) => {
      photosGridHtml += `
        <div class="a-photo-item" draggable="true" data-album-idx="${idx}" data-photo-idx="${photoIdx}" style="position:relative; aspect-ratio:3/4; background:var(--bg-elevated); border-radius:0.5rem; overflow:hidden; cursor:grab;">
          <img src="${resolveImagePath(photoObj.url)}" alt="Foto ${photoIdx + 1}" style="width:100%; height:100%; object-fit:cover; object-position:${photoObj.transform.x}% ${photoObj.transform.y}%; transform:scale(${photoObj.transform.scale}); pointer-events:none;">
          <div class="album-photo-overlay" data-album="${idx}" data-photo="${photoIdx}"
            style="position:absolute; inset:0; background:rgba(0,0,0,0.6); opacity:0; transition:opacity 0.2s; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.5rem;">
            <button onclick="event.stopPropagation(); setAlbumCover(${idx}, ${photoIdx})" style="background:var(--accent); color:white; padding:0.4rem 0.75rem; border-radius:9999px; border:none; cursor:pointer; font-size:0.75rem; font-weight:600; width:80%;" title="Definir como capa">
              📷 Capa
            </button>
            <button onclick="event.stopPropagation(); window.openAlbumPhotoEditor(${idx}, ${photoIdx})" style="background:var(--blue); color:white; padding:0.4rem 0.75rem; border-radius:9999px; border:none; cursor:pointer; font-size:0.75rem; font-weight:600; width:80%;" title="Editar">
              ✏️ Editar
            </button>
            <button onclick="event.stopPropagation(); removeAlbumPhoto(${idx}, ${photoIdx})" style="background:var(--red); color:white; padding:0.4rem 0.75rem; border-radius:9999px; border:none; cursor:pointer; font-size:0.75rem; font-weight:600; width:80%;" title="Remover">
              🗑️ Remover
            </button>
          </div>
        </div>
      `;
    });

    albumsHtml += `
      <div style="border:1px solid var(--border); border-radius:0.75rem; background:var(--bg-surface); padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; gap:1rem; align-items:flex-start;">
          <div style="flex:1; display:flex; flex-direction:column; gap:0.75rem;">
            <div>
              <label style="display:block; font-size:0.75rem; font-weight:500; color:var(--text-secondary); margin-bottom:0.25rem;">Título do Álbum</label>
              <input type="text" value="${album.title || ''}" data-album-title="${idx}"
                style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary); font-size:0.875rem;">
            </div>
            <div>
              <label style="display:block; font-size:0.75rem; font-weight:500; color:var(--text-secondary); margin-bottom:0.25rem;">Subtítulo</label>
              <input type="text" value="${album.subtitle || ''}" data-album-subtitle="${idx}"
                style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary); font-size:0.875rem;"
                placeholder="Ex: Ensaio completo">
            </div>
          </div>
          <div style="width:8rem; height:8rem; background:var(--bg-elevated); border-radius:0.5rem; overflow:hidden; flex-shrink:0;">
            ${coverUrl ? `<img src="${resolveImagePath(coverUrl)}" alt="Capa" style="width:100%; height:100%; object-fit:cover;">` : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:0.75rem; color:var(--text-secondary);">Sem capa</div>`}
          </div>
          <button onclick="removeAlbum(${idx})" style="color:var(--red); background:none; border:none; cursor:pointer; font-size:1.25rem; padding:0.25rem;" title="Remover álbum">
            🗑️
          </button>
        </div>

        <div style="display:flex; flex-direction:column; gap:0.75rem; border-top:1px solid var(--border); padding-top:1rem; margin-top:0.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.875rem; font-weight:600; color:var(--text-primary);">Catálogo (${photos.length} fotos)</span>
            <label style="background:var(--accent); color:white; padding:0.4rem 0.75rem; border-radius:0.375rem; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.25rem;">
              Upload
              <input type="file" accept=".jpg,.jpeg,.png" multiple class="albumUploadInput" data-album-idx="${idx}" style="display:none;">
            </label>
          </div>
          
          <div style="display:flex; background:var(--bg-elevated); border-radius:0.375rem; overflow:hidden; border:1px solid var(--border); align-self:stretch;">
            <button onclick="setAlbumGridStyle(${idx}, 'standard')" style="flex:1; padding:0.5rem; font-size:0.75rem; font-weight:500; cursor:pointer; border:none; background:${album.gridStyle !== 'mixed' ? 'var(--accent)' : 'transparent'}; color:${album.gridStyle !== 'mixed' ? 'white' : 'var(--text-secondary)'};">
              Grid Padrão
            </button>
            <button onclick="setAlbumGridStyle(${idx}, 'mixed')" style="flex:1; padding:0.5rem; font-size:0.75rem; font-weight:500; cursor:pointer; border:none; background:${album.gridStyle === 'mixed' ? 'var(--accent)' : 'transparent'}; color:${album.gridStyle === 'mixed' ? 'white' : 'var(--text-secondary)'};">
              Grid Misto
            </button>
          </div>
        </div>

        <div id="albumUploadProgress${idx}"></div>

        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:0.75rem; margin-top:0.5rem;">
          ${photosGridHtml}
        </div>
      </div>
    `;
  });

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h2 style="font-size:1.5rem; font-weight:bold; color:var(--text-primary);">Álbuns</h2>
          <p style="font-size:0.875rem; color:var(--text-secondary);">Crie e gerencie os álbuns da galeria</p>
        </div>
        <button id="addAlbumBtn" style="background:var(--green); color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:600;">
          + Criar Álbum
        </button>
      </div>

      <button id="saveAlbumsBtn" style="background:var(--accent); color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
        Salvar Alterações
      </button>

      ${albumsHtml || `<div style="border:1px solid var(--border); border-radius:0.75rem; background:var(--bg-surface); padding:3rem; text-align:center; color:var(--text-secondary); font-size:0.875rem;">Nenhum álbum criado ainda.</div>`}
    </div>
  `;

  container.querySelectorAll('.album-photo-overlay').forEach(overlay => {
    const parent = overlay.parentElement;
    parent.onmouseenter = () => { overlay.style.opacity = '1'; };
    parent.onmouseleave = () => { overlay.style.opacity = '0'; };
  });

  container.querySelectorAll('.albumUploadInput').forEach(input => {
    input.onchange = async (e) => {
      const albumIdx = parseInt(input.dataset.albumIdx);
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      const album = albums[albumIdx];
      if (!album.photos) album.photos = [];

      for (const file of files) {
        try {
          const result = await uploadImage(file, appState.authToken, (p) => showUploadProgress(`albumUploadProgress${albumIdx}`, p));
          album.photos.push({
            url: result.url,
            caption: '',
            format: '16/9',
            transform: { scale: 1, x: 50, y: 50 }
          });
          if (!album.cover) album.cover = result.url;
        } catch (error) {
          window.showToast?.('Erro: ' + error.message, 'error');
        }
      }

      showUploadProgress(`albumUploadProgress${albumIdx}`, 100);
      await saveAlbuns(true);
      renderAlbuns(container);
    };
  });

  container.querySelector('#addAlbumBtn').onclick = () => {
    _albums.unshift({
      id: generateId(),
      title: '',
      subtitle: '',
      cover: '',
      gridStyle: 'standard',
      photos: [],
      createdAt: new Date().toISOString()
    });
    renderAlbuns(container);
  };

  const saveAlbumFields = async (silent = true) => {
    container.querySelectorAll('[data-album-title]').forEach((input, idx) => {
      if (_albums[idx]) _albums[idx].title = input.value;
    });
    container.querySelectorAll('[data-album-subtitle]').forEach((input, idx) => {
      if (_albums[idx]) _albums[idx].subtitle = input.value;
    });
    await saveAlbuns(silent);
  };

  container.querySelectorAll('[data-album-title], [data-album-subtitle]').forEach(input => {
    input.onblur = () => saveAlbumFields(true);
  });

  container.querySelector('#saveAlbumsBtn').onclick = () => saveAlbumFields(false);

  window.setAlbumGridStyle = async (idx, style) => {
    _albums[idx].gridStyle = style;
    await saveAlbuns(true);
    renderAlbuns(container);
  };

  window.removeAlbum = async (idx) => {
    const ok = await window.showConfirm?.('Remover este álbum e todas as fotos?', { confirmText: 'Remover', danger: true });
    if (!ok) return;
    _albums.splice(idx, 1);
    await saveAlbuns(true);
    renderAlbuns(container);
  };

  window.setAlbumCover = async (albumIdx, photoIdx) => {
    _albums[albumIdx].cover = _albums[albumIdx].photos[photoIdx].url;
    await saveAlbuns(true);
    renderAlbuns(container);
  };

  window.removeAlbumPhoto = async (albumIdx, photoIdx) => {
    const album = _albums[albumIdx];
    const removed = album.photos[photoIdx];
    album.photos.splice(photoIdx, 1);
    if (album.cover === removed.url) {
      album.cover = (album.photos[0] && album.photos[0].url) ? album.photos[0].url : '';
    }
    await saveAlbuns(true);
    renderAlbuns(container);
  };

  // Drag and Drop para reordenar fotos
  container.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.a-photo-item');
    if (!item) return;
    draggedAlbumIdx = parseInt(item.dataset.albumIdx);
    draggedPhotoIdx = parseInt(item.dataset.photoIdx);
    e.dataTransfer.effectAllowed = 'move';
    item.style.opacity = '0.5';
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    const item = e.target.closest('.a-photo-item');
    if (!item || draggedAlbumIdx === null || draggedPhotoIdx === null) return;
    
    const dropAlbumIdx = parseInt(item.dataset.albumIdx);
    const dropPhotoIdx = parseInt(item.dataset.photoIdx);
    
    // Só permite reordenar fotos dentro do mesmo álbum
    if (draggedAlbumIdx !== dropAlbumIdx || draggedPhotoIdx === dropPhotoIdx) return;
    
    const album = _albums[draggedAlbumIdx];
    const [moved] = album.photos.splice(draggedPhotoIdx, 1);
    album.photos.splice(dropPhotoIdx, 0, moved);
    
    draggedAlbumIdx = null;
    draggedPhotoIdx = null;
    
    await saveAlbuns(true);
    renderAlbuns(container);
  });

  container.addEventListener('dragend', (e) => {
    draggedAlbumIdx = null;
    draggedPhotoIdx = null;
    const item = e.target.closest('.a-photo-item');
    if (item) item.style.opacity = '1';
  });

  // --- Modal de Edição Avançada da Foto ---
  window.openAlbumPhotoEditor = (albumIdx, photoIdx) => {
    const album = _albums[albumIdx];
    const photo = album.photos[photoIdx];
    
    const modal = document.createElement('div');
    modal.id = 'aPhotoModal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:9999; display:flex; align-items:center; justify-content:center; padding:1rem; backdrop-filter:blur(4px);';
    
    modal.innerHTML = `
      <style>
        .a-modal-body { display:flex; flex:1; overflow:hidden; flex-direction:column; }
        @media (min-width: 768px) { .a-modal-body { flex-direction:row; } }
        .a-modal-preview { flex:1; background:#000; padding:1.5rem; display:flex; align-items:center; justify-content:center; position:relative; min-height:300px; overflow:hidden; }
        .a-modal-controls { width:100%; padding:1.5rem; overflow-y:auto; display:flex; flex-direction:column; gap:1.5rem; }
        @media (min-width: 768px) { .a-modal-controls { width:320px; border-left:1px solid var(--border); } }
        #aModalPreviewWrapper { max-width:100%; max-height:100%; width:100%; aspect-ratio:16/9; overflow:hidden; border:2px solid var(--border); border-radius:8px; transition:aspect-ratio 0.3s, width 0.3s, height 0.3s; }
        .aspect-fit { width:auto !important; height:auto !important; min-width:0; min-height:0; }
      </style>
      <div style="background:var(--bg-surface); width:100%; max-width:1200px; height:90vh; border-radius:0.75rem; border:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden;">
        <div style="padding:1rem 1.5rem; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:var(--bg-elevated); flex-shrink:0;">
          <h3 style="margin:0; font-size:1.1rem; color:white;">Editar Foto (${album.title})</h3>
          <button id="aModalClose" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; font-size:1.5rem;">✕</button>
        </div>
        
        <div class="a-modal-body">
          <!-- Preview area -->
          <div class="a-modal-preview">
            <div id="aModalPreviewWrapper" class="aspect-fit" style="aspect-ratio:${photo.format === '9/16' ? '9/16' : photo.format === '1/1' ? '1/1' : '16/9'};">
              <img id="aModalImg" src="${resolveImagePath(photo.url)}" style="width:100%; height:100%; object-fit:cover; object-position:${photo.transform.x}% ${photo.transform.y}%; transform:scale(${photo.transform.scale});">
            </div>
          </div>
          
          <!-- Controls area -->
          <div class="a-modal-controls">
            
            <div style="${album.gridStyle === 'standard' ? 'display:none;' : ''}">
              <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem;">Formato no Grid Misto</label>
              <div style="display:flex; gap:0.5rem;">
                <button class="a-fmt-btn ${photo.format === '16/9' ? 'active' : ''}" data-fmt="16/9" style="flex:1; padding:0.5rem; background:var(--bg-elevated); border:1px solid ${photo.format === '16/9' ? 'var(--accent)' : 'var(--border)'}; border-radius:0.375rem; color:white; cursor:pointer;">16:9</button>
                <button class="a-fmt-btn ${photo.format === '9/16' ? 'active' : ''}" data-fmt="9/16" style="flex:1; padding:0.5rem; background:var(--bg-elevated); border:1px solid ${photo.format === '9/16' ? 'var(--accent)' : 'var(--border)'}; border-radius:0.375rem; color:white; cursor:pointer;">9:16</button>
                <button class="a-fmt-btn ${photo.format === '1/1' ? 'active' : ''}" data-fmt="1/1" style="flex:1; padding:0.5rem; background:var(--bg-elevated); border:1px solid ${photo.format === '1/1' ? 'var(--accent)' : 'var(--border)'}; border-radius:0.375rem; color:white; cursor:pointer;">1:1</button>
              </div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                <label style="font-size:0.75rem; color:var(--text-secondary);">Zoom (<span id="aValZoom">${photo.transform.scale}</span>x)</label>
              </div>
              <input type="range" id="aSliderZoom" min="1" max="3" step="0.1" value="${photo.transform.scale}" style="width:100%;">
            </div>
            
            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                <label style="font-size:0.75rem; color:var(--text-secondary);">Posição X (<span id="aValX">${photo.transform.x}</span>%)</label>
              </div>
              <input type="range" id="aSliderX" min="0" max="100" step="1" value="${photo.transform.x}" style="width:100%;">
            </div>
            
            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                <label style="font-size:0.75rem; color:var(--text-secondary);">Posição Y (<span id="aValY">${photo.transform.y}</span>%)</label>
              </div>
              <input type="range" id="aSliderY" min="0" max="100" step="1" value="${photo.transform.y}" style="width:100%;">
            </div>
            
            <div style="margin-top:auto;">
              <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem;">Legenda (SEO)</label>
              <input type="text" id="aInputCaption" value="${photo.caption || ''}" placeholder="Descreva a foto..." style="width:100%; padding:0.75rem; background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.375rem; color:white; font-size:0.875rem; box-sizing:border-box;">
            </div>
            
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const img = modal.querySelector('#aModalImg');
    const wrapper = modal.querySelector('#aModalPreviewWrapper');
    const zoomSlider = modal.querySelector('#aSliderZoom');
    const xSlider = modal.querySelector('#aSliderX');
    const ySlider = modal.querySelector('#aSliderY');
    const captionInput = modal.querySelector('#aInputCaption');
    
    const updateVisuals = () => {
      img.style.transform = `scale(${photo.transform.scale})`;
      img.style.objectPosition = `${photo.transform.x}% ${photo.transform.y}%`;
      
      const ratio = photo.format === '9/16' ? '9/16' : photo.format === '1/1' ? '1/1' : '16/9';
      wrapper.style.aspectRatio = ratio;
      
      if (appState.configData && appState.configData.siteContent) {
        appState.configData.siteContent.albums = _albums;
      }
      window._meuSitePostPreview?.();
    };

    zoomSlider.oninput = (e) => { photo.transform.scale = parseFloat(e.target.value); modal.querySelector('#aValZoom').textContent = photo.transform.scale; updateVisuals(); };
    xSlider.oninput = (e) => { photo.transform.x = parseInt(e.target.value); modal.querySelector('#aValX').textContent = photo.transform.x; updateVisuals(); };
    ySlider.oninput = (e) => { photo.transform.y = parseInt(e.target.value); modal.querySelector('#aValY').textContent = photo.transform.y; updateVisuals(); };
    captionInput.oninput = (e) => { 
      photo.caption = e.target.value; 
      if (appState.configData && appState.configData.siteContent) {
        appState.configData.siteContent.albums = _albums;
      }
      window._meuSitePostPreview?.(); 
    };
    
    modal.querySelectorAll('.a-fmt-btn').forEach(btn => {
      btn.onclick = (e) => {
        modal.querySelectorAll('.a-fmt-btn').forEach(b => {
          b.classList.remove('active');
          b.style.borderColor = 'var(--border)';
        });
        const target = e.target;
        target.classList.add('active');
        target.style.borderColor = 'var(--accent)';
        
        photo.format = target.dataset.fmt;
        updateVisuals();
      };
    });

    const closeModal = async () => {
      modal.remove();
      await saveAlbuns(true);
      renderAlbuns(container);
    };

    modal.querySelector('#aModalClose').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
  };
}
