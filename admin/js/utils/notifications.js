/**
 * Sistema de notificações do admin — topbar
 * - Clicar na notificação: navega + marca como lida automaticamente
 * - Ações por item (aparecem no hover): marcar lida/não lida · excluir
 * - Ações globais: marcar todas lidas · excluir todas
 */

import { appState } from '../state.js';

const NOTIF_ICONS = {
  session_accessed:       '👁️',
  selection_started:      '🎯',
  selection_submitted:    '✅',
  selection_delivered:    '🎉',
  extra_photos_requested: '📸',
  reopen_requested:       '🔄',
  comment_added:          '💬',
  contact:                '📩',
  depoimento_pendente:    '⭐',
  storage_expiring:       '⏰',
  storage_deleted:        '📦'
};

let pollingInterval = null;
let dropdownOpen = false;

export function startNotificationPolling() {
  loadBadge();
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(loadBadge, 30000);
}

export function stopNotificationPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

async function loadBadge() {
  if (!appState.authToken) return;
  try {
    const res = await fetch(`/api/notifications/unread-count?_=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    _updateBadge(data.count || 0);
  } catch { /* ignore */ }
}

function _updateBadge(count) {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

export async function toggleNotifications() {
  const dropdown = document.getElementById('notifDropdown');
  if (!dropdown) return;
  dropdownOpen = !dropdownOpen;
  dropdown.style.display = dropdownOpen ? 'block' : 'none';
  if (dropdownOpen) await _renderList();
}

async function _renderList() {
  const list = document.getElementById('notifList');
  if (!list) return;
  list.innerHTML = '<p style="color:var(--text-muted); font-size:0.75rem; text-align:center; padding:1.5rem;">Carregando…</p>';

  try {
    const res = await fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    if (!res.ok) { list.innerHTML = _errorHtml(); return; }
    const data = await res.json();
    const notifications = data.notifications || [];

    list.innerHTML = '';
    if (notifications.length === 0) {
      list.innerHTML = _emptyHtml();
      return;
    }
    notifications.forEach(n => list.appendChild(_buildItem(n)));
  } catch {
    list.innerHTML = _errorHtml();
  }
}

function _buildItem(n) {
  const icon = NOTIF_ICONS[n.type] || '🔔';
  const unread = !n.read;

  const row = document.createElement('div');
  row.dataset.notifId = n._id;
  row.style.cssText = `
    padding: 0.5rem 0.875rem;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: flex-start; gap: 0.5rem;
    position: relative;
    background: ${unread ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'transparent'};
    transition: background 0.1s;
  `;

  // Ponto de não-lida
  const dot = document.createElement('span');
  dot.style.cssText = `
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--accent); flex-shrink: 0; margin-top: 0.35rem;
    display: ${unread ? 'block' : 'none'};
  `;

  // Ícone
  const iconEl = document.createElement('span');
  iconEl.textContent = icon;
  iconEl.style.cssText = 'font-size:1rem; flex-shrink:0; cursor:pointer;';

  // Texto
  const textWrap = document.createElement('div');
  textWrap.style.cssText = 'flex:1; min-width:0; cursor:pointer;';
  textWrap.innerHTML = `
    <p style="font-size:0.75rem; color:${unread ? 'var(--text-primary)' : 'var(--text-secondary)'}; ${unread ? 'font-weight:600;' : ''} line-height:1.4; margin:0;">${_esc(n.message)}</p>
    <p style="font-size:0.625rem; color:var(--text-muted); margin:0.125rem 0 0;">${_timeAgo(new Date(n.createdAt))}</p>
  `;

  // Ações (visíveis no hover)
  const actions = document.createElement('div');
  actions.style.cssText = 'display:none; align-items:center; gap:0.25rem; flex-shrink:0;';

  const readBtn = _actionBtn(
    unread ? '✓' : '↩',
    unread ? 'Marcar como lida' : 'Marcar como não lida',
    unread ? 'var(--green)' : 'var(--text-muted)'
  );
  readBtn.onclick = async (e) => {
    e.stopPropagation();
    await _toggleRead(n._id, unread);
    await _renderList();
    await loadBadge();
  };

  const delBtn = _actionBtn('✕', 'Excluir notificação', 'var(--red)');
  delBtn.onclick = async (e) => {
    e.stopPropagation();
    await _deleteOne(n._id);
    await _renderList();
    await loadBadge();
  };

  actions.appendChild(readBtn);
  actions.appendChild(delBtn);

  // Hover mostra ações
  row.onmouseenter = () => {
    actions.style.display = 'flex';
    row.style.background = 'var(--bg-hover)';
  };
  row.onmouseleave = () => {
    actions.style.display = 'none';
    row.style.background = unread ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'transparent';
  };

  // Clique principal: navega + marca como lida
  const clickArea = [iconEl, textWrap, dot];
  clickArea.forEach(el => {
    el.onclick = async () => {
      _closeDropdown();
      if (unread) {
        await _toggleRead(n._id, true);
        _updateBadge(Math.max(0, _getBadgeCount() - 1));
      }
      _navigate(n);
    };
  });

  row.appendChild(dot);
  row.appendChild(iconEl);
  row.appendChild(textWrap);
  row.appendChild(actions);
  return row;
}

function _actionBtn(label, title, color) {
  const b = document.createElement('button');
  b.type = 'button';
  b.title = title;
  b.textContent = label;
  b.style.cssText = `
    background: transparent; border: 1px solid var(--border);
    color: ${color}; width: 24px; height: 24px;
    border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.1s;
  `;
  b.onmouseenter = () => { b.style.background = 'var(--bg-hover)'; };
  b.onmouseleave = () => { b.style.background = 'transparent'; };
  return b;
}

async function _toggleRead(id, markAsRead) {
  const endpoint = markAsRead ? 'read' : 'unread';
  await fetch(`/api/notifications/${id}/${endpoint}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${appState.authToken}` }
  });
}

async function _deleteOne(id) {
  await fetch(`/api/notifications/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${appState.authToken}` }
  });
}

export async function markAllNotificationsRead() {
  try {
    await fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    _updateBadge(0);
    await _renderList();
  } catch { /* ignore */ }
}

export async function deleteAllNotifications() {
  try {
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    _updateBadge(0);
    await _renderList();
  } catch { /* ignore */ }
}

function _navigate(n) {
  const { sessionId, type, photoId } = n;
  if (type === 'contact' || type === 'depoimento_pendente') {
    window.switchTab?.('mensagens');
  } else if (type === 'storage_expiring' || type === 'storage_deleted') {
    window.switchTab?.('sessoes');
    if (sessionId) setTimeout(() => window.openSessionWizard?.(sessionId), 300);
  } else if (type === 'comment_added' && sessionId) {
    window.switchTab?.('sessoes');
    setTimeout(() => {
      if (photoId && window.openComments) window.openComments(sessionId, photoId);
      else window.openSessionWizard?.(sessionId);
    }, 300);
  } else if (sessionId) {
    window.switchTab?.('sessoes');
    setTimeout(() => window.openSessionWizard?.(sessionId), 300);
  }
}

function _closeDropdown() {
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) dropdown.style.display = 'none';
  dropdownOpen = false;
}

function _getBadgeCount() {
  const badge = document.getElementById('notifBadge');
  return badge ? parseInt(badge.textContent || '0', 10) : 0;
}

function _emptyHtml() {
  return `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2rem 1rem; color:var(--text-muted); gap:0.5rem;">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.5;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <p style="font-size:0.8125rem; margin:0;">Tudo em dia!</p>
    </div>`;
}

function _errorHtml() {
  return '<p style="color:var(--red); font-size:0.75rem; text-align:center; padding:1rem;">Erro ao carregar</p>';
}

function _timeAgo(date) {
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString('pt-BR');
}

function _esc(s) {
  return String(s || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', (e) => {
  if (!dropdownOpen) return;
  const bell = document.getElementById('notificationBell');
  const dropdown = document.getElementById('notifDropdown');
  if (bell && !bell.contains(e.target) && dropdown && !dropdown.contains(e.target)) {
    _closeDropdown();
  }
});

// Expor para os onclick="" do HTML
window.toggleNotifications = toggleNotifications;
window.markAllNotificationsRead = markAllNotificationsRead;
window.deleteAllNotifications = deleteAllNotifications;
