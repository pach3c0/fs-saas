// Aba "Agente" — chat IA (somente leitura) sobre o toolkit de operação.
// Consome POST /api/admin/saas/agent/chat (stream NDJSON) e GET .../agent/info.
import { apiRequest, getToken } from '../core.js';

const TOOL_LABELS = {
  getPlatformOverview: 'visão geral da plataforma',
  listErrors: 'erros',
  listEmails: 'e-mails',
  findOrgs: 'organizações',
  getOrgDiagnostics: 'diagnóstico da org',
  getOrgJourney: 'jornada da org',
  getAuditLog: 'auditoria',
  getSystemStatus: 'status do sistema'
};

const SUGGESTIONS = [
  'Quais orgs estão em risco e por quê?',
  'Houve algum erro nas últimas 24h?',
  'Resumo da semana da plataforma'
];

let conversation = [];
let built = false;
let sending = false;

export async function loadAgente() {
  const root = document.getElementById('tabAgente');
  if (!root) return;
  if (!built) { buildUI(root); built = true; }
  try {
    const info = await apiRequest('GET', '/api/admin/saas/agent/info');
    const el = document.getElementById('agenteProvider');
    if (el) el.textContent = `${info.provider} · ${info.model}`;
  } catch { /* cabeçalho fica vazio se a info falhar */ }
}

function buildUI(root) {
  root.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
      <div>
        <h2 style="margin:0; font-size:1.1rem; color:var(--text-primary);">🤖 Agente de operação</h2>
        <p style="margin:0.15rem 0 0; font-size:0.75rem; color:var(--text-secondary);">
          Somente leitura — pergunte sobre erros, métricas, jornada e orgs em risco.
        </p>
      </div>
      <span id="agenteProvider" style="font-size:0.7rem; color:var(--text-secondary); background:var(--bg-base); border:1px solid var(--border); border-radius:6px; padding:0.2rem 0.5rem;"></span>
    </div>

    <div id="agenteMessages" style="background:var(--bg-base); border:1px solid var(--border); border-radius:10px; padding:1rem; height:460px; overflow-y:auto; display:flex; flex-direction:column; gap:0.75rem;"></div>

    <div id="agenteSuggestions" style="display:flex; flex-wrap:wrap; gap:0.4rem; margin:0.6rem 0;">
      ${SUGGESTIONS.map(s => `<button class="agente-sugg" data-q="${s.replace(/"/g, '&quot;')}" style="background:var(--accent-soft); color:var(--accent); border:1px solid var(--border); border-radius:999px; padding:0.3rem 0.7rem; font-size:0.72rem; cursor:pointer; font-family:inherit;">${s}</button>`).join('')}
    </div>

    <div style="display:flex; gap:0.5rem; align-items:flex-end;">
      <textarea id="agenteInput" rows="2" placeholder="Pergunte algo sobre a plataforma…" style="flex:1; resize:none; background:var(--bg-surface); color:var(--text-primary); border:1px solid var(--border); border-radius:8px; padding:0.6rem 0.75rem; font-size:0.85rem; font-family:inherit;"></textarea>
      <button id="agenteSend" style="background:var(--accent); color:#fff; border:none; border-radius:8px; padding:0.6rem 1.1rem; font-size:0.85rem; font-weight:600; cursor:pointer; font-family:inherit;">Enviar</button>
    </div>
  `;

  const messages = root.querySelector('#agenteMessages');
  messages.innerHTML = `<div style="margin:auto; text-align:center; color:var(--text-secondary); font-size:0.8rem;">Faça uma pergunta para começar.<br>O agente consulta os dados reais antes de responder.</div>`;

  root.querySelector('#agenteSend').onclick = () => send(root.querySelector('#agenteInput').value);
  root.querySelector('#agenteInput').onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e.target.value); }
  };
  root.querySelectorAll('.agente-sugg').forEach(b => { b.onclick = () => send(b.dataset.q); });
}

function appendBubble(role) {
  const list = document.getElementById('agenteMessages');
  // remove o placeholder inicial
  if (list.children.length === 1 && !list.firstElementChild.dataset.role) list.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.dataset.role = role;
  const isUser = role === 'user';
  wrap.style.cssText = `max-width:88%; align-self:${isUser ? 'flex-end' : 'flex-start'}; background:${isUser ? 'var(--accent-soft)' : 'var(--bg-surface)'}; border:1px solid var(--border); border-radius:10px; padding:0.6rem 0.8rem; font-size:0.85rem; color:var(--text-primary); white-space:pre-wrap; word-break:break-word;`;

  const status = document.createElement('div');
  status.className = 'agente-status';
  status.style.cssText = 'font-size:0.72rem; color:var(--text-secondary); font-style:italic;';
  const text = document.createElement('div');
  text.className = 'agente-text';
  wrap.appendChild(status);
  wrap.appendChild(text);
  list.appendChild(wrap);
  scrollBottom();
  return { status, text };
}

function scrollBottom() {
  const list = document.getElementById('agenteMessages');
  if (list) list.scrollTop = list.scrollHeight;
}

function setSending(on) {
  const btn = document.getElementById('agenteSend');
  if (btn) { btn.disabled = on; btn.style.opacity = on ? '0.5' : '1'; btn.textContent = on ? '…' : 'Enviar'; }
}

async function send(raw) {
  const text = (raw || '').trim();
  if (sending || !text) return;
  sending = true;
  setSending(true);
  document.getElementById('agenteSuggestions')?.style.setProperty('display', 'none');
  document.getElementById('agenteInput').value = '';

  conversation.push({ role: 'user', content: text });
  appendBubble('user').text.textContent = text;

  const bubble = appendBubble('assistant');
  let acc = '';

  try {
    const res = await fetch('/api/admin/saas/agent/chat', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversation })
    });

    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      bubble.text.textContent = `⚠️ ${err.error || `Erro ${res.status}`}`;
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let msg; try { msg = JSON.parse(line); } catch { continue; }
        if (msg.t === 'text') {
          acc += msg.v;
          bubble.status.textContent = '';
          bubble.text.textContent = acc;
        } else if (msg.t === 'tool') {
          bubble.status.textContent = `🔧 consultando ${TOOL_LABELS[msg.name] || msg.name}…`;
        } else if (msg.t === 'error') {
          acc += (acc ? '\n\n' : '') + `⚠️ ${msg.v}`;
          bubble.text.textContent = acc;
        }
        scrollBottom();
      }
    }

    if (acc.trim()) conversation.push({ role: 'assistant', content: acc });
    else bubble.text.textContent = '(sem resposta)';
  } catch (err) {
    bubble.text.textContent = `⚠️ ${err.message}`;
  } finally {
    bubble.status.textContent = '';
    sending = false;
    setSending(false);
  }
}
