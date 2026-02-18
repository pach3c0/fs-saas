import { apiGet, apiPost, apiDelete } from '../utils/api.js';

export async function renderDominio(container) {
  container.innerHTML = '<div style="color:#9ca3af;">Carregando...</div>';
  
  try {
    const data = await apiGet('/api/domains/status');
    renderContent(container, data);
  } catch (error) {
    container.innerHTML = `<div style="color:#f87171;">Erro ao carregar: ${error.message}</div>`;
  }
}

function renderContent(container, data) {
  const { customDomain, domainStatus, serverIP } = data;
  
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Domínio Personalizado</h2>
      
      <div style="background:#1f2937; padding:1.5rem; border-radius:0.5rem; border:1px solid #374151;">
        <p style="color:#d1d5db; margin-bottom:1rem;">
          Conecte seu próprio domínio (ex: www.seunome.com.br) ao seu site.
        </p>

        ${customDomain ? renderActiveDomain(customDomain, domainStatus) : renderAddDomainForm()}
      </div>

      ${customDomain && domainStatus !== 'verified' ? renderInstructions(customDomain, serverIP) : ''}
    </div>
  `;

  // Event Listeners
  if (customDomain) {
    const btnRemove = container.querySelector('#btnRemove');
    if (btnRemove) {
      btnRemove.onclick = async () => {
        if (confirm('Tem certeza que deseja remover o domínio?')) {
          await apiDelete('/api/domains');
          renderDominio(container);
        }
      };
    }

    const btnVerify = container.querySelector('#btnVerify');
    if (btnVerify) {
      btnVerify.onclick = async () => {
        btnVerify.textContent = 'Verificando...';
        btnVerify.disabled = true;
        try {
          const res = await apiPost('/api/domains/verify');
          if (res.success) {
            alert(res.message);
            renderDominio(container);
          } else {
            alert(res.message);
            btnVerify.textContent = 'Verificar DNS';
            btnVerify.disabled = false;
          }
        } catch (e) {
          alert('Erro: ' + e.message);
          btnVerify.textContent = 'Verificar DNS';
          btnVerify.disabled = false;
        }
      };
    }
  } else {
    const btnAdd = container.querySelector('#btnAdd');
    if (btnAdd) {
      btnAdd.onclick = async () => {
        const domain = container.querySelector('#inputDomain').value.trim();
        if (!domain) return;
        
        try {
          await apiPost('/api/domains', { domain });
          renderDominio(container);
        } catch (e) {
          alert('Erro: ' + e.message);
        }
      };
    }
  }
}

function renderActiveDomain(domain, status) {
  const isVerified = status === 'verified';
  const statusColor = isVerified ? '#34d399' : '#fbbf24';
  const statusText = isVerified ? '✓ Verificado e Ativo' : '⏳ Aguardando verificação DNS';

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; background:#111827; padding:1rem; border-radius:0.375rem; border:1px solid #374151;">
      <div>
        <div style="font-size:1.1rem; font-weight:bold; color:#f3f4f6;">${domain}</div>
        <div style="color:${statusColor}; font-size:0.875rem; margin-top:0.25rem;">${statusText}</div>
      </div>
      <div style="display:flex; gap:0.5rem;">
        ${!isVerified ? `
          <button id="btnVerify" style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer;">
            Verificar DNS
          </button>
        ` : ''}
        <button id="btnRemove" style="background:#ef4444; color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer;">
          Remover
        </button>
      </div>
    </div>
  `;
}

function renderAddDomainForm() {
  return `
    <div style="display:flex; gap:0.5rem;">
      <input type="text" id="inputDomain" placeholder="ex: www.seunome.com.br" 
        style="flex:1; background:#111827; border:1px solid #374151; color:#f3f4f6; padding:0.75rem; border-radius:0.375rem;">
      <button id="btnAdd" style="background:#2563eb; color:white; padding:0.75rem 1.5rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:bold;">
        Adicionar
      </button>
    </div>
  `;
}

function renderInstructions(domain, ip) {
  return `
    <div style="background:#1f2937; padding:1.5rem; border-radius:0.5rem; border:1px solid #374151;">
      <h3 style="color:#f3f4f6; font-weight:bold; margin-bottom:1rem;">Instruções de Configuração DNS</h3>
      <p style="color:#d1d5db; margin-bottom:1rem;">Acesse o painel onde comprou seu domínio (Hostinger, GoDaddy, Registro.br) e adicione o seguinte registro:</p>
      
      <table style="width:100%; text-align:left; border-collapse:collapse; color:#d1d5db;">
        <thead>
          <tr style="border-bottom:1px solid #374151;">
            <th style="padding:0.5rem;">Tipo</th>
            <th style="padding:0.5rem;">Nome</th>
            <th style="padding:0.5rem;">Valor</th>
            <th style="padding:0.5rem;">TTL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:0.5rem; color:#60a5fa;">A Record</td>
            <td style="padding:0.5rem;">${domain}</td>
            <td style="padding:0.5rem; font-family:monospace; background:#111827; padding:0.25rem 0.5rem; border-radius:0.25rem;">${ip}</td>
            <td style="padding:0.5rem;">3600</td>
          </tr>
        </tbody>
      </table>
      
      <p style="color:#9ca3af; font-size:0.875rem; margin-top:1rem;">
        Nota: A propagação do DNS pode levar de alguns minutos até 48 horas.
      </p>
    </div>
  `;
}