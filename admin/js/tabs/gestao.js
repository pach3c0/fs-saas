// Aba "Gestão" — ERP Rhyno embutido via iframe com SSO (login único).
// O CliqueZoom gera uma URL de SSO (/api/gestao/sso-url); o iframe abre essa URL,
// o Rhyno autentica sozinho (sem tela de login) e cai no dashboard em modo embed
// (?embed=1, sem a sidebar própria). Parece um módulo nativo do CliqueZoom.
import { apiGet } from '../utils/api.js';

// POC: aponta para o Rhyno local. Em produção vira https://erp.cliquezoom.com.br
const RHYNO_BASE = 'http://localhost:5173';

// Seções do ERP agrupadas na sub-navegação (rota do React Router do Rhyno).
// Os grupos só organizam visualmente os botões; todos navegam do mesmo jeito
// (frame.src = RHYNO_BASE + path + '?embed=1'). O 1º item (Dashboard) é o ativo inicial.
const GRUPOS = [
  {
    grupo: 'Operação',
    itens: [
      { path: '/dashboard',      label: 'Dashboard' },
      { path: '/customers',      label: 'Clientes' },
      { path: '/service-orders', label: 'Ordens de Serviço' },
    ],
  },
  {
    grupo: 'Cadastros',
    itens: [
      { path: '/catalog',    label: 'Produtos / Serviços' },
      { path: '/categories', label: 'Categorias' },
    ],
  },
  {
    grupo: 'Financeiro',
    itens: [
      { path: '/financial/receivables',     label: 'Contas a Receber' },
      { path: '/financial/payables',        label: 'Contas a Pagar' },
      { path: '/financial/accounts',        label: 'Contas Financeiras' },
      { path: '/financial/categories',      label: 'Categorias DRE' },
      { path: '/financial/payment-methods', label: 'Formas de Pagamento' },
    ],
  },
  {
    grupo: 'Relacionamento',
    itens: [
      { path: '/crm', label: 'CRM' },
    ],
  },
];

export async function renderGestao(container) {
  // O Dashboard (primeiro item do primeiro grupo) é o ativo inicial.
  let _first = true;
  const grupos = GRUPOS.map(g => {
    const btns = g.itens.map(s => {
      const active = _first;
      _first = false;
      return `
        <button class="gestao-sec" data-path="${s.path}" data-active="${active}"
          style="padding:.45rem .85rem; font-size:.8125rem; font-weight:500; cursor:pointer;
                 border-radius:8px; border:1px solid var(--border);
                 background:${active ? 'var(--accent)' : 'var(--bg-base)'};
                 color:${active ? '#fff' : 'var(--text-secondary)'}; transition:all .15s;">
          ${s.label}
        </button>`;
    }).join('');
    return `
      <div style="display:flex; flex-direction:column; gap:.4rem;">
        <span style="font-size:.6875rem; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--text-muted);">${g.grupo}</span>
        <div style="display:flex; gap:.4rem; flex-wrap:wrap;">${btns}</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; height:calc(100vh - 110px);">
      <div style="display:flex; align-items:flex-start; gap:1rem; flex-wrap:wrap; padding-bottom:.85rem; border-bottom:1px solid var(--border);">
        <div id="gestaoSubnav" style="display:flex; gap:1.25rem; flex-wrap:wrap; align-items:flex-start;">${grupos}</div>
      </div>
      <div style="flex:1; min-height:0; margin-top:.85rem; border:1px solid var(--border);
                  border-radius:12px; overflow:hidden; background:var(--bg-surface); position:relative;">
        <iframe id="gestaoFrame" src="about:blank"
          style="width:100%; height:100%; border:0; display:block;"
          allow="clipboard-read; clipboard-write"></iframe>
      </div>
    </div>
  `;

  const frame = container.querySelector('#gestaoFrame');

  // Sub-navegação: após o SSO inicial, a sessão já vive no localStorage do iframe,
  // então basta navegar direto para a seção (sem refazer o SSO).
  container.querySelectorAll('.gestao-sec').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.gestao-sec').forEach(b => {
        const active = b === btn;
        b.dataset.active = active;
        b.style.background = active ? 'var(--accent)' : 'var(--bg-base)';
        b.style.color = active ? '#fff' : 'var(--text-secondary)';
      });
      frame.src = `${RHYNO_BASE}${btn.dataset.path}?embed=1`;
    });
  });

  // Carga inicial via SSO (login único)
  try {
    const resp = await apiGet('/api/gestao/sso-url?redirect=/dashboard');
    frame.src = resp.url;
  } catch (err) {
    // Fallback: abre direto (vai mostrar a tela de login do Rhyno)
    console.error('Falha ao gerar SSO do Rhyno:', err);
    frame.src = `${RHYNO_BASE}/dashboard?embed=1`;
  }
}
