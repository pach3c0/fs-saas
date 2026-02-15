/**
 * Tab: Álbuns
 */

import { appState, saveAppData } from '../state.js';
import { resolveImagePath, generateId } from '../utils/helpers.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';

export async function renderAlbuns(container) {
  const albums = appState.appData.albums || [];

  let albumsHtml = '';
  albums.forEach((album, idx) => {
    const coverUrl = album.cover || (album.photos && album.photos[0]) || '';
    const photos = Array.isArray(album.photos) ? album.photos : [];

    let photosGridHtml = '';
    photos.forEach((photoUrl, photoIdx) => {
      photosGridHtml += `
        <div style="position:relative; aspect-ratio:3/4; background:#374151; border-radius:0.5rem; overflow:hidden;">
          <img src="${resolveImagePath(photoUrl)}" alt="Foto ${photoIdx + 1}" style="width:100%; height:100%; object-fit:cover;">
          <div class="album-photo-overlay" data-album="${idx}" data-photo="${photoIdx}"
            style="position:absolute; inset:0; background:rgba(0,0,0,0.5); opacity:0; transition:opacity 0.2s; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
            <button onclick="event.stopPropagation(); setAlbumCover(${idx}, ${photoIdx})" style="background:#3b82f6; color:white; padding:0.4rem; border-radius:9999px; border:none; cursor:pointer; font-size:0.875rem;" title="Definir como capa">
              📷
            </button>
            <button onclick="event.stopPropagation(); removeAlbumPhoto(${idx}, ${photoIdx})" style="background:#ef4444; color:white; padding:0.4rem; border-radius:9999px; border:none; cursor:pointer; font-size:0.875rem;" title="Remover">
              🗑️
            </button>
          </div>
        </div>
      `;
    });

    albumsHtml += `
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; gap:1rem; align-items:flex-start;">
          <div style="flex:1; display:flex; flex-direction:column; gap:0.75rem;">
            <div>
              <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Título do Álbum</label>
              <input type="text" value="${album.title || ''}" data-album-title="${idx}"
                style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;">
            </div>
            <div>
              <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Subtítulo</label>
              <input type="text" value="${album.subtitle || ''}" data-album-subtitle="${idx}"
                style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
                placeholder="Ex: Ensaio completo">
            </div>
          </div>
          <div style="width:8rem; height:8rem; background:#374151; border-radius:0.5rem; overflow:hidden; flex-shrink:0;">
            ${coverUrl ? `<img src="${resolveImagePath(coverUrl)}" alt="Capa" style="width:100%; height:100%; object-fit:cover;">` : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:0.75rem; color:#9ca3af;">Sem capa</div>`}
          </div>
          <button onclick="removeAlbum(${idx})" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:1.25rem; padding:0.25rem;" title="Remover álbum">
            🗑️
          </button>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.875rem; font-weight:600; color:#d1d5db;">Fotos do Álbum (${photos.length})</span>
          <label style="background:#2563eb; color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:0.25rem;">
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
          <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Álbuns</h2>
          <p style="font-size:0.875rem; color:#9ca3af;">Crie e gerencie os álbuns da galeria</p>
        </div>
        <button id="addAlbumBtn" style="background:#16a34a; color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:600;">
          + Criar Álbum
        </button>
      </div>

      <button id="saveAlbumsBtn" style="background:#2563eb; color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
        Salvar Alterações
      </button>

      ${albumsHtml || '<div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:3rem; text-align:center; color:#9ca3af; font-size:0.875rem;">Nenhum álbum criado ainda.</div>'}
    </div>
  `;

  // Hover nos overlays das fotos
  container.querySelectorAll('.album-photo-overlay').forEach(overlay => {
    const parent = overlay.parentElement;
    parent.onmouseenter = () => { overlay.style.opacity = '1'; };
    parent.onmouseleave = () => { overlay.style.opacity = '0'; };
  });

  // Upload de fotos por album
  container.querySelectorAll('.albumUploadInput').forEach(input => {
    input.onchange = async (e) => {
      const albumIdx = parseInt(input.dataset.albumIdx);
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      const album = albums[albumIdx];
      if (!album.photos) album.photos = [];

      for (const file of files) {
        try {
          showUploadProgress(`albumUploadProgress${albumIdx}`, Math.round((album.photos.length / (album.photos.length + files.length)) * 100));
          const result = await uploadImage(file, appState.authToken);
          album.photos.push(result.url);
          if (!album.cover) album.cover = result.url;
        } catch (error) {
          alert('Erro no upload: ' + error.message);
        }
      }

      showUploadProgress(`albumUploadProgress${albumIdx}`, 100);
      appState.appData.albums = albums;
      await saveAppData('albums', albums, true);
      renderAlbuns(container);
    };
  });

  // Adicionar album
  container.querySelector('#addAlbumBtn').onclick = () => {
    albums.unshift({
      id: generateId(),
      title: '',
      subtitle: '',
      cover: '',
      photos: [],
      createdAt: new Date().toISOString()
    });
    appState.appData.albums = albums;
    renderAlbuns(container);
  };

  // Salvar títulos/subtítulos editados
  container.querySelector('#saveAlbumsBtn').onclick = async () => {
    container.querySelectorAll('[data-album-title]').forEach((input, idx) => {
      albums[idx].title = input.value;
    });
    container.querySelectorAll('[data-album-subtitle]').forEach((input, idx) => {
      albums[idx].subtitle = input.value;
    });
    appState.appData.albums = albums;
    await saveAppData('albums', albums);
  };

  // Remover album
  window.removeAlbum = async (idx) => {
    if (!confirm('Remover este álbum e todas as fotos?')) return;
    albums.splice(idx, 1);
    appState.appData.albums = albums;
    await saveAppData('albums', albums, true);
    renderAlbuns(container);
  };

  // Definir capa
  window.setAlbumCover = async (albumIdx, photoIdx) => {
    albums[albumIdx].cover = albums[albumIdx].photos[photoIdx];
    appState.appData.albums = albums;
    await saveAppData('albums', albums, true);
    renderAlbuns(container);
  };

  // Remover foto
  window.removeAlbumPhoto = async (albumIdx, photoIdx) => {
    const album = albums[albumIdx];
    const removed = album.photos[photoIdx];
    album.photos.splice(photoIdx, 1);
    if (album.cover === removed) {
      album.cover = album.photos[0] || '';
    }
    appState.appData.albums = albums;
    await saveAppData('albums', albums, true);
    renderAlbuns(container);
  };
}
