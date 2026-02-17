/**
 * Tab: Integracoes
 */

import { apiGet, apiPut } from '../utils/api.js';

export async function renderIntegracoes(container) {
  // Carregar dados da Organization
  const org = await apiGet('/api/organization/profile');
  const integrations = org.integrations || {};

  const ga = integrations.googleAnalytics || { enabled: false, measurementId: '' };
  const meta = integrations.metaPixel || { enabled: false, pixelId: '', accessToken: '' };
  const whatsapp = integrations.whatsapp || { enabled: true, number: '', message: 'Olá! Vi seu site e gostaria de mais informações.', position: 'bottom-right', showOnMobile: true };
  const seo = integrations.seo || { googleSiteVerification: '', robots: 'index, follow' };

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <div>
        <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Integrações</h2>
        <p style="font-size:0.875rem; color:#9ca3af;">Configure ferramentas de marketing e analytics</p>
      </div>

      <!-- Google Analytics -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div style="width:2.5rem; height:2.5rem; background:#4285f4; border-radius:0.5rem; display:flex; align-items:center; justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            </div>
            <div>
              <h3 style="font-size:1rem; font-weight:600; color:#f3f4f6;">Google Analytics</h3>
              <p style="font-size:0.75rem; color:#9ca3af;">Rastreie visitantes e comportamento</p>
            </div>
          </div>
          <label style="position:relative; display:inline-block; width:3rem; height:1.5rem; cursor:pointer;">
            <input type="checkbox" id="gaEnabled" ${ga.enabled ? 'checked' : ''}
              style="opacity:0; width:0; height:0; position:absolute;">
            <span id="gaToggleTrack" style="position:absolute; inset:0; background:${ga.enabled ? '#16a34a' : '#374151'}; border-radius:9999px; transition:background 0.3s;"></span>
            <span id="gaToggleThumb" style="position:absolute; top:2px; left:${ga.enabled ? '26px' : '2px'}; width:1.25rem; height:1.25rem; background:white; border-radius:9999px; transition:left 0.3s; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>
          </label>
        </div>

        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Measurement ID</label>
          <input type="text" id="gaMeasurementId" placeholder="G-XXXXXXXXXX" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-family:monospace; font-size:0.875rem;"
            value="${ga.measurementId || ''}">
          <p style="font-size:0.6875rem; color:#6b7280; margin-top:0.25rem;">Encontre em: Google Analytics → Admin → Fluxos de dados → ID de mensuração</p>
        </div>

        <div style="display:flex; align-items:center; gap:0.375rem; font-size:0.75rem;">
          ${ga.enabled && ga.measurementId ? `
            <span style="width:0.5rem; height:0.5rem; background:#34d399; border-radius:9999px; display:inline-block;"></span>
            <span style="color:#34d399;">Google Analytics ativo</span>
          ` : `
            <span style="width:0.5rem; height:0.5rem; background:#6b7280; border-radius:9999px; display:inline-block;"></span>
            <span style="color:#6b7280;">Google Analytics inativo</span>
          `}
        </div>
      </div>

      <!-- Meta Pixel / Facebook -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div style="width:2.5rem; height:2.5rem; background:#1877f2; border-radius:0.5rem; display:flex; align-items:center; justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </div>
            <div>
              <h3 style="font-size:1rem; font-weight:600; color:#f3f4f6;">Meta Pixel (Facebook/Instagram)</h3>
              <p style="font-size:0.75rem; color:#9ca3af;">Rastreamento de visitantes e conversões</p>
            </div>
          </div>
          <label style="position:relative; display:inline-block; width:3rem; height:1.5rem; cursor:pointer;">
            <input type="checkbox" id="metaEnabled" ${meta.enabled ? 'checked' : ''}
              style="opacity:0; width:0; height:0; position:absolute;">
            <span id="metaToggleTrack" style="position:absolute; inset:0; background:${meta.enabled ? '#16a34a' : '#374151'}; border-radius:9999px; transition:background 0.3s;"></span>
            <span id="metaToggleThumb" style="position:absolute; top:2px; left:${meta.enabled ? '26px' : '2px'}; width:1.25rem; height:1.25rem; background:white; border-radius:9999px; transition:left 0.3s; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>
          </label>
        </div>

        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Pixel ID</label>
          <input type="text" id="metaPixelId" placeholder="Ex: 1104480228414314" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-family:monospace; font-size:0.875rem;"
            value="${meta.pixelId || ''}">
          <p style="font-size:0.6875rem; color:#6b7280; margin-top:0.25rem;">Encontre no Gerenciador de Eventos do Facebook</p>
        </div>

        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Token da API de Conversões (CAPI)</label>
          <div style="position:relative;">
            <input type="password" id="metaAccessToken" placeholder="Cole o token aqui" style="width:100%; padding:0.5rem 0.75rem; padding-right:3rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-family:monospace; font-size:0.75rem;"
              value="${meta.accessToken || ''}">
            <button id="toggleTokenBtn" type="button" style="position:absolute; right:0.5rem; top:50%; transform:translateY(-50%); background:none; border:none; color:#9ca3af; cursor:pointer; font-size:0.75rem; padding:0.25rem;">
              Mostrar
            </button>
          </div>
          <p style="font-size:0.6875rem; color:#6b7280; margin-top:0.25rem;">Gere em: Gerenciador de Eventos → Pixel → Configurações → API de Conversões → Gerar token</p>
        </div>

        <div style="display:flex; align-items:center; gap:0.375rem; font-size:0.75rem;">
          ${meta.enabled && meta.pixelId ? `
            <span style="width:0.5rem; height:0.5rem; background:#34d399; border-radius:9999px; display:inline-block;"></span>
            <span style="color:#34d399;">Pixel ativo</span>
          ` : `
            <span style="width:0.5rem; height:0.5rem; background:#6b7280; border-radius:9999px; display:inline-block;"></span>
            <span style="color:#6b7280;">Pixel inativo</span>
          `}
        </div>
      </div>

      <!-- WhatsApp Widget -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div style="width:2.5rem; height:2.5rem; background:#25d366; border-radius:0.5rem; display:flex; align-items:center; justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
            </div>
            <div>
              <h3 style="font-size:1rem; font-weight:600; color:#f3f4f6;">WhatsApp Widget</h3>
              <p style="font-size:0.75rem; color:#9ca3af;">Botão flutuante para contato direto</p>
            </div>
          </div>
          <label style="position:relative; display:inline-block; width:3rem; height:1.5rem; cursor:pointer;">
            <input type="checkbox" id="whatsappEnabled" ${whatsapp.enabled !== false ? 'checked' : ''}
              style="opacity:0; width:0; height:0; position:absolute;">
            <span id="whatsappToggleTrack" style="position:absolute; inset:0; background:${whatsapp.enabled !== false ? '#16a34a' : '#374151'}; border-radius:9999px; transition:background 0.3s;"></span>
            <span id="whatsappToggleThumb" style="position:absolute; top:2px; left:${whatsapp.enabled !== false ? '26px' : '2px'}; width:1.25rem; height:1.25rem; background:white; border-radius:9999px; transition:left 0.3s; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>
          </label>
        </div>

        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Número (deixe vazio para usar o número do perfil)</label>
          <input type="text" id="whatsappNumber" placeholder="${org.whatsapp || '5511999999999'}" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
            value="${whatsapp.number || ''}">
        </div>

        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Mensagem padrão</label>
          <textarea id="whatsappMessage" placeholder="Olá! Vi seu site..." style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem; min-height:4rem; resize:vertical;">${whatsapp.message || ''}</textarea>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Posição</label>
            <select id="whatsappPosition" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;">
              <option value="bottom-right" ${whatsapp.position === 'bottom-right' ? 'selected' : ''}>Inferior direito</option>
              <option value="bottom-left" ${whatsapp.position === 'bottom-left' ? 'selected' : ''}>Inferior esquerdo</option>
            </select>
          </div>
          <div style="display:flex; align-items:flex-end;">
            <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; width:100%;">
              <input type="checkbox" id="whatsappShowOnMobile" ${whatsapp.showOnMobile !== false ? 'checked' : ''}
                style="width:1rem; height:1rem; accent-color:#16a34a;">
              <span style="font-size:0.875rem; color:#f3f4f6;">Mostrar no mobile</span>
            </label>
          </div>
        </div>
      </div>

      <!-- SEO -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <div style="width:2.5rem; height:2.5rem; background:#9333ea; border-radius:0.5rem; display:flex; align-items:center; justify-content:center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 11.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V9h7V6.3l5.97 2.49v2.2H12v3z"/></svg>
          </div>
          <div>
            <h3 style="font-size:1rem; font-weight:600; color:#f3f4f6;">SEO Básico</h3>
            <p style="font-size:0.75rem; color:#9ca3af;">Otimização para motores de busca</p>
          </div>
        </div>

        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Google Site Verification</label>
          <input type="text" id="seoGoogleVerification" placeholder="Código de verificação" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-family:monospace; font-size:0.875rem;"
            value="${seo.googleSiteVerification || ''}">
          <p style="font-size:0.6875rem; color:#6b7280; margin-top:0.25rem;">Encontre no Google Search Console</p>
        </div>

        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Robots</label>
          <select id="seoRobots" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;">
            <option value="index, follow" ${seo.robots === 'index, follow' ? 'selected' : ''}>index, follow (padrão)</option>
            <option value="noindex, nofollow" ${seo.robots === 'noindex, nofollow' ? 'selected' : ''}>noindex, nofollow (ocultar dos buscadores)</option>
            <option value="noindex, follow" ${seo.robots === 'noindex, follow' ? 'selected' : ''}>noindex, follow</option>
            <option value="index, nofollow" ${seo.robots === 'index, nofollow' ? 'selected' : ''}>index, nofollow</option>
          </select>
        </div>
      </div>

      <button id="saveIntBtn" style="background:#2563eb; color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
        Salvar
      </button>
    </div>
  `;

  // Toggle Google Analytics
  const gaToggle = container.querySelector('#gaEnabled');
  const gaTrack = container.querySelector('#gaToggleTrack');
  const gaThumb = container.querySelector('#gaToggleThumb');

  gaToggle.onchange = () => {
    if (gaToggle.checked) {
      gaTrack.style.background = '#16a34a';
      gaThumb.style.left = '26px';
    } else {
      gaTrack.style.background = '#374151';
      gaThumb.style.left = '2px';
    }
  };

  // Toggle Meta
  const metaToggle = container.querySelector('#metaEnabled');
  const metaTrack = container.querySelector('#metaToggleTrack');
  const metaThumb = container.querySelector('#metaToggleThumb');

  metaToggle.onchange = () => {
    if (metaToggle.checked) {
      metaTrack.style.background = '#16a34a';
      metaThumb.style.left = '26px';
    } else {
      metaTrack.style.background = '#374151';
      metaThumb.style.left = '2px';
    }
  };

  // Toggle WhatsApp
  const whatsappToggle = container.querySelector('#whatsappEnabled');
  const whatsappTrack = container.querySelector('#whatsappToggleTrack');
  const whatsappThumb = container.querySelector('#whatsappToggleThumb');

  whatsappToggle.onchange = () => {
    if (whatsappToggle.checked) {
      whatsappTrack.style.background = '#16a34a';
      whatsappThumb.style.left = '26px';
    } else {
      whatsappTrack.style.background = '#374151';
      whatsappThumb.style.left = '2px';
    }
  };

  // Mostrar/ocultar token
  const tokenInput = container.querySelector('#metaAccessToken');
  const toggleBtn = container.querySelector('#toggleTokenBtn');
  toggleBtn.onclick = () => {
    if (tokenInput.type === 'password') {
      tokenInput.type = 'text';
      toggleBtn.textContent = 'Ocultar';
    } else {
      tokenInput.type = 'password';
      toggleBtn.textContent = 'Mostrar';
    }
  };

  // Salvar
  container.querySelector('#saveIntBtn').onclick = async () => {
    const newIntegrations = {
      googleAnalytics: {
        enabled: gaToggle.checked,
        measurementId: container.querySelector('#gaMeasurementId').value.trim()
      },
      metaPixel: {
        enabled: metaToggle.checked,
        pixelId: container.querySelector('#metaPixelId').value.trim(),
        accessToken: container.querySelector('#metaAccessToken').value.trim()
      },
      whatsapp: {
        enabled: whatsappToggle.checked,
        number: container.querySelector('#whatsappNumber').value.trim(),
        message: container.querySelector('#whatsappMessage').value.trim() || 'Olá! Vi seu site e gostaria de mais informações.',
        position: container.querySelector('#whatsappPosition').value,
        showOnMobile: container.querySelector('#whatsappShowOnMobile').checked
      },
      seo: {
        googleSiteVerification: container.querySelector('#seoGoogleVerification').value.trim(),
        robots: container.querySelector('#seoRobots').value
      }
    };

    await apiPut('/api/organization/profile', { integrations: newIntegrations });
    alert('Salvo com sucesso!');
    renderIntegracoes(container);
  };
}
