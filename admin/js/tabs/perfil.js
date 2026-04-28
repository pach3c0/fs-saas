/**
 * Tab: Perfil e Identidade Visual
 * Gerencia os dados da organização, incluindo logotipo e configurações de marca d'água.
 */

import { apiGet, apiPut } from '../utils/api.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { resolveImagePath, escapeHtml } from '../utils/helpers.js';
import { appState } from '../state.js';

let organizationData = {};

const positionOptions = [
  { value: 'center', label: 'Centro' },
  { value: 'tiled', label: 'Ladrilho' },
  { value: 'top-left', label: 'Sup. Esquerdo' },
  { value: 'top-right', label: 'Sup. Direito' },
  { value: 'bottom-left', label: 'Inf. Esquerdo' },
  { value: 'bottom-right', label: 'Inf. Direito' },
];

const sizeOptions = [
  { value: 'small', label: 'Pequeno' },
  { value: 'medium', label: 'Médio' },
  { value: 'large', label: 'Grande' },
];

// Placeholders em Base64 para evitar erros 404 e dependências externas
const PLACEHOLDER_LOGO = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iNTAiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzNzQxNTEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZpbGw9IiNmZmYiPkxvZ288L3RleHQ+PC9zdmc+';
const PREVIEW_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzc0MTUxIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmaWxsPSIjOWNhM2FmIiBmb250LXNpemU9IjI0Ij5Gb3RvIGRlIFByZXZpZXc8L3RleHQ+PC9zdmc+';

function updateWatermarkPreview(container) {
  if (!container) return;
  const preview = container.querySelector('#watermarkPreview');
  if (!preview) return;

  const typeInput = container.querySelector('input[name="watermarkType"]:checked');
  const type = typeInput ? typeInput.value : 'text';

  const textInput = container.querySelector('#watermarkText');
  const text = textInput ? textInput.value : '';

  const opacityInput = container.querySelector('#watermarkOpacity');
  const opacity = opacityInput ? opacityInput.value : 15;

  const positionInput = container.querySelector('input[name="watermarkPosition"]:checked');
  if (!positionInput) return;
  const position = positionInput.value;

  const sizeInput = container.querySelector('input[name="watermarkSize"]:checked');
  if (!sizeInput) return;
  const size = sizeInput.value;

  const watermarkEl = preview.querySelector('.watermark-overlay');
  if (!watermarkEl) return;

  // Reset styles
  watermarkEl.style = '';
  watermarkEl.innerHTML = '';

  // Common styles
  watermarkEl.style.opacity = opacity / 100;
  watermarkEl.style.position = 'absolute';
  watermarkEl.style.inset = '0';
  watermarkEl.style.pointerEvents = 'none';

  const isTiled = position === 'tiled';

  if (isTiled) {
    watermarkEl.style.backgroundRepeat = 'repeat';
    watermarkEl.style.backgroundPosition = 'center';
    if (type === 'logo' && organizationData.logo) {
      const logoUrl = resolveImagePath(organizationData.logo);
      const sizeValue = { small: '100px', medium: '150px', large: '200px' }[size];
      watermarkEl.style.backgroundImage = `url(${logoUrl})`;
      watermarkEl.style.backgroundSize = sizeValue;
    } else if (type === 'both' && organizationData.logo) {
      const logoUrl = resolveImagePath(organizationData.logo);
      const sizeValue = { small: '100px', medium: '150px', large: '200px' }[size];
      const fontSize = { small: 14, medium: 20, large: 28 }[size];
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="200"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="${fontSize}" fill="rgba(255,255,255,0.7)" transform="rotate(-30 125 100)">${escapeHtml(text || organizationData.name)}</text></svg>`;
      watermarkEl.style.backgroundImage = `url("data:image/svg+xml;base64,${btoa(svg)}"), url(${logoUrl})`;
      watermarkEl.style.backgroundSize = `250px 200px, ${sizeValue}`;
    } else {
      const fontSize = { small: 14, medium: 20, large: 28 }[size];
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="200"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="${fontSize}" fill="rgba(255,255,255,0.7)" transform="rotate(-30 125 100)">${escapeHtml(text || organizationData.name)}</text></svg>`;
      watermarkEl.style.backgroundImage = `url("data:image/svg+xml;base64,${btoa(svg)}")`;
    }
  } else {
    watermarkEl.style.display = 'flex';
    watermarkEl.style.justifyContent = position.includes('right') ? 'flex-end' : position.includes('left') ? 'flex-start' : 'center';
    watermarkEl.style.alignItems = position.includes('top') ? 'flex-start' : position.includes('bottom') ? 'flex-end' : 'center';
    watermarkEl.style.padding = '1rem';

    if (type === 'logo' && organizationData.logo) {
      const logoUrl = resolveImagePath(organizationData.logo);
      const sizeValue = { small: '10%', medium: '20%', large: '30%' }[size];
      watermarkEl.innerHTML = `<img src="${logoUrl}" style="width:${sizeValue}; height:auto; max-width:100%; max-height:100%;">`;
    } else if (type === 'both' && organizationData.logo) {
      const logoUrl = resolveImagePath(organizationData.logo);
      const sizeValue = { small: '10%', medium: '20%', large: '30%' }[size];
      const fontSize = { small: '1rem', medium: '1.5rem', large: '2.2rem' }[size];
      watermarkEl.innerHTML = `<div style="position:relative; display:inline-flex; align-items:center; justify-content:center;"><img src="${logoUrl}" style="width:${sizeValue}; height:auto; max-width:100%; max-height:100%; opacity:0.8;"><span style="position:absolute; font-family: Arial, sans-serif; font-weight: bold; color: white; font-size: ${fontSize}; text-shadow: 0 0 4px black, 0 0 2px black, 0 0 8px rgba(0,0,0,0.8); text-align:center; white-space:nowrap;">${escapeHtml(text || organizationData.name)}</span></div>`;
    } else {
      const fontSize = { small: '1rem', medium: '1.5rem', large: '2.2rem' }[size];
      watermarkEl.innerHTML = `<span style="font-family: Arial, sans-serif; font-weight: bold; color: white; font-size: ${fontSize}; text-shadow: 0 0 2px black;">${escapeHtml(text || organizationData.name)}</span>`;
    }
  }
}

export async function renderPerfil(container) {
  try {
    const response = await apiGet('/api/organization/profile');
    organizationData = response.data || response;
  } catch (error) {
    container.innerHTML = `<p style="color:#f87171;">Erro ao carregar dados do perfil.</p>`;
    return;
  }

  const data = organizationData;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:2.5rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:var(--text-primary);">Perfil e Identidade Visual</h2>

      <!-- LOGOTIPO -->
      <div style="background:var(--bg-surface); padding:1.5rem; border-radius:0.5rem; border:1px solid var(--border);">
        <h3 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin-bottom:1rem;">Dados do Estúdio</h3>
        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:1rem;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Nome do Estúdio</label>
            <input type="text" id="orgName" class="input" value="${escapeHtml(data.name || '')}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Email de Contato</label>
            <input type="email" id="orgEmail" class="input" value="${escapeHtml(data.email || '')}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Telefone / WhatsApp</label>
            <input type="text" id="orgWhatsapp" class="input" value="${escapeHtml(data.whatsapp || '')}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Website</label>
            <input type="text" id="orgWebsite" class="input" value="${escapeHtml(data.website || '')}">
          </div>
        </div>
      </div>

      <!-- LOGOTIPO -->
      <div style="background:var(--bg-surface); padding:1.5rem; border-radius:0.5rem; border:1px solid var(--border);">
        <h3 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin-bottom:1rem;">Logotipo</h3>
        <div style="display:flex; align-items:center; gap:1.5rem;">
            <img id="logoPreview" src="${data.logo ? resolveImagePath(data.logo) : PLACEHOLDER_LOGO}" onerror="this.src='${PLACEHOLDER_LOGO}'" style="height:50px; max-width:150px; background:white; padding:5px; border-radius:4px; object-fit: contain;">
            <div>
                <label style="background:var(--bg-hover); color:white; padding:0.5rem 1rem; border-radius:0.375rem; font-weight:600; cursor:pointer;">
                    Enviar Logo
                    <input type="file" id="logoUpload" accept=".jpg,.jpeg,.png,.svg,.webp" style="display:none;">
                </label>
                <div id="logoUploadProgress" style="margin-top:0.5rem;"></div>
            </div>
        </div>
      </div>

      <!-- WATERMARK -->
      <div style="background:var(--bg-surface); padding:1.5rem; border-radius:0.5rem; border:1px solid var(--border);">
        <h3 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin-bottom:1rem;">Marca D'água</h3>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            <!-- Coluna de Configurações -->
            <div style="display:flex; flex-direction:column; gap:1.5rem;">
                <div>
                    <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.5rem; color:var(--text-secondary);">Tipo</label>
                    <div style="display:flex; gap:1rem;">
                        <label style="color:var(--text-primary);"><input type="radio" name="watermarkType" value="text" ${data.watermarkType === 'text' ? 'checked' : ''}> Texto</label>
                        <label style="color:var(--text-primary);"><input type="radio" name="watermarkType" value="logo" ${data.watermarkType === 'logo' ? 'checked' : ''}> Logo</label>
                            <label style="color:var(--text-primary);"><input type="radio" name="watermarkType" value="both" ${data.watermarkType === 'both' ? 'checked' : ''}> Texto + Logo</label>
                    </div>
                </div>
                <div class="input-group" style="margin-bottom:0;">
                    <label>Texto da Marca D'água</label>
                    <input type="text" id="watermarkText" class="input" value="${escapeHtml(data.watermarkText || '')}" placeholder="Padrão: Nome do Estúdio">
                </div>
                <div>
                    <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.5rem; color:var(--text-secondary);">Opacidade (${data.watermarkOpacity || 15}%)</label>
                    <input type="range" id="watermarkOpacity" min="5" max="50" value="${data.watermarkOpacity || 15}" style="width:100%;">
                </div>
                <div>
                    <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.5rem; color:var(--text-secondary);">Posição</label>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                        ${positionOptions.map(opt => `
                            <label style="color:var(--text-primary); font-size:0.875rem;"><input type="radio" name="watermarkPosition" value="${opt.value}" ${data.watermarkPosition === opt.value ? 'checked' : ''}> ${opt.label}</label>
                        `).join('')}
                    </div>
                </div>
                <div>
                    <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.5rem; color:var(--text-secondary);">Tamanho</label>
                    <div style="display:flex; gap:1rem;">
                         ${sizeOptions.map(opt => `
                            <label style="color:var(--text-primary);"><input type="radio" name="watermarkSize" value="${opt.value}" ${data.watermarkSize === opt.value ? 'checked' : ''}> ${opt.label}</label>
                        `).join('')}
                    </div>
                </div>
            </div>
            <!-- Coluna de Preview -->
            <div>
                <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.5rem; color:var(--text-secondary);">Preview</label>
                <div id="watermarkPreview" style="position:relative; width:100%; aspect-ratio: 4/3; background:#555; border-radius:0.375rem; overflow:hidden;">
                    <img src="${PREVIEW_IMAGE}" style="width:100%; height:100%; object-fit:cover;">
                    <div class="watermark-overlay"></div>
                </div>
            </div>
        </div>
      </div>

      <!-- BOTAO SALVAR -->
      <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
        <button id="saveProfileBtn" style="background:var(--accent); color:white; padding:0.75rem 2rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
            Salvar Alterações
        </button>
      </div>
    </div>
  `;

  // --- EVENT LISTENERS ---

  // Upload logo
  container.querySelector('#logoUpload').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, appState.authToken, (percent) => {
        showUploadProgress('logoUploadProgress', percent);
      });
      organizationData.logo = result.url;
      container.querySelector('#logoPreview').src = resolveImagePath(result.url);
      updateWatermarkPreview(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    } finally {
      e.target.value = '';
      showUploadProgress('logoUploadProgress', 0);
    }
  };

  // Watermark Preview Listeners
  const watermarkControls = [
    '#watermarkText',
    '#watermarkOpacity',
    ...Array.from(container.querySelectorAll('input[name="watermarkType"]')),
    ...Array.from(container.querySelectorAll('input[name="watermarkPosition"]')),
    ...Array.from(container.querySelectorAll('input[name="watermarkSize"]')),
  ];

  const previewUpdater = () => updateWatermarkPreview(container);

  watermarkControls.forEach(control => {
    const el = typeof control === 'string' ? container.querySelector(control) : control;
    if (el) {
      el.addEventListener('input', previewUpdater);
      el.addEventListener('change', previewUpdater);
    }
  });

  // Salvar perfil
  container.querySelector('#saveProfileBtn').onclick = async (e) => {
    const btn = e.target;
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    const watermarkTypeInput = container.querySelector('input[name="watermarkType"]:checked');
    const watermarkPositionInput = container.querySelector('input[name="watermarkPosition"]:checked');
    const watermarkSizeInput = container.querySelector('input[name="watermarkSize"]:checked');

    const name = container.querySelector('#orgName').value.trim();
    if (!name) {
      window.showToast?.('O nome do estúdio é obrigatório.', 'warning');
      btn.textContent = 'Salvar Alterações';
      btn.disabled = false;
      return;
    }

    const payload = {
      name: name,
      email: container.querySelector('#orgEmail').value,
      whatsapp: container.querySelector('#orgWhatsapp').value,
      website: container.querySelector('#orgWebsite').value,
      logo: organizationData.logo,
      watermarkType: watermarkTypeInput ? watermarkTypeInput.value : 'text', // Fallback para o padrão
      watermarkText: container.querySelector('#watermarkText').value,
      watermarkOpacity: container.querySelector('#watermarkOpacity').value,
      watermarkPosition: watermarkPositionInput ? watermarkPositionInput.value : 'center', // Fallback para o padrão
      watermarkSize: watermarkSizeInput ? watermarkSizeInput.value : 'medium', // Fallback para o padrão
    };

    try {
      await apiPut('/api/organization/profile', payload);
      // Atualiza o cache local para o próximo render
      Object.assign(organizationData, payload);
      window.showToast?.('Perfil salvo com sucesso!', 'success');
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Salvar Alterações';
    }
  };

  // Initial render of the preview
  updateWatermarkPreview(container);
}
