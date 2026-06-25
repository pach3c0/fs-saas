// Aba "Agente" — chat IA (somente leitura) + gerenciamento das IAs/chaves.
// Chat: POST /api/admin/saas/agent/chat (stream NDJSON).
// IAs:  CRUD em /api/admin/saas/agent/providers (chaves criptografadas no back).
import { apiRequest, getToken, esc, saasToast, saasConfirm } from '../core.js';

const TOOL_LABELS = {
  getPlatformOverview: 'visão geral da plataforma', listErrors: 'erros', listEmails: 'e-mails',
  findOrgs: 'organizações', getOrgDiagnostics: 'diagnóstico da org', getOrgJourney: 'jornada da org',
  getAuditLog: 'auditoria', getSystemStatus: 'status do sistema'
};
const PROVIDER_LABELS = { anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', 'openai-compatible': 'OpenAI-compat' };
const SUGGESTIONS = ['Quais orgs estão em risco e por quê?', 'Houve algum erro nas últimas 24h?', 'Resumo da semana da plataforma'];

let conversation = [];
let providers = [];
let built = false;
let sending = false;
let editingId = null;

export async function loadAgente() {
  const root = document.getElementById('tabAgente');
  if (!root) return;
  if (!built) { buildUI(root); built = true; }
  await refreshProviders();
}

function buildUI(root) {
  root.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem; gap:0.5rem; flex-wrap:wrap;">
      <div>
        <h2 style="margin:0; font-size:1.1rem; color:var(--text-primary);">🤖 Agente de operação</h2>
        <p style="margin:0.15rem 0 0; font-size:0.75rem; color:var(--text-secondary);">Somente leitura — erros, métricas, jornada e orgs em risco.</p>
      </div>
      <div style="display:flex; align-items:center; gap:0.4rem;">
        <select id="agenteProviderSelect" title="IA usada nesta conversa" style="background:var(--bg-surface); color:var(--text-primary); border:1px solid var(--border); border-radius:6px; padding:0.3rem 0.5rem; font-size:0.72rem; font-family:inherit;"></select>
        <button id="agenteConfigBtn" title="Gerenciar IAs e chaves" style="background:var(--bg-base); color:var(--text-primary); border:1px solid var(--border); border-radius:6px; padding:0.3rem 0.5rem; font-size:0.72rem; cursor:pointer; font-family:inherit;">⚙️ IAs</button>
      </div>
    </div>

    <div id="agenteChatWrap">
      <div id="agenteMessages" style="background:var(--bg-base); border:1px solid var(--border); border-radius:10px; padding:1rem; height:440px; overflow-y:auto; display:flex; flex-direction:column; gap:0.75rem;"></div>
      <div id="agenteSuggestions" style="display:flex; flex-wrap:wrap; gap:0.4rem; margin:0.6rem 0;">
        ${SUGGESTIONS.map(s => `<button class="agente-sugg" data-q="${s.replace(/"/g, '&quot;')}" style="background:var(--accent-soft); color:var(--accent); border:1px solid var(--border); border-radius:999px; padding:0.3rem 0.7rem; font-size:0.72rem; cursor:pointer; font-family:inherit;">${s}</button>`).join('')}
      </div>
      <div style="display:flex; gap:0.5rem; align-items:flex-end;">
        <textarea id="agenteInput" rows="2" placeholder="Pergunte algo sobre a plataforma…" style="flex:1; resize:none; background:var(--bg-surface); color:var(--text-primary); border:1px solid var(--border); border-radius:8px; padding:0.6rem 0.75rem; font-size:0.85rem; font-family:inherit;"></textarea>
        <button id="agenteSend" style="background:var(--accent); color:#fff; border:none; border-radius:8px; padding:0.6rem 1.1rem; font-size:0.85rem; font-weight:600; cursor:pointer; font-family:inherit;">Enviar</button>
      </div>
    </div>

    <div id="agenteConfig" style="display:none; background:var(--bg-base); border:1px solid var(--border); border-radius:10px; padding:1rem;"></div>
  `;

  resetMessages();
  root.querySelector('#agenteSend').onclick = () => send(root.querySelector('#agenteInput').value);
  root.querySelector('#agenteInput').onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e.target.value); } };
  root.querySelectorAll('.agente-sugg').forEach(b => { b.onclick = () => send(b.dataset.q); });
  root.querySelector('#agenteConfigBtn').onclick = toggleConfig;
}

function resetMessages() {
  const list = document.getElementById('agenteMessages');
  if (list) list.innerHTML = `<div data-ph="1" style="margin:auto; text-align:center; color:var(--text-secondary); font-size:0.8rem;">Faça uma pergunta para começar.<br>O agente consulta os dados reais antes de responder.</div>`;
}

// ── Providers (IAs) ─────────────────────────────────────────────────────────
async function refreshProviders() {
  try {
    const data = await apiRequest('GET', '/api/admin/saas/agent/providers');
    providers = data.providers || [];
  } catch { providers = []; }

  const sel = document.getElementById('agenteProviderSelect');
  if (sel) {
    if (!providers.length) {
      sel.innerHTML = `<option value="">Nenhuma IA — clique ⚙️</option>`;
    } else {
      sel.innerHTML = providers.map(p => `<option value="${p.id}" ${p.isActive ? 'selected' : ''}>${esc(p.label)}${p.isActive ? ' (ativa)' : ''}</option>`).join('');
    }
  }
  if (document.getElementById('agenteConfig')?.style.display === 'block') renderConfig();
}

function toggleConfig() {
  const cfg = document.getElementById('agenteConfig');
  const chat = document.getElementById('agenteChatWrap');
  const open = cfg.style.display !== 'block';
  cfg.style.display = open ? 'block' : 'none';
  chat.style.display = open ? 'none' : 'block';
  if (open) { editingId = null; renderConfig(); }
}

function renderConfig() {
  const cfg = document.getElementById('agenteConfig');
  if (!cfg) return;
  const cards = providers.length ? providers.map(p => `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.55rem 0.7rem; margin-bottom:0.4rem;">
      <div style="min-width:0;">
        <div style="font-size:0.82rem; color:var(--text-primary); font-weight:600;">${esc(p.label)} ${p.isActive ? '<span style="font-size:0.65rem; color:var(--accent); border:1px solid var(--accent); border-radius:999px; padding:0 0.4rem; margin-left:0.3rem;">ativa</span>' : ''}</div>
        <div style="font-size:0.7rem; color:var(--text-secondary);">${PROVIDER_LABELS[p.provider] || p.provider} · ${esc(p.model)} · chave ····${esc(p.apiKeyLast4 || '????')}${p.baseURL ? ' · ' + esc(p.baseURL) : ''}</div>
      </div>
      <div style="display:flex; gap:0.3rem; flex-shrink:0;">
        ${p.isActive ? '' : `<button data-act="activate" data-id="${p.id}" style="font-size:0.68rem; background:var(--accent-soft); color:var(--accent); border:1px solid var(--border); border-radius:6px; padding:0.25rem 0.5rem; cursor:pointer;">Ativar</button>`}
        <button data-act="edit" data-id="${p.id}" style="font-size:0.68rem; background:var(--bg-base); color:var(--text-primary); border:1px solid var(--border); border-radius:6px; padding:0.25rem 0.5rem; cursor:pointer;">Editar</button>
        <button data-act="del" data-id="${p.id}" style="font-size:0.68rem; background:var(--bg-base); color:#f87171; border:1px solid var(--border); border-radius:6px; padding:0.25rem 0.5rem; cursor:pointer;">Excluir</button>
      </div>
    </div>`).join('') : `<div style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:0.6rem;">Nenhuma IA cadastrada. Adicione uma abaixo.</div>`;

  const editing = editingId ? providers.find(p => p.id === editingId) : null;
  const inp = 'background:var(--bg-surface); color:var(--text-primary); border:1px solid var(--border); border-radius:6px; padding:0.45rem 0.6rem; font-size:0.8rem; font-family:inherit; width:100%; box-sizing:border-box;';

  cfg.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.7rem;">
      <h3 style="margin:0; font-size:0.95rem; color:var(--text-primary);">⚙️ IAs configuradas</h3>
      <button id="agenteCfgClose" style="background:none; border:none; color:var(--text-secondary); font-size:1.1rem; cursor:pointer;">✕</button>
    </div>
    <div id="agenteProvList">${cards}</div>

    <div style="border-top:1px solid var(--border); margin-top:0.8rem; padding-top:0.8rem;">
      <div style="font-size:0.8rem; color:var(--text-primary); font-weight:600; margin-bottom:0.5rem;">${editing ? 'Editar IA' : 'Adicionar IA'}</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
        <select id="cfgProvider" style="${inp}">
          ${Object.entries(PROVIDER_LABELS).map(([v, l]) => `<option value="${v}" ${editing && editing.provider === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <input id="cfgLabel" placeholder="Rótulo (ex.: Claude Opus)" value="${editing ? esc(editing.label) : ''}" style="${inp}">
        <input id="cfgModel" placeholder="Modelo (ex.: claude-opus-4-8)" value="${editing ? esc(editing.model) : ''}" style="${inp}">
        <input id="cfgKey" type="password" placeholder="${editing ? 'Chave (em branco = manter)' : 'Chave de API'}" style="${inp}">
        <input id="cfgBaseURL" placeholder="baseURL (só openai-compatible)" value="${editing && editing.baseURL ? esc(editing.baseURL) : ''}" style="${inp} grid-column:1 / -1; display:${(editing ? editing.provider : 'anthropic') === 'openai-compatible' ? 'block' : 'none'};">
      </div>
      <div style="display:flex; align-items:center; gap:0.6rem; margin-top:0.6rem;">
        <label style="font-size:0.74rem; color:var(--text-secondary); display:flex; align-items:center; gap:0.3rem;"><input type="checkbox" id="cfgActive" ${editing && editing.isActive ? 'checked' : ''}> tornar ativa</label>
        <div style="flex:1;"></div>
        ${editing ? `<button id="cfgCancel" style="font-size:0.78rem; background:var(--bg-base); color:var(--text-primary); border:1px solid var(--border); border-radius:7px; padding:0.4rem 0.8rem; cursor:pointer;">Cancelar</button>` : ''}
        <button id="cfgSave" style="font-size:0.8rem; background:var(--accent); color:#fff; border:none; border-radius:7px; padding:0.4rem 1rem; font-weight:600; cursor:pointer;">${editing ? 'Salvar' : 'Adicionar'}</button>
      </div>
    </div>
  `;

  cfg.querySelector('#agenteCfgClose').onclick = toggleConfig;
  cfg.querySelector('#cfgProvider').onchange = (e) => {
    cfg.querySelector('#cfgBaseURL').style.display = e.target.value === 'openai-compatible' ? 'block' : 'none';
  };
  cfg.querySelector('#cfgSave').onclick = saveProvider;
  const cancel = cfg.querySelector('#cfgCancel');
  if (cancel) cancel.onclick = () => { editingId = null; renderConfig(); };
  cfg.querySelectorAll('[data-act]').forEach(btn => { btn.onclick = () => providerAction(btn.dataset.act, btn.dataset.id); });
}

async function providerAction(act, id) {
  try {
    if (act === 'activate') { await apiRequest('PUT', `/api/admin/saas/agent/providers/${id}/activate`); saasToast('IA ativada', 'success'); }
    else if (act === 'edit') { editingId = id; renderConfig(); return; }
    else if (act === 'del') {
      if (!(await saasConfirm('Excluir esta IA?', { title: 'Excluir IA', confirmText: 'Excluir', danger: true }))) return;
      await apiRequest('DELETE', `/api/admin/saas/agent/providers/${id}`); saasToast('IA removida', 'success');
    }
    editingId = null;
    await refreshProviders();
  } catch (e) { saasToast(e.message, 'error'); }
}

async function saveProvider() {
  const provider = document.getElementById('cfgProvider').value;
  const label = document.getElementById('cfgLabel').value.trim();
  const model = document.getElementById('cfgModel').value.trim();
  const apiKey = document.getElementById('cfgKey').value.trim();
  const baseURL = document.getElementById('cfgBaseURL').value.trim();
  const isActive = document.getElementById('cfgActive').checked;

  if (!label || !model) return saasToast('Preencha rótulo e modelo', 'error');
  if (!editingId && !apiKey) return saasToast('Informe a chave de API', 'error');
  if (provider === 'openai-compatible' && !baseURL) return saasToast('baseURL é obrigatório para openai-compatible', 'error');

  const body = { provider, label, model, baseURL, isActive };
  if (apiKey) body.apiKey = apiKey;
  try {
    if (editingId) await apiRequest('PUT', `/api/admin/saas/agent/providers/${editingId}`, body);
    else await apiRequest('POST', '/api/admin/saas/agent/providers', body);
    saasToast(editingId ? 'IA salva' : 'IA adicionada', 'success');
    editingId = null;
    await refreshProviders();
  } catch (e) { saasToast(e.message, 'error'); }
}

// ── Chat ────────────────────────────────────────────────────────────────────
function appendBubble(role) {
  const list = document.getElementById('agenteMessages');
  if (list.querySelector('[data-ph]')) list.innerHTML = '';
  const wrap = document.createElement('div');
  const isUser = role === 'user';
  wrap.style.cssText = `max-width:88%; align-self:${isUser ? 'flex-end' : 'flex-start'}; background:${isUser ? 'var(--accent-soft)' : 'var(--bg-surface)'}; border:1px solid var(--border); border-radius:10px; padding:0.6rem 0.8rem; font-size:0.85rem; color:var(--text-primary); white-space:pre-wrap; word-break:break-word;`;
  const status = document.createElement('div');
  status.style.cssText = 'font-size:0.72rem; color:var(--text-secondary); font-style:italic;';
  const text = document.createElement('div');
  wrap.appendChild(status); wrap.appendChild(text);
  list.appendChild(wrap);
  scrollBottom();
  return { status, text };
}

function scrollBottom() { const l = document.getElementById('agenteMessages'); if (l) l.scrollTop = l.scrollHeight; }
function setSending(on) {
  const btn = document.getElementById('agenteSend');
  if (btn) { btn.disabled = on; btn.style.opacity = on ? '0.5' : '1'; btn.textContent = on ? '…' : 'Enviar'; }
}

async function send(raw) {
  const text = (raw || '').trim();
  if (sending || !text) return;
  sending = true; setSending(true);
  document.getElementById('agenteSuggestions')?.style.setProperty('display', 'none');
  document.getElementById('agenteInput').value = '';

  conversation.push({ role: 'user', content: text });
  appendBubble('user').text.textContent = text;
  const bubble = appendBubble('assistant');
  let acc = '';

  const providerId = document.getElementById('agenteProviderSelect')?.value || undefined;

  try {
    const res = await fetch('/api/admin/saas/agent/chat', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversation, providerId })
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
        if (msg.t === 'text' && typeof msg.v === 'string') { acc += msg.v; bubble.status.textContent = ''; bubble.text.textContent = acc; }
        else if (msg.t === 'tool') { bubble.status.textContent = `🔧 consultando ${TOOL_LABELS[msg.name] || msg.name}…`; }
        else if (msg.t === 'error') { acc += (acc ? '\n\n' : '') + `⚠️ ${msg.v}`; bubble.text.textContent = acc; }
        scrollBottom();
      }
    }
    if (acc.trim()) conversation.push({ role: 'assistant', content: acc });
    else bubble.text.textContent = '(sem resposta)';
  } catch (err) {
    bubble.text.textContent = `⚠️ ${err.message}`;
  } finally {
    bubble.status.textContent = '';
    sending = false; setSending(false);
  }
}
