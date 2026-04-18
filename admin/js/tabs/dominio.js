import { apiGet, apiPost, apiDelete } from '../utils/api.js';

export async function renderDominio(container) {
  container.innerHTML = '<div style="color:var(--text-secondary);">Carregando...</div>';

  try {
    const data = await apiGet('/api/domains/status');
    renderContent(container, data);
  } catch (error) {
    container.innerHTML = `<div style="color:var(--red);">Erro ao carregar: ${error.message}</div>`;
  }
}

function renderContent(container, data) {
  const { customDomain, domainStatus, serverIP } = data;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:var(--text-primary);">Domínio Personalizado</h2>

      <div style="background:var(--bg-surface); padding:1.5rem; border-radius:0.5rem; border:1px solid var(--border);">
        <p style="color:var(--text-secondary); margin-bottom:1rem;">
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
        window.showConfirm?.('Tem certeza que deseja remover o domínio?', {
          confirmText: 'Remover',
          onConfirm: async () => {
            await apiDelete('/api/domains');
            renderDominio(container);
          }
        });
      };
    }

    const btnVerify = container.querySelector('#btnVerify');
    if (btnVerify) {
      btnVerify.onclick = async () => {
        btnVerify.textContent = 'Verificando...';
        btnVerify.disabled = true;
        try {
          const res = await apiPost('/api/domains/verify');
          window.showToast?.(res.message, res.success ? 'success' : 'info');
          if (res.success) {
            renderDominio(container);
          } else {
            btnVerify.textContent = 'Verificar DNS';
            btnVerify.disabled = false;
          }
        } catch (e) {
          window.showToast?.('Erro: ' + e.message, 'error');
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
          window.showToast?.('Erro: ' + e.message, 'error');
        }
      };
    }
  }
}

function renderActiveDomain(domain, status) {
  const isVerified = status === 'verified';
  const statusColor = isVerified ? 'var(--green)' : 'var(--yellow)';
  const statusText = isVerified ? '✓ Verificado e Ativo' : '⏳ Aguardando verificação DNS';

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-base); padding:1rem; border-radius:0.375rem; border:1px solid var(--border);">
      <div>
        <div style="font-size:1.1rem; font-weight:bold; color:var(--text-primary);">${domain}</div>
        <div style="color:${statusColor}; font-size:0.875rem; margin-top:0.25rem;">${statusText}</div>
      </div>
      <div style="display:flex; gap:0.5rem;">
        ${!isVerified ? `
          <button id="btnVerify" style="background:var(--accent); color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer;">
            Verificar DNS
          </button>
        ` : ''}
        <button id="btnRemove" style="background:var(--red); color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer;">
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
        style="flex:1; background:var(--bg-base); border:1px solid var(--border); color:var(--text-primary); padding:0.75rem; border-radius:0.375rem;">
      <button id="btnAdd" style="background:var(--accent); color:white; padding:0.75rem 1.5rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:bold;">
        Adicionar
      </button>
    </div>
  `;
}

function renderInstructions(domain, ip) {
  return `
    <div style="background:var(--bg-surface); padding:1.5rem; border-radius:0.5rem; border:1px solid var(--border);">
      <h3 style="color:var(--text-primary); font-weight:bold; margin-bottom:1rem;">Instruções de Configuração DNS</h3>
      <p style="color:var(--text-secondary); margin-bottom:1rem;">Acesse o painel onde comprou seu domínio (Hostinger, GoDaddy, Registro.br) e adicione o seguinte registro:</p>

      <table style="width:100%; text-align:left; border-collapse:collapse; color:var(--text-secondary);">
        <thead>
          <tr style="border-bottom:1px solid var(--border);">
            <th style="padding:0.5rem;">Tipo</th>
            <th style="padding:0.5rem;">Nome</th>
            <th style="padding:0.5rem;">Valor</th>
            <th style="padding:0.5rem;">TTL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:0.5rem; color:var(--accent);">A Record</td>
            <td style="padding:0.5rem;">${domain}</td>
            <td style="padding:0.5rem; font-family:monospace; background:var(--bg-base); border-radius:0.25rem;">${ip}</td>
            <td style="padding:0.5rem;">3600</td>
          </tr>
        </tbody>
      </table>

      <p style="color:var(--text-muted); font-size:0.875rem; margin-top:1rem;">
        Nota: A propagação do DNS pode levar de alguns minutos até 48 horas.
      </p>
    </div>
  `;
}
