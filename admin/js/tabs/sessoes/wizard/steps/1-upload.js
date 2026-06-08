// Passo 1 do wizard — Upload das fotos brutas.
// Permite subir fotos, ver o grid, ocultar/deletar individualmente ou em lote,
// filtrar por visibilidade e marcar "Concluí upload" para destravar o próximo passo.

import { apiPut, apiDelete } from '../../../../utils/api.js';
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
  window.globalUploadQueue.onQueueDone = onDone;
  return window.globalUploadQueue;
}

export function renderStepUpload({ session, refresh }) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.25rem; max-width:1200px;';

  // ===== HEADER =====
  const header = document.createElement('div');
  header.innerHTML = `
    <h2 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin:0 0 0.25rem;">Upload das Fotos</h2>
    <p style="color:var(--text-secondary); font-size:0.875rem; margin:0;">Suba as fotos brutas da sessão. Quando terminar, marque "Concluí upload" para liberar o próximo passo.</p>
  `;
  wrap.appendChild(header);

  // ===== AVISO MODO GALERIA =====
  if (session.mode === 'gallery') {
    const galleryNotice = document.createElement('div');
    galleryNotice.style.cssText = `
      background: color-mix(in srgb, var(--yellow) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--yellow) 40%, transparent);
      border-radius: 0.5rem; padding: 0.875rem 1rem;
      font-size: 0.875rem; color: var(--text-primary);
      display: flex; gap: 0.625rem; align-items: flex-start;
    `;
    galleryNotice.innerHTML = `
      <span style="font-size:1.1rem; line-height:1.4; flex-shrink:0;">⚠️</span>
      <span>
        <strong>Modo Galeria:</strong> As fotos que você subir aqui serão entregues ao cliente
        <strong>na resolução original do arquivo</strong>.
        Suba os arquivos finais em alta resolução (ex.: JPEG exportado do Lightroom em tamanho real).
        A resolução do "preview" configurada na sessão afeta apenas a miniatura de visualização no grid.
      </span>
    `;
    wrap.appendChild(galleryNotice);
  }

  // ===== BARRA DE STATUS =====
  const isCompleted = Boolean(session.uploadsCompletedAt);
  const allPhotos = session.photos || [];
  const photosCount = allPhotos.length;
  const packageLimit = session.packageLimit || 0;
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

  const uploadBtn = document.createElement('button');
  uploadBtn.type = 'button';
  uploadBtn.textContent = '+ Subir fotos';
  uploadBtn.disabled = isCompleted;
  uploadBtn.style.cssText = `
    background: ${isCompleted ? 'var(--bg-hover)' : 'var(--accent)'};
    color: ${isCompleted ? 'var(--text-muted)' : 'white'};
    border: none; padding: 0.5rem 1rem; border-radius: 0.375rem;
    font-weight: 500; cursor: ${isCompleted ? 'not-allowed' : 'pointer'};
    font-size: 0.875rem; white-space: nowrap;
  `;
  if (isCompleted) uploadBtn.title = 'Reabra o upload para adicionar mais fotos';
  uploadBtn.onclick = () => { if (!isCompleted) fileInput.click(); };
  statusBar.appendChild(fileInput);
  statusBar.appendChild(uploadBtn);

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
      border: none; padding: 0.5rem 1rem; border-radius: 0.375rem;
      cursor: ${disabled ? 'not-allowed' : 'pointer'};
      font-weight: 500; font-size: 0.875rem; white-space: nowrap;
    `;
    if (photosCount === 0) toggleBtn.title = 'Suba pelo menos uma foto antes de concluir';
    else if (!minimumMet) toggleBtn.title = `Suba pelo menos ${packageLimit} fotos (faltam ${missingPhotos}) para concluir.`;
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

  // ===== EMPTY STATE =====
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
    return wrap;
  }

  // ===== ESTADO LOCAL =====
  let currentFilter = 'all'; // 'all' | 'visible' | 'hidden'
  const selectedIds = new Set();

  const visibleCount = allPhotos.filter(p => !p.hidden).length;
  const hiddenCount  = allPhotos.filter(p =>  p.hidden).length;

  // ===== FILTROS =====
  const filterRow = document.createElement('div');
  filterRow.style.cssText = 'display:flex; gap:0.375rem; align-items:center; flex-wrap:wrap;';

  const filterDefs = [
    { key: 'all',     label: `Todas (${photosCount})` },
    { key: 'visible', label: `Visíveis (${visibleCount})` },
    { key: 'hidden',  label: `Ocultas (${hiddenCount})` },
  ];

  const filterBtns = {};
  filterDefs.forEach(({ key, label }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.dataset.filterKey = key;
    const isActive = key === 'all';
    btn.style.cssText = `
      padding: 0.3rem 0.75rem; border-radius: 9999px;
      font-size: 0.75rem; font-weight: 500; cursor: pointer;
      transition: background 0.15s;
      background: ${isActive ? 'var(--accent)' : 'var(--bg-surface)'};
      color: ${isActive ? 'white' : 'var(--text-secondary)'};
      border: 1px solid ${isActive ? 'var(--accent)' : 'var(--border)'};
    `;
    btn.onclick = () => {
      currentFilter = key;
      Object.values(filterBtns).forEach(b => {
        const active = b.dataset.filterKey === key;
        b.style.background = active ? 'var(--accent)' : 'var(--bg-surface)';
        b.style.color      = active ? 'white' : 'var(--text-secondary)';
        b.style.borderColor = active ? 'var(--accent)' : 'var(--border)';
      });
      rebuildGrid();
    };
    filterBtns[key] = btn;
    filterRow.appendChild(btn);
  });
  wrap.appendChild(filterRow);

  // ===== BARRA DE AÇÕES EM MASSA =====
  const bulkBar = document.createElement('div');
  bulkBar.style.cssText = `
    display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius: 0.5rem; padding: 0.625rem 1rem;
  `;

  const selectAllCheck = document.createElement('input');
  selectAllCheck.type = 'checkbox';
  selectAllCheck.style.cssText = 'width:1rem; height:1rem; cursor:pointer; accent-color:var(--accent);';

  const countLabel = document.createElement('span');
  countLabel.style.cssText = 'font-size:0.8125rem; color:var(--text-secondary); flex:1;';

  const hideSelectedBtn = makeBulkBtn('Ocultar selecionadas', 'var(--bg-base)', 'var(--text-primary)', '1px solid var(--border)');
  const showSelectedBtn = makeBulkBtn('Mostrar selecionadas', 'var(--bg-base)', 'var(--text-primary)', '1px solid var(--border)');
  const deleteBtn       = makeBulkBtn('Deletar selecionadas', 'var(--red)', 'white', 'none');

  hideSelectedBtn.style.display = 'none';
  showSelectedBtn.style.display = 'none';
  deleteBtn.style.display = 'none';

  bulkBar.appendChild(selectAllCheck);
  bulkBar.appendChild(countLabel);
  bulkBar.appendChild(hideSelectedBtn);
  bulkBar.appendChild(showSelectedBtn);
  bulkBar.appendChild(deleteBtn);
  wrap.appendChild(bulkBar);

  // ===== GRID SLOT =====
  const gridSlot = document.createElement('div');
  wrap.appendChild(gridSlot);

  // ===== FUNÇÕES =====
  let currentCheckboxes = [];

  function getFilteredPhotos() {
    if (currentFilter === 'visible') return allPhotos.filter(p => !p.hidden);
    if (currentFilter === 'hidden')  return allPhotos.filter(p =>  p.hidden);
    return allPhotos;
  }

  function updateBulkUI() {
    const filtered = getFilteredPhotos();
    const nTotal = filtered.length;
    const nFiltered = filtered.filter(p => selectedIds.has(String(p.id))).length;

    countLabel.textContent = nFiltered > 0
      ? `${nFiltered} selecionada${nFiltered !== 1 ? 's' : ''}`
      : `${nTotal} foto${nTotal !== 1 ? 's' : ''}`;

    selectAllCheck.checked       = nFiltered === nTotal && nTotal > 0;
    selectAllCheck.indeterminate = nFiltered > 0 && nFiltered < nTotal;

    // Botões baseados em TODAS as selecionadas (de qualquer filtro)
    const allSelected = allPhotos.filter(p => selectedIds.has(String(p.id)));
    const hasVisible  = allSelected.some(p => !p.hidden);
    const hasHidden   = allSelected.some(p =>  p.hidden);
    const hasAny      = allSelected.length > 0;

    hideSelectedBtn.style.display = hasVisible ? 'inline-block' : 'none';
    showSelectedBtn.style.display = hasHidden  ? 'inline-block' : 'none';
    deleteBtn.style.display       = hasAny     ? 'inline-block' : 'none';
  }

  selectAllCheck.onchange = (e) => {
    getFilteredPhotos().forEach(p => {
      if (e.target.checked) selectedIds.add(String(p.id));
      else selectedIds.delete(String(p.id));
    });
    currentCheckboxes.forEach(cb => { cb.checked = e.target.checked; });
    updateBulkUI();
  };

  async function handleBulkToggleHidden(hidden) {
    const ids = Array.from(selectedIds);
    const ok = await window.showConfirm?.(
      `${hidden ? 'Ocultar' : 'Mostrar'} ${ids.length} foto${ids.length !== 1 ? 's' : ''}?`,
      { confirmText: hidden ? 'Ocultar' : 'Mostrar', cancelText: 'Cancelar' }
    );
    if (!ok) return;
    const btn = hidden ? hideSelectedBtn : showSelectedBtn;
    btn.disabled = true;
    btn.textContent = hidden ? 'Ocultando...' : 'Mostrando...';
    try {
      await apiPut(`/api/sessions/${session._id}/photos/bulk-hidden`, { photoIds: ids, hidden });
      const n = ids.length;
      window.showToast?.(`${n} foto${n !== 1 ? 's' : ''} ${hidden ? 'ocultada' : 'mostrada'}${n !== 1 ? 's' : ''}!`, 'success');
      selectedIds.clear();
      await refresh();
    } catch (err) {
      window.showToast?.(err.message || `Erro ao ${hidden ? 'ocultar' : 'mostrar'} fotos`, 'error');
      btn.disabled = false;
      btn.textContent = hidden ? 'Ocultar selecionadas' : 'Mostrar selecionadas';
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    const ok = await window.showConfirm?.(
      `Deletar permanentemente ${ids.length} foto${ids.length !== 1 ? 's' : ''}? Esta ação não pode ser desfeita.`,
      { confirmText: 'Deletar', cancelText: 'Cancelar' }
    );
    if (!ok) return;
    deleteBtn.disabled = true;
    deleteBtn.textContent = 'Deletando...';
    try {
      await apiDelete(`/api/sessions/${session._id}/photos/bulk`, { photoIds: ids });
      const n = ids.length;
      window.showToast?.(`${n} foto${n !== 1 ? 's' : ''} deletada${n !== 1 ? 's' : ''}!`, 'success');
      selectedIds.clear();
      await refresh();
      window.loadSidebarStorage?.();
    } catch (err) {
      window.showToast?.(err.message || 'Erro ao deletar fotos', 'error');
      deleteBtn.disabled = false;
      deleteBtn.textContent = 'Deletar selecionadas';
    }
  }

  async function handleToggleHidden(photo) {
    const isVisible = !photo.hidden;
    if (isVisible && session.mode === 'selection') {
      const totalVisible = allPhotos.filter(p => !p.hidden).length;
      const pacote = session.packageLimit || 30;
      if (totalVisible <= pacote) {
        window.showToast?.(
          `Não é possível ocultar: ${totalVisible} foto(s) visíveis e o pacote exige ${pacote}.`,
          'warning', 6000
        );
        return;
      }
    }
    try {
      await apiPut(`/api/sessions/${session._id}/photos/${photo.id}/toggle-hidden`);
      await refresh();
    } catch (err) {
      window.showToast?.(err.message || 'Erro ao ocultar foto', 'error');
    }
  }

  async function handleSetCover(photo) {
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

  hideSelectedBtn.onclick = () => handleBulkToggleHidden(true);
  showSelectedBtn.onclick = () => handleBulkToggleHidden(false);
  deleteBtn.onclick       = handleBulkDelete;

  // ===== REBUILD GRID (chamado na init e ao trocar filtro) =====
  function rebuildGrid() {
    const filtered = getFilteredPhotos();
    currentCheckboxes = [];
    gridSlot.innerHTML = '';

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = `
        border: 2px dashed var(--border); border-radius: 0.75rem;
        padding: 2rem 1.5rem; text-align: center;
        color: var(--text-muted); font-size: 0.875rem;
      `;
      empty.textContent = currentFilter === 'hidden'
        ? 'Nenhuma foto oculta nesta sessão.'
        : 'Nenhuma foto visível nesta sessão.';
      gridSlot.appendChild(empty);
      updateBulkUI();
      return;
    }

    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.5rem;
    `;

    filtered.forEach(photo => {
      const isCover  = photo.url === session.coverPhoto;
      const isHidden = photo.hidden === true;
      const isSelected = selectedIds.has(String(photo.id));

      const cell = document.createElement('div');
      cell.style.cssText = `
        position: relative; aspect-ratio: 3/2;
        background: var(--bg-surface); border-radius: 0.375rem;
        overflow: hidden;
        border: 2px solid ${isSelected ? 'var(--accent)' : isCover ? 'var(--yellow)' : 'var(--border)'};
        ${isHidden ? 'opacity: 0.45;' : ''}
      `;

      const img = document.createElement('img');
      img.src = resolveImagePath(photo.url);
      img.alt = photo.filename || '';
      img.loading = 'lazy';
      img.style.cssText = `width:100%; height:100%; object-fit:cover; display:block; ${isHidden ? 'filter:grayscale(1);' : ''}`;
      cell.appendChild(img);

      // Checkbox
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.id = photo.id;
      cb.checked = isSelected;
      cb.style.cssText = `
        position:absolute; top:0.375rem; left:0.375rem;
        width:1.125rem; height:1.125rem; cursor:pointer;
        z-index:20; accent-color:var(--accent);
      `;
      cb.addEventListener('click', e => e.stopPropagation());
      cb.addEventListener('change', () => {
        if (cb.checked) {
          selectedIds.add(String(photo.id));
          cell.style.borderColor = 'var(--accent)';
        } else {
          selectedIds.delete(String(photo.id));
          cell.style.borderColor = isCover ? 'var(--yellow)' : 'var(--border)';
        }
        updateBulkUI();
      });
      currentCheckboxes.push(cb);
      cell.appendChild(cb);

      // Badge CAPA
      if (isCover) {
        const b = document.createElement('div');
        b.textContent = 'CAPA';
        b.style.cssText = `
          position:absolute; top:4px; right:4px; z-index:10;
          background:var(--yellow); color:black;
          font-size:0.5625rem; font-weight:700;
          padding:2px 5px; border-radius:3px;
        `;
        cell.appendChild(b);
      }

      // Badge OCULTA
      if (isHidden) {
        const b = document.createElement('div');
        b.textContent = 'OCULTA';
        b.style.cssText = `
          position:absolute; top:${isCover ? '1.4rem' : '4px'}; right:4px; z-index:10;
          background:var(--text-muted); color:white;
          font-size:0.5625rem; font-weight:700;
          padding:2px 5px; border-radius:3px;
        `;
        cell.appendChild(b);
      }

      // Badge dimensões — mostra resolução ORIGINAL (entrega) quando disponível
      const hasOrig = photo.widthOriginal && photo.heightOriginal;
      const hasThumb = photo.width && photo.height;
      if (hasOrig || hasThumb) {
        const b = document.createElement('div');
        b.textContent = hasOrig
          ? `${photo.widthOriginal}×${photo.heightOriginal}`
          : `${photo.width}×${photo.height}`;
        b.title = hasOrig
          ? `Resolução original (entrega): ${photo.widthOriginal}×${photo.heightOriginal}px`
          : `Resolução do preview: ${photo.width}×${photo.height}px`;
        b.style.cssText = `
          position:absolute; bottom:4px; right:4px; z-index:10;
          background:${hasOrig ? 'color-mix(in srgb, var(--accent) 75%, black)' : 'rgba(0,0,0,0.65)'};
          color:white;
          font-size:0.5625rem; padding:2px 5px; border-radius:3px;
          font-family:monospace; cursor:help;
        `;
        cell.appendChild(b);
      }

      // Overlay hover com ações individuais
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:absolute; inset:0;
        background:rgba(0,0,0,0.45);
        opacity:0; transition:opacity 0.18s;
        display:flex; align-items:center; justify-content:center;
        gap:0.5rem; z-index:5;
      `;

      const makeBtn = (title, icon, active) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.title = title;
        btn.textContent = icon;
        btn.style.cssText = `
          background:${active ? 'var(--yellow)' : 'rgba(255,255,255,0.15)'};
          color:${active ? 'black' : 'white'};
          border:none; border-radius:9999px;
          width:2rem; height:2rem;
          cursor:pointer; font-size:1rem;
          display:flex; align-items:center; justify-content:center;
          transition:background 0.15s;
        `;
        btn.onmouseenter = () => { btn.style.background = active ? 'color-mix(in srgb, var(--yellow) 80%, white)' : 'rgba(255,255,255,0.35)'; };
        btn.onmouseleave = () => { btn.style.background = active ? 'var(--yellow)' : 'rgba(255,255,255,0.15)'; };
        return btn;
      };

      const hideBtn = makeBtn(isHidden ? 'Mostrar foto' : 'Ocultar foto', isHidden ? '👁️‍🗨️' : '👁️', false);
      hideBtn.style.background = isHidden ? 'var(--red)' : 'rgba(255,255,255,0.15)';
      hideBtn.onclick = (e) => { e.stopPropagation(); handleToggleHidden(photo); };

      const coverBtn = makeBtn(isCover ? 'Capa atual' : 'Definir como capa', '🖼️', isCover);
      if (!isCover) coverBtn.onclick = (e) => { e.stopPropagation(); handleSetCover(photo); };

      overlay.appendChild(hideBtn);
      overlay.appendChild(coverBtn);
      cell.appendChild(overlay);

      cell.addEventListener('mouseenter', () => { overlay.style.opacity = '1'; });
      cell.addEventListener('mouseleave', () => { overlay.style.opacity = '0'; });

      grid.appendChild(cell);
    });

    gridSlot.appendChild(grid);
    updateBulkUI();
  }

  rebuildGrid();
  return wrap;
}

function makeBulkBtn(text, bg, color, border) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = text;
  btn.style.cssText = `
    padding: 0.375rem 0.875rem; border-radius: 0.375rem;
    font-size: 0.8125rem; font-weight: 500; cursor: pointer;
    background: ${bg}; color: ${color}; border: ${border};
  `;
  return btn;
}
