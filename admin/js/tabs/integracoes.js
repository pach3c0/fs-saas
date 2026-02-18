import { apiGet, apiPut } from '../utils/api.js';

export async function renderIntegracoes(container) {
  container.innerHTML = '<div style="color:#9ca3af;">Carregando...</div>';

  try {
    // Busca dados da organização (perfil) que contém o campo 'integrations'
    const res = await apiGet('/api/organization/profile');
    const org = res.organization;
    
    // Garante que o objeto integrations exista
    const integrations = org.integrations || {
      googleAnalytics: { enabled: false, measurementId: '' },
      metaPixel: { enabled: false, pixelId: '' },
      whatsapp: { enabled: true, number: '', message: '' }
    };

    renderForm(container, integrations);
  } catch (error) {
    container.innerHTML = `<div style="color:#f87171;">Erro ao carregar: ${error.message}</div>`;
  }
}

function renderForm(container, data) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:2rem; max-width:800px;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Integrações & Marketing</h2>

      <!-- WhatsApp Widget -->
      <div style="background:#1f2937; padding:1.5rem; border-radius:0.5rem; border:1px solid #374151;">
        <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
          <h3 style="font-size:1.1rem; font-weight:bold; color:#f3f4f6;">WhatsApp Flutuante</h3>
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" id="waEnabled" ${data.whatsapp?.enabled ? 'checked' : ''}>
            <span style="color:#d1d5db;">Ativar</span>
          </label>
        </div>
        <div style="display:grid; gap:1rem;">
          <div>
            <label style="display:block; color:#9ca3af; margin-bottom:0.25rem;">Número (com DDD)</label>
            <input type="text" id="waNumber" value="${data.whatsapp?.number || ''}" placeholder="5511999999999"
              style="width:100%; background:#111827; border:1px solid #374151; color:#f3f4f6; padding:0.5rem; border-radius:0.375rem;">
          </div>
          <div>
            <label style="display:block; color:#9ca3af; margin-bottom:0.25rem;">Mensagem Padrão</label>
            <input type="text" id="waMessage" value="${data.whatsapp?.message || ''}" placeholder="Olá! Gostaria de mais informações."
              style="width:100%; background:#111827; border:1px solid #374151; color:#f3f4f6; padding:0.5rem; border-radius:0.375rem;">
          </div>
        </div>
      </div>

      <!-- Google Analytics 4 -->
      <div style="background:#1f2937; padding:1.5rem; border-radius:0.5rem; border:1px solid #374151;">
        <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
          <h3 style="font-size:1.1rem; font-weight:bold; color:#f3f4f6;">Google Analytics 4</h3>
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" id="gaEnabled" ${data.googleAnalytics?.enabled ? 'checked' : ''}>
            <span style="color:#d1d5db;">Ativar</span>
          </label>
        </div>
        <div>
          <label style="display:block; color:#9ca3af; margin-bottom:0.25rem;">Measurement ID (G-XXXXXXXX)</label>
          <input type="text" id="gaId" value="${data.googleAnalytics?.measurementId || ''}" placeholder="G-ABC123456"
            style="width:100%; background:#111827; border:1px solid #374151; color:#f3f4f6; padding:0.5rem; border-radius:0.375rem;">
        </div>
      </div>

      <!-- Meta Pixel (Facebook) -->
      <div style="background:#1f2937; padding:1.5rem; border-radius:0.5rem; border:1px solid #374151;">
        <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
          <h3 style="font-size:1.1rem; font-weight:bold; color:#f3f4f6;">Meta Pixel (Facebook)</h3>
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" id="pixelEnabled" ${data.metaPixel?.enabled ? 'checked' : ''}>
            <span style="color:#d1d5db;">Ativar</span>
          </label>
        </div>
        <div>
          <label style="display:block; color:#9ca3af; margin-bottom:0.25rem;">Pixel ID</label>
          <input type="text" id="pixelId" value="${data.metaPixel?.pixelId || ''}" placeholder="1234567890"
            style="width:100%; background:#111827; border:1px solid #374151; color:#f3f4f6; padding:0.5rem; border-radius:0.375rem;">
        </div>
      </div>

      <button id="saveBtn" style="background:#2563eb; color:white; padding:0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:bold; font-size:1rem;">
        Salvar Configurações
      </button>
    </div>
  `;

  container.querySelector('#saveBtn').onclick = async () => {
    const btn = container.querySelector('#saveBtn');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    const payload = {
      integrations: {
        whatsapp: {
          enabled: container.querySelector('#waEnabled').checked,
          number: container.querySelector('#waNumber').value,
          message: container.querySelector('#waMessage').value
        },
        googleAnalytics: {
          enabled: container.querySelector('#gaEnabled').checked,
          measurementId: container.querySelector('#gaId').value
        },
        metaPixel: {
          enabled: container.querySelector('#pixelEnabled').checked,
          pixelId: container.querySelector('#pixelId').value
        }
      }
    };

    try {
      // Assume que a rota de perfil aceita atualização parcial de 'integrations'
      await apiPut('/api/organization/profile', payload);
      alert('Integrações salvas com sucesso!');
    } catch (error) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      btn.textContent = 'Salvar Configurações';
      btn.disabled = false;
    }
  };
}