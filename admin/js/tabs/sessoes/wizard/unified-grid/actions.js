// unified-grid/actions.js — Ações sobre fotos: entregar, ocultar/mostrar, definir capa,
// abrir comentários e operações em lote (bulk hidden/delete).
// Extraído de unified-photo-grid.js sem alteração de comportamento.

import { apiPut, apiDelete } from '../../../../utils/api.js';
import { appState } from '../../../../state.js';

// ── Handler entregar ───────────────────────────────────────────────────────
export async function handleDeliver(session, refresh, delivered, selected, isDelivered, isPartial) {
  const { showDeliveryModal } = await import('../steps/2-share.js');
  const { buildWhatsAppDeliveryLink } = await import('../utils.js');

  // Gate de entrega: precisa de ≥1 foto ENTREGÁVEL (editada E que o cliente baixa = seleção ∪ cortesia).
  // Espelha o guard do backend e evita abrir o modal de entrega à toa: sem isto a sessão "entrega"
  // mas o cliente abre o download e recebe ZIP vazio → tela preta.
  const _entitled = new Set([...(selected || []), ...(session.courtesyPhotos || [])]);
  const _deliverable = (session.photos || []).filter(p => p.urlOriginal && _entitled.has(p.id)).length;
  if (_deliverable === 0) {
    window.showToast?.('Não foi possível liberar a entrega: nenhuma das fotos escolhidas pelo cliente está editada ainda. Edite ao menos uma foto da seleção e tente de novo.', 'error');
    return;
  }

  if (isPartial && !isDelivered) {
    const pendingCount = selected.length - delivered.length;
    const ok = await window.showConfirm?.(
      `Você está entregando ${delivered.length} de ${selected.length} fotos selecionadas. ` +
      `As ${pendingCount} restantes continuam pendentes e você pode entregá-las depois. Continuar?`,
      { confirmText: `Entregar ${delivered.length} agora`, cancelText: 'Cancelar' }
    );
    if (!ok) return;
  }

  const payload = await showDeliveryModal(session);
  if (!payload) return;

  try {
    const apiPayload = {};
    if (payload.sendEmail) apiPayload.emailIntro = payload.emailIntro;
    else apiPayload.skipEmail = true;
    await apiPut(`/api/sessions/${session._id}/deliver`, apiPayload);
    window.showToast?.(isDelivered ? 'Cliente notificado novamente' : 'Sessão entregue! Cliente notificado.', 'success');

    if (payload.sendWhatsapp) {
      const orgName = appState.appData?.organization?.name || 'CliqueZoom';
      const url = buildWhatsAppDeliveryLink({
        session, accessCode: session.accessCode,
        recipientName: session.clientName || session.name,
        recipientPhone: session.clientPhone,
        orgName, customText: payload.whatsappText
      });
      window.open(url, '_blank');
    }
    await refresh();
  } catch (err) {
    window.showToast?.('Erro: ' + err.message, 'error');
  }
}

// ── Ações individuais ──────────────────────────────────────────────────────
export async function handleToggleHidden(photo, session, refresh) {
  try {
    await apiPut(`/api/sessions/${session._id}/photos/${photo.id}/toggle-hidden`);
    await refresh();
  } catch (err) {
    window.showToast?.(err.message || 'Erro ao ocultar foto', 'error');
  }
}

export async function handleSetCover(photo, session, refresh) {
  const ok = await window.showConfirm?.('Definir esta foto como capa da sessão?');
  if (!ok) return;
  try {
    await apiPut(`/api/sessions/${session._id}`, { coverPhoto: photo.url });
    window.showToast?.('Capa atualizada!', 'success');
    await refresh();
  } catch (err) {
    window.showToast?.(err.message || 'Erro ao definir capa', 'error');
  }
}

export function openCommentsModal(sessionId, photoId) {
  if (window.openComments) {
    window.openComments(sessionId, photoId);
  } else {
    window.showToast?.('Módulo de comentários não disponível.', 'warning');
  }
}

// ── Bulk actions ───────────────────────────────────────────────────────────
export async function handleBulkToggleHidden(hidden, session, selectedIds, refresh, btn) {
  const ids = Array.from(selectedIds);
  if (!ids.length) return;
  const ok = await window.showConfirm?.(
    `${hidden ? 'Ocultar' : 'Mostrar'} ${ids.length} foto${ids.length !== 1 ? 's' : ''}?`,
    { confirmText: hidden ? 'Ocultar' : 'Mostrar', cancelText: 'Cancelar' }
  );
  if (!ok) return;
  btn.disabled = true;
  btn.textContent = hidden ? 'Ocultando...' : 'Mostrando...';
  try {
    await apiPut(`/api/sessions/${session._id}/photos/bulk-hidden`, { photoIds: ids, hidden });
    const n = ids.length;
    window.showToast?.(`${n} foto${n !== 1 ? 's' : ''} ${hidden ? 'ocultada' : 'mostrada'}${n !== 1 ? 's' : ''}!`, 'success');
    selectedIds.clear();
    await refresh();
  } catch (err) {
    window.showToast?.(err.message || 'Erro', 'error');
    btn.disabled = false;
    btn.textContent = hidden ? 'Ocultar' : 'Mostrar';
  }
}

export async function handleBulkDelete(session, selectedIds, refresh, btn) {
  const ids = Array.from(selectedIds);
  if (!ids.length) return;
  const ok = await window.showConfirm?.(
    `Deletar permanentemente ${ids.length} foto${ids.length !== 1 ? 's' : ''}? Esta ação não pode ser desfeita.`,
    { confirmText: 'Deletar', cancelText: 'Cancelar' }
  );
  if (!ok) return;
  btn.disabled = true;
  btn.textContent = 'Deletando...';
  try {
    await apiDelete(`/api/sessions/${session._id}/photos/bulk`, { photoIds: ids });
    const n = ids.length;
    window.showToast?.(`${n} foto${n !== 1 ? 's' : ''} deletada${n !== 1 ? 's' : ''}!`, 'success');
    selectedIds.clear();
    await refresh();
  } catch (err) {
    window.showToast?.(err.message || 'Erro ao deletar', 'error');
    btn.disabled = false;
    btn.textContent = 'Deletar';
  }
}
