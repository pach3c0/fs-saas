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

// Espelho de src/services/memberPermissions.js (MODULES). Módulos por-área para os checkboxes
// de permissão do membro (Slice 2, modelo Controle de Acesso do Rhyno). Manter em sincronia.
const PERM_GROUPS = [
  { group: 'Operacional', items: [
    { key: 'sessoes', label: 'Sessões' },
    { key: 'clientes', label: 'Clientes' },
    { key: 'mensagens', label: 'Mensagens' },
    { key: 'crm', label: 'CRM / Gestão' },
  ] },
  { group: 'Site & Marketing', items: [
    { key: 'meu_site', label: 'Meu Site' },
    { key: 'marketing', label: 'Marketing' },
    { key: 'integracoes', label: 'Integrações' },
    { key: 'marca_dagua', label: "Marca d'água" },
  ] },
  { group: 'Conta & Negócio', items: [
    { key: 'plano', label: 'Plano / Cobrança' },
    { key: 'dominio', label: 'Domínio' },
    { key: 'equipe', label: 'Equipe' },
    { key: 'configuracoes', label: 'Configurações' },
    { key: 'perfil', label: 'Perfil do negócio' },
  ] },
];

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
        ${(!m.isOwner && m.approved) ? `<button data-invite="${m.id}" style="font-size:0.6875rem; padding:0.25rem 0.5rem; border-radius:6px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:transparent; color:var(--ad-text); cursor:pointer;">Convidar</button>` : ''}
        ${(!m.isOwner && m.approved) ? `<button data-perms="${m.id}" style="font-size:0.6875rem; padding:0.25rem 0.5rem; border-radius:6px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:transparent; color:var(--ad-text); cursor:pointer;">Permissões</button>` : ''}
        ${m.isOwner ? '' : (m.approved
          ? `<button data-deactivate="${m.id}" style="font-size:0.6875rem; padding:0.25rem 0.5rem; border-radius:6px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:transparent; color:var(--ad-red); cursor:pointer;">Desativar</button>`
          : `<button data-reactivate="${m.id}" style="font-size:0.6875rem; padding:0.25rem 0.5rem; border-radius:6px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:transparent; color:var(--ad-green); cursor:pointer;">Reativar</button>`)}
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-retry]').forEach((b) => b.onclick = () => retrySync(b.dataset.retry));
  list.querySelectorAll('[data-invite]').forEach((b) => b.onclick = () => invite(b.dataset.invite));
  list.querySelectorAll('[data-perms]').forEach((b) => b.onclick = () => openPermsModal(b.dataset.perms));
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
  // Visão do fotógrafo: linguagem simples, sem expor a divisão CZ↔Gestão. A proteção do
  // vínculo (não destruir usuário pré-existente no Rhyno) é server-side (rhynoManaged);
  // aqui, desativar = liberar o assento. O selo "Vínculo Gestão" vive só no Super Admin.
  const msg = approved ? 'Deseja reativar este usuário?' : 'Deseja desativar este usuário? Isso libera o assento.';
  const ok = await window.showConfirm?.(msg, { confirmText: approved ? 'Reativar' : 'Desativar' });
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

// Gera o link de acesso do membro (definir senha) e abre o modal p/ copiar/compartilhar.
async function invite(id) {
  try {
    const res = await apiPost(`/api/team/${id}/invite`);
    showInviteLink(res.inviteUrl);
  } catch (err) {
    window.showToast?.(err.message || 'Erro ao gerar o convite.', 'error');
  }
}

// Modal com o link de acesso + "copiar". No beta o e-mail é suprimido, então este link é o
// caminho real de teste; em prod o membro também recebe por e-mail. O link vale 7 dias.
function showInviteLink(url) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:1000;';
  overlay.innerHTML = `
    <div style="background:var(--ad-bg-surface); border-radius:14px; padding:1.5rem; width:min(520px, 92vw); display:flex; flex-direction:column; gap:1rem;">
      <h3 style="margin:0; font-size:1.05rem; color:var(--ad-text);">Link de acesso</h3>
      <p style="margin:0; font-size:0.8125rem; color:var(--ad-text); opacity:0.75;">
        Envie este link para o usuário definir a senha e acessar. Também enviamos por e-mail. O link vale 7 dias.
      </p>
      <input id="eq-invite-url" type="text" readonly value="${esc(url)}" style="padding:0.55rem 0.7rem; border-radius:8px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:var(--ad-bg-base); color:var(--ad-text); font-size:0.8125rem; width:100%; box-sizing:border-box;">
      <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
        <button id="eq-invite-close" style="padding:0.5rem 0.9rem; border-radius:8px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:transparent; color:var(--ad-text); font-size:0.8125rem; cursor:pointer;">Fechar</button>
        <button id="eq-invite-copy" style="padding:0.5rem 0.9rem; border-radius:8px; border:1px solid var(--ad-accent); background:var(--ad-accent); color:var(--ad-bg-surface); font-size:0.8125rem; font-weight:600; cursor:pointer;">Copiar link</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  overlay.querySelector('#eq-invite-close').onclick = close;
  overlay.querySelector('#eq-invite-copy').onclick = async () => {
    const input = overlay.querySelector('#eq-invite-url');
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      input.select();
      document.execCommand?.('copy');
    }
    window.showToast?.('Link copiado.', 'success');
  };
}

// Modal de permissões por-módulo do membro (Slice 2). Checkboxes agrupados, pré-marcados
// pelas permissões EFETIVAS (vindas do GET /api/team). Salva o OBJETO INTEIRO (padrão ERP1)
// via PUT /api/team/:id/permissions; efeito vale na hora (o gate no back lê do DB).
function openPermsModal(id) {
  const member = state.members.find((m) => String(m.id) === String(id));
  if (!member) return;
  const perms = member.permissions || {};
  const groupsHtml = PERM_GROUPS.map((g) => `
    <div style="display:flex; flex-direction:column; gap:0.35rem;">
      <span style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:var(--ad-text); opacity:0.55;">${esc(g.group)}</span>
      ${g.items.map((it) => `
        <label style="display:flex; align-items:center; gap:0.55rem; font-size:0.8125rem; color:var(--ad-text); cursor:pointer; padding:0.2rem 0;">
          <input type="checkbox" data-perm-key="${esc(it.key)}" ${perms[it.key] === true ? 'checked' : ''} style="width:16px; height:16px; accent-color:var(--ad-accent); cursor:pointer;">
          ${esc(it.label)}
        </label>`).join('')}
    </div>`).join('');

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:1000; padding:1rem;';
  overlay.innerHTML = `
    <div style="background:var(--ad-bg-surface); border-radius:14px; padding:1.5rem; width:min(480px, 92vw); max-height:88vh; overflow-y:auto; display:flex; flex-direction:column; gap:1rem;">
      <div style="display:flex; flex-direction:column; gap:0.2rem;">
        <h3 style="margin:0; font-size:1.05rem; color:var(--ad-text);">Permissões de ${esc(member.name)}</h3>
        <p style="margin:0; font-size:0.75rem; color:var(--ad-text); opacity:0.65;">Escolha o que este usuário pode acessar. O titular tem acesso total.</p>
      </div>
      <div style="display:flex; flex-direction:column; gap:1rem;">${groupsHtml}</div>
      <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
        <button id="perm-cancel" style="padding:0.5rem 0.9rem; border-radius:8px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:transparent; color:var(--ad-text); font-size:0.8125rem; cursor:pointer;">Cancelar</button>
        <button id="perm-save" style="padding:0.5rem 0.9rem; border-radius:8px; border:1px solid var(--ad-accent); background:var(--ad-accent); color:var(--ad-bg-surface); font-size:0.8125rem; font-weight:600; cursor:pointer;">Salvar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  overlay.querySelector('#perm-cancel').onclick = close;
  overlay.querySelector('#perm-save').onclick = async () => {
    const permissions = {};
    overlay.querySelectorAll('[data-perm-key]').forEach((cb) => { permissions[cb.dataset.permKey] = cb.checked; });
    const btn = overlay.querySelector('#perm-save');
    btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      await apiPut(`/api/team/${id}/permissions`, { permissions });
      close();
      window.showToast?.('Permissões atualizadas.', 'success');
      await load(document.getElementById('tabContent') || document);
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Salvar';
      window.showToast?.(err.message || 'Erro ao salvar permissões.', 'error');
    }
  };
}
