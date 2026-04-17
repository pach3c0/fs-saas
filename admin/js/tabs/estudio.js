/**
 * Tab: Estudio
 */

import { apiGet, apiPut } from '../utils/api.js';
import { resolveImagePath } from '../utils/helpers.js';
import { uploadImage, uploadVideo, showUploadProgress } from '../utils/upload.js';
import { photoEditorHtml, setupPhotoEditor } from '../utils/photoEditor.js';

let _studio = null;

async function saveEstudio(silent = false) {
  await apiPut('/api/site/admin/config', { siteContent: { studio: _studio } });
  if (!silent) window.showToast?.('Estúdio salvo!', 'success');
  window._meuSitePostPreview?.();
}

function getCurrentStudio(container) {
  const msgs = [];
  container.querySelectorAll('[data-whatsapp-text]').forEach((textarea, idx) => {
    msgs.push({
      text: textarea.value,
      delay: parseInt(container.querySelector(`[data-whatsapp-delay="${idx}"]`)?.value || 5)
    });
  });
  return {
    ..._studio,
    title: container.querySelector('#studioTitle')?.value || _studio.title || '',
    description: container.querySelector('#studioDesc')?.value || _studio.description || '',
    address: container.querySelector('#studioAddress')?.value || _studio.address || '',
    hours: container.querySelector('#studioHours')?.value || _studio.hours || '',
    whatsapp: container.querySelector('#studioWhatsapp')?.value || _studio.whatsapp || '',
    whatsappMessages: msgs.length > 0 ? msgs : _studio.whatsappMessages,
  };
}

export async function renderEstudio(container) {
  if (_studio === null) {
    const config = await apiGet('/api/site/admin/config');
    _studio = config?.siteContent?.studio || {};
  }
  if (!_studio.photos) _studio.photos = [];
  if (!_studio.whatsappMessages) _studio.whatsappMessages = [{ text: 'Olá! Como posso ajudar você hoje?', delay: 5 }];

  const photosHtml = _studio.photos.map((p, idx) => {
    const posX = p.posX ?? 50;
    const posY = p.posY ?? 50;
    const scale = p.scale ?? 1;
    return `
      <div class="studio-photo-item" draggable="true" data-index="${idx}"
        style="position:relative; aspect-ratio:16/9; background:var(--bg-elevated); border-radius:0.5rem; overflow:hidden; cursor:move;">
        <img src="${resolveImagePath(p.image)}" alt="Estudio ${idx + 1}"
          style="width:100%; height:100%; object-fit:cover; pointer-events:none; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%;">
        <div class="studio-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.5); opacity:0; transition:opacity 0.2s; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
          <button onclick="event.stopPropagation(); openStudioEditor(${idx})" style="background:var(--accent); color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer;" title="Ajustar">
            ✏️
          </button>
          <button onclick="event.stopPropagation(); deleteStudioPhoto(${idx})" style="background:var(--red); color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer;" title="Remover">
            🗑️
          </button>
        </div>
        <div style="position:absolute; bottom:0.5rem; left:0.5rem; background:rgba(0,0,0,0.7); color:white; font-size:0.75rem; padding:0.125rem 0.5rem; border-radius:0.25rem;">${idx + 1}</div>
      </div>
    `;
  }).join('');

  const whatsappHtml = _studio.whatsappMessages.map((msg, idx) => `
    <div style="display:flex; gap:0.75rem; align-items:flex-start; padding:1rem; background:var(--bg-elevated); border-radius:0.5rem; border:1px solid var(--border);">
      <div style="width:2rem; height:2rem; background:var(--green); color:white; border-radius:9999px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.875rem; flex-shrink:0;">
        ${idx + 1}
      </div>
      <div style="flex:1; display:flex; flex-direction:column; gap:0.5rem;">
        <textarea style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary); font-size:0.875rem; resize:none;" rows="2"
          data-whatsapp-text="${idx}" placeholder="Digite a mensagem...">${msg.text}</textarea>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <label style="font-size:0.75rem; color:var(--text-secondary);">Delay (seg):</label>
          <input type="number" data-whatsapp-delay="${idx}" value="${msg.delay}" min="1" max="60"
            style="width:4rem; padding:0.25rem 0.5rem; border:1px solid var(--border); border-radius:0.25rem; background:var(--bg-base); color:var(--text-primary); font-size:0.875rem;">
        </div>
      </div>
      <button onclick="removeWhatsappMessage(${idx})" style="color:var(--red); background:none; border:none; cursor:pointer; font-size:1rem; padding:0.25rem;" title="Remover">🗑️</button>
    </div>
  `).join('');

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:var(--text-primary);">Estudio</h2>

      <div style="border:1px solid var(--border); border-radius:0.75rem; background:var(--bg-surface); padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary);">Apresentacao</h3>
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:var(--text-secondary); margin-bottom:0.25rem;">Titulo</label>
          <input type="text" id="studioTitle" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary);"
            value="${_studio.title || ''}">
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:var(--text-secondary); margin-bottom:0.25rem;">Descricao</label>
          <textarea id="studioDesc" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary); resize:vertical;" rows="3"
            >${_studio.description || ''}</textarea>
        </div>
      </div>

      <div style="border:1px solid var(--border); border-radius:0.75rem; background:var(--bg-surface); padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary);">Informacoes</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:500; color:var(--text-secondary); margin-bottom:0.25rem;">Endereco</label>
            <input type="text" id="studioAddress" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary);"
              value="${_studio.address || ''}">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:500; color:var(--text-secondary); margin-bottom:0.25rem;">WhatsApp (com DDD)</label>
            <input type="text" id="studioWhatsapp" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary);"
              value="${_studio.whatsapp || ''}" placeholder="5511999999999">
          </div>
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:var(--text-secondary); margin-bottom:0.25rem;">Horario de Atendimento</label>
          <textarea id="studioHours" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary); resize:vertical;" rows="2"
            >${_studio.hours || ''}</textarea>
        </div>
      </div>

      <div style="border:1px solid var(--border); border-radius:0.75rem; background:var(--bg-surface); padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary);">Mensagens do WhatsApp</h3>
            <p style="font-size:0.75rem; color:var(--text-secondary);">Mensagens que aparecem na bolha flutuante em sequencia</p>
          </div>
          <button id="addWhatsappMsgBtn" style="background:var(--green); color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.875rem; font-weight:500;">
            + Nova Mensagem
          </button>
        </div>
        <div id="whatsappList" style="display:flex; flex-direction:column; gap:0.5rem;">
          ${whatsappHtml}
        </div>
      </div>

      <div style="border:1px solid var(--border); border-radius:0.75rem; background:var(--bg-surface); padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary);">Video do Estudio</h3>
            <p style="font-size:0.75rem; color:var(--text-secondary);">Aparece abaixo das fotos no site. Maximo 300MB.</p>
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            ${_studio.videoUrl ? `
              <button id="removeVideoBtn" style="background:var(--red); color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.875rem; font-weight:600;">
                Remover Video
              </button>
            ` : ''}
            <label style="background:var(--accent); color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; font-size:0.875rem; font-weight:600; cursor:pointer;">
              ${_studio.videoUrl ? 'Trocar Video' : 'Upload de Video'}
              <input type="file" accept=".mp4,.mov,.webm" id="studioVideoInput" style="display:none;">
            </label>
          </div>
        </div>
        <div id="studioVideoProgress"></div>
        ${_studio.videoUrl ? `
          <div style="aspect-ratio:16/9; border-radius:0.5rem; overflow:hidden; background:#000;">
            <video src="${resolveImagePath(_studio.videoUrl)}" controls style="width:100%; height:100%; object-fit:contain;"></video>
          </div>
        ` : '<p style="color:var(--text-secondary); text-align:center; padding:1.5rem;">Nenhum video. Use o botao acima para adicionar.</p>'}
      </div>

      <div style="border:1px solid var(--border); border-radius:0.75rem; background:var(--bg-surface); padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary);">Fotos do Estudio</h3>
            <p style="font-size:0.75rem; color:var(--text-secondary);">Passe o mouse para editar ou remover</p>
          </div>
          <label style="background:var(--accent); color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; font-size:0.875rem; font-weight:600; cursor:pointer;">
            Upload de Fotos
            <input type="file" accept=".jpg,.jpeg,.png" multiple id="studioUploadInput" style="display:none;">
          </label>
        </div>
        <div id="studioUploadProgress"></div>
        <div id="studioPhotosGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:0.75rem;">
          ${photosHtml}
        </div>
        ${_studio.photos.length === 0 ? '<p style="color:var(--text-secondary); text-align:center; padding:2rem;">Nenhuma foto. Use o botao acima para adicionar.</p>' : ''}
      </div>

      <button id="saveStudioBtn" style="background:var(--accent); color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
        Salvar Tudo
      </button>
    </div>

    ${photoEditorHtml('studioEditorModal', '16/9')}
  `;

  container.querySelectorAll('.studio-photo-item').forEach(item => {
    const overlay = item.querySelector('.studio-overlay');
    item.onmouseenter = () => { overlay.style.opacity = '1'; };
    item.onmouseleave = () => { overlay.style.opacity = '0'; };
  });

  container.querySelector('#studioVideoInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 300 * 1024 * 1024) {
      window.showToast?.('O vídeo deve ter no máximo 300MB.', 'warning');
      return;
    }
    try {
      showUploadProgress('studioVideoProgress', 0);
      const result = await uploadVideo(file, (percent) => {
        showUploadProgress('studioVideoProgress', percent);
      });
      showUploadProgress('studioVideoProgress', 100);
      _studio = { ...getCurrentStudio(container), videoUrl: result.url };
      e.target.value = '';
      await saveEstudio(true);
      renderEstudio(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  const removeVideoBtn = container.querySelector('#removeVideoBtn');
  if (removeVideoBtn) {
    removeVideoBtn.onclick = async () => {
      const ok = await window.showConfirm?.('Remover o video do estudio?', { danger: true });
      if (!ok) return;
      _studio = { ...getCurrentStudio(container), videoUrl: '' };
      await saveEstudio(true);
      renderEstudio(container);
    };
  }

  container.querySelector('#studioUploadInput').onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    for (const file of files) {
      try {
        const result = await uploadImage(file, (p) => showUploadProgress('studioUploadProgress', p));
        _studio.photos.push({ image: result.url, posX: 50, posY: 50, scale: 1 });
      } catch (error) {
        window.showToast?.('Erro: ' + error.message, 'error');
      }
    }
    showUploadProgress('studioUploadProgress', 100);
    e.target.value = '';
    _studio = getCurrentStudio(container);
    await saveEstudio(true);
    renderEstudio(container);
  };

  window.deleteStudioPhoto = async (idx) => {
    const ok = await window.showConfirm?.('Remover esta foto?', { danger: true });
    if (!ok) return;
    _studio.photos.splice(idx, 1);
    _studio = getCurrentStudio(container);
    await saveEstudio(true);
    renderEstudio(container);
  };

  window.openStudioEditor = (idx) => {
    const photo = _studio.photos[idx];
    setupPhotoEditor(container, 'studioEditorModal', photo.image,
      { scale: photo.scale, posX: photo.posX, posY: photo.posY },
      async (pos) => {
        _studio.photos[idx] = { ..._studio.photos[idx], ...pos };
        _studio = getCurrentStudio(container);
        await saveEstudio(true);
        renderEstudio(container);
      }
    );
  };

  container.querySelector('#addWhatsappMsgBtn').onclick = () => {
    _studio = getCurrentStudio(container);
    _studio.whatsappMessages.push({ text: '', delay: 5 });
    renderEstudio(container);
  };

  window.removeWhatsappMessage = async (idx) => {
    const ok = await window.showConfirm?.('Remover esta mensagem?', { danger: true });
    if (!ok) return;
    _studio = getCurrentStudio(container);
    _studio.whatsappMessages.splice(idx, 1);
    await saveEstudio(true);
    renderEstudio(container);
  };

  container.querySelector('#saveStudioBtn').onclick = async () => {
    _studio = getCurrentStudio(container);
    await saveEstudio();
  };
}
