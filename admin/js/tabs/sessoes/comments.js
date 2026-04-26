import { escapeHtml } from '../../utils/helpers.js';
import { apiPost } from '../../utils/api.js';

export function setupComments(container, state) {
  const commentsModal = container.querySelector('#commentsModal');
  const commentsList = container.querySelector('#commentsList');
  const commentInput = container.querySelector('#adminCommentInput');

  window.openComments = (sessionId, photoId) => {
    state.currentCommentSessionId = sessionId;
    state.currentCommentPhotoId = photoId;
    const session = state.sessionsData.find(s => s._id === sessionId);
    if (!session) return;
    const photo = session.photos.find(p => p.id === photoId);
    if (!photo) return;
    renderCommentsList(photo.comments || []);
    commentsModal.style.display = 'flex';
  };

  function renderCommentsList(comments) {
    if (!comments || comments.length === 0) {
      commentsList.innerHTML = '<p style="color:var(--text-muted); text-align:center; font-style:italic;">Nenhum comentário.</p>';
      return;
    }
    commentsList.innerHTML = comments.map(c => {
      const isAdmin = c.author === 'admin';
      const date = new Date(c.createdAt).toLocaleString('pt-BR');
      return `
        <div style="align-self:${isAdmin ? 'flex-end' : 'flex-start'}; max-width:80%; background:${isAdmin ? 'rgba(47,129,247,0.2)' : 'var(--bg-elevated)'}; padding:0.5rem 0.75rem; border-radius:0.5rem;">
          <div style="font-size:0.75rem; color:${isAdmin ? 'var(--accent)' : 'var(--text-secondary)'}; margin-bottom:0.25rem; font-weight:bold;">
            ${isAdmin ? 'Você' : 'Cliente'} <span style="font-weight:normal; opacity:0.7;">${date}</span>
          </div>
          <div style="color:var(--text-primary); font-size:0.875rem;">${escapeHtml(c.text)}</div>
        </div>
      `;
    }).join('');
    commentsList.scrollTop = commentsList.scrollHeight;
  }

  container.querySelector('#closeCommentsModal').onclick = () => {
    commentsModal.style.display = 'none';
  };

  container.querySelector('#sendAdminCommentBtn').onclick = async () => {
    const text = commentInput.value.trim();
    if (!text || !state.currentCommentSessionId || !state.currentCommentPhotoId) return;

    const btn = container.querySelector('#sendAdminCommentBtn');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      const result = await apiPost(`/api/sessions/${state.currentCommentSessionId}/photos/${state.currentCommentPhotoId}/comments`, { text });
      const session = state.sessionsData.find(s => s._id === state.currentCommentSessionId);
      if (session) {
        const photo = session.photos.find(p => p.id === state.currentCommentPhotoId);
        if (photo) {
          if (!photo.comments) photo.comments = [];
          photo.comments.push(result.comment);
          renderCommentsList(photo.comments);
        }
      }
      commentInput.value = '';
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar';
    }
  };
}
