/**
 * Tab: Sobre
 */

import { appState, saveAppData } from '../state.js';
import { resolveImagePath, generateId } from '../utils/helpers.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { photoEditorHtml, setupPhotoEditor } from '../utils/photoEditor.js';

export async function renderSobre(container) {
  const about = appState.appData.about || {};
  if (!about.images) about.images = [];

  // Migrar imagem antiga (campo 'image') para array 'images'
  if (about.image && about.images.length === 0) {
    about.images.push({ image: about.image, posX: 50, posY: 50, scale: 1 });
  }

  let photosHtml = '';
  about.images.forEach((p, idx) => {
    const posX = p.posX ?? 50;
    const posY = p.posY ?? 50;
    const scale = p.scale ?? 1;
    photosHtml += `
      <div class="about-photo-item" data-index="${idx}"
        style="position:relative; aspect-ratio:1/1; background:#374151; border-radius:0.5rem; overflow:hidden;">
        <img src="${resolveImagePath(p.image)}" alt="Sobre ${idx + 1}"
          style="width:100%; height:100%; object-fit:cover; pointer-events:none; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%;">
        <div class="about-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.5); opacity:0; transition:opacity 0.2s; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
          <button onclick="event.stopPropagation(); openSobreEditor(${idx})" style="background:#3b82f6; color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer;" title="Ajustar">
            ✏️
          </button>
          <button onclick="event.stopPropagation(); deleteSobrePhoto(${idx})" style="background:#ef4444; color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer;" title="Remover">
            🗑️
          </button>
        </div>
        <div style="position:absolute; bottom:0.5rem; left:0.5rem; background:rgba(0,0,0,0.7); color:white; font-size:0.75rem; padding:0.125rem 0.5rem; border-radius:0.25rem;">${idx + 1}</div>
      </div>
    `;
  });

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Sobre</h2>

      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Conteudo</h3>
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Titulo da Secao</label>
          <input type="text" id="aboutTitle" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;"
            value="${about.title || ''}">
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Texto (separe paragrafos com linha em branco)</label>
          <textarea id="aboutText" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; height:12rem; resize:vertical;"
            rows="8">${about.text || ''}</textarea>
        </div>
      </div>

      <!-- Imagens -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Imagens</h3>
            <p style="font-size:0.75rem; color:#9ca3af;">Passe o mouse para editar ou remover</p>
          </div>
          <label style="background:#2563eb; color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; font-size:0.875rem; font-weight:600; cursor:pointer;">
            Upload de Fotos
            <input type="file" accept=".jpg,.jpeg,.png" multiple id="aboutUploadInput" style="display:none;">
          </label>
        </div>
        <div id="aboutUploadProgress"></div>
        <div id="aboutPhotosGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:0.75rem;">
          ${photosHtml}
        </div>
        ${about.images.length === 0 ? '<p style="color:#9ca3af; text-align:center; padding:2rem;">Nenhuma imagem. Use o botao acima para adicionar.</p>' : ''}
      </div>

      <button id="saveAboutBtn" style="background:#2563eb; color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
        Salvar
      </button>
    </div>

    ${photoEditorHtml('sobreEditorModal', '1/1')}
  `;

  // Hover nos itens
  container.querySelectorAll('.about-photo-item').forEach(item => {
    const overlay = item.querySelector('.about-overlay');
    item.onmouseenter = () => { overlay.style.opacity = '1'; };
    item.onmouseleave = () => { overlay.style.opacity = '0'; };
  });

  // Helper: captura titulo e texto atuais dos inputs antes de salvar
  function getCurrentAbout() {
    const titleEl = container.querySelector('#aboutTitle');
    const textEl = container.querySelector('#aboutText');
    return {
      title: titleEl ? titleEl.value : (about.title || ''),
      text: textEl ? textEl.value : (about.text || ''),
      image: about.images[0]?.image || '',
      images: about.images
    };
  }

  // Upload multiplo
  container.querySelector('#aboutUploadInput').onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
      try {
        showUploadProgress('aboutUploadProgress', Math.round((about.images.length / (about.images.length + files.length)) * 100));
        const result = await uploadImage(file, appState.authToken);
        about.images.push({ image: result.url, posX: 50, posY: 50, scale: 1 });
      } catch (error) {
        alert('Erro no upload: ' + error.message);
      }
    }

    showUploadProgress('aboutUploadProgress', 100);
    e.target.value = '';
    const currentData = getCurrentAbout();
    appState.appData.about = currentData;
    await saveAppData('about', currentData, true);
    renderSobre(container);
  };

  // Deletar foto
  window.deleteSobrePhoto = async (idx) => {
    if (!confirm('Remover esta imagem?')) return;
    about.images.splice(idx, 1);
    const currentData = getCurrentAbout();
    appState.appData.about = currentData;
    await saveAppData('about', currentData, true);
    renderSobre(container);
  };

  // Abrir editor
  window.openSobreEditor = (idx) => {
    const photo = about.images[idx];
    setupPhotoEditor(container, 'sobreEditorModal', photo.image,
      { scale: photo.scale, posX: photo.posX, posY: photo.posY },
      async (pos) => {
        about.images[idx] = { ...about.images[idx], ...pos };
        const currentData = getCurrentAbout();
        appState.appData.about = currentData;
        await saveAppData('about', currentData, true);
        renderSobre(container);
      }
    );
  };

  // Salvar tudo
  container.querySelector('#saveAboutBtn').onclick = async () => {
    const newAbout = {
      title: container.querySelector('#aboutTitle').value,
      text: container.querySelector('#aboutText').value,
      image: about.images[0]?.image || '',
      images: about.images
    };
    appState.appData.about = newAbout;
    await saveAppData('about', newAbout);
  };
}
