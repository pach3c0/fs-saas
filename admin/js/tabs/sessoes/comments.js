import { escapeHtml, resolveImagePath } from '../../utils/helpers.js';
import { apiGet, apiPost } from '../../utils/api.js';
import { wizardState } from './wizard/state.js';

export function setupComments(container, state) {
  const commentsModal = container.querySelector('#commentsModal');
  const commentsList = container.querySelector('#commentsList');
  const commentInput = container.querySelector('#adminCommentInput');

  // Busca a sessão na fonte mais fresca: wizard primeiro (snapshot recém-carregado),
  // depois sessionsData (lista da página). Em último caso, faz GET sob demanda
  // — evita que clique no 💬 falhe silenciosamente quando a lista está fria.
  async function findSession(sessionId) {
    if (wizardState.session && wizardState.session._id === sessionId) return wizardState.session;
    const fromList = (state.sessionsData || []).find(s => s._id === sessionId);
    if (fromList) return fromList;
    try {
      const data = await apiGet(`/api/sessions/${sessionId}`);
      return data.session || data;
    } catch {
      return null;
    }
  }

  window.openComments = async (sessionId, photoId) => {
    state.currentCommentSessionId = sessionId;
    state.currentCommentPhotoId = photoId;
    const session = await findSession(sessionId);
    if (!session) {
      window.showToast?.('Sessão não encontrada', 'error');
      return;
    }
    const photo = (session.photos || []).find(p => p.id === photoId);
    if (!photo) {
      window.showToast?.('Foto não encontrada', 'error');
      return;
    }
    renderPhotoPreview(photo, session);
    renderCommentsList(photo.comments || []);
    commentsModal.style.display = 'flex';
  };

  function renderPhotoPreview(photo, session) {
    const thumb = container.querySelector('#commentsPhotoThumb');
    const filenameEl = container.querySelector('#commentsPhotoFilename');
    const metaEl = container.querySelector('#commentsPhotoMeta');
    if (!thumb) return;
    thumb.src = resolveImagePath(photo.url || '');
    thumb.alt = photo.filename || 'Foto';
    if (filenameEl) filenameEl.textContent = photo.filename || '(sem nome)';
    if (metaEl) {
      const isSelected = (session.selectedPhotos || []).includes(photo.id);
      const parts = [];
      if (photo.width && photo.height) parts.push(`${photo.width}×${photo.height}`);
      parts.push(isSelected ? '✓ Selecionada pelo cliente' : 'Não selecionada');
      metaEl.textContent = parts.join(' · ');
    }
  }

  function renderCommentsList(comments) {
    if (!comments || comments.length === 0) {
      commentsList.innerHTML = '<p style="color:var(--text-muted); text-align:center; font-style:italic;">Nenhum comentário.</p>';
      return;
    }
    commentsList.innerHTML = comments.map(c => {
      const isAdmin = c.author === 'admin';
      const date = new Date(c.createdAt).toLocaleString('pt-BR');
      return `
        <div style="align-self:${isAdmin ? 'flex-end' : 'flex-start'}; max-width:80%; background:${isAdmin ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'var(--bg-elevated)'}; padding:0.5rem 0.75rem; border-radius:var(--r-card);">
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
      // Aplica em ambas as fontes (lista da página e wizard) para manter UI coerente
      const targets = [
        (state.sessionsData || []).find(s => s._id === state.currentCommentSessionId),
        (wizardState.session && wizardState.session._id === state.currentCommentSessionId) ? wizardState.session : null
      ].filter(Boolean);
      let rendered = false;
      for (const sess of targets) {
        const photo = (sess.photos || []).find(p => p.id === state.currentCommentPhotoId);
        if (!photo) continue;
        if (!photo.comments) photo.comments = [];
        photo.comments.push(result.comment);
        if (!rendered) { renderCommentsList(photo.comments); rendered = true; }
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
