/**
 * Tab: Perfil e Identidade Visual
 */

import { apiGet, apiPut, apiPost } from '../utils/api.js';
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

      <!-- DADOS DO NEGÓCIO -->
      <div style="background:var(--bg-surface);padding:1.5rem;border-radius:0.5rem;border:1px solid var(--border);">
        <h3 style="font-size:1.25rem;font-weight:600;color:var(--text-primary);margin-bottom:1rem;">Dados do Negócio</h3>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">
          <div class="input-group" style="margin-bottom:0;"><label>Nome do Negócio</label><input type="text" id="orgName" class="input" value="${escapeHtml(data.name || '')}"></div>
          <div class="input-group" style="margin-bottom:0;"><label>Telefone / WhatsApp</label><input type="text" id="orgWhatsapp" class="input" value="${escapeHtml(data.whatsapp || '')}"></div>

          <!-- E-mail de contato: somente leitura — troca via solicitação ao suporte -->
          <div class="input-group" style="margin-bottom:0;">
            <label>Email de Contato 🔒</label>
            <input type="email" id="orgEmail" class="input" value="${escapeHtml(data.email || '')}" readonly
              style="background:var(--bg-base);color:var(--text-secondary);cursor:not-allowed;">
            <button type="button" id="requestEmailChangeBtn"
              style="margin-top:0.4rem;background:none;border:none;color:var(--accent);font-size:0.8rem;font-weight:600;cursor:pointer;padding:0;text-decoration:underline;">
              Solicitar troca de e-mail
            </button>
            <div id="emailChangeForm" style="display:none;margin-top:0.6rem;">
              <input type="email" id="newEmailInput" class="input" placeholder="Novo e-mail desejado" style="margin-bottom:0.4rem;">
              <div style="display:flex;gap:0.5rem;">
                <button type="button" id="sendEmailChangeBtn" style="background:var(--accent);color:white;padding:0.4rem 0.9rem;border-radius:0.375rem;border:none;font-weight:600;cursor:pointer;font-size:0.8rem;">Enviar solicitação</button>
                <button type="button" id="cancelEmailChangeBtn" style="background:var(--bg-hover);color:var(--text-primary);padding:0.4rem 0.9rem;border-radius:0.375rem;border:1px solid var(--border);cursor:pointer;font-size:0.8rem;">Cancelar</button>
              </div>
            </div>
          </div>

          <!-- Endereço do site: somente leitura — derivado do slug / domínio -->
          <div class="input-group" style="margin-bottom:0;">
            <label>Endereço do seu site 🔒</label>
            <input type="text" class="input" value="${escapeHtml(data.customDomain || data.siteUrl || '')}" readonly
              style="background:var(--bg-base);color:var(--text-secondary);cursor:not-allowed;">
            ${data.customDomain ? `<small style="display:block;margin-top:0.3rem;color:var(--text-secondary);font-size:0.75rem;">Plataforma: ${escapeHtml(data.siteUrl || '')}</small>` : `<small style="display:block;margin-top:0.3rem;color:var(--text-secondary);font-size:0.75rem;">Configure um domínio próprio na aba Domínio.</small>`}
          </div>
        </div>
      </div>

      <!-- LOGOTIPO -->
      <div style="background:var(--bg-surface);padding:1.5rem;border-radius:0.5rem;border:1px solid var(--border);">
        <h3 style="font-size:1.25rem;font-weight:600;color:var(--text-primary);margin-bottom:0.5rem;">Logotipo</h3>
        <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:1rem;">Aparece no seu <strong>site público</strong> e no painel. Não é a marca d'água — a marca d'água tem imagem própria na aba <strong>Marca D'água</strong>.</p>
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

  // Solicitar troca de e-mail de contato (vai por chamado p/ o super admin verificar)
  const emailChangeForm = container.querySelector('#emailChangeForm');
  container.querySelector('#requestEmailChangeBtn').onclick = () => {
    emailChangeForm.style.display = 'block';
    container.querySelector('#newEmailInput').focus();
  };
  container.querySelector('#cancelEmailChangeBtn').onclick = () => {
    emailChangeForm.style.display = 'none';
    container.querySelector('#newEmailInput').value = '';
  };
  container.querySelector('#sendEmailChangeBtn').onclick = async (e) => {
    const btn = e.target;
    const newEmail = container.querySelector('#newEmailInput').value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) {
      window.showToast?.('Informe um e-mail válido.', 'warning');
      return;
    }
    btn.textContent = 'Enviando...'; btn.disabled = true;
    try {
      await apiPost('/api/tickets', {
        subject: 'Solicitação de troca de e-mail de contato',
        category: 'outro',
        text: `O fotógrafo solicitou trocar o e-mail de contato.\n\nAtual: ${organizationData.email || '(vazio)'}\nNovo desejado: ${newEmail}\n\nConfirme a identidade antes de alterar.`
      });
      window.showToast?.('Solicitação enviada! Vamos confirmar com você pelo suporte.', 'success');
      emailChangeForm.style.display = 'none';
      container.querySelector('#newEmailInput').value = '';
    } catch (err) {
      window.showToast?.('Erro ao enviar: ' + err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Enviar solicitação';
    }
  };

  // Salvar perfil (dados do negócio)
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
        whatsapp: container.querySelector('#orgWhatsapp').value,
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
