/**
 * Sistema de notificacoes do admin
 * Polling, badge, dropdown, marcar como lidas
 */

import { appState } from '../state.js';

const NOTIF_ICONS = {
  session_accessed: '👁️',
  selection_started: '🎯',
  selection_submitted: '✅',
  reopen_requested: '🔄'
};

let pollingInterval = null;
let dropdownOpen = false;

export function startNotificationPolling() {
  loadNotifications();
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(loadNotifications, 30000);
}

export function stopNotificationPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

async function loadNotifications() {
  if (!appState.authToken) return;
  try {
    const res = await fetch('/api/notifications/unread-count', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    updateBadge(data.count || 0);
  } catch (e) { /* ignore */ }
}

function updateBadge(count) {
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

  if (dropdownOpen) {
    await renderNotifications();
  }
}

async function renderNotifications() {
  const list = document.getElementById('notifList');
  if (!list) return;

  try {
    const res = await fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    const notifications = data.notifications || [];

    if (notifications.length === 0) {
      list.innerHTML = '<p style="color:#6b7280; font-size:0.75rem; text-align:center; padding:1.5rem;">Nenhuma notificacao</p>';
      return;
    }

    list.innerHTML = notifications.map(n => {
      const icon = NOTIF_ICONS[n.type] || '🔔';
      const time = timeAgo(new Date(n.createdAt));
      const unread = !n.read;
      return `
        <div style="padding:0.5rem 1rem; border-bottom:1px solid #1f2937; cursor:pointer; ${unread ? 'background:#1e293b;' : ''}"
          onclick="onNotifClick('${n.sessionId || ''}')">
          <div style="display:flex; align-items:flex-start; gap:0.5rem;">
            <span style="font-size:1rem; flex-shrink:0;">${icon}</span>
            <div style="flex:1; min-width:0;">
              <p style="font-size:0.75rem; color:${unread ? '#f3f4f6' : '#9ca3af'}; ${unread ? 'font-weight:600;' : ''} line-height:1.4;">${n.message}</p>
              <p style="font-size:0.625rem; color:#6b7280; margin-top:0.125rem;">${time}</p>
            </div>
            ${unread ? '<span style="width:6px; height:6px; background:#3b82f6; border-radius:50%; flex-shrink:0; margin-top:0.375rem;"></span>' : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    list.innerHTML = '<p style="color:#f87171; font-size:0.75rem; text-align:center; padding:1rem;">Erro ao carregar</p>';
  }
}

export async function markAllNotificationsRead() {
  try {
    await fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    updateBadge(0);
    await renderNotifications();
  } catch (e) { /* ignore */ }
}

export function onNotifClick(sessionId) {
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) dropdown.style.display = 'none';
  dropdownOpen = false;

  if (sessionId && window.switchTab) {
    window.switchTab('sessoes');
  }
}

function timeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString('pt-BR');
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', (e) => {
  if (!dropdownOpen) return;
  const bell = document.getElementById('notificationBell');
  const dropdown = document.getElementById('notifDropdown');
  if (bell && !bell.contains(e.target) && dropdown && !dropdown.contains(e.target)) {
    dropdown.style.display = 'none';
    dropdownOpen = false;
  }
});
