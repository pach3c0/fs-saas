/**
 * Tab: Perfil do Fotografo
 * Gerencia dados da organizacao: nome, logo, contato, bio, watermark
 */

import { appState } from '../state.js';
import { apiGet, apiPut } from '../utils/api.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { resolveImagePath, escapeHtml } from '../utils/helpers.js';

let profileData = {};

async function loadProfile() {
  const result = await apiGet('/api/organization/profile');
  profileData = result.data || {};
  return profileData;
}

export async function renderPerfil(container) {
  try {
    await loadProfile();
  } catch (error) {
    container.innerHTML = `<p style="color:#f87171;">Erro ao carregar perfil: ${error.message}</p>`;
    return;
  }

  const d = profileData;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Perfil do Estudio</h2>
        <span style="font-size:0.75rem; color:#9ca3af; background:#1f2937; padding:0.25rem 0.75rem; border-radius:9999px;">Plano: ${(d.plan || 'free').toUpperCase()}</span>
      </div>

      <!-- LOGOTIPO -->
      <div style="background:#1f2937; border-radius:0.5rem; padding:1.5rem; border:1px solid #374151;">
        <h3 style="font-size:1rem; font-weight:600; color:#f3f4f6; margin-bottom:1rem;">Logotipo</h3>
        <div style="display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap;">
          <div id="logoPreview" style="width:120px; height:120px; background:#111827; border:2px dashed #374151; border-radius:0.5rem; display:flex; align-items:center; justify-content:center; overflow:hidden;">
            ${d.logo
              ? `<img src="${resolveImagePath(d.logo)}" style="max-width:100%; max-height:100%; object-fit:contain;">`
              : `<span style="color:#6b7280; font-size:0.75rem; text-align:center;">Sem logo</span>`
            }
          </div>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            <label style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; font-weight:600; cursor:pointer; font-size:0.875rem; text-align:center;">
              Upload Logo
              <input type="file" accept=".jpg,.jpeg,.png,.svg,.webp" id="logoInput" style="display:none;">
            </label>
            <div id="logoProgress"></div>
            ${d.logo ? `<button id="removeLogo" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:0.8125rem;">Remover logo</button>` : ''}
            <p style="color:#6b7280; font-size:0.6875rem;">PNG ou SVG recomendado. Fundo transparente ideal.</p>
          </div>
        </div>
      </div>

      <!-- DADOS DO ESTUDIO -->
      <div style="background:#1f2937; border-radius:0.5rem; padding:1.5rem; border:1px solid #374151;">
        <h3 style="font-size:1rem; font-weight:600; color:#f3f4f6; margin-bottom:1rem;">Dados do Estudio</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <div style="grid-column:span 2;">
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">Nome do Estudio</label>
            <input type="text" id="profileName" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${escapeHtml(d.name || '')}">
          </div>
          <div>
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">Telefone</label>
            <input type="text" id="profilePhone" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${escapeHtml(d.phone || '')}" placeholder="(11) 99999-9999">
          </div>
          <div>
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">WhatsApp</label>
            <input type="text" id="profileWhatsapp" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${escapeHtml(d.whatsapp || '')}" placeholder="5511999999999">
          </div>
          <div>
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">Email</label>
            <input type="email" id="profileEmail" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${escapeHtml(d.email || '')}" placeholder="contato@estudio.com">
          </div>
          <div>
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">Website</label>
            <input type="url" id="profileWebsite" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${escapeHtml(d.website || '')}" placeholder="https://www.estudio.com">
          </div>
        </div>
      </div>

      <!-- ENDERECO -->
      <div style="background:#1f2937; border-radius:0.5rem; padding:1.5rem; border:1px solid #374151;">
        <h3 style="font-size:1rem; font-weight:600; color:#f3f4f6; margin-bottom:1rem;">Endereco</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <div style="grid-column:span 2;">
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">Endereco</label>
            <input type="text" id="profileAddress" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${escapeHtml(d.address || '')}" placeholder="Rua, numero, bairro">
          </div>
          <div>
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">Cidade</label>
            <input type="text" id="profileCity" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${escapeHtml(d.city || '')}">
          </div>
          <div>
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">Estado</label>
            <input type="text" id="profileState" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${escapeHtml(d.state || '')}" placeholder="SP">
          </div>
        </div>
      </div>

      <!-- BIO -->
      <div style="background:#1f2937; border-radius:0.5rem; padding:1.5rem; border:1px solid #374151;">
        <h3 style="font-size:1rem; font-weight:600; color:#f3f4f6; margin-bottom:1rem;">Bio / Descricao</h3>
        <textarea id="profileBio" rows="4" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem; resize:vertical;"
          placeholder="Conte um pouco sobre seu trabalho...">${escapeHtml(d.bio || '')}</textarea>
        <p style="color:#6b7280; font-size:0.6875rem; margin-top:0.375rem;">Exibido na galeria do cliente e no site publico.</p>
      </div>

      <!-- IDENTIDADE VISUAL -->
      <div style="background:#1f2937; border-radius:0.5rem; padding:1.5rem; border:1px solid #374151;">
        <h3 style="font-size:1rem; font-weight:600; color:#f3f4f6; margin-bottom:1rem;">Identidade Visual</h3>
        <div>
          <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">Cor Primaria</label>
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <input type="color" id="profileColor" value="${d.primaryColor || '#1a1a1a'}" style="width:48px; height:36px; border:1px solid #374151; border-radius:0.25rem; cursor:pointer; background:none;">
            <input type="text" id="profileColorText" style="width:120px; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${d.primaryColor || '#1a1a1a'}">
          </div>
          <p style="color:#6b7280; font-size:0.6875rem; margin-top:0.375rem;">Usada em botoes e destaques na galeria do cliente.</p>
        </div>
      </div>

      <!-- WATERMARK -->
      <div style="background:#1f2937; border-radius:0.5rem; padding:1.5rem; border:1px solid #374151;">
        <h3 style="font-size:1rem; font-weight:600; color:#f3f4f6; margin-bottom:1rem;">Watermark</h3>
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">Tipo</label>
            <select id="watermarkType" style="padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;">
              <option value="text" ${d.watermarkType === 'text' ? 'selected' : ''}>Texto</option>
              <option value="logo" ${d.watermarkType === 'logo' ? 'selected' : ''}>Logo</option>
            </select>
          </div>
          <div id="watermarkTextGroup">
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">Texto do Watermark</label>
            <input type="text" id="watermarkText" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${escapeHtml(d.watermarkText || d.name || '')}" placeholder="Nome do estudio">
          </div>
          <div>
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">Opacidade: <span id="opacityValue">${d.watermarkOpacity || 15}%</span></label>
            <input type="range" id="watermarkOpacity" min="5" max="50" value="${d.watermarkOpacity || 15}">
          </div>
          <!-- Preview watermark -->
          <div style="position:relative; width:100%; height:200px; background:#374151; border-radius:0.375rem; overflow:hidden; display:flex; align-items:center; justify-content:center;">
            <img src="/assets/images/placeholder.jpg" style="width:100%; height:100%; object-fit:cover; opacity:0.5;" onerror="this.style.display='none'">
            <div id="watermarkPreview" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none;">
              <span style="font-family:'Playfair Display',serif; font-size:1.5rem; color:rgba(255,255,255,${(d.watermarkOpacity || 15) / 100}); transform:rotate(-35deg); white-space:nowrap; letter-spacing:0.1em;">
                ${escapeHtml(d.watermarkText || d.name || 'SEU ESTUDIO')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- LINK DA GALERIA -->
      <div style="background:#1f2937; border-radius:0.5rem; padding:1.5rem; border:1px solid #374151;">
        <h3 style="font-size:1rem; font-weight:600; color:#f3f4f6; margin-bottom:0.5rem;">Link do seu Painel</h3>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <code id="slugUrl" style="flex:1; padding:0.5rem 0.75rem; background:#111827; border:1px solid #374151; border-radius:0.375rem; color:#60a5fa; font-size:0.875rem; word-break:break-all;">
            ${d.slug || 'seu-slug'}.fsfotografias.com.br
          </code>
          <button id="copySlug" style="background:#2563eb; color:white; padding:0.5rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500; white-space:nowrap;">
            Copiar
          </button>
        </div>
      </div>

      <!-- BOTAO SALVAR -->
      <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
        <span id="saveStatus" style="color:#34d399; font-size:0.875rem; align-self:center; display:none;">Salvo com sucesso!</span>
        <button id="saveProfileBtn" style="background:#2563eb; color:white; padding:0.625rem 2rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer; font-size:0.9375rem;">
          Salvar Perfil
        </button>
      </div>
    </div>
  `;

  // === EVENT LISTENERS ===

  // Upload logo
  container.querySelector('#logoInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, appState.authToken, (percent) => {
        showUploadProgress('logoProgress', percent);
      });
      profileData.logo = result.url;
      // Salvar imediatamente
      await apiPut('/api/organization/profile', { logo: result.url });
      e.target.value = '';
      renderPerfil(container);
    } catch (error) {
      alert('Erro no upload: ' + error.message);
    }
  };

  // Remover logo
  const removeLogo = container.querySelector('#removeLogo');
  if (removeLogo) {
    removeLogo.onclick = async () => {
      if (!confirm('Remover logotipo?')) return;
      profileData.logo = '';
      await apiPut('/api/organization/profile', { logo: '' });
      renderPerfil(container);
    };
  }

  // Sincronizar color picker e text input
  const colorPicker = container.querySelector('#profileColor');
  const colorText = container.querySelector('#profileColorText');
  colorPicker.oninput = () => { colorText.value = colorPicker.value; };
  colorText.onchange = () => {
    if (/^#[0-9a-fA-F]{6}$/.test(colorText.value)) {
      colorPicker.value = colorText.value;
    }
  };

  // Watermark type toggle
  const watermarkTypeSelect = container.querySelector('#watermarkType');
  const watermarkTextGroup = container.querySelector('#watermarkTextGroup');
  watermarkTypeSelect.onchange = () => {
    watermarkTextGroup.style.display = watermarkTypeSelect.value === 'text' ? 'block' : 'none';
  };
  watermarkTextGroup.style.display = watermarkTypeSelect.value === 'text' ? 'block' : 'none';

  // Opacity slider
  const opacitySlider = container.querySelector('#watermarkOpacity');
  const opacityValue = container.querySelector('#opacityValue');
  const watermarkPreview = container.querySelector('#watermarkPreview');
  opacitySlider.oninput = () => {
    opacityValue.textContent = opacitySlider.value + '%';
    const span = watermarkPreview.querySelector('span');
    if (span) span.style.color = `rgba(255,255,255,${opacitySlider.value / 100})`;
  };

  // Atualizar preview do watermark texto ao digitar
  const watermarkTextInput = container.querySelector('#watermarkText');
  watermarkTextInput.oninput = () => {
    const span = watermarkPreview.querySelector('span');
    if (span) span.textContent = watermarkTextInput.value || 'SEU ESTUDIO';
  };

  // Copiar slug
  container.querySelector('#copySlug').onclick = () => {
    const url = container.querySelector('#slugUrl').textContent.trim();
    navigator.clipboard.writeText(url);
    container.querySelector('#copySlug').textContent = 'Copiado!';
    setTimeout(() => { container.querySelector('#copySlug').textContent = 'Copiar'; }, 2000);
  };

  // Salvar perfil
  container.querySelector('#saveProfileBtn').onclick = async () => {
    const btn = container.querySelector('#saveProfileBtn');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    try {
      const updates = {
        name: container.querySelector('#profileName').value.trim(),
        phone: container.querySelector('#profilePhone').value.trim(),
        whatsapp: container.querySelector('#profileWhatsapp').value.trim(),
        email: container.querySelector('#profileEmail').value.trim(),
        website: container.querySelector('#profileWebsite').value.trim(),
        address: container.querySelector('#profileAddress').value.trim(),
        city: container.querySelector('#profileCity').value.trim(),
        state: container.querySelector('#profileState').value.trim(),
        bio: container.querySelector('#profileBio').value.trim(),
        primaryColor: container.querySelector('#profileColor').value,
        watermarkType: container.querySelector('#watermarkType').value,
        watermarkText: container.querySelector('#watermarkText').value.trim(),
        watermarkOpacity: parseInt(container.querySelector('#watermarkOpacity').value)
      };

      await apiPut('/api/organization/profile', updates);

      const status = container.querySelector('#saveStatus');
      status.style.display = 'inline';
      setTimeout(() => { status.style.display = 'none'; }, 3000);
    } catch (error) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Salvar Perfil';
    }
  };
}
