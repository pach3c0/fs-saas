/**
 * Radar do fotógrafo — tela MOBILE dedicada do PWA instalado.
 *
 * Só aparece quando o app está instalado (standalone) NUM CELULAR (ver o hook em app.js).
 * NÃO é entregue a ninguém e NÃO aparece no desktop. É uma visão enxuta, só de
 * acompanhamento, montada 100% em cima do que já existe:
 *   - "Ao vivo": GET /api/presence/clients (quem está numa galeria agora)
 *   - "Sessões": GET /api/sessions/radar (estágio de cada cliente/participante — só-leitura)
 *   - "Atividade": GET /api/notifications (o feed que também vira push)
 *
 * Nada aqui escreve no banco. Tudo é aditivo e reaproveita helpers já exportados.
 */

import { apiGet } from '../utils/api.js';
import { NOTIF_ICONS, _navigate, _timeAgo, _esc } from '../utils/notifications.js';
import { getPushState, enablePush } from '../utils/push.js';

let timers = [];

// ── Mapa estágio → rótulo/cor/prioridade. Copy mora aqui (front), backend só devolve o estado. ──
// prioridade: quanto MENOR o número, mais no topo do radar (ação pendente do fotógrafo primeiro).
const STAGE_META = {
  submitted: { label: 'Enviou a seleção', icon: '✅', color: 'var(--green)',  action: 'Editar e entregar', prio: 0 },
  choosing:  { label: 'Escolhendo agora', icon: '🎯', color: 'var(--accent)', action: '',                   prio: 2 },
  accessed:  { label: 'Entrou, ainda não escolheu', icon: '👁️', color: 'var(--text-secondary)', action: '', prio: 3 },
  viewing:   { label: 'Visualizando a galeria', icon: '👁️', color: 'var(--text-secondary)', action: '',      prio: 3 },
  delivered: { label: 'Entregue', icon: '🎉', color: 'var(--text-muted)', action: '',                        prio: 5 },
  expired:   { label: 'Prazo expirado', icon: '⏰', color: 'var(--red)', action: 'Reabrir ou cobrar',        prio: 1 },
  waiting:   { label: 'Aguardando o cliente abrir', icon: '💤', color: 'var(--text-muted)', action: '',      prio: 4 },
  multi:     { label: 'Seleção em grupo', icon: '👥', color: 'var(--accent)', action: '',                    prio: 2 }
};

function _stageMeta(stage) {
  return STAGE_META[stage] || { label: stage || '—', icon: '•', color: 'var(--text-muted)', action: '', prio: 6 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Entrada / saída
// ─────────────────────────────────────────────────────────────────────────────

export function renderRadar(container) {
  _stopPolling();

  container.innerHTML = `
    <div id="radarRoot" style="max-width:640px; margin:0 auto; padding:0.75rem 0.875rem 3rem;">
      <header style="display:flex; align-items:flex-start; justify-content:space-between; gap:0.75rem; padding:0.5rem 0 1rem;">
        <div>
          <p style="margin:0; font-size:1.25rem; font-weight:700; color:var(--text-primary); letter-spacing:-0.01em;">CliqueZoom</p>
          <p style="margin:0.125rem 0 0; font-size:0.8125rem; color:var(--text-secondary);">Radar · acompanhe seus clientes</p>
        </div>
        <div id="radarPushChip"></div>
      </header>

      <section style="margin-bottom:1.25rem;">
        ${_sectionTitle('Ao vivo', 'quem está nas suas galerias agora')}
        <div id="radarLive"></div>
      </section>

      <section style="margin-bottom:1.25rem;">
        ${_sectionTitle('Sessões', 'em que ponto cada cliente está')}
        <div id="radarSessions"></div>
      </section>

      <section style="margin-bottom:1.25rem;">
        ${_sectionTitle('Atividade', 'o que aconteceu por último')}
        <div id="radarFeed"></div>
      </section>
    </div>
  `;

  _renderPushChip();
  _loadLive();
  _loadSessions();
  _loadFeed();

  // Poll enquanto a tela está visível. Ao voltar do standby, recarrega na hora.
  timers.push(setInterval(_loadLive, 30000));
  timers.push(setInterval(_loadSessions, 45000));
  timers.push(setInterval(_loadFeed, 60000));
  document.addEventListener('visibilitychange', _onVisibility);
}

function _onVisibility() {
  if (document.visibilityState === 'visible' && document.documentElement.classList.contains('radar-mode')) {
    _loadLive(); _loadSessions(); _loadFeed();
  }
}

function _stopPolling() {
  timers.forEach(clearInterval);
  timers = [];
  document.removeEventListener('visibilitychange', _onVisibility);
}

// Entrada re-entrável: (re)desenha o radar e liga o modo radar. É o único ponto de
// entrada — usado tanto no boot do "app" (?app=1) quanto pelo botão "Voltar ao Radar"
// no header. Idempotente: renderRadar já chama _stopPolling() no topo, então reentrar
// não vaza timers.
export function openRadar() {
  const c = document.getElementById('tabContent');
  if (!c) return;
  document.documentElement.classList.add('radar-mode');
  renderRadar(c);
}
window.openRadar = openRadar;

// Teardown público: para os timers do radar e sai do modo radar. Chamado pelo
// switchTab ao navegar para qualquer outra tela e pelos handlers de linha ao abrir
// um contexto no painel. NÃO remove a flag ?app=1 (um refresh volta ao Radar, que é
// o start_url do PWA). Idempotente.
export function stopRadar() {
  _stopPolling();
  document.documentElement.classList.remove('radar-mode');
}

// ─────────────────────────────────────────────────────────────────────────────
// Blocos
// ─────────────────────────────────────────────────────────────────────────────

async function _renderPushChip() {
  const el = document.getElementById('radarPushChip');
  if (!el) return;
  let st;
  try { st = await getPushState(); } catch { return; }

  if (st.isSubscribed) {
    el.innerHTML = `<span style="display:inline-flex; align-items:center; gap:0.3rem; font-size:0.75rem; color:var(--green); background:color-mix(in srgb, var(--green) 12%, transparent); padding:0.3rem 0.6rem; border-radius:999px; font-weight:600;">🔔 Notificações ativas</span>`;
    return;
  }
  if (st.permission === 'denied') {
    el.innerHTML = `<span style="display:inline-flex; align-items:center; gap:0.3rem; font-size:0.75rem; color:var(--text-muted); background:var(--bg-surface); padding:0.3rem 0.6rem; border-radius:999px;">🔕 Push bloqueado</span>`;
    return;
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '🔔 Ativar notificações';
  btn.style.cssText = `${_btnStyle('accent')}; font-size:0.75rem; padding:0.4rem 0.7rem;`;
  btn.addEventListener('click', async () => {
    btn.disabled = true; btn.textContent = 'Ativando…';
    try {
      await enablePush();
      window.showToast?.('Notificações ativadas neste aparelho.', 'success');
      _renderPushChip();
    } catch (e) {
      window.showToast?.(e.message || 'Não foi possível ativar.', 'error');
      btn.disabled = false; btn.textContent = '🔔 Ativar notificações';
    }
  });
  el.innerHTML = '';
  el.appendChild(btn);
}

async function _loadLive() {
  const box = document.getElementById('radarLive');
  if (!box) return;
  try {
    const data = await apiGet('/api/presence/clients');
    const clients = data?.clients || [];
    if (!clients.length) {
      box.innerHTML = _emptyLine('Ninguém navegando agora.');
      return;
    }
    box.innerHTML = clients.map(c => {
      const mod = c.module === 'selecao' ? 'Seleção' : 'Galeria';
      const nome = _esc(c.name || 'Galeria');
      const qtd = c.count > 1 ? ` · ${c.count} pessoas` : '';
      return `
        <div data-sid="${_esc(String(c.sessionId || ''))}" class="radar-live-row" style="${_cardStyle()}; display:flex; align-items:center; gap:0.6rem;">
          <span style="width:9px; height:9px; border-radius:50%; background:var(--green); flex-shrink:0; box-shadow:0 0 0 4px color-mix(in srgb, var(--green) 20%, transparent);"></span>
          <div style="flex:1; min-width:0;">
            <p style="margin:0; font-size:0.875rem; font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${nome}</p>
            <p style="margin:0; font-size:0.75rem; color:var(--text-secondary);">${mod}${qtd} · online</p>
          </div>
          <span style="color:var(--text-muted); font-size:1rem;">›</span>
        </div>`;
    }).join('');
    box.querySelectorAll('.radar-live-row').forEach(row => {
      const sid = row.getAttribute('data-sid');
      if (sid) row.addEventListener('click', () => { stopRadar(); _navigate({ sessionId: sid }); });
    });
  } catch {
    box.innerHTML = _emptyLine('Não foi possível carregar agora.');
  }
}

async function _loadSessions() {
  const box = document.getElementById('radarSessions');
  if (!box) return;
  try {
    const data = await apiGet('/api/sessions/radar');
    let sessions = data?.sessions || [];
    if (!sessions.length) {
      box.innerHTML = _emptyLine('Nenhuma sessão ativa.');
      return;
    }
    // Ordena: ação pendente do fotógrafo primeiro, depois por atividade recente.
    sessions = sessions.slice().sort((a, b) => {
      const pa = _sessionPrio(a), pb = _sessionPrio(b);
      if (pa !== pb) return pa - pb;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
    box.innerHTML = sessions.map(_sessionCard).join('');
    box.querySelectorAll('.radar-sess-row').forEach(row => {
      const sid = row.getAttribute('data-sid');
      if (sid) row.addEventListener('click', () => { stopRadar(); _navigate({ sessionId: sid }); });
    });
  } catch {
    box.innerHTML = _emptyLine('Não foi possível carregar as sessões.');
  }
}

function _sessionPrio(s) {
  if (s.flags?.reopen || s.flags?.extraPending) return -1;
  if (s.stage === 'multi') {
    return (s.summary?.submitted > 0) ? 0 : 2;
  }
  return _stageMeta(s.stage).prio;
}

function _sessionCard(s) {
  const meta = _stageMeta(s.stage);
  const cliente = s.clientName ? _esc(s.clientName) : '';
  const flags = [];
  if (s.flags?.reopen)       flags.push(`<span style="${_pill('var(--yellow)')}">🔄 Reabertura</span>`);
  if (s.flags?.extraPending) flags.push(`<span style="${_pill('var(--accent)')}">📸 Pediu extras</span>`);

  let statusLine;
  if (s.stage === 'multi') {
    const sm = s.summary || {};
    const parts = [];
    if (sm.submitted) parts.push(`${sm.submitted} enviaram`);
    if (sm.choosing)  parts.push(`${sm.choosing} escolhendo`);
    if (sm.delivered) parts.push(`${sm.delivered} entregues`);
    const resumo = parts.length ? parts.join(' · ') : `${sm.total || 0} participantes`;
    statusLine = `<span style="color:var(--accent);">${meta.icon}</span> ${resumo}`;
  } else if (s.stage === 'choosing') {
    statusLine = `<span style="color:${meta.color};">${meta.icon}</span> Escolhendo ${s.selectedCount || 0}/${s.packageLimit || '—'}`;
  } else {
    statusLine = `<span style="color:${meta.color};">${meta.icon}</span> ${meta.label}`;
  }

  const action = meta.action
    ? `<p style="margin:0.3rem 0 0; font-size:0.75rem; color:${meta.color}; font-weight:600;">→ ${meta.action}</p>` : '';

  return `
    <div data-sid="${_esc(String(s.id || ''))}" class="radar-sess-row" style="${_cardStyle()}">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:0.5rem;">
        <div style="flex:1; min-width:0;">
          <p style="margin:0; font-size:0.875rem; font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${_esc(s.name || 'Sessão')}</p>
          ${cliente ? `<p style="margin:0; font-size:0.75rem; color:var(--text-muted);">${cliente}</p>` : ''}
        </div>
        <span style="color:var(--text-muted); font-size:1rem; flex-shrink:0;">›</span>
      </div>
      <p style="margin:0.4rem 0 0; font-size:0.8125rem; color:var(--text-secondary);">${statusLine}</p>
      ${action}
      ${flags.length ? `<div style="display:flex; flex-wrap:wrap; gap:0.35rem; margin-top:0.5rem;">${flags.join('')}</div>` : ''}
    </div>`;
}

async function _loadFeed() {
  const box = document.getElementById('radarFeed');
  if (!box) return;
  try {
    const data = await apiGet('/api/notifications');
    const items = (data?.notifications || []).slice(0, 20);
    if (!items.length) {
      box.innerHTML = _emptyLine('Sem novidades por enquanto.');
      return;
    }
    box.innerHTML = items.map(n => {
      const icon = NOTIF_ICONS[n.type] || '🔔';
      const unread = !n.read;
      return `
        <div data-nid="${_esc(String(n._id || ''))}" class="radar-feed-row" style="${_cardStyle(unread)}; display:flex; align-items:flex-start; gap:0.55rem;">
          <span style="font-size:1rem; flex-shrink:0;">${icon}</span>
          <div style="flex:1; min-width:0;">
            <p style="margin:0; font-size:0.8125rem; color:${unread ? 'var(--text-primary)' : 'var(--text-secondary)'}; ${unread ? 'font-weight:600;' : ''} line-height:1.4;">${_esc(n.message)}</p>
            <p style="margin:0.15rem 0 0; font-size:0.6875rem; color:var(--text-muted);">${_timeAgo(new Date(n.createdAt))}</p>
          </div>
        </div>`;
    }).join('');
    box.querySelectorAll('.radar-feed-row').forEach(row => {
      const nid = row.getAttribute('data-nid');
      const n = items.find(x => String(x._id) === nid);
      if (n) row.addEventListener('click', () => { stopRadar(); _navigate(n); });
    });
  } catch {
    box.innerHTML = _emptyLine('Não foi possível carregar a atividade.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Estilo (inline + tokens)
// ─────────────────────────────────────────────────────────────────────────────

function _sectionTitle(title, sub) {
  return `
    <div style="margin:0 0.125rem 0.5rem;">
      <p style="margin:0; font-size:0.9375rem; font-weight:700; color:var(--text-primary);">${title}</p>
      <p style="margin:0; font-size:0.75rem; color:var(--text-muted);">${sub}</p>
    </div>`;
}

function _cardStyle(highlight) {
  return `
    background:${highlight ? 'color-mix(in srgb, var(--accent) 6%, var(--bg-surface))' : 'var(--bg-surface)'};
    border:1px solid var(--border); border-radius:0.75rem;
    padding:0.7rem 0.8rem; margin-bottom:0.5rem; cursor:pointer;
    -webkit-tap-highlight-color:transparent;
  `.replace(/\s+/g, ' ').trim();
}

function _pill(color) {
  return `display:inline-flex; align-items:center; font-size:0.6875rem; font-weight:600; color:${color}; background:color-mix(in srgb, ${color} 12%, transparent); padding:0.2rem 0.5rem; border-radius:999px;`;
}

function _btnStyle(kind) {
  if (kind === 'accent') {
    return `background:var(--accent); color:var(--bg-base); border:none; border-radius:0.6rem; padding:0.55rem 0.9rem; font-size:0.8125rem; font-weight:600; cursor:pointer;`;
  }
  return `background:var(--bg-surface); color:var(--text-secondary); border:1px solid var(--border); border-radius:0.6rem; padding:0.55rem 0.9rem; font-size:0.8125rem; font-weight:600; cursor:pointer;`;
}

function _emptyLine(msg) {
  return `<p style="margin:0; padding:0.9rem 0.8rem; font-size:0.8125rem; color:var(--text-muted); text-align:center; background:var(--bg-surface); border:1px dashed var(--border); border-radius:0.75rem;">${_esc(msg)}</p>`;
}
