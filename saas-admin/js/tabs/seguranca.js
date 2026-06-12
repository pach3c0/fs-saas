// Segurança — logs do honey pot anti-bot
import { apiRequest, saasToast, saasConfirm, esc, formatSize, getToken } from '../core.js';

// ============================================================================
// SEGURANÇA
// ============================================================================

async function loadSecurityLogs() {
  const tbody = document.getElementById('securityLogsTable');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="loading">Carregando logs...</td></tr>';
  
  try {
    const data = await apiRequest('GET', '/api/admin/saas/security-logs');
    if (!data.logs || data.logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">Nenhum log de bot detectado ainda.</td></tr>';
      return;
    }

    tbody.innerHTML = data.logs.map(log => {
      const date = new Date(log.createdAt).toLocaleString('pt-BR');
      return `
        <tr>
          <td style="white-space:nowrap;">${date}</td>
          <td>${esc(log.ip)}</td>
          <td>${esc(log.route)}</td>
          <td><span class="badge badge-inactive">${esc(log.event)}</span></td>
          <td style="font-size:0.65rem; color:var(--text-muted); max-width:300px; overflow:hidden; text-overflow:ellipsis;" title="${esc(log.userAgent)}">
            ${esc(log.userAgent)}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading" style="color:var(--red);">Erro ao carregar logs: ${err.message}</td></tr>`;
  }
}

window.loadSecurityLogs = loadSecurityLogs;

export { loadSecurityLogs };
