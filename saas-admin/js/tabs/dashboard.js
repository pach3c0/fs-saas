// Dashboard — métricas da plataforma, saúde das orgs e limites de planos
import { apiRequest, esc, formatSize } from '../core.js';
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
    // Erros 24h em paralelo com a saúde (limit 1: só queremos os contadores)
    const [data, errData] = await Promise.all([
      apiRequest('GET', '/api/admin/saas/health'),
      apiRequest('GET', '/api/admin/saas/errors?hours=24&limit=1').catch(() => null)
    ]);
    const errors24h = errData?.counters?.errors24h ?? null;

    // Card 1 — Suporte & atividade
    const supportHtml = `
      <div style="display:flex; flex-direction:column; gap:0.6rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="switchTab('tickets')">
          <span style="color:var(--text-secondary); font-size:0.85rem;">Chamados abertos</span>
          <span style="font-size:1.25rem; font-weight:700; color:${data.openTickets > 0 ? '#fbbf24' : 'var(--text-primary)'};">${data.openTickets}</span>
        </div>
        ${errors24h !== null ? `
        <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="switchTab('eventos')">
          <span style="color:var(--text-secondary); font-size:0.85rem;">Erros (24h)</span>
          <span style="font-size:1.25rem; font-weight:700; color:${errors24h > 0 ? '#f87171' : '#34d399'};">${errors24h}</span>
        </div>` : ''}
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
    // Somente leitura: os números dos planos são editados em CÓDIGO (src/models/plans.js).
    // O endpoint só faz GET — o antigo editor por arquivo (PUT) foi aposentado na
    // unificação da fonte única, então aqui apenas exibimos os 4 tiers, sem inputs/Salvar.
    const plans = ['free', 'basic', 'pro', 'studio'];
    const fmt = (v) => v === -1 ? '∞' : v;
    const rows = [
      ['Storage', (l) => l.maxStorage === -1 ? '∞' : `${(l.maxStorage / 1024).toLocaleString('pt-BR')} GB`],
      ['Sessões', (l) => fmt(l.maxSessions)],
      ['Fotos', (l) => fmt(l.maxPhotos)],
      ['Álbuns', (l) => fmt(l.maxAlbums)],
      ['Domínio próprio', (l) => l.customDomain ? 'Sim' : '—'],
    ];

    grid.innerHTML = plans.filter(p => limits[p]).map(plan => `
      <div style="background:#0f172a; border:1px solid #334155; border-radius:0.375rem; padding:0.875rem;">
        <div style="font-size:0.75rem; font-weight:700; color:#93c5fd; text-transform:uppercase; margin-bottom:0.625rem;">${plan}</div>
        ${rows.map(([label, get]) => `
          <div style="display:flex; justify-content:space-between; gap:0.5rem; font-size:0.75rem; color:#94a3b8; margin-bottom:0.4rem;">
            <span>${label}</span>
            <span style="color:#f1f5f9; font-weight:600;">${get(limits[plan])}</span>
          </div>
        `).join('')}
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<div style="color:#f87171; font-size:0.8rem;">Erro ao carregar limites: ${err.message}</div>`;
  }
}

async function loadMetrics() {
  try {
    const data = await apiRequest('GET', '/api/admin/saas/metrics');

    // MRR: usa o valor REAL do backend (soma de effectiveMonthlyCents das assinaturas
    // ativas — respeita preço personalizado + adicional de storage). Fallback p/ a
    // estimativa por contagem × preço de catálogo (R$) só se um backend antigo não enviar
    // mrrCents. Preços de catálogo derivados da fonte única (plans.js): 39/119/249.
    const PLAN_PRICES = { free: 0, basic: 39, pro: 119, studio: 249 };
    const byPlan = data.organizations.byPlan || {};
    const mrr = (data.mrrCents != null)
      ? data.mrrCents / 100
      : Object.entries(byPlan).reduce((sum, [plan, count]) => sum + (PLAN_PRICES[plan] || 0) * count, 0);
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
        <div class="metric-sub">${data.mrrCents != null ? 'assinaturas ativas (preço real)' : 'estimativa por plano'}</div>
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
