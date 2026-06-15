import { apiGet, apiPut } from '../utils/api.js';

export async function renderIntegracoes(container) {
  container.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding:2rem;">Carregando...</div>';

  try {
    const res = await apiGet('/api/organization/profile');
    const org = res.data;
    const integrations = org.integrations || {};
    renderForm(container, integrations);
  } catch (error) {
    container.innerHTML = `<div style="color:var(--red); text-align:center; padding:2rem;">Erro ao carregar: ${error.message}</div>`;
  }
}

function renderForm(container, data) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.75rem; max-width:720px; margin:0 auto;">
      <div style="padding:1rem 0 1.5rem; border-bottom:1px solid var(--border); display:flex; flex-direction:column; align-items:center; text-align:center; gap:0.25rem;">
        <h2 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin:0;">Integrações &amp; Marketing</h2>
        <p style="font-size:0.8125rem; color:var(--text-secondary); margin:0;">Conecte ferramentas de análise e rastreamento ao seu site</p>
      </div>

      ${integrationCard({
        title: 'Google Analytics 4',
        toggleId: 'gaEnabled',
        enabled: data.googleAnalytics?.enabled,
        fieldId: 'gaId',
        fieldLabel: 'Measurement ID (G-XXXXXXXX)',
        value: data.googleAnalytics?.measurementId || '',
        placeholder: 'G-ABC123456',
        icon: '<path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>'
      })}

      ${integrationCard({
        title: 'Meta Pixel (Facebook)',
        toggleId: 'pixelEnabled',
        enabled: data.metaPixel?.enabled,
        fieldId: 'pixelId',
        fieldLabel: 'Pixel ID',
        value: data.metaPixel?.pixelId || '',
        placeholder: '1234567890',
        icon: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>'
      })}

      <div style="display:flex; justify-content:center; margin-top:0.5rem;">
        <button id="saveBtn" class="header-expand-btn" title="Salvar Configurações" style="cursor:pointer;">
          <span class="header-expand-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          </span>
          <span class="header-expand-label" style="font-weight:600;">Salvar Configurações</span>
        </button>
      </div>
    </div>
  `;

  container.querySelector('#saveBtn').onclick = async () => {
    const btn = container.querySelector('#saveBtn');
    const label = btn.querySelector('.header-expand-label');
    const original = label.textContent;
    label.textContent = 'Salvando...';
    btn.disabled = true;
    btn.style.opacity = '0.6';

    const payload = {
      googleAnalytics: {
        enabled: container.querySelector('#gaEnabled').checked,
        measurementId: container.querySelector('#gaId').value
      },
      metaPixel: {
        enabled: container.querySelector('#pixelEnabled').checked,
        pixelId: container.querySelector('#pixelId').value
      }
    };

    try {
      await apiPut('/api/organization/integrations', payload);
      window.showToast('Integrações salvas com sucesso!', 'success');
    } catch (error) {
      window.showToast('Erro: ' + error.message, 'error');
    } finally {
      label.textContent = original;
      btn.disabled = false;
      btn.style.opacity = '';
    }
  };
}

// Card de integração reutilizável (GA4, Meta Pixel): cabeçalho com ícone + toggle
// e um campo de ID. Mantém a identidade do DS (tokens, raios e fonte Inter herdada).
function integrationCard({ title, toggleId, enabled, fieldId, fieldLabel, value, placeholder, icon }) {
  return `
    <div style="background:var(--bg-surface); padding:1.75rem 1.5rem; border-radius:var(--r-card); border:1px solid var(--border); display:flex; flex-direction:column; align-items:center; text-align:center; gap:1.25rem;">
      <div style="display:flex; flex-direction:column; align-items:center; gap:0.75rem;">
        <span style="width:44px; height:44px; border-radius:var(--r-field); background:var(--bg-elevated); border:1px solid var(--border); display:inline-flex; align-items:center; justify-content:center; color:var(--text-primary);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
        </span>
        <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary); margin:0;">${title}</h3>
        <label style="display:inline-flex; align-items:center; gap:0.5rem; cursor:pointer;">
          <input type="checkbox" class="check" id="${toggleId}" ${enabled ? 'checked' : ''}>
          <span style="color:var(--text-secondary); font-size:0.875rem;">Ativar</span>
        </label>
      </div>
      <div style="width:100%; max-width:420px;">
        <label class="form-label" for="${fieldId}" style="text-align:center;">${fieldLabel}</label>
        <input type="text" id="${fieldId}" class="input" value="${value}" placeholder="${placeholder}"
          style="width:100%; box-sizing:border-box; text-align:center;">
      </div>
    </div>
  `;
}
