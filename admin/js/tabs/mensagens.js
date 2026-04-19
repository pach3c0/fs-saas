import { apiGet, apiPost, apiDelete, apiPut } from '../utils/api.js';

let _mensagens = null;
let _pendentes = [];

export async function renderMensagens(container) {
  container.innerHTML = `
    <div style="max-width:720px;">
      <div style="margin-bottom:2rem;">
        <h2 style="font-size:1.25rem; font-weight:600; color:var(--text-primary);">Mensagens</h2>
        <p style="font-size:0.8125rem; color:var(--text-secondary); margin-top:0.25rem;">Contatos e depoimentos recebidos pelo seu site</p>
      </div>

      <!-- Depoimentos pendentes -->
      <div id="pendentesSection"></div>

      <!-- Contatos recebidos -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
        <h3 style="font-size:0.9375rem; font-weight:600; color:var(--text-primary);">📩 Contatos recebidos</h3>
        <span id="msgUnreadBadge" style="display:none; background:var(--accent); color:#fff; font-size:0.75rem; font-weight:600; padding:0.2rem 0.6rem; border-radius:999px;"></span>
      </div>
      <div id="msgLista"></div>
    </div>
  `;

  await Promise.all([loadPendentes(), loadMensagens()]);
}

// ── Depoimentos pendentes ──────────────────────────────────────────────────

async function loadPendentes() {
  const section = document.getElementById('pendentesSection');
  if (!section) return;
  try {
    const resp = await apiGet('/api/site/admin/depoimentos-pendentes');
    _pendentes = resp.pending || [];
  } catch (e) {
    _pendentes = [];
  }
  renderPendentes();
}

function renderPendentes() {
  const section = document.getElementById('pendentesSection');
  if (!section) return;

  if (_pendentes.length === 0) {
    section.innerHTML = '';
    return;
  }

  section.innerHTML = `
    <div style="background:var(--bg-elevated); border:1px solid var(--green); border-radius:8px; padding:1rem; margin-bottom:2rem;">
      <h4 style="color:var(--green); font-size:0.875rem; font-weight:600; margin-bottom:0.75rem;">
        ⭐ ${_pendentes.length} depoimento${_pendentes.length > 1 ? 's' : ''} aguardando aprovação
      </h4>
      <div style="display:flex; flex-direction:column; gap:0.625rem;">
        ${_pendentes.map(p => `
          <div style="background:var(--bg-surface); padding:0.75rem; border-radius:6px; border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.75rem;">
              <div style="flex:1; min-width:0;">
                <p style="font-size:0.875rem; font-weight:600; color:var(--text-primary);">${escHtml(p.name)}</p>
                <p style="font-size:0.8125rem; color:var(--text-secondary); margin-top:0.25rem; line-height:1.5;">${escHtml(p.text)}</p>
                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.375rem;">${'⭐'.repeat(Math.min(p.rating || 5, 5))} ${p.rating || 5}/5${p.email ? ` · ${escHtml(p.email)}` : ''}</p>
              </div>
              <div style="display:flex; gap:0.5rem; flex-shrink:0;">
                <button onclick="window._depAprovar('${p.id}')"
                  style="background:var(--green); color:#fff; border:none; padding:0.375rem 0.75rem; border-radius:6px; font-size:0.75rem; font-weight:600; cursor:pointer;">
                  ✓ Aprovar
                </button>
                <button onclick="window._depRejeitar('${p.id}')"
                  style="background:var(--red); color:#fff; border:none; padding:0.375rem 0.75rem; border-radius:6px; font-size:0.75rem; font-weight:600; cursor:pointer;">
                  ✕ Rejeitar
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

window._depAprovar = async function(id) {
  try {
    await apiPost(`/api/site/admin/depoimentos-pendentes/${id}/aprovar`, {});
    _pendentes = _pendentes.filter(p => p.id !== id);
    renderPendentes();
    window.showToast('Depoimento aprovado e publicado no site!', 'success');
  } catch (e) {
    window.showToast('Erro ao aprovar: ' + e.message, 'error');
  }
};

window._depRejeitar = async function(id) {
  const ok = await window.showConfirm('Rejeitar e apagar este depoimento?', { confirmText: 'Rejeitar', danger: true });
  if (!ok) return;
  try {
    await apiDelete(`/api/site/admin/depoimentos-pendentes/${id}`);
    _pendentes = _pendentes.filter(p => p.id !== id);
    renderPendentes();
    window.showToast('Depoimento rejeitado.', 'success');
  } catch (e) {
    window.showToast('Erro ao rejeitar: ' + e.message, 'error');
  }
};

// ── Contatos recebidos ─────────────────────────────────────────────────────

async function loadMensagens() {
  const lista = document.getElementById('msgLista');
  const badge = document.getElementById('msgUnreadBadge');
  if (!lista) return;

  lista.innerHTML = `<p style="color:var(--text-muted); font-size:0.875rem;">Carregando...</p>`;

  try {
    const data = await apiGet('/api/notifications');
    _mensagens = (data.notifications || []).filter(n => n.type === 'contact');

    const unread = _mensagens.filter(n => !n.read).length;
    if (badge) {
      if (unread > 0) { badge.textContent = `${unread} não lida${unread > 1 ? 's' : ''}`; badge.style.display = 'inline'; }
      else { badge.style.display = 'none'; }
    }

    if (_mensagens.length === 0) {
      lista.innerHTML = `
        <div style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">
          <div style="font-size:2.5rem; margin-bottom:0.75rem;">✉️</div>
          <p style="font-size:0.9375rem;">Nenhuma mensagem recebida ainda</p>
        </div>`;
      return;
    }

    lista.innerHTML = _mensagens.map(n => {
      const parts = parseMessage(n.message);
      const unread = !n.read;
      const date = new Date(n.createdAt).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
      return `
        <div id="msg-${n._id}" style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; margin-bottom:0.75rem; overflow:hidden; ${unread ? 'border-left:3px solid var(--accent);' : ''}">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:0.875rem 1rem; cursor:pointer;"
               onclick="window._msgToggle('${n._id}')">
            <div style="display:flex; align-items:center; gap:0.75rem; min-width:0;">
              ${unread ? `<span style="width:8px; height:8px; background:var(--accent); border-radius:50%; flex-shrink:0;"></span>` : `<span style="width:8px; height:8px; flex-shrink:0;"></span>`}
              <div style="min-width:0;">
                <p style="font-size:0.875rem; font-weight:${unread ? '600' : '400'}; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${escHtml(parts.nome)}${parts.assunto ? ` — ${escHtml(parts.assunto)}` : ''}
                </p>
                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.125rem;">${date}</p>
              </div>
            </div>
            <button onclick="event.stopPropagation(); window._msgDelete('${n._id}')"
              style="background:none; border:none; cursor:pointer; color:var(--text-muted); padding:0.25rem; border-radius:4px; flex-shrink:0;"
              title="Excluir">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
          <div id="msg-body-${n._id}" style="display:none; padding:0 1rem 1rem; border-top:1px solid var(--border);">
            <div style="margin-top:0.875rem; display:flex; flex-direction:column; gap:0.5rem;">
              ${parts.email ? `<p style="font-size:0.8125rem; color:var(--text-secondary);"><strong style="color:var(--text-primary);">E-mail:</strong> <a href="mailto:${escHtml(parts.email)}" style="color:var(--accent);">${escHtml(parts.email)}</a></p>` : ''}
              ${parts.assunto ? `<p style="font-size:0.8125rem; color:var(--text-secondary);"><strong style="color:var(--text-primary);">Assunto:</strong> ${escHtml(parts.assunto)}</p>` : ''}
              <div style="background:var(--bg-elevated); border-radius:6px; padding:0.75rem; margin-top:0.25rem;">
                <p style="font-size:0.875rem; color:var(--text-primary); line-height:1.6; white-space:pre-wrap;">${escHtml(parts.mensagem)}</p>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

  } catch (e) {
    lista.innerHTML = `<p style="color:var(--red); font-size:0.875rem;">Erro ao carregar mensagens.</p>`;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseMessage(msg) {
  const clean = msg.replace(/^📩\s*/, '');
  const nome = clean.match(/^([^(—:]+)/)?.[1]?.trim() || '';
  const email = clean.match(/\(([^)]+)\)/)?.[1]?.trim() || '';
  const assuntoMatch = clean.match(/—\s*([^:]+):/);
  const assunto = assuntoMatch ? assuntoMatch[1].trim() : '';
  const mensagemIdx = assunto ? clean.indexOf(assunto + ':') + assunto.length + 1 : clean.indexOf(':') + 1;
  const mensagem = clean.slice(mensagemIdx).trim();
  return { nome, email, assunto, mensagem };
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window._msgToggle = async function(id) {
  const body = document.getElementById(`msg-body-${id}`);
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';

  if (!isOpen) {
    const n = _mensagens?.find(m => m._id === id);
    if (n && !n.read) {
      try {
        await apiPut(`/api/notifications/${id}/read`, {});
        n.read = true;
        const card = document.getElementById(`msg-${id}`);
        if (card) {
          card.style.borderLeft = '';
          const dot = card.querySelector('span[style*="background:var(--accent)"]');
          if (dot) dot.style.background = 'transparent';
          const title = card.querySelector('p[style*="font-weight:600"]');
          if (title) title.style.fontWeight = '400';
        }
        const unread = _mensagens.filter(m => !m.read).length;
        const badge = document.getElementById('msgUnreadBadge');
        if (badge) {
          if (unread > 0) { badge.textContent = `${unread} não lida${unread > 1 ? 's' : ''}`; }
          else { badge.style.display = 'none'; }
        }
      } catch (e) { /* silencioso */ }
    }
  }
};

window._msgDelete = async function(id) {
  const ok = await window.showConfirm('Excluir esta mensagem?', { confirmText: 'Excluir', danger: true });
  if (!ok) return;
  try {
    await apiDelete(`/api/notifications/${id}`);
    _mensagens = _mensagens?.filter(m => m._id !== id) || [];
    const card = document.getElementById(`msg-${id}`);
    if (card) card.remove();
    if (_mensagens.length === 0) {
      const lista = document.getElementById('msgLista');
      if (lista) lista.innerHTML = `
        <div style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">
          <div style="font-size:2.5rem; margin-bottom:0.75rem;">✉️</div>
          <p style="font-size:0.9375rem;">Nenhuma mensagem recebida ainda</p>
        </div>`;
    }
  } catch (e) {
    window.showToast('Erro ao excluir mensagem', 'error');
  }
};
