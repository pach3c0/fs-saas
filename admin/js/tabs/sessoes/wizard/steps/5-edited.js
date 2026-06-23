// Passo 5 do wizard — Upload das Fotos Editadas.
// Sobe as versões finais editadas (alta resolução) das fotos selecionadas pelo cliente.
// Valida nomes contra a seleção e mostra o progresso (X de Y entregues).

import { resolveImagePath } from '../../../../utils/helpers.js';
import { UploadQueue } from '../../../../utils/upload.js';
import { UploadPanel } from '../../../../components/upload-panel.js';
import { appState } from '../../../../state.js';
import { icon } from '../../../../utils/icons.js';
import { apiPut, apiDelete } from '../../../../utils/api.js';
import { buildWhatsAppDeliveryLink } from '../utils.js';
import { showDeliveryModal } from './2-share.js';
import {
  renderStoragePanel, renderDeliveryHistorySection,
  renderMultiDeliverHeader, renderParticipantsDeliveryTable
} from './6-deliver.js';

// ── Estilos compartilhados dos botões pílula expandidos (injetados uma vez) ──────────
function ensureXBtnStyles() {
  if (document.getElementById('cz-xbtn-styles')) return;
  const style = document.createElement('style');
  style.id = 'cz-xbtn-styles';
  style.textContent = `
    .cz-xbtn {
      box-sizing: border-box;
      display: inline-flex; align-items: center;
      height: 44px; padding: 0 1.25rem; gap: 0.75rem;
      border: 1px solid var(--border); border-radius: var(--r-field);
      cursor: pointer; white-space: nowrap;
      font-family: inherit; font-weight: 500; font-size: 0.875rem;
      background: inherit; color: inherit;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .cz-xbtn .cz-xic {
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .cz-xbtn .cz-xlabel {
      opacity: 1; overflow: visible; white-space: nowrap;
    }
    .cz-xbtn:not([disabled]):hover {
      background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface));
      color: var(--accent);
      border-color: var(--accent);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 20%, transparent);
    }
    .cz-xbtn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  `;
  document.head.appendChild(style);
}

function makeXBtn(iconName, label, { bg, color } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cz-xbtn';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  if (bg) btn.style.background = bg;
  if (color) btn.style.color = color;
  btn.innerHTML = `<span class="cz-xic">${icon(iconName, 18)}</span><span class="cz-xlabel">${label}</span>`;
  return btn;
}

function getOrCreateQueue(onDone) {
  if (!window.globalUploadPanel) {
    window.globalUploadPanel = new UploadPanel('upload-panel-root');
  }
  const panel = window.globalUploadPanel;
  panel.show();
  if (!window.globalUploadQueue) {
    window.globalUploadQueue = new UploadQueue({
      concurrency: 3,
      onItemUpdate: (item) => panel.updateItem(item),
      onQueueUpdate: (stats) => panel.updateStats(stats),
      onQueueDone: onDone
    });
    panel.onCancel = (id) => window.globalUploadQueue.cancel(id);
    panel.onRetry = (id) => window.globalUploadQueue.retry(id);
  }
  window.globalUploadQueue.onQueueDone = onDone;
  return window.globalUploadQueue;
}

export function renderStepEdited({ session, refresh, switchStep, inSinglePage = false }) {
  ensureXBtnStyles();

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.25rem; margin:0; width:100%;';

  const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';
  const photoById = new Map((session.photos || []).map(p => [p.id, p]));

  // Em multi, o conjunto "selecionado" é a união dos participantes.
  const selected = isMulti
    ? Array.from(new Set((session.participants || []).flatMap(p => p.selectedPhotos || [])))
    : (session.selectedPhotos || []);
  const delivered = selected.filter(id => photoById.get(id)?.urlOriginal);
  const pending = selected.filter(id => !photoById.get(id)?.urlOriginal);

  // ── Header centralizado ──────────────────────────────────────────────
  const header = document.createElement('div');
  header.style.cssText = 'text-align:left;';
  header.innerHTML = `
    <h2 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin:0 0 0.25rem;">Upload das Fotos Editadas</h2>
    <p style="color:var(--text-secondary); font-size:0.875rem; margin:0;">
      ${isMulti
      ? `Suba as versões editadas das ${selected.length} fotos (união de todos os participantes). Os nomes dos arquivos devem coincidir com os originais.`
      : `Suba as versões editadas (alta resolução) das ${selected.length} fotos selecionadas. Os nomes dos arquivos devem coincidir com os originais.`}
    </p>
  `;
  wrap.appendChild(header);

  // ── Barra de progresso centralizada ─────────────────────────────────
  const isComplete = delivered.length === selected.length && selected.length > 0;
  const progressCard = document.createElement('div');
  progressCard.style.cssText = `
    background: ${isComplete ? 'color-mix(in srgb, var(--green) 10%, transparent)' : 'var(--bg-surface)'};
    border: 1px solid ${isComplete ? 'color-mix(in srgb, var(--green) 30%, transparent)' : 'var(--border)'};
    border-radius:var(--r-card); padding: 1rem 1.25rem;
    display: flex; flex-direction: column; align-items: flex-start; gap: 0.75rem;
    text-align: left;
  `;

  const progressText = document.createElement('div');
  progressText.innerHTML = `
    <div style="font-size:0.875rem; font-weight:500; color:var(--text-primary);">
      ${isComplete ? '✓ Todas as fotos editadas enviadas' : `${delivered.length} de ${selected.length} fotos editadas enviadas`}
    </div>
    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">
      ${isComplete ? 'Pode avançar para Entregar.' : `${pending.length} pendente${pending.length === 1 ? '' : 's'}`}
    </div>
  `;
  progressCard.appendChild(progressText);

  if (selected.length > 0) {
    const pct = Math.round((delivered.length / selected.length) * 100);
    const barWrap = document.createElement('div');
    barWrap.style.cssText = 'width:200px;';
    barWrap.innerHTML = `
      <div style="height:6px; background:var(--bg-base); border-radius:3px; overflow:hidden;">
        <div style="height:100%; width:${pct}%; background:${isComplete ? 'var(--green)' : 'var(--accent)'}; transition: width 0.3s;"></div>
      </div>
      <div style="text-align:left; font-size:0.6875rem; color:var(--text-muted); margin-top:2px;">${pct}%</div>
    `;
    progressCard.appendChild(barWrap);
  }
  wrap.appendChild(progressCard);

  // ── Ações centralizadas ─────────────────────────────────────────────
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex; gap:0.75rem; flex-wrap:wrap; justify-content:flex-start; align-items:center;';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.jpg,.jpeg,.png';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  fileInput.onchange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const unmatched = [];
    const notSelected = [];
    files.forEach(f => {
      const match = (session.photos || []).find(p => p.filename === f.name);
      if (!match) unmatched.push(f.name);
      else if (!selected.includes(match.id)) notSelected.push(f.name);
    });
    const allowUnmatched = unmatched.length > 0;
    const proceed = async () => {
      const queue = getOrCreateQueue(async () => {
        window.showToast?.('Editadas enviadas!', 'success');
        await refresh();
      });
      queue.add(files, `/api/sessions/${session._id}/photos/upload-edited?allowUnmatched=${allowUnmatched}`);
      fileInput.value = '';
    };
    if (unmatched.length || notSelected.length) {
      const msg = [
        unmatched.length ? `${unmatched.length} arquivo(s) sem correspondente na galeria` : '',
        notSelected.length ? `${notSelected.length} arquivo(s) não foram selecionado(s) pelo cliente` : ''
      ].filter(Boolean).join(' · ');
      window.showConfirm?.(`Atenção: ${msg}. Continuar mesmo assim?`, { confirmText: 'Sim, continuar', cancelText: 'Cancelar' }).then(ok => {
        if (ok) proceed(); else fileInput.value = '';
      });
    } else {
      proceed();
    }
  };

  // Botão upload de editadas
  const uploadBtn = makeXBtn('upload', isComplete ? 'Subir mais editadas' : 'Subir fotos editadas', {
    bg: isComplete ? 'var(--bg-hover)' : 'var(--accent)',
    color: isComplete ? 'var(--text-secondary)' : 'var(--accent-on)',
  });
  uploadBtn.onclick = () => fileInput.click();
  actions.appendChild(fileInput);
  actions.appendChild(uploadBtn);

  // Botão export Lightroom (não-multi)
  if (!isMulti) {
    const exportBtn = makeXBtn('download', 'Exportar para Lightroom (.txt)', {
      bg: selected.length === 0 ? 'var(--bg-elevated)' : 'var(--bg-surface)',
      color: selected.length === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
    });
    exportBtn.disabled = selected.length === 0;
    if (selected.length === 0) exportBtn.style.cursor = 'not-allowed';
    exportBtn.title = 'Baixa um .txt com os nomes das fotos selecionadas para filtro no Lightroom';
    exportBtn.onclick = () => {
      const token = encodeURIComponent(appState.authToken || '');
      window.open(`/api/sessions/${session._id}/export?token=${token}`, '_blank');
    };
    actions.appendChild(exportBtn);

    // Botão Cortesia: presentear fotos fora da seleção (mesmo conceito do multi — explícito, não deduzido).
    const courtesyBtn = document.createElement('button');
    courtesyBtn.type = 'button';
    courtesyBtn.className = 'cz-xbtn';
    courtesyBtn.title = 'Presentear o cliente com fotos fora da seleção';
    courtesyBtn.innerHTML = `<span class="cz-xic" style="font-size:1rem;">🎁</span><span class="cz-xlabel">Dar cortesia</span>`;
    courtesyBtn.onclick = () => openSessionCourtesyModal(session, refresh);
    actions.appendChild(courtesyBtn);
  }

  // Botão entregar (seleção individual): aparece assim que houver ao menos 1 foto editada.
  // Entrega FLEXÍVEL/parcial — não exige mais 100% das selecionadas. Se faltar editada, avisa "X de Y"
  // (ex.: cliente paga 15 de 30 agora, o resto depois). As pendentes ficam "em edição" para o cliente.
  if (!isMulti && delivered.length > 0) {
    const isDelivered = Boolean(session.deliveredAt) || session.selectionStatus === 'delivered';
    const isPartial = delivered.length < selected.length;
    const label = isDelivered
      ? 'Re-entregar (notificar novamente)'
      : isPartial
        ? `Entregar ${delivered.length} de ${selected.length} fotos`
        : 'Entregar e notificar cliente';
    const deliverBtn = makeXBtn('checkCircle', label, {
      bg: isDelivered ? 'var(--orange)' : (isPartial ? 'var(--accent)' : 'var(--green)'),
      color: isDelivered ? 'white' : (isPartial ? 'var(--accent-on)' : 'white'),
    });
    deliverBtn.onclick = async () => {
      // Entrega parcial: confirma antes (o cliente recebe só as editadas; o resto fica "em edição").
      if (isPartial && !isDelivered) {
        const pendingCount = selected.length - delivered.length;
        const ok = await window.showConfirm?.(
          `Você está entregando ${delivered.length} de ${selected.length} fotos selecionadas. ` +
          `As ${pendingCount} restantes continuam pendentes (o cliente verá "em edição") e você pode entregá-las depois. Continuar?`,
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
            session,
            accessCode: session.accessCode,
            recipientName: session.clientName || session.name,
            recipientPhone: session.clientPhone,
            orgName,
            customText: payload.whatsappText
          });
          window.open(url, '_blank');
        }

        await refresh();
      } catch (e) {
        window.showToast?.('Erro: ' + e.message, 'error');
      }
    };
    actions.appendChild(deliverBtn);
  }
  wrap.appendChild(actions);

  // Multi: painel de export por participante e painel de entrega
  if (isMulti) {
    wrap.appendChild(renderParticipantsExportPanel(session, photoById));
    wrap.appendChild(renderMultiDeliverHeader(session));
    wrap.appendChild(renderParticipantsDeliveryTable(session, refresh));
  }

  // ── Grid de fotos ─────────────────────────────────────────────────────
  const selectedSet = new Set(selected);
  // Entrega fora da seleção (ex.: editada renomeada no Photoshop) entra como "✓ Editada", NÃO cortesia.
  // A cortesia agora é EXPLÍCITA (session.courtesyPhotos) — igual ao multi: subir/renomear em massa
  // deixou de virar "★ Cortesia" por engano. Só recebe o selo o que o fotógrafo marcou pelo botão 🎁.
  const courtesyIdSet = new Set(isMulti ? [] : (session.courtesyPhotos || []).map(String));
  const deliveredExtras = isMulti
    ? []
    : (session.photos || []).filter(p => !selectedSet.has(p.id) && p.urlOriginal);

  if (selected.length > 0 || deliveredExtras.length > 0) {
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-start;
      align-items: flex-start;
      gap: 1.25rem;
      width: 100%;
    `;

    const allPhotosForGrid = [
      ...selected.map(id => ({ photo: photoById.get(id), kind: photoById.get(id)?.urlOriginal ? 'delivered' : 'pending' })).filter(x => x.photo),
      ...deliveredExtras.map(photo => ({ photo, kind: courtesyIdSet.has(String(photo.id)) ? 'courtesy' : 'delivered' }))
    ];

    allPhotosForGrid.forEach(({ photo, kind }) => {
      const borderColor = kind === 'delivered'
        ? 'var(--green)'
        : kind === 'courtesy'
          ? 'var(--accent)'
          : 'var(--yellow)';

      const hasOrig = photo.urlOriginal && photo.widthOriginal && photo.heightOriginal;
      const hasThumb = photo.width && photo.height;
      const w = hasOrig ? photo.widthOriginal : photo.width;
      const h = hasOrig ? photo.heightOriginal : photo.height;
      const aspect = (w && h) ? (w / h) : 1.5;
      const hoverHeight = 200;
      const hoverWidth = Math.round(hoverHeight * aspect);

      const cell = document.createElement('div');
      cell.style.cssText = `
        position: relative;
        width: 200px;
        height: 150px;
        border-radius: var(--r-card);
        background: var(--bg-surface);
        overflow: hidden;
        border: 2px solid ${borderColor};
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      `;

      const img = document.createElement('img');
      img.src = resolveImagePath(photo.url);
      img.loading = 'lazy';
      img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
      cell.appendChild(img);

      // Badge de status (aparece no hover, posicionada no canto)
      const badgeText = kind === 'delivered' ? '✓ Editada' : kind === 'courtesy' ? '★ Cortesia' : 'Pendente';
      const badge = document.createElement('div');
      badge.textContent = badgeText;
      badge.style.cssText = `
        position: absolute; top: 4px; left: 4px;
        background: ${borderColor};
        color: white; font-size: 0.5625rem; font-weight: 700;
        padding: 2px 5px; border-radius: 3px;
        opacity: 0;
        transition: opacity 0.2s ease;
      `;
      cell.appendChild(badge);

      // Overlay com nome do arquivo e botão de delete no hover
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.5);
        opacity: 0; transition: opacity 0.18s;
        display: flex; align-items: center; justify-content: center;
        flex-direction: column; gap: 0.5rem; padding: 0.5rem; z-index: 5;
      `;

      if (photo.filename) {
        const fname = document.createElement('div');
        fname.textContent = photo.filename;
        fname.style.cssText = 'color:white; font-size:0.5rem; font-weight:500; text-align:center; word-break:break-all; line-height:1.2;';
        overlay.appendChild(fname);
      }

      // Botão de delete (para fotos editadas e cortesias)
      if (kind === 'delivered' || kind === 'courtesy') {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.title = 'Deletar esta foto';
        deleteBtn.style.cssText = `
          background: var(--red); color: white;
          border: none; padding: 0.375rem 0.75rem;
          border-radius: var(--r-field); cursor: pointer;
          font-size: 0.6875rem; font-weight: 500;
          display: flex; align-items: center; gap: 0.375rem;
          white-space: nowrap;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        `;
        deleteBtn.innerHTML = `${icon('trash', 12)} Deletar`;
        deleteBtn.onmouseover = () => {
          deleteBtn.style.filter = 'brightness(0.9)';
          deleteBtn.style.transform = 'translateY(-2px)';
          deleteBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        };
        deleteBtn.onmouseout = () => {
          deleteBtn.style.filter = 'brightness(1)';
          deleteBtn.style.transform = 'translateY(0)';
          deleteBtn.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
        };
        deleteBtn.onclick = async (e) => {
          e.stopPropagation();
          const ok = await window.showConfirm?.(`Deletar foto "${photo.filename}"? Você precisará subir novamente.`, { confirmText: 'Deletar', cancelText: 'Cancelar' });
          if (!ok) return;
          try {
            await apiDelete(`/api/sessions/${session._id}/photos/${photo.id}`);
            window.showToast?.('Foto deletada', 'success');
            await refresh();
          } catch (e) {
            window.showToast?.('Erro ao deletar: ' + e.message, 'error');
          }
        };
        overlay.appendChild(deleteBtn);
      }

      cell.appendChild(overlay);

      cell.addEventListener('mouseenter', () => {
        cell.style.boxShadow = `0 8px 24px color-mix(in srgb, ${borderColor} 30%, transparent)`;
        overlay.style.opacity = '1';
        badge.style.opacity = '1';
      });
      cell.addEventListener('mouseleave', () => {
        cell.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        overlay.style.opacity = '0';
        badge.style.opacity = '0';
      });

      grid.appendChild(cell);
    });

    wrap.appendChild(grid);

    const courtesyCount = allPhotosForGrid.filter(x => x.kind === 'courtesy').length;
    if (courtesyCount > 0) {
      const note = document.createElement('div');
      note.style.cssText = 'font-size:0.75rem; color:var(--text-muted); padding-top:0.25rem; text-align:left;';
      note.innerHTML = `<strong style="color:var(--accent);">★ Cortesia:</strong> ${courtesyCount} foto${courtesyCount === 1 ? '' : 's'} de presente (fora do pacote). O cliente verá com a badge "Cortesia" na entrega.`;
      wrap.appendChild(note);
    }
  } else {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:2rem; text-align:left; color:var(--text-muted); font-size:0.875rem;';
    empty.textContent = 'O cliente ainda não selecionou fotos.';
    wrap.appendChild(empty);
  }

  // Se for seleção individual e já tiver sido entregue, exibe painel de storage e histórico
  const isDelivered = Boolean(session.deliveredAt) || session.selectionStatus === 'delivered';
  if (session.mode !== 'multi_selection' && isDelivered) {
    wrap.appendChild(renderStoragePanel(session, refresh));
    wrap.appendChild(renderDeliveryHistorySection(session));
  }

  return wrap;
}

// Multi: painel com lista de participantes, cada um com botão Export Lightroom individual.
function renderParticipantsExportPanel(session, photoById) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius:var(--r-card); overflow: hidden;
  `;

  const head = document.createElement('div');
  head.style.cssText = `
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid var(--border);
    display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem;
    text-align: left;
  `;
  head.innerHTML = `
    <div>
      <div style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); letter-spacing:0.05em; text-transform:uppercase;">Export por participante</div>
      <div style="font-size:0.6875rem; color:var(--text-muted); margin-top:2px;">Cada participante tem seu .txt de seleção — gerado quando ele finaliza.</div>
    </div>
  `;
  wrap.appendChild(head);

  const participants = session.participants || [];
  if (participants.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:1rem; text-align:left; color:var(--text-muted); font-size:0.875rem;';
    empty.textContent = 'Nenhum participante.';
    wrap.appendChild(empty);
    return wrap;
  }

  const list = document.createElement('div');
  list.style.cssText = 'display:flex; flex-direction:column;';

  participants.forEach((p, i) => {
    const status = p.selectionStatus || 'pending';
    const count = (p.selectedPhotos || []).length;
    const ready = ['submitted', 'delivered'].includes(status);

    const row = document.createElement('div');
    row.style.cssText = `
      padding: 0.75rem 0.875rem;
      display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 0.5rem; text-align: left;
      ${i > 0 ? 'border-top: 1px solid var(--border);' : ''}
    `;
    row.innerHTML = `
      <div>
        <div style="font-size:0.875rem; font-weight:500; color:var(--text-primary);">${escapeHtmlSafe(p.name)}</div>
        <div style="font-size:0.6875rem; color:var(--text-muted);">${count} foto${count === 1 ? '' : 's'} · ${ready ? 'finalizou' : 'aguardando finalizar'}</div>
      </div>
    `;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.disabled = !ready || count === 0;
    btn.className = 'cz-xbtn';
    btn.style.background = ready && count ? 'var(--bg-base)' : 'var(--bg-elevated)';
    btn.style.color = ready && count ? 'var(--text-primary)' : 'var(--text-muted)';
    if (!ready || !count) btn.style.cursor = 'not-allowed';
    btn.title = ready ? `Baixa lista de ${count} fotos de ${p.name}` : 'Disponível quando o participante finalizar';
    btn.innerHTML = `<span class="cz-xic">${icon('download', 16)}</span><span class="cz-xlabel">Lightroom (.txt)</span>`;
    btn.onclick = () => exportParticipantSelection(session, p, photoById);
    row.appendChild(btn);
    list.appendChild(row);
  });

  wrap.appendChild(list);
  return wrap;
}

// Gera e baixa um .txt com os nomes dos arquivos selecionados pelo participante.
function exportParticipantSelection(session, participant, photoById) {
  const filenames = (participant.selectedPhotos || [])
    .map(id => photoById.get(id)?.filename)
    .filter(Boolean);

  const lines = [
    `# Seleção de ${participant.name}`,
    `# Sessão: ${session.name}`,
    `# Total: ${filenames.length} fotos`,
    `# Gerado em ${new Date().toLocaleString('pt-BR')}`,
    '',
    ...filenames
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = participant.name.replace(/[^\w]+/g, '-').toLowerCase();
  const safeSession = (session.name || 'sessao').replace(/[^\w]+/g, '-').toLowerCase();
  a.download = `${safeSession}__${safeName}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  window.showToast?.(`Lista de ${participant.name} baixada`, 'success');
}

function escapeHtmlSafe(s) {
  return String(s || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

// ── Modal: dar cortesia ao cliente (seleção individual) ──────────────────────
// Espelha o modal de cortesia por participante do multi (6-deliver.js), mas salva no nível da sessão
// (PUT /sessions/:id/courtesy). Mostra o pool inteiro; o que o cliente já selecionou não pode ser
// cortesia (já é dele). Salva a lista COMPLETA (idempotente).
function openSessionCourtesyModal(session, refresh) {
  const photos = (session.photos || []).filter(ph => !ph.hidden);
  const selectedSet = new Set((session.selectedPhotos || []).map(String));
  const chosen = new Set((session.courtesyPhotos || []).map(String));
  const giftable = photos.filter(ph => !selectedSet.has(String(ph.id)));

  document.getElementById('sessionCourtesyModal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'sessionCourtesyModal';
  overlay.style.cssText = 'position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); padding:1rem;';

  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--r-card); width:760px; max-width:96vw; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,0.5);';

  const header = document.createElement('div');
  header.style.cssText = 'padding:1.25rem 1.25rem 0.75rem;';
  header.innerHTML = `
    <div style="font-size:1.0625rem; font-weight:700; color:var(--text-primary);">🎁 Dar cortesia ao cliente</div>
    <p style="font-size:0.8125rem; color:var(--text-secondary); margin:0.375rem 0 0; line-height:1.5;">
      Escolha fotos para presentear o cliente. Elas entram na galeria
      <strong>de graça, fora do pacote</strong>, com o selo “Cortesia”. As fotos que o cliente já selecionou não aparecem aqui.
    </p>
  `;

  const filterInput = document.createElement('input');
  filterInput.type = 'search';
  filterInput.placeholder = 'Filtrar pelo nome do arquivo…';
  filterInput.className = 'input';
  filterInput.style.cssText = 'margin:0 1.25rem; font-size:0.8125rem;';

  const gridWrap = document.createElement('div');
  gridWrap.style.cssText = 'flex:1; overflow-y:auto; padding:0.75rem 1.25rem;';
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(96px, 1fr)); gap:0.5rem;';

  if (giftable.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:var(--text-muted); font-size:0.875rem; padding:1rem 0;';
    empty.textContent = 'Não há fotos disponíveis para cortesia (o cliente já selecionou todas as fotos visíveis).';
    gridWrap.appendChild(empty);
  } else {
    giftable.forEach(ph => {
      const on = chosen.has(String(ph.id));
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.dataset.id = ph.id;
      cell.dataset.fname = (ph.filename || '').toLowerCase();
      cell.style.cssText = `position:relative; padding:0; border:2px solid ${on ? 'var(--accent)' : 'var(--border)'}; border-radius:var(--r-field); overflow:hidden; cursor:pointer; aspect-ratio:1/1; background:var(--bg-base);`;
      cell.innerHTML = `
        <img src="${resolveImagePath(ph.url)}" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;">
        <span class="cz-courtesy-check" style="position:absolute; top:4px; right:4px; width:20px; height:20px; border-radius:50%; background:${on ? 'var(--accent)' : 'rgba(0,0,0,0.45)'}; color:#fff; font-size:0.75rem; display:flex; align-items:center; justify-content:center;">${on ? '✓' : ''}</span>
      `;
      grid.appendChild(cell);
    });
    gridWrap.appendChild(grid);
  }

  const footer = document.createElement('div');
  footer.style.cssText = 'padding:0.875rem 1.25rem; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:1rem;';
  const countEl = document.createElement('div');
  countEl.style.cssText = 'font-size:0.8125rem; color:var(--text-secondary);';
  const updateCount = () => { countEl.textContent = `${chosen.size} cortesia${chosen.size === 1 ? '' : 's'} selecionada${chosen.size === 1 ? '' : 's'}`; };
  updateCount();

  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('button[data-id]');
    if (!cell) return;
    const id = String(cell.dataset.id);
    const check = cell.querySelector('.cz-courtesy-check');
    if (chosen.has(id)) {
      chosen.delete(id);
      cell.style.borderColor = 'var(--border)';
      check.style.background = 'rgba(0,0,0,0.45)';
      check.textContent = '';
    } else {
      chosen.add(id);
      cell.style.borderColor = 'var(--accent)';
      check.style.background = 'var(--accent)';
      check.textContent = '✓';
    }
    updateCount();
  });

  filterInput.addEventListener('input', () => {
    const q = filterInput.value.trim().toLowerCase();
    grid.querySelectorAll('button[data-id]').forEach(c => {
      c.style.display = (!q || c.dataset.fname.includes(q)) ? '' : 'none';
    });
  });

  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex; gap:0.5rem;';
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.cssText = 'background:transparent; color:var(--text-secondary); border:1px solid var(--border); padding:0.5rem 1rem; border-radius:var(--r-field); cursor:pointer; font-size:0.8125rem;';
  cancelBtn.onclick = () => overlay.remove();

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.textContent = 'Salvar cortesias';
  saveBtn.style.cssText = 'background:var(--accent); color:var(--bg-base); border:none; padding:0.5rem 1.25rem; border-radius:var(--r-field); cursor:pointer; font-size:0.8125rem; font-weight:600;';
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando…';
    try {
      await apiPut(`/api/sessions/${session._id}/courtesy`, { photos: [...chosen] });
      window.showToast?.('Cortesias atualizadas.', 'success');
      overlay.remove();
      await refresh();
    } catch (e) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Salvar cortesias';
      window.showToast?.('Erro: ' + e.message, 'error');
    }
  };

  btns.appendChild(cancelBtn);
  btns.appendChild(saveBtn);
  footer.appendChild(countEl);
  footer.appendChild(btns);

  box.appendChild(header);
  box.appendChild(filterInput);
  box.appendChild(gridWrap);
  box.appendChild(footer);
  overlay.appendChild(box);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  setTimeout(() => filterInput.focus(), 50);
}
