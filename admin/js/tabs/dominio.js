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
    <div style="display:flex; flex-direction:column; gap:2.5rem;">

      ${renderRegisterDomainSection()}

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
    </div>
  `;

  wireRegisterDomain(container);

  // Event Listeners
  if (customDomain) {
    const btnRemove = container.querySelector('#btnRemove');
    if (btnRemove) {
      btnRemove.onclick = async () => {
        // showConfirm retorna Promise<boolean> — não existe callback onConfirm
        const ok = await window.showConfirm?.('Tem certeza que deseja remover o domínio?', {
          confirmText: 'Remover',
          danger: true
        });
        if (!ok) return;
        try {
          await apiDelete('/api/domains');
          renderDominio(container);
        } catch (e) {
          window.showToast?.('Erro: ' + e.message, 'error');
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

// ─── Registrar um domínio (Concierge — busca no app, pedido vira chamado) ──────
// Identidade visual verde reaproveitada dos Serviços Extras (pill/botão var(--green)).

function renderRegisterDomainSection() {
  return `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <div style="display:flex; align-items:center; gap:0.625rem;">
        <div style="width:40px; height:40px; border-radius:10px; background:rgba(63,185,80,0.15); color:var(--green); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <div>
          <h2 style="font-size:1.5rem; font-weight:bold; color:var(--text-primary); margin:0;">Registrar um domínio</h2>
          <p style="color:var(--text-secondary); font-size:0.875rem; margin:0.125rem 0 0;">Pesquise um nome e a gente registra pra você.</p>
        </div>
      </div>

      ${renderRegisterDomainBenefits()}

      <div style="background:var(--bg-surface); padding:1.5rem; border-radius:0.5rem; border:1px solid var(--border);">
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <input type="text" id="inputDomainSearch" placeholder="Digite o nome desejado"
            style="flex:1; min-width:200px; background:var(--bg-base); border:1px solid var(--border); color:var(--text-primary); padding:0.75rem; border-radius:0.375rem; font-family:inherit;">
          <button id="btnDomainSearch"
            style="display:inline-flex; align-items:center; gap:0.5rem; background:var(--green); color:#fff; padding:0.75rem 1.5rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:700; font-family:inherit;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            Pesquisar
          </button>
        </div>
        <p style="color:var(--text-muted); font-size:0.75rem; margin:0.75rem 0 0; line-height:1.5;">
          Digite só o nome (sem ponto). Mostramos a disponibilidade em várias extensões.
        </p>

        <div id="domainSearchResults" style="margin-top:1.25rem;"></div>
      </div>
    </div>
  `;
}

// Por que registrar pelo app (proposta de valor do modelo concierge): a equipe
// cuida da parte técnica e já entrega o domínio conectado ao site.
function renderRegisterDomainBenefits() {
  const beneficios = [
    {
      titulo: 'Sem complicação técnica',
      texto: 'A gente registra e configura o DNS pra você. Você não precisa entender de painel de registrador nem mexer em nada técnico.'
    },
    {
      titulo: 'Já conectado ao seu site',
      texto: 'Seu domínio sai apontando direto pro seu site CliqueZoom, pronto pra divulgar — sem etapas extras nem espera de configuração.'
    },
    {
      titulo: 'Suporte humano em português',
      texto: 'Nossa equipe acompanha cada passo, confirma a melhor extensão e tira suas dúvidas antes de finalizar o registro.'
    }
  ];

  const itens = beneficios.map(b => `
    <div style="display:flex; gap:0.75rem; align-items:flex-start;">
      <div style="flex-shrink:0; width:28px; height:28px; border-radius:50%; background:rgba(63,185,80,0.15); color:var(--green); display:flex; align-items:center; justify-content:center;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div>
        <div style="font-size:0.875rem; font-weight:700; color:var(--text-primary); margin-bottom:0.15rem;">${b.titulo}</div>
        <div style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.5;">${b.texto}</div>
      </div>
    </div>
  `).join('');

  return `
    <div style="background:linear-gradient(135deg, rgba(63,185,80,0.10), rgba(63,185,80,0.02)); border:1px solid rgba(63,185,80,0.25); border-radius:0.5rem; padding:1.5rem;">
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1.25rem;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m6.41 6.41 2.83 2.83"/><path d="M2 12h4"/><path d="M9.24 14.76 6.41 17.59"/><path d="M12 22v-4"/><path d="m17.59 17.59-2.83-2.83"/><path d="M22 12h-4"/><path d="m14.76 9.24 2.83-2.83"/></svg>
        <h3 style="font-size:1rem; font-weight:700; color:var(--text-primary); margin:0;">Por que registrar pelo CliqueZoom?</h3>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:1.25rem;">
        ${itens}
      </div>
    </div>
  `;
}

function wireRegisterDomain(container) {
  const input = container.querySelector('#inputDomainSearch');
  const btn = container.querySelector('#btnDomainSearch');
  if (!input || !btn) return;

  const doSearch = () => runDomainSearch(container, input.value.trim());
  btn.onclick = doSearch;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
}

async function runDomainSearch(container, raw) {
  const resultsEl = container.querySelector('#domainSearchResults');
  if (!resultsEl) return;

  const name = raw.toLowerCase().split('.')[0];
  if (!name || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) {
    window.showToast?.('Use apenas letras, números e hífen — sem espaços ou pontos.', 'error');
    return;
  }

  resultsEl.innerHTML = `<div style="color:var(--text-secondary); font-size:0.875rem; padding:0.5rem 0;">Pesquisando…</div>`;

  try {
    const data = await apiGet('/api/domains/check?name=' + encodeURIComponent(name));
    renderSearchResults(resultsEl, data.results || []);
  } catch (e) {
    resultsEl.innerHTML = '';
    window.showToast?.('Erro ao pesquisar: ' + e.message, 'error');
  }
}

function renderSearchResults(resultsEl, results) {
  if (!results.length) {
    resultsEl.innerHTML = `<div style="color:var(--text-secondary); font-size:0.875rem;">Nenhum resultado.</div>`;
    return;
  }

  const badge = (status) => {
    if (status === 'available') return { text: '✅ Disponível', color: 'var(--green)' };
    if (status === 'taken') return { text: '❌ Indisponível', color: 'var(--red)' };
    return { text: '⚠️ Não verificado', color: 'var(--yellow)' };
  };

  const rows = results.map(r => {
    const b = badge(r.status);
    const price = r.priceEstimate ? `<span style="color:var(--text-muted); font-size:0.75rem;">${r.priceEstimate} (estimativa)</span>` : '';
    const action = r.status === 'available'
      ? `<button class="btnWantDomain" data-domain="${r.domain}" data-tld="${r.tld}" data-price="${r.priceEstimate || ''}"
           style="display:inline-flex; align-items:center; gap:0.375rem; background:var(--green); color:#fff; padding:0.5rem 0.875rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:600; font-size:0.8125rem; font-family:inherit; white-space:nowrap;">
           Quero este domínio
         </button>`
      : `<span style="width:1px;"></span>`;
    return `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; background:var(--bg-base); border:1px solid var(--border); border-radius:0.375rem; padding:0.75rem 1rem;">
        <div style="display:flex; flex-direction:column; gap:0.25rem; min-width:0;">
          <span style="font-weight:600; color:var(--text-primary); font-size:0.9375rem;">${r.domain}</span>
          <span style="display:flex; align-items:center; gap:0.625rem; flex-wrap:wrap;">
            <span style="color:${b.color}; font-size:0.8125rem; font-weight:600;">${b.text}</span>
            ${price}
          </span>
        </div>
        ${action}
      </div>
    `;
  }).join('');

  resultsEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:0.5rem;">
      ${rows}
    </div>
    <p style="color:var(--text-muted); font-size:0.75rem; margin:1rem 0 0; line-height:1.6;">
      Disponibilidade aproximada — confirmamos tudo no atendimento antes de registrar.
      Apontar o domínio ao seu site requer o plano <strong style="color:var(--text-primary);">Pro</strong>; a equipe te orienta nesse passo.
    </p>
  `;

  resultsEl.querySelectorAll('.btnWantDomain').forEach(btn => {
    btn.onclick = () => requestDomain(btn);
  });
}

async function requestDomain(btn) {
  const domain = btn.dataset.domain;
  const tld = btn.dataset.tld;
  const price = btn.dataset.price;

  btn.disabled = true;
  btn.textContent = 'Enviando…';

  const text =
    `Quero registrar o domínio: ${domain}\n` +
    `Extensão: .${tld}\n` +
    (price ? `Estimativa: ${price}\n` : '') +
    `\nPor favor, me ajudem a registrar e apontar este domínio ao meu site.`;

  const form = new FormData();
  form.append('subject', `Registrar domínio: ${domain}`);
  form.append('category', 'duvida');
  form.append('text', text);

  try {
    await apiPost('/api/tickets', form);
    window.showToast?.('Pedido registrado! Acompanhe em Ajuda › Fala Conosco.', 'success');
    window.switchTab?.('ajuda');
  } catch (e) {
    window.showToast?.('Erro ao enviar pedido: ' + e.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Quero este domínio';
  }
}
