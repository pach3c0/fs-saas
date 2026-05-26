// Passo 5 do wizard — Upload das Fotos Editadas.
// Sobe as versões finais editadas (alta resolução) das fotos selecionadas pelo cliente.
// Valida nomes contra a seleção e mostra o progresso (X de Y entregues).

import { resolveImagePath } from '../../../../utils/helpers.js';
import { UploadQueue } from '../../../../utils/upload.js';
import { UploadPanel } from '../../../../components/upload-panel.js';
import { appState } from '../../../../state.js';

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

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <h2 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin:0 0 0.25rem;">Upload das Fotos Editadas</h2>
    <p style="color:var(--text-secondary); font-size:0.875rem; margin:0;">
      ${isMulti
      ? `Suba as versões editadas das ${selected.length} fotos (união de todos os participantes). Os nomes dos arquivos devem coincidir com os originais.`
      : `Suba as versões editadas (alta resolução) das ${selected.length} fotos selecionadas. Os nomes dos arquivos devem coincidir com os originais.`}
    </p>
  `;
  wrap.appendChild(header);

  // Barra de progresso de entrega
  const progressCard = document.createElement('div');
  const isComplete = delivered.length === selected.length && selected.length > 0;
  progressCard.style.cssText = `
    background: ${isComplete ? 'color-mix(in srgb, var(--green) 10%, transparent)' : 'var(--bg-surface)'};
    border: 1px solid ${isComplete ? 'color-mix(in srgb, var(--green) 30%, transparent)' : 'var(--border)'};
    border-radius: 0.5rem; padding: 1rem 1.25rem;
    display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
  `;
  progressCard.innerHTML = `
    <div style="flex:1; min-width:200px;">
      <div style="font-size:0.875rem; font-weight:500; color:var(--text-primary);">
        ${isComplete ? '✓ Todas as fotos editadas enviadas' : `${delivered.length} de ${selected.length} fotos editadas enviadas`}
      </div>
      <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">
        ${isComplete ? 'Pode avançar para Entregar.' : `${pending.length} pendente${pending.length === 1 ? '' : 's'}`}
      </div>
    </div>
  `;

  // Barra visual de progresso
  if (selected.length > 0) {
    const pct = Math.round((delivered.length / selected.length) * 100);
    const barWrap = document.createElement('div');
    barWrap.style.cssText = 'width:160px; flex-shrink:0;';
    barWrap.innerHTML = `
      <div style="height:6px; background:var(--bg-base); border-radius:3px; overflow:hidden;">
        <div style="height:100%; width:${pct}%; background:${isComplete ? 'var(--green)' : 'var(--accent)'}; transition: width 0.3s;"></div>
      </div>
      <div style="text-align:right; font-size:0.6875rem; color:var(--text-muted); margin-top:2px;">${pct}%</div>
    `;
    progressCard.appendChild(barWrap);
  }
  wrap.appendChild(progressCard);

  // Ações
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex; gap:0.5rem; flex-wrap:wrap;';

  // Botão upload editadas
  const uploadBtn = document.createElement('button');
  uploadBtn.type = 'button';
  uploadBtn.textContent = isComplete ? '+ Subir mais editadas' : '+ Subir fotos editadas';
  uploadBtn.style.cssText = `
    background: var(--accent); color: white; border: none;
    padding: 0.5rem 1rem; border-radius: 0.375rem;
    font-weight: 500; cursor: pointer; font-size: 0.875rem;
  `;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.jpg,.jpeg,.png';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  fileInput.onchange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    // Valida nomes localmente
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
  uploadBtn.onclick = () => fileInput.click();
  actions.appendChild(fileInput);
  actions.appendChild(uploadBtn);

  // Botão export Lightroom (não-multi: 1 arquivo com tudo)
  if (!isMulti) {
    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.textContent = '📥 Exportar lista para Lightroom (.txt)';
    exportBtn.disabled = selected.length === 0;
    exportBtn.style.cssText = `
      background: var(--bg-surface); color: var(--text-primary);
      border: 1px solid var(--border);
      padding: 0.5rem 1rem; border-radius: 0.375rem;
      cursor: ${selected.length === 0 ? 'not-allowed' : 'pointer'};
      font-size: 0.875rem;
      opacity: ${selected.length === 0 ? '0.5' : '1'};
    `;
    exportBtn.title = 'Baixa um .txt com os nomes das fotos selecionadas para filtro no Lightroom';
    exportBtn.onclick = () => {
      // A rota exige JWT em ?token= ou Authorization — usamos query string porque window.open não envia headers.
      const token = encodeURIComponent(appState.authToken || '');
      window.open(`/api/sessions/${session._id}/export?token=${token}`, '_blank');
    };
    actions.appendChild(exportBtn);
  }

  // Botão avançar
  if (isComplete) {
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.textContent = 'Próximo: Entregar →';
    nextBtn.style.cssText = `
      background: var(--green); color: white; border: none;
      padding: 0.5rem 1rem; border-radius: 0.375rem;
      cursor: pointer; font-weight: 500; font-size: 0.875rem; margin-left: auto;
    `;
    nextBtn.onclick = () => switchStep(6);
    actions.appendChild(nextBtn);
  }
  wrap.appendChild(actions);

  // Multi: painel de export individual por participante
  if (isMulti) {
    wrap.appendChild(renderParticipantsExportPanel(session, photoById));
  }

  // Cortesia = foto NÃO selecionada pelo cliente mas com urlOriginal já enviado.
  // Aparece com badge diferente. O cliente verá esse mesmo conjunto como "presente" na entrega.
  const selectedSet = new Set(selected);
  const courtesyPhotos = (session.photos || []).filter(p => !selectedSet.has(p.id) && p.urlOriginal);

  // Lista visual das selecionadas (com status entregue/pendente) + cortesia
  if (selected.length > 0 || courtesyPhotos.length > 0) {
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.5rem;
    `;

    const renderCell = ({ photo, kind }) => {
      // kind: 'delivered' | 'pending' | 'courtesy'
      const borderColor = kind === 'delivered'
        ? 'var(--green)'
        : kind === 'courtesy'
          ? 'var(--purple)'
          : 'var(--yellow)';
      const badgeBg = borderColor;
      const badgeText = kind === 'delivered' ? '✓ Editada' : kind === 'courtesy' ? '★ Cortesia' : 'Pendente';
      const cell = document.createElement('div');
      cell.style.cssText = `
        position: relative; aspect-ratio: 3/2;
        background: var(--bg-surface);
        border: 2px solid ${borderColor};
        border-radius: 0.375rem; overflow: hidden;
      `;
      const img = document.createElement('img');
      img.src = resolveImagePath(photo.url);
      img.loading = 'lazy';
      img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
      cell.appendChild(img);

      const badge = document.createElement('div');
      badge.textContent = badgeText;
      badge.style.cssText = `
        position: absolute; top: 4px; left: 4px;
        background: ${badgeBg};
        color: white; font-size: 0.625rem; font-weight: 600;
        padding: 2px 6px; border-radius: 3px;
      `;
      cell.appendChild(badge);
      return cell;
    };

    selected.forEach(id => {
      const photo = photoById.get(id);
      if (!photo) return;
      grid.appendChild(renderCell({ photo, kind: photo.urlOriginal ? 'delivered' : 'pending' }));
    });
    courtesyPhotos.forEach(photo => {
      grid.appendChild(renderCell({ photo, kind: 'courtesy' }));
    });
    wrap.appendChild(grid);

    if (courtesyPhotos.length > 0) {
      const note = document.createElement('div');
      note.style.cssText = 'font-size:0.75rem; color:var(--text-muted); padding-top:0.25rem;';
      note.innerHTML = `<strong style="color:var(--purple);">★ Cortesia:</strong> ${courtesyPhotos.length} foto${courtesyPhotos.length === 1 ? '' : 's'} fora da seleção do cliente. O cliente verá com a badge "Cortesia" na entrega.`;
      wrap.appendChild(note);
    }
  } else {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:2rem; text-align:center; color:var(--text-muted); font-size:0.875rem;';
    empty.textContent = 'O cliente ainda não selecionou fotos.';
    wrap.appendChild(empty);
  }

  return wrap;
}

// Multi: painel com lista de participantes, cada um com botão Export Lightroom individual.
// O .txt é gerado client-side a partir do selectedPhotos do participante.
function renderParticipantsExportPanel(session, photoById) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius: 0.5rem; overflow: hidden;
  `;

  const head = document.createElement('div');
  head.style.cssText = `
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 0.5rem;
  `;
  head.innerHTML = `
    <div style="flex:1;">
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
      padding: 0.5rem 0.875rem;
      display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
      ${i > 0 ? 'border-top: 1px solid var(--border);' : ''}
    `;
    row.innerHTML = `
      <div style="flex:1; min-width:140px;">
        <div style="font-size:0.875rem; font-weight:500; color:var(--text-primary);">${escapeHtmlSafe(p.name)}</div>
        <div style="font-size:0.6875rem; color:var(--text-muted);">${count} foto${count === 1 ? '' : 's'} · ${ready ? 'finalizou' : 'aguardando finalizar'}</div>
      </div>
    `;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.disabled = !ready || count === 0;
    btn.textContent = '📥 Lightroom (.txt)';
    btn.style.cssText = `
      background: ${ready && count ? 'var(--bg-base)' : 'var(--bg-elevated)'};
      color: ${ready && count ? 'var(--text-primary)' : 'var(--text-muted)'};
      border: 1px solid var(--border);
      padding: 0.375rem 0.75rem; border-radius: 0.375rem;
      cursor: ${ready && count ? 'pointer' : 'not-allowed'};
      font-size: 0.75rem;
    `;
    btn.title = ready ? `Baixa lista de ${count} fotos de ${p.name}` : 'Disponível quando o participante finalizar';
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
