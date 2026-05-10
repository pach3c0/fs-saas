import { apiGet, apiPut } from '../utils/api.js';

export async function renderIntegracoes(container) {
  container.innerHTML = '<div style="color:var(--ad-text);">Carregando...</div>';

  try {
    const res = await apiGet('/api/organization/profile');
    const org = res.data;
    const integrations = org.integrations || {};
    renderForm(container, integrations);
  } catch (error) {
    container.innerHTML = `<div style="color:var(--ad-red);">Erro ao carregar: ${error.message}</div>`;
  }
}

function renderForm(container, data) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:2rem; max-width:800px;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:var(--ad-text);">Integrações & Marketing</h2>

      <!-- Google Analytics 4 -->
      <div style="background:var(--ad-bg-surface); padding:1.5rem; border-radius:0.5rem; border:1px solid color-mix(in srgb, var(--ad-text) 15%, transparent);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3 style="font-size:1.1rem; font-weight:bold; color:var(--ad-text); margin:0;">Google Analytics 4</h3>
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" id="gaEnabled" ${data.googleAnalytics?.enabled ? 'checked' : ''}>
            <span style="color:var(--ad-text);">Ativar</span>
          </label>
        </div>
        <div>
          <label style="display:block; color:var(--ad-text); opacity:0.7; margin-bottom:0.25rem; font-size:0.875rem;">Measurement ID (G-XXXXXXXX)</label>
          <input type="text" id="gaId" value="${data.googleAnalytics?.measurementId || ''}" placeholder="G-ABC123456"
            style="width:100%; background:var(--ad-bg-base); border:1px solid color-mix(in srgb, var(--ad-text) 20%, transparent); color:var(--ad-text); padding:0.5rem 0.75rem; border-radius:0.375rem; font-size:0.9375rem;">
        </div>
      </div>

      <!-- Meta Pixel (Facebook) -->
      <div style="background:var(--ad-bg-surface); padding:1.5rem; border-radius:0.5rem; border:1px solid color-mix(in srgb, var(--ad-text) 15%, transparent);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3 style="font-size:1.1rem; font-weight:bold; color:var(--ad-text); margin:0;">Meta Pixel (Facebook)</h3>
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" id="pixelEnabled" ${data.metaPixel?.enabled ? 'checked' : ''}>
            <span style="color:var(--ad-text);">Ativar</span>
          </label>
        </div>
        <div>
          <label style="display:block; color:var(--ad-text); opacity:0.7; margin-bottom:0.25rem; font-size:0.875rem;">Pixel ID</label>
          <input type="text" id="pixelId" value="${data.metaPixel?.pixelId || ''}" placeholder="1234567890"
            style="width:100%; background:var(--ad-bg-base); border:1px solid color-mix(in srgb, var(--ad-text) 20%, transparent); color:var(--ad-text); padding:0.5rem 0.75rem; border-radius:0.375rem; font-size:0.9375rem;">
        </div>
      </div>

      <!-- Automação de Prazos -->
      <div style="background:var(--ad-bg-surface); padding:1.5rem; border-radius:0.5rem; border:1px solid color-mix(in srgb, var(--ad-text) 15%, transparent);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
          <div>
            <h3 style="font-size:1.1rem; font-weight:bold; color:var(--ad-text); margin:0 0 0.25rem;">Automação de Prazos</h3>
            <p style="font-size:0.75rem; color:var(--ad-text); opacity:0.6; margin:0;">Envia e-mail automático ao cliente quando o prazo de seleção está próximo de expirar.</p>
          </div>
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; flex-shrink:0; margin-left:1rem;">
            <input type="checkbox" id="deadlineEnabled" ${data.deadlineAutomation?.enabled ? 'checked' : ''}>
            <span style="color:var(--ad-text);">Ativar</span>
          </label>
        </div>
        <div style="display:grid; gap:1rem;">
          <div>
            <label style="display:block; color:var(--ad-text); opacity:0.7; margin-bottom:0.25rem; font-size:0.875rem;">Dias de antecedência para aviso</label>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <input type="number" id="deadlineDays" value="${data.deadlineAutomation?.daysWarning ?? 3}" min="1" max="30"
                style="width:100px; background:var(--ad-bg-base); border:1px solid color-mix(in srgb, var(--ad-text) 20%, transparent); color:var(--ad-text); padding:0.5rem 0.75rem; border-radius:0.375rem; font-size:0.9375rem;">
              <span style="color:var(--ad-text); opacity:0.6; font-size:0.875rem;">dias antes do prazo</span>
            </div>
          </div>
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" id="deadlineSendEmail" ${data.deadlineAutomation?.sendEmail !== false ? 'checked' : ''}>
            <span style="color:var(--ad-text); font-size:0.875rem;">Enviar e-mail ao cliente</span>
          </label>
        </div>
      </div>

      <button id="saveBtn" style="background:var(--ad-accent); color:var(--ad-bg-base); padding:0.75rem 1.5rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:bold; font-size:1rem; align-self:flex-start;">
        Salvar Configurações
      </button>
    </div>
  `;

  container.querySelector('#saveBtn').onclick = async () => {
    const btn = container.querySelector('#saveBtn');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    const payload = {
      googleAnalytics: {
        enabled: container.querySelector('#gaEnabled').checked,
        measurementId: container.querySelector('#gaId').value
      },
      metaPixel: {
        enabled: container.querySelector('#pixelEnabled').checked,
        pixelId: container.querySelector('#pixelId').value
      },
      deadlineAutomation: {
        enabled: container.querySelector('#deadlineEnabled').checked,
        daysWarning: parseInt(container.querySelector('#deadlineDays').value) || 3,
        sendEmail: container.querySelector('#deadlineSendEmail').checked
      }
    };

    try {
      await apiPut('/api/organization/integrations', payload);
      window.showToast('Integrações salvas com sucesso!', 'success');
    } catch (error) {
      window.showToast('Erro: ' + error.message, 'error');
    } finally {
      btn.textContent = 'Salvar Configurações';
      btn.disabled = false;
    }
  };
}
