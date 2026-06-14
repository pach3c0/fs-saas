// Passo 5 do wizard — Upload das Fotos Editadas.
// Sobe as versões finais editadas (alta resolução) das fotos selecionadas pelo cliente.
// Valida nomes contra a seleção e mostra o progresso (X de Y entregues).

import { resolveImagePath } from '../../../../utils/helpers.js';
import { UploadQueue } from '../../../../utils/upload.js';
import { UploadPanel } from '../../../../components/upload-panel.js';
import { appState } from '../../../../state.js';
import { icon } from '../../../../utils/icons.js';
import { apiPut } from '../../../../utils/api.js';
import { buildWhatsAppDeliveryLink } from '../utils.js';
import { showDeliveryModal } from './2-share.js';
import {
  renderStoragePanel, renderDeliveryHistorySection,
  renderMultiDeliverHeader, renderParticipantsDeliveryTable
} from './6-deliver.js';

// ── Estilos compartilhados dos botões morph (injetados uma vez) ──────────
function ensureXBtnStyles() {
  if (document.getElementById('cz-xbtn-styles')) return;
  const style = document.createElement('style');
  style.id = 'cz-xbtn-styles';
  style.textContent = `
    .cz-xbtn {
      box-sizing: border-box;
      display: inline-flex; align-items: center;
      height: 40px; min-width: 40px; padding: 0;
      border: none; border-radius: 9999px;
      cursor: pointer; overflow: hidden; white-space: nowrap;
      font-family: inherit; font-weight: 500; font-size: 0.875rem;
      transition: filter 0.15s, box-shadow 0.15s;
    }
    .cz-xbtn .cz-xic {
      width: 40px; height: 40px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .cz-xbtn .cz-xlabel {
      max-width: 0; opacity: 0; overflow: hidden;
      transition: max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .cz-xbtn:hover .cz-xlabel,
    .cz-xbtn:focus-visible .cz-xlabel {
      max-width: 14rem; opacity: 1; padding-right: 1.1rem;
    }
    .cz-xbtn:hover:not([disabled]) { filter: brightness(0.96); }
    .cz-xbtn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) {
      .cz-xbtn .cz-xlabel { transition: opacity 0.2s ease; }
    }
  `;
  document.head.appendChild(style);
}

function makeXBtn(iconName, label, { bg, color } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cz-xbtn';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  btn.style.background = bg || 'var(--accent)';
  btn.style.color = color || 'var(--accent-on)';
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

export function renderStepEdited({ session, refresh, switchStep }) {
  ensureXBtnStyles();

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.25rem; max-width:1200px;';

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
  header.style.cssText = 'text-align:center;';
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
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    text-align: center;
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
      <div style="text-align:center; font-size:0.6875rem; color:var(--text-muted); margin-top:2px;">${pct}%</div>
    `;
    progressCard.appendChild(barWrap);
  }
  wrap.appendChild(progressCard);

  // ── Ações centralizadas com botões morph ─────────────────────────────
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex; gap:0.75rem; flex-wrap:wrap; justify-content:center; align-items:center;';

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

  // Botão upload morph
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
    exportBtn.style.border = '1px solid var(--border)';
    exportBtn.title = 'Baixa um .txt com os nomes das fotos selecionadas para filtro no Lightroom';
    exportBtn.onclick = () => {
      const token = encodeURIComponent(appState.authToken || '');
      window.open(`/api/sessions/${session._id}/export?token=${token}`, '_blank');
    };
    actions.appendChild(exportBtn);
  }

  // Botão avançar ou entregar (quando concluído)
  if (isComplete) {
    if (!isMulti) {
      const isDelivered = Boolean(session.deliveredAt) || session.selectionStatus === 'delivered';
      const deliverBtn = makeXBtn('checkCircle', isDelivered ? 'Re-entregar (notificar novamente)' : 'Entregar e notificar cliente', {
        bg: isDelivered ? 'var(--orange)' : 'var(--green)',
        color: 'white',
      });
      deliverBtn.onclick = async () => {
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
  }
  wrap.appendChild(actions);

  // Multi: painel de export por participante e painel de entrega
  if (isMulti) {
    wrap.appendChild(renderParticipantsExportPanel(session, photoById));
    wrap.appendChild(renderMultiDeliverHeader(session));
    wrap.appendChild(renderParticipantsDeliveryTable(session, refresh));
  }

  // ── Grid de fotos em círculo com morph no hover ──────────────────────
  const selectedSet = new Set(selected);
  const courtesyPhotos = (session.photos || []).filter(p => !selectedSet.has(p.id) && p.urlOriginal);

  if (selected.length > 0 || courtesyPhotos.length > 0) {
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 1.25rem;
      width: 100%;
    `;

    const allPhotosForGrid = [
      ...selected.map(id => ({ photo: photoById.get(id), kind: photoById.get(id)?.urlOriginal ? 'delivered' : 'pending' })).filter(x => x.photo),
      ...courtesyPhotos.map(photo => ({ photo, kind: 'courtesy' }))
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
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: var(--bg-surface);
        overflow: hidden;
        border: 2px solid ${borderColor};
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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

      // Overlay com nome do arquivo no hover
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.4);
        opacity: 0; transition: opacity 0.18s;
        display: flex; align-items: flex-end; justify-content: center;
        padding: 0.25rem; z-index: 5;
      `;
      if (photo.filename) {
        const fname = document.createElement('div');
        fname.textContent = photo.filename;
        fname.style.cssText = 'color:white; font-size:0.5rem; font-weight:500; text-align:center; word-break:break-all; line-height:1.2;';
        overlay.appendChild(fname);
      }
      cell.appendChild(overlay);

      cell.addEventListener('mouseenter', () => {
        cell.style.width = `${hoverWidth}px`;
        cell.style.height = `${hoverHeight}px`;
        cell.style.borderRadius = 'var(--r-field)';
        overlay.style.opacity = '1';
        badge.style.opacity = '1';
      });
      cell.addEventListener('mouseleave', () => {
        cell.style.width = '120px';
        cell.style.height = '120px';
        cell.style.borderRadius = '50%';
        overlay.style.opacity = '0';
        badge.style.opacity = '0';
      });

      grid.appendChild(cell);
    });

    wrap.appendChild(grid);

    if (courtesyPhotos.length > 0) {
      const note = document.createElement('div');
      note.style.cssText = 'font-size:0.75rem; color:var(--text-muted); padding-top:0.25rem; text-align:center;';
      note.innerHTML = `<strong style="color:var(--accent);">★ Cortesia:</strong> ${courtesyPhotos.length} foto${courtesyPhotos.length === 1 ? '' : 's'} fora da seleção do cliente. O cliente verá com a badge "Cortesia" na entrega.`;
      wrap.appendChild(note);
    }
  } else {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:2rem; text-align:center; color:var(--text-muted); font-size:0.875rem;';
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
    display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
    text-align: center;
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
    empty.style.cssText = 'padding:1rem; text-align:center; color:var(--text-muted); font-size:0.875rem;';
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
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; text-align: center;
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
    btn.style.border = '1px solid var(--border)';
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
