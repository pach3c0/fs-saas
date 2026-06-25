/**
 * Tab: Perfil e Identidade Visual
 */

import { apiGet, apiPut } from '../utils/api.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { resolveImagePath, escapeHtml } from '../utils/helpers.js';
import { appState } from '../state.js';

let organizationData = {};

const PLACEHOLDER_LOGO = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iNTAiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzNzQxNTEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZpbGw9IiNmZmYiPkxvZ288L3RleHQ+PC9zdmc+';

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export async function renderPerfil(container) {
  try {
    const response = await apiGet('/api/organization/profile');
    organizationData = response.data || response;
  } catch (error) {
    container.innerHTML = `<p style="color:var(--red);">Erro ao carregar dados do perfil.</p>`;
    return;
  }

  const data = organizationData;

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:2.5rem;animation:fadeInUp 0.3s ease;">
      <h2 style="font-size:1.5rem;font-weight:bold;color:var(--text-primary);">Perfil e Identidade Visual</h2>

      <!-- DADOS DO ESTÚDIO -->
      <div style="background:var(--bg-surface);padding:1.5rem;border-radius:0.5rem;border:1px solid var(--border);">
        <h3 style="font-size:1.25rem;font-weight:600;color:var(--text-primary);margin-bottom:1rem;">Dados do Negócio</h3>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">
          <div class="input-group" style="margin-bottom:0;"><label>Nome do Negócio</label><input type="text" id="orgName" class="input" value="${escapeHtml(data.name || '')}"></div>
          <div class="input-group" style="margin-bottom:0;"><label>Email de Contato</label><input type="email" id="orgEmail" class="input" value="${escapeHtml(data.email || '')}"></div>
          <div class="input-group" style="margin-bottom:0;"><label>Telefone / WhatsApp</label><input type="text" id="orgWhatsapp" class="input" value="${escapeHtml(data.whatsapp || '')}"></div>
          <div class="input-group" style="margin-bottom:0;"><label>Website</label><input type="text" id="orgWebsite" class="input" value="${escapeHtml(data.website || '')}"></div>
        </div>
      </div>

      <!-- LOGOTIPO -->
      <div style="background:var(--bg-surface);padding:1.5rem;border-radius:0.5rem;border:1px solid var(--border);">
        <h3 style="font-size:1.25rem;font-weight:600;color:var(--text-primary);margin-bottom:1rem;">Logotipo</h3>
        <div style="display:flex;align-items:center;gap:1.5rem;">
          <img id="logoPreview" src="${data.logo ? resolveImagePath(data.logo) : PLACEHOLDER_LOGO}" onerror="this.src='${PLACEHOLDER_LOGO}'" style="height:50px;max-width:150px;background:white;padding:5px;border-radius:4px;object-fit:contain;">
          <div>
            <label style="background:var(--bg-hover);color:var(--text-primary);padding:0.5rem 1rem;border-radius:0.375rem;font-weight:600;cursor:pointer;border:1px solid var(--border);">
              Enviar Logo <input type="file" id="logoUpload" accept=".jpg,.jpeg,.png,.svg,.webp" style="display:none;">
            </label>
            <div id="logoUploadProgress" style="margin-top:0.5rem;"></div>
          </div>
        </div>
      </div>

      <!-- SALVAR PERFIL -->
      <div style="display:flex;justify-content:flex-end;">
        <button id="saveProfileBtn" style="background:var(--accent);color:white;padding:0.75rem 2rem;border-radius:0.375rem;border:none;font-weight:600;cursor:pointer;">Salvar Perfil</button>
      </div>
    </div>
  `;

  // ---- EVENTOS ----

  // Logo upload
  container.querySelector('#logoUpload').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, appState.authToken, (pct) => showUploadProgress('logoUploadProgress', pct));
      organizationData.logo = result.url;
      container.querySelector('#logoPreview').src = resolveImagePath(result.url);
    } catch (err) {
      window.showToast?.('Erro: ' + err.message, 'error');
    } finally {
      e.target.value = '';
      showUploadProgress('logoUploadProgress', 0);
    }
  };

  // Salvar perfil (dados do estúdio)
  container.querySelector('#saveProfileBtn').onclick = async (e) => {
    const btn = e.target;
    btn.textContent = 'Salvando...'; btn.disabled = true;
    const name = container.querySelector('#orgName').value.trim();
    if (!name) {
      window.showToast?.('O nome do negócio é obrigatório.', 'warning');
      btn.textContent = 'Salvar Perfil'; btn.disabled = false; return;
    }
    try {
      await apiPut('/api/organization/profile', {
        name,
        email: container.querySelector('#orgEmail').value,
        whatsapp: container.querySelector('#orgWhatsapp').value,
        website: container.querySelector('#orgWebsite').value,
        logo: organizationData.logo
      });
      Object.assign(organizationData, { name });
      window.showToast?.('Perfil salvo!', 'success');
    } catch (err) {
      window.showToast?.('Erro: ' + err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Salvar Perfil';
    }
  };
}
