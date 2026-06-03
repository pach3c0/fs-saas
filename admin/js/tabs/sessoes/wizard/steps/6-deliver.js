// Passo 6 do wizard — Entregar a sessão.
// Confirma e libera download das fotos finais ao cliente.
// Também gerencia: re-entrega, pedido de reabertura, fotos extras solicitadas.
// Multi-Seleção: entrega individual por participante.

import { apiPut, apiPost } from '../../../../utils/api.js';
import { escapeHtml } from '../../../../utils/helpers.js';
import { appState } from '../../../../state.js';
import {
  buildGalleryUrl, buildGalleryUrlForCode, buildWhatsAppDeliveryLink,
  buildDeliveryEmailIntro, buildDeliveryWhatsAppText, buildMessageCustomizer
} from '../utils.js';

export function renderStepDeliver({ session, refresh }) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.25rem; max-width:900px;';

  const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';

  // Multi-Seleção tem fluxo de entrega por participante — UI separada
  if (isMulti) {
    wrap.appendChild(renderMultiDeliverHeader(session));
    wrap.appendChild(renderParticipantsDeliveryTable(session, refresh));
    return wrap;
  }

  const isDelivered = Boolean(session.deliveredAt) || session.selectionStatus === 'delivered';
  const hasReopenRequest = Boolean(session.reopenRequested);
  const hasExtraRequest = session.extraRequest?.status === 'pending';
  const isGallery = session.mode === 'gallery';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <h2 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin:0 0 0.25rem;">
      ${isDelivered ? 'Sessão Entregue' : 'Entregar Sessão'}
    </h2>
    <p style="color:var(--text-secondary); font-size:0.875rem; margin:0;">
      ${isDelivered
      ? 'O cliente já recebeu a notificação e pode baixar as fotos.'
      : isGallery
        ? 'Confirme a entrega para liberar o download da galeria ao cliente.'
        : 'Confirme a entrega para liberar o download das fotos editadas ao cliente.'}
    </p>
  `;
  wrap.appendChild(header);

  // Pedido de reabertura (prioritário — bloqueia entrega)
  if (hasReopenRequest && !isDelivered) {
    const card = document.createElement('div');
    card.style.cssText = `
      background: color-mix(in srgb, var(--orange) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--orange) 30%, transparent);
      border-radius: 0.5rem; padding: 1rem 1.25rem;
    `;
    card.innerHTML = `
      <div style="font-weight:600; color:var(--orange); margin-bottom:0.25rem;">⚠ Pedido de reabertura</div>
      <div style="font-size:0.875rem; color:var(--text-secondary); margin-bottom:0.75rem;">O cliente pediu para alterar a seleção. Decida antes de entregar.</div>
    `;
    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex; gap:0.5rem;';

    const acceptBtn = document.createElement('button');
    acceptBtn.textContent = '✓ Reabrir seleção';
    acceptBtn.style.cssText = `background:var(--green); color:white; border:none; padding:0.5rem 1rem; border-radius:0.375rem; cursor:pointer; font-size:0.8125rem;`;
    acceptBtn.onclick = async () => {
      try {
        await apiPut(`/api/sessions/${session._id}/reopen`, {});
        window.showToast?.('Seleção reaberta. Cliente pode alterar fotos.', 'success');
        await refresh();
      } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
    };

    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = '✗ Recusar pedido';
    dismissBtn.style.cssText = `background:transparent; color:var(--text-primary); border:1px solid var(--border); padding:0.5rem 1rem; border-radius:0.375rem; cursor:pointer; font-size:0.8125rem;`;
    dismissBtn.onclick = async () => {
      const ok = await window.showConfirm?.('Recusar o pedido mantém a seleção atual. Confirmar?', { confirmText: 'Recusar', cancelText: 'Cancelar' });
      if (!ok) return;
      try {
        await apiPut(`/api/sessions/${session._id}/dismiss-reopen`, {});
        window.showToast?.('Pedido recusado', 'info');
        await refresh();
      } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
    };

    btns.appendChild(acceptBtn);
    btns.appendChild(dismissBtn);
    card.appendChild(btns);
    wrap.appendChild(card);
  }

  // Pedido de fotos extras
  if (hasExtraRequest) {
    const extras = session.extraRequest.photos || [];
    const card = document.createElement('div');
    card.style.cssText = `
      background: color-mix(in srgb, var(--yellow) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--yellow) 30%, transparent);
      border-radius: 0.5rem; padding: 1rem 1.25rem;
    `;
    card.innerHTML = `
      <div style="font-weight:600; color:var(--yellow); margin-bottom:0.25rem;">📸 ${extras.length} foto(s) extra(s) solicitada(s)</div>
      <div style="font-size:0.875rem; color:var(--text-secondary); margin-bottom:0.75rem;">O cliente quer adicionar fotos ao pacote.</div>
    `;
    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex; gap:0.5rem;';

    const acceptBtn = document.createElement('button');
    acceptBtn.textContent = `✓ Aceitar ${extras.length} extras`;
    acceptBtn.style.cssText = `background:var(--green); color:white; border:none; padding:0.5rem 1rem; border-radius:0.375rem; cursor:pointer; font-size:0.8125rem;`;
    acceptBtn.onclick = async () => {
      try {
        await apiPut(`/api/sessions/${session._id}/extra-request/accept`, {});
        window.showToast?.('Extras aceitos e adicionados à seleção', 'success');
        await refresh();
      } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
    };

    const rejectBtn = document.createElement('button');
    rejectBtn.textContent = '✗ Recusar';
    rejectBtn.style.cssText = `background:transparent; color:var(--text-primary); border:1px solid var(--border); padding:0.5rem 1rem; border-radius:0.375rem; cursor:pointer; font-size:0.8125rem;`;
    rejectBtn.onclick = async () => {
      const reason = prompt('Motivo da recusa (opcional):') || '';
      try {
        await apiPut(`/api/sessions/${session._id}/extra-request/reject`, { reason });
        window.showToast?.('Extras recusados', 'info');
        await refresh();
      } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
    };

    btns.appendChild(acceptBtn);
    btns.appendChild(rejectBtn);
    card.appendChild(btns);
    wrap.appendChild(card);
  }

  // Botão grande Entregar (ou Re-entregar se já entregue)
  const deliverCard = document.createElement('div');
  deliverCard.style.cssText = `
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius: 0.5rem; padding: 1.5rem;
    display: flex; flex-direction: column; align-items: flex-start; gap: 0.75rem;
  `;

  if (isDelivered) {
    deliverCard.innerHTML = `
      <div style="font-size:0.875rem; color:var(--text-primary);">
        ✓ Entregue em <strong>${session.deliveredAt ? new Date(session.deliveredAt).toLocaleString('pt-BR') : 'momento desconhecido'}</strong>
      </div>
    `;
    const reBtn = document.createElement('button');
    reBtn.textContent = '🔄 Re-entregar (notificar novamente)';
    reBtn.style.cssText = `background:var(--orange); color:white; border:none; padding:0.5rem 1rem; border-radius:0.375rem; cursor:pointer; font-size:0.8125rem; font-weight:500;`;
    reBtn.onclick = async () => {
      const ok = await window.showConfirm?.('Notificar o cliente novamente sobre a entrega?', { confirmText: 'Sim, re-notificar', cancelText: 'Cancelar' });
      if (!ok) return;
      try {
        await apiPut(`/api/sessions/${session._id}/deliver`, {});
        window.showToast?.('Cliente notificado novamente', 'success');
        await refresh();
      } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
    };
    deliverCard.appendChild(reBtn);
  } else {
    const blocked = hasReopenRequest;
    const blockMsg = blocked ? 'Decida o pedido de reabertura antes de entregar.' : null;

    // Textarea de personalização do e-mail de entrega
    let deliverEmailTextareaEl = null;
    deliverCard.appendChild(buildMessageCustomizer({
      label: 'Personalizar mensagem do e-mail',
      defaultText: buildDeliveryEmailIntro(session),
      onTextareaReady: el => { deliverEmailTextareaEl = el; },
      onInput: async (val) => {
        await apiPut(`/api/sessions/${session._id}/custom-messages`, { customDeliverEmailIntro: val });
        session.customDeliverEmailIntro = val;
      }
    }));

    const deliverBtn = document.createElement('button');
    deliverBtn.textContent = '✅ Entregar e notificar cliente';
    deliverBtn.disabled = blocked;
    deliverBtn.style.cssText = `
      background: ${blocked ? 'var(--bg-base)' : 'var(--green)'};
      color: ${blocked ? 'var(--text-muted)' : 'white'};
      border: ${blocked ? '1px solid var(--border)' : 'none'};
      padding: 0.75rem 1.5rem; border-radius: 0.5rem;
      cursor: ${blocked ? 'not-allowed' : 'pointer'};
      font-weight: 600; font-size: 0.9375rem;
    `;
    if (blockMsg) deliverBtn.title = blockMsg;
    deliverBtn.onclick = async () => {
      const ok = await window.showConfirm?.('Confirmar entrega? O cliente receberá um e-mail e o download será liberado.', { confirmText: 'Entregar', cancelText: 'Cancelar' });
      if (!ok) return;
      try {
        const emailIntro = deliverEmailTextareaEl?.value?.trim() || undefined;
        await apiPut(`/api/sessions/${session._id}/deliver`, emailIntro ? { emailIntro } : {});
        window.showToast?.('Sessão entregue! Cliente notificado.', 'success');
        await refresh();
      } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
    };
    deliverCard.appendChild(deliverBtn);
    if (blockMsg) {
      const hint = document.createElement('div');
      hint.textContent = blockMsg;
      hint.style.cssText = 'font-size:0.75rem; color:var(--text-muted);';
      deliverCard.appendChild(hint);
    }
  }
  wrap.appendChild(deliverCard);

  // Card "Compartilhar entrega" — WhatsApp + copiar link
  // (visível antes e depois da entrega; útil pra reforçar o aviso pelo canal preferido do cliente)
  wrap.appendChild(renderShareDeliveryCard(session));

  // Painel de retenção de storage
  wrap.appendChild(renderStoragePanel(session, refresh));

  // Histórico de entregas
  if (Array.isArray(session.deliveryHistory) && session.deliveryHistory.length > 0) {
    const histSection = document.createElement('div');
    histSection.style.cssText = 'border-top:1px solid var(--border); padding-top:1rem;';
    const histTitle = document.createElement('div');
    histTitle.textContent = 'Histórico';
    histTitle.style.cssText = 'font-size:0.8125rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.5rem;';
    histSection.appendChild(histTitle);

    session.deliveryHistory.slice().reverse().forEach((entry, idx) => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 0.5rem 0.75rem; border-left: 2px solid var(--green);
        margin-bottom: 0.5rem; background: var(--bg-surface);
        border-radius: 0 0.25rem 0.25rem 0; font-size: 0.8125rem;
      `;
      const when = entry.deliveredAt ? new Date(entry.deliveredAt).toLocaleString('pt-BR') : '—';
      let html = `<strong>Entrega #${session.deliveryHistory.length - idx}</strong> · ${when}`;
      if (entry.selectedCount) html += ` · ${entry.selectedCount} fotos`;
      if (entry.reopenedAt) html += `<br><span style="color:var(--orange);">↻ Reaberta em ${new Date(entry.reopenedAt).toLocaleString('pt-BR')}</span>`;
      if (entry.reopenReason) html += `<br><span style="color:var(--text-muted); font-size:0.75rem;">"${entry.reopenReason}"</span>`;
      item.innerHTML = html;
      histSection.appendChild(item);
    });

    wrap.appendChild(histSection);
  }

  return wrap;
}

// ============================================================================
// Status de downloads do cliente
// ============================================================================

function _computeDownloadStatus(session) {
  const events = session.events || [];
  const dlEvents = events.filter(e => e.type === 'client_downloaded');

  const isGallery = session.mode === 'gallery';
  const deliveredPhotos = isGallery
    ? session.photos || []
    : (session.photos || []).filter(p => p.urlOriginal);
  const deliveredCount = deliveredPhotos.length;

  if (!session.deliveredAt || deliveredCount === 0) return { status: 'no_delivery', delivered: 0, downloaded: 0 };
  if (dlEvents.length === 0) return { status: 'none', delivered: deliveredCount, downloaded: 0 };

  const hasZip = dlEvents.some(e => e.meta?.type === 'zip');
  if (hasZip) return { status: 'complete', delivered: deliveredCount, downloaded: deliveredCount };

  const downloadedFiles = new Set(dlEvents.flatMap(e => e.meta?.filenames || []));
  const downloadedCount = downloadedFiles.size;
  if (downloadedCount >= deliveredCount) return { status: 'complete', delivered: deliveredCount, downloaded: downloadedCount };
  return { status: 'partial', delivered: deliveredCount, downloaded: downloadedCount };
}

function _confirmWithDownloadCheck(session, actionLabel, actionFn) {
  const ds = _computeDownloadStatus(session);

  // Sem entrega ainda ou tudo baixado → fluxo normal sem aviso extra
  if (ds.status === 'no_delivery' || ds.status === 'complete') {
    return actionFn();
  }

  const msg = ds.status === 'none'
    ? `O cliente ainda não fez nenhum download das <strong>${ds.delivered}</strong> foto(s) entregues.`
    : `O cliente baixou <strong>${ds.downloaded} de ${ds.delivered}</strong> foto(s) entregues — download parcial.`;

  return new Promise((resolve) => {
    document.getElementById('dl-warn-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'dl-warn-modal';
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:99999;
      display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background:var(--bg-surface); border:1px solid var(--border);
      border-radius:0.75rem; padding:1.5rem; width:400px; max-width:90vw;
      box-shadow:0 20px 60px rgba(0,0,0,0.4);
    `;

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:1rem; font-weight:700; color:var(--text-primary); margin-bottom:0.5rem;';
    titleEl.textContent = '⚠️ Download pendente';

    const desc = document.createElement('p');
    desc.style.cssText = 'font-size:0.875rem; color:var(--text-secondary); line-height:1.6; margin:0 0 1.25rem;';
    desc.innerHTML = `${msg}<br><br>Deseja avisar o cliente por e-mail antes de continuar, ou prosseguir mesmo assim?`;

    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex; flex-direction:column; gap:0.5rem;';

    const close = () => { overlay.remove(); resolve(); };

    const notifyBtn = document.createElement('button');
    notifyBtn.type = 'button';
    notifyBtn.textContent = '📧 Avisar o cliente por e-mail';
    notifyBtn.style.cssText = `
      background:var(--accent); color:var(--bg-base); border:none;
      padding:0.625rem 1rem; border-radius:0.5rem; cursor:pointer;
      font-size:0.875rem; font-weight:600; text-align:left;
    `;
    notifyBtn.onclick = async () => {
      close();
      try {
        await apiPost(`/api/sessions/${session._id}/notify-pending-download`, {});
        window.showToast?.('E-mail enviado ao cliente avisando para baixar as fotos.', 'success');
      } catch (e) {
        window.showToast?.('Erro ao enviar e-mail: ' + e.message, 'error');
      }
    };

    const proceedBtn = document.createElement('button');
    proceedBtn.type = 'button';
    proceedBtn.textContent = `🗑️ ${actionLabel}`;
    proceedBtn.style.cssText = `
      background:transparent; color:var(--red); border:1px solid color-mix(in srgb, var(--red) 40%, transparent);
      padding:0.625rem 1rem; border-radius:0.5rem; cursor:pointer;
      font-size:0.875rem; font-weight:600; text-align:left;
    `;
    proceedBtn.onclick = async () => { close(); await actionFn(); };

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.cssText = `
      background:transparent; color:var(--text-secondary); border:1px solid var(--border);
      padding:0.5rem 1rem; border-radius:0.5rem; cursor:pointer; font-size:0.875rem; text-align:left;
    `;
    cancelBtn.onclick = close;

    btns.appendChild(notifyBtn);
    btns.appendChild(proceedBtn);
    btns.appendChild(cancelBtn);
    box.appendChild(titleEl);
    box.appendChild(desc);
    box.appendChild(btns);
    overlay.appendChild(box);
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    document.body.appendChild(overlay);
  });
}

// ============================================================================
// Painel de retenção de storage
// ============================================================================

function renderStoragePanel(session, refresh) {
  const panel = document.createElement('div');
  panel.style.cssText = 'border-top:1px solid var(--border); padding-top:1rem;';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:0.8125rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.75rem; letter-spacing:0.04em; text-transform:uppercase;';
  title.textContent = 'Armazenamento';
  panel.appendChild(title);

  const now = new Date();
  const isArchived = Boolean(session.archivedAt);
  const retentionDate = session.storageRetentionUntil ? new Date(session.storageRetentionUntil) : null;
  const daysLeft = retentionDate ? Math.ceil((retentionDate - now) / 86400000) : null;
  const isExpired = daysLeft !== null && daysLeft <= 0;
  const isWarning = daysLeft !== null && daysLeft <= 7 && !isArchived;

  // Sessão já arquivada
  if (isArchived) {
    const card = document.createElement('div');
    card.style.cssText = `
      background: color-mix(in srgb, var(--text-muted) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--text-muted) 20%, transparent);
      border-radius: 0.5rem; padding: 1rem 1.25rem;
      display: flex; flex-direction: column; gap: 0.5rem;
    `;
    card.innerHTML = `
      <div style="font-weight:600; color:var(--text-secondary);">📦 Fotos arquivadas</div>
      <div style="font-size:0.8125rem; color:var(--text-muted);">
        As fotos originais foram removidas do servidor em ${new Date(session.archivedAt).toLocaleDateString('pt-BR')}.
        ${session.externalStorageUrl
          ? `<br>Storage externo: <a href="${escapeHtml(session.externalStorageUrl)}" target="_blank" rel="noopener" style="color:var(--accent); text-decoration:underline;">${escapeHtml(session.externalStorageUrl)}</a>`
          : 'Nenhum link de storage externo configurado.'}
      </div>
    `;
    panel.appendChild(card);
    return panel;
  }

  // Sem data configurada — só mostrar o estado vazio com link para configurar
  if (!retentionDate) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:0.8125rem; color:var(--text-muted);';
    empty.innerHTML = 'Sem prazo de retenção configurado. Para definir, acesse ⚙️ Configurações da sessão.';
    panel.appendChild(empty);
    return panel;
  }

  // Card com a data configurada
  const card = document.createElement('div');
  const borderColor = isWarning
    ? 'color-mix(in srgb, var(--red) 30%, transparent)'
    : 'color-mix(in srgb, var(--orange) 25%, transparent)';
  const bgColor = isWarning
    ? 'color-mix(in srgb, var(--red) 8%, transparent)'
    : 'color-mix(in srgb, var(--orange) 6%, transparent)';
  card.style.cssText = `
    background: ${bgColor};
    border: 1px solid ${borderColor};
    border-radius: 0.5rem; padding: 1rem 1.25rem;
    display: flex; flex-direction: column; gap: 0.75rem;
  `;

  const info = document.createElement('div');
  const alertColor = isExpired ? 'var(--red)' : (isWarning ? 'var(--red)' : 'var(--orange)');
  const alertMsg = isExpired
    ? `⚠ O prazo de retenção venceu em ${retentionDate.toLocaleDateString('pt-BR')}. Decida o que fazer com as fotos.`
    : `⏳ Fotos armazenadas até <strong>${retentionDate.toLocaleDateString('pt-BR')}</strong> (${daysLeft} dia${daysLeft === 1 ? '' : 's'} restante${daysLeft === 1 ? '' : 's'}).`;
  info.innerHTML = `<div style="font-size:0.875rem; color:${alertColor};">${alertMsg}</div>`;
  card.appendChild(info);

  // Ações: Estender prazo | Arquivar | Deletar
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;';

  // — Estender prazo
  const extendWrap = document.createElement('div');
  extendWrap.style.cssText = 'display:flex; gap:0.25rem; align-items:center;';
  const extendInput = document.createElement('input');
  extendInput.type = 'date';
  extendInput.className = 'input';
  extendInput.style.cssText = 'font-size:0.8125rem; padding:0.375rem 0.5rem; height:auto;';
  extendInput.min = new Date().toISOString().split('T')[0];
  extendInput.value = retentionDate.toISOString().split('T')[0];
  const extendBtn = document.createElement('button');
  extendBtn.type = 'button';
  extendBtn.textContent = 'Estender prazo';
  extendBtn.style.cssText = `
    background: var(--accent); color: var(--bg-base); border: none;
    padding: 0.375rem 0.75rem; border-radius: 0.375rem;
    cursor: pointer; font-size: 0.8125rem; font-weight: 500; white-space:nowrap;
  `;
  extendBtn.onclick = async () => {
    if (!extendInput.value) return;
    const newDate = extendInput.value;
    try {
      await apiPut(`/api/sessions/${session._id}/storage-retention`, {
        storageRetentionUntil: newDate,
        storageAutoDelete: session.storageAutoDelete || false
      });
      window.showToast?.('Prazo de retenção atualizado!', 'success');
      await refresh();
    } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
  };
  extendWrap.appendChild(extendInput);
  extendWrap.appendChild(extendBtn);
  actions.appendChild(extendWrap);

  // — Arquivar (remove fotos, mantém capa + link externo)
  const archiveBtn = document.createElement('button');
  archiveBtn.type = 'button';
  archiveBtn.textContent = '📦 Arquivar (manter só a capa)';
  archiveBtn.style.cssText = `
    background: transparent; color: var(--text-primary);
    border: 1px solid var(--border);
    padding: 0.375rem 0.75rem; border-radius: 0.375rem;
    cursor: pointer; font-size: 0.8125rem; font-weight: 500;
  `;
  archiveBtn.onclick = () => _confirmWithDownloadCheck(session, 'Arquivar mesmo assim', async () => {
    const ok = await window.showConfirm?.(
      'As fotos originais serão removidas do servidor (exceto a capa). A sessão continua acessível no painel. Tem certeza?',
      { confirmText: 'Arquivar', cancelText: 'Cancelar' }
    );
    if (!ok) return;
    const externalUrl = prompt('Cole o link do Drive/Dropbox (opcional, deixe em branco se não tiver):') ?? '';
    try {
      await apiPost(`/api/sessions/${session._id}/archive`, { externalStorageUrl: externalUrl.trim() });
      window.showToast?.('Sessão arquivada. Fotos removidas do servidor.', 'success');
      await refresh();
    } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
  });
  actions.appendChild(archiveBtn);

  // — Deletar tudo
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.textContent = '🗑️ Deletar todas as fotos';
  deleteBtn.style.cssText = `
    background: transparent; color: var(--red);
    border: 1px solid color-mix(in srgb, var(--red) 40%, transparent);
    padding: 0.375rem 0.75rem; border-radius: 0.375rem;
    cursor: pointer; font-size: 0.8125rem; font-weight: 500;
  `;
  deleteBtn.onclick = () => _confirmWithDownloadCheck(session, 'Deletar mesmo assim', async () => {
    const ok = await window.showConfirm?.(
      'ATENÇÃO: todas as fotos (incluindo a capa) serão excluídas permanentemente do servidor. Esta ação não pode ser desfeita. Confirmar?',
      { confirmText: 'Deletar permanentemente', cancelText: 'Cancelar', danger: true }
    );
    if (!ok) return;
    try {
      await apiPost(`/api/sessions/${session._id}/delete-photos`, {});
      window.showToast?.('Todas as fotos foram excluídas do servidor.', 'success');
      await refresh();
    } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
  });
  actions.appendChild(deleteBtn);

  card.appendChild(actions);
  panel.appendChild(card);
  return panel;
}

// ============================================================================
// Compartilhar entrega — WhatsApp + Copiar link (não-multi)
// ============================================================================

function renderShareDeliveryCard(session) {
  const card = document.createElement('div');
  card.style.cssText = `
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius: 0.5rem; padding: 1rem 1.25rem;
    display: flex; flex-direction: column; gap: 0.625rem;
  `;
  const title = document.createElement('div');
  title.innerHTML = `
    <div style="font-size:0.875rem; font-weight:600; color:var(--text-primary);">Compartilhar entrega</div>
    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.125rem;">Reforce o aviso da entrega pelo canal preferido do cliente. Não dispara um novo e-mail.</div>
  `;
  card.appendChild(title);

  const clientName = session.clientId?.name || session.clientEmail || 'Cliente';
  const clientPhone = session.clientId?.phone || '';
  const orgName = appState.appData?.organization?.name || '';

  // Textarea editável para o WhatsApp de entrega
  let waTextareaEl = null;
  card.appendChild(buildMessageCustomizer({
    label: 'Personalizar mensagem do WhatsApp',
    defaultText: buildDeliveryWhatsAppText({ session, accessCode: session.accessCode, recipientName: clientName, orgName }),
    onTextareaReady: el => { waTextareaEl = el; },
    onInput: async (val) => {
      await apiPut(`/api/sessions/${session._id}/custom-messages`, { customDeliverWhatsAppText: val });
      session.customDeliverWhatsAppText = val;
    }
  }));

  const row = document.createElement('div');
  row.style.cssText = 'display:flex; gap:0.5rem; flex-wrap:wrap;';

  const waBtn = document.createElement('button');
  waBtn.type = 'button';
  waBtn.innerHTML = clientPhone ? '💬 Enviar WhatsApp' : '💬 Abrir WhatsApp (sem nº)';
  waBtn.title = clientPhone
    ? 'Abre o WhatsApp Web com a mensagem pré-preenchida'
    : 'Telefone do cliente não cadastrado — abre o WhatsApp para você digitar o número';
  waBtn.style.cssText = `
    background: #25D366; color: white; border: none;
    padding: 0.5rem 0.875rem; border-radius: 0.375rem;
    cursor: pointer; font-size: 0.8125rem; font-weight: 500;
  `;
  waBtn.onclick = () => {
    const customText = waTextareaEl?.value?.trim() || undefined;
    const url = buildWhatsAppDeliveryLink({
      session,
      accessCode: session.accessCode,
      recipientName: clientName,
      recipientPhone: clientPhone,
      orgName,
      customText
    });
    window.open(url, '_blank');
  };
  row.appendChild(waBtn);

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.textContent = '🔗 Copiar link da galeria';
  copyBtn.style.cssText = `
    background: var(--bg-base); color: var(--text-primary); border: 1px solid var(--border);
    padding: 0.5rem 0.875rem; border-radius: 0.375rem;
    cursor: pointer; font-size: 0.8125rem; font-weight: 500;
  `;
  copyBtn.onclick = async () => {
    await navigator.clipboard.writeText(buildGalleryUrl(session));
    copyBtn.textContent = '✓ Copiado!';
    setTimeout(() => { copyBtn.textContent = '🔗 Copiar link da galeria'; }, 2000);
  };
  row.appendChild(copyBtn);

  card.appendChild(row);
  return card;
}

// ============================================================================
// MULTI-SELEÇÃO — entrega por participante
// ============================================================================

function renderMultiDeliverHeader(session) {
  const ps = session.participants || [];
  const submitted = ps.filter(p => p.selectionStatus === 'submitted').length;
  const delivered = ps.filter(p => p.selectionStatus === 'delivered').length;
  const pending = ps.length - submitted - delivered;
  const allDelivered = delivered === ps.length && ps.length > 0;

  const header = document.createElement('div');
  header.innerHTML = `
    <h2 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin:0 0 0.25rem;">
      ${allDelivered ? 'Todos os participantes entregues' : 'Entregar participantes'}
    </h2>
    <p style="color:var(--text-secondary); font-size:0.875rem; margin:0;">
      ${ps.length === 0
      ? 'Nenhum participante cadastrado.'
      : `${delivered} entregue${delivered === 1 ? '' : 's'} · ${submitted} pronto${submitted === 1 ? '' : 's'} para entrega · ${pending} aguardando seleção.`}
    </p>
  `;
  return header;
}

function renderParticipantsDeliveryTable(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius: 0.5rem; overflow: hidden;
  `;

  const participants = session.participants || [];

  // Header com botão "Entregar todos prontos"
  const head = document.createElement('div');
  head.style.cssText = `
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 0.75rem;
  `;
  const headTitle = document.createElement('div');
  headTitle.textContent = 'Participantes';
  headTitle.style.cssText = 'flex:1; font-size:0.75rem; font-weight:600; color:var(--text-secondary); letter-spacing:0.05em; text-transform:uppercase;';
  head.appendChild(headTitle);

  const readyForBulk = participants.filter(p => p.selectionStatus === 'submitted');
  if (readyForBulk.length > 1) {
    const bulkBtn = document.createElement('button');
    bulkBtn.type = 'button';
    bulkBtn.textContent = `✅ Entregar todos (${readyForBulk.length})`;
    bulkBtn.style.cssText = `background:var(--green); color:white; border:none; padding:0.375rem 0.75rem; border-radius:0.375rem; cursor:pointer; font-size:0.75rem; font-weight:500;`;
    bulkBtn.onclick = async () => {
      const ok = await window.showConfirm?.(`Entregar para ${readyForBulk.length} participantes prontos?`, { confirmText: 'Entregar todos', cancelText: 'Cancelar' });
      if (!ok) return;
      try {
        for (const p of readyForBulk) {
          await apiPut(`/api/sessions/${session._id}/participants/${p._id}/deliver`, {});
        }
        window.showToast?.(`${readyForBulk.length} participante(s) entregue(s)`, 'success');
        await refresh();
      } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
    };
    head.appendChild(bulkBtn);
  }
  wrap.appendChild(head);

  if (participants.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.875rem;';
    empty.textContent = 'Adicione participantes pelo passo "Enviar" (botão Gerenciar participantes).';
    wrap.appendChild(empty);
    return wrap;
  }

  const list = document.createElement('div');
  list.style.cssText = 'display:flex; flex-direction:column;';

  participants.forEach((p, i) => {
    const status = p.selectionStatus || 'pending';
    const statusInfo = {
      pending: { label: 'Não iniciou', color: 'var(--text-muted)' },
      in_progress: { label: 'Selecionando', color: 'var(--yellow)' },
      submitted: { label: 'Pronto para entrega', color: 'var(--green)' },
      delivered: { label: '✓ Entregue', color: 'var(--accent)' }
    }[status] || { label: status, color: 'var(--text-muted)' };

    const row = document.createElement('div');
    row.style.cssText = `
      padding: 0.625rem 0.875rem;
      display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
      ${i > 0 ? 'border-top: 1px solid var(--border);' : ''}
    `;

    const info = document.createElement('div');
    info.style.cssText = 'flex:1; min-width:160px;';
    info.innerHTML = `
      <div style="font-weight:500; color:var(--text-primary); font-size:0.875rem;">${escapeHtml(p.name)}</div>
      <div style="font-size:0.6875rem; color:var(--text-muted);">
        ${(p.selectedPhotos || []).length}${p.packageLimit ? ` / ${p.packageLimit}` : ''} fotos selecionadas
      </div>
    `;
    row.appendChild(info);

    const badge = document.createElement('div');
    badge.style.cssText = `font-size:0.75rem; color:${statusInfo.color}; font-weight:500; white-space:nowrap;`;
    badge.textContent = statusInfo.label;
    row.appendChild(badge);

    // Botão Entregar (só se submitted)
    if (status === 'submitted') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '✅ Entregar';
      btn.style.cssText = `background:var(--green); color:white; border:none; padding:0.375rem 0.75rem; border-radius:0.375rem; cursor:pointer; font-size:0.75rem; font-weight:500;`;
      btn.onclick = async () => {
        const ok = await window.showConfirm?.(`Entregar fotos para ${p.name}?`, { confirmText: 'Entregar', cancelText: 'Cancelar' });
        if (!ok) return;
        try {
          await apiPut(`/api/sessions/${session._id}/participants/${p._id}/deliver`, {});
          window.showToast?.(`${p.name} notificado(a)`, 'success');
          await refresh();
        } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
      };
      row.appendChild(btn);
    }

    // WhatsApp individual: disponível tanto antes (alinhar expectativa) quanto depois (reforço)
    if (status === 'submitted' || status === 'delivered') {
      const waBtn = document.createElement('button');
      waBtn.type = 'button';
      waBtn.title = p.phone
        ? 'Abrir WhatsApp com mensagem de entrega'
        : 'Telefone não cadastrado — abre o WhatsApp sem número';
      waBtn.innerHTML = '💬 WhatsApp';
      waBtn.style.cssText = `background:#25D366; color:white; border:none; padding:0.375rem 0.75rem; border-radius:0.375rem; cursor:pointer; font-size:0.75rem; font-weight:500;`;
      waBtn.onclick = () => {
        const orgName = appState.appData?.organization?.name || 'CliqueZoom';
        const url = buildWhatsAppDeliveryLink({
          session,
          accessCode: p.accessCode,
          recipientName: p.name,
          recipientPhone: p.phone,
          orgName
        });
        window.open(url, '_blank');
      };
      row.appendChild(waBtn);

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.textContent = '🔗 Link';
      copyBtn.title = 'Copiar link da galeria deste participante';
      copyBtn.style.cssText = `background:var(--bg-base); color:var(--text-primary); border:1px solid var(--border); padding:0.375rem 0.75rem; border-radius:0.375rem; cursor:pointer; font-size:0.75rem;`;
      copyBtn.onclick = async () => {
        await navigator.clipboard.writeText(buildGalleryUrlForCode(session, p.accessCode));
        const prev = copyBtn.textContent;
        copyBtn.textContent = '✓';
        setTimeout(() => { copyBtn.textContent = prev; }, 1500);
      };
      row.appendChild(copyBtn);
    }

    list.appendChild(row);
  });

  wrap.appendChild(list);
  return wrap;
}
