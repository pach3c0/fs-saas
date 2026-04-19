import { apiGet } from '../utils/api.js';

let _mensagens = null;

export async function renderMensagens(container) {
  container.innerHTML = `
    <div style="max-width:720px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem;">
        <div>
          <h2 style="font-size:1.25rem; font-weight:600; color:var(--text-primary);">Mensagens</h2>
          <p style="font-size:0.8125rem; color:var(--text-secondary); margin-top:0.25rem;">Contatos recebidos pelo formulário do seu site</p>
        </div>
        <span id="msgUnreadBadge" style="display:none; background:var(--accent); color:#fff; font-size:0.75rem; font-weight:600; padding:0.2rem 0.6rem; border-radius:999px;"></span>
      </div>
      <div id="msgLista"></div>
    </div>
  `;
  await loadMensagens();
}

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

    lista.innerHTML = _mensagens.map((n, idx) => {
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

function parseMessage(msg) {
  // Formato: "📩 Nome (email) — Assunto: Mensagem"
  // Remove emoji prefix
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
        const { apiPut } = await import('../utils/api.js');
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
    const { apiDelete } = await import('../utils/api.js');
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
