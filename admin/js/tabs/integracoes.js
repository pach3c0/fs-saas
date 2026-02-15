/**
 * Tab: Integracoes
 */

import { appState, saveAppData } from '../state.js';

export async function renderIntegracoes(container) {
  const integracoes = appState.appData.integracoes || {};
  const meta = integracoes.metaPixel || { pixelId: '', accessToken: '', enabled: false };

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Integrações</h2>

      <!-- Meta Pixel / Facebook -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div style="width:2.5rem; height:2.5rem; background:#1877f2; border-radius:0.5rem; display:flex; align-items:center; justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </div>
            <div>
              <h3 style="font-size:1rem; font-weight:600; color:#f3f4f6;">Meta Pixel (Facebook/Instagram)</h3>
              <p style="font-size:0.75rem; color:#9ca3af;">Rastreamento de visitantes e conversoes</p>
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
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#9ca3af; margin-bottom:0.25rem;">Token da API de Conversoes (CAPI)</label>
          <div style="position:relative;">
            <input type="password" id="metaAccessToken" placeholder="Cole o token aqui" style="width:100%; padding:0.5rem 0.75rem; padding-right:3rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-family:monospace; font-size:0.75rem;"
              value="${meta.accessToken || ''}">
            <button id="toggleTokenBtn" type="button" style="position:absolute; right:0.5rem; top:50%; transform:translateY(-50%); background:none; border:none; color:#9ca3af; cursor:pointer; font-size:0.75rem; padding:0.25rem;">
              Mostrar
            </button>
          </div>
          <p style="font-size:0.6875rem; color:#6b7280; margin-top:0.25rem;">Gere em: Gerenciador de Eventos → Pixel → Configuracoes → API de Conversoes → Gerar token</p>
        </div>

        <div style="background:#111827; border:1px solid #374151; border-radius:0.375rem; padding:0.75rem;">
          <p style="font-size:0.75rem; color:#9ca3af; line-height:1.5;">
            <strong style="color:#d1d5db;">Como funciona:</strong> O Pixel rastreia visitantes do seu site e permite criar anuncios direcionados no Facebook/Instagram.
            A API de Conversoes (CAPI) envia os mesmos eventos pelo servidor, garantindo rastreamento mesmo com bloqueadores de anuncios.
          </p>
        </div>

        <div style="display:flex; align-items:center; gap:0.75rem;">
          <div id="metaStatus" style="display:flex; align-items:center; gap:0.375rem; font-size:0.75rem;">
            ${meta.enabled && meta.pixelId ? `
              <span style="width:0.5rem; height:0.5rem; background:#34d399; border-radius:9999px; display:inline-block;"></span>
              <span style="color:#34d399;">Pixel ativo</span>
            ` : `
              <span style="width:0.5rem; height:0.5rem; background:#6b7280; border-radius:9999px; display:inline-block;"></span>
              <span style="color:#6b7280;">Pixel inativo</span>
            `}
          </div>
        </div>
      </div>

      <!-- Google (futuro) -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; opacity:0.5;">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <div style="width:2.5rem; height:2.5rem; background:#4285f4; border-radius:0.5rem; display:flex; align-items:center; justify-content:center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          </div>
          <div>
            <h3 style="font-size:1rem; font-weight:600; color:#f3f4f6;">Google Analytics / Ads</h3>
            <p style="font-size:0.75rem; color:#9ca3af;">Em breve</p>
          </div>
        </div>
      </div>

      <button id="saveIntBtn" style="background:#2563eb; color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
        Salvar
      </button>
    </div>
  `;

  // Toggle Meta ativo
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
    const newIntegracoes = {
      metaPixel: {
        pixelId: container.querySelector('#metaPixelId').value.trim(),
        accessToken: container.querySelector('#metaAccessToken').value.trim(),
        enabled: metaToggle.checked
      }
    };
    appState.appData.integracoes = newIntegracoes;
    await saveAppData('integracoes', newIntegracoes);
    renderIntegracoes(container);
  };
}
