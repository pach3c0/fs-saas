/**
 * Tab: Álbuns
 */

import { apiGet, apiPut } from '../utils/api.js';
import { resolveImagePath, generateId } from '../utils/helpers.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';

let _albums = null;

async function saveAlbuns(silent = false) {
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
  const albums = _albums;

  let albumsHtml = '';
  albums.forEach((album, idx) => {
    const coverUrl = album.cover || (album.photos && album.photos[0]) || '';
    const photos = Array.isArray(album.photos) ? album.photos : [];

    let photosGridHtml = '';
    photos.forEach((photoUrl, photoIdx) => {
      photosGridHtml += `
        <div style="position:relative; aspect-ratio:3/4; background:var(--bg-elevated); border-radius:0.5rem; overflow:hidden;">
          <img src="${resolveImagePath(photoUrl)}" alt="Foto ${photoIdx + 1}" style="width:100%; height:100%; object-fit:cover;">
          <div class="album-photo-overlay" data-album="${idx}" data-photo="${photoIdx}"
            style="position:absolute; inset:0; background:rgba(0,0,0,0.5); opacity:0; transition:opacity 0.2s; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
            <button onclick="event.stopPropagation(); setAlbumCover(${idx}, ${photoIdx})" style="background:var(--accent); color:white; padding:0.4rem; border-radius:9999px; border:none; cursor:pointer; font-size:0.875rem;" title="Definir como capa">
              📷
            </button>
            <button onclick="event.stopPropagation(); removeAlbumPhoto(${idx}, ${photoIdx})" style="background:var(--red); color:white; padding:0.4rem; border-radius:9999px; border:none; cursor:pointer; font-size:0.875rem;" title="Remover">
              🗑️
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

        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.875rem; font-weight:600; color:var(--text-primary);">Fotos do Álbum (${photos.length})</span>
          <label style="background:var(--accent); color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:0.25rem;">
            Upload de Fotos
            <input type="file" accept=".jpg,.jpeg,.png" multiple class="albumUploadInput" data-album-idx="${idx}" style="display:none;">
          </label>
        </div>

        <div id="albumUploadProgress${idx}"></div>

        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:0.5rem;">
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
          const result = await uploadImage(file, (p) => showUploadProgress(`albumUploadProgress${albumIdx}`, p));
          album.photos.push(result.url);
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

  window.removeAlbum = async (idx) => {
    const ok = await window.showConfirm?.('Remover este álbum e todas as fotos?', { confirmText: 'Remover', danger: true });
    if (!ok) return;
    _albums.splice(idx, 1);
    await saveAlbuns(true);
    renderAlbuns(container);
  };

  window.setAlbumCover = async (albumIdx, photoIdx) => {
    _albums[albumIdx].cover = _albums[albumIdx].photos[photoIdx];
    await saveAlbuns(true);
    renderAlbuns(container);
  };

  window.removeAlbumPhoto = async (albumIdx, photoIdx) => {
    const album = _albums[albumIdx];
    const removed = album.photos[photoIdx];
    album.photos.splice(photoIdx, 1);
    if (album.cover === removed) album.cover = album.photos[0] || '';
    await saveAlbuns(true);
    renderAlbuns(container);
  };
}
