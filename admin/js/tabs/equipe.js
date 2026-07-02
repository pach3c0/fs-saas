/**
 * Aba Equipe — gestão de usuários/assentos do negócio.
 *
 * O CliqueZoom é a fonte da verdade dos assentos: adicionar um membro grava aqui e
 * espelha no Rhyno (Gestão). A cerca é server-side (POST /api/team → 403 upgrade); esta
 * UI é vitrine. Estilos inline + tokens --ad-* (nunca Tailwind). Ver src/routes/team.js.
 */
import { apiGet, apiPost, apiPut } from '../utils/api.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

let state = { members: [], seats: { used: 0, limit: 1 } };

export async function renderEquipe(container) {
  container.innerHTML = `<div id="equipe-root" style="display:flex; flex-direction:column; gap:1.25rem;"></div>`;
  await load(container);
}

async function load(container) {
  // Guard de aba-ativa: se a Equipe foi trocada durante uma requisição em voo, o
  // #equipe-root não existe mais — não sobrescreve a aba atual (evita o clobber).
  const root = container.querySelector('#equipe-root');
  if (!root) return;
  try {
    const data = await apiGet('/api/team');
    state.members = data.members || [];
    state.seats = data.seats || { used: 0, limit: 1 };
    paint(root);
  } catch (err) {
    root.innerHTML = `<p style="color:var(--ad-red);">Erro ao carregar a equipe: ${esc(err.message)}</p>`;
  }
}

function paint(root) {
  const { used, limit } = state.seats;
  const unlimited = limit === -1;
  const full = !unlimited && used >= limit;
  const over = !unlimited && used > limit;
  const pct = unlimited ? 12 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const barColor = over ? 'var(--ad-red)' : full ? 'var(--ad-orange)' : 'var(--ad-green)';

  root.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:0.25rem;">
      <h2 style="margin:0; font-size:1.25rem; color:var(--ad-text);">Equipe</h2>
      <p style="margin:0; font-size:0.8125rem; color:var(--ad-text); opacity:0.7;">
        Usuários que acessam a Gestão do seu negócio. Cada usuário ocupa um assento do seu plano.
      </p>
    </div>

    <div style="background:var(--ad-bg-surface); border:1px solid var(--ad-border, rgba(128,128,128,0.2)); border-radius:12px; padding:1rem 1.25rem; display:flex; flex-direction:column; gap:0.625rem;">
      <div style="display:flex; justify-content:space-between; align-items:baseline;">
        <span style="font-size:0.8125rem; font-weight:600; color:var(--ad-text);">Assentos</span>
        <span style="font-size:0.8125rem; color:var(--ad-text); opacity:0.8;">
          ${unlimited ? 'Ilimitado' : `${used} de ${limit}`}${over ? ' · acima do limite' : ''}
        </span>
      </div>
      <div style="height:8px; background:var(--ad-bg-base); border-radius:999px; overflow:hidden;">
        <div style="height:100%; width:${pct}%; background:${barColor}; border-radius:999px; transition:width .3s;"></div>
      </div>
      ${over ? `<span style="font-size:0.75rem; color:var(--ad-red);">Você está acima do limite do plano. Ninguém foi removido — mas só é possível adicionar/reativar após liberar um assento ou fazer upgrade.</span>` : ''}
    </div>

    <div style="display:flex; justify-content:flex-end;">
      <button id="equipe-add" class="btn" style="
        display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 0.9rem; border-radius:8px;
        border:1px solid var(--ad-accent); background:var(--ad-accent); color:var(--ad-bg-surface);
        font-size:0.8125rem; font-weight:600; cursor:pointer;">
        + Adicionar usuário
      </button>
    </div>

    <div id="equipe-list" style="display:flex; flex-direction:column; gap:0.5rem;"></div>
  `;

  paintList(root.querySelector('#equipe-list'));

  root.querySelector('#equipe-add').onclick = () => {
    if (full) {
      window.showToast?.('Você atingiu o limite de usuários do seu plano. Veja os planos para liberar mais assentos.', 'info');
      window.switchTab?.('plano');
      return;
    }
    openAddModal(root);
  };
}

function statusBadge(m) {
  if (!m.approved) {
    // Desativado mas com espelho pendente/falho: a saída não fechou no Rhyno — sinaliza p/ retry.
    if (m.rhynoSyncStatus === 'pending' || m.rhynoSyncStatus === 'error') {
      return `<span style="font-size:0.6875rem; color:var(--ad-orange);">Desativado · sincronizando…</span>`;
    }
    return `<span style="font-size:0.6875rem; color:var(--ad-text); opacity:0.6;">Desativado</span>`;
  }
  if (m.rhynoSyncStatus === 'pending') return `<span style="font-size:0.6875rem; color:var(--ad-orange);">Sincronizando…</span>`;
  if (m.rhynoSyncStatus === 'error') return `<span style="font-size:0.6875rem; color:var(--ad-red);">Falha na sincronização</span>`;
  return `<span style="font-size:0.6875rem; color:var(--ad-green);">Ativo</span>`;
}

function paintList(list) {
  if (!state.members.length) {
    list.innerHTML = `<p style="font-size:0.8125rem; color:var(--ad-text); opacity:0.6;">Nenhum usuário ainda.</p>`;
    return;
  }
  list.innerHTML = state.members.map((m) => {
    const needsRetry = m.rhynoSyncStatus === 'pending' || m.rhynoSyncStatus === 'error';
    return `
    <div style="display:flex; align-items:center; gap:1rem; background:var(--ad-bg-surface); border:1px solid var(--ad-border, rgba(128,128,128,0.2)); border-radius:10px; padding:0.75rem 1rem;">
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span style="font-size:0.875rem; font-weight:600; color:var(--ad-text);">${esc(m.name)}</span>
          ${m.isOwner ? `<span style="font-size:0.625rem; padding:0.1rem 0.4rem; border-radius:999px; background:var(--ad-bg-base); color:var(--ad-text); opacity:0.7;">Você</span>` : ''}
        </div>
        <div style="font-size:0.75rem; color:var(--ad-text); opacity:0.6; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(m.email)}</div>
      </div>
      <div style="display:flex; align-items:center; gap:0.75rem;">
        ${statusBadge(m)}
        ${needsRetry ? `<button data-retry="${m.id}" style="font-size:0.6875rem; padding:0.25rem 0.5rem; border-radius:6px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:transparent; color:var(--ad-text); cursor:pointer;">tentar de novo</button>` : ''}
        ${m.isOwner ? '' : (m.approved
          ? `<button data-deactivate="${m.id}" style="font-size:0.6875rem; padding:0.25rem 0.5rem; border-radius:6px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:transparent; color:var(--ad-red); cursor:pointer;">Desativar</button>`
          : `<button data-reactivate="${m.id}" style="font-size:0.6875rem; padding:0.25rem 0.5rem; border-radius:6px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:transparent; color:var(--ad-green); cursor:pointer;">Reativar</button>`)}
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-retry]').forEach((b) => b.onclick = () => retrySync(b.dataset.retry));
  list.querySelectorAll('[data-deactivate]').forEach((b) => b.onclick = () => toggleMember(b.dataset.deactivate, false));
  list.querySelectorAll('[data-reactivate]').forEach((b) => b.onclick = () => toggleMember(b.dataset.reactivate, true));
}

function openAddModal(root) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:1000;';
  overlay.innerHTML = `
    <div style="background:var(--ad-bg-surface); border-radius:14px; padding:1.5rem; width:min(420px, 92vw); display:flex; flex-direction:column; gap:1rem;">
      <h3 style="margin:0; font-size:1.05rem; color:var(--ad-text);">Adicionar usuário</h3>
      <label style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:var(--ad-text); opacity:0.8;">
        Nome
        <input id="eq-name" type="text" style="padding:0.55rem 0.7rem; border-radius:8px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:var(--ad-bg-base); color:var(--ad-text); font-size:0.875rem;">
      </label>
      <label style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:var(--ad-text); opacity:0.8;">
        E-mail
        <input id="eq-email" type="email" style="padding:0.55rem 0.7rem; border-radius:8px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:var(--ad-bg-base); color:var(--ad-text); font-size:0.875rem;">
      </label>
      <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
        <button id="eq-cancel" style="padding:0.5rem 0.9rem; border-radius:8px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:transparent; color:var(--ad-text); font-size:0.8125rem; cursor:pointer;">Cancelar</button>
        <button id="eq-save" style="padding:0.5rem 0.9rem; border-radius:8px; border:1px solid var(--ad-accent); background:var(--ad-accent); color:var(--ad-bg-surface); font-size:0.8125rem; font-weight:600; cursor:pointer;">Adicionar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  overlay.querySelector('#eq-cancel').onclick = close;
  overlay.querySelector('#eq-save').onclick = async () => {
    const name = overlay.querySelector('#eq-name').value.trim();
    const email = overlay.querySelector('#eq-email').value.trim();
    if (!name || !email) { window.showToast?.('Preencha nome e e-mail.', 'warning'); return; }
    const btn = overlay.querySelector('#eq-save');
    btn.disabled = true; btn.textContent = 'Adicionando…';
    try {
      const res = await apiPost('/api/team', { name, email });
      close();
      window.showToast?.(res.warning === 'sync_pending'
        ? 'Usuário criado — sincronizando com a Gestão…'
        : 'Usuário adicionado.', 'success');
      await load(document.getElementById('tabContent') || document);
    } catch (err) {
      if (err.upgrade) {
        close();
        window.showToast?.('Você atingiu o limite de usuários do seu plano. Veja os planos para liberar mais assentos.', 'info');
        window.switchTab?.('plano');
        return;
      }
      btn.disabled = false; btn.textContent = 'Adicionar';
      window.showToast?.(err.message || 'Erro ao adicionar usuário.', 'error');
    }
  };
}

async function toggleMember(id, approved) {
  const verb = approved ? 'reativar' : 'desativar';
  const ok = await window.showConfirm?.(`Deseja ${verb} este usuário?`, { confirmText: approved ? 'Reativar' : 'Desativar' });
  if (ok === false) return;
  try {
    await apiPut(`/api/team/${id}`, { approved });
    window.showToast?.(approved ? 'Usuário reativado.' : 'Usuário desativado.', 'success');
    await load(document.getElementById('tabContent') || document);
  } catch (err) {
    if (err.upgrade) {
      window.showToast?.('Sem assentos livres no seu plano. Veja os planos para liberar mais.', 'info');
      window.switchTab?.('plano');
      return;
    }
    window.showToast?.(err.message || 'Erro ao atualizar usuário.', 'error');
  }
}

async function retrySync(id) {
  try {
    await apiPost(`/api/team/${id}/retry-sync`);
    window.showToast?.('Sincronizado com a Gestão.', 'success');
    await load(document.getElementById('tabContent') || document);
  } catch (err) {
    window.showToast?.(err.message || 'Ainda não foi possível sincronizar. Tente de novo em instantes.', 'error');
  }
}
