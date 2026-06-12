// Tutoriais (CliqueZoom Academy) — CRUD de vídeos
import { apiRequest, saasToast, saasConfirm, esc, formatSize, getToken } from '../core.js';

// ============================================================================
// TUTORIAIS (CliqueZoom Academy)
// ============================================================================

let allTutorials = [];

// Helper frontend para extrair ID do YouTube e atualizar preview
function extractYoutubeId(url) {
  if (!url) return '';
  url = url.trim();
  if (url.length === 11) return url;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

function updateVideoPreview(url) {
  const previewWrap = document.getElementById('videoPreviewWrap');
  const iframe = document.getElementById('videoPreviewIframe');
  const ytId = extractYoutubeId(url);

  if (ytId) {
    iframe.src = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`;
    previewWrap.style.display = 'block';
  } else {
    iframe.src = '';
    previewWrap.style.display = 'none';
  }
}
window.updateVideoPreview = updateVideoPreview;

async function loadTutorials() {
  const tbody = document.getElementById('tutorialsTable');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="loading">Carregando tutoriais...</td></tr>';

  try {
    const res = await apiRequest('GET', '/api/admin/tutorials');
    allTutorials = res.tutorials || [];

    if (allTutorials.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading">Nenhum tutorial cadastrado ainda. Crie um novo!</td></tr>';
      return;
    }

    const categoriesMap = {
      dashboard: 'Painel / Visão Geral',
      clientes: 'Clientes',
      sessoes: 'Sessões & Galerias',
      portfolio: 'Meu Site (Portfólio)',
      crm_financeiro: 'CRM & Financeiro'
    };

    tbody.innerHTML = allTutorials.map(t => {
      const activeClass = t.active ? 'badge-active' : 'badge-inactive';
      const activeText = t.active ? 'Ativo' : 'Inativo';
      const categoryText = categoriesMap[t.category] || t.category;

      return `
        <tr>
          <td style="font-weight:600; text-align:center;">${t.order || 0}</td>
          <td style="font-weight:600;">${esc(t.title)}</td>
          <td style="color:var(--text-secondary);">${categoryText}</td>
          <td><span style="font-size:0.75rem; background:var(--bg-elevated); padding:0.125rem 0.5rem; border-radius:4px; border:1px solid var(--border);">${t.level || 'Básico'}</span></td>
          <td>${esc(t.duration || '-')}</td>
          <td><span class="badge ${activeClass}">${activeText}</span></td>
          <td>
            <div class="btn-actions">
              <button class="btn btn-details" onclick="openEditTutorialModal('${t._id}')">Editar</button>
              <button class="btn btn-deactivate" onclick="deleteTutorial('${t._id}', '${esc(t.title)}')">Excluir</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="loading" style="color:var(--red);">Erro ao carregar tutoriais: ${err.message}</td></tr>`;
  }
}
window.loadTutorials = loadTutorials;

function openNewTutorialModal() {
  document.getElementById('tutorialForm').reset();
  document.getElementById('tutorialId').value = '';
  document.getElementById('tutorialModalTitle').textContent = 'Adicionar Novo Tutorial';
  document.getElementById('videoPreviewWrap').style.display = 'none';
  document.getElementById('videoPreviewIframe').src = '';
  document.getElementById('tutorialModal').classList.add('active');
}
window.openNewTutorialModal = openNewTutorialModal;

function openEditTutorialModal(id) {
  const t = allTutorials.find(item => item._id === id);
  if (!t) return;

  document.getElementById('tutorialModalTitle').textContent = 'Editar Tutorial';
  document.getElementById('tutorialId').value = t._id;
  document.getElementById('tutorialTitle').value = t.title;
  document.getElementById('tutorialDescription').value = t.description || '';
  document.getElementById('tutorialCategory').value = t.category;
  document.getElementById('tutorialLevel').value = t.level || 'Básico';
  document.getElementById('tutorialDuration').value = t.duration || '';
  document.getElementById('tutorialOrder').value = t.order || 0;
  document.getElementById('tutorialActive').checked = t.active;
  document.getElementById('tutorialVideoUrl').value = t.videoUrl;

  updateVideoPreview(t.videoUrl);
  document.getElementById('tutorialModal').classList.add('active');
}
window.openEditTutorialModal = openEditTutorialModal;

function closeTutorialModal() {
  document.getElementById('tutorialModal').classList.remove('active');
  document.getElementById('videoPreviewIframe').src = ''; // Parar o vídeo ao fechar
}
window.closeTutorialModal = closeTutorialModal;

async function saveTutorial(e) {
  e.preventDefault();
  const id = document.getElementById('tutorialId').value;
  const payload = {
    title: document.getElementById('tutorialTitle').value.trim(),
    description: document.getElementById('tutorialDescription').value.trim(),
    category: document.getElementById('tutorialCategory').value,
    level: document.getElementById('tutorialLevel').value,
    duration: document.getElementById('tutorialDuration').value.trim(),
    order: parseInt(document.getElementById('tutorialOrder').value) || 0,
    active: document.getElementById('tutorialActive').checked,
    videoUrl: document.getElementById('tutorialVideoUrl').value.trim()
  };

  const btn = document.getElementById('saveTutorialBtn');
  const originalText = btn.textContent;
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  try {
    if (id) {
      // Atualizar existente
      await apiRequest('PUT', `/api/admin/tutorials/${id}`, payload);
      saasToast('Tutorial atualizado com sucesso!', 'success');
    } else {
      // Criar novo
      await apiRequest('POST', '/api/admin/tutorials', payload);
      saasToast('Tutorial criado com sucesso!', 'success');
    }
    closeTutorialModal();
    await loadTutorials();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}
window.saveTutorial = saveTutorial;

async function deleteTutorial(id, title) {
  if (!await saasConfirm(`Deseja excluir definitivamente o tutorial "${title}"?`, { title: 'Excluir Tutorial', confirmText: 'Excluir', danger: true })) return;
  
  try {
    await apiRequest('DELETE', `/api/admin/tutorials/${id}`);
    saasToast('Tutorial excluído com sucesso!', 'success');
    await loadTutorials();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
}
window.deleteTutorial = deleteTutorial;

// Fechar modal ao clicar fora
document.getElementById('tutorialModal').onclick = (e) => {
  if (e.target === document.getElementById('tutorialModal')) closeTutorialModal();
};


export { loadTutorials };
