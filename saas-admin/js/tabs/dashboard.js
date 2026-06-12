// Dashboard — métricas da plataforma e limites de planos
import { apiRequest, saasToast, formatSize } from '../core.js';
import { loadOrganizations } from './organizacoes.js';

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

export { loadDashboard, loadMetrics };
