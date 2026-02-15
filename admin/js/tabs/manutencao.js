/**
 * Tab: Manutencao
 */

import { appState, saveAppData } from '../state.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { resolveImagePath, generateId } from '../utils/helpers.js';
import { photoEditorHtml, setupPhotoEditor } from '../utils/photoEditor.js';

export async function renderManutencao(container) {
  const maintenance = appState.appData.maintenance || { enabled: false, title: '', message: '', carouselPhotos: [] };
  const photos = maintenance.carouselPhotos || [];

  const photosHtml = photos.map((photo, idx) => `
    <div class="carousel-item" style="position:relative; width:10rem; height:6.5rem; border-radius:0.5rem; overflow:hidden; flex-shrink:0; border:1px solid #374151;">
      <img src="${resolveImagePath(photo.url)}" style="width:100%; height:100%; object-fit:cover; pointer-events:none; object-position:${photo.posX ?? 50}% ${photo.posY ?? 50}%; transform:scale(${photo.scale ?? 1}); transform-origin:${photo.posX ?? 50}% ${photo.posY ?? 50}%;">
      <div class="carousel-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.5); opacity:0; transition:opacity 0.2s; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
        <button onclick="editCarouselPhoto(${idx})" style="background:#3b82f6; color:white; padding:0.375rem; border-radius:9999px; border:none; cursor:pointer;" title="Enquadrar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button onclick="deleteCarouselPhoto(${idx})" style="background:#ef4444; color:white; padding:0.375rem; border-radius:9999px; border:none; cursor:pointer;" title="Remover">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Manutencao</h2>

      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <label style="position:relative; display:inline-block; width:3rem; height:1.5rem; cursor:pointer;">
              <input type="checkbox" id="maintenanceToggle" ${maintenance.enabled ? 'checked' : ''}
                style="opacity:0; width:0; height:0; position:absolute;">
              <span id="toggleTrack" style="position:absolute; inset:0; background:${maintenance.enabled ? '#16a34a' : '#374151'}; border-radius:9999px; transition:background 0.3s;"></span>
              <span id="toggleThumb" style="position:absolute; top:2px; left:${maintenance.enabled ? '26px' : '2px'}; width:1.25rem; height:1.25rem; background:white; border-radius:9999px; transition:left 0.3s; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>
            </label>
            <span style="font-size:1rem; font-weight:600; color:${maintenance.enabled ? '#34d399' : '#9ca3af'};" id="statusText">
              ${maintenance.enabled ? 'Cortina ATIVADA' : 'Cortina desativada'}
            </span>
          </div>
          ${maintenance.enabled ? `<a href="/preview" target="_blank" style="background:#2563eb; color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; text-decoration:none; font-size:0.875rem; font-weight:500;">Ver Preview</a>` : ''}
        </div>

        <p style="font-size:0.75rem; color:#9ca3af;">Quando ativada, o site publico mostra uma tela de manutencao. Use /preview para ver o site normalmente.</p>
      </div>

      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Mensagem de Manutencao</h3>
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Titulo</label>
          <input type="text" id="mainTitle" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;"
            value="${maintenance.title || 'Site em Manutencao'}">
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Mensagem</label>
          <textarea id="mainMessage" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; height:6rem; resize:vertical;"
            >${maintenance.message || 'Estamos realizando manutencao. Volte em breve!'}</textarea>
        </div>
      </div>

      <!-- Carrossel de fotos -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Carrossel de Fotos</h3>
          <label style="background:#16a34a; color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; font-size:0.875rem; font-weight:600; cursor:pointer;">
            + Adicionar Fotos
            <input type="file" accept=".jpg,.jpeg,.png" multiple id="carouselUpload" style="display:none;">
          </label>
        </div>
        <p style="font-size:0.75rem; color:#9ca3af;">Fotos que aparecem em carrossel na tela de manutencao. Clique no icone azul para ajustar enquadramento.</p>
        <div id="carouselUploadProgress"></div>

        ${photos.length > 0 ? `
          <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
            ${photosHtml}
          </div>
        ` : `
          <div style="border:2px dashed #374151; border-radius:0.5rem; padding:2rem; text-align:center;">
            <p style="color:#6b7280; font-size:0.875rem;">Nenhuma foto adicionada</p>
          </div>
        `}
      </div>

      <!-- Preview da cortina -->
      <div style="border:1px solid #374151; border-radius:0.75rem; overflow:hidden; position:relative; background:#000;">
        <div style="padding:2rem; display:flex; flex-direction:column; align-items:center; text-align:center;">
          <h1 style="font-family:'Playfair Display',serif; font-size:1.5rem; font-weight:bold; color:white; margin-bottom:0.5rem;">FS FOTOGRAFIAS</h1>
          <div style="width:3rem; height:1px; background:#374151; margin:1rem 0;"></div>
          <h2 id="previewTitle" style="font-size:1.25rem; color:#f3f4f6; margin-bottom:0.5rem;">${maintenance.title || 'Site em Manutencao'}</h2>
          <p id="previewMessage" style="color:#9ca3af; font-size:0.875rem;">${maintenance.message || 'Estamos realizando manutencao. Volte em breve!'}</p>
        </div>
        ${photos.length > 0 ? `
          <div style="padding:0 1rem 1.5rem; overflow-x:auto;">
            <div style="display:flex; gap:0.75rem; justify-content:center; flex-wrap:wrap;">
              ${photos.slice(0, 6).map(p => `
                <div style="width:6rem; height:4rem; border-radius:0.375rem; overflow:hidden; opacity:0.8;">
                  <img src="${resolveImagePath(p.url)}" style="width:100%; height:100%; object-fit:cover; object-position:${p.posX ?? 50}% ${p.posY ?? 50}%; transform:scale(${p.scale ?? 1}); transform-origin:${p.posX ?? 50}% ${p.posY ?? 50}%;">
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <button id="saveMaintenanceBtn" style="background:#2563eb; color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
        Salvar
      </button>
    </div>

    ${photoEditorHtml('carouselEditorModal', '16/9')}
  `;

  const toggle = container.querySelector('#maintenanceToggle');
  const toggleTrack = container.querySelector('#toggleTrack');
  const toggleThumb = container.querySelector('#toggleThumb');
  const statusText = container.querySelector('#statusText');
  const titleInput = container.querySelector('#mainTitle');
  const messageInput = container.querySelector('#mainMessage');

  toggle.onchange = () => {
    if (toggle.checked) {
      toggleTrack.style.background = '#16a34a';
      toggleThumb.style.left = '26px';
      statusText.textContent = 'Cortina ATIVADA';
      statusText.style.color = '#34d399';
    } else {
      toggleTrack.style.background = '#374151';
      toggleThumb.style.left = '2px';
      statusText.textContent = 'Cortina desativada';
      statusText.style.color = '#9ca3af';
    }
  };

  // Preview em tempo real
  titleInput.oninput = () => {
    container.querySelector('#previewTitle').textContent = titleInput.value;
  };
  messageInput.oninput = () => {
    container.querySelector('#previewMessage').textContent = messageInput.value;
  };

  // Hover overlay nas fotos
  container.querySelectorAll('.carousel-item').forEach(item => {
    const overlay = item.querySelector('.carousel-overlay');
    item.onmouseenter = () => { overlay.style.opacity = '1'; };
    item.onmouseleave = () => { overlay.style.opacity = '0'; };
  });

  // Editar enquadramento
  window.editCarouselPhoto = (idx) => {
    const photo = photos[idx];
    setupPhotoEditor(container, 'carouselEditorModal', resolveImagePath(photo.url),
      { scale: photo.scale ?? 1, posX: photo.posX ?? 50, posY: photo.posY ?? 50 },
      async (pos) => {
        photos[idx] = { ...photos[idx], ...pos };
        appState.appData.maintenance = {
          ...appState.appData.maintenance,
          carouselPhotos: photos
        };
        await saveAppData('maintenance', appState.appData.maintenance, true);
        renderManutencao(container);
      }
    );
  };

  // Upload de fotos
  container.querySelector('#carouselUpload').onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const currentPhotos = appState.appData.maintenance?.carouselPhotos || [];

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await uploadImage(files[i], appState.authToken, (percent) => {
          showUploadProgress('carouselUploadProgress', percent, `Enviando ${i + 1}/${files.length}...`);
        });
        currentPhotos.push({ id: generateId(), url: result.url, scale: 1, posX: 50, posY: 50 });
      } catch (error) {
        alert('Erro ao enviar foto: ' + error.message);
      }
    }

    appState.appData.maintenance = {
      ...appState.appData.maintenance,
      carouselPhotos: currentPhotos
    };
    await saveAppData('maintenance', appState.appData.maintenance, true);
    renderManutencao(container);
  };

  // Deletar foto do carrossel
  window.deleteCarouselPhoto = async (idx) => {
    if (!confirm('Remover esta foto do carrossel?')) return;
    const currentPhotos = appState.appData.maintenance?.carouselPhotos || [];
    currentPhotos.splice(idx, 1);
    appState.appData.maintenance = {
      ...appState.appData.maintenance,
      carouselPhotos: currentPhotos
    };
    await saveAppData('maintenance', appState.appData.maintenance, true);
    renderManutencao(container);
  };

  // Salvar
  container.querySelector('#saveMaintenanceBtn').onclick = async () => {
    const newMaintenance = {
      enabled: toggle.checked,
      title: titleInput.value,
      message: messageInput.value,
      carouselPhotos: appState.appData.maintenance?.carouselPhotos || []
    };
    appState.appData.maintenance = newMaintenance;
    await saveAppData('maintenance', newMaintenance);
  };
}
