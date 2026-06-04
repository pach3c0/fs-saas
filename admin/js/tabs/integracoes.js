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

      <!-- Lembrete de prazo: movido para Configurações -->
      <div style="background:var(--ad-bg-surface); padding:1rem 1.25rem; border-radius:0.5rem; border:1px solid color-mix(in srgb, var(--ad-text) 15%, transparent); font-size:0.875rem; color:var(--ad-text);">
        💡 O <strong>lembrete de prazo de seleção</strong> agora é configurado em
        <a href="#" onclick="window.switchTab('configuracoes'); return false;" style="color:var(--ad-accent); font-weight:600; text-decoration:underline; cursor:pointer;">Configurações › Escassês &amp; Vendas</a>.
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
