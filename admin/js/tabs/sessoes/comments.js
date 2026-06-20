import { escapeHtml, resolveImagePath } from '../../utils/helpers.js';
import { apiGet, apiPost } from '../../utils/api.js';
import { wizardState } from './wizard/state.js';

export function setupComments(container, state) {
  const commentsModal = container.querySelector('#commentsModal');
  const commentsList = container.querySelector('#commentsList');
  const commentInput = container.querySelector('#adminCommentInput');
  const participantRow = container.querySelector('#commentsParticipantRow');
  const participantSelect = container.querySelector('#adminCommentParticipant');

  // Sessão/participante atuais do modal (para threading por participante em multi).
  let currentSession = null;
  let isMultiSession = false;

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
    currentSession = session;
    isMultiSession = session.mode === 'multi_selection' || session.mode === 'multi_instant';
    renderPhotoPreview(photo, session);

    if (isMultiSession) {
      // Monta o seletor de participante; default = quem comentou por último nesta foto.
      buildParticipantSelect(session, photo);
      participantRow.style.display = 'flex';
    } else {
      participantRow.style.display = 'none';
    }
    renderThreadForCurrentSelection(photo);
    commentsModal.style.display = 'flex';
  };

  // Constrói o <select> com os participantes; pré-seleciona o último que comentou na foto.
  function buildParticipantSelect(session, photo) {
    const participants = session.participants || [];
    participantSelect.innerHTML = participants
      .map(p => `<option value="${p._id}">${escapeHtml(p.name)}</option>`)
      .join('');
    const lastClient = [...(photo.comments || [])].reverse()
      .find(c => c.author === 'client' && c.participantId);
    if (lastClient) participantSelect.value = String(lastClient.participantId);
  }

  // Em multi, filtra os comentários para o participante selecionado (cada thread é privado).
  function renderThreadForCurrentSelection(photo) {
    let comments = photo.comments || [];
    if (isMultiSession) {
      const pid = String(participantSelect.value || '');
      comments = comments.filter(c => String(c.participantId || '') === pid);
    }
    renderCommentsList(comments);
  }

  participantSelect.onchange = () => {
    const photo = (currentSession?.photos || []).find(p => p.id === state.currentCommentPhotoId);
    if (photo) renderThreadForCurrentSelection(photo);
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
      // Em Seleção em Grupo, identifica o participante: cliente = nome; admin = "Você → nome".
      const who = isAdmin
        ? (c.participantName ? `Você &rarr; ${escapeHtml(c.participantName)}` : 'Você')
        : (c.participantName ? escapeHtml(c.participantName) : 'Cliente');
      return `
        <div style="align-self:${isAdmin ? 'flex-end' : 'flex-start'}; max-width:80%; background:${isAdmin ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'var(--bg-elevated)'}; padding:0.5rem 0.75rem; border-radius:var(--r-card);">
          <div style="font-size:0.75rem; color:${isAdmin ? 'var(--accent)' : 'var(--text-secondary)'}; margin-bottom:0.25rem; font-weight:bold;">
            ${who} <span style="font-weight:normal; opacity:0.7;">${date}</span>
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

    // Em multi, a resposta vai direcionada ao participante selecionado (só ele a vê).
    const participantId = isMultiSession ? (participantSelect.value || undefined) : undefined;
    if (isMultiSession && !participantId) {
      window.showToast?.('Selecione com qual participante é a conversa', 'warning');
      return;
    }

    try {
      const result = await apiPost(`/api/sessions/${state.currentCommentSessionId}/photos/${state.currentCommentPhotoId}/comments`, { text, participantId });
      // Aplica em ambas as fontes (lista da página e wizard) para manter UI coerente
      const targets = [
        (state.sessionsData || []).find(s => s._id === state.currentCommentSessionId),
        (wizardState.session && wizardState.session._id === state.currentCommentSessionId) ? wizardState.session : null
      ].filter(Boolean);
      let updatedPhoto = null;
      for (const sess of targets) {
        const photo = (sess.photos || []).find(p => p.id === state.currentCommentPhotoId);
        if (!photo) continue;
        if (!photo.comments) photo.comments = [];
        photo.comments.push(result.comment);
        if (!updatedPhoto) updatedPhoto = photo;
      }
      // Re-renderiza respeitando o filtro do thread (participante selecionado em multi).
      if (updatedPhoto) renderThreadForCurrentSelection(updatedPhoto);
      commentInput.value = '';
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar';
    }
  };
}
