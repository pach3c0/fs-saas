// unified-grid/participants.js — Central de participantes do modo multi_selection:
// roster + ações (Link/WhatsApp/Código/Preview/Cortesia) + entrega individual/lote +
// aceitar/recusar extras por participante.
// Extraído de unified-photo-grid.js sem alteração de comportamento.

import { apiPut } from '../../../../utils/api.js';
import { escapeHtml } from '../../../../utils/helpers.js';
import { appState } from '../../../../state.js';
import { icon } from '../../../../utils/icons.js';
import { openOverlayModal, buildGalleryUrlForCode, buildWhatsAppLink, buildWhatsAppDeliveryLink } from '../utils.js';
import { openCourtesyModal } from '../steps/6-deliver.js';
import { acceptExtraParticipant, rejectExtraParticipant } from '../steps/4-tracking.js';
import { makeExtraActionBtn } from './helpers.js';

export function renderParticipantsTable(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:.75rem;';

  const participants = session.participants || [];
  const checkedPids = new Set();

  // Referências para atualizar a UI ao checar
  let deliverGlobalBtn;
  let selectAllCheck;
  const rowChecks = new Map();

  const updateCheckedState = () => {
    // Atualiza checkbox global
    if (selectAllCheck) {
      selectAllCheck.checked = checkedPids.size > 0 && checkedPids.size === participants.length;
      selectAllCheck.indeterminate = checkedPids.size > 0 && checkedPids.size < participants.length;
    }

    // Atualiza botão global de entrega
    if (deliverGlobalBtn) {
      if (checkedPids.size > 0) {
        deliverGlobalBtn.style.display = 'inline-flex';
        deliverGlobalBtn.querySelector('.deliver-label').textContent = `Entregar (${checkedPids.size})`;
      } else {
        deliverGlobalBtn.style.display = 'none';
      }
    }
  };

  // ── Cabeçalho: título + botões Gerenciar / Preview / Entregar ────────────
  const head = document.createElement('div');
  head.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:.5rem; flex-wrap:wrap;';

  const headLeft = document.createElement('div');
  headLeft.style.cssText = 'display:flex; align-items:center; gap:.75rem;';

  selectAllCheck = document.createElement('input');
  selectAllCheck.type = 'checkbox';
  selectAllCheck.style.cssText = 'width:16px; height:16px; accent-color:var(--accent); cursor:pointer; margin:0;';
  selectAllCheck.onchange = (e) => {
    if (e.target.checked) {
      participants.forEach(p => checkedPids.add(p._id));
    } else {
      checkedPids.clear();
    }
    rowChecks.forEach((chk, pid) => chk.checked = checkedPids.has(pid));
    updateCheckedState();
  };
  headLeft.appendChild(selectAllCheck);

  const titleWrap = document.createElement('div');
  titleWrap.innerHTML = `
    <div style="font-size:.875rem; font-weight:600; color:var(--text-primary);">Participantes (${participants.length})</div>
    <div style="font-size:.6875rem; color:var(--text-muted);">Selecione para entregar em lote.</div>
  `;
  headLeft.appendChild(titleWrap);
  head.appendChild(headLeft);

  const headRight = document.createElement('div');
  headRight.style.cssText = 'display:flex; gap:.375rem; align-items:center; flex-wrap:wrap;';

  // Preview removido do cabeçalho global, agora fica dentro de cada participante

  // Botão Entregar Global (Lote)
  deliverGlobalBtn = document.createElement('button');
  deliverGlobalBtn.type = 'button';
  deliverGlobalBtn.className = 'cz-ug-pill';
  deliverGlobalBtn.style.cssText += 'border-color:color-mix(in srgb, var(--green) 40%, transparent); color:var(--green); display:none;';
  deliverGlobalBtn.innerHTML = `<span style="display:flex;align-items:center;">${icon('checkCircle', 13)}</span><span class="deliver-label">Entregar (0)</span>`;
  deliverGlobalBtn.onclick = async () => {
    if (checkedPids.size === 0) return;
    const ok = await window.showConfirm?.(`Liberar download (entregar) para ${checkedPids.size} participante(s)?`, { confirmText: 'Entregar', cancelText: 'Cancelar' });
    if (!ok) return;

    try {
      // Chama API individual para cada um
      for (const pid of checkedPids) {
        await apiPut(`/api/sessions/${session._id}/participants/${pid}/deliver`);
      }
      window.showToast?.(`Entregue para ${checkedPids.size} participante(s)!`, 'success');
      await refresh();
    } catch (e) {
      window.showToast?.('Erro ao entregar em lote: ' + e.message, 'error');
    }
  };
  headRight.appendChild(deliverGlobalBtn);

  // Gerenciar participantes
  const manageBtn = document.createElement('button');
  manageBtn.type = 'button';
  manageBtn.className = 'header-expand-btn';
  manageBtn.title = 'Gerenciar participantes';
  manageBtn.style.cssText = 'border:1px solid var(--border);';
  manageBtn.innerHTML = `
    <span class="header-expand-icon" style="display:flex;align-items:center;justify-content:center;">${icon('config', 16)}</span>
    <span class="header-expand-label">Gerenciar</span>
  `;
  manageBtn.onclick = () => {
    if (!window.viewParticipants) return;
    openOverlayModal({ modalSelector: '#participantsModal', opener: () => window.viewParticipants(session._id), onClose: refresh });
  };
  headRight.appendChild(manageBtn);

  head.appendChild(headRight);
  wrap.appendChild(head);

  // ── Lista de participantes ────────────────────────────────────────────────
  if (!participants.length) {
    const empty = document.createElement('div');
    empty.style.cssText = `
      border:2px dashed var(--border); border-radius:var(--r-card);
      padding:1.25rem; text-align:center; color:var(--text-muted); font-size:.875rem;
    `;
    empty.textContent = 'Nenhum participante ainda. Clique em "Gerenciar" para adicionar.';
    wrap.appendChild(empty);
    return wrap;
  }

  const list = document.createElement('div');
  list.style.cssText = 'display:flex; flex-direction:column; gap:.375rem;';

  participants.forEach((p) => {
    const row = document.createElement('div');
    row.style.cssText = `
      background:var(--bg-base); border:1px solid var(--border); border-radius:var(--r-card);
      padding:.625rem .875rem;
      display:flex; align-items:center; gap:.625rem; flex-wrap:wrap;
    `;

    // Checkbox da linha
    const rowCheckWrap = document.createElement('div');
    rowCheckWrap.style.cssText = 'display:flex; align-items:center; justify-content:center; padding-right:.25rem;';
    const rowCheck = document.createElement('input');
    rowCheck.type = 'checkbox';
    rowCheck.style.cssText = 'width:16px; height:16px; accent-color:var(--accent); cursor:pointer; margin:0;';
    rowCheck.onchange = (e) => {
      if (e.target.checked) checkedPids.add(p._id);
      else checkedPids.delete(p._id);
      updateCheckedState();
    };
    rowChecks.set(p._id, rowCheck);
    rowCheckWrap.appendChild(rowCheck);
    row.appendChild(rowCheckWrap);

    const status = p.selectionStatus || 'pending';
    const statusInfo = {
      pending:     { label: 'Aguardando', color: 'var(--text-muted)' },
      in_progress: { label: 'Selecionando', color: 'var(--yellow)' },
      submitted:   { label: '✓ Enviou', color: 'var(--green)' },
      delivered:   { label: 'Entregue', color: 'var(--accent)' }
    }[status] || { label: status, color: 'var(--text-muted)' };

    const count = (p.selectedPhotos || []).length;
    const limit = p.packageLimit || 0;

    // Info do participante
    const info = document.createElement('div');
    info.style.cssText = 'flex:1; min-width:120px;';
    info.innerHTML = `
      <div style="font-weight:600; color:var(--text-primary); font-size:.875rem;">${escapeHtml(p.name)}</div>
      <div style="display:flex; align-items:center; gap:.375rem; flex-wrap:wrap; margin-top:2px;">
        <span style="font-size:.625rem; font-family:monospace; color:var(--accent); background:color-mix(in srgb, var(--accent) 10%, transparent); padding:1px 5px; border-radius:3px;">${p.accessCode || ''}</span>
        <span style="font-size:.6875rem; color:var(--text-secondary);">${count}${limit ? ` / ${limit}` : ''} fotos</span>
        <span style="font-size:.6875rem; color:${statusInfo.color}; font-weight:500;">${statusInfo.label}${p.reopenRequested ? ' ⚠' : ''}</span>
        ${p.extraRequest?.status === 'pending' ? `<span style="font-size:.625rem; color:var(--yellow); font-weight:600; background:color-mix(in srgb, var(--yellow) 14%, transparent); padding:1px 5px; border-radius:3px;">📸 pediu ${p.extraRequest.photos?.length || 0} extra(s)</span>` : ''}
      </div>
    `;
    row.appendChild(info);

    // Ações de envio (link, WhatsApp, código, entregar individual)
    const shareActions = document.createElement('div');
    shareActions.style.cssText = 'display:flex; gap:.25rem; flex-wrap:wrap;';

    if (status !== 'delivered') {
      const indivDeliverBtn = miniShareBtn(`${icon('checkCircle', 13)} Entregar`);
      indivDeliverBtn.title = `Liberar download para ${p.name}`;
      indivDeliverBtn.style.color = 'var(--green)';
      indivDeliverBtn.onclick = async () => {
        const ok = await window.showConfirm?.(`Liberar download (entregar) para ${p.name}?`, { confirmText: 'Entregar', cancelText: 'Cancelar' });
        if (!ok) return;
        try {
          await apiPut(`/api/sessions/${session._id}/participants/${p._id}/deliver`);
          window.showToast?.('Sessão entregue individualmente.', 'success');
          await refresh();
        } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
      };
      shareActions.appendChild(indivDeliverBtn);
    }

    const linkBtn = miniShareBtn(`${icon('link', 13)} Link`);
    linkBtn.title = `Copiar link de ${p.name}`;
    linkBtn.onclick = async () => {
      await navigator.clipboard.writeText(buildGalleryUrlForCode(session, p.accessCode));
      window.showToast?.(`Link de ${p.name} copiado`, 'success');
    };
    shareActions.appendChild(linkBtn);

    const waBtn = miniShareBtn(`${icon('whatsapp', 13)} WhatsApp`);
    waBtn.title = `Enviar WhatsApp para ${p.name}`;
    waBtn.onclick = () => {
      const orgName = appState.appData?.organization?.name || 'CliqueZoom';
      const waUrl = status === 'delivered'
        ? buildWhatsAppDeliveryLink({ session, accessCode: p.accessCode, recipientName: p.name, recipientPhone: p.phone, orgName })
        : buildWhatsAppLink({ session, accessCode: p.accessCode, recipientName: p.name, recipientPhone: p.phone, orgName });
      window.open(waUrl, '_blank');
    };
    shareActions.appendChild(waBtn);

    const codeBtn = miniShareBtn(`${icon('cadeado', 13)} Código`);
    codeBtn.title = `Copiar código de ${p.name}`;
    codeBtn.onclick = async () => {
      await navigator.clipboard.writeText(p.accessCode);
      window.showToast?.('Código copiado', 'success');
    };
    shareActions.appendChild(codeBtn);

    const previewBtn = miniShareBtn(`${icon('olho', 13)} Preview`);
    previewBtn.title = `Ver galeria de ${p.name} como cliente (nova aba)`;
    previewBtn.onclick = () => {
      const galleryUrl = buildGalleryUrlForCode(session, p.accessCode);
      const url = `${galleryUrl}&_ap=${encodeURIComponent(appState.authToken || '')}`;
      window.open(url, '_blank');
    };
    shareActions.appendChild(previewBtn);

    // Cortesia por participante: presentear fotos fora da seleção (mesmo modal do 6-deliver.js).
    const courtesyBtn = miniShareBtn(`🎁 Cortesia`);
    courtesyBtn.title = `Dar fotos de cortesia para ${p.name}`;
    courtesyBtn.onclick = () => openCourtesyModal(session, p, refresh);
    shareActions.appendChild(courtesyBtn);

    row.appendChild(shareActions);

    // Botão reabrir (quando já enviou)
    if (status === 'submitted' || status === 'delivered') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cz-ug-pill';
      btn.style.cssText += 'border-color:var(--orange); color:var(--orange); height:28px; font-size:.75rem;';
      btn.innerHTML = `<span>${icon('reabrir', 12)}</span><span>${p.reopenRequested ? 'Aceitar reabertura' : 'Reabrir'}</span>`;
      btn.onclick = async () => {
        const ok = await window.showConfirm?.(`Reabrir a seleção de ${p.name}?`, { confirmText: 'Reabrir', cancelText: 'Cancelar' });
        if (!ok) return;
        try {
          await apiPut(`/api/sessions/${session._id}/reopen`, { participantId: p._id });
          window.showToast?.('Seleção reaberta.', 'success');
          await refresh();
        } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
      };
      row.appendChild(btn);
    }

    // Fotos extras solicitadas por este participante — aceitar/recusar (espelha 4-tracking.js).
    if (p.extraRequest?.status === 'pending') {
      const extraCount = p.extraRequest.photos?.length || 0;
      const extraWrap = document.createElement('div');
      extraWrap.style.cssText = 'display:flex; gap:.375rem; flex-wrap:wrap; width:100%;';

      const acceptExtraBtn = makeExtraActionBtn(`${icon('checkCircle', 13)} Aceitar ${extraCount} extra(s)`, 'var(--green)');
      acceptExtraBtn.title = `Aceitar ${extraCount} foto(s) extra(s) de ${p.name}`;
      acceptExtraBtn.onclick = () => acceptExtraParticipant(session, refresh, p._id, p.name, extraCount);
      extraWrap.appendChild(acceptExtraBtn);

      const rejectExtraBtn = makeExtraActionBtn(`${icon('x', 13)} Recusar`, 'var(--red)');
      rejectExtraBtn.title = `Recusar fotos extras de ${p.name}`;
      rejectExtraBtn.onclick = () => rejectExtraParticipant(session, refresh, p._id, p.name);
      extraWrap.appendChild(rejectExtraBtn);

      row.appendChild(extraWrap);
    }

    list.appendChild(row);
  });

  wrap.appendChild(list);
  updateCheckedState();
  return wrap;
}

function miniShareBtn(htmlContent) {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = htmlContent;
  b.style.cssText = `
    display:inline-flex; align-items:center; gap:.25rem;
    background:var(--bg-base); color:var(--text-secondary);
    border:1px solid var(--border); border-radius:var(--r-field);
    padding:.25rem .5rem; cursor:pointer; font-size:.6875rem;
    transition:background .15s, color .15s;
  `;
  b.onmouseenter = () => { b.style.background = 'var(--bg-hover)'; b.style.color = 'var(--text-primary)'; };
  b.onmouseleave = () => { b.style.background = 'var(--bg-base)';  b.style.color = 'var(--text-secondary)'; };
  return b;
}
