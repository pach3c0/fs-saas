// Aba "Gestão" — ERP Rhyno embutido via iframe com SSO (login único).
// O CliqueZoom gera uma URL de SSO (/api/gestao/sso-url); o iframe abre essa URL,
// o Rhyno autentica sozinho (sem tela de login) e cai no dashboard em modo embed
// (?embed=1, sem a sidebar própria). Parece um módulo nativo do CliqueZoom.
import { apiGet } from '../utils/api.js';

import { appState } from '../state.js';

// POC: aponta para o Rhyno local. Em produção vira https://erp.cliquezoom.com.br
const RHYNO_BASE = 'http://localhost:5173';

// `icon` = inner paths de um ícone Lucide (traço). Renderizado dentro de um <svg>
// com stroke=currentColor no app.js, herdando a cor do texto do item.
export const GRUPOS = [
  {
    grupo: 'Operação',
    itens: [
      { path: '/dashboard',      label: 'Dashboard',          icon: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>' },
      { path: '/customers',      label: 'Clientes',           icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
      { path: '/service-orders', label: 'Ordens de Serviço',  icon: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>' },
    ],
  },
  {
    grupo: 'Cadastros',
    itens: [
      { path: '/catalog',    label: 'Produtos / Serviços', icon: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>' },
      { path: '/categories', label: 'Categorias',          icon: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>' },
    ],
  },
  {
    grupo: 'Financeiro',
    itens: [
      { path: '/financial/receivables',     label: 'Contas a Receber',    icon: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>' },
      { path: '/financial/payables',        label: 'Contas a Pagar',      icon: '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>' },
      { path: '/financial/accounts',        label: 'Contas Financeiras',  icon: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>' },
      { path: '/financial/categories',      label: 'Categorias DRE',      icon: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>' },
      { path: '/financial/payment-methods', label: 'Formas de Pagamento', icon: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>' },
    ],
  },
  {
    grupo: 'Relacionamento',
    itens: [
      { path: '/crm', label: 'CRM', icon: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>' },
    ],
  },
];

export async function renderGestao(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; height:calc(100vh - 110px);">
      <div style="flex:1; min-height:0; border:1px solid var(--border);
                  border-radius:12px; overflow:hidden; background:var(--bg-surface); position:relative;">
        <iframe id="gestaoFrame" src="about:blank"
          style="width:100%; height:100%; border:0; display:block;"
          allow="clipboard-read; clipboard-write"></iframe>
      </div>
    </div>
  `;

  const frame = container.querySelector('#gestaoFrame');
  const theme = document.documentElement.getAttribute('data-theme') || 'light';

  // Expor função para navegar o iframe sem refazer SSO
  window.__gestaoGoTo = (path) => {
    frame.src = `${RHYNO_BASE}${path}?embed=1&theme=${theme}`;
  };

  const initialPath = appState.gestaoInitialPath || '/dashboard';

  // Carga inicial via SSO (login único)
  try {
    const resp = await apiGet(`/api/gestao/sso-url?redirect=${initialPath}`);
    frame.src = resp.url.includes('?') ? `${resp.url}&theme=${theme}` : `${resp.url}?theme=${theme}`;
  } catch (err) {
    // Fallback: abre direto (vai mostrar a tela de login do Rhyno)
    console.error('Falha ao gerar SSO do Rhyno:', err);
    frame.src = `${RHYNO_BASE}${initialPath}?embed=1&theme=${theme}`;
  }
}
