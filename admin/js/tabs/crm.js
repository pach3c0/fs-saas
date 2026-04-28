/**
 * Tab: CRM (motor de vendas automaticas)
 * Dashboard de cupons, gatilhos e KPIs do robo de escassez.
 */

import { apiGet, apiPut } from '../utils/api.js';
import { escapeHtml } from '../utils/helpers.js';

let dashboardData = null;

const TRIGGER_LABEL = {
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
          <h2 style="font-size:1.5rem; font-weight:bold; color:var(--text-primary); margin:0;">CRM — Vendas Automáticas</h2>
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
  const k = dashboardData.kpis || {};

  root.innerHTML = `
    <!-- Toggle global -->
    <div style="border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem; background:var(--bg-surface); margin-bottom:1.25rem;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
        <div>
          <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary); margin:0;">Robô de Escassez</h3>
          <p style="color:var(--text-muted); font-size:0.8125rem; margin:0.25rem 0 0;">
            Quando ativo, dispara e-mails de urgência (15/7/3/1 dias antes do prazo) para clientes com fotos não selecionadas.
          </p>
        </div>
        <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
          <input type="checkbox" id="crmEnabled" class="check" ${cfg.enabled ? 'checked' : ''}>
          <span style="color:var(--text-primary); font-size:0.875rem; font-weight:500;">${cfg.enabled ? 'Ativado' : 'Desativado'}</span>
        </label>
      </div>

      <div style="display:flex; gap:1rem; margin-top:1rem; flex-wrap:wrap;">
        <div class="input-group" style="margin:0; flex:1; min-width:160px;">
          <label>Prefixo do cupom</label>
          <input type="text" id="crmPrefix" class="input" value="${escapeHtml(cfg.couponPrefix || 'CZ')}" maxlength="8">
        </div>
        <div class="input-group" style="margin:0; flex:1; min-width:160px;">
          <label>Desconto (%)</label>
          <input type="number" id="crmDiscount" class="input" value="${cfg.couponDiscountPercent ?? 10}" min="0" max="100">
        </div>
      </div>
      <div style="margin-top:1rem; display:flex; justify-content:flex-end;">
        <button id="crmSaveBtn" class="btn btn-primary">Salvar configurações</button>
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
    return `<p style="color:var(--text-muted); font-size:0.875rem; margin:0;">Nenhum cupom foi emitido ainda. Quando o robô disparar gatilhos com cupom (7d/3d/24h), eles aparecerão aqui.</p>`;
  }

  return `
    <div style="display:flex; flex-direction:column; gap:0.5rem;">
      ${cupons.map(c => {
        const status = c.redeemed
          ? `<span class="badge badge-success">Convertido</span>`
          : `<span class="badge badge-neutral">Em aberto</span>`;
        return `
          <div style="border:1px solid var(--border); border-radius:0.375rem; padding:0.75rem 1rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
            <div style="display:flex; flex-direction:column; gap:0.2rem; min-width:0;">
              <span style="font-family:monospace; font-weight:700; color:var(--text-primary); letter-spacing:0.05em;">${escapeHtml(c.code)}</span>
              <span style="color:var(--text-muted); font-size:0.8125rem;">
                ${escapeHtml(c.sessionName)} · ${escapeHtml(TRIGGER_LABEL[c.trigger] || c.trigger)} · enviado em ${formatDateTime(c.sentAt)}
              </span>
            </div>
            ${status}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function setupHandlers(container) {
  const enabledChk = container.querySelector('#crmEnabled');
  enabledChk.onchange = () => {
    enabledChk.nextElementSibling.textContent = enabledChk.checked ? 'Ativado' : 'Desativado';
  };

  container.querySelector('#crmSaveBtn').onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Salvando...';

    try {
      const enabled = container.querySelector('#crmEnabled').checked;
      const prefix = container.querySelector('#crmPrefix').value.trim() || 'CZ';
      const discount = Number(container.querySelector('#crmDiscount').value) || 10;

      await apiPut('/api/organization/integrations', {
        salesAutomator: {
          enabled,
          couponPrefix: prefix,
          couponDiscountPercent: discount
        }
      });
      window.showToast?.('Configurações salvas!', 'success');
      await carregar(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  };
}
