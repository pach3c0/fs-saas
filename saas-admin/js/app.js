/**
 * SaaS Admin Panel - CliqueZoom (superadmin only)
 * Entry point: auth, troca de abas e wiring dos módulos em tabs/.
 */
import { setAuth, clearAuth, getToken, getUserEmail, setUnauthorizedHandler } from './core.js';
import { loadDashboard } from './tabs/dashboard.js';
import './tabs/organizacoes.js';
import { loadTrash } from './tabs/lixeira.js';
import { loadTickets } from './tabs/tickets.js';
import { loadLandingEditor } from './tabs/landing.js';
import { loadSecurityLogs } from './tabs/seguranca.js';
import { loadEventos } from './tabs/eventos.js';
import { loadSistema } from './tabs/sistema.js';
import { loadAgente } from './tabs/agente.js';
import { loadTutorials } from './tabs/tutoriais.js';
import { loadManual } from './tabs/manual.js';
import { loadBanners } from './tabs/banners.js';
import { loadAnnouncements } from './tabs/comunicados.js';
import { loadPlatformUpdates } from './tabs/novidades.js';
import { loadDashboardCards } from './tabs/dashboardCards.js';
import { loadSessionBackgrounds } from './tabs/sessionBackgrounds.js';
import { loadTemplatesEditor } from './tabs/templates.js';

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('userInfo').textContent = getUserEmail();
  loadDashboard();

  const savedTab = sessionStorage.getItem('saasActiveTab') || 'orgs';
  window.switchTab(savedTab);
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');

  if (!email || !password) {
    errorEl.textContent = 'Preencha email e senha';
    errorEl.style.display = 'block';
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao fazer login');
    if (data.role !== 'superadmin') throw new Error('Acesso restrito a superadmins');

    setAuth(data.token, email);
    errorEl.style.display = 'none';
    showApp();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  }
}

function logout() {
  clearAuth();
  sessionStorage.removeItem('saasActiveTab');
  showLogin();
}
setUnauthorizedHandler(logout);

// ============================================================================
// TABS
// ============================================================================

window.switchTab = (tab) => {
  sessionStorage.setItem('saasActiveTab', tab);
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));

  const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(`'${tab}'`));
  if (targetBtn) {
    targetBtn.classList.add('active');
    const parentDropdown = targetBtn.closest('.dropdown');
    if (parentDropdown) parentDropdown.classList.add('active');
  }

  if (tab === 'trash') {
    document.getElementById('tabTrash').classList.add('active');
    loadTrash();
  } else if (tab === 'tickets') {
    document.getElementById('tabTickets').classList.add('active');
    loadTickets();
  } else if (tab === 'landing') {
    document.getElementById('tabLanding').classList.add('active');
    loadLandingEditor();
  } else if (tab === 'templates') {
    document.getElementById('tabTemplates').classList.add('active');
    loadTemplatesEditor();
  } else if (tab === 'tutorials') {
    document.getElementById('tabTutorials').classList.add('active');
    loadTutorials();
  } else if (tab === 'manual') {
    document.getElementById('tabManual').classList.add('active');
    loadManual();
  } else if (tab === 'banners') {
    document.getElementById('tabBanners').classList.add('active');
    loadBanners();
  } else if (tab === 'comunicados') {
    document.getElementById('tabComunicados').classList.add('active');
    loadAnnouncements();
  } else if (tab === 'novidades') {
    document.getElementById('tabNovidades').classList.add('active');
    loadPlatformUpdates();
  } else if (tab === 'dashboardCards') {
    document.getElementById('tabDashboardCards').classList.add('active');
    loadDashboardCards();
  } else if (tab === 'sessionBackgrounds') {
    document.getElementById('tabSessionBackgrounds').classList.add('active');
    loadSessionBackgrounds();
  } else if (tab === 'security') {
    document.getElementById('tabSecurity').classList.add('active');
    loadSecurityLogs();
  } else if (tab === 'eventos') {
    document.getElementById('tabEventos').classList.add('active');
    loadEventos();
  } else if (tab === 'sistema') {
    document.getElementById('tabSistema').classList.add('active');
    loadSistema();
  } else if (tab === 'agente') {
    document.getElementById('tabAgente').classList.add('active');
    loadAgente();
  } else {
    const firstBtn = document.querySelectorAll('.tab-btn')[0];
    if (firstBtn) firstBtn.classList.add('active');
    document.getElementById('tabOrgs').classList.add('active');
  }
};

// ============================================================================
// INIT
// ============================================================================

document.getElementById('loginBtn').onclick = doLogin;
document.getElementById('loginPassword').onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
document.getElementById('loginEmail').onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
document.getElementById('logoutBtn').onclick = logout;

// Fechar modal ao clicar fora
document.getElementById('detailModal').onclick = (e) => {
  if (e.target === document.getElementById('detailModal')) closeModal();
};

// Verificar token ao carregar
if (getToken()) {
  fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: getToken() })
  })
  .then(r => r.json())
  .then(data => {
    if (data.valid) showApp();
    else showLogin();
  })
  .catch(() => showLogin());
} else {
  showLogin();
}
