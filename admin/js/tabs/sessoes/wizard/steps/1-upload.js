// Passo 1 do wizard — Upload das fotos brutas.
// Permite subir fotos, ver o grid, ocultar/deletar individualmente,
// e marcar "Concluí upload" para destravar o passo de código.

import { apiPut } from '../../../../utils/api.js';
import { resolveImagePath } from '../../../../utils/helpers.js';
import { UploadQueue } from '../../../../utils/upload.js';
import { UploadPanel } from '../../../../components/upload-panel.js';

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
  // Atualiza onQueueDone para o novo callback (pode ter mudado entre etapas)
  window.globalUploadQueue.onQueueDone = onDone;
  return window.globalUploadQueue;
}

export function renderStepUpload({ session, refresh }) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.25rem; max-width:1200px;';

  // ===== HEADER DO PASSO =====
  const header = document.createElement('div');
  header.innerHTML = `
    <h2 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin:0 0 0.25rem;">Upload das Fotos</h2>
    <p style="color:var(--text-secondary); font-size:0.875rem; margin:0;">Suba as fotos brutas da sessão. Quando terminar, marque "Concluí upload" para liberar o próximo passo.</p>
  `;
  wrap.appendChild(header);

  // ===== BARRA DE STATUS =====
  const isCompleted = Boolean(session.uploadsCompletedAt);
  const photosCount = (session.photos || []).length;
  const packageLimit = session.packageLimit || 0;
  // Em modo seleção, o cliente precisa de pool >= pacote para conseguir submeter.
  // Espelha a regra do cliente: bloqueia "Concluí upload" até atingir o mínimo.
  const enforceMinimum = session.mode === 'selection' && packageLimit > 0;
  const minimumMet = !enforceMinimum || photosCount >= packageLimit;
  const missingPhotos = enforceMinimum ? Math.max(0, packageLimit - photosCount) : 0;

  const statusBar = document.createElement('div');
  statusBar.style.cssText = `
    background: ${isCompleted ? 'color-mix(in srgb, var(--green) 10%, transparent)' : 'var(--bg-surface)'};
    border: 1px solid ${isCompleted ? 'color-mix(in srgb, var(--green) 30%, transparent)' : 'var(--border)'};
    border-radius: 0.5rem;
    padding: 1rem 1.25rem;
    display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
  `;

  const statusLeft = document.createElement('div');
  statusLeft.style.cssText = 'flex:1; display:flex; flex-direction:column; gap:0.125rem; min-width:200px;';
  const statusHint = isCompleted
    ? `Marcado em ${new Date(session.uploadsCompletedAt).toLocaleString('pt-BR')}`
    : (enforceMinimum
      ? (minimumMet
        ? `Mínimo do pacote atingido (${photosCount}/${packageLimit}). Você pode concluir ou subir mais.`
        : `Faltam ${missingPhotos} foto${missingPhotos === 1 ? '' : 's'} para atingir o mínimo do pacote (${photosCount}/${packageLimit}).`)
      : 'Continue subindo ou clique em "Concluí upload" para avançar');
  statusLeft.innerHTML = `
    <div style="font-size:0.875rem; font-weight:500; color:var(--text-primary);">
      ${isCompleted ? '✓ Upload concluído' : `${photosCount} foto${photosCount === 1 ? '' : 's'} enviada${photosCount === 1 ? '' : 's'}`}
    </div>
    <div style="font-size:0.75rem; color:${!isCompleted && enforceMinimum && !minimumMet ? 'var(--orange)' : 'var(--text-muted)'};">
      ${statusHint}
    </div>
  `;
  statusBar.appendChild(statusLeft);

  // Botão Upload (sempre, mas com label diferente quando concluído)
  const uploadBtn = document.createElement('button');
  uploadBtn.type = 'button';
  uploadBtn.textContent = isCompleted ? '+ Adicionar mais fotos' : '+ Subir fotos';
  uploadBtn.style.cssText = `
    background: var(--accent); color: white; border: none;
    padding: 0.5rem 1rem; border-radius: 0.375rem;
    font-weight: 500; cursor: pointer; font-size: 0.875rem;
    white-space: nowrap;
  `;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.jpg,.jpeg,.png';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  fileInput.onchange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const queue = getOrCreateQueue(async () => {
      window.showToast?.('Uploads finalizados!', 'success');
      await refresh();
      window.loadSidebarStorage?.();
    });
    queue.add(files, `/api/sessions/${session._id}/photos`);
    fileInput.value = '';
  };
  uploadBtn.onclick = () => fileInput.click();
  statusBar.appendChild(fileInput);
  statusBar.appendChild(uploadBtn);

  // Botão concluir / reabrir
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  if (isCompleted) {
    toggleBtn.textContent = 'Reabrir upload';
    toggleBtn.style.cssText = `
      background: transparent; color: var(--text-secondary);
      border: 1px solid var(--border);
      padding: 0.5rem 1rem; border-radius: 0.375rem;
      cursor: pointer; font-size: 0.875rem; white-space: nowrap;
    `;
    toggleBtn.onclick = async () => {
      const ok = await window.showConfirm?.('Reabrir upload permite enviar mais fotos. Tem certeza?', { confirmText: 'Reabrir', cancelText: 'Cancelar' });
      if (!ok) return;
      await apiPut(`/api/sessions/${session._id}/complete-uploads`, { completed: false });
      window.showToast?.('Upload reaberto', 'info');
      await refresh();
    };
  } else {
    const disabled = photosCount === 0 || !minimumMet;
    toggleBtn.textContent = '✓ Concluí upload';
    toggleBtn.disabled = disabled;
    toggleBtn.style.cssText = `
      background: ${disabled ? 'var(--bg-hover)' : 'var(--green)'};
      color: ${disabled ? 'var(--text-muted)' : 'white'};
      border: none;
      padding: 0.5rem 1rem; border-radius: 0.375rem;
      cursor: ${disabled ? 'not-allowed' : 'pointer'};
      font-weight: 500; font-size: 0.875rem; white-space: nowrap;
    `;
    if (photosCount === 0) {
      toggleBtn.title = 'Suba pelo menos uma foto antes de concluir';
    } else if (!minimumMet) {
      toggleBtn.title = `Suba pelo menos ${packageLimit} fotos (faltam ${missingPhotos}) para concluir.`;
    }
    toggleBtn.onclick = async () => {
      const ok = await window.showConfirm?.(
        `Confirmar que terminou o upload de ${photosCount} foto${photosCount === 1 ? '' : 's'}? Você poderá reabrir depois se precisar.`,
        { confirmText: 'Concluir', cancelText: 'Cancelar' }
      );
      if (!ok) return;
      try {
        await apiPut(`/api/sessions/${session._id}/complete-uploads`, { completed: true });
        window.showToast?.('Upload concluído. Próximo passo desbloqueado.', 'success');
        await refresh();
      } catch (err) {
        window.showToast?.(err.message || 'Erro ao concluir upload', 'error');
      }
    };
  }
  statusBar.appendChild(toggleBtn);

  wrap.appendChild(statusBar);

  // ===== GRID DE FOTOS =====
  if (photosCount === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = `
      border: 2px dashed var(--border); border-radius: 0.75rem;
      padding: 3rem 1.5rem; text-align: center;
      color: var(--text-muted); font-size: 0.875rem;
    `;
    empty.innerHTML = `
      <div style="font-size:2rem; margin-bottom:0.5rem;">📷</div>
      <div>Nenhuma foto ainda. Clique em <strong>"Subir fotos"</strong> acima para começar.</div>
    `;
    wrap.appendChild(empty);
  } else {
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.5rem;
    `;
    (session.photos || []).forEach(photo => {
      const cell = document.createElement('div');
      cell.style.cssText = `
        position: relative; aspect-ratio: 3/2;
        background: var(--bg-surface); border-radius: 0.375rem;
        overflow: hidden; border: 1px solid var(--border);
        ${photo.hidden ? 'opacity: 0.4;' : ''}
      `;
      const img = document.createElement('img');
      img.src = resolveImagePath(photo.url);
      img.alt = photo.filename;
      img.loading = 'lazy';
      img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
      cell.appendChild(img);

      if (photo.id === session.coverPhoto) {
        const coverBadge = document.createElement('div');
        coverBadge.textContent = 'CAPA';
        coverBadge.style.cssText = `
          position:absolute; top:4px; left:4px;
          background:var(--accent); color:white;
          font-size:0.625rem; font-weight:600;
          padding:2px 6px; border-radius:3px;
        `;
        cell.appendChild(coverBadge);
      }
      if (photo.hidden) {
        const hiddenBadge = document.createElement('div');
        hiddenBadge.textContent = 'OCULTA';
        hiddenBadge.style.cssText = `
          position:absolute; top:4px; right:4px;
          background:var(--text-muted); color:white;
          font-size:0.625rem; font-weight:600;
          padding:2px 6px; border-radius:3px;
        `;
        cell.appendChild(hiddenBadge);
      }
      if (photo.width && photo.height) {
        const dim = document.createElement('div');
        dim.textContent = `${photo.width}×${photo.height}`;
        dim.style.cssText = `
          position:absolute; bottom:4px; right:4px;
          background:rgba(0,0,0,0.65); color:white;
          font-size:0.625rem; padding:2px 6px; border-radius:3px;
          font-family: monospace;
        `;
        cell.appendChild(dim);
      }
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);
  }

  return wrap;
}
