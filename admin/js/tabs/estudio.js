/**
 * Tab: Estudio
 */

import { appState, saveAppData } from '../state.js';
import { resolveImagePath, generateId } from '../utils/helpers.js';
import { uploadImage, uploadVideo, showUploadProgress } from '../utils/upload.js';
import { photoEditorHtml, setupPhotoEditor } from '../utils/photoEditor.js';

export async function renderEstudio(container) {
  const studio = appState.appData.studio || {};
  if (!studio.photos) studio.photos = [];
  if (!studio.whatsappMessages) studio.whatsappMessages = [{ text: 'Olá! Como posso ajudar você hoje?', delay: 5 }];

  // Grid de fotos do estudio
  let photosHtml = '';
  studio.photos.forEach((p, idx) => {
    const posX = p.posX ?? 50;
    const posY = p.posY ?? 50;
    const scale = p.scale ?? 1;
    photosHtml += `
      <div class="studio-photo-item" draggable="true" data-index="${idx}"
        style="position:relative; aspect-ratio:16/9; background:#374151; border-radius:0.5rem; overflow:hidden; cursor:move;">
        <img src="${resolveImagePath(p.image)}" alt="Estudio ${idx + 1}"
          style="width:100%; height:100%; object-fit:cover; pointer-events:none; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%;">
        <div class="studio-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.5); opacity:0; transition:opacity 0.2s; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
          <button onclick="event.stopPropagation(); openStudioEditor(${idx})" style="background:#3b82f6; color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer;" title="Ajustar">
            ✏️
          </button>
          <button onclick="event.stopPropagation(); deleteStudioPhoto(${idx})" style="background:#ef4444; color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer;" title="Remover">
            🗑️
          </button>
        </div>
        <div style="position:absolute; bottom:0.5rem; left:0.5rem; background:rgba(0,0,0,0.7); color:white; font-size:0.75rem; padding:0.125rem 0.5rem; border-radius:0.25rem;">${idx + 1}</div>
      </div>
    `;
  });

  // Mensagens WhatsApp
  let whatsappHtml = '';
  studio.whatsappMessages.forEach((msg, idx) => {
    whatsappHtml += `
      <div style="display:flex; gap:0.75rem; align-items:flex-start; padding:1rem; background:#111827; border-radius:0.5rem; border:1px solid #374151;">
        <div style="width:2rem; height:2rem; background:#22c55e; color:white; border-radius:9999px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.875rem; flex-shrink:0;">
          ${idx + 1}
        </div>
        <div style="flex:1; display:flex; flex-direction:column; gap:0.5rem;">
          <textarea style="width:100%; padding:0.5rem; border:1px solid #374151; border-radius:0.375rem; background:#1f2937; color:#f3f4f6; font-size:0.875rem; resize:none;" rows="2"
            data-whatsapp-text="${idx}" placeholder="Digite a mensagem...">${msg.text}</textarea>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <label style="font-size:0.75rem; color:#9ca3af;">Delay (seg):</label>
            <input type="number" data-whatsapp-delay="${idx}" value="${msg.delay}" min="1" max="60"
              style="width:4rem; padding:0.25rem 0.5rem; border:1px solid #374151; border-radius:0.25rem; background:#1f2937; color:#f3f4f6; font-size:0.875rem;">
          </div>
        </div>
        <button onclick="removeWhatsappMessage(${idx})" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:1rem; padding:0.25rem;" title="Remover">🗑️</button>
      </div>
    `;
  });

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Estudio</h2>

      <!-- Apresentacao -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Apresentacao</h3>
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Titulo</label>
          <input type="text" id="studioTitle" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;"
            value="${studio.title || ''}">
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Descricao</label>
          <textarea id="studioDesc" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; resize:vertical;" rows="3"
            >${studio.description || ''}</textarea>
        </div>
      </div>

      <!-- Informacoes -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Informacoes</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Endereco</label>
            <input type="text" id="studioAddress" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;"
              value="${studio.address || ''}">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">WhatsApp (com DDD)</label>
            <input type="text" id="studioWhatsapp" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;"
              value="${studio.whatsapp || ''}" placeholder="5511999999999">
          </div>
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Horario de Atendimento</label>
          <textarea id="studioHours" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; resize:vertical;" rows="2"
            >${studio.hours || ''}</textarea>
        </div>
      </div>

      <!-- Mensagens WhatsApp -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Mensagens do WhatsApp</h3>
            <p style="font-size:0.75rem; color:#9ca3af;">Mensagens que aparecem na bolha flutuante em sequencia</p>
          </div>
          <button id="addWhatsappMsgBtn" style="background:#22c55e; color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.875rem; font-weight:500;">
            + Nova Mensagem
          </button>
        </div>
        <div id="whatsappList" style="display:flex; flex-direction:column; gap:0.5rem;">
          ${whatsappHtml}
        </div>
      </div>

      <!-- Video -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Video do Estudio</h3>
            <p style="font-size:0.75rem; color:#9ca3af;">Aparece abaixo das fotos no site. Maximo 300MB.</p>
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            ${studio.videoUrl ? `
              <button id="removeVideoBtn" style="background:#ef4444; color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.875rem; font-weight:600;">
                Remover Video
              </button>
            ` : ''}
            <label style="background:#2563eb; color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; font-size:0.875rem; font-weight:600; cursor:pointer;">
              ${studio.videoUrl ? 'Trocar Video' : 'Upload de Video'}
              <input type="file" accept=".mp4,.mov,.webm" id="studioVideoInput" style="display:none;">
            </label>
          </div>
        </div>
        <div id="studioVideoProgress"></div>
        ${studio.videoUrl ? `
          <div style="aspect-ratio:16/9; border-radius:0.5rem; overflow:hidden; background:#000;">
            <video src="${resolveImagePath(studio.videoUrl)}" controls style="width:100%; height:100%; object-fit:contain;"></video>
          </div>
        ` : '<p style="color:#9ca3af; text-align:center; padding:1.5rem;">Nenhum video. Use o botao acima para adicionar.</p>'}
      </div>

      <!-- Fotos do Estudio -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Fotos do Estudio</h3>
            <p style="font-size:0.75rem; color:#9ca3af;">Passe o mouse para editar ou remover</p>
          </div>
          <label style="background:#2563eb; color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; font-size:0.875rem; font-weight:600; cursor:pointer;">
            Upload de Fotos
            <input type="file" accept=".jpg,.jpeg,.png" multiple id="studioUploadInput" style="display:none;">
          </label>
        </div>
        <div id="studioUploadProgress"></div>
        <div id="studioPhotosGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:0.75rem;">
          ${photosHtml}
        </div>
        ${studio.photos.length === 0 ? '<p style="color:#9ca3af; text-align:center; padding:2rem;">Nenhuma foto. Use o botao acima para adicionar.</p>' : ''}
      </div>

      <button id="saveStudioBtn" style="background:#2563eb; color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
        Salvar Tudo
      </button>
    </div>

    ${photoEditorHtml('studioEditorModal', '16/9')}
  `;

  // Hover nas fotos
  container.querySelectorAll('.studio-photo-item').forEach(item => {
    const overlay = item.querySelector('.studio-overlay');
    item.onmouseenter = () => { overlay.style.opacity = '1'; };
    item.onmouseleave = () => { overlay.style.opacity = '0'; };
  });

  // Helper: captura valores atuais dos inputs antes de salvar
  function getCurrentStudio() {
    const msgs = [];
    container.querySelectorAll('[data-whatsapp-text]').forEach((textarea, idx) => {
      msgs.push({
        text: textarea.value,
        delay: parseInt(container.querySelector(`[data-whatsapp-delay="${idx}"]`)?.value || 5)
      });
    });
    return {
      title: container.querySelector('#studioTitle')?.value || studio.title || '',
      description: container.querySelector('#studioDesc')?.value || studio.description || '',
      address: container.querySelector('#studioAddress')?.value || studio.address || '',
      hours: container.querySelector('#studioHours')?.value || studio.hours || '',
      whatsapp: container.querySelector('#studioWhatsapp')?.value || studio.whatsapp || '',
      videoUrl: studio.videoUrl || '',
      whatsappMessages: msgs.length > 0 ? msgs : studio.whatsappMessages,
      photos: studio.photos
    };
  }

  // Upload de video
  container.querySelector('#studioVideoInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 300 * 1024 * 1024) {
      alert('O video deve ter no maximo 300MB.');
      return;
    }

    try {
      showUploadProgress('studioVideoProgress', 0);
      const result = await uploadVideo(file, appState.authToken, (percent) => {
        showUploadProgress('studioVideoProgress', percent);
      });
      showUploadProgress('studioVideoProgress', 100);
      studio.videoUrl = result.url;
      e.target.value = '';
      const currentData = getCurrentStudio();
      appState.appData.studio = currentData;
      await saveAppData('studio', currentData, true);
      renderEstudio(container);
    } catch (error) {
      alert('Erro no upload do video: ' + error.message);
    }
  };

  // Remover video
  const removeVideoBtn = container.querySelector('#removeVideoBtn');
  if (removeVideoBtn) {
    removeVideoBtn.onclick = async () => {
      if (!confirm('Remover o video do estudio?')) return;
      studio.videoUrl = '';
      const currentData = getCurrentStudio();
      appState.appData.studio = currentData;
      await saveAppData('studio', currentData, true);
      renderEstudio(container);
    };
  }

  // Upload de fotos
  container.querySelector('#studioUploadInput').onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
      try {
        showUploadProgress('studioUploadProgress', Math.round((studio.photos.length / (studio.photos.length + files.length)) * 100));
        const result = await uploadImage(file, appState.authToken);
        studio.photos.push({ image: result.url, posX: 50, posY: 50, scale: 1 });
      } catch (error) {
        alert('Erro no upload: ' + error.message);
      }
    }

    showUploadProgress('studioUploadProgress', 100);
    e.target.value = '';
    const currentData = getCurrentStudio();
    appState.appData.studio = currentData;
    await saveAppData('studio', currentData, true);
    renderEstudio(container);
  };

  // Deletar foto
  window.deleteStudioPhoto = async (idx) => {
    if (!confirm('Remover esta foto?')) return;
    studio.photos.splice(idx, 1);
    const currentData = getCurrentStudio();
    appState.appData.studio = currentData;
    await saveAppData('studio', currentData, true);
    renderEstudio(container);
  };

  // Abrir editor
  window.openStudioEditor = (idx) => {
    const photo = studio.photos[idx];
    setupPhotoEditor(container, 'studioEditorModal', photo.image,
      { scale: photo.scale, posX: photo.posX, posY: photo.posY },
      async (pos) => {
        studio.photos[idx] = { ...studio.photos[idx], ...pos };
        const currentData = getCurrentStudio();
        appState.appData.studio = currentData;
        await saveAppData('studio', currentData, true);
        renderEstudio(container);
      }
    );
  };

  // Adicionar mensagem WhatsApp
  container.querySelector('#addWhatsappMsgBtn').onclick = () => {
    studio.whatsappMessages.push({ text: '', delay: 5 });
    renderEstudio(container);
  };

  // Remover mensagem WhatsApp
  window.removeWhatsappMessage = async (idx) => {
    if (!confirm('Remover esta mensagem?')) return;
    studio.whatsappMessages.splice(idx, 1);
    const currentData = getCurrentStudio();
    appState.appData.studio = currentData;
    await saveAppData('studio', currentData, true);
    renderEstudio(container);
  };

  // Salvar tudo
  container.querySelector('#saveStudioBtn').onclick = async () => {
    const msgs = [];
    container.querySelectorAll('[data-whatsapp-text]').forEach((textarea, idx) => {
      msgs.push({
        text: textarea.value,
        delay: parseInt(container.querySelector(`[data-whatsapp-delay="${idx}"]`)?.value || 5)
      });
    });

    const newStudio = {
      title: container.querySelector('#studioTitle').value,
      description: container.querySelector('#studioDesc').value,
      address: container.querySelector('#studioAddress').value,
      hours: container.querySelector('#studioHours').value,
      whatsapp: container.querySelector('#studioWhatsapp').value,
      videoUrl: studio.videoUrl || '',
      whatsappMessages: msgs,
      photos: studio.photos
    };

    appState.appData.studio = newStudio;
    await saveAppData('studio', newStudio);
  };
}
