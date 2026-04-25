/**
 * Aplicação Admin CliqueZoom — Orquestrador
 */

import { appState, loadAppData, saveAppData } from './state.js';
import { resolveImagePath, copyToClipboard } from './utils/helpers.js';
import { uploadImage, showUploadProgress } from './utils/upload.js';
import { startNotificationPolling, stopNotificationPolling, toggleNotifications, markAllNotificationsRead, onNotifClick } from './utils/notifications.js';
import { showToast, showConfirm } from './utils/toast.js';
import { apiGet } from './utils/api.js';

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
  'meu-site': 'Meu Site',
  dominio: 'Domínio',
  integracoes: 'Integrações',
  marketing: 'Marketing',
  perfil: 'Perfil',
  plano: 'Plano',
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

function getSiteUrl() {
  const slug = appState.orgSlug;
  return slug ? `/site?_tenant=${slug}` : '/site';
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

  const siteUrl = getSiteUrl();

  if (urlBar) urlBar.value = window.location.origin + siteUrl;
  if (newTabA) newTabA.href = siteUrl;

  // Show loading overlay
  if (loading) loading.classList.remove('hidden');

  iframe.src = '';
  requestAnimationFrame(() => {
    iframe.src = siteUrl;
    iframe.onload = () => {
      if (loading) loading.classList.add('hidden');
    };
  });

  // Apply device frame after a tick (DOM needs to be visible)
  requestAnimationFrame(() => applyDeviceFrame(previewDevice));
}

window.openMySite = function () {
  const slug = appState.orgSlug;
  if (!slug) {
    showToast('Slug da organização não carregado. Tente novamente em instantes.', 'warning');
    return;
  }

  // Se estivermos em produção e houver um slug, tentamos abrir o subdomínio
  const isProd = window.location.hostname.includes('cliquezoom.com.br');
  const url = isProd 
    ? `https://${slug}.cliquezoom.com.br` 
    : `${window.location.origin}/site?_tenant=${slug}`;

  window.open(url, '_blank');
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
  iframe.src = '';
  requestAnimationFrame(() => {
    iframe.src = siteUrl;
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
  });

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

// ── Navigation setup ──────────────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.onclick = () => switchTab(tab.dataset.tab);
  });
}

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

// ── Init ─────────────────────────────────────────────────────────────────
async function initApp() {
  setupNavigation();
  setupKeyboardShortcuts();

  if (!appState.authToken) {
    showLoginForm();
    return;
  }

  // loadAppData (SiteData legado) roda em paralelo com postLoginSetup
  // postLoginSetup já paraleliza loadOrgSlug + loadSidebarStorage internamente
  await Promise.all([
    loadAppData(),
    postLoginSetup()
  ]);
}

async function postLoginSetup() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'flex';

  // Paralelizar chamadas independentes — não há dependência entre elas
  // loadOrgSlug precisa terminar antes de switchTab (que usa orgSlug para o preview)
  await Promise.all([
    loadOrgSlug(),
    loadSidebarStorage()
  ]);

  // Delay no polling para não competir com o carregamento inicial do dashboard
  setTimeout(startNotificationPolling, 5000);

  await switchTab('dashboard');
  showWelcomeBanner();
}

async function loadSidebarStorage() {
  try {
    const [storageRes, billingRes] = await Promise.all([
      fetch('/api/site/admin/storage', { headers: { 'Authorization': `Bearer ${appState.authToken}` } }),
      fetch('/api/billing/subscription', { headers: { 'Authorization': `Bearer ${appState.authToken}` } })
    ]);
    if (!storageRes.ok) return;
    const storage = await storageRes.json();
    const maxMB = billingRes.ok ? ((await billingRes.json()).subscription?.limits?.maxStorage || 500) : 500;
    const pct = Math.min(storage.storageMB / maxMB * 100, 100).toFixed(1);
    const widget = document.getElementById('sidebar-storage');
    const bar = document.getElementById('sidebar-storage-bar');
    const label = document.getElementById('sidebar-storage-label');
    const pctEl = document.getElementById('sidebar-storage-pct');
    if (!widget) return;
    bar.style.width = pct + '%';
    bar.style.background = pct > 80 ? 'var(--red)' : 'var(--accent)';
    label.textContent = storage.storageMB + ' MB';
    const maxLabel = maxMB >= 1024 ? (maxMB / 1024).toFixed(0) + ' GB' : maxMB + ' MB';
    pctEl.textContent = pct + '% de ' + maxLabel;
    widget.style.display = 'block';
  } catch (e) { /* silencioso */ }
}

async function loadOrgSlug() {
  try {
    const res = await fetch('/api/organization/profile', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      const slug = data.data?.slug || data.slug;
      if (slug) {
        appState.orgSlug = slug;
        localStorage.setItem('orgSlug', slug);
        // Atualizar link "Abrir" dentro do modal de preview
        const newTabA = document.getElementById('openSiteNewTab');
        if (newTabA) newTabA.href = `/site?_tenant=${slug}`;
        const urlBar = document.getElementById('preview-url-bar');
        if (urlBar) urlBar.value = window.location.origin + `/site?_tenant=${slug}`;
      }
    }
  } catch (e) { /* silencioso */ }
}

// ── Welcome banner ────────────────────────────────────────────────────────
async function showWelcomeBanner() {
  const LS_BANNER_KEY = 'fs_welcome_banner_dismissed';
  if (localStorage.getItem(LS_BANNER_KEY)) return;

  try {
    const data = await apiGet('/api/sessions');
    if (data.sessions && data.sessions.length > 0) return;
  } catch (e) { return; }

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
  appState.currentTab = tabName;
  const container = document.getElementById('tabContent');
  if (!container) return;

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
      tabModules[tabName] = await import(`./tabs/${tabName}.js`);
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
  document.getElementById('adminPanel').style.display = 'none';
  showLoginForm();
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
window.onNotifClick = onNotifClick;
window.showToast = showToast;
window.showConfirm = showConfirm;

// ── Boot ─────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initApp());
} else {
  initApp();
}
