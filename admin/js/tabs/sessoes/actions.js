import { copyToClipboard } from '../../utils/helpers.js';
import { apiPost, apiPut, apiDelete } from '../../utils/api.js';
import { uploadImage } from '../../utils/upload.js';

export function setupActions(container, state, renderSessoes) {
  window.copySessionCode = (code, btn) => {
    copyToClipboard(code);
    if (btn) {
      const originalText = btn.textContent;
      const originalBg = btn.style.background;
      btn.textContent = 'Copiado!';
      btn.style.background = 'var(--green)';
      btn.style.color = 'white';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = originalBg;
        btn.style.color = 'var(--text-secondary)';
      }, 2000);
    }
  };

  window.sendSessionCode = async (sessionId, accessCode) => {
    const session = state.sessionsData.find(s => s._id === sessionId);
    const clientEmail = session?.clientEmail || session?.clientId?.email || '';
    if (!clientEmail) {
      window.showToast?.('Este cliente não tem e-mail cadastrado. Copie o código manualmente.', 'warning', 5000);
      copyToClipboard(accessCode);
      return;
    }
    const ok = await window.showConfirm?.(`Enviar código de acesso para ${clientEmail}?`);
    if (!ok) return;
    try {
      await apiPost(`/api/sessions/${sessionId}/send-code`);
      window.showToast?.('E-mail enviado com sucesso!', 'success');
    } catch (error) {
      window.showToast?.('Erro ao enviar: ' + error.message, 'error');
    }
  };

  window.reopenSelection = async (sessionId) => {
    const ok = await window.showConfirm?.('Reabrir seleção? O cliente poderá alterar as fotos selecionadas.');
    if (!ok) return;
    try {
      await apiPut(`/api/sessions/${sessionId}/reopen`);
      await renderSessoes(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  window.deliverSession = async (sessionId) => {
    const ok = await window.showConfirm?.('Marcar esta sessão como entregue? O watermark será removido e o cliente poderá baixar as fotos.');
    if (!ok) return;
    try {
      await apiPut(`/api/sessions/${sessionId}/deliver`);
      await renderSessoes(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  window.acceptExtraRequest = async (sessionId) => {
    const session = state.sessionsData.find(s => s._id === sessionId);
    const count = session?.extraRequest?.photos?.length || 0;
    const ok = await window.showConfirm?.(`Aceitar ${count} foto(s) extra(s) solicitada(s)? Elas serão adicionadas à seleção do cliente.`);
    if (!ok) return;
    try {
      await apiPut(`/api/sessions/${sessionId}/extra-request/accept`);
      window.showToast?.('Extras aceitas e adicionadas à seleção!', 'success');
      await renderSessoes(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  window.rejectExtraRequest = async (sessionId) => {
    const ok = await window.showConfirm?.('Recusar a solicitação de fotos extras?');
    if (!ok) return;
    try {
      await apiPut(`/api/sessions/${sessionId}/extra-request/reject`);
      window.showToast?.('Solicitação recusada.', 'success');
      await renderSessoes(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  window.deleteSession = async (sessionId) => {
    const ok = await window.showConfirm?.('Tem certeza que deseja deletar esta sessão e todas as fotos?');
    if (!ok) return;
    try {
      await apiDelete(`/api/sessions/${sessionId}`);
      await renderSessoes(container);
      window.loadSidebarStorage?.();
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  window.setSessionCover = async (sessionId, photoUrl) => {
    const ok = await window.showConfirm?.('Definir esta foto como capa da sessão?');
    if (!ok) return;
    try {
      await apiPut(`/api/sessions/${sessionId}`, { coverPhoto: photoUrl });
      const session = state.sessionsData.find(s => s._id === sessionId);
      if (session) session.coverPhoto = photoUrl;
      window.showToast?.('Capa da sessão atualizada!', 'success');
      await renderSessoes(container);
      window.viewSessionPhotos(sessionId);
    } catch (error) {
      window.showToast?.(error.message, 'error');
    }
  };

  window.togglePhotoHidden = async (sessionId, photoId) => {
    const session = state.sessionsData.find(s => s._id === sessionId);
    if (!session) return;

    const photo = (session.photos || []).find(p => p.id === photoId);
    const isCurrentlyVisible = !photo?.hidden;
    if (isCurrentlyVisible && session.mode === 'selection') {
      const totalVisible = (session.photos || []).filter(p => !p.hidden).length;
      const pacote = session.packageLimit || 30;
      if (totalVisible <= pacote) {
        window.showToast?.(
          `Não é possível ocultar: você tem ${totalVisible} foto(s) visíveis e o pacote exige ${pacote}. ` +
          `Reduza o pacote em Configurações antes de ocultar.`,
          'warning',
          6000
        );
        return;
      }
    }

    try {
      await apiPut(`/api/sessions/${sessionId}/photos/${photoId}/toggle-hidden`);
      await renderSessoes(container);
      window.viewSessionPhotos(sessionId);
    } catch (error) {
      window.showToast?.(error.message, 'error');
    }
  };
}
