// Aba "Gestão" — ERP Rhyno embutido via iframe com SSO (login único).
// O CliqueZoom gera uma URL de SSO (/api/gestao/sso-url); o iframe abre essa URL,
// o Rhyno autentica sozinho (sem tela de login) e cai no dashboard em modo embed
// (?embed=1, sem a sidebar própria). Parece um módulo nativo do CliqueZoom.
import { apiGet } from '../utils/api.js';

import { appState } from '../state.js';

// A origem do ERP vem sempre da URL de SSO gerada pelo backend (respeita RHYNO_BASE_URL),
// então não há base hardcoded aqui — a navegação reemite SSO a cada passo.

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
];

export async function renderGestao(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; height:calc(100vh - 110px);">
      <div style="flex:1; min-height:0; border:1px solid var(--border);
                  border-radius:12px; overflow:hidden; background:var(--bg-surface); position:relative;">
        <iframe id="gestaoFrame" src="about:blank"
          style="width:100%; height:100%; border:0; display:block;"
          allow="clipboard-read; clipboard-write"></iframe>
        <div id="gestaoEstado" style="display:none; position:absolute; inset:0;
             align-items:center; justify-content:center; text-align:center;
             padding:32px; background:var(--bg-surface);"></div>
      </div>
    </div>
  `;

  const frame = container.querySelector('#gestaoFrame');
  const estado = container.querySelector('#gestaoEstado');
  const theme = document.documentElement.getAttribute('data-theme') || 'light';

  // Mostra um painel neutro do CliqueZoom DENTRO da aba — NUNCA a landing/login do ERP.
  // `carregando` mostra um spinner discreto; senão mostra título + mensagem + botão.
  function mostrarEstado({ titulo, msg, carregando = false } = {}) {
    frame.style.display = 'none';
    estado.style.display = 'flex';
    estado.innerHTML = carregando
      ? `<div style="color:var(--text); opacity:.6; font-size:14px;">Abrindo sua Gestão…</div>`
      : `<div style="max-width:380px;">
           <div style="font-size:17px; font-weight:600; color:var(--text); margin-bottom:8px;">${titulo}</div>
           <div style="font-size:14px; color:var(--text); opacity:.7; line-height:1.5; margin-bottom:20px;">${msg}</div>
           <button id="gestaoRetry" style="border:0; border-radius:10px; padding:10px 18px;
             background:var(--accent); color:var(--bg-base); font-size:14px;
             font-weight:600; cursor:pointer;">Tentar novamente</button>
         </div>`;
    const retry = estado.querySelector('#gestaoRetry');
    if (retry) retry.onclick = () => carregarGestao(ultimoPath);
  }

  let ultimoPath = appState.gestaoInitialPath || '/dashboard';

  // Carrega/navega a Gestão via SSO FRESCO a cada vez. Reemitir a asserção em toda
  // navegação evita depender do token persistido no iframe (o Safari/ITP particiona o
  // localStorage de terceiros e o ERP cairia na landing). Falha → estado neutro, nunca
  // a landing do ERP.
  async function carregarGestao(path) {
    ultimoPath = path || '/dashboard';
    mostrarEstado({ carregando: true });
    try {
      const resp = await apiGet(`/api/gestao/sso-url?redirect=${encodeURIComponent(ultimoPath)}`);
      const url = resp.url.includes('?') ? `${resp.url}&theme=${theme}` : `${resp.url}?theme=${theme}`;
      estado.style.display = 'none';
      frame.style.display = 'block';
      frame.src = url;
    } catch (err) {
      if (err.status === 409) {
        // Org ainda sem tenant Rhyno (provisionamento em andamento ou pendente).
        mostrarEstado({
          titulo: 'Preparando sua Gestão',
          msg: 'Estamos configurando o seu módulo de Gestão. Isso costuma levar só alguns instantes após o cadastro. Toque em "Tentar novamente".',
        });
      } else {
        console.error('Falha ao abrir a Gestão:', err);
        mostrarEstado({
          titulo: 'Não foi possível abrir a Gestão',
          msg: 'Tivemos um problema ao conectar o seu módulo de Gestão. Tente novamente em instantes.',
        });
      }
    }
  }

  // Navegação interna (sidebar) — também via SSO fresco, sem cair na landing do ERP.
  window.__gestaoGoTo = (path) => { carregarGestao(path); };

  await carregarGestao(ultimoPath);
}
