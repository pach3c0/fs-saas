/**
 * Tab: Logo
 */

import { appState, saveAppData } from '../state.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { resolveImagePath } from '../utils/helpers.js';

export async function renderLogo(container) {
  const logo = appState.appData.logo || { type: 'text', text: 'CliqueZoom', image: '' };

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Logo do Site</h2>

      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Tipo de Logo</h3>
        <div style="display:flex; gap:2rem;">
          <label style="display:flex; align-items:center; gap:0.5rem; color:#f3f4f6; cursor:pointer;">
            <input type="radio" name="logoType" value="text" ${logo.type !== 'image' ? 'checked' : ''}>
            Texto
          </label>
          <label style="display:flex; align-items:center; gap:0.5rem; color:#f3f4f6; cursor:pointer;">
            <input type="radio" name="logoType" value="image" ${logo.type === 'image' ? 'checked' : ''}>
            Imagem
          </label>
        </div>
      </div>

      <!-- Config Texto -->
      <div id="logoTextConfig" style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:${logo.type !== 'image' ? 'flex' : 'none'}; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Texto do Logo</h3>
        <input type="text" id="logoTextInput" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;"
          value="${logo.text || 'CliqueZoom'}" placeholder="Ex: CliqueZoom">
      </div>

      <!-- Config Imagem -->
      <div id="logoImageConfig" style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:${logo.type === 'image' ? 'flex' : 'none'}; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Imagem do Logo</h3>
        
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <div style="width:120px; height:80px; background:#111827; border:1px dashed #374151; border-radius:0.5rem; display:flex; align-items:center; justify-content:center; overflow:hidden;">
            ${logo.image ? `<img src="${resolveImagePath(logo.image)}" style="max-width:100%; max-height:100%; object-fit:contain;">` : '<span style="color:#4b5563; font-size:0.75rem;">Sem imagem</span>'}
          </div>
          
          <div style="flex:1;">
            <label style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; font-size:0.875rem; font-weight:600; cursor:pointer; display:inline-block;">
              Upload Imagem
              <input type="file" id="logoUpload" accept="image/*" style="display:none;">
            </label>
            <p style="font-size:0.75rem; color:#9ca3af; margin-top:0.5rem;">Recomendado: PNG com fundo transparente. Altura ideal: 40-60px.</p>
            <div id="logoProgress"></div>
          </div>
        </div>
      </div>

      <button id="saveLogoBtn" style="background:#2563eb; color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer; align-self:flex-start;">
        Salvar Configurações
      </button>
    </div>
  `;

  // Toggle sections
  const radios = container.querySelectorAll('input[name="logoType"]');
  const textConfig = container.querySelector('#logoTextConfig');
  const imageConfig = container.querySelector('#logoImageConfig');

  radios.forEach(r => {
    r.onchange = () => {
      if (r.value === 'text') {
        textConfig.style.display = 'flex';
        imageConfig.style.display = 'none';
      } else {
        textConfig.style.display = 'none';
        imageConfig.style.display = 'flex';
      }
    };
  });

  // Upload
  container.querySelector('#logoUpload').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await uploadImage(file, appState.authToken, (pct) => {
        showUploadProgress('logoProgress', pct);
      });
      logo.image = result.url;
      renderLogo(container); // Refresh preview
    } catch (error) {
      alert('Erro no upload: ' + error.message);
    }
  };

  // Save
  container.querySelector('#saveLogoBtn').onclick = async () => {
    const type = container.querySelector('input[name="logoType"]:checked').value;
    const text = container.querySelector('#logoTextInput').value;

    const newLogo = {
      type,
      text,
      image: logo.image || ''
    };

    appState.appData.logo = newLogo;
    await saveAppData('logo', newLogo);
  };
}