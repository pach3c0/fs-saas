/**
 * Tab: CRM (motor de vendas automaticas)
 * Dashboard de cupons, gatilhos e KPIs do robo de escassez.
 */

import { apiGet, apiPost } from '../utils/api.js';
import { escapeHtml } from '../utils/helpers.js';

let dashboardData = null;

const TRIGGER_LABEL = {
  upsell_15d: '15 dias (pós-entrega)',
  upsell_7d: '7 dias (pós-entrega)',
  upsell_1d: '1 dia (pós-entrega)',
  // legados (escassez pré-entrega removida) — mantidos para registros antigos
  scarcity_15d: '15 dias',
  scarcity_7d: '7 dias',
  scarcity_3d: '3 dias',
  scarcity_24h: '24 horas',
  reactivation_90d: 'Reativação 90d',
  reactivation_30d: 'Reativação 30d',
  reactivation_7d: 'Reativação 7d'
};

function formatBRL(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function renderCrm(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <div style="display:flex; flex-direction:column; align-items:center; text-align:center; gap:0.25rem;">
        <h2 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin:0;">Vendas Automáticas</h2>
        <p style="color:var(--text-muted); font-size:0.875rem; margin:0; max-width:520px;">O robô monitora suas galerias e converte fotos esquecidas em receita.</p>
      </div>

      <div id="crmContent">
        <p style="color:var(--text-muted); text-align:center;">Carregando...</p>
      </div>
    </div>
  `;
  await carregar(container);
}

async function carregar(container) {
  try {
    const data = await apiGet('/api/sales/dashboard');
    dashboardData = data;
    render(container);
  } catch (error) {
    container.querySelector('#crmContent').innerHTML =
      `<p style="color:var(--red);">Erro ao carregar dashboard: ${error.message}</p>`;
  }
}

function render(container) {
  const root = container.querySelector('#crmContent');
  const cfg = dashboardData.integrations?.salesAutomator || {};
  const dl = dashboardData.integrations?.deadlineAutomation || {};
  const k = dashboardData.kpis || {};

  root.innerHTML = `
    <!-- Status do robô (configuração vive em Configurações › Escassês & Vendas) -->
    <div style="border:1px solid var(--border); border-radius:var(--r-card); padding:1.5rem; background:var(--bg-surface); margin-bottom:1.25rem; display:flex; flex-direction:column; align-items:center; text-align:center; gap:1rem;">
      <div>
        <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary); margin:0;">Lembrete &amp; Escassês de Vendas</h3>
        <p style="color:var(--text-muted); font-size:0.8125rem; margin:0.25rem auto 0; max-width:560px;">
          Lembra o cliente de selecionar (sem desconto) e vende as fotos que sobraram após a entrega. Tudo configurado em Configurações.
        </p>
      </div>
      <button onclick="window.switchTab('configuracoes'); return false;" class="header-expand-btn" title="Configurar" style="cursor:pointer;">
        <span class="header-expand-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
        </span>
        <span class="header-expand-label" style="font-weight:600;">Configurar</span>
      </button>
      <div style="display:flex; gap:0.75rem; flex-wrap:wrap; justify-content:center;">
        ${statusPill('Lembrete de seleção', dl.enabled)}
        ${statusPill('Escassês de vendas (pós-entrega)', cfg.postDelivery?.enabled)}
      </div>
    </div>

    <!-- KPIs -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:0.75rem; margin-bottom:1.25rem;">
      ${kpiCard('Sessões monitoradas', k.sessoesMonitoradas || 0, '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>')}
      ${kpiCard('Fotos pendentes', k.fotosPendentes || 0, '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>')}
      ${kpiCard('Receita potencial', formatBRL(k.receitaPotencial), '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>')}
      ${kpiCard('Gatilhos disparados', k.triggersDisparados || 0, '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>')}
      ${kpiCard('Cupons emitidos', k.cuponsEmitidos || 0, '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>')}
      ${kpiCard('Convertidos', k.cuponsConvertidos || 0, '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>')}
    </div>

    <!-- Lista de cupons -->
    <div style="border:1px solid var(--border); border-radius:var(--r-card); background:var(--bg-surface); padding:1.5rem;">
      <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary); margin:0 0 0.75rem; text-align:center;">Cupons emitidos</h3>
      ${renderCuponsList(dashboardData.cupons || [])}
    </div>
  `;

  setupHandlers(container);
}

function statusPill(label, on) {
  const color = on ? 'var(--green)' : 'var(--text-muted)';
  const txt = on ? 'Ativado' : 'Desativado';
  return `
    <div style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 0.875rem; border:1px solid var(--border); border-radius:var(--r-chip); background:var(--bg-base);">
      <span style="width:8px; height:8px; border-radius:var(--r-chip); background:${color};"></span>
      <span style="font-size:0.8125rem; color:var(--text-primary); font-weight:500;">${label}:</span>
      <span style="font-size:0.8125rem; color:${color}; font-weight:600;">${txt}</span>
    </div>
  `;
}

function kpiCard(label, value, icon) {
  return `
    <div style="border:1px solid var(--border); border-radius:var(--r-card); padding:1.25rem 1rem; background:var(--bg-surface); display:flex; flex-direction:column; align-items:center; text-align:center; gap:0.5rem;">
      <div style="width:38px; height:38px; border-radius:var(--r-field); background:var(--bg-elevated); border:1px solid var(--border); display:inline-flex; align-items:center; justify-content:center; color:var(--text-secondary);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
      </div>
      <div style="color:var(--text-muted); font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em;">${label}</div>
      <div style="color:var(--text-primary); font-size:1.5rem; font-weight:700;">${value}</div>
    </div>
  `;
}

function renderCuponsList(cupons) {
  if (cupons.length === 0) {
    return `<p style="color:var(--text-muted); font-size:0.875rem; margin:0; text-align:center;">Nenhum cupom foi emitido ainda. Assim que o robô disparar um gatilho com cupom, ele aparece aqui.</p>`;
  }

  return `
    <div style="display:flex; flex-direction:column; gap:0.5rem;">
      ${cupons.map(c => {
        const status = c.redeemed
          ? `<span class="badge badge-success">Convertido</span>`
          : `<span class="badge badge-neutral">Em aberto</span>`;
        const actionBtn = c.redeemed
          ? `<button class="btn btn-sm btn-ghost" data-coupon-action="unredeem" data-code="${escapeHtml(c.code)}">Desmarcar</button>`
          : `<button class="btn btn-sm btn-success" data-coupon-action="redeem" data-code="${escapeHtml(c.code)}">Marcar como usado</button>`;
        return `
          <div style="border:1px solid var(--border); border-radius:var(--r-field); padding:1rem; display:flex; flex-direction:column; align-items:center; text-align:center; gap:0.5rem;">
            <div style="display:flex; flex-direction:column; gap:0.2rem;">
              <span style="font-family:monospace; font-weight:700; color:var(--text-primary); letter-spacing:0.05em;">${escapeHtml(c.code)}</span>
              <span style="color:var(--text-muted); font-size:0.8125rem;">
                ${escapeHtml(c.sessionName)} · ${escapeHtml(TRIGGER_LABEL[c.trigger] || c.trigger)} · enviado em ${formatDateTime(c.sentAt)}
              </span>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; justify-content:center;">
              ${status}
              ${actionBtn}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function setupHandlers(container) {
  container.querySelectorAll('[data-coupon-action]').forEach(btn => {
    btn.onclick = async () => {
      const code = btn.dataset.code;
      const wantRedeemed = btn.dataset.couponAction === 'redeem';
      btn.disabled = true;
      try {
        await apiPost(`/api/sales/coupons/${encodeURIComponent(code)}/redeem`, { redeemed: wantRedeemed });
        window.showToast?.(wantRedeemed ? 'Cupom marcado como usado!' : 'Cupom voltou para "em aberto"', 'success');
        await carregar(container);
      } catch (error) {
        window.showToast?.('Erro: ' + error.message, 'error');
        btn.disabled = false;
      }
    };
  });

}
