// Dashboard — métricas da plataforma, saúde das orgs e limites de planos
import { apiRequest, saasToast, esc, formatSize } from '../core.js';
import { loadOrganizations } from './organizacoes.js';

// ============================================================================
// DASHBOARD
// ============================================================================

async function loadDashboard() {
  await Promise.all([loadMetrics(), loadHealth(), loadOrganizations(), loadPlanLimitsConfig()]);
}

// ============================================================================
// SAÚDE DA PLATAFORMA — orgs em risco, suporte, cadastros recentes
// ============================================================================

const HEALTH_DOT = { green: '#34d399', yellow: '#fbbf24', red: '#f87171' };
const HEALTH_LABEL = { green: 'Ativa', yellow: 'Inativa 14d+', red: 'Inativa 30d+' };

function _healthCard(title, bodyHtml) {
  return `
    <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1rem;">
      <div style="font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.75rem;">${title}</div>
      ${bodyHtml}
    </div>`;
}

async function loadHealth() {
  const section = document.getElementById('healthSection');
  if (!section) return;
  try {
    const data = await apiRequest('GET', '/api/admin/saas/health');

    // Card 1 — Suporte & atividade
    const supportHtml = `
      <div style="display:flex; flex-direction:column; gap:0.6rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="switchTab('tickets')">
          <span style="color:var(--text-secondary); font-size:0.85rem;">Chamados abertos</span>
          <span style="font-size:1.25rem; font-weight:700; color:${data.openTickets > 0 ? '#fbbf24' : 'var(--text-primary)'};">${data.openTickets}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:var(--text-secondary); font-size:0.85rem;">Sessões criadas (7 dias)</span>
          <span style="font-size:1.25rem; font-weight:700; color:var(--text-primary);">${data.sessionsLast7d}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:var(--text-secondary); font-size:0.85rem;">Orgs em risco</span>
          <span style="font-size:1.25rem; font-weight:700; color:${data.atRisk > 0 ? '#f87171' : '#34d399'};">${data.atRisk}</span>
        </div>
      </div>`;

    // Card 2 — Saúde por org (piores primeiro)
    const orgsHtml = (data.orgsHealth || []).slice(0, 6).map(o => `
      <li style="display:flex; justify-content:space-between; align-items:center; padding:0.35rem 0; border-bottom:1px solid var(--border); font-size:0.85rem;">
        <span style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;" onclick="openOrgPanel('${o._id}', '${esc(o.name)}', '${esc(o.slug)}')">
          <span style="width:8px; height:8px; border-radius:50%; background:${HEALTH_DOT[o.health]}; flex-shrink:0;"></span>
          <span style="font-weight:600; color:var(--text-primary);">${esc(o.name)}</span>
          <span style="color:var(--text-muted); font-size:0.7rem; text-transform:uppercase;">${o.plan}</span>
        </span>
        <span style="color:var(--text-muted); font-size:0.75rem;" title="${HEALTH_LABEL[o.health]}">${o.idleDays === 0 ? 'hoje' : `${o.idleDays}d atrás`}</span>
      </li>`).join('') || '<li style="color:var(--text-muted); font-size:0.8rem;">Nenhuma org ativa</li>';

    // Card 3 — Últimos cadastros
    const recentHtml = (data.recentOrgs || []).map(o => `
      <li style="display:flex; justify-content:space-between; align-items:center; padding:0.35rem 0; border-bottom:1px solid var(--border); font-size:0.85rem;">
        <span>
          <span style="font-weight:600; color:var(--text-primary);">${esc(o.name)}</span>
          <span style="color:${o.isActive ? '#34d399' : '#fbbf24'}; font-size:0.7rem; margin-left:0.4rem;">${o.isActive ? 'ativa' : 'pendente'}</span>
        </span>
        <span style="color:var(--text-muted); font-size:0.75rem;">${new Date(o.createdAt).toLocaleDateString('pt-BR')}</span>
      </li>`).join('') || '<li style="color:var(--text-muted); font-size:0.8rem;">Nenhum cadastro</li>';

    section.innerHTML =
      _healthCard('Operação', supportHtml) +
      _healthCard('Saúde das organizações', `<ul style="list-style:none; margin:0; padding:0;">${orgsHtml}</ul>`) +
      _healthCard('Últimos cadastros', `<ul style="list-style:none; margin:0; padding:0;">${recentHtml}</ul>`);
  } catch (err) {
    section.innerHTML = `<div style="color:#f87171; font-size:0.8rem;">Erro ao carregar saúde: ${err.message}</div>`;
  }
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

export { loadDashboard, loadMetrics };
