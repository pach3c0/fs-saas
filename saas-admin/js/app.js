/**
 * SaaS Admin Panel - CliqueZoom
 * Painel de gerenciamento de organizações (superadmin only)
 */
import { addInlineToolbar, createRichEditor } from '../../admin/js/utils/richtext.js';

// Mapa de instâncias RTE do landing editor (rebuilt a cada renderLandingEditor())
let _landingRtes = {};

let authToken = localStorage.getItem('saas_token') || '';
let userEmail = localStorage.getItem('saas_email') || '';

// ============================================================================
// TOAST & CONFIRM
// ============================================================================

function saasToast(msg, type = 'info') {
  const container = document.getElementById('saasToastContainer');
  if (!container) return;
  const colors = { success: '#22c55e', error: '#f87171', warning: '#facc15', info: '#60a5fa' };
  const toast = document.createElement('div');
  toast.style.cssText = `background:#1e293b; border:1px solid ${colors[type] || colors.info}; color:#f1f5f9; padding:0.75rem 1rem; border-radius:8px; font-size:0.875rem; pointer-events:auto; box-shadow:0 4px 12px rgba(0,0,0,0.4); max-width:320px; border-left:3px solid ${colors[type] || colors.info};`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

let saasConfirmResolve = null;
function saasConfirm(msg, { title = 'Confirmar', confirmText = 'Confirmar', danger = false } = {}) {
  return new Promise(resolve => {
    saasConfirmResolve = (val) => {
      document.getElementById('saasConfirmModal').classList.remove('active');
      saasConfirmResolve = null;
      resolve(val);
    };
    document.getElementById('saasConfirmTitle').textContent = title;
    document.getElementById('saasConfirmMsg').textContent = msg;
    const okBtn = document.getElementById('saasConfirmOkBtn');
    okBtn.textContent = confirmText;
    okBtn.style.background = danger ? '#ef4444' : '#3b82f6';
    okBtn.style.color = 'white';
    document.getElementById('saasConfirmModal').classList.add('active');
  });
}
window.saasConfirmResolve = (val) => saasConfirmResolve?.(val);

// ============================================================================
// AUTH
// ============================================================================

async function apiRequest(method, url, body = null) {
  const headers = { 'Authorization': `Bearer ${authToken}` };
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  if (res.status === 401 || res.status === 403) {
    logout();
    throw new Error('Sessao expirada');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erro ${res.status}`);
  }
  return res.json();
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('userInfo').textContent = userEmail;
  loadDashboard();
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

    authToken = data.token;
    userEmail = email;
    localStorage.setItem('saas_token', data.token);
    localStorage.setItem('saas_email', email);
    errorEl.style.display = 'none';
    showApp();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  }
}

function logout() {
  authToken = '';
  userEmail = '';
  localStorage.removeItem('saas_token');
  localStorage.removeItem('saas_email');
  showLogin();
}

// ============================================================================
// DASHBOARD
// ============================================================================

async function loadDashboard() {
  await Promise.all([loadMetrics(), loadOrganizations(), loadPlanLimitsConfig()]);
}

async function loadPlanLimitsConfig() {
  const grid = document.getElementById('planLimitsGrid');
  try {
    const limits = await apiRequest('GET', '/api/admin/saas/plan-limits');
    const plans = ['free', 'basic', 'pro'];
    const labels = { maxStorage: 'Storage (MB)', maxSessions: 'Sessões (-1=∞)', maxPhotos: 'Fotos (-1=∞)', maxAlbums: 'Álbuns (-1=∞)' };

    grid.innerHTML = plans.map(plan => `
      <div style="background:#0f172a; border:1px solid #334155; border-radius:0.375rem; padding:0.875rem;">
        <div style="font-size:0.75rem; font-weight:700; color:#93c5fd; text-transform:uppercase; margin-bottom:0.625rem;">${plan}</div>
        ${Object.entries(labels).map(([key, label]) => `
          <label style="display:flex; flex-direction:column; gap:0.2rem; font-size:0.7rem; color:#94a3b8; margin-bottom:0.5rem;">
            ${label}
            <input data-plan="${plan}" data-key="${key}" type="number" value="${limits[plan][key]}" min="-1"
              style="background:#1e293b; color:#f1f5f9; border:1px solid #475569; border-radius:0.25rem; padding:0.3rem 0.5rem; font-size:0.8rem; width:100%;">
          </label>
        `).join('')}
      </div>
    `).join('');

    document.getElementById('savePlanLimitsBtn').onclick = async () => {
      const btn = document.getElementById('savePlanLimitsBtn');
      btn.textContent = 'Salvando...';
      btn.disabled = true;
      try {
        const payload = {};
        plans.forEach(plan => {
          payload[plan] = { customDomain: plan === 'pro' };
          Object.keys(labels).forEach(key => {
            payload[plan][key] = parseInt(grid.querySelector(`[data-plan="${plan}"][data-key="${key}"]`).value);
          });
        });
        await apiRequest('PUT', '/api/admin/saas/plan-limits', payload);
        btn.textContent = 'Salvo!';
        btn.style.background = '#065f46';
        setTimeout(() => { btn.textContent = 'Salvar'; btn.style.background = '#0369a1'; btn.disabled = false; }, 2000);
      } catch (err) {
        saasToast('Erro: ' + err.message, 'error');
        btn.textContent = 'Salvar';
        btn.disabled = false;
      }
    };
  } catch (err) {
    grid.innerHTML = `<div style="color:#f87171; font-size:0.8rem;">Erro ao carregar limites: ${err.message}</div>`;
  }
}

async function loadMetrics() {
  try {
    const data = await apiRequest('GET', '/api/admin/saas/metrics');

    // MRR estimado: basic=R$49, pro=R$99 (planos pagos)
    const PLAN_PRICES = { free: 0, basic: 49, pro: 99 };
    const byPlan = data.organizations.byPlan || {};
    const mrr = Object.entries(byPlan).reduce((sum, [plan, count]) => {
      return sum + (PLAN_PRICES[plan] || 0) * count;
    }, 0);
    const mrrLabel = mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const planBadges = Object.entries(byPlan).map(([p, c]) =>
      `<span style="text-transform:uppercase; font-size:0.625rem; background:#1e3a5f; color:#93c5fd; padding:0.1rem 0.375rem; border-radius:999px; margin-right:0.25rem;">${p}: ${c}</span>`
    ).join('');

    document.getElementById('metricsGrid').innerHTML = `
      <div class="metric-card">
        <div class="metric-label">Organizacoes</div>
        <div class="metric-value">${data.organizations.total}</div>
        <div class="metric-sub">${data.organizations.active} ativas, ${data.organizations.pending} pendentes</div>
        <div style="margin-top:0.5rem;">${planBadges}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">MRR Estimado</div>
        <div class="metric-value" style="font-size:1.375rem; color:#34d399;">${mrrLabel}</div>
        <div class="metric-sub">planos pagos × preco do plano</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Usuarios</div>
        <div class="metric-value">${data.users}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Sessoes</div>
        <div class="metric-value">${data.sessions}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Fotos</div>
        <div class="metric-value">${data.photos.toLocaleString('pt-BR')}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Armazenamento</div>
        <div style="display:flex; flex-direction:column; gap:0.25rem; margin-top:0.25rem;">
          <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
            <span style="color:#94a3b8;">👥 Tenants</span>
            <span style="color:#60a5fa; font-weight:600;">${formatSize(data.storageBytes)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
            <span style="color:#94a3b8;">🖥️ Plataforma</span>
            <span style="color:#a78bfa; font-weight:600;">${formatSize(data.platformBytes)}</span>
          </div>
          <div style="border-top:1px solid #334155; margin-top:0.25rem; padding-top:0.25rem; display:flex; justify-content:space-between; font-size:0.8rem;">
            <span style="color:#94a3b8;">Total</span>
            <span style="color:#f1f5f9; font-weight:700;">${formatSize((data.storageBytes || 0) + (data.platformBytes || 0))}</span>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    document.getElementById('metricsGrid').innerHTML = `<div class="loading" style="color:#f87171;">Erro: ${err.message}</div>`;
  }
}

// Helper para formatar tamanho
function formatSize(bytes) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Cache das orgs para filtro client-side
let allOrgs = [];

function renderOrgsTable(orgs) {
  const tbody = document.getElementById('orgsTable');
  if (!orgs.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading">Nenhuma organizacao encontrada</td></tr>';
    return;
  }
  tbody.innerHTML = orgs.map(org => {
    const owner = org.ownerId;
    const statusClass = org.isActive ? 'badge-active' : (org.plan === 'free' ? 'badge-pending' : 'badge-inactive');
    const statusText = org.isActive ? 'Ativa' : 'Inativa';
    const date = new Date(org.createdAt).toLocaleDateString('pt-BR');
    return `
      <tr>
        <td style="font-weight:600;">${esc(org.name)}</td>
        <td style="color:#94a3b8;">${esc(org.slug)}</td>
        <td>${owner ? esc(owner.name || owner.email) : '-'}</td>
        <td><span style="text-transform:uppercase; font-size:0.6875rem; color:#94a3b8;">${org.plan}</span></td>
        <td>${org.stats?.sessions || 0}</td>
        <td>${org.stats?.photos || 0}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td style="color:#94a3b8; font-size:0.75rem;">${date}</td>
        <td>
          <div class="btn-actions">
            <button class="btn btn-panel" onclick="openOrgPanel('${org._id}', '${esc(org.name)}', '${esc(org.slug)}')">Painel</button>
            ${org.isActive
              ? `<button class="btn btn-deactivate" onclick="deactivateOrg('${org._id}', '${esc(org.name)}')">Desativar</button>`
              : `<button class="btn btn-approve" onclick="approveOrg('${org._id}', '${esc(org.name)}')">Aprovar</button>
                 <button class="btn btn-trash" onclick="trashOrg('${org._id}', '${esc(org.name)}')">Excluir</button>`
            }
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadOrganizations() {
  try {
    const data = await apiRequest('GET', '/api/admin/organizations');
    allOrgs = data.organizations;

    // Adicionar barra de busca acima da tabela (se ainda não existe)
    let searchBar = document.getElementById('orgsSearchBar');
    if (!searchBar) {
      const tabOrgs = document.getElementById('tabOrgs');
      searchBar = document.createElement('div');
      searchBar.id = 'orgsSearchBar';
      searchBar.style.cssText = 'margin-bottom:1rem; display:flex; gap:0.75rem; align-items:center;';
      searchBar.innerHTML = `
        <input type="text" id="orgsSearchInput" placeholder="Buscar por nome, slug ou e-mail do owner..."
          style="flex:1; padding:0.5rem 0.875rem; border:1px solid #334155; border-radius:0.375rem; background:#0f172a; color:#e2e8f0; font-size:0.8125rem; outline:none;">
        <span id="orgsCount" style="color:#64748b; font-size:0.75rem; white-space:nowrap;"></span>
      `;
      tabOrgs.insertBefore(searchBar, tabOrgs.firstChild);

      document.getElementById('orgsSearchInput').oninput = (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = q
          ? allOrgs.filter(org => {
              const owner = org.ownerId;
              return org.name.toLowerCase().includes(q)
                || org.slug.toLowerCase().includes(q)
                || (owner?.email || '').toLowerCase().includes(q)
                || (owner?.name || '').toLowerCase().includes(q);
            })
          : allOrgs;
        document.getElementById('orgsCount').textContent = `${filtered.length} de ${allOrgs.length}`;
        renderOrgsTable(filtered);
      };
    }

    document.getElementById('orgsCount').textContent = `${allOrgs.length} organizacoes`;
    renderOrgsTable(allOrgs);
  } catch (err) {
    document.getElementById('orgsTable').innerHTML = `<tr><td colspan="9" class="loading" style="color:#f87171;">Erro: ${err.message}</td></tr>`;
  }
}

// ============================================================================
// AÇÕES
// ============================================================================

window.approveOrg = async (id, name) => {
  if (!await saasConfirm(`Aprovar a organização "${name}"?`, { title: 'Aprovar', confirmText: 'Aprovar' })) return;
  try {
    await apiRequest('PUT', `/api/admin/organizations/${id}/approve`);
    saasToast('Organização aprovada!', 'success');
    await loadDashboard();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

window.deactivateOrg = async (id, name) => {
  if (!await saasConfirm(`Desativar a organização "${name}"? O site dela ficará offline.`, { title: 'Desativar', confirmText: 'Desativar', danger: true })) return;
  try {
    await apiRequest('PUT', `/api/admin/organizations/${id}/deactivate`);
    saasToast('Organização desativada.', 'warning');
    await loadDashboard();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

window.showDetails = async (id) => {
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('modalContent');
  modal.classList.add('active');
  content.innerHTML = '<div class="loading">Carregando detalhes...</div>';

  try {
    const data = await apiRequest('GET', `/api/admin/organizations/${id}/details`);
    const org = data.organization;
    const stats = data.stats;

    document.getElementById('modalTitle').textContent = org.name;

    let usersHtml = data.users.map(u => `
      <li>
        <span>${esc(u.name)} (${esc(u.email)})</span>
        <span style="color:#94a3b8;">${u.role} - ${u.approved ? 'Aprovado' : 'Pendente'}</span>
      </li>
    `).join('');

    let sessionsHtml = data.recentSessions.map(s => {
      const statusColors = { pending: '#fbbf24', in_progress: '#60a5fa', submitted: '#34d399', delivered: '#a78bfa' };
      return `
        <li>
          <span>${esc(s.name)} <span style="color:#64748b;">(${s.type || '-'})</span></span>
          <span>
            ${s.photosCount} fotos
            <span style="color:${statusColors[s.status] || '#94a3b8'}; margin-left:0.5rem;">${s.status}</span>
          </span>
        </li>
      `;
    }).join('') || '<li style="color:#64748b;">Nenhuma sessao</li>';

    const planOptions = ['free', 'basic', 'pro'].map(p =>
      `<option value="${p}" ${org.plan === p ? 'selected' : ''}>${p.toUpperCase()}</option>`
    ).join('');

    content.innerHTML = `
      <div class="detail-grid">
        <div class="detail-card">
          <h4>Slug / URL</h4>
          <div class="val" style="font-size:1rem;">${esc(org.slug)}.cliquezoom.com.br</div>
        </div>
        <div class="detail-card">
          <h4>Plano</h4>
          <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.25rem;">
            <select id="planSelect" style="background:#1e293b; color:#f1f5f9; border:1px solid #475569; border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.875rem; font-weight:700; text-transform:uppercase; cursor:pointer;">
              ${planOptions}
            </select>
            <button id="savePlanBtn" style="background:#6366f1; color:white; border:none; border-radius:0.25rem; padding:0.25rem 0.75rem; font-size:0.75rem; font-weight:600; cursor:pointer;">Salvar</button>
          </div>
        </div>
        <div class="detail-card">
          <h4>Sessoes</h4>
          <div class="val">${stats.sessions}</div>
        </div>
        <div class="detail-card">
          <h4>Fotos</h4>
          <div class="val">${stats.photos}</div>
        </div>
        <div class="detail-card">
          <h4>Storage</h4>
          <div class="val">${stats.storageMB} MB</div>
          <div style="margin-top:0.4rem; background:#334155; height:4px; border-radius:2px; overflow:hidden;">
            <div style="background:#60a5fa; width:${Math.min(100, (stats.storageMB / stats.maxStorageMB) * 100)}%; height:100%;"></div>
          </div>
          <div style="font-size:0.625rem; color:#64748b; margin-top:0.25rem;">Limite: ${stats.maxStorageMB} MB</div>
          ${stats.breakdown ? `
          <div style="margin-top:0.5rem; display:flex; flex-wrap:wrap; gap:0.5rem; font-size:0.625rem; color:#94a3b8;">
            <span>📁 Sessões: ${stats.breakdown.sessionsMB} MB</span>
            <span>🌐 Site: ${stats.breakdown.siteMB} MB</span>
            <span>🎬 Vídeos: ${stats.breakdown.videosMB} MB</span>
          </div>` : ''}
        </div>
        <div class="detail-card">
          <h4>Newsletter</h4>
          <div class="val">${stats.newsletterSubs}</div>
        </div>
      </div>

      <div class="detail-section">
        <h3>Limites Customizados</h3>
        <div id="customLimitsForm" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:0.75rem; margin-top:0.75rem;">
          <label style="display:flex; flex-direction:column; gap:0.25rem; font-size:0.75rem; color:#94a3b8;">
            Storage (MB)
            <input id="lim_storage" type="number" value="${stats.maxStorageMB}" min="0"
              style="background:#1e293b; color:#f1f5f9; border:1px solid #475569; border-radius:0.25rem; padding:0.375rem 0.5rem; font-size:0.875rem;">
          </label>
          <label style="display:flex; flex-direction:column; gap:0.25rem; font-size:0.75rem; color:#94a3b8;">
            Sessões (-1 = ∞)
            <input id="lim_sessions" type="number" value="${stats.maxSessions ?? -1}" min="-1"
              style="background:#1e293b; color:#f1f5f9; border:1px solid #475569; border-radius:0.25rem; padding:0.375rem 0.5rem; font-size:0.875rem;">
          </label>
          <label style="display:flex; flex-direction:column; gap:0.25rem; font-size:0.75rem; color:#94a3b8;">
            Fotos (-1 = ∞)
            <input id="lim_photos" type="number" value="${stats.maxPhotos ?? -1}" min="-1"
              style="background:#1e293b; color:#f1f5f9; border:1px solid #475569; border-radius:0.25rem; padding:0.375rem 0.5rem; font-size:0.875rem;">
          </label>
          <label style="display:flex; flex-direction:column; gap:0.25rem; font-size:0.75rem; color:#94a3b8;">
            Álbuns (-1 = ∞)
            <input id="lim_albums" type="number" value="${stats.maxAlbums ?? -1}" min="-1"
              style="background:#1e293b; color:#f1f5f9; border:1px solid #475569; border-radius:0.25rem; padding:0.375rem 0.5rem; font-size:0.875rem;">
          </label>
        </div>
        <button id="saveLimitsBtn" style="margin-top:0.75rem; background:#0369a1; color:white; border:none; border-radius:0.25rem; padding:0.375rem 1rem; font-size:0.8rem; font-weight:600; cursor:pointer;">
          Salvar limites desta org
        </button>
      </div>

      <div class="detail-section">
        <h3>Usuarios</h3>
        <ul class="detail-list">${usersHtml}</ul>
      </div>

      <div class="detail-section">
        <h3>Sessoes recentes</h3>
        <ul class="detail-list">${sessionsHtml}</ul>
      </div>
    `;

    content.querySelector('#savePlanBtn').onclick = async () => {
      const newPlan = content.querySelector('#planSelect').value;
      const btn = content.querySelector('#savePlanBtn');
      btn.textContent = 'Salvando...';
      btn.disabled = true;
      try {
        await apiRequest('PUT', `/api/admin/organizations/${id}/plan`, { plan: newPlan });
        btn.textContent = 'Salvo!';
        btn.style.background = '#065f46';
        // Atualizar cache local
        const orgIdx = allOrgs.findIndex(o => o._id === id);
        if (orgIdx !== -1) allOrgs[orgIdx].plan = newPlan;
        setTimeout(() => {
          btn.textContent = 'Salvar';
          btn.style.background = '#6366f1';
          btn.disabled = false;
        }, 2000);
      } catch (err) {
        saasToast('Erro: ' + err.message, 'error');
        btn.textContent = 'Salvar';
        btn.disabled = false;
      }
    };
    content.querySelector('#saveLimitsBtn').onclick = async () => {
      const btn = content.querySelector('#saveLimitsBtn');
      btn.textContent = 'Salvando...';
      btn.disabled = true;
      try {
        await apiRequest('PUT', `/api/admin/organizations/${id}/limits`, {
          maxStorage:  parseInt(content.querySelector('#lim_storage').value),
          maxSessions: parseInt(content.querySelector('#lim_sessions').value),
          maxPhotos:   parseInt(content.querySelector('#lim_photos').value),
          maxAlbums:   parseInt(content.querySelector('#lim_albums').value),
          customDomain: false
        });
        btn.textContent = 'Salvo!';
        btn.style.background = '#065f46';
        setTimeout(() => { btn.textContent = 'Salvar limites desta org'; btn.style.background = '#0369a1'; btn.disabled = false; }, 2000);
      } catch (err) {
        saasToast('Erro: ' + err.message, 'error');
        btn.textContent = 'Salvar limites desta org';
        btn.disabled = false;
      }
    };
  } catch (err) {
    content.innerHTML = `<div class="loading" style="color:#f87171;">Erro: ${err.message}</div>`;
  }
};

window.closeModal = () => {
  document.getElementById('detailModal').classList.remove('active');
};

// ============================================================================
// TABS
// ============================================================================

window.switchTab = (tab) => {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(`'${tab}'`));
  if (targetBtn) {
    targetBtn.classList.add('active');
  }

  if (tab === 'trash') {
    document.getElementById('tabTrash').classList.add('active');
    loadTrash();
  } else if (tab === 'landing') {
    document.getElementById('tabLanding').classList.add('active');
    loadLandingEditor();
  } else if (tab === 'componentes') {
    document.getElementById('tabComponentes').classList.add('active');
    if (window.loadComponentesLibrary) window.loadComponentesLibrary();
  } else if (tab === 'tutorials') {
    document.getElementById('tabTutorials').classList.add('active');
    loadTutorials();
  } else if (tab === 'security') {
    document.getElementById('tabSecurity').classList.add('active');
    loadSecurityLogs();
  } else {
    const firstBtn = document.querySelectorAll('.tab-btn')[0];
    if (firstBtn) firstBtn.classList.add('active');
    document.getElementById('tabOrgs').classList.add('active');
  }
};

// ============================================================================
// LIXEIRA
// ============================================================================

async function loadTrash() {
  const tbody = document.getElementById('trashTable');
  try {
    const data = await apiRequest('GET', '/api/admin/organizations/trash');

    if (!data.organizations.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading">Lixeira vazia</td></tr>';
      document.getElementById('trashCount').textContent = '';
      return;
    }

    document.getElementById('trashCount').textContent = `(${data.organizations.length})`;

    tbody.innerHTML = data.organizations.map(org => {
      const owner = org.ownerId;
      const deletedDate = new Date(org.deletedAt).toLocaleDateString('pt-BR');
      const daysAgo = Math.floor((Date.now() - new Date(org.deletedAt)) / 86400000);

      return `
        <tr>
          <td style="font-weight:600;">${esc(org.name)}</td>
          <td style="color:#94a3b8;">${esc(org.slug)}</td>
          <td>${owner ? esc(owner.name || owner.email) : '-'}</td>
          <td><span style="text-transform:uppercase; font-size:0.6875rem; color:#94a3b8;">${org.plan}</span></td>
          <td style="color:#94a3b8; font-size:0.75rem;">${deletedDate} <span style="color:#64748b;">(${daysAgo}d atras)</span></td>
          <td>
            <div class="btn-actions">
              <button class="btn btn-restore" onclick="restoreOrg('${org._id}', '${esc(org.name)}')">Restaurar</button>
              <button class="btn btn-delete-permanent" onclick="openConfirmDelete('${org._id}', '${esc(org.name)}')">Excluir Definitivamente</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="loading" style="color:#f87171;">Erro: ${err.message}</td></tr>`;
  }
}

window.trashOrg = async (id, name) => {
  if (!await saasConfirm(`Mover "${name}" para a lixeira?`, { title: 'Mover para Lixeira', confirmText: 'Mover', danger: true })) return;
  try {
    await apiRequest('PUT', `/api/admin/organizations/${id}/trash`);
    saasToast(`"${name}" movida para a lixeira.`, 'warning');
    await loadDashboard();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

window.restoreOrg = async (id, name) => {
  if (!await saasConfirm(`Restaurar "${name}"? A organização ficará ativa novamente.`, { title: 'Restaurar', confirmText: 'Restaurar' })) return;
  try {
    await apiRequest('PUT', `/api/admin/organizations/${id}/restore`);
    saasToast(`"${name}" restaurada com sucesso!`, 'success');
    await loadTrash();
    await loadDashboard();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

// ============================================================================
// DELETE DEFINITIVO (com confirmação)
// ============================================================================

let pendingDeleteId = null;
let pendingDeleteName = '';

window.openConfirmDelete = (id, name) => {
  pendingDeleteId = id;
  pendingDeleteName = name;
  document.getElementById('confirmOrgName').textContent = name;
  document.getElementById('confirmInput').value = '';
  document.getElementById('confirmDeleteBtn').disabled = true;
  document.getElementById('confirmDeleteModal').classList.add('active');
};

window.closeConfirmDelete = () => {
  document.getElementById('confirmDeleteModal').classList.remove('active');
  pendingDeleteId = null;
  pendingDeleteName = '';
};

document.getElementById('confirmInput').oninput = (e) => {
  const match = e.target.value.trim() === pendingDeleteName;
  document.getElementById('confirmDeleteBtn').disabled = !match;
};

window.executePermanentDelete = async () => {
  if (!pendingDeleteId) return;
  try {
    document.getElementById('confirmDeleteBtn').textContent = 'Excluindo...';
    document.getElementById('confirmDeleteBtn').disabled = true;
    await apiRequest('DELETE', `/api/admin/organizations/${pendingDeleteId}`);
    saasToast(`"${pendingDeleteName}" excluída definitivamente.`, 'success');
    closeConfirmDelete();
    await loadTrash();
    await loadMetrics();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  } finally {
    document.getElementById('confirmDeleteBtn').textContent = 'Excluir Definitivamente';
  }
};

// Fechar modal confirmação ao clicar fora
document.getElementById('confirmDeleteModal').onclick = (e) => {
  if (e.target === document.getElementById('confirmDeleteModal')) closeConfirmDelete();
};

// ============================================================================
// LANDING PAGE EDITOR
// ============================================================================

let landingData = null;

async function loadLandingEditor() {
  const el = document.getElementById('landingEditor');
  el.innerHTML = '<div class="loading">Carregando...</div>';

  try {
    const res = await apiRequest('GET', '/api/landing/config');
    landingData = res.data;
    renderLandingEditor();
  } catch (err) {
    el.innerHTML = `<div class="loading" style="color:#f87171;">Erro: ${err.message}</div>`;
  }
}

function renderLandingEditor() {
  const el = document.getElementById('landingEditor');
  const d = landingData;

  el.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">

      <!-- Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
        <h2 style="font-size:1.25rem; font-weight:700; color:#f1f5f9;">Editor da Landing Page</h2>
        <div style="display:flex; gap:0.75rem;">
          <a href="/landing" target="_blank" style="background:#1e3a5f; color:#93c5fd; padding:0.5rem 1rem; border-radius:0.375rem; font-size:0.8125rem; font-weight:500; text-decoration:none;">Ver Landing Page ↗</a>
          <button id="saveLandingBtn" style="background:#6366f1; color:white; padding:0.5rem 1.25rem; border-radius:0.375rem; font-size:0.875rem; font-weight:600; border:none; cursor:pointer;">Salvar tudo</button>
        </div>
      </div>

      <!-- HERO -->
      ${landingSection('Hero', `
        ${field('Headline', 'heroHeadline', d.hero.headline)}
        ${field('Subheadline', 'heroSubheadline', d.hero.subheadline)}
        ${fieldRow([
          ['Texto do botao CTA', 'heroCtaText', d.hero.ctaText],
          ['Texto abaixo do botao', 'heroCtaSubtext', d.hero.ctaSubtext]
        ])}
      `)}

      <!-- COMO FUNCIONA -->
      ${landingSection('Como Funciona', `
        ${field('Titulo da secao', 'howTitle', d.howItWorks.title)}
        <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;">
          ${d.howItWorks.steps.map((s, i) => `
            <div style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1rem; display:grid; grid-template-columns:3rem 1fr 2fr; gap:0.75rem; align-items:center;">
              <input type="text" value="${esc(s.icon)}" id="stepIcon${i}" style="${inputStyle()}" placeholder="Emoji">
              <input type="text" value="${esc(s.title)}" id="stepTitle${i}" style="${inputStyle()}" placeholder="Titulo">
              <input type="text" value="${esc(s.description)}" id="stepDesc${i}" style="${inputStyle()}" placeholder="Descricao">
            </div>
          `).join('')}
        </div>
      `)}

      <!-- FUNCIONALIDADES -->
      ${landingSection('Funcionalidades', `
        ${field('Titulo da secao', 'featuresSectionTitle', d.features.title)}
        <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;">
          ${d.features.items.map((f, i) => `
            <div style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1rem; display:grid; grid-template-columns:3rem 1fr 2fr auto; gap:0.75rem; align-items:center;">
              <input type="text" value="${esc(f.icon)}" id="featIcon${i}" style="${inputStyle()}" placeholder="Emoji">
              <input type="text" value="${esc(f.title)}" id="featTitle${i}" style="${inputStyle()}" placeholder="Titulo">
              <input type="text" value="${esc(f.description)}" id="featDesc${i}" style="${inputStyle()}" placeholder="Descricao">
              <label style="display:flex; align-items:center; gap:0.375rem; font-size:0.75rem; color:#94a3b8; cursor:pointer; white-space:nowrap;">
                <input type="checkbox" id="featActive${i}" ${f.active !== false ? 'checked' : ''}> Ativo
              </label>
            </div>
          `).join('')}
        </div>
      `)}

      <!-- PLANOS -->
      ${landingSection('Planos e Precos', `
        ${fieldRow([
          ['Titulo', 'plansTitle', d.plans.title],
          ['Subtitulo', 'plansSub', d.plans.subtitle]
        ])}
        <div style="display:flex; flex-direction:column; gap:1rem; margin-top:0.75rem;">
          ${d.plans.items.map((p, i) => `
            <div style="background:#0f172a; border:1px solid ${p.highlighted ? '#6366f1' : '#334155'}; border-radius:0.5rem; padding:1.25rem;">
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr auto; gap:0.75rem; margin-bottom:0.75rem; align-items:center;">
                <input type="text" value="${esc(p.name)}" id="planName${i}" style="${inputStyle()}" placeholder="Nome">
                <input type="text" value="${esc(p.price)}" id="planPrice${i}" style="${inputStyle()}" placeholder="Preco (ex: R$ 49)">
                <input type="text" value="${esc(p.period)}" id="planPeriod${i}" style="${inputStyle()}" placeholder="Periodo (ex: por mes)">
                <label style="display:flex; align-items:center; gap:0.375rem; font-size:0.75rem; color:#94a3b8; cursor:pointer; white-space:nowrap;">
                  <input type="checkbox" id="planHL${i}" ${p.highlighted ? 'checked' : ''}> Destaque
                </label>
              </div>
              <input type="text" value="${esc(p.description)}" id="planDesc${i}" style="${inputStyle()} width:100%; margin-bottom:0.5rem;" placeholder="Descricao">
              <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:0.375rem;">Features (uma por linha):</label>
              <textarea id="planFeatures${i}" rows="5" style="${inputStyle()} width:100%; resize:vertical;">${p.features.join('\n')}</textarea>
            </div>
          `).join('')}
        </div>
      `)}

      <!-- DEPOIMENTOS -->
      ${landingSection('Depoimentos', `
        ${field('Titulo da secao', 'testimonTitle', d.testimonials.title)}
        <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;" id="testimonialsList">
          ${d.testimonials.items.map((t, i) => renderTestimonialRow(t, i)).join('')}
        </div>
        <button onclick="addTestimonial()" style="margin-top:0.75rem; background:#16a34a; color:white; border:none; border-radius:0.375rem; padding:0.5rem 1rem; font-size:0.8125rem; font-weight:600; cursor:pointer;">+ Adicionar depoimento</button>
      `)}

      <!-- FAQ -->
      ${landingSection('FAQ', `
        ${field('Titulo da secao', 'faqTitle', d.faq.title)}
        <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;" id="faqList">
          ${d.faq.items.map((f, i) => renderFaqRow(f, i)).join('')}
        </div>
        <button onclick="addFaq()" style="margin-top:0.75rem; background:#16a34a; color:white; border:none; border-radius:0.375rem; padding:0.5rem 1rem; font-size:0.8125rem; font-weight:600; cursor:pointer;">+ Adicionar pergunta</button>
      `)}

      <!-- SOLUÇÕES -->
      ${landingSection('Soluções', `
        ${fieldRow([
          ['Título da seção', 'solutionsTitle', (d.solutions || {}).title || ''],
          ['Subtítulo', 'solutionsSub', (d.solutions || {}).subtitle || '']
        ])}
        <div style="display:flex; flex-direction:column; gap:1rem; margin-top:0.75rem;" id="solutionsList">
          ${((d.solutions || {}).items || []).map((s, i) => renderSolutionCard(s, i)).join('')}
        </div>
        <button onclick="addSolution()" style="margin-top:1rem; background:#16a34a; color:white; border:none; border-radius:0.375rem; padding:0.5rem 1.25rem; font-size:0.8125rem; font-weight:600; cursor:pointer;">+ Novo Card</button>
      `)}

      <!-- CTA FINAL -->
      ${landingSection('CTA Final', `
        ${field('Titulo', 'ctaTitle', d.cta.title)}
        ${field('Subtitulo', 'ctaSub', d.cta.subtitle)}
        ${field('Texto do botao', 'ctaBtn', d.cta.buttonText)}
      `)}

      <!-- FOOTER -->
      ${landingSection('Footer', `
        ${field('Texto do rodape', 'footerText', d.footer.text)}
      `)}

    </div>
  `;

  document.getElementById('saveLandingBtn').onclick = saveLanding;

  // Inicializa rich text editors após o HTML estar no DOM
  _landingRtes = {};
  applyRteToLandingEditor();

  // Inicializa drag & drop nos cards de soluções
  setupSolutionsDragDrop();
}

function landingSection(title, content) {
  return `
    <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:1.5rem;">
      <h3 style="font-size:0.875rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:1.25rem;">${title}</h3>
      ${content}
    </div>
  `;
}

function field(label, id, value, type = 'text') {
  return `
    <div style="margin-bottom:0.875rem;">
      <label style="display:block; font-size:0.75rem; font-weight:500; color:#94a3b8; margin-bottom:0.375rem;">${label}</label>
      <input type="${type}" id="${id}" value="${esc(value || '')}" style="${inputStyle()} width:100%;">
    </div>
  `;
}

function fieldRow(fields) {
  return `
    <div style="display:grid; grid-template-columns:repeat(${fields.length}, 1fr); gap:0.75rem; margin-bottom:0.875rem;">
      ${fields.map(([label, id, value]) => `
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#94a3b8; margin-bottom:0.375rem;">${label}</label>
          <input type="text" id="${id}" value="${esc(value || '')}" style="${inputStyle()} width:100%;">
        </div>
      `).join('')}
    </div>
  `;
}

function inputStyle() {
  return 'padding:0.5rem 0.75rem; border:1px solid #334155; border-radius:0.375rem; background:#0f172a; color:#f1f5f9; font-size:0.8125rem;';
}

function renderTestimonialRow(t, i) {
  return `
    <div id="testimonialRow${i}" style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1rem; display:flex; flex-direction:column; gap:0.625rem;">
      <div style="display:grid; grid-template-columns:1fr 1fr auto auto; gap:0.5rem; align-items:center;">
        <input type="text" value="${esc(t.author)}" id="testimonAuthor${i}" style="${inputStyle()} width:100%;" placeholder="Nome do autor">
        <input type="text" value="${esc(t.role)}" id="testimonRole${i}" style="${inputStyle()} width:100%;" placeholder="Funcao">
        <label style="display:flex; align-items:center; gap:0.25rem; font-size:0.75rem; color:#94a3b8; cursor:pointer; white-space:nowrap;">
          <input type="checkbox" id="testimonActive${i}" ${t.active !== false ? 'checked' : ''}> Ativo
        </label>
        <button onclick="removeTestimonial(${i})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.125rem; padding:0.25rem;" title="Remover">×</button>
      </div>
      <div style="font-size:0.7rem; color:#94a3b8; margin-bottom:0.125rem;">Texto do depoimento</div>
      <div id="testimonTextWrap${i}"></div>
    </div>
  `;
}

function renderFaqRow(f, i) {
  return `
    <div id="faqRow${i}" style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1rem; display:flex; flex-direction:column; gap:0.625rem;">
      <div style="display:grid; grid-template-columns:1fr auto auto; gap:0.5rem; align-items:center;">
        <input type="text" value="${esc(f.question)}" id="faqQ${i}" style="${inputStyle()} width:100%;" placeholder="Pergunta">
        <label style="display:flex; align-items:center; gap:0.25rem; font-size:0.75rem; color:#94a3b8; cursor:pointer; white-space:nowrap;">
          <input type="checkbox" id="faqActive${i}" ${f.active !== false ? 'checked' : ''}> Ativo
        </label>
        <button onclick="removeFaq(${i})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.125rem; padding:0.25rem;" title="Remover">×</button>
      </div>
      <div style="font-size:0.7rem; color:#94a3b8; margin-bottom:0.125rem;">Resposta</div>
      <div id="faqAWrap${i}"></div>
    </div>
  `;
}

window.addTestimonial = () => {
  landingData.testimonials.items.push({ text: '', author: '', role: '', active: true });
  renderLandingEditor();
  document.getElementById('landingEditor').scrollTop = 99999;
};

window.removeTestimonial = (i) => {
  landingData.testimonials.items.splice(i, 1);
  renderLandingEditor();
};

window.addFaq = () => {
  landingData.faq.items.push({ question: '', answer: '', active: true });
  renderLandingEditor();
};

window.removeFaq = (i) => {
  landingData.faq.items.splice(i, 1);
  renderLandingEditor();
};

// ── Helpers Soluções ──
function renderSolutionCard(s, i) {
  const subHtml = (s.subItems || []).map((sub, j) => `
    <div style="display:grid; grid-template-columns:1fr 2fr auto; gap:0.5rem; align-items:center; margin-bottom:0.375rem;">
      <input type="text" value="${esc(sub.name)}" id="subName${i}_${j}"
        style="${inputStyle()} width:100%;" placeholder="Nome (ex: Seleção)">
      <input type="text" value="${esc(sub.description)}" id="subDesc${i}_${j}"
        style="${inputStyle()} width:100%;" placeholder="Descrição curta">
      <button onclick="removeSubItem(${i},${j})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1rem; padding:0.25rem;" title="Remover">×</button>
    </div>
  `).join('');

  return `
    <div id="solutionCard${i}" data-sol-index="${i}" draggable="true"
      style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1.25rem; transition: opacity 0.2s, border-color 0.2s;">

      <!-- Linha topo: handle + ícone + título + ativo + excluir -->
      <div style="display:grid; grid-template-columns:1.5rem 3rem 1fr auto auto; gap:0.75rem; align-items:center; margin-bottom:0.875rem;">
        <!-- Handle de arraste -->
        <div class="sol-drag-handle" title="Arrastar para reordenar"
          style="color:#475569; font-size:1.1rem; cursor:grab; user-select:none; display:flex; align-items:center; justify-content:center; padding:0.25rem;">⠿</div>
        <input type="text" value="${esc(s.icon || '')}" id="solIcon${i}"
          style="${inputStyle()} text-align:center; font-size:1.25rem;" placeholder="📷">
        <input type="text" value="${esc(s.title || '')}" id="solTitle${i}"
          style="${inputStyle()} width:100%;" placeholder="Título do card">
        <label style="display:flex; align-items:center; gap:0.25rem; font-size:0.75rem; color:#94a3b8; cursor:pointer; white-space:nowrap;">
          <input type="checkbox" id="solActive${i}" ${s.active !== false ? 'checked' : ''}> Ativo
        </label>
        <button onclick="removeSolution(${i})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.125rem; padding:0.25rem;" title="Remover card">×</button>
      </div>

      <input type="text" value="${esc(s.description || '')}" id="solDesc${i}"
        style="${inputStyle()} width:100%; margin-bottom:1rem;" placeholder="Descrição do card">
      <div style="font-size:0.7rem; color:#94a3b8; margin-bottom:0.5rem;">Sub-itens:</div>
      <div id="subItemsList${i}">${subHtml}</div>
      <button onclick="addSubItem(${i})" style="margin-top:0.5rem; background:rgba(99,102,241,0.15); color:#a5b4fc; border:1px solid rgba(99,102,241,0.3); border-radius:0.25rem; padding:0.3rem 0.75rem; font-size:0.75rem; font-weight:600; cursor:pointer;">+ Add sub-item</button>
    </div>
  `;
}

// ── Drag & Drop para reordenar soluções ──
function setupSolutionsDragDrop() {
  const list = document.getElementById('solutionsList');
  if (!list) return;

  let dragSrcIndex = null;

  list.querySelectorAll('[data-sol-index]').forEach(card => {
    const idx = parseInt(card.dataset.solIndex);

    // Só inicia drag quando clica no handle
    const handle = card.querySelector('.sol-drag-handle');
    if (handle) {
      handle.addEventListener('mousedown', () => { card.draggable = true; });
      // Volta draggable=false quando soltar para não interferir nos inputs
      card.addEventListener('dragend', () => { card.draggable = false; });
      // Inicialmente não draggable (evita conflito com inputs/textareas)
      card.draggable = false;
    }

    card.addEventListener('dragstart', (e) => {
      dragSrcIndex = idx;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idx);
      setTimeout(() => { card.style.opacity = '0.4'; }, 0);
    });

    card.addEventListener('dragend', () => {
      card.style.opacity = '1';
      card.style.borderColor = '#334155';
      list.querySelectorAll('[data-sol-index]').forEach(c => {
        c.style.borderColor = '#334155';
        c.style.transform = '';
      });
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      // Highlight do card alvo
      list.querySelectorAll('[data-sol-index]').forEach(c => { c.style.borderColor = '#334155'; });
      if (dragSrcIndex !== idx) {
        card.style.borderColor = '#6366f1';
      }
    });

    card.addEventListener('dragleave', () => {
      card.style.borderColor = '#334155';
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragSrcIndex === null || dragSrcIndex === idx) return;

      // Lê os valores atuais dos inputs ANTES de re-renderizar
      _syncSolutionsFromDOM();

      // Reordena o array
      const items = landingData.solutions.items;
      const moved = items.splice(dragSrcIndex, 1)[0];
      items.splice(idx, 0, moved);

      dragSrcIndex = null;
      renderLandingEditor();
      // Garante scroll na lista para mostrar o card movido
      setTimeout(() => {
        document.getElementById('solutionsList')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    });
  });
}

// ── Sincroniza DOM → landingData.solutions.items (para preservar edições antes do drag) ──
function _syncSolutionsFromDOM() {
  const items = (landingData.solutions || {}).items || [];
  items.forEach((s, i) => {
    s.icon        = document.getElementById(`solIcon${i}`)?.value        ?? s.icon;
    s.title       = document.getElementById(`solTitle${i}`)?.value       ?? s.title;
    s.description = document.getElementById(`solDesc${i}`)?.value       ?? s.description;
    s.active      = document.getElementById(`solActive${i}`)?.checked    ?? s.active;
    (s.subItems || []).forEach((sub, j) => {
      sub.name        = document.getElementById(`subName${i}_${j}`)?.value  ?? sub.name;
      sub.description = document.getElementById(`subDesc${i}_${j}`)?.value ?? sub.description;
    });
  });
}

window.addSolution = () => {
  _syncSolutionsFromDOM();
  if (!landingData.solutions) landingData.solutions = { title: '', subtitle: '', items: [] };
  landingData.solutions.items.push({ icon: '📷', title: '', description: '', subItems: [], active: true });
  renderLandingEditor();
  document.getElementById('landingEditor').scrollTop = 99999;
};

window.removeSolution = (i) => {
  _syncSolutionsFromDOM();
  landingData.solutions.items.splice(i, 1);
  renderLandingEditor();
};

window.addSubItem = (i) => {
  _syncSolutionsFromDOM();
  landingData.solutions.items[i].subItems = landingData.solutions.items[i].subItems || [];
  landingData.solutions.items[i].subItems.push({ name: '', description: '' });
  renderLandingEditor();
};

window.removeSubItem = (i, j) => {
  _syncSolutionsFromDOM();
  landingData.solutions.items[i].subItems.splice(j, 1);
  renderLandingEditor();
};

// ── Helper: lê valor de um campo (RTE ou input simples) ──
function _rteVal(key, inputId) {
  return _landingRtes[key]?.getValue() || document.getElementById(inputId)?.value || '';
}

// ── Aplica RTEs após renderLandingEditor() popular o DOM ──
function applyRteToLandingEditor() {
  const d = landingData;
  if (!d) return;

  // Hero — toolbar inline em Headline e Subheadline
  const headlineEl = document.getElementById('heroHeadline');
  if (headlineEl) {
    _landingRtes['heroHeadline'] = addInlineToolbar(headlineEl, null, {
      placeholder: 'Título principal da landing page',
      features: ['bold', 'italic', 'emoji'],
    });
    _landingRtes['heroHeadline'].setValue(d.hero.headline || '');
  }
  const subHeadlineEl = document.getElementById('heroSubheadline');
  if (subHeadlineEl) {
    _landingRtes['heroSubheadline'] = addInlineToolbar(subHeadlineEl, null, {
      placeholder: 'Subtítulo / proposta de valor',
      features: ['bold', 'italic', 'emoji'],
    });
    _landingRtes['heroSubheadline'].setValue(d.hero.subheadline || '');
  }

  // Steps — toolbar inline nas descrições
  d.howItWorks.steps.forEach((s, i) => {
    const el = document.getElementById(`stepDesc${i}`);
    if (el) {
      _landingRtes[`stepDesc${i}`] = addInlineToolbar(el, null, {
        placeholder: 'Descrição do passo',
        features: ['bold', 'italic'],
      });
      _landingRtes[`stepDesc${i}`].setValue(s.description || '');
    }
  });

  // Features — toolbar inline nas descrições
  d.features.items.forEach((f, i) => {
    const el = document.getElementById(`featDesc${i}`);
    if (el) {
      _landingRtes[`featDesc${i}`] = addInlineToolbar(el, null, {
        placeholder: 'Descrição da funcionalidade',
        features: ['bold', 'italic'],
      });
      _landingRtes[`featDesc${i}`].setValue(f.description || '');
    }
  });

  // Depoimentos — editor rico no campo texto
  d.testimonials.items.forEach((t, i) => {
    const wrap = document.getElementById(`testimonTextWrap${i}`);
    if (wrap) {
      _landingRtes[`testimonText${i}`] = createRichEditor(
        wrap,
        t.text || '',
        null,
        { placeholder: 'Texto do depoimento...', minHeight: 60, features: ['bold', 'italic', 'emoji', 'clear'] }
      );
    }
  });

  // FAQ — editor rico na resposta
  d.faq.items.forEach((f, i) => {
    const wrap = document.getElementById(`faqAWrap${i}`);
    if (wrap) {
      _landingRtes[`faqA${i}`] = createRichEditor(
        wrap,
        f.answer || '',
        null,
        { placeholder: 'Resposta completa...', minHeight: 70, features: ['bold', 'italic', 'underline', 'br', 'list', 'emoji', 'clear'] }
      );
    }
  });

  // CTA e Footer — toolbar inline
  ['ctaTitle', 'ctaSub', 'footerText'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const key = id;
    const vals = { ctaTitle: d.cta.title, ctaSub: d.cta.subtitle, footerText: d.footer.text };
    _landingRtes[key] = addInlineToolbar(el, null, {
      placeholder: el.placeholder || '',
      features: ['bold', 'italic', 'emoji'],
    });
    _landingRtes[key].setValue(vals[key] || '');
  });
}

async function saveLanding() {
  const btn = document.getElementById('saveLandingBtn');
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  try {
    const d = landingData;
    const solutions = ((landingData.solutions || {}).items || []).map((s, i) => ({
      icon: document.getElementById(`solIcon${i}`)?.value || s.icon || '',
      title: document.getElementById(`solTitle${i}`)?.value || s.title || '',
      description: document.getElementById(`solDesc${i}`)?.value || s.description || '',
      active: document.getElementById(`solActive${i}`)?.checked !== false,
      subItems: (s.subItems || []).map((sub, j) => ({
        name: document.getElementById(`subName${i}_${j}`)?.value || sub.name || '',
        description: document.getElementById(`subDesc${i}_${j}`)?.value || sub.description || '',
      })),
    }));

    const steps = d.howItWorks.steps.map((s, i) => ({
      icon: document.getElementById(`stepIcon${i}`)?.value || '',
      title: document.getElementById(`stepTitle${i}`)?.value || '',
      description: _rteVal(`stepDesc${i}`, `stepDesc${i}`) || s.description,
    }));

    const features = d.features.items.map((f, i) => ({
      icon: document.getElementById(`featIcon${i}`)?.value || '',
      title: document.getElementById(`featTitle${i}`)?.value || '',
      description: _rteVal(`featDesc${i}`, `featDesc${i}`) || f.description,
      active: document.getElementById(`featActive${i}`)?.checked !== false,
    }));

    const plans = d.plans.items.map((p, i) => ({
      name: document.getElementById(`planName${i}`)?.value || '',
      price: document.getElementById(`planPrice${i}`)?.value || '',
      period: document.getElementById(`planPeriod${i}`)?.value || '',
      description: document.getElementById(`planDesc${i}`)?.value || '',
      highlighted: document.getElementById(`planHL${i}`)?.checked || false,
      features: (document.getElementById(`planFeatures${i}`)?.value || '').split('\n').filter(f => f.trim()),
    }));

    const testimonials = d.testimonials.items.map((t, i) => ({
      text: _rteVal(`testimonText${i}`, `testimonText${i}`) || t.text,
      author: document.getElementById(`testimonAuthor${i}`)?.value || '',
      role: document.getElementById(`testimonRole${i}`)?.value || '',
      active: document.getElementById(`testimonActive${i}`)?.checked !== false,
    }));

    const faqs = d.faq.items.map((f, i) => ({
      question: document.getElementById(`faqQ${i}`)?.value || '',
      answer: _rteVal(`faqA${i}`, `faqA${i}`) || f.answer,
      active: document.getElementById(`faqActive${i}`)?.checked !== false,
    }));

    const payload = {
      'solutions.title':    document.getElementById('solutionsTitle')?.value || '',
      'solutions.subtitle': document.getElementById('solutionsSub')?.value || '',
      'solutions.items':    solutions,
      'hero.headline':     _rteVal('heroHeadline', 'heroHeadline'),
      'hero.subheadline':  _rteVal('heroSubheadline', 'heroSubheadline'),
      'hero.ctaText':      document.getElementById('heroCtaText')?.value || '',
      'hero.ctaSubtext':   document.getElementById('heroCtaSubtext')?.value || '',
      'howItWorks.title':  document.getElementById('howTitle')?.value || '',
      'howItWorks.steps':  steps,
      'features.title':    document.getElementById('featuresSectionTitle')?.value || d.features.title,
      'features.items':    features,
      'plans.title':       document.getElementById('plansTitle')?.value || '',
      'plans.subtitle':    document.getElementById('plansSub')?.value || '',
      'plans.items':       plans,
      'testimonials.title': document.getElementById('testimonTitle')?.value || '',
      'testimonials.items': testimonials,
      'faq.title':         document.getElementById('faqTitle')?.value || '',
      'faq.items':         faqs,
      'cta.title':         _rteVal('ctaTitle', 'ctaTitle'),
      'cta.subtitle':      _rteVal('ctaSub', 'ctaSub'),
      'cta.buttonText':    document.getElementById('ctaBtn')?.value || '',
      'footer.text':       _rteVal('footerText', 'footerText'),
    };

    await apiRequest('PUT', '/api/admin/landing/config', payload);

    btn.textContent = 'Salvo! ✓';
    btn.style.background = '#065f46';
    setTimeout(() => {
      btn.textContent = 'Salvar tudo';
      btn.style.background = '#6366f1';
      btn.disabled = false;
    }, 2000);
  } catch (err) {
    saasToast('Erro ao salvar: ' + err.message, 'error');
    btn.textContent = 'Salvar tudo';
    btn.disabled = false;
  }
}

// ============================================================================
// PAINEL LATERAL DO USUÁRIO
// ============================================================================

let currentPanelOrgId = null;
let currentPanelTab = 'overview';

window.openOrgPanel = async (id, name, slug) => {
  currentPanelOrgId = id;
  currentPanelTab = 'overview';
  document.getElementById('panelOrgName').textContent = name;
  document.getElementById('panelOrgSlug').textContent = slug + '.cliquezoom.com.br';
  document.getElementById('orgPanel').classList.add('open');
  document.getElementById('orgPanelOverlay').classList.add('open');

  // Resetar nav
  document.querySelectorAll('.panel-nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector('.panel-nav-item[data-panel="overview"]').classList.add('active');

  await loadPanelTab('overview');
};

window.closeOrgPanel = () => {
  document.getElementById('orgPanel').classList.remove('open');
  document.getElementById('orgPanelOverlay').classList.remove('open');
  currentPanelOrgId = null;
};

window.switchPanelTab = async (el) => {
  const tab = el.dataset.panel;
  document.querySelectorAll('.panel-nav-item').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  currentPanelTab = tab;
  await loadPanelTab(tab);
};

async function loadPanelTab(tab) {
  const content = document.getElementById('panelContent');
  content.innerHTML = '<div class="loading">Carregando...</div>';

  try {
    if (tab === 'overview') await renderPanelOverview(content);
    else if (tab === 'meusite') await renderPanelMeuSite(content);
    else {
      content.innerHTML = `<div class="coming-soon"><span class="cs-icon">🚧</span><p>Em breve</p></div>`;
    }
  } catch (err) {
    content.innerHTML = `<div class="loading" style="color:#f87171;">Erro: ${err.message}</div>`;
  }
}

async function renderPanelOverview(content) {
  const data = await apiRequest('GET', `/api/admin/organizations/${currentPanelOrgId}/details`);
  const org = data.organization;
  const stats = data.stats;

  const planOptions = ['free', 'basic', 'pro'].map(p =>
    `<option value="${p}" ${org.plan === p ? 'selected' : ''}>${p.toUpperCase()}</option>`
  ).join('');

  const usersHtml = data.users.map(u => `
    <li><span>${esc(u.name)} <span style="color:#64748b;">(${esc(u.email)})</span></span>
    <span style="color:${u.approved ? '#34d399' : '#fbbf24'};">${u.approved ? 'Aprovado' : 'Pendente'}</span></li>
  `).join('') || '<li style="color:#64748b;">Nenhum usuário</li>';

  const sessionsHtml = data.recentSessions.slice(0, 5).map(s => `
    <li><span>${esc(s.name)}</span><span style="color:#64748b;">${s.photosCount} fotos</span></li>
  `).join('') || '<li style="color:#64748b;">Nenhuma sessão</li>';

  content.innerHTML = `
    <h3 style="font-size:0.875rem; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:1rem;">Visão Geral</h3>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1.25rem;">
      <div class="detail-card"><h4>Sessões</h4><div class="val">${stats.sessions}</div></div>
      <div class="detail-card"><h4>Fotos</h4><div class="val">${stats.photos}</div></div>
      <div class="detail-card"><h4>Storage</h4><div class="val">${stats.storageMB} MB</div></div>
      <div class="detail-card">
        <h4>Plano</h4>
        <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.25rem;">
          <select id="panelPlanSelect" style="background:#0f172a; color:#f1f5f9; border:1px solid #475569; border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.8125rem; cursor:pointer;">${planOptions}</select>
          <button id="panelSavePlan" style="background:#6366f1; color:white; border:none; border-radius:0.25rem; padding:0.25rem 0.625rem; font-size:0.75rem; font-weight:600; cursor:pointer;">Salvar</button>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3>Usuários</h3>
      <ul class="detail-list">${usersHtml}</ul>
    </div>
    <div class="detail-section">
      <h3>Sessões recentes</h3>
      <ul class="detail-list">${sessionsHtml}</ul>
    </div>
  `;

  content.querySelector('#panelSavePlan').onclick = async () => {
    const plan = content.querySelector('#panelPlanSelect').value;
    const btn = content.querySelector('#panelSavePlan');
    btn.textContent = '...';
    btn.disabled = true;
    try {
      await apiRequest('PUT', `/api/admin/organizations/${currentPanelOrgId}/plan`, { plan });
      saasToast('Plano atualizado!', 'success');
    } catch (err) {
      saasToast('Erro: ' + err.message, 'error');
    } finally {
      btn.textContent = 'Salvar';
      btn.disabled = false;
    }
  };
}

async function renderPanelMeuSite(content) {
  const sections = [
    { id: 'hero',        icon: '🖼️', label: 'Hero / Capa',   desc: 'Imagem, título e subtítulo do hero' },
    { id: 'portfolio',   icon: '📷', label: 'Portfólio',      desc: 'Fotos do portfólio' },
    { id: 'albuns',      icon: '📁', label: 'Álbuns',         desc: 'Álbuns de fotos' },
    { id: 'servicos',    icon: '💼', label: 'Serviços',       desc: 'Lista de serviços' },
    { id: 'estudio',     icon: '🏠', label: 'Estúdio',        desc: 'Info do estúdio e vídeo' },
    { id: 'depoimentos', icon: '⭐', label: 'Depoimentos',    desc: 'Depoimentos de clientes' },
    { id: 'contato',     icon: '📞', label: 'Contato',        desc: 'Título, texto e endereço' },
    { id: 'sobre',       icon: '👤', label: 'Sobre Mim',      desc: 'Texto e foto de perfil' },
    { id: 'faq',         icon: '❓', label: 'FAQ',            desc: 'Perguntas frequentes' },
    { id: 'secoes',      icon: '📋', label: 'Ordem das Seções', desc: 'Ordem e visibilidade' },
    { id: 'personalizar',icon: '🎨', label: 'Personalizar',   desc: 'Cores e fontes' },
  ];

  content.innerHTML = `
    <h3 style="font-size:0.875rem; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Meu Site — Resets</h3>
    <p style="font-size:0.75rem; color:#475569; margin-bottom:1rem;">Restaura os valores padrão de cada seção. <strong style="color:#fbbf24;">Ação irreversível.</strong></p>

    <div class="reset-grid">
      ${sections.map(s => `
        <div class="reset-item">
          <div class="reset-item-info">
            <span class="reset-item-icon">${s.icon}</span>
            <div>
              <div class="reset-item-label">${s.label}</div>
              <div class="reset-item-desc">${s.desc}</div>
            </div>
          </div>
          <button class="btn-reset" onclick="resetSiteSection('${currentPanelOrgId}', '${s.id}', '${s.label}')">Reset</button>
        </div>
      `).join('')}
    </div>

    <button class="btn-reset-all" onclick="resetSiteSection('${currentPanelOrgId}', 'all', 'Meu Site completo')">
      ⚠️ Reset Completo — Meu Site
    </button>
  `;
}

window.resetSiteSection = async (orgId, section, label) => {
  if (!orgId || orgId === 'null') { saasToast('Erro: organização não identificada', 'error'); return; }
  const ok = await saasConfirm(
    `Resetar "${label}"? Todos os dados desta seção serão apagados e voltarão ao padrão.`,
    { title: 'Confirmar Reset', confirmText: 'Resetar', danger: true }
  );
  if (!ok) return;

  try {
    await apiRequest('POST', `/api/admin/organizations/${orgId}/reset/site`, { section });
    saasToast(`"${label}" resetado com sucesso!`, 'success');
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

// ============================================================================
// UTILS
// ============================================================================

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

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
if (authToken) {
  fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: authToken })
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

// ============================================================================
// SEGURANÇA
// ============================================================================

async function loadSecurityLogs() {
  const tbody = document.getElementById('securityLogsTable');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="loading">Carregando logs...</td></tr>';
  
  try {
    const data = await apiRequest('GET', '/api/admin/saas/security-logs');
    if (!data.logs || data.logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">Nenhum log de bot detectado ainda.</td></tr>';
      return;
    }

    tbody.innerHTML = data.logs.map(log => {
      const date = new Date(log.createdAt).toLocaleString('pt-BR');
      return `
        <tr>
          <td style="white-space:nowrap;">${date}</td>
          <td>${esc(log.ip)}</td>
          <td>${esc(log.route)}</td>
          <td><span class="badge badge-inactive">${esc(log.event)}</span></td>
          <td style="font-size:0.65rem; color:var(--text-muted); max-width:300px; overflow:hidden; text-overflow:ellipsis;" title="${esc(log.userAgent)}">
            ${esc(log.userAgent)}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading" style="color:var(--red);">Erro ao carregar logs: ${err.message}</td></tr>`;
  }
}

window.loadSecurityLogs = loadSecurityLogs;

// ============================================================================
// TUTORIAIS (CliqueZoom Academy)
// ============================================================================

let allTutorials = [];

// Helper frontend para extrair ID do YouTube e atualizar preview
function extractYoutubeId(url) {
  if (!url) return '';
  url = url.trim();
  if (url.length === 11) return url;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

function updateVideoPreview(url) {
  const previewWrap = document.getElementById('videoPreviewWrap');
  const iframe = document.getElementById('videoPreviewIframe');
  const ytId = extractYoutubeId(url);

  if (ytId) {
    iframe.src = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`;
    previewWrap.style.display = 'block';
  } else {
    iframe.src = '';
    previewWrap.style.display = 'none';
  }
}
window.updateVideoPreview = updateVideoPreview;

async function loadTutorials() {
  const tbody = document.getElementById('tutorialsTable');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="loading">Carregando tutoriais...</td></tr>';

  try {
    const res = await apiRequest('GET', '/api/admin/tutorials');
    allTutorials = res.tutorials || [];

    if (allTutorials.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading">Nenhum tutorial cadastrado ainda. Crie um novo!</td></tr>';
      return;
    }

    const categoriesMap = {
      dashboard: 'Painel / Visão Geral',
      clientes: 'Clientes',
      sessoes: 'Sessões & Galerias',
      portfolio: 'Meu Site (Portfólio)',
      crm_financeiro: 'CRM & Financeiro'
    };

    tbody.innerHTML = allTutorials.map(t => {
      const activeClass = t.active ? 'badge-active' : 'badge-inactive';
      const activeText = t.active ? 'Ativo' : 'Inativo';
      const categoryText = categoriesMap[t.category] || t.category;

      return `
        <tr>
          <td style="font-weight:600; text-align:center;">${t.order || 0}</td>
          <td style="font-weight:600;">${esc(t.title)}</td>
          <td style="color:var(--text-secondary);">${categoryText}</td>
          <td><span style="font-size:0.75rem; background:var(--bg-elevated); padding:0.125rem 0.5rem; border-radius:4px; border:1px solid var(--border);">${t.level || 'Básico'}</span></td>
          <td>${esc(t.duration || '-')}</td>
          <td><span class="badge ${activeClass}">${activeText}</span></td>
          <td>
            <div class="btn-actions">
              <button class="btn btn-details" onclick="openEditTutorialModal('${t._id}')">Editar</button>
              <button class="btn btn-deactivate" onclick="deleteTutorial('${t._id}', '${esc(t.title)}')">Excluir</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="loading" style="color:var(--red);">Erro ao carregar tutoriais: ${err.message}</td></tr>`;
  }
}
window.loadTutorials = loadTutorials;

function openNewTutorialModal() {
  document.getElementById('tutorialForm').reset();
  document.getElementById('tutorialId').value = '';
  document.getElementById('tutorialModalTitle').textContent = 'Adicionar Novo Tutorial';
  document.getElementById('videoPreviewWrap').style.display = 'none';
  document.getElementById('videoPreviewIframe').src = '';
  document.getElementById('tutorialModal').classList.add('active');
}
window.openNewTutorialModal = openNewTutorialModal;

function openEditTutorialModal(id) {
  const t = allTutorials.find(item => item._id === id);
  if (!t) return;

  document.getElementById('tutorialModalTitle').textContent = 'Editar Tutorial';
  document.getElementById('tutorialId').value = t._id;
  document.getElementById('tutorialTitle').value = t.title;
  document.getElementById('tutorialDescription').value = t.description || '';
  document.getElementById('tutorialCategory').value = t.category;
  document.getElementById('tutorialLevel').value = t.level || 'Básico';
  document.getElementById('tutorialDuration').value = t.duration || '';
  document.getElementById('tutorialOrder').value = t.order || 0;
  document.getElementById('tutorialActive').checked = t.active;
  document.getElementById('tutorialVideoUrl').value = t.videoUrl;

  updateVideoPreview(t.videoUrl);
  document.getElementById('tutorialModal').classList.add('active');
}
window.openEditTutorialModal = openEditTutorialModal;

function closeTutorialModal() {
  document.getElementById('tutorialModal').classList.remove('active');
  document.getElementById('videoPreviewIframe').src = ''; // Parar o vídeo ao fechar
}
window.closeTutorialModal = closeTutorialModal;

async function saveTutorial(e) {
  e.preventDefault();
  const id = document.getElementById('tutorialId').value;
  const payload = {
    title: document.getElementById('tutorialTitle').value.trim(),
    description: document.getElementById('tutorialDescription').value.trim(),
    category: document.getElementById('tutorialCategory').value,
    level: document.getElementById('tutorialLevel').value,
    duration: document.getElementById('tutorialDuration').value.trim(),
    order: parseInt(document.getElementById('tutorialOrder').value) || 0,
    active: document.getElementById('tutorialActive').checked,
    videoUrl: document.getElementById('tutorialVideoUrl').value.trim()
  };

  const btn = document.getElementById('saveTutorialBtn');
  const originalText = btn.textContent;
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  try {
    if (id) {
      // Atualizar existente
      await apiRequest('PUT', `/api/admin/tutorials/${id}`, payload);
      saasToast('Tutorial atualizado com sucesso!', 'success');
    } else {
      // Criar novo
      await apiRequest('POST', '/api/admin/tutorials', payload);
      saasToast('Tutorial criado com sucesso!', 'success');
    }
    closeTutorialModal();
    await loadTutorials();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}
window.saveTutorial = saveTutorial;

async function deleteTutorial(id, title) {
  if (!await saasConfirm(`Deseja excluir definitivamente o tutorial "${title}"?`, { title: 'Excluir Tutorial', confirmText: 'Excluir', danger: true })) return;
  
  try {
    await apiRequest('DELETE', `/api/admin/tutorials/${id}`);
    saasToast('Tutorial excluído com sucesso!', 'success');
    await loadTutorials();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
}
window.deleteTutorial = deleteTutorial;

// Escapar HTML simples (helper)
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Fechar modal ao clicar fora
document.getElementById('tutorialModal').onclick = (e) => {
  if (e.target === document.getElementById('tutorialModal')) closeTutorialModal();
};


