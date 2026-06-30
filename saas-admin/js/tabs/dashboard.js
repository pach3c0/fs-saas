// Dashboard — métricas da plataforma, saúde das orgs e limites de planos
import { apiRequest, esc, formatSize } from '../core.js';
import { loadOrganizations } from './organizacoes.js';

// ============================================================================
// DASHBOARD
// ============================================================================

async function loadDashboard() {
  // loadReconcile() consulta o MP AO VIVO (mais lento) — roda em paralelo e preenche a
  // própria seção quando chega. O MRR projetado (loadMetrics) renderiza sem esperar o MP.
  await Promise.all([loadMetrics(), loadHealth(), loadOrganizations(), loadPlanLimitsConfig(), loadCostMargin(), loadReconcile()]);
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

// ============================================================================
// CUSTO & MARGEM — unit economics por organização
// ============================================================================

// Formata centavos → R$ (ex.: 3900 → "R$ 39,00")
function _brl(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function loadCostMargin() {
  const section = document.getElementById('costMarginSection');
  if (!section) return;
  try {
    const d = await apiRequest('GET', '/api/admin/saas/cost-margin');

    const totalMargem = d.totalMargemCents;
    const margemColor = totalMargem >= 0 ? '#34d399' : '#f87171';

    // Linhas por organização
    const linhas = (d.porOrg || []).map(o => {
      const mc = o.margemCents;
      const mc_color = mc >= 0 ? '#34d399' : '#f87171';
      const cortesiaTag = o.isCourtesy
        ? `<span style="font-size:0.6rem; background:rgba(251,191,36,0.15); color:#fbbf24; border-radius:4px; padding:0.1rem 0.4rem; margin-left:0.35rem; font-weight:600; vertical-align:middle;">cortesia</span>`
        : '';
      return `
        <tr>
          <td style="font-weight:600; color:var(--text-primary);">${esc(o.nome)} ${cortesiaTag}</td>
          <td style="color:var(--text-secondary); font-size:0.75rem; text-transform:uppercase;">${esc(o.plano)}</td>
          <td style="color:var(--text-secondary);">${_brl(o.receitaCents)}</td>
          <td style="color:var(--text-secondary);">${o.storageGB.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GB</td>
          <td style="color:var(--text-secondary);">${_brl(o.custoCents)}</td>
          <td style="font-weight:700; color:${mc_color};">${_brl(mc)}</td>
        </tr>`;
    }).join('');

    section.innerHTML = `
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem;">

        <!-- Cabeçalho com título e nota de honestidade -->
        <div style="margin-bottom:1rem;">
          <div style="display:flex; align-items:baseline; gap:0.75rem; flex-wrap:wrap;">
            <h3 style="font-size:0.9375rem; font-weight:600; color:var(--text-primary); margin:0;">
              Custo &amp; Margem
            </h3>
            <span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">
              Modelo de margem (unit economics) — não é fluxo de caixa real.
            </span>
          </div>
          <p style="margin:0.5rem 0 0; font-size:0.72rem; line-height:1.5; color:var(--text-muted); max-width:60rem;">
            Storage hoje é <strong style="color:var(--text-secondary);">disco LOCAL fixo do VPS</strong>
            (custo em degrau ao expandir, não cobrança por GB).
            A taxa <strong style="color:var(--text-secondary);">R$/GB (~R$&nbsp;0,06–0,07, referência Object Storage Contabo)</strong>
            é só para planejamento e comparação — não é saída de caixa.
            Cortesia aparece como margem negativa = custo da cortesia.
          </p>
        </div>

        <!-- Totalizadores -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:0.75rem; margin-bottom:1.25rem;">
          <div style="background:var(--bg-elevated); border-radius:0.375rem; padding:0.875rem;">
            <div style="font-size:0.6875rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Receita (subs ativas)</div>
            <div style="font-size:1.375rem; font-weight:700; color:#34d399;">${_brl(d.totalReceitaCents)}</div>
            <div style="font-size:0.625rem; color:var(--text-muted); margin-top:0.125rem;">exclui cortesia</div>
          </div>
          <div style="background:var(--bg-elevated); border-radius:0.375rem; padding:0.875rem;">
            <div style="font-size:0.6875rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Custo estimado</div>
            <div style="font-size:1.375rem; font-weight:700; color:#f87171;">${_brl(d.totalCustoCents)}</div>
            <div style="font-size:0.625rem; color:var(--text-muted); margin-top:0.125rem;">R$${d.taxaGBMes?.toFixed(2)}/GB/mês</div>
          </div>
          <div style="background:var(--bg-elevated); border-radius:0.375rem; padding:0.875rem;">
            <div style="font-size:0.6875rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Margem estimada</div>
            <div style="font-size:1.375rem; font-weight:700; color:${margemColor};">${_brl(totalMargem)}</div>
            <div style="font-size:0.625rem; color:var(--text-muted); margin-top:0.125rem;">receita − custo storage</div>
          </div>
        </div>

        <!-- Tabela por org -->
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:0.8125rem;">
            <thead>
              <tr>
                <th style="text-align:left; padding:0.5rem 0.75rem; font-size:0.6875rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid var(--border); background:var(--bg-elevated);">Organização</th>
                <th style="text-align:left; padding:0.5rem 0.75rem; font-size:0.6875rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid var(--border); background:var(--bg-elevated);">Plano</th>
                <th style="text-align:left; padding:0.5rem 0.75rem; font-size:0.6875rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid var(--border); background:var(--bg-elevated);">Receita/mês</th>
                <th style="text-align:left; padding:0.5rem 0.75rem; font-size:0.6875rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid var(--border); background:var(--bg-elevated);">Storage</th>
                <th style="text-align:left; padding:0.5rem 0.75rem; font-size:0.6875rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid var(--border); background:var(--bg-elevated);">Custo est.</th>
                <th style="text-align:left; padding:0.5rem 0.75rem; font-size:0.6875rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid var(--border); background:var(--bg-elevated);">Margem est.</th>
              </tr>
            </thead>
            <tbody id="costMarginTable">${linhas}</tbody>
          </table>
        </div>

      </div>`;
  } catch (err) {
    section.innerHTML = `<div style="color:#f87171; font-size:0.8rem;">Erro ao carregar custo &amp; margem: ${esc(err.message)}</div>`;
  }
}

// ============================================================================
// CONCILIAÇÃO MERCADO PAGO — projeção (nossos registros) × recorrente no MP (ao vivo)
// ============================================================================
//
// O MRR do topo é PROJEÇÃO nossa (o que cada org deveria pagar, do banco). Aqui mostramos,
// lado a lado, o valor recorrente que o Mercado Pago TEM EM FICHA por assinatura (ao vivo,
// read-only) e sinalizamos divergências. "Caixa recebido de fato" é Fase 2 (livro-caixa).

const _RECON_TH = 'text-align:left; padding:0.5rem 0.75rem; font-size:0.6875rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid var(--border); background:var(--bg-elevated);';

// Cria o container 1x logo após Custo & Margem, sem mexer no HTML do index.
function _ensureReconcileSection() {
  let section = document.getElementById('reconcileSection');
  if (section) return section;
  section = document.createElement('div');
  section.id = 'reconcileSection';
  section.style.margin = '1.5rem 0';
  const anchor = document.getElementById('costMarginSection');
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(section, anchor.nextSibling);
  else document.getElementById('metricsGrid')?.parentNode?.appendChild(section);
  return section;
}

const _RECON_FLAG = {
  status_mismatch: { txt: 'MP não cobra',     color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  amount_mismatch: { txt: 'valor divergente', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  outside_mp:      { txt: 'fora do MP',        color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  mp_error:        { txt: 'erro ao consultar', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

function _reconFlagBadges(flags) {
  return (flags || []).map(f => {
    const m = _RECON_FLAG[f]; if (!m) return '';
    return `<span style="font-size:0.6rem; background:${m.bg}; color:${m.color}; border-radius:4px; padding:0.1rem 0.4rem; margin-left:0.3rem; font-weight:600; white-space:nowrap;">${m.txt}</span>`;
  }).join('');
}

// Ordena: divergências primeiro (pra saltar aos olhos), depois fora do MP, depois OK.
function _reconRank(r) {
  const f = r.flags || [];
  if (f.includes('mp_error')) return 0;
  if (f.includes('status_mismatch')) return 1;
  if (f.includes('amount_mismatch')) return 2;
  if (f.includes('outside_mp')) return 3;
  return 4;
}

async function loadReconcile() {
  const section = _ensureReconcileSection();
  section.innerHTML = `<div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem; color:var(--text-muted); font-size:0.8rem;">Conciliando com o Mercado Pago ao vivo…</div>`;
  try {
    const d = await apiRequest('GET', '/api/admin/saas/metrics/reconcile');

    // MP não configurado (ex.: dev sem token): aviso amigável, nunca erro.
    if (!d.mpConfigured) {
      section.innerHTML = `
        <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem;">
          <h3 style="font-size:0.9375rem; font-weight:600; color:var(--text-primary); margin:0 0 0.5rem;">Conciliação Mercado Pago</h3>
          <p style="margin:0; font-size:0.78rem; color:var(--text-muted);">Mercado Pago não configurado neste ambiente — sem token para consultar. O MRR acima segue valendo como projeção dos nossos registros.</p>
        </div>`;
      return;
    }

    const hora = new Date(d.reconciledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const deltaColor = d.deltaCents >= 0 ? '#34d399' : '#f87171';
    const deltaSign = d.deltaCents > 0 ? '+' : '';
    const divergencias = (d.counts?.statusMismatch || 0) + (d.counts?.amountMismatch || 0);

    const linhas = (d.rows || []).slice().sort((a, b) => _reconRank(a) - _reconRank(b)).map(r => {
      const mpCol = r.outsideMp ? '<span style="color:var(--text-muted);">—</span>'
        : (r.mpError ? '<span style="color:#f87171;">erro</span>'
        : _brl(r.mpAmountCents));
      const statusCol = r.outsideMp ? '<span style="color:var(--text-muted);">fora do MP</span>'
        : (r.mpError ? '<span style="color:#f87171;">indisponível</span>'
        : `<span style="color:${r.mpHealthy ? '#34d399' : '#fbbf24'};">${esc(r.mpStatusLabel || r.mpStatus || '')}</span>`);
      return `
        <tr>
          <td style="padding:0.5rem 0.75rem; font-weight:600; color:var(--text-primary);">${esc(r.orgName)}${_reconFlagBadges(r.flags)}</td>
          <td style="padding:0.5rem 0.75rem; color:var(--text-secondary); text-transform:uppercase; font-size:0.72rem;">${esc(r.plan || '')}</td>
          <td style="padding:0.5rem 0.75rem; color:var(--text-secondary);">${_brl(r.projectedCents)}</td>
          <td style="padding:0.5rem 0.75rem; color:var(--text-secondary);">${mpCol}</td>
          <td style="padding:0.5rem 0.75rem;">${statusCol}</td>
        </tr>`;
    }).join('');

    section.innerHTML = `
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem;">

        <div style="margin-bottom:1rem;">
          <div style="display:flex; align-items:baseline; gap:0.75rem; flex-wrap:wrap;">
            <h3 style="font-size:0.9375rem; font-weight:600; color:var(--text-primary); margin:0;">Conciliação Mercado Pago</h3>
            <span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">ao vivo · conciliado às ${hora}</span>
          </div>
          <p style="margin:0.5rem 0 0; font-size:0.72rem; line-height:1.5; color:var(--text-muted); max-width:60rem;">
            <strong style="color:var(--text-secondary);">Projeção</strong> = o que os nossos registros dizem que cada org deveria pagar (igual ao MRR do topo).
            <strong style="color:var(--text-secondary);">Recorrente no MP</strong> = o valor que o Mercado Pago TEM EM FICHA por assinatura, agora.
            Divergências aparecem destacadas. <strong style="color:var(--text-secondary);">Caixa recebido</strong> (dinheiro que de fato caiu) vem na Fase 2.
          </p>
        </div>

        <!-- Totalizadores: projeção × MP recorrente × Δ × (caixa recebido reservado p/ Fase 2) -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:0.75rem; margin-bottom:1.25rem;">
          <div style="background:var(--bg-elevated); border-radius:0.375rem; padding:0.875rem;">
            <div style="font-size:0.6875rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Projeção (nossos registros)</div>
            <div style="font-size:1.375rem; font-weight:700; color:#34d399;">${_brl(d.projectedMrrCents)}</div>
            <div style="font-size:0.625rem; color:var(--text-muted); margin-top:0.125rem;">${d.counts?.total || 0} assinatura(s) paga(s)</div>
          </div>
          <div style="background:var(--bg-elevated); border-radius:0.375rem; padding:0.875rem;">
            <div style="font-size:0.6875rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Recorrente no MP</div>
            <div style="font-size:1.375rem; font-weight:700; color:#60a5fa;">${_brl(d.mpRecurringMrrCents)}</div>
            <div style="font-size:0.625rem; color:var(--text-muted); margin-top:0.125rem;">só assinaturas ativas no MP</div>
          </div>
          <div style="background:var(--bg-elevated); border-radius:0.375rem; padding:0.875rem;">
            <div style="font-size:0.6875rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Δ (MP − projeção)</div>
            <div style="font-size:1.375rem; font-weight:700; color:${deltaColor};">${deltaSign}${_brl(d.deltaCents)}</div>
            <div style="font-size:0.625rem; color:var(--text-muted); margin-top:0.125rem;">${divergencias} divergência(s)</div>
          </div>
          <div style="background:var(--bg-elevated); border-radius:0.375rem; padding:0.875rem; opacity:0.6;">
            <div style="font-size:0.6875rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Caixa recebido</div>
            <div style="font-size:1.375rem; font-weight:700; color:var(--text-muted);">—</div>
            <div style="font-size:0.625rem; color:var(--text-muted); margin-top:0.125rem;">Fase 2 (livro-caixa)</div>
          </div>
        </div>

        <!-- Tabela por org -->
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:0.8125rem;">
            <thead>
              <tr>
                <th style="${_RECON_TH}">Organização</th>
                <th style="${_RECON_TH}">Plano</th>
                <th style="${_RECON_TH}">Projeção</th>
                <th style="${_RECON_TH}">MP (recorrente)</th>
                <th style="${_RECON_TH}">Status no MP</th>
              </tr>
            </thead>
            <tbody>${linhas || `<tr><td colspan="5" style="padding:0.75rem; color:var(--text-muted);">Nenhuma assinatura paga ativa.</td></tr>`}</tbody>
          </table>
        </div>

      </div>`;
  } catch (err) {
    section.innerHTML = `<div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem; color:#f87171; font-size:0.8rem;">Erro ao conciliar com o Mercado Pago: ${esc(err.message)}</div>`;
  }
}

export { loadDashboard, loadMetrics };
