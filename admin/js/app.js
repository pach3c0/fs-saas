/**
 * Aplicação Admin CliqueZoom — Orquestrador
 */

import { appState, loadAppData, saveAppData } from './state.js';
import { resolveImagePath, copyToClipboard } from './utils/helpers.js';
import { uploadImage, showUploadProgress } from './utils/upload.js';
import { startNotificationPolling, stopNotificationPolling, toggleNotifications, markAllNotificationsRead, deleteAllNotifications } from './utils/notifications.js';
import { showToast, showConfirm } from './utils/toast.js';
import { apiGet, apiPut } from './utils/api.js';
import { isStandalone } from './utils/push.js';
import { GRUPOS, itemLiberado, planForCap } from './tabs/gestao.js';

const tabModules = {};
let previewOpen = false;
let previewDevice = 'desktop';

// ── Tab titles ──────────────────────────────────────────────────────────────
const TAB_TITLES = {
  dashboard: 'Painel',
  sessoes: 'Sessões',
  clientes: 'Clientes',
  'albuns-prova': 'Prova de Álbuns',
  mensagens: 'Mensagens',
  crm: 'CRM',
  gestao: 'Gestão',
  'meu-site': 'Meu Site',
  dominio: 'Domínio',
  integracoes: 'Integrações',
  marketing: 'Marketing',
  perfil: 'Perfil',
  'marca-dagua': "Marca D'água",
  plano: 'Plano',
  ajuda: 'Ajuda & Tutoriais',
  configuracoes: 'Configurações',
};

// ── Skeleton loading ──────────────────────────────────────────────────────
function showSkeleton(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.25rem; animation: fadeInUp 0.2s ease;">
      <div style="display:flex; flex-direction:column; gap:0.5rem;">
        <div class="skeleton" style="height:24px; width:180px;"></div>
        <div class="skeleton" style="height:14px; width:260px;"></div>
      </div>
      <div class="skeleton" style="height:96px; width:100%; border-radius:8px;"></div>
      <div class="skeleton" style="height:96px; width:100%; border-radius:8px;"></div>
      <div class="skeleton" style="height:160px; width:100%; border-radius:8px;"></div>
    </div>
  `;
}

// ── Preview Modal ─────────────────────────────────────────────────────────
const PREVIEW_DEVICES = {
  desktop: { w: 1280, h: 900, label: 'Desktop', frameClass: '' },
  tablet: { w: 768, h: 1024, label: 'Tablet', frameClass: '' },
  mobile: { w: 390, h: 844, label: 'Mobile', frameClass: 'mobile' },
};

function getSiteUrl(isPublic = false) {
  const slug = appState.orgSlug;
  if (!slug) return '/site';

  const isProd = window.location.hostname.includes('cliquezoom.com.br');
  
  if (isPublic && isProd) {
    return `https://${slug}.cliquezoom.com.br`;
  }
  
  return `/site?_tenant=${slug}`;
}

function applyDeviceFrame(device) {
  const cfg = PREVIEW_DEVICES[device] || PREVIEW_DEVICES.desktop;
  const body = document.getElementById('preview-body');
  const frame = document.getElementById('pv-frame');
  const iframe = document.getElementById('preview-iframe');
  if (!frame || !body) return;

  // Available space
  const bw = body.clientWidth - 32;
  const bh = body.clientHeight - 32;

  let targetW = cfg.w;
  let targetH = cfg.h;

  // Scale down if doesn't fit
  const scaleX = bw / targetW;
  const scaleY = bh / targetH;
  const scale = Math.min(1, scaleX, scaleY);

  // iframe renders at native size, frame is scaled with CSS transform
  iframe.style.width = targetW + 'px';
  iframe.style.height = targetH + 'px';
  frame.style.width = targetW + 'px';
  frame.style.height = targetH + 'px';
  frame.style.transform = `scale(${scale})`;
  frame.style.transformOrigin = 'top center';
  frame.className = 'pv-frame ' + (cfg.frameClass || '');

  // Adjust body height to show scaled frame correctly
  body.style.paddingBottom = (targetH * scale > bh ? '1rem' : '');
}

window.toggleSitePreview = function () {
  const modal = document.getElementById('preview-modal');
  const btn = document.getElementById('previewToggleBtn');
  if (!modal) return;

  previewOpen = !previewOpen;

  if (previewOpen) {
    modal.classList.add('open');
    if (btn) {
      btn.style.background = 'rgba(47,129,247,0.15)';
      btn.style.color = 'var(--accent)';
      btn.style.borderColor = 'rgba(47,129,247,0.4)';
    }
    loadSitePreview();
  } else {
    modal.classList.remove('open');
    if (btn) { btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = ''; }
  }
};

window.refreshSitePreview = function () {
  if (previewOpen) loadSitePreview();
};

function loadSitePreview() {
  const iframe = document.getElementById('preview-iframe');
  const loading = document.getElementById('preview-loading');
  const urlBar = document.getElementById('preview-url-bar');
  const newTabA = document.getElementById('openSiteNewTab');
  if (!iframe) return;

  const previewUrl = getSiteUrl(false);
  const publicUrl = getSiteUrl(true);

  if (urlBar) urlBar.value = publicUrl.startsWith('http') ? publicUrl : window.location.origin + publicUrl;
  if (newTabA) newTabA.href = publicUrl;

  // Show loading overlay
  if (loading) loading.classList.remove('hidden');

  iframe.src = '';
  requestAnimationFrame(() => {
    iframe.src = previewUrl;
    iframe.onload = () => {
      if (loading) loading.classList.add('hidden');
    };
  });

  // Apply device frame after a tick (DOM needs to be visible)
  requestAnimationFrame(() => applyDeviceFrame(previewDevice));
}

window.openMySite = function () {
  const publicUrl = getSiteUrl(true);
  
  if (publicUrl === '/site') {
    showToast('Slug da organização não carregado. Tente novamente em instantes.', 'warning');
    return;
  }

  window.open(publicUrl, '_blank');
};

window.setPreviewDevice = function (device) {
  previewDevice = device;
  document.querySelectorAll('.pv-device-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.device === device);
  });
  applyDeviceFrame(device);
};

// withSaveLoading: wrapper para botões de salvar com loading state
window.withSaveLoading = async function (btn, asyncFn) {
  const orig = btn.innerHTML;
  const origDisabled = btn.disabled;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;"></span>`;
  try {
    await asyncFn();
  } finally {
    btn.innerHTML = orig;
    btn.disabled = origDisabled;
  }
};

// ── Builder Mode (Meu Site editor) ───────────────────────────────────────
let builderDevice = 'desktop';
let builderRefreshTimer = null;
let builderIframeReady = false;
let builderPendingData = null;

function getSiteUrlBuilder() {
  const slug = appState.orgSlug;
  // _preview=1 evita que o site saia em modo manutenção e sinaliza que
  // está em iframe do builder (shared-site.js usa isso futuramente)
  const base = slug ? `/site?_tenant=${slug}` : '/site';
  return base + (base.includes('?') ? '&' : '?') + '_preview=1';
}

// Enviar dados ao iframe via postMessage (sem reload)
window.builderPostPreview = function (data) {
  const iframe = document.getElementById('builder-iframe');
  if (!iframe || !iframe.contentWindow) return;

  if (!builderIframeReady) {
    // Guardar para enviar quando o iframe avisar que está pronto
    builderPendingData = data;
    return;
  }

  iframe.contentWindow.postMessage({ type: 'cz_preview', data, _previewDevice: builderDevice }, window.location.origin);
  builderPendingData = null;
};

// Escutar resposta do iframe
window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin) return;
  if (e.data?.type === 'cz_preview_ready') {
    builderIframeReady = true;
    // Se havia dados pendentes, enviar agora
    if (builderPendingData) {
      const d = builderPendingData;
      builderPendingData = null;
      setTimeout(() => window.builderPostPreview(d), 50);
    } else {
      // Solicitar dados frescos do formulário
      setTimeout(() => window._meuSitePostPreview?.(), 100);
    }
  }
});

window.enterBuilderMode = function () {
  const panel = document.getElementById('adminPanel');
  const workspace = document.getElementById('workspace');
  const builderProps = document.getElementById('builder-props');
  const builderPreview = document.getElementById('builder-preview');

  if (!panel) return;

  panel.classList.add('builder-mode');
  workspace.style.display = 'none';
  builderProps.style.display = 'flex';
  builderPreview.style.display = 'flex';

  // Load the site in the iframe
  builderLoadPreview();
};

window.exitBuilderMode = function (skipNav = false) {
  const panel = document.getElementById('adminPanel');
  if (!panel?.classList.contains('builder-mode')) return;

  const workspace = document.getElementById('workspace');
  const builderProps = document.getElementById('builder-props');
  const builderPreview = document.getElementById('builder-preview');

  panel.classList.remove('builder-mode');
  workspace.style.display = '';
  builderProps.style.display = 'none';
  builderPreview.style.display = 'none';

  // Limpar canvas editors e iframe ao sair do builder
  window._cleanupBuilderCanvases?.();
  const iframe = document.getElementById('builder-iframe');
  if (iframe) iframe.src = '';

  // Navegar para dashboard se não for via switchTab
  if (!skipNav) {
    switchTab('dashboard');
  }
};

async function builderLoadPreview() {
  const iframe = document.getElementById('builder-iframe');
  const loading = document.getElementById('builder-loading');
  const openLink = document.getElementById('builder-open-site');
  if (!iframe) return;

  // Garantir slug carregado antes de montar a URL
  if (!appState.orgSlug) await loadOrgSlug();

  const siteUrl = getSiteUrlBuilder();
  if (!appState.orgSlug) {
    // Sem slug não há como montar URL correta — mostrar aviso
    if (loading) loading.classList.add('hidden');
    iframe.src = '';
    iframe.srcdoc = '<body style="background:var(--bg-base,#0d1117);display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:var(--text-secondary,#8b949e);"><p>Configure o slug da organização para visualizar o site.</p></body>';
    return;
  }

  if (openLink) openLink.href = siteUrl;
  if (loading) loading.classList.remove('hidden');

  // Atualiza browser chrome com slug real
  const browserUrl = document.getElementById('builder-browser-url');
  if (browserUrl && appState.orgSlug) browserUrl.textContent = `${appState.orgSlug}.cliquezoom.com.br`;

  builderIframeReady = false;

  // Handler anexado ANTES de navegar — garante que o evento de load não seja
  // perdido (atribuir onload depois do src abria uma corrida).
  iframe.onload = () => {
    if (loading) loading.classList.add('hidden');
    builderApplyDevice(builderDevice);
    setTimeout(() => {
      if (!builderIframeReady) {
        builderIframeReady = true;
        window._meuSitePostPreview?.();
      }
    }, 2000);
  };

  // Navega direto com cache-bust: força o reload mesmo quando a URL é idêntica
  // (botão Recarregar) e elimina a corrida do antigo truque src=''+rAF, que
  // deixava o preview EM BRANCO ao abrir o builder — exigindo clicar em
  // "Recarregar". Agora carrega automaticamente ao entrar em Meu Site.
  iframe.src = siteUrl + (siteUrl.includes('?') ? '&' : '?') + '_cz=' + Date.now();

  // Rede de segurança: se o load não disparar (navegação bloqueada), some com
  // o spinner mesmo assim para não travar o preview em "Carregando…".
  setTimeout(() => { if (loading) loading.classList.add('hidden'); }, 8000);

  builderApplyDevice(builderDevice);
}

window.builderRefreshPreview = function () {
  builderLoadPreview();
};

// Debounced auto-refresh after saves
window.builderScheduleRefresh = function () {
  clearTimeout(builderRefreshTimer);
  const indicator = document.getElementById('builder-save-indicator');
  if (indicator) indicator.style.display = 'inline-flex';
  builderRefreshTimer = setTimeout(() => {
    builderLoadPreview();
    if (indicator) indicator.style.display = 'none';
  }, 1200);
};

function builderApplyDevice(device) {
  builderDevice = device;

  document.querySelectorAll('.bd-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.device === device);
  });

  const wrap = document.getElementById('builder-iframe-wrap');
  const iframe = document.getElementById('builder-iframe');
  const chrome = document.getElementById('builder-browser-chrome');
  if (!wrap || !iframe) return;

  const ww = wrap.clientWidth;
  const wh = wrap.clientHeight || window.innerHeight - 96;

  const sizes = {
    desktop: { w: 1280, h: 900 },
    tablet: { w: 768, h: 1024 },
    mobile: { w: 390, h: 844 },
  };

  const s = sizes[device];

  // Para todos os dispositivos: escalar para caber no espaço disponível,
  // respeitando o aspect ratio. Desktop usa largura total se couber.
  if (device === 'desktop') {
    // Desktop: preencher largura disponível, scroll interno no iframe
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.transform = '';
    iframe.style.transformOrigin = 'top center';
    iframe.style.marginTop = '0';

    if (chrome) {
      chrome.style.width = 'auto';
      chrome.style.height = '100%';
      chrome.style.transform = '';
      chrome.style.marginTop = '0';
      chrome.style.flex = '1';
    }

    // O scroll agora deve ser DENTRO do iframe para manter elementos fixos (header) no topo
    wrap.style.overflowY = 'hidden';
    wrap.style.alignItems = 'stretch';
  } else {
    // Tablet/Mobile: escalar para caber sem cortar
    wrap.style.overflowY = 'hidden';
    wrap.style.alignItems = 'center';
    const scaleX = ww / s.w;
    const scaleY = wh / s.h;
    const scale = Math.min(1, scaleX, scaleY);
    const scaledH = s.h * scale;
    const topOffset = Math.max(0, (wh - scaledH) / 2);

    if (chrome) {
      chrome.style.width = s.w + 'px';
      chrome.style.transform = `scale(${scale})`;
      chrome.style.transformOrigin = 'top center';
      chrome.style.marginTop = topOffset + 'px';

      iframe.style.width = '100%';
      iframe.style.height = s.h + 'px';
      iframe.style.transform = '';
      iframe.style.marginTop = '0';
    } else {
      iframe.style.width = s.w + 'px';
      iframe.style.height = s.h + 'px';
      iframe.style.transform = `scale(${scale})`;
      iframe.style.transformOrigin = 'top center';
      iframe.style.marginTop = topOffset + 'px';
    }
  }
}

window.builderSetDevice = function (device) {
  builderApplyDevice(device);
};

// Monta o dropdown de Gestão filtrando os itens pelas capabilities do plano
// (esconde o que o plano não inclui; grupo sem itens visíveis some). Cosmético —
// a cerca real é server-side no gestao.js. Re-chamada quando o orgData carrega.
function renderGestaoMenu() {
  const gestaoMenu = document.getElementById('dropdown-gestao');
  if (!gestaoMenu) return;
  const caps = appState.orgData?.capabilities;
  const ic = (item) => `<svg class="pop-ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${item.icon || ''}</svg>`;
  // VITRINE "bloqueado-mas-visível": item fora do plano NÃO some — ganha cadeado + selo
  // do plano que o libera e, ao clicar, leva pra aba Plano (converte no ponto de intenção,
  // em vez de esperar o usuário ir caçar planos). A cerca real continua server-side: se
  // chegar na rota mesmo assim, toma 403 → "Ver planos". Enquanto caps não carregou,
  // renderiza normal (o 403 cobre o Free na janelinha de boot).
  gestaoMenu.innerHTML = GRUPOS.map(g => `
    <div class="pop-head">${g.grupo}</div>
    ${g.itens.map(item => {
      const locked = !!(item.cap && caps && !itemLiberado(item, caps));
      if (locked) {
        const plano = planForCap(item.cap);
        return `
      <button class="nav-item dropdown-item" onclick="openGestaoLocked('${item.path}','${plano}')" title="Disponível no plano ${plano}" style="opacity:.72;">
        ${ic(item)}
        <span class="dropdown-label">${item.label}</span>
        <span style="margin-left:auto; display:inline-flex; align-items:center; gap:3px; font-size:10px; font-weight:700; color:var(--accent); white-space:nowrap;">🔒 ${plano}</span>
      </button>`;
      }
      return `
      <button class="nav-item dropdown-item" onclick="openGestao('${item.path}')">
        ${ic(item)}
        <span class="dropdown-label">${item.label}</span>
      </button>`;
    }).join('')}
  `).join('<div class="pop-sep"></div>');
}
window.renderGestaoMenu = renderGestaoMenu;

// VITRINE no topbar: os atalhos da Gestão que moram no header (hoje o CRM Central)
// NÃO somem quando o plano não inclui — ganham um cadeado discreto e ficam NA POSIÇÃO
// da prod (não migram p/ dentro da Gestão). O clique segue chamando openGestao: o backend
// devolve uma PRÉVIA (módulo real, não-interativo + faixa de upgrade) em vez de 403.
// Tarefas/Metas entram aqui depois, no mesmo molde (cap 'tarefasMetas', Pro+).
function renderTopbarGestaoLocks() {
  const caps = appState.orgData?.capabilities;
  if (!caps) return; // ainda carregando — sem cadeado (o backend cobre via prévia/403)
  const ATALHOS = [
    { id: 'topbarCrmBtn', cap: 'crm', need: 'full', label: 'Central de CRM',
      tip: 'Central de CRM: leads, funil e follow-up — teste 7 dias no Basic' },
  ];
  for (const a of ATALHOS) {
    const btn = document.getElementById(a.id);
    if (!btn) continue;
    const locked = a.need ? caps[a.cap] !== a.need : !caps[a.cap];
    let lock = btn.querySelector('.topbar-cap-lock');
    if (locked) {
      if (!lock) {
        lock = document.createElement('span');
        lock.className = 'topbar-cap-lock';
        lock.textContent = '🔒';
        lock.style.cssText = 'margin-left:4px; font-size:10px; line-height:1; opacity:.85;';
        btn.appendChild(lock);
      }
      btn.title = a.tip || `${a.label} — disponível no plano ${planForCap(a.cap)}`;
    } else if (lock) {
      lock.remove();
      btn.title = a.label;
    }
  }
}
window.renderTopbarGestaoLocks = renderTopbarGestaoLocks;

// ── Navigation setup ──────────────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.onclick = () => switchTab(tab.dataset.tab);
  });
  
  setupHeaderDropdowns();
  setupSearch();
  setupMobileDrawer();
}

// ── Menu mobile (drawer) ────────────────────────────────────────────────────
// No celular o topbar de pílulas não cabe; um hamburger abre um drawer com todas as abas.
// NÃO duplica a navegação: cada linha REUSA o botão real do topbar (data-tab → switchTab;
// onclick inline → dispara o clique do botão original). Reconstruído a cada abertura, então
// reflete o que o plano libera (inclui o dropdown de Gestão populado via JS). Só aparece via
// @media (max-width:768px); no desktop os elementos ficam display:none.
function setupMobileDrawer() {
  const burger   = document.getElementById('mobile-hamburger');
  const overlay  = document.getElementById('mobile-drawer-overlay');
  const closeBtn = document.getElementById('mobile-drawer-close');
  if (!burger) return;
  burger.addEventListener('click', openMobileDrawer);
  overlay?.addEventListener('click', closeMobileDrawer);
  closeBtn?.addEventListener('click', closeMobileDrawer);
}

function openMobileDrawer() {
  buildMobileDrawer();
  const drawer = document.getElementById('mobile-drawer');
  drawer?.classList.add('open');
  drawer?.setAttribute('aria-hidden', 'false');
  document.getElementById('mobile-drawer-overlay')?.classList.add('open');
}

function closeMobileDrawer() {
  const drawer = document.getElementById('mobile-drawer');
  drawer?.classList.remove('open');
  drawer?.setAttribute('aria-hidden', 'true');
  document.getElementById('mobile-drawer-overlay')?.classList.remove('open');
}

// Monta as linhas do drawer a partir dos botões de navegação REAIS do topbar (dedup por destino).
function buildMobileDrawer() {
  const nav = document.getElementById('mobile-drawer-nav');
  if (!nav) return;
  const seen = new Set();
  const rows = [];
  // Alvos de navegação: [data-tab] (pílulas, folhas dos dropdowns, brand, perfil/plano) +
  // itens .nav-item com onclick inline (CRM, Triagem, Tarefas, Metas). Ordem = ordem do DOM.
  document.querySelectorAll('#topbar [data-tab], #topbar .nav-item[onclick]').forEach(btn => {
    const tab = btn.dataset?.tab || null;
    const label = (tab && TAB_TITLES[tab])
      || btn.querySelector('.header-expand-label, .dropdown-label')?.textContent?.trim()
      || (btn.getAttribute('title') || '').trim()
      || (tab || '').trim();
    if (!label) return;
    const key = tab || `onclick:${btn.getAttribute('onclick')}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ label, tab, orig: btn });
  });

  nav.innerHTML = '';
  rows.forEach(({ label, tab, orig }) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'mobile-drawer-item';
    row.textContent = label;
    row.addEventListener('click', () => {
      closeMobileDrawer();
      if (tab) switchTab(tab);
      else orig.click();
    });
    nav.appendChild(row);
  });
}

function setupHeaderDropdowns() {
  const dropdownContainers = document.querySelectorAll('.header-dropdown-container');
  
  // Popula o dropdown de Gestão (filtrado pelas capabilities do plano).
  renderGestaoMenu();

  // Comportamento de abrir/fechar
  dropdownContainers.forEach(container => {
    const btn = container.querySelector('.header-dropdown-btn');
    const menu = container.querySelector('.header-dropdown-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOursOpen = menu.classList.contains('open');

      // Fecha todos os outros
      document.querySelectorAll('.header-dropdown-menu').forEach(m => m.classList.remove('open'));

      // Toggle o nosso (visibilidade + animação via classe .open)
      if (!isOursOpen) menu.classList.add('open');
    });
  });

  // Fecha dropdowns se clicar fora
  document.addEventListener('click', (e) => {
    const isClickInsideDropdown = e.target.closest('.header-dropdown-menu');
    const isClickOnToggleBtn = e.target.closest('.header-dropdown-btn') || e.target.closest('#notificationBell');
    if (!isClickInsideDropdown && !isClickOnToggleBtn) {
      document.querySelectorAll('.header-dropdown-menu').forEach(m => m.classList.remove('open'));
    }
  });

  // Intercepta cliques dentro do menu para não fechar acidentalmente (mas fecha ao clicar num botão data-tab ou onclick)
  document.querySelectorAll('.header-dropdown-menu').forEach(menu => {
    menu.addEventListener('click', (e) => {
      if (e.target.closest('.nav-item') || e.target.closest('button')) {
        menu.classList.remove('open'); // Fecha ao clicar em um item válido
      } else {
        e.stopPropagation(); // Mantém aberto ao clicar em texto vazio
      }
    });
  });
}

function setupSearch() {
  const searchInput = document.getElementById('topbar-search');
  if (!searchInput) return;

  // Busca simples: Enter para ir
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = searchInput.value.toLowerCase().trim();
      if (!val) return;
      
      // Procura nas tabs
      for (const [key, title] of Object.entries(TAB_TITLES)) {
        if (title.toLowerCase().includes(val) || key.toLowerCase().includes(val)) {
          switchTab(key);
          searchInput.value = '';
          return;
        }
      }
      
      // Procura em Gestão. Item fora do plano NÃO é escondido (vitrine): a busca o leva
      // ao upgrade em vez de abrir e tomar 403.
      const caps = appState.orgData?.capabilities;
      for (const g of GRUPOS) {
        for (const item of g.itens) {
          if (!item.label.toLowerCase().includes(val)) continue;
          if (item.cap && caps && !itemLiberado(item, caps)) {
            openGestaoLocked(item.path, planForCap(item.cap));
          } else {
            openGestao(item.path);
          }
          searchInput.value = '';
          return;
        }
      }
      
      showToast('Nenhum módulo encontrado.', 'info');
    }
  });
}

window.openGestao = async function(path) {
  if (appState.currentTab !== 'gestao') {
    appState.gestaoInitialPath = path;
    await switchTab('gestao');
  } else {
    if (window.__gestaoGoTo) {
      window.__gestaoGoTo(path);
    }
  }
};

// Item de Gestão fora do plano (vitrine): em vez de abrir (e tomar 403), conduz ao
// upgrade — leva pra aba Plano com um toast nomeando o plano que libera o recurso.
window.openGestaoLocked = function(path, plano) {
  if (window.showToast) window.showToast(`Esse recurso faz parte do plano ${plano}. Veja os planos para liberar.`, 'info');
  window.switchTab?.('plano');
};

// Atalhos de teclado globais
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+S — salvar aba atual
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      const saveBtn = document.querySelector('#tabContent [data-save-btn], #tabContent .btn-save, #tabContent button[id*="save"], #tabContent button[id*="Save"]');
      if (saveBtn) {
        saveBtn.click();
        showToast('Salvando...', 'info', 1500);
      }
    }

    const active = document.activeElement;
    const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

    // Escape — fechar preview ou sair do builder
    if (e.key === 'Escape') {
      if (document.getElementById('adminPanel')?.classList.contains('builder-mode')) {
        e.preventDefault();
        window.exitBuilderMode();
        return;
      }
      if (previewOpen) {
        e.preventDefault();
        window.toggleSitePreview();
        return;
      }
    }

    if (isInput) return;

    // P — toggle preview
    if (e.key === 'p' || e.key === 'P') {
      window.toggleSitePreview();
    }

    // R — recarregar preview (só se aberto)
    if ((e.key === 'r' || e.key === 'R') && previewOpen) {
      window.refreshSitePreview();
    }
  });

  // Redimensionar frame ao mudar tamanho da janela
  window.addEventListener('resize', () => {
    if (previewOpen) applyDeviceFrame(previewDevice);
    if (document.getElementById('adminPanel')?.classList.contains('builder-mode')) {
      builderApplyDevice(builderDevice);
    }
  });
}

// ── Impersonação (modo suporte) ──────────────────────────────────────────
// O superadmin "entra como" a org via /admin/?impersonate=<jwt-30min>.
// O token tem impersonatedBy no payload — usamos isso para exibir o banner.
function consumeImpersonationToken() {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('impersonate');
    if (!token) return;

    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.impersonatedBy) return;

    appState.authToken = token;
    localStorage.setItem('authToken', token);
    if (payload.organizationId) localStorage.setItem('organizationId', payload.organizationId);

    // Token fora da URL (não fica no histórico ao navegar)
    params.delete('impersonate');
    const qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : ''));
  } catch (e) { /* token malformado — segue o boot normal */ }
}

function renderImpersonationBanner() {
  try {
    if (!appState.authToken) return;
    const payload = JSON.parse(atob(appState.authToken.split('.')[1]));
    if (!payload.impersonatedBy) return;

    const expira = payload.exp ? new Date(payload.exp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    const bar = document.createElement('div');
    bar.id = 'impersonationBanner';
    bar.style.cssText = 'position:fixed; top:0; left:0; right:0; z-index:99999; background:#b45309; color:#fff; padding:0.45rem 1rem; text-align:center; font-size:0.8125rem; font-weight:600; display:flex; align-items:center; justify-content:center; gap:0.75rem;';
    bar.innerHTML = `
      <span>🛠️ Modo suporte — você está no painel deste fotógrafo${expira ? ` (expira às ${expira})` : ''}</span>
      <button id="endImpersonation" style="background:rgba(0,0,0,0.25); color:#fff; border:1px solid rgba(255,255,255,0.4); border-radius:6px; padding:0.2rem 0.75rem; font-size:0.75rem; font-weight:600; cursor:pointer; font-family:inherit;">Encerrar</button>
    `;
    document.body.prepend(bar);
    document.body.style.paddingTop = '36px';
    bar.querySelector('#endImpersonation').onclick = () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('organizationId');
      window.close();
      // window.close() falha se a aba não foi aberta via script — volta pro login
      window.location.href = '/admin/';
    };
  } catch (e) { /* token ilegível — sem banner */ }
}

// ── PWA / Web Push ─────────────────────────────────────────────────────────
// Registra o SW do admin (só push; sem cache). Fire-and-forget: erro nunca trava o app.
function registerAdminServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' }).catch(() => {});
}

// Android/desktop: guarda o evento de instalação para oferecer o botão "Instalar app".
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window._deferredInstallPrompt = e;
});
window.addEventListener('appinstalled', () => { window._deferredInstallPrompt = null; });

// Botão "App" da topbar → leva o fotógrafo ao card de instalar/ativar (Configurações → Notificações),
// que trata iOS, Android e desktop (instalar PWA + ativar push + testar).
window.openAppInstall = () => {
  window._pendingConfigSection = 'notificacoes';
  switchTab('configuracoes');
};

// "Voltar ao Radar" (botão do topbar + item da gaveta mobile). Exposto cedo porque o
// radar.js é lazy: mesmo fora do modo app (celular no navegador, sem ?app=1), o item da
// gaveta funciona carregando o módulo sob demanda. Quando radar.js já está carregado, ele
// reexpõe a versão direta. Falha (ex.: sem #tabContent) é silenciosa.
window.openRadar = async () => {
  try { (await import('./tabs/radar.js')).openRadar(); }
  catch (_) { /* módulo indisponível → ignora */ }
};

// Lê o deep-link da URL do push (#<aba>?session=<id>&photo=<id>), valida a aba e limpa o hash
// (para o refresh não re-disparar). Retorna { tab, session, photo } ou null.
const DEEP_LINK_TABS = ['sessoes', 'mensagens', 'ajuda', 'configuracoes'];
function _consumeDeepLink() {
  try {
    const raw = (window.location.hash || '').replace(/^#/, '');
    if (!raw) return null;
    const [tab, queryStr] = raw.split('?');
    if (!DEEP_LINK_TABS.includes(tab)) return null;
    const q = new URLSearchParams(queryStr || '');
    const deep = { tab, session: q.get('session') || null, photo: q.get('photo') || null };
    // Limpa o hash sem recarregar (evita re-abrir o modal a cada refresh/troca de aba).
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return deep;
  } catch (_) { return null; }
}

// ── Init ─────────────────────────────────────────────────────────────────
async function initApp() {
  consumeImpersonationToken();
  registerAdminServiceWorker();
  setupNavigation();
  setupKeyboardShortcuts();

  if (!appState.authToken) {
    showLoginForm();
    return;
  }

  renderImpersonationBanner();

  // loadAppData (SiteData legado) roda em paralelo com postLoginSetup
  // postLoginSetup já paraleliza loadOrgSlug + loadSidebarStorage internamente
  await Promise.all([
    loadAppData(),
    postLoginSetup()
  ]);
}

// Celular (não desktop). Combinado com isStandalone() decide se o PWA abre no Radar.
function _isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

async function postLoginSetup() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'flex';

  // Paralelizar chamadas independentes — não há dependência entre elas
  // loadOrgSlug precisa terminar antes de switchTab (que usa orgSlug para o preview)
  await Promise.all([
    loadOrgSlug(),
    loadSidebarStorage(),
    loadSecondaryColor()
  ]);

  // Deep-link do push: se o fotógrafo clicou numa notificação no celular, a URL traz
  // #<aba>?session=<id>&photo=<id>. Prioriza sobre a última aba salva e abre o contexto.
  const deep = _consumeDeepLink();

  // Entra no Radar (tela mobile dedicada, só de acompanhamento) quando:
  //  (a) a URL tem a flag ?app=1 — endereço dedicado do "app do fotógrafo", usado pelo QR e pelo
  //      start_url do PWA (abre o radar direto, inclusive no navegador antes de instalar); ou
  //  (b) o app está instalado num CELULAR (standalone + mobile) — fallback p/ quando abre sem a flag.
  // Em ambos, só se NÃO houver deep-link de push (se tocou numa notificação específica, honramos o
  // contexto no painel completo). Import dinâmico → o radar não pesa no desktop. Falha → fluxo normal.
  const forceRadar = new URLSearchParams(window.location.search).has('app');
  let bootRadar = (forceRadar || (isStandalone() && _isMobileDevice())) && !deep?.session;
  if (bootRadar) {
    try {
      // Boot no Radar (tela mobile do app), mas SEM travar: o header segue disponível
      // (ver openRadar + CSS .radar-mode). openRadar liga a classe, desenha e (re)inicia os timers.
      (await import('./tabs/radar.js')).openRadar();
    } catch (e) {
      bootRadar = false; // falhou ao abrir radar → cai no fluxo de tab normal abaixo
    }
  }

  // Delay no polling para não competir com o carregamento inicial do dashboard
  setTimeout(startNotificationPolling, 5000);

  // Só renderiza uma aba normal quando NÃO bootou no radar (senão sobrescreveria o radar).
  if (!bootRadar) {
    const savedTab = deep?.tab || sessionStorage.getItem('activeTab') || 'dashboard';
    await switchTab(savedTab);
    if (deep?.session) {
      setTimeout(() => {
        if (deep.photo && window.openComments) window.openComments(deep.session, deep.photo);
        else window.openSessionWizard?.(deep.session);
      }, 300);
    }
  }

  // Serviços do header rodam em ambos os fluxos — o header agora está sempre vivo (inclusive no app).
  startPresenceHeartbeat();
  setTimeout(startClientsOnlineHeaderPoll, 3000);
  showOnboardingNudges();
}

// Cor secundária da marca (definida no Super Admin). Injeta o token --cz-secondary no <html>
// para o painel inteiro herdar (cards, etiquetas, banner). Fire-and-forget: erro mantém o default do CSS.
async function loadSecondaryColor() {
  try {
    const res = await fetch('/api/theme', { headers: { Authorization: `Bearer ${appState.authToken}` } });
    const data = await res.json();
    const c = String(data.secondaryColor || '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(c)) {
      document.documentElement.style.setProperty('--cz-secondary', c);
    }
  } catch { /* mantém o default do CSS (--cz-secondary em :root) */ }
}

// ── Presença online (item 10) ──────────────────────────────────────────────
// Heartbeat leve a cada 60s: alimenta a presença em tempo real + o engajamento por módulo
// (qual aba o fotógrafo mais usa) no SaaS Admin. Fire-and-forget: erro é ignorado de propósito,
// nunca afeta o painel. O `module` é a aba atual; o ping também dispara ao trocar de aba.
let _presenceTimer = null;
function sendPresenceHeartbeat() {
  if (!appState.authToken || document.hidden) return;
  fetch('/api/presence/heartbeat', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${appState.authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: appState.currentTab || 'dashboard', name: appState.orgSlug || '' })
  }).catch(() => {});
}
function startPresenceHeartbeat() {
  if (_presenceTimer) return;
  sendPresenceHeartbeat();
  _presenceTimer = setInterval(sendPresenceHeartbeat, 60000);
  // Ao voltar o foco pra aba, manda um ping na hora (volta pra presença mais rápido).
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sendPresenceHeartbeat();
  });
}

async function loadSidebarStorage() {
  try {
    const [storageRes, billingRes] = await Promise.all([
      fetch('/api/site/admin/storage', { headers: { 'Authorization': `Bearer ${appState.authToken}` } }),
      fetch('/api/billing/subscription', { headers: { 'Authorization': `Bearer ${appState.authToken}` } })
    ]);
    if (!storageRes.ok) return;
    const storage = await storageRes.json();
    const billingData = billingRes.ok ? await billingRes.json() : null;
    // Limite efetivo (deriva de plans.js; já vem pronto do endpoint). <=0 = ilimitado.
    const effMax = billingData?.maxStorageMB ?? billingData?.subscription?.limits?.maxStorage ?? 3072;
    const unlimited = !(effMax > 0);
    const maxMB = unlimited ? 0 : effMax;
    const pct = unlimited ? '0' : Math.min(storage.storageMB / maxMB * 100, 100).toFixed(1);
    const widget = document.getElementById('sidebar-storage');
    const bar = document.getElementById('sidebar-storage-bar');
    const label = document.getElementById('sidebar-storage-label');
    const pctEl = document.getElementById('sidebar-storage-pct');
    const breakdownEl = document.getElementById('sidebar-storage-breakdown');
    
    if (!widget) return;
    
    bar.style.width = pct + '%';
    bar.style.background = pct > 90 ? 'var(--red)' : (pct > 70 ? 'var(--yellow)' : 'var(--accent)');
    label.textContent = storage.storageMB + ' MB';
    
    const maxLabel = unlimited ? '∞' : (maxMB >= 1024 ? (maxMB / 1024).toFixed(0) + ' GB' : maxMB + ' MB');
    pctEl.textContent = unlimited ? (storage.storageMB + ' MB usados') : (pct + '% de ' + maxLabel);
    
    if (breakdownEl && storage.breakdown) {
      const b = storage.breakdown;
      breakdownEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-size:0.625rem; color:var(--text-muted);">
          <span>⚙️ Sistema</span><span>${b.system} MB</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.625rem; color:var(--text-muted);">
          <span>📁 Sessões/Álbuns</span><span>${b.sessions} MB</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.625rem; color:var(--text-muted);">
          <span>🌐 Site Público</span><span>${b.site} MB</span>
        </div>
      `;
    }
    
    widget.style.display = 'block';
  } catch (e) { /* silencioso */ }
}

// Tornar global para que as abas possam atualizar após deletar algo
window.loadSidebarStorage = loadSidebarStorage;

async function loadOrgSlug() {
  try {
    const res = await fetch('/api/organization/profile', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      const orgData = data.data || data;
      const slug = orgData.slug;
      appState.orgData = orgData;
      // Agora que conhecemos as capabilities do plano, re-renderiza o menu de Gestão
      // (vitrine: item fora do plano vira cadeado) e o cadeado do atalho CRM no topbar.
      renderGestaoMenu();
      renderTopbarGestaoLocks();
      if (slug) {
        appState.orgSlug = slug;
        localStorage.setItem('orgSlug', slug);
        // Atualizar link "Abrir" dentro do modal de preview
        const newTabA = document.getElementById('openSiteNewTab');
        if (newTabA) newTabA.href = `/site?_tenant=${slug}`;
        const urlBar = document.getElementById('preview-url-bar');
        if (urlBar) urlBar.value = window.location.origin + `/site?_tenant=${slug}`;
      }
      
      // Preencher o menu de usuário da nova Header
      const name = orgData.name || 'Meu Estúdio';
      const initials = name.substring(0, 2).toUpperCase();
      const avatarText = document.getElementById('user-avatar-text');
      if (avatarText) avatarText.textContent = initials;
      const orgNameLabel = document.getElementById('user-org-name');
      if (orgNameLabel) orgNameLabel.textContent = name;
    }
  } catch (e) { console.error('Erro ao buscar profile:', e); }
}

// ── Gatilhos de onboarding ──────────────────────────────────────────────────
// Uma única leitura de sessões decide qual banner mostrar (no máximo um):
//  • 0 sessões        → banner de boas-vindas (configure sua conta)
//  • ≥ N sessões e
//    sem WhatsApp     → gatilho suave pedindo o WhatsApp (item 8)
// Nada agressivo: ambos são dispensáveis e o de WhatsApp respeita um "soneca".
const WHATSAPP_NUDGE_THRESHOLD = 2; // nº de sessões criadas que destrava o pedido
async function showOnboardingNudges() {
  let sessions = [];
  try {
    const data = await apiGet('/api/sessions');
    sessions = data.sessions || [];
  } catch (e) { return; }

  if (sessions.length === 0) {
    showWelcomeBanner();
    return;
  }

  const whatsapp = (appState.orgData?.whatsapp || '').trim();
  if (sessions.length >= WHATSAPP_NUDGE_THRESHOLD && !whatsapp) {
    showWhatsappNudge();
  }
}

// ── Welcome banner ────────────────────────────────────────────────────────
function showWelcomeBanner() {
  const LS_BANNER_KEY = 'fs_welcome_banner_dismissed';
  if (localStorage.getItem(LS_BANNER_KEY)) return;

  const banner = document.createElement('div');
  banner.id = 'welcome-banner';
  banner.style.cssText = 'position:fixed;bottom:1.5rem;left:calc(var(--sidebar-w, 220px) + 1.5rem);z-index:9998;background:var(--bg-elevated);border:1px solid var(--border);border-radius:0.75rem;padding:1.25rem 1.5rem;width:300px;box-shadow:0 8px 30px rgba(0,0,0,0.4);';

  banner.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;">
      <div style="font-weight:700;color:var(--text-primary);font-size:0.9375rem;">👋 Bem-vindo!</div>
      <button id="closeBanner" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:1.25rem;line-height:1;padding:0 0 0 0.5rem;">×</button>
    </div>
    <p style="color:var(--text-secondary);font-size:0.8125rem;margin-bottom:0.875rem;line-height:1.5;">Configure sua conta em 3 passos:</p>
    <div style="display:flex;flex-direction:column;gap:0.375rem;">
      <div style="display:flex;align-items:center;gap:0.625rem;padding:0.4rem 0.625rem;">
        <span style="color:var(--green);font-size:0.875rem;">✓</span>
        <span style="color:var(--text-muted);font-size:0.8125rem;text-decoration:line-through;">Conta criada</span>
      </div>
      <button data-goto="perfil" style="display:flex;align-items:center;gap:0.625rem;background:var(--bg-hover);border:1px solid var(--border);border-radius:0.375rem;padding:0.4rem 0.625rem;cursor:pointer;text-align:left;width:100%;">
        <span style="color:var(--text-muted);font-size:0.875rem;">○</span>
        <span style="color:var(--text-primary);font-size:0.8125rem;">Complete seu perfil</span>
        <span style="margin-left:auto;color:var(--text-muted);font-size:0.75rem;">→</span>
      </button>
      <button data-goto="sessoes" style="display:flex;align-items:center;gap:0.625rem;background:var(--bg-hover);border:1px solid var(--border);border-radius:0.375rem;padding:0.4rem 0.625rem;cursor:pointer;text-align:left;width:100%;">
        <span style="color:var(--text-muted);font-size:0.875rem;">○</span>
        <span style="color:var(--text-primary);font-size:0.8125rem;">Crie sua primeira sessão</span>
        <span style="margin-left:auto;color:var(--text-muted);font-size:0.75rem;">→</span>
      </button>
      <button data-goto="meu-site" style="display:flex;align-items:center;gap:0.625rem;background:var(--bg-hover);border:1px solid var(--border);border-radius:0.375rem;padding:0.4rem 0.625rem;cursor:pointer;text-align:left;width:100%;">
        <span style="color:var(--text-muted);font-size:0.875rem;">○</span>
        <span style="color:var(--text-primary);font-size:0.8125rem;">Configure seu site</span>
        <span style="margin-left:auto;color:var(--text-muted);font-size:0.75rem;">→</span>
      </button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('closeBanner').onclick = () => {
    banner.remove();
    localStorage.setItem(LS_BANNER_KEY, '1');
  };

  banner.querySelectorAll('[data-goto]').forEach(btn => {
    btn.onclick = () => {
      switchTab(btn.dataset.goto);
      banner.remove();
      localStorage.setItem(LS_BANNER_KEY, '1');
    };
  });
}

// ── Gatilho suave: capturar WhatsApp (item 8) ───────────────────────────────
// Mostrado quando o fotógrafo já criou algumas sessões mas não informou WhatsApp.
// "Agora não" e o × adiam por 7 dias (soneca) — nunca some de vez sem o número,
// mas também nunca insiste no mesmo dia. Salvar grava direto no perfil da org.
function showWhatsappNudge() {
  const LS_SNOOZE_KEY = 'cz_whatsapp_nudge_snooze';
  const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
  const snoozeUntil = parseInt(localStorage.getItem(LS_SNOOZE_KEY) || '0', 10);
  if (snoozeUntil && Date.now() < snoozeUntil) return;
  if (document.getElementById('whatsapp-nudge')) return;

  const snooze = () => {
    localStorage.setItem(LS_SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    banner.remove();
  };

  const banner = document.createElement('div');
  banner.id = 'whatsapp-nudge';
  banner.style.cssText = 'position:fixed;bottom:1.5rem;left:calc(var(--sidebar-w, 220px) + 1.5rem);z-index:9998;background:var(--bg-elevated);border:1px solid var(--border);border-radius:0.75rem;padding:1.25rem 1.5rem;width:320px;box-shadow:0 8px 30px rgba(0,0,0,0.4);';

  banner.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;">
      <div style="font-weight:700;color:var(--text-primary);font-size:0.9375rem;">💬 Qual é o seu WhatsApp?</div>
      <button id="waNudgeClose" title="Agora não" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:1.25rem;line-height:1;padding:0 0 0 0.5rem;">×</button>
    </div>
    <p style="color:var(--text-secondary);font-size:0.8125rem;margin-bottom:0.875rem;line-height:1.5;">Assim conseguimos te avisar de novidades e dar suporte mais rápido quando precisar. Leva 5 segundos.</p>
    <input id="waNudgeInput" type="tel" inputmode="tel" autocomplete="tel" placeholder="(11) 99999-9999"
      style="width:100%;box-sizing:border-box;background:var(--bg-base);border:1px solid var(--border);border-radius:0.375rem;padding:0.5rem 0.625rem;color:var(--text-primary);font-size:0.875rem;margin-bottom:0.75rem;">
    <div style="display:flex;gap:0.5rem;">
      <button id="waNudgeSave" style="flex:1;background:var(--accent);color:var(--accent-on);border:none;border-radius:0.375rem;padding:0.5rem;cursor:pointer;font-size:0.8125rem;font-weight:600;">Salvar</button>
      <button id="waNudgeLater" style="background:var(--bg-hover);border:1px solid var(--border);color:var(--text-secondary);border-radius:0.375rem;padding:0.5rem 0.75rem;cursor:pointer;font-size:0.8125rem;">Agora não</button>
    </div>
  `;

  document.body.appendChild(banner);

  const input = banner.querySelector('#waNudgeInput');
  const saveBtn = banner.querySelector('#waNudgeSave');
  input.focus();

  banner.querySelector('#waNudgeClose').onclick = snooze;
  banner.querySelector('#waNudgeLater').onclick = snooze;

  const save = async () => {
    const whatsapp = input.value.trim();
    if (whatsapp.replace(/\D/g, '').length < 10) {
      showToast('Informe um número de WhatsApp válido com DDD.', 'warning');
      input.focus();
      return;
    }
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';
    try {
      await apiPut('/api/organization/profile', { whatsapp });
      if (appState.orgData) appState.orgData.whatsapp = whatsapp;
      banner.remove();
      showToast('WhatsApp salvo. Obrigado!', 'success');
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Salvar';
      showToast('Erro ao salvar: ' + (err.message || 'tente novamente.'), 'error');
    }
  };

  saveBtn.onclick = save;
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
}

// ── Login ─────────────────────────────────────────────────────────────────
function showLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;
  loginForm.style.display = 'flex';

  // Verifica se veio com token de reset na URL
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get('reset');
  if (resetToken) {
    showView('resetView');
    setupResetView(resetToken);
    return;
  }

  showView('loginView');

  // ── Helpers ──
  function showView(id) {
    ['loginView', 'forgotView', 'resetView'].forEach(v => {
      const el = document.getElementById(v);
      if (el) el.style.display = v === id ? 'block' : 'none';
    });
  }

  // ── Login ──
  const loginBtn = document.getElementById('loginSubmitBtn');
  const emailInput = document.getElementById('adminEmail');
  const passwordInput = document.getElementById('adminPassword');

  const doLogin = async () => {
    const email = emailInput?.value?.trim();
    const password = passwordInput?.value;

    if (!email) { showToast('Digite seu e-mail', 'warning'); return; }
    if (!password) { showToast('Digite a senha', 'warning'); return; }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.error || 'Erro ao fazer login';
        if (msg.toLowerCase().includes('senha')) {
          showToast(msg + ' — esqueceu? Clique em "Esqueci minha senha".', 'error');
        } else {
          showToast(msg, 'error');
        }
        loginBtn.disabled = false;
        loginBtn.textContent = 'Entrar';
        return;
      }

      appState.authToken = data.token;
      appState.organizationId = data.organizationId || '';
      localStorage.setItem('authToken', data.token);
      if (data.organizationId) localStorage.setItem('organizationId', data.organizationId);

      await Promise.all([loadAppData(), postLoginSetup()]);
    } catch {
      showToast('Erro de conexão. Tente novamente.', 'error');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Entrar';
    }
  };

  loginBtn.onclick = doLogin;
  passwordInput.onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
  emailInput.onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };

  // ── Esqueci a senha ──
  document.getElementById('forgotPasswordLink').onclick = () => showView('forgotView');
  document.getElementById('backToLoginLink').onclick = () => showView('loginView');

  const forgotBtn = document.getElementById('forgotSubmitBtn');
  forgotBtn.onclick = async () => {
    const email = document.getElementById('forgotEmail')?.value?.trim();
    if (!email) { showToast('Digite seu e-mail', 'warning'); return; }

    forgotBtn.disabled = true;
    forgotBtn.textContent = 'Enviando...';

    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      showToast('Se o e-mail estiver cadastrado, você receberá o link em instantes.', 'success');
      showView('loginView');
    } catch {
      showToast('Erro de conexão. Tente novamente.', 'error');
    } finally {
      forgotBtn.disabled = false;
      forgotBtn.textContent = 'Enviar link';
    }
  };

  // ── Redefinir senha ──
  function setupResetView(token) {
    const resetBtn = document.getElementById('resetSubmitBtn');
    resetBtn.onclick = async () => {
      const password = document.getElementById('resetPassword')?.value;
      const confirm = document.getElementById('resetPasswordConfirm')?.value;

      if (!password || password.length < 6) { showToast('A senha deve ter no mínimo 6 caracteres', 'warning'); return; }
      if (password !== confirm) { showToast('As senhas não coincidem', 'warning'); return; }

      resetBtn.disabled = true;
      resetBtn.textContent = 'Salvando...';

      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password })
        });
        const data = await response.json();

        if (!response.ok) {
          showToast(data.error || 'Link inválido ou expirado', 'error');
          resetBtn.disabled = false;
          resetBtn.textContent = 'Salvar nova senha';
          return;
        }

        showToast('Senha redefinida com sucesso! Faça login.', 'success');
        // Limpa token da URL e volta para login
        window.history.replaceState({}, '', '/admin/');
        showView('loginView');
      } catch {
        showToast('Erro de conexão. Tente novamente.', 'error');
        resetBtn.disabled = false;
        resetBtn.textContent = 'Salvar nova senha';
      }
    };
  }
}

// ── Switch tab ────────────────────────────────────────────────────────────
export async function switchTab(tabName) {
  // Se estávamos no Radar (tela mobile do app), encerra polling + modo antes de trocar.
  // A guarda pela classe garante que o import dinâmico só dispare ao SAIR do radar —
  // no desktop e na navegação normal entre abas isto nunca roda (radar.js nem carrega).
  if (document.documentElement.classList.contains('radar-mode')) {
    try { (await import('./tabs/radar.js')).stopRadar(); }
    catch { document.documentElement.classList.remove('radar-mode'); }
  }
  appState.currentTab = tabName;
  sessionStorage.setItem('activeTab', tabName);
  if (appState.authToken) sendPresenceHeartbeat(); // atualiza o módulo na presença na hora
  const container = document.getElementById('tabContent');
  if (!container) return;

  // Se o wizard de sessão estiver aberto, fecha-o antes de navegar
  // Isso resolve o problema onde os botões do header ficavam bloqueados pelo wizard
  if (document.getElementById('sessionWizardModal')) {
    window.closeSessionWizard?.();
  }

  // Update nav active state
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update topbar title
  const topbarTitle = document.getElementById('topbar-title');
  if (topbarTitle) topbarTitle.textContent = TAB_TITLES[tabName] || tabName;

  // Sair do builder mode ao trocar de aba (skipNav=true evita loop)
  if (tabName !== 'meu-site') {
    if (document.getElementById('adminPanel')?.classList.contains('builder-mode')) {
      window.exitBuilderMode(true);
    }
  }

  showSkeleton(container);

  if (!tabModules[tabName]) {
    try {
      tabModules[tabName] = await import(`./tabs/${tabName}.js?v=${Date.now()}`);
    } catch (error) {
      console.error(`Erro ao carregar tab ${tabName}:`, error);
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:3rem; gap:1rem;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <p style="color:var(--red); font-weight:500;">Erro ao carregar aba</p>
          <p style="color:var(--text-secondary); font-size:0.8125rem;">${error.message}</p>
        </div>
      `;
      return;
    }
  }

  if (appState.currentTab !== tabName) return;

  const mod = tabModules[tabName];
  const pascalCase = tabName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  const funcName = 'render' + pascalCase;
  const renderFunc = mod[funcName];

  if (!renderFunc) {
    container.innerHTML = `<p style="color:var(--red);">Função ${funcName} não encontrada</p>`;
    return;
  }

  try {
    container.innerHTML = '';
    await renderFunc(container);
    // Animate content in
    container.style.animation = '';
    container.classList.remove('fade-in');
    void container.offsetWidth;
    container.classList.add('fade-in');
  } catch (error) {
    console.error(`Erro ao renderizar ${tabName}:`, error);
    container.innerHTML = `<p style="color:var(--red);">Erro: ${error.message}</p>`;
  }
}

// ── Logout ────────────────────────────────────────────────────────────────
function logout() {
  stopNotificationPolling();
  appState.authToken = '';
  appState.organizationId = '';
  appState.appData = {};
  appState.orgSlug = '';
  localStorage.removeItem('authToken');
  localStorage.removeItem('organizationId');
  localStorage.removeItem('orgSlug');
  sessionStorage.removeItem('activeTab');
  document.getElementById('adminPanel').style.display = 'none';
  showLoginForm();
}

// ── Clientes online — indicador no header ────────────────────────────────
let _coHeaderTimer = null;

function _escCo(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _updateClientsOnlineUI(data) {
  const dot   = document.getElementById('clientsOnlineDot');
  const list  = document.getElementById('clientsOnlineList');
  const count = document.getElementById('clientsOnlineCount');
  if (!dot || !list) return;

  const clients = (data && data.clients) || [];
  const total   = (data && data.total)   || 0;

  dot.style.display = total > 0 ? 'block' : 'none';
  if (count) count.textContent = total > 0 ? `${total} online` : '';

  if (clients.length === 0) {
    list.innerHTML = '<p style="text-align:center; padding:1rem; color:var(--text-muted); font-size:0.8rem;">Nenhum cliente online no momento</p>';
    return;
  }

  list.innerHTML = clients.map(c => {
    const sid    = _escCo(c.sessionId || '');
    const label  = c.module === 'selecao' ? 'Seleção' : 'Galeria';
    const badge  = c.count > 1
      ? `<span style="font-size:0.63rem;font-weight:700;padding:0.1rem 0.35rem;border-radius:999px;background:rgba(52,211,153,0.15);color:#34d399;">${c.count}×</span>`
      : '';
    return `<button onclick="openClientSession('${sid}')"
      style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:0.5rem 0.625rem;border-radius:8px;border:none;background:transparent;cursor:pointer;text-align:left;gap:0.5rem;"
      onmouseenter="this.style.background='var(--bg-hover)'" onmouseleave="this.style.background='transparent'">
      <span style="font-size:0.8125rem;color:var(--text-primary);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;">${_escCo(c.name || 'Galeria')}</span>
      <span style="display:flex;align-items:center;gap:0.25rem;flex-shrink:0;">
        <span style="font-size:0.63rem;font-weight:600;padding:0.1rem 0.35rem;border-radius:999px;background:var(--bg-base);color:var(--text-muted);">${label}</span>
        ${badge}
      </span>
    </button>`;
  }).join('');
}

async function _fetchClientsOnlineHeader() {
  try {
    const data = await apiGet('/api/presence/clients');
    _updateClientsOnlineUI(data);
  } catch (_) {}
}

function toggleClientsOnlineDropdown(e) {
  e.stopPropagation();
  const dd = document.getElementById('clientsOnlineDropdown');
  if (!dd) return;
  const opening = !dd.classList.contains('open');
  document.querySelectorAll('.header-dropdown-menu').forEach(m => { if (m !== dd) m.classList.remove('open'); });
  dd.classList.toggle('open');
  if (opening) _fetchClientsOnlineHeader();
}

async function openClientSession(sessionId) {
  if (!sessionId) return;
  const dd = document.getElementById('clientsOnlineDropdown');
  if (dd) dd.classList.remove('open');
  await switchTab('sessoes');
  window.openSessionWizard?.(sessionId);
}

function startClientsOnlineHeaderPoll() {
  _fetchClientsOnlineHeader();
  if (_coHeaderTimer) clearInterval(_coHeaderTimer);
  _coHeaderTimer = setInterval(_fetchClientsOnlineHeader, 30000);
}

// ── Global exports ────────────────────────────────────────────────────────
window.appState = appState;
window.switchTab = switchTab;
window.logout = logout;
window.saveAppData = saveAppData;
window.loadAppData = loadAppData;
window.resolveImagePath = resolveImagePath;
window.copyToClipboard = copyToClipboard;
window.uploadImage = uploadImage;
window.showUploadProgress = showUploadProgress;
window.toggleNotifications = toggleNotifications;
window.markAllNotificationsRead = markAllNotificationsRead;
window.deleteAllNotifications = deleteAllNotifications;
window.toggleClientsOnlineDropdown = toggleClientsOnlineDropdown;
window.openClientSession = openClientSession;
window.showToast = showToast;
window.showConfirm = showConfirm;

// ── Boot ─────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initApp());
} else {
  initApp();
}
