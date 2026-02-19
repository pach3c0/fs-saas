/**
 * Aplicacao Admin FS FOTOGRAFIAS
 */

import { appState, loadAppData, saveAppData } from './state.js';
import { resolveImagePath, copyToClipboard } from './utils/helpers.js';
import { uploadImage, showUploadProgress } from './utils/upload.js';
import { startNotificationPolling, stopNotificationPolling, toggleNotifications, markAllNotificationsRead, onNotifClick } from './utils/notifications.js';

const tabModules = {};

function setupNavigation() {
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.onclick = () => switchTab(tab.dataset.tab);
  });
}

async function initApp() {
  setupNavigation();

  if (!appState.authToken) {
    showLoginForm();
    return;
  }

  await loadAppData();
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'flex';
  startNotificationPolling();
  await switchTab('hero');
  showWelcomeBanner();
}

// --- Banner de boas-vindas para fotógrafos novos ---
async function showWelcomeBanner() {
  const LS_BANNER_KEY = 'fs_welcome_banner_dismissed';
  if (localStorage.getItem(LS_BANNER_KEY)) return;

  // Só mostra se não há sessões criadas (fotógrafo novo)
  try {
    const res = await fetch('/api/sessions', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    const data = await res.json();
    if (!res.ok || (data.sessions && data.sessions.length > 0)) return;
  } catch (e) { return; }

  const banner = document.createElement('div');
  banner.id = 'welcome-banner';
  banner.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9998;background:#1f2937;border:1px solid #374151;border-radius:0.75rem;padding:1.25rem 1.5rem;width:320px;box-shadow:0 8px 30px rgba(0,0,0,0.4);';

  banner.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;">
      <div style="font-weight:700;color:#f3f4f6;font-size:0.9375rem;">👋 Bem-vindo à plataforma!</div>
      <button id="closeBanner" style="background:none;border:none;color:#9ca3af;cursor:pointer;font-size:1.25rem;line-height:1;padding:0 0 0 0.5rem;">×</button>
    </div>
    <p style="color:#d1d5db;font-size:0.8125rem;margin-bottom:1rem;line-height:1.5;">Comece configurando sua conta em 3 passos:</p>
    <div style="display:flex;flex-direction:column;gap:0.5rem;">
      <div style="display:flex;align-items:center;gap:0.625rem;padding:0.5rem 0.75rem;">
        <span style="color:#34d399;font-size:0.875rem;">✓</span>
        <span style="color:#9ca3af;font-size:0.8125rem;text-decoration:line-through;">Conta criada</span>
      </div>
      <button data-goto="perfil" style="display:flex;align-items:center;gap:0.625rem;background:#111827;border:1px solid #374151;border-radius:0.375rem;padding:0.5rem 0.75rem;cursor:pointer;text-align:left;width:100%;">
        <span style="color:#6b7280;font-size:0.875rem;">⬜</span>
        <span style="color:#d1d5db;font-size:0.8125rem;">Complete seu perfil</span>
        <span style="margin-left:auto;color:#6b7280;font-size:0.75rem;">→</span>
      </button>
      <button data-goto="sessoes" style="display:flex;align-items:center;gap:0.625rem;background:#111827;border:1px solid #374151;border-radius:0.375rem;padding:0.5rem 0.75rem;cursor:pointer;text-align:left;width:100%;">
        <span style="color:#6b7280;font-size:0.875rem;">⬜</span>
        <span style="color:#d1d5db;font-size:0.8125rem;">Crie sua primeira sessão</span>
        <span style="margin-left:auto;color:#6b7280;font-size:0.75rem;">→</span>
      </button>
      <button data-goto="meu-site" style="display:flex;align-items:center;gap:0.625rem;background:#111827;border:1px solid #374151;border-radius:0.375rem;padding:0.5rem 0.75rem;cursor:pointer;text-align:left;width:100%;">
        <span style="color:#6b7280;font-size:0.875rem;">⬜</span>
        <span style="color:#d1d5db;font-size:0.8125rem;">Configure seu site</span>
        <span style="margin-left:auto;color:#6b7280;font-size:0.75rem;">→</span>
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

function showLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.style.display = 'flex';

  const loginBtn = loginForm.querySelector('button');
  const emailInput = loginForm.querySelector('input[type="email"]');
  const passwordInput = loginForm.querySelector('input[type="password"]');

  const doLogin = async () => {
    const email = emailInput?.value;
    const password = passwordInput?.value;

    // Suportar login legado (só senha) e novo (email + senha)
    if (!password) { alert('Digite a senha'); return; }

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
      if (data.organizationId) {
        localStorage.setItem('organizationId', data.organizationId);
      }

      loginForm.style.display = 'none';
      document.getElementById('adminPanel').style.display = 'flex';

      await loadAppData();
      startNotificationPolling();
      await switchTab('hero');
      showWelcomeBanner();
    } catch (error) {
      alert(error.message);
    }
  };

  if (loginBtn) loginBtn.onclick = doLogin;
  if (passwordInput) {
    passwordInput.onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
  }
  if (emailInput) {
    emailInput.onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
  }
}

async function switchTab(tabName) {
  appState.currentTab = tabName;
  const container = document.getElementById('tabContent');
  if (!container) return;

  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  container.innerHTML = '<p style="color:#9ca3af;">Carregando...</p>';

  if (!tabModules[tabName]) {
    try {
      tabModules[tabName] = await import(`./tabs/${tabName}.js`);
    } catch (error) {
      console.error(`Erro ao carregar tab ${tabName}:`, error);
      container.innerHTML = `<p style="color:#f87171;">Erro ao carregar aba: ${error.message}</p>`;
      return;
    }
  }

  if (appState.currentTab !== tabName) return;

  const mod = tabModules[tabName];
  // Converte kebab-case para PascalCase: 'meu-site' → 'MeuSite'
  const pascalCase = tabName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  const funcName = 'render' + pascalCase;
  const renderFunc = mod[funcName];

  if (!renderFunc) {
    container.innerHTML = `<p style="color:#f87171;">Funcao ${funcName} nao encontrada</p>`;
    return;
  }

  try {
    await renderFunc(container);
  } catch (error) {
    console.error(`Erro ao renderizar ${tabName}:`, error);
    container.innerHTML = `<p style="color:#f87171;">Erro: ${error.message}</p>`;
  }
}

function logout() {
  stopNotificationPolling();
  appState.authToken = '';
  appState.organizationId = '';
  appState.appData = {};
  localStorage.removeItem('authToken');
  localStorage.removeItem('organizationId');
  document.getElementById('adminPanel').style.display = 'none';
  showLoginForm();
}

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initApp());
} else {
  initApp();
}
