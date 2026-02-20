/**
 * SaaS Admin Panel - FS Fotografias
 * Painel de gerenciamento de organizações (superadmin only)
 */

let authToken = localStorage.getItem('saas_token') || '';
let userEmail = localStorage.getItem('saas_email') || '';

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
  await Promise.all([loadMetrics(), loadOrganizations()]);
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
        <div class="metric-label">Newsletter</div>
        <div class="metric-value">${data.newsletterSubs}</div>
      </div>
    `;
  } catch (err) {
    document.getElementById('metricsGrid').innerHTML = `<div class="loading" style="color:#f87171;">Erro: ${err.message}</div>`;
  }
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
            <button class="btn btn-details" onclick="showDetails('${org._id}')">Detalhes</button>
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
  if (!confirm(`Aprovar a organizacao "${name}"?`)) return;
  try {
    await apiRequest('PUT', `/api/admin/organizations/${id}/approve`);
    await loadDashboard();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};

window.deactivateOrg = async (id, name) => {
  if (!confirm(`Desativar a organizacao "${name}"? O site dela ficara offline.`)) return;
  try {
    await apiRequest('PUT', `/api/admin/organizations/${id}/deactivate`);
    await loadDashboard();
  } catch (err) {
    alert('Erro: ' + err.message);
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
          <div class="val" style="font-size:1rem;">${esc(org.slug)}.fsfotografias.com.br</div>
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
        </div>
        <div class="detail-card">
          <h4>Newsletter</h4>
          <div class="val">${stats.newsletterSubs}</div>
        </div>
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
        alert('Erro: ' + err.message);
        btn.textContent = 'Salvar';
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

  if (tab === 'trash') {
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
    document.getElementById('tabTrash').classList.add('active');
    loadTrash();
  } else if (tab === 'landing') {
    document.querySelectorAll('.tab-btn')[2].classList.add('active');
    document.getElementById('tabLanding').classList.add('active');
    loadLandingEditor();
  } else {
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
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
  if (!confirm(`Mover "${name}" para a lixeira?`)) return;
  try {
    await apiRequest('PUT', `/api/admin/organizations/${id}/trash`);
    await loadDashboard();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};

window.restoreOrg = async (id, name) => {
  if (!confirm(`Restaurar "${name}"? A organizacao ficara ativa novamente.`)) return;
  try {
    await apiRequest('PUT', `/api/admin/organizations/${id}/restore`);
    await loadTrash();
    await loadDashboard();
  } catch (err) {
    alert('Erro: ' + err.message);
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
    closeConfirmDelete();
    await loadTrash();
    await loadMetrics();
  } catch (err) {
    alert('Erro: ' + err.message);
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
    <div id="testimonialRow${i}" style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1rem; display:grid; grid-template-columns:2fr 1fr 1fr auto auto; gap:0.5rem; align-items:center;">
      <input type="text" value="${esc(t.text)}" id="testimonText${i}" style="${inputStyle()} width:100%;" placeholder="Texto do depoimento">
      <input type="text" value="${esc(t.author)}" id="testimonAuthor${i}" style="${inputStyle()} width:100%;" placeholder="Nome">
      <input type="text" value="${esc(t.role)}" id="testimonRole${i}" style="${inputStyle()} width:100%;" placeholder="Funcao">
      <label style="display:flex; align-items:center; gap:0.25rem; font-size:0.75rem; color:#94a3b8; cursor:pointer;">
        <input type="checkbox" id="testimonActive${i}" ${t.active !== false ? 'checked' : ''}> Ativo
      </label>
      <button onclick="removeTestimonial(${i})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.125rem; padding:0.25rem;" title="Remover">×</button>
    </div>
  `;
}

function renderFaqRow(f, i) {
  return `
    <div id="faqRow${i}" style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1rem; display:grid; grid-template-columns:2fr 2fr auto auto; gap:0.5rem; align-items:center;">
      <input type="text" value="${esc(f.question)}" id="faqQ${i}" style="${inputStyle()} width:100%;" placeholder="Pergunta">
      <input type="text" value="${esc(f.answer)}" id="faqA${i}" style="${inputStyle()} width:100%;" placeholder="Resposta">
      <label style="display:flex; align-items:center; gap:0.25rem; font-size:0.75rem; color:#94a3b8; cursor:pointer;">
        <input type="checkbox" id="faqActive${i}" ${f.active !== false ? 'checked' : ''}> Ativo
      </label>
      <button onclick="removeFaq(${i})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.125rem; padding:0.25rem;" title="Remover">×</button>
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

async function saveLanding() {
  const btn = document.getElementById('saveLandingBtn');
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  try {
    const d = landingData;
    const steps = d.howItWorks.steps.map((_, i) => ({
      icon: document.getElementById(`stepIcon${i}`)?.value || '',
      title: document.getElementById(`stepTitle${i}`)?.value || '',
      description: document.getElementById(`stepDesc${i}`)?.value || ''
    }));

    const features = d.features.items.map((_, i) => ({
      icon: document.getElementById(`featIcon${i}`)?.value || '',
      title: document.getElementById(`featTitle${i}`)?.value || '',
      description: document.getElementById(`featDesc${i}`)?.value || '',
      active: document.getElementById(`featActive${i}`)?.checked !== false
    }));

    const plans = d.plans.items.map((_, i) => ({
      name: document.getElementById(`planName${i}`)?.value || '',
      price: document.getElementById(`planPrice${i}`)?.value || '',
      period: document.getElementById(`planPeriod${i}`)?.value || '',
      description: document.getElementById(`planDesc${i}`)?.value || '',
      highlighted: document.getElementById(`planHL${i}`)?.checked || false,
      features: (document.getElementById(`planFeatures${i}`)?.value || '').split('\n').filter(f => f.trim())
    }));

    const testimonials = d.testimonials.items.map((_, i) => ({
      text: document.getElementById(`testimonText${i}`)?.value || '',
      author: document.getElementById(`testimonAuthor${i}`)?.value || '',
      role: document.getElementById(`testimonRole${i}`)?.value || '',
      active: document.getElementById(`testimonActive${i}`)?.checked !== false
    }));

    const faqs = d.faq.items.map((_, i) => ({
      question: document.getElementById(`faqQ${i}`)?.value || '',
      answer: document.getElementById(`faqA${i}`)?.value || '',
      active: document.getElementById(`faqActive${i}`)?.checked !== false
    }));

    const payload = {
      'hero.headline': document.getElementById('heroHeadline')?.value || '',
      'hero.subheadline': document.getElementById('heroSubheadline')?.value || '',
      'hero.ctaText': document.getElementById('heroCtaText')?.value || '',
      'hero.ctaSubtext': document.getElementById('heroCtaSubtext')?.value || '',
      'howItWorks.title': document.getElementById('howTitle')?.value || '',
      'howItWorks.steps': steps,
      'features.title': document.getElementById('featuresSectionTitle')?.value || d.features.title,
      'features.items': features,
      'plans.title': document.getElementById('plansTitle')?.value || '',
      'plans.subtitle': document.getElementById('plansSub')?.value || '',
      'plans.items': plans,
      'testimonials.title': document.getElementById('testimonTitle')?.value || '',
      'testimonials.items': testimonials,
      'faq.title': document.getElementById('faqTitle')?.value || '',
      'faq.items': faqs,
      'cta.title': document.getElementById('ctaTitle')?.value || '',
      'cta.subtitle': document.getElementById('ctaSub')?.value || '',
      'cta.buttonText': document.getElementById('ctaBtn')?.value || '',
      'footer.text': document.getElementById('footerText')?.value || ''
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
    alert('Erro ao salvar: ' + err.message);
    btn.textContent = 'Salvar tudo';
    btn.disabled = false;
  }
}

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
