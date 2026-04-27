import { copyToClipboard } from '../../utils/helpers.js';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/api.js';
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
    const session = state.sessionsData.find(s => s._id === sessionId);
    if (!session) return;

    const selectedIds = new Set(session.selectedPhotos || []);
    const missing = (session.photos || []).filter(p => selectedIds.has(p.id) && !p.urlOriginal);
    const extras = (session.photos || []).filter(p => p.urlOriginal && !selectedIds.has(p.id));

    // Bloquear se há fotos selecionadas sem editada
    if (missing.length > 0) {
      window.showToast?.(
        `${missing.length} foto(s) selecionada(s) ainda sem versão editada. Faça o upload antes de entregar.`,
        'error', 6000
      );
      return;
    }

    // Se há extras, pedir confirmação explícita
    if (extras.length > 0) {
      const nomes = extras.map(p => p.filename || p.id).join(', ');
      const ok = await window.showConfirm?.(
        `${extras.length} foto(s) têm versão editada mas NÃO foram selecionadas pelo cliente: ${nomes}.\n\nDeseja entregar mesmo assim? Fotos extras podem gerar cobrança adicional.`
      );
      if (!ok) return;
    } else {
      const isRedelivery = session.redeliveryMode === true || session.selectionStatus === 'delivered';
      const msg = isRedelivery
        ? `Confirmar re-entrega? O cliente receberá e-mail avisando que as novas fotos estão disponíveis.`
        : `Marcar esta sessão como entregue? O watermark será removido e o cliente poderá baixar as fotos.`;
      const ok = await window.showConfirm?.(msg);
      if (!ok) return;
    }

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
    // Criação de Modal Customizado seguindo o Design System e usando inline styles
    const modalHtml = `
        <div id="rejectExtraModal" style="position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.75);">
            <div style="background:#1f2937; padding:1.5rem; border-radius:0.5rem; width:100%; max-width:400px; border:1px solid #374151; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);">
                <h3 style="color:#f3f4f6; font-size:1.125rem; font-weight:600; margin-bottom:1rem;">Recusar Fotos Extras</h3>
                <p style="color:#d1d5db; font-size:0.875rem; margin-bottom:0.5rem;">Informe ao cliente o motivo da recusa (obrigatório):</p>
                <textarea id="rejectReasonInput" rows="3" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem; margin-bottom:1rem; font-family:inherit; resize:none;" placeholder="Ex: O pacote escolhido não permite extras, ou o pagamento não foi confirmado..."></textarea>
                
                <div style="background:rgba(255,166,87,0.1); border:1px solid rgba(255,166,87,0.2); padding:0.75rem; border-radius:0.375rem; margin-bottom:1rem;">
                    <p style="color:var(--orange); font-size:0.75rem; margin:0; line-height:1.4;">
                        💡 <strong>Dica:</strong> Se não deseja mais receber pedidos de extras nesta sessão, vá em <strong>Config (Editar Sessão)</strong> e desmarque a opção <em>"Venda de fotos extras habilitada"</em>.
                    </p>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
                    <button onclick="document.getElementById('rejectExtraModal').remove()" style="padding:0.5rem 1rem; background:transparent; border:1px solid #4b5563; color:#d1d5db; border-radius:0.375rem; cursor:pointer;">Cancelar</button>
                    <button id="confirmRejectBtn" style="padding:0.5rem 1rem; background:#ef4444; border:none; color:white; border-radius:0.375rem; cursor:pointer; font-weight:600;">Recusar Pedido</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('confirmRejectBtn').onclick = async () => {
      const reason = document.getElementById('rejectReasonInput').value.trim();

      if (!reason) {
        window.showToast?.('Por favor, informe um motivo para o cliente.', 'warning');
        return;
      }

      const btn = document.getElementById('confirmRejectBtn');
      btn.textContent = 'Aguarde...';
      btn.disabled = true;

      try {
        await apiPut(`/api/sessions/${sessionId}/extra-request/reject`, { reason });
        document.getElementById('rejectExtraModal').remove();
        window.showToast?.('Solicitação recusada e cliente notificado.', 'success');
        await renderSessoes(container);
      } catch (error) {
        btn.textContent = 'Recusar Pedido';
        btn.disabled = false;
        window.showToast?.('Erro ao recusar: ' + error.message, 'error');
      }
    };
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

  window.viewSessionHistory = async (sessionId) => {
    const existing = document.getElementById('session-history-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'session-history-modal';
    modal.style.cssText = `
      position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.55);padding:16px;
    `;
    modal.innerHTML = `
      <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;
                  width:100%;max-width:520px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
          <span style="font-weight:600;font-size:1rem;color:var(--text);">Histórico da sessão</span>
          <button id="hist-close" style="background:none;border:none;cursor:pointer;font-size:1.3rem;color:var(--text-muted);line-height:1;">&times;</button>
        </div>
        <div id="hist-body" style="overflow-y:auto;padding:20px;">
          <p style="color:var(--text-muted);font-size:0.875rem;">Carregando...</p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#hist-close').onclick = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    const fmt = (d) => {
      if (!d) return '—';
      return new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    };

    const statusLabel = { pending:'Aguardando', in_progress:'Em seleção', submitted:'Seleção enviada', delivered:'Entregue', expired:'Expirado' };
    const statusColor = { pending:'var(--text-muted)', in_progress:'var(--yellow)', submitted:'var(--accent)', delivered:'var(--green)', expired:'var(--red)' };

    try {
      const data = await apiGet(`/api/sessions/${sessionId}`);
      const s = data.session;

      const events = [];

      const modeLabel = { selection: 'Seleção', gallery: 'Galeria', multi_selection: 'Multi-seleção' };
      events.push({ icon:'📁', label:'Sessão criada', date: s.createdAt, detail: `Modo: ${modeLabel[s.mode] || s.mode} · Resolução: ${s.photoResolution || '—'}px` });

      const photoCount = s.photos?.length ?? 0;
      if (photoCount > 0) {
        const firstUpload = s.photos.map(p => p.uploadedAt).filter(Boolean).sort()[0];
        events.push({ icon:'🖼️', label:'Fotos carregadas', date: firstUpload || null, detail: `${photoCount} foto(s) disponível(is) para seleção` });
      }

      if (['in_progress', 'submitted', 'delivered'].includes(s.selectionStatus)) {
        events.push({ icon:'👁️', label:'Cliente acessou a galeria', date: null, detail: 'Seleção iniciada' });
      }

      if (s.selectionSubmittedAt || ['submitted', 'delivered'].includes(s.selectionStatus)) {
        events.push({ icon:'✅', label:'Seleção enviada pelo cliente', date: s.selectionSubmittedAt || null, detail: `${s.selectedPhotos?.length ?? 0} foto(s) selecionada(s) · Limite: ${s.packageLimit ?? '—'}` });
      }

      if (s.extraRequest?.status && s.extraRequest.status !== 'none') {
        const extraStatusLabel = { pending: 'Aguardando aprovação', accepted: 'Aprovado', rejected: 'Recusado' };
        events.push({ icon:'➕', label:'Fotos extras solicitadas', date: s.extraRequest.requestedAt || null, detail: `${s.extraRequest.photos?.length ?? 0} foto(s) extra(s) · ${extraStatusLabel[s.extraRequest.status] || s.extraRequest.status}` });
        if (s.extraRequest.respondedAt) {
          events.push({ icon: s.extraRequest.status === 'accepted' ? '✔️' : '✖️', label: `Extras ${s.extraRequest.status === 'accepted' ? 'aprovadas' : 'recusadas'}`, date: s.extraRequest.respondedAt, detail: '' });
        }
      }

      (s.deliveryHistory || []).forEach((entry, i) => {
        events.push({
          icon: '🚀',
          label: `Entrega #${i + 1}`,
          date: entry.deliveredAt,
          detail: `${entry.selectedCount ?? 0} foto(s) entregue(s)${entry.extrasDelivered?.length ? ` · ${entry.extrasDelivered.length} extra(s)` : ''}`
        });
        if (entry.reopenedAt) {
          events.push({
            icon: '🔄',
            label: 'Re-entrega solicitada',
            date: entry.reopenedAt,
            detail: entry.reopenReason ? `Motivo: ${entry.reopenReason}` : 'Sem motivo informado'
          });
        }
      });

      const timelineHtml = events.map((ev, i) => `
        <div style="display:flex;gap:14px;${i < events.length - 1 ? '' : ''}">
          <div style="display:flex;flex-direction:column;align-items:center;gap:0;">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--bg-elevated);border:1px solid var(--border);
                        display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;">${ev.icon}</div>
            ${i < events.length - 1 ? `<div style="width:2px;flex:1;min-height:20px;background:var(--border);margin:4px 0;"></div>` : ''}
          </div>
          <div style="padding-bottom:${i < events.length - 1 ? '4px' : '0'};min-width:0;">
            <div style="font-weight:500;font-size:0.875rem;color:var(--text);">${ev.label}</div>
            ${ev.date ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:1px;">${fmt(ev.date)}</div>` : ''}
            <div style="font-size:0.78rem;color:var(--text-dim);margin-top:2px;">${ev.detail}</div>
          </div>
        </div>
      `).join('');

      const currentStatus = s.redeliveryMode
        ? '<span style="color:var(--yellow);">Re-entregando</span>'
        : `<span style="color:${statusColor[s.selectionStatus] || 'var(--text-muted)'};">${statusLabel[s.selectionStatus] || s.selectionStatus}</span>`;

      modal.querySelector('#hist-body').innerHTML = `
        <div style="margin-bottom:16px;padding:10px 14px;background:var(--bg-elevated);border-radius:8px;border:1px solid var(--border);">
          <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:2px;">Status atual</div>
          <div style="font-size:0.9rem;font-weight:600;">${currentStatus}</div>
        </div>
        ${events.length ? timelineHtml : '<p style="color:var(--text-muted);font-size:0.875rem;">Nenhum evento registrado.</p>'}
      `;
    } catch {
      modal.querySelector('#hist-body').innerHTML = '<p style="color:var(--red);font-size:0.875rem;">Erro ao carregar histórico.</p>';
    }
  };
}
