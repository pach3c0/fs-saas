// Lixeira — orgs desativadas, restauração e exclusão definitiva
import { apiRequest, saasToast, saasConfirm, esc, formatSize, getToken } from '../core.js';
import { loadDashboard, loadMetrics } from './dashboard.js';

// ============================================================================
// LIXEIRA
// ============================================================================

async function loadTrash() {
  const tbody = document.getElementById('trashTable');
  try {
    const data = await apiRequest('GET', '/api/admin/organizations/trash');

    if (!data.organizations.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading">Lixeira vazia</td></tr>';
      document.getElementById('trashCount').textContent = '';
      return;
    }

    document.getElementById('trashCount').textContent = `(${data.organizations.length})`;

    tbody.innerHTML = data.organizations.map(org => {
      const owner = org.ownerId;
      const deletedDate = new Date(org.deletedAt).toLocaleDateString('pt-BR');
      const daysAgo = Math.floor((Date.now() - new Date(org.deletedAt)) / 86400000);

      return `
        <tr>
          <td style="font-weight:600;">${esc(org.name)}</td>
          <td style="color:#94a3b8;">${esc(org.slug)}</td>
          <td>${owner ? esc(owner.name || owner.email) : '-'}</td>
          <td><span style="text-transform:uppercase; font-size:0.6875rem; color:#94a3b8;">${org.plan}</span></td>
          <td style="color:#94a3b8; font-size:0.75rem;">${deletedDate} <span style="color:#64748b;">(${daysAgo}d atras)</span></td>
          <td>
            <div class="btn-actions">
              <button class="btn btn-restore" onclick="restoreOrg('${org._id}', '${esc(org.name)}')">Restaurar</button>
              <button class="btn btn-delete-permanent" onclick="openConfirmDelete('${org._id}', '${esc(org.name)}')">Excluir Definitivamente</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="loading" style="color:#f87171;">Erro: ${err.message}</td></tr>`;
  }
}

window.trashOrg = async (id, name, isProtected = false) => {
  const msg = isProtected
    ? `🛡️ "${name}" é uma conta PROTEGIDA (produção). Mover para a lixeira agenda a EXCLUSÃO definitiva dela. Tem certeza absoluta?`
    : `Mover "${name}" para a lixeira?`;
  if (!await saasConfirm(msg, { title: isProtected ? '⚠️ Conta protegida' : 'Mover para Lixeira', confirmText: isProtected ? 'Sim, mover' : 'Mover', danger: true })) return;
  try {
    await apiRequest('PUT', `/api/admin/organizations/${id}/trash`);
    saasToast(`"${name}" movida para a lixeira.`, 'warning');
    await loadDashboard();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

window.restoreOrg = async (id, name) => {
  if (!await saasConfirm(`Restaurar "${name}"? A organização ficará ativa novamente.`, { title: 'Restaurar', confirmText: 'Restaurar' })) return;
  try {
    await apiRequest('PUT', `/api/admin/organizations/${id}/restore`);
    saasToast(`"${name}" restaurada com sucesso!`, 'success');
    await loadTrash();
    await loadDashboard();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

// ============================================================================
// DELETE DEFINITIVO (com confirmação)
// ============================================================================

let pendingDeleteId = null;
let pendingDeleteName = '';

window.openConfirmDelete = (id, name) => {
  pendingDeleteId = id;
  pendingDeleteName = name;
  document.getElementById('confirmOrgName').textContent = name;
  document.getElementById('confirmInput').value = '';
  document.getElementById('confirmDeleteBtn').disabled = true;
  document.getElementById('confirmDeleteModal').classList.add('active');
};

window.closeConfirmDelete = () => {
  document.getElementById('confirmDeleteModal').classList.remove('active');
  pendingDeleteId = null;
  pendingDeleteName = '';
};

document.getElementById('confirmInput').oninput = (e) => {
  const match = e.target.value.trim() === pendingDeleteName;
  document.getElementById('confirmDeleteBtn').disabled = !match;
};

window.executePermanentDelete = async () => {
  if (!pendingDeleteId) return;
  try {
    document.getElementById('confirmDeleteBtn').textContent = 'Excluindo...';
    document.getElementById('confirmDeleteBtn').disabled = true;
    await apiRequest('DELETE', `/api/admin/organizations/${pendingDeleteId}`);
    saasToast(`"${pendingDeleteName}" excluída definitivamente.`, 'success');
    closeConfirmDelete();
    await loadTrash();
    await loadMetrics();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  } finally {
    document.getElementById('confirmDeleteBtn').textContent = 'Excluir Definitivamente';
  }
};

// Fechar modal confirmação ao clicar fora
document.getElementById('confirmDeleteModal').onclick = (e) => {
  if (e.target === document.getElementById('confirmDeleteModal')) closeConfirmDelete();
};


export { loadTrash };
