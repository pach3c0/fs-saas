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
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
        <div>
          <h2 style="font-size:1.5rem; font-weight:bold; color:var(--text-primary); margin:0;">Vendas Automáticas</h2>
          <p style="color:var(--text-muted); font-size:0.875rem; margin:0.25rem 0 0;">O robô monitora suas galerias e converte fotos esquecidas em receita.</p>
        </div>
      </div>

      <div id="crmContent">
        <p style="color:var(--text-muted);">Carregando...</p>
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
    <div style="border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem; background:var(--bg-surface); margin-bottom:1.25rem;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
        <div>
          <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary); margin:0;">Lembrete & Escassês de Vendas</h3>
          <p style="color:var(--text-muted); font-size:0.8125rem; margin:0.25rem 0 0;">
            Lembra o cliente de selecionar (sem desconto) e vende as fotos que sobraram após a entrega. Tudo configurado em Configurações.
          </p>
        </div>
        <a href="#" onclick="window.switchTab('configuracoes'); return false;" class="btn btn-primary" style="text-decoration:none; white-space:nowrap;">Configurar</a>
      </div>
      <div style="display:flex; gap:0.75rem; margin-top:1rem; flex-wrap:wrap;">
        ${statusPill('Lembrete de seleção', dl.enabled)}
        ${statusPill('Escassês de vendas (pós-entrega)', cfg.postDelivery?.enabled)}
      </div>
    </div>

    <!-- KPIs -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:0.75rem; margin-bottom:1.25rem;">
      ${kpiCard('📁 Sessões monitoradas', k.sessoesMonitoradas || 0)}
      ${kpiCard('🖼️ Fotos pendentes', k.fotosPendentes || 0)}
      ${kpiCard('💰 Receita potencial', formatBRL(k.receitaPotencial))}
      ${kpiCard('📧 Gatilhos disparados', k.triggersDisparados || 0)}
      ${kpiCard('🎟️ Cupons emitidos', k.cuponsEmitidos || 0)}
      ${kpiCard('✅ Convertidos', k.cuponsConvertidos || 0)}
    </div>

    <!-- Lista de cupons -->
    <div style="border:1px solid var(--border); border-radius:0.5rem; background:var(--bg-surface); padding:1.25rem;">
      <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary); margin:0 0 0.75rem;">Cupons emitidos</h3>
      ${renderCuponsList(dashboardData.cupons || [])}
    </div>
  `;

  setupHandlers(container);
}

function statusPill(label, on) {
  const color = on ? 'var(--green)' : 'var(--text-muted)';
  const txt = on ? 'Ativado' : 'Desativado';
  return `
    <div style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 0.875rem; border:1px solid var(--border); border-radius:9999px; background:var(--bg-base);">
      <span style="width:8px; height:8px; border-radius:9999px; background:${color};"></span>
      <span style="font-size:0.8125rem; color:var(--text-primary); font-weight:500;">${label}:</span>
      <span style="font-size:0.8125rem; color:${color}; font-weight:600;">${txt}</span>
    </div>
  `;
}

function kpiCard(label, value) {
  return `
    <div style="border:1px solid var(--border); border-radius:0.5rem; padding:1rem; background:var(--bg-surface);">
      <div style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em;">${label}</div>
      <div style="color:var(--text-primary); font-size:1.5rem; font-weight:700; margin-top:0.25rem;">${value}</div>
    </div>
  `;
}

function renderCuponsList(cupons) {
  if (cupons.length === 0) {
    return `<p style="color:var(--text-muted); font-size:0.875rem; margin:0;">Nenhum cupom foi emitido ainda. Assim que o robô disparar um gatilho com cupom, ele aparece aqui.</p>`;
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
          <div style="border:1px solid var(--border); border-radius:0.375rem; padding:0.75rem 1rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
            <div style="display:flex; flex-direction:column; gap:0.2rem; min-width:0;">
              <span style="font-family:monospace; font-weight:700; color:var(--text-primary); letter-spacing:0.05em;">${escapeHtml(c.code)}</span>
              <span style="color:var(--text-muted); font-size:0.8125rem;">
                ${escapeHtml(c.sessionName)} · ${escapeHtml(TRIGGER_LABEL[c.trigger] || c.trigger)} · enviado em ${formatDateTime(c.sentAt)}
              </span>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
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
