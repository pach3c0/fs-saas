import { appState } from '../state.js';
import { renderCrm } from './crm.js';

const EVENT_LABELS = {
  aniversario: 'Aniversário', casamento: 'Casamento', formatura: 'Formatura',
  corporativo: 'Corporativo', show: 'Show', ensaio: 'Ensaio',
  gestante: 'Gestante', newborn: 'Newborn', debutante: 'Debutante',
  batizado: 'Batizado', outro: 'Outro'
};

const MODE_LABELS = {
  selection: 'Seleção', gallery: 'Galeria', multi_selection: 'Multi-seleção', multi_instant: 'Entrega Imediata'
};

export async function renderMarketing(container) {
  container.innerHTML = `<div style="color:var(--text-secondary);text-align:center;padding:2rem;">Carregando...</div>`;

  let data = null;
  try {
    const res = await fetch('/api/marketing/overview', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    const json = await res.json();
    if (json.success) data = json;
  } catch (e) { /* segue com null */ }

  if (!data) {
    container.innerHTML = `<div style="color:var(--red);text-align:center;padding:2rem;">Erro ao carregar dados.</div>`;
    return;
  }

  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:1.5rem;max-width:900px;margin:0 auto;';

  // Cabeçalho centralizado (padrão DS) + toggle segmentado monocromático logo abaixo.
  const head = document.createElement('div');
  head.style.cssText = 'padding:1rem 0 1.5rem;border-bottom:1px solid var(--border);display:flex;flex-direction:column;align-items:center;text-align:center;gap:1rem;';
  head.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:0.25rem;">
      <h2 style="font-size:1.25rem;font-weight:600;color:var(--text-primary);margin:0;">Marketing &amp; Performance</h2>
      <p style="font-size:0.8125rem;color:var(--text-secondary);margin:0;">Dados reais do seu negócio</p>
    </div>
    <div class="mkt-toggle-group" style="display:inline-flex;gap:0.25rem;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--r-chip);padding:0.25rem;width:fit-content;">
      <button class="mkt-toggle" data-view="overview">Visão Geral</button>
      <button class="mkt-toggle" data-view="vendas">Vendas Automáticas</button>
    </div>
  `;
  wrap.appendChild(head);
  const toggle = head.querySelector('.mkt-toggle-group');

  const content = document.createElement('div');
  wrap.appendChild(content);
  container.appendChild(wrap);

  // Estilo selecionado monocromático (sem cor de fundo gritante): borda branca + texto brilhante.
  const setActive = (view) => {
    toggle.querySelectorAll('.mkt-toggle').forEach(b => {
      const active = b.dataset.view === view;
      b.style.cssText = `padding:0.45rem 1rem;font-size:0.8125rem;font-weight:600;cursor:pointer;font-family:inherit;border-radius:var(--r-chip);transition:all .15s;background:${active ? 'var(--bg-hover)' : 'transparent'};border:1px solid ${active ? 'var(--text-primary)' : 'transparent'};color:${active ? 'var(--text-primary)' : 'var(--text-secondary)'};`;
    });
  };

  const showView = (view) => {
    setActive(view);
    if (view === 'vendas') {
      // Reusa o dashboard de cupons/gatilhos (faz o próprio fetch em /api/sales/dashboard)
      renderCrm(content);
    } else {
      content.innerHTML = '';
      content.appendChild(buildOverview(data));
    }
  };

  toggle.querySelectorAll('.mkt-toggle').forEach(b => {
    b.onclick = () => showView(b.dataset.view);
  });

  showView('overview');
}

// Monta a visão geral (KPIs, funil, status, modos, eventos, GA) a partir dos dados já carregados.
function buildOverview(data) {
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;flex-direction:column;gap:1.5rem;';

  // KPI Cards
  root.appendChild(_kpiSection(data));

  // Funil real
  root.appendChild(_funnelSection(data.funnel));

  // Status atual + Modos
  const row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;';
  row.appendChild(_statusSection(data.statusCount));
  row.appendChild(_modesSection(data.byMode));
  root.appendChild(row);

  // Tipos de evento
  if (data.byEventType?.length > 0) {
    root.appendChild(_eventTypesSection(data.byEventType));
  }

  // Resumo de vendas automáticas (detalhe completo no toggle "Vendas Automáticas")
  root.appendChild(_crmSection(data.crm));

  // Google Analytics
  root.appendChild(_gaSection(data.ga));

  return root;
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

function _kpiSection(data) {
  const cards = [
    {
      label: 'Sessões (30d)',
      value: data.sessions30d,
      delta: data.sessionsDelta,
      sub: `${data.totalSessions} no total`
    },
    {
      label: 'Clientes (30d)',
      value: data.clients30d,
      delta: data.clientsDelta,
      sub: `${data.clientsAll} no total`
    },
    {
      label: 'Taxa de Acesso',
      value: data.rates.accessRate !== null ? `${data.rates.accessRate}%` : '—',
      delta: null,
      sub: 'cliente abriu a galeria'
    },
    {
      label: 'Taxa de Entrega',
      value: data.rates.deliveryRate !== null ? `${data.rates.deliveryRate}%` : '—',
      delta: null,
      sub: 'seleções entregues'
    }
  ];

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;';
  for (const c of cards) wrap.appendChild(_kpiCard(c));
  return wrap;
}

function _kpiCard({ label, value, delta, sub }) {
  const d = document.createElement('div');
  d.style.cssText = `background:var(--bg-surface);border-radius:var(--r-card);padding:1.25rem;border:1px solid var(--border);`;

  let deltaHtml = '';
  if (delta !== null && delta !== undefined) {
    const color = delta >= 0 ? 'var(--green)' : 'var(--red)';
    const sign  = delta >= 0 ? '+' : '';
    deltaHtml = `<span style="color:${color};font-size:0.75rem;">${sign}${delta}% vs mês anterior</span>`;
  }

  d.innerHTML = `
    <p style="color:var(--text-secondary);font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.03em;margin:0 0 0.25rem;">${label}</p>
    <p style="color:var(--text-primary);font-size:1.75rem;font-weight:700;margin:0 0 0.25rem;">${value}</p>
    ${deltaHtml}
    <p style="color:var(--text-muted);font-size:0.75rem;margin:${deltaHtml ? '0.25rem' : '0'} 0 0;">${sub}</p>
  `;
  return d;
}

// ─── Funil ───────────────────────────────────────────────────────────────────

function _funnelSection({ totalSessions, codeSent, accessed, submitted, delivered, expired }) {
  // Funil monocromático: accent com opacidade decrescente cria o degradê natural de afunilamento,
  // sem o arco-íris de cores (sobriedade do tema escuro — ver skill 1_7, seção 3).
  const steps = [
    { label: 'Sessões criadas', value: totalSessions, op: 1 },
    { label: 'Código enviado',  value: codeSent,      op: 0.82 },
    { label: 'Cliente acessou', value: accessed,      op: 0.64 },
    { label: 'Seleção enviada', value: submitted,     op: 0.46 },
    { label: 'Entregue',        value: delivered,     op: 0.3 },
  ];

  const wrap = document.createElement('div');
  wrap.style.cssText = `background:var(--bg-surface);border-radius:var(--r-card);padding:1.5rem;border:1px solid var(--border);`;
  wrap.innerHTML = `<h3 style="font-size:1rem;font-weight:600;color:var(--text-primary);margin:0 0 1.25rem;">Funil de Sessões</h3>`;

  const max = totalSessions || 1;
  for (const step of steps) {
    const pct = Math.round((step.value / max) * 100);
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:1rem;margin-bottom:0.6rem;';
    bar.innerHTML = `
      <div style="width:9rem;text-align:right;font-size:0.8125rem;color:var(--text-secondary);flex-shrink:0;">${step.label}</div>
      <div style="flex:1;background:var(--bg-elevated);height:1.375rem;border-radius:var(--r-field);overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:var(--accent);opacity:${step.op};transition:width 0.4s;border-radius:var(--r-field);"></div>
      </div>
      <div style="width:3.5rem;font-size:0.8125rem;font-weight:600;color:var(--text-primary);">${step.value} <span style="color:var(--text-muted);font-weight:400;">(${pct}%)</span></div>
    `;
    wrap.appendChild(bar);
  }

  if (expired > 0) {
    const note = document.createElement('p');
    note.style.cssText = 'color:var(--orange);font-size:0.75rem;margin:0.75rem 0 0;display:flex;align-items:center;gap:0.375rem;';
    note.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ${expired} sessão(ões) com prazo expirado`;
    wrap.appendChild(note);
  }

  return wrap;
}

// ─── Status atual ─────────────────────────────────────────────────────────────

function _statusSection(statusCount) {
  // Cor funcional só onde agrega significado (entregue=sucesso, expirado=alerta); o resto neutro.
  const items = [
    { label: 'Aguardando',     key: 'pending',     color: 'var(--text-primary)' },
    { label: 'Em andamento',   key: 'in_progress', color: 'var(--text-primary)' },
    { label: 'Seleção enviada',key: 'submitted',   color: 'var(--text-primary)' },
    { label: 'Entregue',       key: 'delivered',   color: 'var(--green)' },
    { label: 'Expirado',       key: 'expired',     color: 'var(--red)' },
  ];

  const wrap = document.createElement('div');
  wrap.style.cssText = `background:var(--bg-surface);border-radius:var(--r-card);padding:1.5rem;border:1px solid var(--border);`;
  wrap.innerHTML = `<h3 style="font-size:1rem;font-weight:600;color:var(--text-primary);margin:0 0 1rem;">Status das Sessões</h3>`;

  for (const item of items) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0.375rem 0;border-bottom:1px solid var(--border-muted);';
    row.innerHTML = `
      <span style="font-size:0.875rem;color:var(--text-secondary);">${item.label}</span>
      <span style="font-size:0.875rem;font-weight:600;color:${item.color};">${statusCount[item.key] ?? 0}</span>
    `;
    wrap.appendChild(row);
  }

  return wrap;
}

// ─── Modos ────────────────────────────────────────────────────────────────────

function _modesSection(byMode) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `background:var(--bg-surface);border-radius:var(--r-card);padding:1.5rem;border:1px solid var(--border);`;
  wrap.innerHTML = `<h3 style="font-size:1rem;font-weight:600;color:var(--text-primary);margin:0 0 1rem;">Modos de Sessão</h3>`;

  const total = Object.values(byMode).reduce((a, b) => a + b, 0) || 1;
  for (const [mode, count] of Object.entries(byMode)) {
    const pct = Math.round((count / total) * 100);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0.375rem 0;border-bottom:1px solid var(--border-muted);';
    row.innerHTML = `
      <span style="font-size:0.875rem;color:var(--text-secondary);">${MODE_LABELS[mode] || mode}</span>
      <span style="font-size:0.875rem;font-weight:600;color:var(--text-primary);">${count} <span style="color:var(--text-muted);font-weight:400;">(${pct}%)</span></span>
    `;
    wrap.appendChild(row);
  }

  return wrap;
}

// ─── Tipos de evento ──────────────────────────────────────────────────────────

function _eventTypesSection(byEventType) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `background:var(--bg-surface);border-radius:var(--r-card);padding:1.5rem;border:1px solid var(--border);`;
  wrap.innerHTML = `<h3 style="font-size:1rem;font-weight:600;color:var(--text-primary);margin:0 0 1.25rem;">Sessões por Tipo de Evento</h3>`;

  const max = byEventType[0]?.count || 1;
  for (const { type, count } of byEventType) {
    const pct = Math.round((count / max) * 100);
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem;';
    bar.innerHTML = `
      <div style="width:7rem;text-align:right;font-size:0.8125rem;color:var(--text-secondary);flex-shrink:0;">${EVENT_LABELS[type] || type}</div>
      <div style="flex:1;background:var(--bg-elevated);height:1.25rem;border-radius:var(--r-field);overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:var(--accent);opacity:0.8;border-radius:var(--r-field);"></div>
      </div>
      <div style="width:2rem;font-size:0.8125rem;font-weight:600;color:var(--text-primary);">${count}</div>
    `;
    wrap.appendChild(bar);
  }

  return wrap;
}

// ─── CRM ─────────────────────────────────────────────────────────────────────

function _crmSection({ totalTriggers, redeemedCoupons }) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `background:var(--bg-surface);border-radius:var(--r-card);padding:1.5rem;border:1px solid var(--border);display:flex;gap:2rem;align-items:center;flex-wrap:wrap;`;
  wrap.innerHTML = `
    <div>
      <h3 style="font-size:1rem;font-weight:600;color:var(--text-primary);margin:0 0 0.25rem;">Vendas automáticas</h3>
      <p style="font-size:0.75rem;color:var(--text-muted);margin:0;">E-mails de lembrete e escassês disparados</p>
    </div>
    <div style="display:flex;gap:2rem;margin-left:auto;">
      <div style="text-align:center;">
        <p style="font-size:1.5rem;font-weight:700;color:var(--text-primary);margin:0;">${totalTriggers}</p>
        <p style="font-size:0.75rem;color:var(--text-secondary);margin:0;">E-mails enviados</p>
      </div>
      <div style="text-align:center;">
        <p style="font-size:1.5rem;font-weight:700;color:var(--green);margin:0;">${redeemedCoupons}</p>
        <p style="font-size:0.75rem;color:var(--text-secondary);margin:0;">Cupons usados</p>
      </div>
    </div>
  `;
  return wrap;
}

// ─── Google Analytics ─────────────────────────────────────────────────────────

function _gaSection({ configured, measurementId }) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `background:var(--bg-surface);border-radius:var(--r-card);padding:1.5rem;border:1px solid var(--border);`;

  const gaIcon = '<path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>';

  if (!configured) {
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;">
        <div style="width:2.5rem;height:2.5rem;border-radius:var(--r-field);background:var(--bg-elevated);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--text-secondary);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${gaIcon}</svg>
        </div>
        <div>
          <h3 style="font-size:1rem;font-weight:600;color:var(--text-primary);margin:0 0 0.25rem;">Google Analytics não configurado</h3>
          <p style="font-size:0.875rem;color:var(--text-secondary);margin:0;">
            Configure o Measurement ID na aba <strong style="color:var(--text-primary);">Integrações</strong> para ver visitas, origem de tráfego e demografia aqui.
          </p>
        </div>
      </div>
    `;
  } else {
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;">
        <div style="width:2.5rem;height:2.5rem;border-radius:var(--r-field);background:color-mix(in srgb,var(--green) 15%,transparent);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--green);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${gaIcon}</svg>
        </div>
        <div>
          <h3 style="font-size:1rem;font-weight:600;color:var(--text-primary);margin:0 0 0.25rem;">Google Analytics conectado</h3>
          <p style="font-size:0.875rem;color:var(--text-secondary);margin:0 0 0.75rem;">
            ID: <code style="background:var(--bg-elevated);padding:0.1rem 0.4rem;border-radius:0.25rem;font-size:0.8125rem;font-family:monospace;">${measurementId}</code>
            — dados de visitas disponíveis no painel do Google Analytics.
          </p>
          <a href="https://analytics.google.com" target="_blank" class="btn btn-primary"
            style="display:inline-flex;align-items:center;gap:0.375rem;border-radius:var(--r-chip);padding:0.4rem 0.875rem;font-size:0.8125rem;font-weight:600;text-decoration:none;">
            Abrir Google Analytics
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>
      </div>
    `;
  }

  return wrap;
}
