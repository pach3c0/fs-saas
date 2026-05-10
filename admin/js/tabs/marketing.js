import { appState } from '../state.js';

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
  container.innerHTML = `<div style="color:var(--ad-text);opacity:0.6;">Carregando...</div>`;

  let data = null;
  try {
    const res = await fetch('/api/marketing/overview', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    const json = await res.json();
    if (json.success) data = json;
  } catch (e) { /* segue com null */ }

  if (!data) {
    container.innerHTML = `<div style="color:var(--ad-red);">Erro ao carregar dados.</div>`;
    return;
  }

  container.innerHTML = '';
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;flex-direction:column;gap:1.5rem;max-width:900px;';

  // Título
  root.innerHTML = `
    <div>
      <h2 style="font-size:1.5rem;font-weight:bold;color:var(--ad-text);margin:0 0 0.25rem;">Marketing & Performance</h2>
      <p style="color:var(--ad-text);opacity:0.6;font-size:0.875rem;margin:0;">Dados reais do seu estúdio</p>
    </div>
  `;

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

  // CRM automações
  root.appendChild(_crmSection(data.crm));

  // Google Analytics
  root.appendChild(_gaSection(data.ga));

  container.appendChild(root);
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
  d.style.cssText = `background:var(--ad-bg-surface);border-radius:0.5rem;padding:1.25rem;border:1px solid color-mix(in srgb,var(--ad-text) 12%,transparent);`;

  let deltaHtml = '';
  if (delta !== null && delta !== undefined) {
    const color = delta >= 0 ? 'var(--ad-green)' : 'var(--ad-red)';
    const sign  = delta >= 0 ? '+' : '';
    deltaHtml = `<span style="color:${color};font-size:0.75rem;">${sign}${delta}% vs mês anterior</span>`;
  }

  d.innerHTML = `
    <p style="color:var(--ad-text);opacity:0.6;font-size:0.75rem;font-weight:600;text-transform:uppercase;margin:0 0 0.25rem;">${label}</p>
    <p style="color:var(--ad-text);font-size:1.75rem;font-weight:bold;margin:0 0 0.25rem;">${value}</p>
    ${deltaHtml}
    <p style="color:var(--ad-text);opacity:0.5;font-size:0.75rem;margin:${deltaHtml ? '0.25rem' : '0'} 0 0;">${sub}</p>
  `;
  return d;
}

// ─── Funil ───────────────────────────────────────────────────────────────────

function _funnelSection({ totalSessions, codeSent, accessed, submitted, delivered, expired }) {
  const steps = [
    { label: 'Sessões criadas',   value: totalSessions, color: 'var(--ad-accent)' },
    { label: 'Código enviado',    value: codeSent,      color: '#3b82f6' },
    { label: 'Cliente acessou',   value: accessed,      color: 'var(--ad-green)' },
    { label: 'Seleção enviada',   value: submitted,     color: 'var(--ad-yellow)' },
    { label: 'Entregue',          value: delivered,     color: '#a855f7' },
  ];

  const wrap = document.createElement('div');
  wrap.style.cssText = `background:var(--ad-bg-surface);border-radius:0.5rem;padding:1.5rem;border:1px solid color-mix(in srgb,var(--ad-text) 12%,transparent);`;
  wrap.innerHTML = `<h3 style="font-size:1rem;font-weight:600;color:var(--ad-text);margin:0 0 1.25rem;">Funil de Sessões</h3>`;

  const max = totalSessions || 1;
  for (const step of steps) {
    const pct = Math.round((step.value / max) * 100);
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:1rem;margin-bottom:0.6rem;';
    bar.innerHTML = `
      <div style="width:9rem;text-align:right;font-size:0.8125rem;color:var(--ad-text);opacity:0.8;flex-shrink:0;">${step.label}</div>
      <div style="flex:1;background:color-mix(in srgb,var(--ad-text) 8%,transparent);height:1.375rem;border-radius:0.25rem;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${step.color};transition:width 0.4s;border-radius:0.25rem;"></div>
      </div>
      <div style="width:3.5rem;font-size:0.8125rem;font-weight:600;color:var(--ad-text);">${step.value} <span style="opacity:0.5;font-weight:400;">(${pct}%)</span></div>
    `;
    wrap.appendChild(bar);
  }

  if (expired > 0) {
    const note = document.createElement('p');
    note.style.cssText = 'color:var(--ad-orange);font-size:0.75rem;margin:0.75rem 0 0;';
    note.textContent = `⚠ ${expired} sessão(ões) com prazo expirado`;
    wrap.appendChild(note);
  }

  return wrap;
}

// ─── Status atual ─────────────────────────────────────────────────────────────

function _statusSection(statusCount) {
  const items = [
    { label: 'Aguardando',     key: 'pending',     color: 'var(--ad-text)' },
    { label: 'Em andamento',   key: 'in_progress', color: 'var(--ad-yellow)' },
    { label: 'Seleção enviada',key: 'submitted',   color: '#3b82f6' },
    { label: 'Entregue',       key: 'delivered',   color: 'var(--ad-green)' },
    { label: 'Expirado',       key: 'expired',     color: 'var(--ad-red)' },
  ];

  const wrap = document.createElement('div');
  wrap.style.cssText = `background:var(--ad-bg-surface);border-radius:0.5rem;padding:1.5rem;border:1px solid color-mix(in srgb,var(--ad-text) 12%,transparent);`;
  wrap.innerHTML = `<h3 style="font-size:1rem;font-weight:600;color:var(--ad-text);margin:0 0 1rem;">Status das Sessões</h3>`;

  for (const item of items) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0.375rem 0;border-bottom:1px solid color-mix(in srgb,var(--ad-text) 8%,transparent);';
    row.innerHTML = `
      <span style="font-size:0.875rem;color:var(--ad-text);opacity:0.8;">${item.label}</span>
      <span style="font-size:0.875rem;font-weight:600;color:${item.color};">${statusCount[item.key] ?? 0}</span>
    `;
    wrap.appendChild(row);
  }

  return wrap;
}

// ─── Modos ────────────────────────────────────────────────────────────────────

function _modesSection(byMode) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `background:var(--ad-bg-surface);border-radius:0.5rem;padding:1.5rem;border:1px solid color-mix(in srgb,var(--ad-text) 12%,transparent);`;
  wrap.innerHTML = `<h3 style="font-size:1rem;font-weight:600;color:var(--ad-text);margin:0 0 1rem;">Modos de Sessão</h3>`;

  const total = Object.values(byMode).reduce((a, b) => a + b, 0) || 1;
  for (const [mode, count] of Object.entries(byMode)) {
    const pct = Math.round((count / total) * 100);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0.375rem 0;border-bottom:1px solid color-mix(in srgb,var(--ad-text) 8%,transparent);';
    row.innerHTML = `
      <span style="font-size:0.875rem;color:var(--ad-text);opacity:0.8;">${MODE_LABELS[mode] || mode}</span>
      <span style="font-size:0.875rem;font-weight:600;color:var(--ad-text);">${count} <span style="opacity:0.5;font-weight:400;">(${pct}%)</span></span>
    `;
    wrap.appendChild(row);
  }

  return wrap;
}

// ─── Tipos de evento ──────────────────────────────────────────────────────────

function _eventTypesSection(byEventType) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `background:var(--ad-bg-surface);border-radius:0.5rem;padding:1.5rem;border:1px solid color-mix(in srgb,var(--ad-text) 12%,transparent);`;
  wrap.innerHTML = `<h3 style="font-size:1rem;font-weight:600;color:var(--ad-text);margin:0 0 1.25rem;">Sessões por Tipo de Evento</h3>`;

  const max = byEventType[0]?.count || 1;
  for (const { type, count } of byEventType) {
    const pct = Math.round((count / max) * 100);
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem;';
    bar.innerHTML = `
      <div style="width:7rem;text-align:right;font-size:0.8125rem;color:var(--ad-text);opacity:0.8;flex-shrink:0;">${EVENT_LABELS[type] || type}</div>
      <div style="flex:1;background:color-mix(in srgb,var(--ad-text) 8%,transparent);height:1.25rem;border-radius:0.25rem;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:var(--ad-accent);opacity:0.8;border-radius:0.25rem;"></div>
      </div>
      <div style="width:2rem;font-size:0.8125rem;font-weight:600;color:var(--ad-text);">${count}</div>
    `;
    wrap.appendChild(bar);
  }

  return wrap;
}

// ─── CRM ─────────────────────────────────────────────────────────────────────

function _crmSection({ totalTriggers, redeemedCoupons }) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `background:var(--ad-bg-surface);border-radius:0.5rem;padding:1.5rem;border:1px solid color-mix(in srgb,var(--ad-text) 12%,transparent);display:flex;gap:2rem;align-items:center;`;
  wrap.innerHTML = `
    <div>
      <h3 style="font-size:1rem;font-weight:600;color:var(--ad-text);margin:0 0 0.25rem;">Automação CRM</h3>
      <p style="font-size:0.75rem;color:var(--ad-text);opacity:0.5;margin:0;">E-mails de escassez e reativação disparados</p>
    </div>
    <div style="display:flex;gap:2rem;margin-left:auto;">
      <div style="text-align:center;">
        <p style="font-size:1.5rem;font-weight:bold;color:var(--ad-text);margin:0;">${totalTriggers}</p>
        <p style="font-size:0.75rem;color:var(--ad-text);opacity:0.6;margin:0;">E-mails enviados</p>
      </div>
      <div style="text-align:center;">
        <p style="font-size:1.5rem;font-weight:bold;color:var(--ad-green);margin:0;">${redeemedCoupons}</p>
        <p style="font-size:0.75rem;color:var(--ad-text);opacity:0.6;margin:0;">Cupons usados</p>
      </div>
    </div>
  `;
  return wrap;
}

// ─── Google Analytics ─────────────────────────────────────────────────────────

function _gaSection({ configured, measurementId }) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `background:var(--ad-bg-surface);border-radius:0.5rem;padding:1.5rem;border:1px solid color-mix(in srgb,var(--ad-text) 12%,transparent);`;

  if (!configured) {
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;">
        <div style="width:2.5rem;height:2.5rem;border-radius:50%;background:color-mix(in srgb,var(--ad-yellow) 15%,transparent);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.25rem;">📊</div>
        <div>
          <h3 style="font-size:1rem;font-weight:600;color:var(--ad-text);margin:0 0 0.25rem;">Google Analytics não configurado</h3>
          <p style="font-size:0.875rem;color:var(--ad-text);opacity:0.6;margin:0;">
            Configure o Measurement ID na aba <strong style="color:var(--ad-text);">Integrações</strong> para ver visitas, origem de tráfego e demografia aqui.
          </p>
        </div>
      </div>
    `;
  } else {
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;">
        <div style="width:2.5rem;height:2.5rem;border-radius:50%;background:color-mix(in srgb,var(--ad-green) 15%,transparent);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.25rem;">📊</div>
        <div>
          <h3 style="font-size:1rem;font-weight:600;color:var(--ad-text);margin:0 0 0.25rem;">Google Analytics conectado</h3>
          <p style="font-size:0.875rem;color:var(--ad-text);opacity:0.6;margin:0 0 0.75rem;">
            ID: <code style="background:color-mix(in srgb,var(--ad-text) 10%,transparent);padding:0.1rem 0.4rem;border-radius:0.25rem;font-size:0.8125rem;">${measurementId}</code>
            — dados de visitas disponíveis no painel do Google Analytics.
          </p>
          <a href="https://analytics.google.com" target="_blank"
            style="display:inline-flex;align-items:center;gap:0.375rem;background:var(--ad-accent);color:var(--ad-bg-base);padding:0.4rem 0.875rem;border-radius:0.375rem;font-size:0.8125rem;font-weight:600;text-decoration:none;">
            Abrir Google Analytics →
          </a>
        </div>
      </div>
    `;
  }

  return wrap;
}
