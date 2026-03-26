/**
 * Aplicação Admin CliqueZoom — Orquestrador
 */

import { appState, loadAppData, saveAppData } from './state.js';
import { resolveImagePath, copyToClipboard } from './utils/helpers.js';
import { uploadImage, showUploadProgress } from './utils/upload.js';
import { startNotificationPolling, stopNotificationPolling, toggleNotifications, markAllNotificationsRead, onNotifClick } from './utils/notifications.js';
import { showToast, showConfirm } from './utils/toast.js';

const tabModules = {};
let previewOpen = false;
let previewDevice = 'desktop';

// ── Tab titles ──────────────────────────────────────────────────────────────
const TAB_TITLES = {
  dashboard: 'Dashboard',
  sessoes: 'Sessões',
  clientes: 'Clientes',
  'albuns-prova': 'Prova de Álbuns',
  'meu-site': 'Meu Site',
  dominio: 'Domínio',
  integracoes: 'Integrações',
  marketing: 'Marketing',
  perfil: 'Perfil',
  plano: 'Plano',
  footer: 'Rodapé',
  manutencao: 'Manutenção',
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

// ── Preview panel ─────────────────────────────────────────────────────────
window.toggleSitePreview = function() {
  const panel = document.getElementById('preview-panel');
  const btn = document.getElementById('previewToggleBtn');
  const refreshBtn = document.getElementById('refreshPreviewBtn');
  const iframe = document.getElementById('preview-iframe');

  previewOpen = !previewOpen;

  if (previewOpen) {
    panel.classList.add('open');
    btn.style.background = 'rgba(47,129,247,0.15)';
    btn.style.color = '#2f81f7';
    btn.style.borderColor = 'rgba(47,129,247,0.4)';
    refreshBtn.style.display = 'flex';

    if (!iframe.src || iframe.src === window.location.href || iframe.src === 'about:blank') {
      loadSitePreview();
    }
  } else {
    panel.classList.remove('open');
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderColor = '';
    refreshBtn.style.display = 'none';
  }
};

window.refreshSitePreview = function() {
  if (previewOpen) loadSitePreview();
};

function loadSitePreview() {
  const iframe = document.getElementById('preview-iframe');
  const slug = appState.orgSlug;
  const siteUrl = slug ? `/site?_tenant=${slug}` : '/site';
  iframe.src = siteUrl;
  window.setPreviewDevice(previewDevice);
}

window.setPreviewDevice = function(device) {
  previewDevice = device;
  const iframe = document.getElementById('preview-iframe');
  const wrap = document.getElementById('preview-iframe-wrap');

  document.querySelectorAll('.preview-device-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.preview-device-btn[onclick*="${device}"]`)?.classList.add('active');

  const sizes = {
    desktop: { w: '100%', h: '100%' },
    tablet: { w: '768px', h: '1024px' },
    mobile: { w: '390px', h: '844px' },
  };
  const s = sizes[device] || sizes.desktop;
  iframe.style.width = s.w;
  iframe.style.height = s.h;

  if (device === 'desktop') {
    wrap.style.alignItems = 'flex-start';
    iframe.style.minHeight = '100%';
  } else {
    wrap.style.alignItems = 'flex-start';
    iframe.style.minHeight = '';
  }
};

// withSaveLoading: wrapper para botões de salvar com loading state
window.withSaveLoading = async function(btn, asyncFn) {
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

// ── Navigation setup ──────────────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.onclick = () => switchTab(tab.dataset.tab);
  });
}

// Ctrl+S global para salvar a aba atual
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      // Disparar clique no botão salvar da aba atual
      const saveBtn = document.querySelector('#tabContent [data-save-btn], #tabContent .btn-save, #tabContent button[id*="save"], #tabContent button[id*="Save"]');
      if (saveBtn) {
        saveBtn.click();
        showToast('Salvando...', 'info', 1500);
      }
    }
    // P para toggle preview
    if (e.key === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const active = document.activeElement;
      const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
      if (!isInput) {
        window.toggleSitePreview();
      }
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

  await loadAppData();
  await postLoginSetup();
}

async function postLoginSetup() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'flex';

  // Carregar slug da organização para links de site
  loadOrgSlug();

  startNotificationPolling();
  await switchTab('dashboard');
  showWelcomeBanner();
}

async function loadOrgSlug() {
  try {
    const res = await fetch('/api/organization/profile', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.slug) {
        appState.orgSlug = data.slug;
        localStorage.setItem('orgSlug', data.slug);
        // Atualizar link "Ver Site"
        const siteBtn = document.getElementById('openSiteBtn');
        if (siteBtn) siteBtn.href = `/site?_tenant=${data.slug}`;
      }
    }
  } catch (e) { /* silencioso */ }
}

// ── Welcome banner ────────────────────────────────────────────────────────
async function showWelcomeBanner() {
  const LS_BANNER_KEY = 'fs_welcome_banner_dismissed';
  if (localStorage.getItem(LS_BANNER_KEY)) return;

  try {
    const res = await fetch('/api/sessions', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    const data = await res.json();
    if (!res.ok || (data.sessions && data.sessions.length > 0)) return;
  } catch (e) { return; }

  const banner = document.createElement('div');
  banner.id = 'welcome-banner';
  banner.style.cssText = 'position:fixed;bottom:1.5rem;left:calc(var(--sidebar-w, 220px) + 1.5rem);z-index:9998;background:#1c2128;border:1px solid #30363d;border-radius:0.75rem;padding:1.25rem 1.5rem;width:300px;box-shadow:0 8px 30px rgba(0,0,0,0.4);';

  banner.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;">
      <div style="font-weight:700;color:#e6edf3;font-size:0.9375rem;">👋 Bem-vindo!</div>
      <button id="closeBanner" style="background:none;border:none;color:#8b949e;cursor:pointer;font-size:1.25rem;line-height:1;padding:0 0 0 0.5rem;">×</button>
    </div>
    <p style="color:#8b949e;font-size:0.8125rem;margin-bottom:0.875rem;line-height:1.5;">Configure sua conta em 3 passos:</p>
    <div style="display:flex;flex-direction:column;gap:0.375rem;">
      <div style="display:flex;align-items:center;gap:0.625rem;padding:0.4rem 0.625rem;">
        <span style="color:#3fb950;font-size:0.875rem;">✓</span>
        <span style="color:#484f58;font-size:0.8125rem;text-decoration:line-through;">Conta criada</span>
      </div>
      <button data-goto="perfil" style="display:flex;align-items:center;gap:0.625rem;background:#21262d;border:1px solid #30363d;border-radius:0.375rem;padding:0.4rem 0.625rem;cursor:pointer;text-align:left;width:100%;">
        <span style="color:#484f58;font-size:0.875rem;">○</span>
        <span style="color:#c9d1d9;font-size:0.8125rem;">Complete seu perfil</span>
        <span style="margin-left:auto;color:#484f58;font-size:0.75rem;">→</span>
      </button>
      <button data-goto="sessoes" style="display:flex;align-items:center;gap:0.625rem;background:#21262d;border:1px solid #30363d;border-radius:0.375rem;padding:0.4rem 0.625rem;cursor:pointer;text-align:left;width:100%;">
        <span style="color:#484f58;font-size:0.875rem;">○</span>
        <span style="color:#c9d1d9;font-size:0.8125rem;">Crie sua primeira sessão</span>
        <span style="margin-left:auto;color:#484f58;font-size:0.75rem;">→</span>
      </button>
      <button data-goto="meu-site" style="display:flex;align-items:center;gap:0.625rem;background:#21262d;border:1px solid #30363d;border-radius:0.375rem;padding:0.4rem 0.625rem;cursor:pointer;text-align:left;width:100%;">
        <span style="color:#484f58;font-size:0.875rem;">○</span>
        <span style="color:#c9d1d9;font-size:0.8125rem;">Configure seu site</span>
        <span style="margin-left:auto;color:#484f58;font-size:0.75rem;">→</span>
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

  const loginBtn = document.getElementById('loginSubmitBtn');
  const emailInput = document.getElementById('adminEmail');
  const passwordInput = document.getElementById('adminPassword');

  const doLogin = async () => {
    const email = emailInput?.value?.trim();
    const password = passwordInput?.value;

    if (!password) { showToast('Digite a senha', 'warning'); return; }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';

    try {
      const body = email ? { email, password } : { password };

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao fazer login');
      }

      const data = await response.json();
      appState.authToken = data.token;
      appState.organizationId = data.organizationId || '';

      localStorage.setItem('authToken', data.token);
      if (data.organizationId) localStorage.setItem('organizationId', data.organizationId);

      await loadAppData();
      await postLoginSetup();
    } catch (error) {
      showToast(error.message, 'error');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Entrar';
    }
  };

  loginBtn.onclick = doLogin;
  passwordInput.onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
  emailInput.onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
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

  // Show/hide preview toggle for Meu Site tab
  const previewToggleBtn = document.getElementById('previewToggleBtn');
  if (previewToggleBtn) {
    previewToggleBtn.style.display = tabName === 'meu-site' ? '' : '';
  }

  showSkeleton(container);

  if (!tabModules[tabName]) {
    try {
      tabModules[tabName] = await import(`./tabs/${tabName}.js`);
    } catch (error) {
      console.error(`Erro ao carregar tab ${tabName}:`, error);
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:3rem; gap:1rem;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f85149" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <p style="color:#f85149; font-weight:500;">Erro ao carregar aba</p>
          <p style="color:#8b949e; font-size:0.8125rem;">${error.message}</p>
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
    container.innerHTML = `<p style="color:#f85149;">Função ${funcName} não encontrada</p>`;
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
    container.innerHTML = `<p style="color:#f85149;">Erro: ${error.message}</p>`;
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
