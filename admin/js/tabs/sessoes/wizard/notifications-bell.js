// Sininho de notificações dentro do wizard.
// O sininho do topbar global fica atrás do wizard (z-index 1100) — esse aqui resolve.
// Reusa os mesmos endpoints (/api/notifications) e roteia o clique para a melhor ação
// considerando que já estamos numa sessão.

import { appState } from '../../../state.js';
import { openOverlayModal } from './utils.js';
import { wizardState } from './state.js';

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

const POLL_MS = 30000;

let pollTimer = null;
let dropdownOpen = false;
let outsideHandler = null;
let currentSessionIdRef = null;

export function mountWizardBell(rootEl, currentSessionId) {
  currentSessionIdRef = currentSessionId;

  const bell = document.createElement('button');
  bell.type = 'button';
  bell.id = 'wizardNotifBell';
  bell.className = 'header-expand-btn';
  bell.title = 'Notificações';
  bell.style.cssText = 'cursor: pointer; overflow: visible !important;';
  bell.innerHTML = `
    <span class="header-expand-icon" style="position:relative; display:flex !important; align-items:center !important; justify-content:center !important; width:34px !important; height:34px !important;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block; margin:auto;">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span id="wizardNotifBadge" style="display:none; position:absolute; top:-2px; right:-2px; min-width:14px; height:14px; padding:0 3px; background:var(--red); color:#fff; font-size:9px; font-weight:700; border-radius:50%; align-items:center; justify-content:center; line-height:14px;"></span>
    </span>
    <span class="header-expand-label">Notificações</span>
  `;

  const dropdown = document.createElement('div');
  dropdown.id = 'wizardNotifDropdown';
  dropdown.style.cssText = `
    display: none;
    position: absolute; top: 44px; right: 0;
    width: 320px; max-height: 420px;
    background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius:var(--r-card); box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    z-index: 1200; display: none; flex-direction: column;
  `;

  // Header com ações globais
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 0.625rem 0.875rem; border-bottom: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center;
    position: sticky; top: 0; background: var(--bg-elevated); flex-shrink: 0;
  `;
  const headerTitle = document.createElement('span');
  headerTitle.textContent = 'Notificações';
  headerTitle.style.cssText = 'font-size:0.8125rem; font-weight:600; color:var(--text-primary);';

  const headerBtns = document.createElement('div');
  headerBtns.style.cssText = 'display:flex; gap:0.5rem; align-items:center;';

  const readAllBtn = document.createElement('button');
  readAllBtn.type = 'button';
  readAllBtn.textContent = 'Marcar lidas';
  readAllBtn.style.cssText = 'background:transparent; border:none; color:var(--accent); cursor:pointer; font-size:0.75rem; padding:0;';
  readAllBtn.onclick = (e) => { e.stopPropagation(); _markAllRead(dropdown); };

  const deleteAllBtn = document.createElement('button');
  deleteAllBtn.type = 'button';
  deleteAllBtn.textContent = 'Excluir todas';
  deleteAllBtn.style.cssText = 'background:transparent; border:none; color:var(--red); cursor:pointer; font-size:0.75rem; padding:0;';
  deleteAllBtn.onclick = (e) => { e.stopPropagation(); _deleteAll(dropdown); };

  headerBtns.appendChild(readAllBtn);
  headerBtns.appendChild(deleteAllBtn);
  header.appendChild(headerTitle);
  header.appendChild(headerBtns);

  // Lista
  const list = document.createElement('div');
  list.id = 'wizardNotifList';
  list.style.cssText = 'overflow-y: auto; flex: 1; min-height: 80px;';
  list.innerHTML = '<p style="color:var(--text-muted); font-size:0.75rem; text-align:center; padding:1rem;">Carregando…</p>';

  dropdown.appendChild(header);
  dropdown.appendChild(list);

  bell.onclick = (e) => {
    e.stopPropagation();
    _toggleDropdown(dropdown);
  };

  outsideHandler = (e) => {
    if (!dropdownOpen) return;
    if (!bell.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
      dropdownOpen = false;
    }
  };
  document.addEventListener('click', outsideHandler);

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position: relative; display: flex;';
  wrap.appendChild(bell);
  wrap.appendChild(dropdown);
  rootEl.appendChild(wrap);

  startPolling();
}

export function unmountWizardBell() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (outsideHandler) {
    document.removeEventListener('click', outsideHandler);
    outsideHandler = null;
  }
  dropdownOpen = false;
  currentSessionIdRef = null;
}

function startPolling() {
  _refreshBadge();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(_refreshBadge, POLL_MS);
}

async function _refreshBadge() {
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
  const badge = document.getElementById('wizardNotifBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
  // Sincroniza o badge global do topbar
  const globalBadge = document.getElementById('notifBadge');
  if (globalBadge) {
    if (count > 0) {
      globalBadge.textContent = count > 99 ? '99+' : String(count);
      globalBadge.style.display = 'flex';
    } else {
      globalBadge.style.display = 'none';
    }
  }
}

function _getBadgeCount() {
  const badge = document.getElementById('wizardNotifBadge');
  return badge ? parseInt(badge.textContent || '0', 10) : 0;
}

async function _toggleDropdown(dropdown) {
  dropdownOpen = !dropdownOpen;
  dropdown.style.display = dropdownOpen ? 'flex' : 'none';
  if (dropdownOpen) await _renderList(dropdown);
}

async function _renderList(dropdown) {
  const list = dropdown.querySelector('#wizardNotifList');
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
    notifications.forEach(n => list.appendChild(_buildItem(n, dropdown)));
  } catch {
    list.innerHTML = _errorHtml();
  }
}

function _buildItem(n, dropdown) {
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

  const dot = document.createElement('span');
  dot.style.cssText = `
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--accent); flex-shrink: 0; margin-top: 0.35rem;
    display: ${unread ? 'block' : 'none'};
  `;

  const iconEl = document.createElement('span');
  iconEl.textContent = icon;
  iconEl.style.cssText = 'font-size:1rem; flex-shrink:0; cursor:pointer;';

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
    await _renderList(dropdown);
    await _refreshBadge();
  };

  const delBtn = _actionBtn('✕', 'Excluir notificação', 'var(--red)');
  delBtn.onclick = async (e) => {
    e.stopPropagation();
    await _deleteOne(n._id);
    await _renderList(dropdown);
    await _refreshBadge();
  };

  actions.appendChild(readBtn);
  actions.appendChild(delBtn);

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
      if (unread) {
        await _toggleRead(n._id, true);
        _updateBadge(Math.max(0, _getBadgeCount() - 1));
      }
      _handleNavigate(n, dropdown);
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
    border-radius:var(--r-chip); cursor: pointer; font-size: 0.75rem;
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

async function _markAllRead(dropdown) {
  try {
    await fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    _updateBadge(0);
    await _renderList(dropdown);
  } catch { /* ignore */ }
}

async function _deleteAll(dropdown) {
  try {
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    _updateBadge(0);
    await _renderList(dropdown);
  } catch { /* ignore */ }
}

function _handleNavigate(notif, dropdown) {
  dropdown.style.display = 'none';
  dropdownOpen = false;

  const { sessionId, photoId, type } = notif;

  // Tipos sem sessão: sair do wizard e mudar de aba
  if (type === 'contact' || type === 'depoimento_pendente') {
    window.closeSessionWizard?.();
    window.switchTab?.('mensagens');
    return;
  }

  // Notificação da sessão atual: age sem fechar o wizard
  if (sessionId && sessionId === currentSessionIdRef) {
    if (type === 'comment_added' && photoId && window.openComments) {
      openOverlayModal({
        modalSelector: '#commentsModal',
        opener: () => window.openComments(sessionId, photoId)
      });
    }
    // Outras notificações da mesma sessão: já estamos nela, nada a fazer
    return;
  }

  // Notificação de outra sessão: troca de sessão
  if (sessionId) {
    window.closeSessionWizard?.();
    setTimeout(() => {
      window.openSessionWizard?.(sessionId);
      if (type === 'comment_added' && photoId) {
        setTimeout(() => {
          if (window.openComments) window.openComments(sessionId, photoId);
        }, 400);
      }
    }, 100);
    return;
  }

  // storage: navegar para a aba sessões (sem sessionId específico)
  if (type === 'storage_expiring' || type === 'storage_deleted') {
    window.closeSessionWizard?.();
    window.switchTab?.('sessoes');
  }
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
