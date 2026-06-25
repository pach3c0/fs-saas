// Aba "Agente" — chat IA (somente leitura) + gerenciamento das IAs/chaves.
// Chat: POST /api/admin/saas/agent/chat (stream NDJSON).
// IAs:  CRUD em /api/admin/saas/agent/providers (chaves criptografadas no back).
import { apiRequest, getToken, esc, saasToast, saasConfirm } from '../core.js';
import { renderMarkdown } from '../md.js';

const TOOL_LABELS = {
  getPlatformOverview: 'visão geral da plataforma', listErrors: 'erros', listEmails: 'e-mails',
  findOrgs: 'organizações', getOrgDiagnostics: 'diagnóstico da org', getOrgJourney: 'jornada da org',
  getAuditLog: 'auditoria', getSystemStatus: 'status do sistema',
  getBusinessMetrics: 'métricas de negócio', getDomains: 'domínios',
  getIntegrationsAdoption: 'integrações (GA/Pixel)', getPendingTestimonials: 'depoimentos pendentes',
  getSalesOverview: 'motor de vendas', getTickets: 'chamados', searchManual: 'manual da plataforma',
  proposeApproveOrg: 'preparando aprovação', proposeChangePlan: 'preparando troca de plano',
  proposeReplyTicket: 'preparando resposta do chamado', proposeCreateManualModule: 'preparando módulo de manual'
};
const PROVIDER_LABELS = { anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', 'openai-compatible': 'OpenAI-compat' };
const SUGGESTIONS = ['Quais orgs estão em risco e por quê?', 'Houve algum erro nas últimas 24h?', 'Resumo de assinaturas e MRR', 'Domínios pendentes de verificação', 'Depoimentos pendentes para aprovar'];

let conversation = [];
let currentConversationId = null;
let conversations = [];
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
      <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
        <select id="agenteProviderSelect" title="IA usada nesta conversa" style="background:var(--bg-surface); color:var(--text-primary); border:1px solid var(--border); border-radius:6px; padding:0.3rem 0.5rem; font-size:0.72rem; font-family:inherit;"></select>
        <button id="agenteNovaBtn" title="Iniciar uma nova conversa" style="background:var(--accent-soft); color:var(--accent); border:1px solid var(--border); border-radius:6px; padding:0.3rem 0.5rem; font-size:0.72rem; cursor:pointer; font-family:inherit;">➕ Nova</button>
        <button id="agenteHistoricoBtn" title="Conversas anteriores" style="background:var(--bg-base); color:var(--text-primary); border:1px solid var(--border); border-radius:6px; padding:0.3rem 0.5rem; font-size:0.72rem; cursor:pointer; font-family:inherit;">🕘 Histórico</button>
        <button id="agenteResumosBtn" title="Resumos proativos da plataforma" style="background:var(--bg-base); color:var(--text-primary); border:1px solid var(--border); border-radius:6px; padding:0.3rem 0.5rem; font-size:0.72rem; cursor:pointer; font-family:inherit;">📊 Resumos</button>
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
    <div id="agenteResumos" style="display:none; background:var(--bg-base); border:1px solid var(--border); border-radius:10px; padding:1rem;"></div>
    <div id="agenteHistorico" style="display:none; background:var(--bg-base); border:1px solid var(--border); border-radius:10px; padding:1rem;"></div>
  `;

  resetMessages();
  root.querySelector('#agenteSend').onclick = () => send(root.querySelector('#agenteInput').value);
  root.querySelector('#agenteInput').onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e.target.value); } };
  root.querySelectorAll('.agente-sugg').forEach(b => { b.onclick = () => send(b.dataset.q); });
  root.querySelector('#agenteNovaBtn').onclick = newConversation;
  root.querySelector('#agenteHistoricoBtn').onclick = () => showPanel('historico');
  root.querySelector('#agenteConfigBtn').onclick = () => showPanel('config');
  root.querySelector('#agenteResumosBtn').onclick = () => showPanel('resumos');
}

// Alterna entre os painéis (chat / config / resumos / histórico). Clicar no painel ativo volta ao chat.
let currentPanel = 'chat';
function showPanel(which) {
  if (currentPanel === which && which !== 'chat') which = 'chat';
  currentPanel = which;
  const set = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? 'block' : 'none'; };
  set('agenteChatWrap', which === 'chat');
  set('agenteConfig', which === 'config');
  set('agenteResumos', which === 'resumos');
  set('agenteHistorico', which === 'historico');
  if (which === 'config') { editingId = null; renderConfig(); }
  if (which === 'resumos') renderResumos();
  if (which === 'historico') renderHistorico();
}

function resetMessages() {
  const list = document.getElementById('agenteMessages');
  if (list) list.innerHTML = `<div data-ph="1" style="margin:auto; text-align:center; color:var(--text-secondary); font-size:0.8rem;">Faça uma pergunta para começar.<br>O agente consulta os dados reais antes de responder.</div>`;
}

// ── Histórico de conversas ───────────────────────────────────────────────────
function newConversation() {
  conversation = [];
  currentConversationId = null;
  resetMessages();
  document.getElementById('agenteSuggestions')?.style.setProperty('display', 'flex');
  showPanel('chat');
  document.getElementById('agenteInput')?.focus();
}

// Persiste a conversa atual (cria na 1ª vez, atualiza depois). Best-effort — não trava o chat.
async function persistConversation() {
  if (conversation.length < 2) return;
  try {
    const r = await apiRequest('POST', '/api/admin/saas/agent/conversations', { id: currentConversationId, messages: conversation });
    if (r.id) currentConversationId = r.id;
  } catch { /* silencioso */ }
}

async function renderHistorico() {
  const box = document.getElementById('agenteHistorico');
  if (!box) return;
  box.innerHTML = `<div style="font-size:0.8rem; color:var(--text-secondary);">Carregando…</div>`;
  try {
    const r = await apiRequest('GET', '/api/admin/saas/agent/conversations');
    conversations = r.conversations || [];
  } catch (e) {
    box.innerHTML = `<div style="font-size:0.8rem; color:#f87171;">Erro: ${esc(e.message)}</div>`;
    return;
  }
  const items = conversations.length ? conversations.map(c => `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; background:var(--bg-surface); border:1px solid ${c.id === currentConversationId ? 'var(--accent)' : 'var(--border)'}; border-radius:8px; padding:0.55rem 0.7rem; margin-bottom:0.4rem;">
      <button data-act="open" data-id="${c.id}" style="flex:1; min-width:0; text-align:left; background:none; border:none; cursor:pointer; color:var(--text-primary); font-family:inherit;">
        <div style="font-size:0.82rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(c.title)}</div>
        <div style="font-size:0.68rem; color:var(--text-secondary);">${new Date(c.updatedAt).toLocaleString('pt-BR')} · ${c.messageCount} msgs</div>
      </button>
      <button data-act="del" data-id="${c.id}" title="Excluir conversa" style="flex-shrink:0; background:var(--bg-base); color:#f87171; border:1px solid var(--border); border-radius:6px; padding:0.25rem 0.5rem; font-size:0.72rem; cursor:pointer;">🗑</button>
    </div>`).join('') : `<div style="font-size:0.78rem; color:var(--text-secondary);">Nenhuma conversa salva ainda.</div>`;

  box.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.7rem;">
      <h3 style="margin:0; font-size:0.95rem; color:var(--text-primary);">🕘 Histórico de conversas</h3>
      <button id="histClose" style="background:none; border:none; color:var(--text-secondary); font-size:1.1rem; cursor:pointer;">✕</button>
    </div>
    <button id="histNova" style="font-size:0.8rem; background:var(--accent); color:#fff; border:none; border-radius:7px; padding:0.4rem 1rem; font-weight:600; cursor:pointer; margin-bottom:0.8rem;">➕ Nova conversa</button>
    <div>${items}</div>
  `;
  box.querySelector('#histClose').onclick = () => showPanel('chat');
  box.querySelector('#histNova').onclick = newConversation;
  box.querySelectorAll('[data-act]').forEach(b => {
    b.onclick = () => (b.dataset.act === 'open' ? loadConversation(b.dataset.id) : deleteConversation(b.dataset.id));
  });
}

async function loadConversation(id) {
  try {
    const r = await apiRequest('GET', `/api/admin/saas/agent/conversations/${id}`);
    conversation = (r.conversation?.messages || []).map(m => ({ role: m.role, content: m.content }));
    currentConversationId = r.conversation?.id || id;
    renderConversationMessages();
    document.getElementById('agenteSuggestions')?.style.setProperty('display', 'none');
    showPanel('chat');
  } catch (e) { saasToast(e.message, 'error'); }
}

async function deleteConversation(id) {
  if (!(await saasConfirm('Excluir esta conversa?', { title: 'Excluir conversa', confirmText: 'Excluir', danger: true }))) return;
  try {
    await apiRequest('DELETE', `/api/admin/saas/agent/conversations/${id}`);
    if (id === currentConversationId) { conversation = []; currentConversationId = null; resetMessages(); }
    saasToast('Conversa excluída', 'success');
    renderHistorico();
  } catch (e) { saasToast(e.message, 'error'); }
}

// Redesenha as bolhas a partir do array `conversation` (ao abrir uma conversa salva).
function renderConversationMessages() {
  const list = document.getElementById('agenteMessages');
  if (!list) return;
  list.innerHTML = '';
  conversation.forEach(m => {
    const b = appendBubble(m.role);
    if (m.role === 'user') b.text.textContent = m.content;
    else b.text.innerHTML = renderMarkdown(m.content);
  });
  scrollBottom();
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

function renderConfig() {
  const cfg = document.getElementById('agenteConfig');
  if (!cfg) return;
  const cards = providers.length ? providers.map(p => `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.55rem 0.7rem; margin-bottom:0.4rem;">
      <div style="min-width:0;">
        <div style="font-size:0.82rem; color:var(--text-primary); font-weight:600;">${esc(p.label)} ${p.isActive ? '<span style="font-size:0.65rem; color:var(--accent); border:1px solid var(--accent); border-radius:999px; padding:0 0.4rem; margin-left:0.3rem;">ativa</span>' : ''}</div>
        <div style="font-size:0.7rem; color:var(--text-secondary);">${PROVIDER_LABELS[p.provider] || p.provider} · ${esc(p.model)} · chave ····${esc(p.apiKeyLast4 || '????')}${p.baseURL ? ' · ' + esc(p.baseURL) : ''}${(p.priceInput != null || p.priceOutput != null) ? ` · 💵 $${p.priceInput ?? '?'}/$${p.priceOutput ?? '?'} por M tok` : ''}</div>
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
        <input id="cfgPriceIn" type="number" step="0.01" min="0" placeholder="US$/M tok entrada (opcional)" value="${editing && editing.priceInput != null ? editing.priceInput : ''}" style="${inp}">
        <input id="cfgPriceOut" type="number" step="0.01" min="0" placeholder="US$/M tok saída (opcional)" value="${editing && editing.priceOutput != null ? editing.priceOutput : ''}" style="${inp}">
      </div>
      <div style="font-size:0.68rem; color:var(--text-secondary); margin-top:0.35rem;">As tarifas são opcionais e servem só para estimar o custo por conversa (deixe em branco se não souber).</div>
      <div style="display:flex; align-items:center; gap:0.6rem; margin-top:0.6rem;">
        <label style="font-size:0.74rem; color:var(--text-secondary); display:flex; align-items:center; gap:0.3rem;"><input type="checkbox" id="cfgActive" ${editing && editing.isActive ? 'checked' : ''}> tornar ativa</label>
        <div style="flex:1;"></div>
        ${editing ? `<button id="cfgCancel" style="font-size:0.78rem; background:var(--bg-base); color:var(--text-primary); border:1px solid var(--border); border-radius:7px; padding:0.4rem 0.8rem; cursor:pointer;">Cancelar</button>` : ''}
        <button id="cfgSave" style="font-size:0.8rem; background:var(--accent); color:#fff; border:none; border-radius:7px; padding:0.4rem 1rem; font-weight:600; cursor:pointer;">${editing ? 'Salvar' : 'Adicionar'}</button>
      </div>
    </div>
  `;

  cfg.querySelector('#agenteCfgClose').onclick = () => showPanel('chat');
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
  const priceInput = document.getElementById('cfgPriceIn').value.trim();
  const priceOutput = document.getElementById('cfgPriceOut').value.trim();
  const isActive = document.getElementById('cfgActive').checked;

  if (!label || !model) return saasToast('Preencha rótulo e modelo', 'error');
  if (!editingId && !apiKey) return saasToast('Informe a chave de API', 'error');
  if (provider === 'openai-compatible' && !baseURL) return saasToast('baseURL é obrigatório para openai-compatible', 'error');

  const body = { provider, label, model, baseURL, isActive, priceInput, priceOutput };
  if (apiKey) body.apiKey = apiKey;
  try {
    if (editingId) await apiRequest('PUT', `/api/admin/saas/agent/providers/${editingId}`, body);
    else await apiRequest('POST', '/api/admin/saas/agent/providers', body);
    saasToast(editingId ? 'IA salva' : 'IA adicionada', 'success');
    editingId = null;
    await refreshProviders();
  } catch (e) { saasToast(e.message, 'error'); }
}

// ── Resumos (digest proativo) ───────────────────────────────────────────────
let settings = null;
let digests = [];
let runningDigest = false;

async function renderResumos() {
  const box = document.getElementById('agenteResumos');
  if (!box) return;
  box.innerHTML = `<div style="font-size:0.8rem; color:var(--text-secondary);">Carregando…</div>`;
  try {
    const [s, d] = await Promise.all([
      apiRequest('GET', '/api/admin/saas/agent/settings'),
      apiRequest('GET', '/api/admin/saas/agent/digests')
    ]);
    settings = s.settings || {};
    digests = d.digests || [];
  } catch (e) {
    box.innerHTML = `<div style="font-size:0.8rem; color:#f87171;">Erro ao carregar: ${esc(e.message)}</div>`;
    return;
  }
  drawResumos();
}

const PERIOD_PT = { daily: 'diário', weekly: 'semanal' };
const TRIGGER_PT = { scheduled: 'agendado', manual: 'manual' };

function drawResumos() {
  const box = document.getElementById('agenteResumos');
  if (!box) return;
  const s = settings || {};
  const inp = 'background:var(--bg-surface); color:var(--text-primary); border:1px solid var(--border); border-radius:6px; padding:0.4rem 0.6rem; font-size:0.8rem; font-family:inherit;';
  const lastTxt = s.lastDigestAt ? new Date(s.lastDigestAt).toLocaleString('pt-BR') : 'nunca';

  const list = digests.length ? digests.map(d => `
    <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.6rem 0.75rem; margin-bottom:0.5rem;">
      <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap; margin-bottom:0.35rem;">
        <span style="font-size:0.74rem; color:var(--text-primary); font-weight:600;">${new Date(d.createdAt).toLocaleString('pt-BR')}</span>
        <span style="font-size:0.62rem; color:var(--text-secondary); border:1px solid var(--border); border-radius:999px; padding:0 0.4rem;">${PERIOD_PT[d.period] || d.period}</span>
        <span style="font-size:0.62rem; color:var(--text-secondary); border:1px solid var(--border); border-radius:999px; padding:0 0.4rem;">${TRIGGER_PT[d.trigger] || d.trigger}</span>
        ${d.emailedTo ? `<span style="font-size:0.62rem; color:var(--accent);">📧 ${esc(d.emailedTo)}</span>` : ''}
        <button data-digest="${d.id}" title="Excluir resumo" style="margin-left:auto; background:var(--bg-base); color:#f87171; border:1px solid var(--border); border-radius:6px; padding:0.1rem 0.45rem; font-size:0.72rem; cursor:pointer;">🗑</button>
      </div>
      <div class="agente-md" style="font-size:0.8rem; color:var(--text-primary); word-break:break-word;">${renderMarkdown(d.text)}</div>
    </div>`).join('') : `<div style="font-size:0.78rem; color:var(--text-secondary);">Nenhum resumo gerado ainda. Use "Gerar agora" para criar o primeiro.</div>`;

  box.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.7rem;">
      <h3 style="margin:0; font-size:0.95rem; color:var(--text-primary);">📊 Resumos da plataforma</h3>
      <button id="resClose" style="background:none; border:none; color:var(--text-secondary); font-size:1.1rem; cursor:pointer;">✕</button>
    </div>

    <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.75rem; margin-bottom:0.8rem;">
      <div style="font-size:0.8rem; color:var(--text-primary); font-weight:600; margin-bottom:0.55rem;">Automação</div>
      <div style="display:flex; flex-wrap:wrap; align-items:center; gap:0.9rem;">
        <label style="font-size:0.78rem; color:var(--text-primary); display:flex; align-items:center; gap:0.35rem;"><input type="checkbox" id="resEnabled" ${s.digestEnabled ? 'checked' : ''}> gerar automaticamente</label>
        <label style="font-size:0.78rem; color:var(--text-secondary); display:flex; align-items:center; gap:0.35rem;">frequência
          <select id="resFreq" style="${inp}">
            <option value="daily" ${s.digestFrequency === 'daily' ? 'selected' : ''}>diário</option>
            <option value="weekly" ${s.digestFrequency === 'weekly' ? 'selected' : ''}>semanal</option>
          </select>
        </label>
        <label style="font-size:0.78rem; color:var(--text-primary); display:flex; align-items:center; gap:0.35rem;"><input type="checkbox" id="resEmail" ${s.digestEmail ? 'checked' : ''}> enviar por e-mail ao dono</label>
        <button id="resSave" style="font-size:0.8rem; background:var(--accent); color:#fff; border:none; border-radius:7px; padding:0.4rem 1rem; font-weight:600; cursor:pointer;">Salvar</button>
      </div>
      <div style="font-size:0.68rem; color:var(--text-secondary); margin-top:0.5rem;">Último resumo: ${lastTxt}. A verificação roda a cada 6h e gera no máximo 1 por ${s.digestFrequency === 'weekly' ? 'semana' : 'dia'}.</div>
    </div>

    <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.75rem; margin-bottom:0.8rem;">
      <div style="font-size:0.8rem; color:var(--text-primary); font-weight:600; margin-bottom:0.4rem;">Comportamento do agente</div>
      <div style="font-size:0.68rem; color:var(--text-secondary); margin-bottom:0.5rem;">Instruções que entram no prompt do chat (tom, formato, o que evitar). Ex.: "Seja conciso e direto", "Responda em tópicos", "Não ofereça próximos passos a menos que eu peça".</div>
      <textarea id="resInstructions" rows="4" placeholder="Ex.: Seja direto e conciso. Vá ao ponto e não faça varreduras longas sem eu pedir." style="${inp} width:100%; box-sizing:border-box; resize:vertical;">${esc(s.customInstructions || '')}</textarea>
      <div style="display:flex; justify-content:flex-end; margin-top:0.5rem;">
        <button id="resSaveInstr" style="font-size:0.8rem; background:var(--accent); color:#fff; border:none; border-radius:7px; padding:0.4rem 1rem; font-weight:600; cursor:pointer;">Salvar instruções</button>
      </div>
    </div>

    <div style="display:flex; align-items:center; gap:0.7rem; margin-bottom:0.9rem; flex-wrap:wrap;">
      <button id="resRun" style="font-size:0.8rem; background:var(--accent-soft); color:var(--accent); border:1px solid var(--border); border-radius:7px; padding:0.45rem 1rem; font-weight:600; cursor:pointer;">⚡ Gerar agora</button>
      <label style="font-size:0.74rem; color:var(--text-secondary); display:flex; align-items:center; gap:0.3rem;"><input type="checkbox" id="resRunEmail"> também enviar por e-mail</label>
      <span id="resRunStatus" style="font-size:0.74rem; color:var(--text-secondary);"></span>
      ${digests.length ? `<button id="resClear" style="margin-left:auto; font-size:0.74rem; background:var(--bg-base); color:#f87171; border:1px solid var(--border); border-radius:7px; padding:0.4rem 0.8rem; cursor:pointer;">🗑 Limpar todos</button>` : ''}
    </div>

    <div id="resList">${list}</div>
  `;

  box.querySelector('#resClose').onclick = () => showPanel('chat');
  box.querySelector('#resSave').onclick = saveSettings;
  box.querySelector('#resSaveInstr').onclick = saveSettings;
  box.querySelector('#resRun').onclick = runDigestNow;
  const clearBtn = box.querySelector('#resClear');
  if (clearBtn) clearBtn.onclick = clearDigests;
  box.querySelectorAll('[data-digest]').forEach(b => { b.onclick = () => deleteDigest(b.dataset.digest); });
}

async function deleteDigest(id) {
  if (!(await saasConfirm('Excluir este resumo?', { title: 'Excluir resumo', confirmText: 'Excluir', danger: true }))) return;
  try {
    await apiRequest('DELETE', `/api/admin/saas/agent/digests/${id}`);
    digests = digests.filter(d => d.id !== id);
    saasToast('Resumo excluído', 'success');
    drawResumos();
  } catch (e) { saasToast(e.message, 'error'); }
}

async function clearDigests() {
  if (!(await saasConfirm('Excluir TODOS os resumos? Não dá pra desfazer.', { title: 'Limpar resumos', confirmText: 'Excluir todos', danger: true }))) return;
  try {
    await apiRequest('DELETE', '/api/admin/saas/agent/digests');
    digests = [];
    saasToast('Resumos excluídos', 'success');
    drawResumos();
  } catch (e) { saasToast(e.message, 'error'); }
}

async function saveSettings() {
  const body = {
    digestEnabled: document.getElementById('resEnabled').checked,
    digestFrequency: document.getElementById('resFreq').value,
    digestEmail: document.getElementById('resEmail').checked,
    customInstructions: document.getElementById('resInstructions')?.value ?? ''
  };
  try {
    const r = await apiRequest('PUT', '/api/admin/saas/agent/settings', body);
    settings = r.settings || settings;
    saasToast('Configuração salva', 'success');
    drawResumos();
  } catch (e) { saasToast(e.message, 'error'); }
}

async function runDigestNow() {
  if (runningDigest) return;
  runningDigest = true;
  const btn = document.getElementById('resRun');
  const status = document.getElementById('resRunStatus');
  const sendMail = document.getElementById('resRunEmail')?.checked === true;
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
  if (status) status.textContent = 'gerando… (pode levar alguns segundos)';
  try {
    const r = await apiRequest('POST', '/api/admin/saas/agent/digest/run', { sendMail });
    if (r.digest) digests.unshift(r.digest);
    saasToast('Resumo gerado', 'success');
    drawResumos();
  } catch (e) {
    saasToast(e.message, 'error');
    if (status) status.textContent = '';
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  } finally {
    runningDigest = false;
  }
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
  if (!isUser) text.className = 'agente-md'; // respostas do agente vêm em markdown
  const usage = document.createElement('div');
  usage.style.cssText = 'font-size:0.68rem; color:var(--text-secondary); margin-top:0.4rem; padding-top:0.3rem; border-top:1px dashed var(--border); display:none;';
  wrap.appendChild(status); wrap.appendChild(text); wrap.appendChild(usage);
  list.appendChild(wrap);
  scrollBottom();
  return { status, text, usage, wrap };
}

// Cartão de ação proposta pelo agente. A execução só ocorre no clique "Confirmar"
// (chama o endpoint que revalida + audita) — a LLM nunca executa.
const fmtState = (obj) => Object.entries(obj || {}).map(([k, v]) => `${k}: ${v}`).join(', ');

function renderActionCard(bubble, action) {
  const card = document.createElement('div');
  card.style.cssText = 'margin-top:0.6rem; border:1px solid var(--accent); border-radius:8px; padding:0.6rem 0.7rem; background:var(--accent-soft);';
  const beforeAfter = (action.before && action.after)
    ? `<div style="font-size:0.7rem; color:var(--text-secondary); margin-top:0.2rem;">${esc(fmtState(action.before))} → <strong>${esc(fmtState(action.after))}</strong></div>` : '';
  card.innerHTML = `
    <div style="font-size:0.74rem; font-weight:700; color:var(--text-primary);">⚠️ Ação aguardando confirmação</div>
    <div style="font-size:0.8rem; color:var(--text-primary); margin-top:0.25rem;">${esc(action.summary || '')}</div>
    ${beforeAfter}
    <div class="acStatus" style="font-size:0.72rem; color:var(--text-secondary); margin-top:0.45rem; min-height:1em;"></div>
    <div class="acBtns" style="display:flex; gap:0.4rem; margin-top:0.5rem;">
      <button class="acConfirm" style="font-size:0.75rem; background:var(--accent); color:#fff; border:none; border-radius:6px; padding:0.35rem 0.9rem; font-weight:600; cursor:pointer; font-family:inherit;">Confirmar</button>
      <button class="acCancel" style="font-size:0.75rem; background:var(--bg-base); color:var(--text-primary); border:1px solid var(--border); border-radius:6px; padding:0.35rem 0.9rem; cursor:pointer; font-family:inherit;">Cancelar</button>
    </div>`;
  bubble.wrap.appendChild(card);
  scrollBottom();

  const statusEl = card.querySelector('.acStatus');
  const btns = card.querySelector('.acBtns');
  card.querySelector('.acCancel').onclick = () => { btns.style.display = 'none'; statusEl.textContent = 'Cancelado.'; card.style.borderColor = 'var(--border)'; };
  card.querySelector('.acConfirm').onclick = async () => {
    btns.querySelectorAll('button').forEach(b => { b.disabled = true; b.style.opacity = '0.5'; });
    statusEl.style.color = 'var(--text-secondary)';
    statusEl.textContent = 'Executando…';
    try {
      const r = await apiRequest('POST', '/api/admin/saas/agent/action/execute', { type: action.type, params: action.params });
      btns.style.display = 'none';
      statusEl.style.color = 'var(--text-primary)';
      statusEl.textContent = `✓ ${r.message || 'Ação executada.'}`;
      card.style.borderColor = 'var(--border)';
      saasToast(r.noChange ? 'Nada a alterar' : 'Ação executada', 'success');
    } catch (e) {
      statusEl.style.color = '#f87171';
      statusEl.textContent = `⚠️ ${e.message}`;
      btns.querySelectorAll('button').forEach(b => { b.disabled = false; b.style.opacity = '1'; });
    }
  };
}

function scrollBottom() { const l = document.getElementById('agenteMessages'); if (l) l.scrollTop = l.scrollHeight; }
function setSending(on) {
  const btn = document.getElementById('agenteSend');
  if (btn) { btn.disabled = on; btn.style.opacity = on ? '0.5' : '1'; btn.textContent = on ? '…' : 'Enviar'; }
}

// Linha de uso/custo sob a resposta (custo só aparece se a IA tiver tarifa cadastrada).
function renderUsage(el, msg) {
  if (!el) return;
  const toks = [];
  if (msg.input != null) toks.push(`↑ ${msg.input}`);
  if (msg.output != null) toks.push(`↓ ${msg.output}`);
  let line = toks.length ? `${toks.join('  ')} tokens` : '';
  if (msg.cost != null) line += `${line ? ' · ' : ''}≈ US$ ${Number(msg.cost).toFixed(4)}`;
  if (!line) return;
  el.textContent = line;
  el.style.display = 'block';
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
        if (msg.t === 'text' && typeof msg.v === 'string') { acc += msg.v; bubble.status.textContent = ''; bubble.text.innerHTML = renderMarkdown(acc); }
        else if (msg.t === 'tool') { bubble.status.textContent = `🔧 consultando ${TOOL_LABELS[msg.name] || msg.name}…`; }
        else if (msg.t === 'action' && msg.action) { renderActionCard(bubble, msg.action); }
        else if (msg.t === 'usage') { renderUsage(bubble.usage, msg); }
        else if (msg.t === 'error') { acc += (acc ? '\n\n' : '') + `⚠️ ${msg.v}`; bubble.text.innerHTML = renderMarkdown(acc); }
        scrollBottom();
      }
    }
    if (acc.trim()) { conversation.push({ role: 'assistant', content: acc }); await persistConversation(); }
    else bubble.text.textContent = '(sem resposta)';
  } catch (err) {
    bubble.text.textContent = `⚠️ ${err.message}`;
  } finally {
    bubble.status.textContent = '';
    sending = false; setSending(false);
  }
}
