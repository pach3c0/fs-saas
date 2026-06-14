// Passo 1 do wizard — Upload das fotos brutas.
// Permite subir fotos, ver o grid, ocultar/deletar individualmente ou em lote,
// filtrar por visibilidade e marcar "Concluí upload" para destravar o próximo passo.

import { apiPut, apiDelete } from '../../../../utils/api.js';
import { resolveImagePath } from '../../../../utils/helpers.js';
import { UploadQueue } from '../../../../utils/upload.js';
import { UploadPanel } from '../../../../components/upload-panel.js';
import { icon } from '../../../../utils/icons.js';

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

export function renderStepUpload({ session, refresh, switchStep }) {
  ensureExpandBtnStyles();

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.25rem; max-width:1200px;';

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
    border-radius:var(--r-card);
    padding: 1.25rem;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; text-align: center;
  `;

  const statusLeft = document.createElement('div');
  statusLeft.style.cssText = 'display:flex; flex-direction:column; gap:0.25rem; align-items:center; text-align:center; width:100%;';
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
  statusBar.appendChild(fileInput);

  const buttonsRow = document.createElement('div');
  buttonsRow.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:0.75rem; flex-wrap:wrap;';

  const uploadBtn = makeExpandBtn('upload', 'Subir fotos', {
    bg: isCompleted ? 'var(--bg-hover)' : 'var(--green)',
    color: isCompleted ? 'var(--text-muted)' : 'white',
    disabled: isCompleted,
    title: isCompleted ? 'Reabra o upload para adicionar mais fotos' : 'Subir fotos',
  });
  uploadBtn.onclick = () => { if (!isCompleted) fileInput.click(); };
  buttonsRow.appendChild(uploadBtn);

  let toggleBtn;
  if (isCompleted) {
    toggleBtn = makeExpandBtn('reabrirUpload', 'Reabrir upload', {
      bg: 'var(--bg-hover)', color: 'var(--text-secondary)', title: 'Reabrir upload',
    });
    toggleBtn.onclick = async () => {
      const ok = await window.showConfirm?.('Reabrir upload permite enviar mais fotos. Tem certeza?', { confirmText: 'Reabrir', cancelText: 'Cancelar' });
      if (!ok) return;
      await apiPut(`/api/sessions/${session._id}/complete-uploads`, { completed: false });
      window.showToast?.('Upload reaberto', 'info');
      await refresh();
    };
  } else {
    const disabled = photosCount === 0 || !minimumMet;
    const concluirTitle = photosCount === 0
      ? 'Suba pelo menos uma foto antes de concluir'
      : (!minimumMet ? `Suba pelo menos ${packageLimit} fotos (faltam ${missingPhotos}) para concluir.` : 'Concluí upload');
    toggleBtn = makeExpandBtn('concluirUpload', 'Concluí upload', {
      bg: disabled ? 'var(--bg-hover)' : 'var(--green)',
      color: disabled ? 'var(--text-muted)' : 'white',
      disabled,
      title: concluirTitle,
    });
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
        if (switchStep) switchStep(2);
      } catch (err) {
        window.showToast?.(err.message || 'Erro ao concluir upload', 'error');
      }
    };
  }
  buttonsRow.appendChild(toggleBtn);
  statusBar.appendChild(buttonsRow);
  wrap.appendChild(statusBar);

  // ===== EMPTY STATE =====
  if (photosCount === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = `
      border: 2px dashed var(--border); border-radius:var(--r-card);
      padding: 3rem 1.5rem; text-align: center;
      color: var(--text-muted); font-size: 0.875rem;
    `;
    empty.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; margin-bottom:0.75rem; color:var(--text-muted);">
        ${icon('camera', 36)}
      </div>
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
  filterRow.style.cssText = 'display:flex; gap:0.375rem; align-items:center; justify-content:center; flex-wrap:wrap; margin:0 auto;';

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
      transition: background 0.15s, border-color 0.15s, color 0.15s;
      background: transparent;
      color: ${isActive ? 'white' : 'var(--text-secondary)'};
      border: 1px solid ${isActive ? 'white' : 'var(--border)'};
    `;
    btn.onclick = () => {
      currentFilter = key;
      Object.values(filterBtns).forEach(b => {
        const active = b.dataset.filterKey === key;
        b.style.background = 'transparent';
        b.style.color      = active ? 'white' : 'var(--text-secondary)';
        b.style.borderColor = active ? 'white' : 'var(--border)';
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
    display: flex; align-items: center; justify-content: center; gap: 0.75rem; flex-wrap: wrap;
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius:var(--r-card); padding: 0.625rem 1rem;
  `;

  const selectAllCheck = document.createElement('input');
  selectAllCheck.type = 'checkbox';
  selectAllCheck.style.cssText = 'width:1rem; height:1rem; cursor:pointer; accent-color:var(--accent);';

  const countLabel = document.createElement('span');
  countLabel.style.cssText = 'font-size:0.8125rem; color:var(--text-secondary);';

  const hideSelectedBtn = makeBulkBtn('Ocultar selecionadas');
  const showSelectedBtn = makeBulkBtn('Mostrar selecionadas');
  const deleteBtn       = makeBulkBtn('Deletar selecionadas', true);

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
        border: 2px dashed var(--border); border-radius:var(--r-card);
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
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 1.25rem;
      width: 100%;
    `;

    filtered.forEach(photo => {
      const isCover  = photo.url === session.coverPhoto;
      const isHidden = photo.hidden === true;
      const isSelected = selectedIds.has(String(photo.id));

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
        border: 2px solid ${isSelected ? 'white' : isCover ? 'var(--yellow)' : 'var(--border)'};
        ${isHidden ? 'opacity: 0.45;' : ''}
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    border-color 0.15s;
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
        position:absolute; top:16px; left:16px;
        width:1.125rem; height:1.125rem; cursor:pointer;
        z-index:20; accent-color:var(--accent);
        transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      `;
      cb.addEventListener('click', e => e.stopPropagation());
      cb.addEventListener('change', () => {
        if (cb.checked) {
          selectedIds.add(String(photo.id));
          cell.style.borderColor = 'white';
        } else {
          selectedIds.delete(String(photo.id));
          cell.style.borderColor = isCover ? 'var(--yellow)' : 'var(--border)';
        }
        updateBulkUI();
      });
      currentCheckboxes.push(cb);
      cell.appendChild(cb);

      // Badge CAPA
      let coverB;
      if (isCover) {
        coverB = document.createElement('div');
        coverB.textContent = 'CAPA';
        coverB.style.cssText = `
          position:absolute; top:16px; right:16px; z-index:10;
          background:var(--yellow); color:black;
          font-size:0.5625rem; font-weight:700;
          padding:2px 5px; border-radius:3px;
          transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        cell.appendChild(coverB);
      }

      // Badge OCULTA
      let hiddenB;
      if (isHidden) {
        hiddenB = document.createElement('div');
        hiddenB.textContent = 'OCULTA';
        hiddenB.style.cssText = `
          position:absolute; top:${isCover ? '28px' : '16px'}; right:16px; z-index:10;
          background:var(--text-muted); color:white;
          font-size:0.5625rem; font-weight:700;
          padding:2px 5px; border-radius:3px;
          transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        cell.appendChild(hiddenB);
      }

      // Badge dimensões
      let dimB;
      if (hasOrig || hasThumb) {
        dimB = document.createElement('div');
        dimB.textContent = hasOrig
          ? `${photo.widthOriginal}×${photo.heightOriginal}`
          : `${photo.width}×${photo.height}`;
        dimB.title = hasOrig
          ? `Resolução original (entrega): ${photo.widthOriginal}×${photo.heightOriginal}px`
          : `Resolução do preview: ${photo.width}×${photo.height}px`;
        dimB.style.cssText = `
          position:absolute; bottom:16px; right:16px; z-index:10;
          background:${hasOrig ? 'color-mix(in srgb, var(--accent) 75%, black)' : 'rgba(0,0,0,0.65)'};
          color:white;
          font-size:0.5625rem; padding:2px 5px; border-radius:3px;
          font-family:monospace; cursor:help;
          transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        cell.appendChild(dimB);
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

      const hideBtn = makeBtn(isHidden ? 'Mostrar foto' : 'Ocultar foto', isHidden ? '\u00b7' : '\u00b7', false);
      // Reaproveita o elemento para injetar o SVG do ícone
      hideBtn.innerHTML = '';
      hideBtn.title = isHidden ? 'Mostrar foto' : 'Ocultar foto';
      hideBtn.style.background = isHidden ? 'var(--red)' : 'rgba(255,255,255,0.15)';
      hideBtn.style.color = 'white';
      hideBtn.style.border = 'none';
      hideBtn.style.borderRadius = '9999px';
      hideBtn.style.width = '2rem';
      hideBtn.style.height = '2rem';
      hideBtn.style.display = 'flex';
      hideBtn.style.alignItems = 'center';
      hideBtn.style.justifyContent = 'center';
      hideBtn.style.cursor = 'pointer';
      hideBtn.style.transition = 'background 0.15s';
      hideBtn.innerHTML = icon('olho', 16);
      hideBtn.onmouseenter = () => { hideBtn.style.background = isHidden ? 'color-mix(in srgb, var(--red) 80%, white)' : 'rgba(255,255,255,0.35)'; };
      hideBtn.onmouseleave = () => { hideBtn.style.background = isHidden ? 'var(--red)' : 'rgba(255,255,255,0.15)'; };
      hideBtn.onclick = (e) => { e.stopPropagation(); handleToggleHidden(photo); };

      const coverBtn = makeBtn(isCover ? 'Capa atual' : 'Definir como capa', '·', isCover);
      // Substitui o conteúdo por ícone SVG
      coverBtn.innerHTML = '';
      coverBtn.style.background = isCover ? 'var(--yellow)' : 'rgba(255,255,255,0.15)';
      coverBtn.style.color = isCover ? 'black' : 'white';
      coverBtn.title = isCover ? 'Capa atual' : 'Definir como capa';
      coverBtn.innerHTML = icon('foto', 16);
      coverBtn.onmouseenter = () => { coverBtn.style.background = isCover ? 'color-mix(in srgb, var(--yellow) 80%, white)' : 'rgba(255,255,255,0.35)'; };
      coverBtn.onmouseleave = () => { coverBtn.style.background = isCover ? 'var(--yellow)' : 'rgba(255,255,255,0.15)'; };
      if (!isCover) coverBtn.onclick = (e) => { e.stopPropagation(); handleSetCover(photo); };

      overlay.appendChild(hideBtn);
      overlay.appendChild(coverBtn);
      cell.appendChild(overlay);

      cell.addEventListener('mouseenter', () => {
        cell.style.width = `${hoverWidth}px`;
        cell.style.height = `${hoverHeight}px`;
        cell.style.borderRadius = 'var(--r-field)';
        overlay.style.opacity = '1';

        cb.style.top = '6px';
        cb.style.left = '6px';

        if (coverB) {
          coverB.style.top = '6px';
          coverB.style.right = '6px';
        }
        if (hiddenB) {
          hiddenB.style.top = isCover ? '22px' : '6px';
          hiddenB.style.right = '6px';
        }
        if (dimB) {
          dimB.style.bottom = '6px';
          dimB.style.right = '6px';
        }
      });

      cell.addEventListener('mouseleave', () => {
        cell.style.width = '120px';
        cell.style.height = '120px';
        cell.style.borderRadius = '50%';
        overlay.style.opacity = '0';

        cb.style.top = '16px';
        cb.style.left = '16px';

        if (coverB) {
          coverB.style.top = '16px';
          coverB.style.right = '16px';
        }
        if (hiddenB) {
          hiddenB.style.top = isCover ? '28px' : '16px';
          hiddenB.style.right = '16px';
        }
        if (dimB) {
          dimB.style.bottom = '16px';
          dimB.style.right = '16px';
        }
      });

      // Clique na célula → abre lightbox (clique no checkbox não propaga)
      cell.addEventListener('click', () => {
        const idx = filtered.indexOf(photo);
        openLightbox(filtered, idx);
      });

      grid.appendChild(cell);
    });

    gridSlot.appendChild(grid);
    updateBulkUI();
  }

  rebuildGrid();

  return wrap;
}

// ===== LIGHTBOX / CARROSSEL =====
function openLightbox(photos, startIndex) {
  // Garante estilos do lightbox uma única vez
  if (!document.getElementById('cz-lightbox-styles')) {
    const s = document.createElement('style');
    s.id = 'cz-lightbox-styles';
    s.textContent = `
      #czLightbox {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0,0,0,0.88);
        backdrop-filter: saturate(180%) blur(18px);
        -webkit-backdrop-filter: saturate(180%) blur(18px);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 1rem;
        animation: czLbFadeIn 0.22s ease;
      }
      @keyframes czLbFadeIn {
        from { opacity: 0; } to { opacity: 1; }
      }
      #czLightbox img {
        max-width: 90vw; max-height: 78vh;
        object-fit: contain;
        border-radius: var(--r-field);
        box-shadow: 0 32px 80px rgba(0,0,0,0.7);
        animation: czLbImgIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      @keyframes czLbImgIn {
        from { opacity: 0; transform: scale(0.97); }
        to   { opacity: 1; transform: scale(1); }
      }

      /* Botão morph (fecha / navega) */
      .cz-lb-btn {
        box-sizing: border-box;
        display: inline-flex; align-items: center;
        height: 44px; min-width: 44px; padding: 0;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 9999px;
        color: white; cursor: pointer;
        overflow: hidden; white-space: nowrap;
        font-family: inherit; font-weight: 500; font-size: 0.875rem;
        transition: background 0.2s, min-width 0.3s cubic-bezier(0.4,0,0.2,1),
                    border-color 0.2s, filter 0.15s;
        backdrop-filter: blur(8px);
      }
      .cz-lb-btn:hover {
        background: rgba(255,255,255,0.16);
        border-color: rgba(255,255,255,0.35);
        filter: brightness(1.08);
      }
      .cz-lb-btn .cz-lb-ic {
        width: 44px; height: 44px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
      }
      .cz-lb-btn .cz-lb-lbl {
        max-width: 0; opacity: 0; overflow: hidden;
        transition: max-width 0.3s cubic-bezier(0.4,0,0.2,1),
                    opacity 0.2s ease,
                    padding-right 0.3s cubic-bezier(0.4,0,0.2,1);
      }
      .cz-lb-btn:hover .cz-lb-lbl,
      .cz-lb-btn:focus-visible .cz-lb-lbl {
        max-width: 10rem; opacity: 1; padding-right: 1rem;
      }
      .cz-lb-btn[disabled] { opacity: 0.3; cursor: not-allowed; }
      .cz-lb-btn[disabled]:hover .cz-lb-lbl { max-width: 0; opacity: 0; padding-right: 0; }

      #czLbCounter {
        font-size: 0.75rem; color: rgba(255,255,255,0.5);
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.04em;
      }
    `;
    document.head.appendChild(s);
  }

  // Remove lightbox anterior se existir
  document.getElementById('czLightbox')?.remove();

  let current = startIndex;

  const lb = document.createElement('div');
  lb.id = 'czLightbox';

  // ===== SVG helper local =====
  const lbIcon = (paths, size = 20) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0">${paths}</svg>`;

  const ICON_X        = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
  const ICON_PREV     = '<polyline points="15 18 9 12 15 6"/>';
  const ICON_NEXT     = '<polyline points="9 18 15 12 9 6"/>';

  // ===== Botão fechar (topo, centralizado) =====
  const closeBtn = document.createElement('button');
  closeBtn.className = 'cz-lb-btn';
  closeBtn.title = 'Fechar (ESC)';
  closeBtn.setAttribute('aria-label', 'Fechar');
  closeBtn.innerHTML = `
    <span class="cz-lb-ic">${lbIcon(ICON_X, 20)}</span>
    <span class="cz-lb-lbl">Fechar</span>
  `;
  closeBtn.onclick = () => lb.remove();

  // ===== Imagem central =====
  const imgEl = document.createElement('img');
  imgEl.alt = '';

  // ===== Contador =====
  const counter = document.createElement('div');
  counter.id = 'czLbCounter';

  // ===== Linha de navegação (seta ← imagem seta →) =====
  const navRow = document.createElement('div');
  navRow.style.cssText = 'display:flex; align-items:center; gap:1.5rem;';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'cz-lb-btn';
  prevBtn.title = 'Foto anterior';
  prevBtn.setAttribute('aria-label', 'Anterior');
  prevBtn.innerHTML = `
    <span class="cz-lb-ic">${lbIcon(ICON_PREV, 22)}</span>
    <span class="cz-lb-lbl">Anterior</span>
  `;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'cz-lb-btn';
  nextBtn.title = 'Próxima foto';
  nextBtn.setAttribute('aria-label', 'Próxima');
  nextBtn.innerHTML = `
    <span class="cz-lb-lbl" style="padding-left:1rem; padding-right:0; max-width:0; opacity:0; transition: max-width 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease, padding-left 0.3s;">Próxima</span>
    <span class="cz-lb-ic">${lbIcon(ICON_NEXT, 22)}</span>
  `;
  // Ajusta morph do nextBtn para label aparecer à esquerda do ícone
  nextBtn.addEventListener('mouseenter', () => {
    const lbl = nextBtn.querySelector('.cz-lb-lbl');
    lbl.style.maxWidth = '10rem';
    lbl.style.opacity = '1';
    lbl.style.paddingLeft = '1rem';
  });
  nextBtn.addEventListener('mouseleave', () => {
    const lbl = nextBtn.querySelector('.cz-lb-lbl');
    lbl.style.maxWidth = '0';
    lbl.style.opacity = '0';
    lbl.style.paddingLeft = '0';
  });

  function goTo(idx) {
    current = Math.max(0, Math.min(photos.length - 1, idx));
    const photo = photos[current];
    imgEl.src = resolveImagePath(photo.url);
    imgEl.alt = photo.filename || `Foto ${current + 1}`;
    counter.textContent = `${current + 1} / ${photos.length}`;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === photos.length - 1;
    // reinicia animação da imagem
    imgEl.style.animation = 'none';
    requestAnimationFrame(() => { imgEl.style.animation = ''; });
  }

  prevBtn.onclick = () => goTo(current - 1);
  nextBtn.onclick = () => goTo(current + 1);

  navRow.appendChild(prevBtn);
  navRow.appendChild(imgEl);
  navRow.appendChild(nextBtn);

  lb.appendChild(closeBtn);
  lb.appendChild(navRow);
  lb.appendChild(counter);

  // Fecha ao clicar no fundo (fora da imagem)
  lb.addEventListener('click', (e) => {
    if (e.target === lb) lb.remove();
  });

  // Teclado: ESC fecha, setas navegam
  const onKey = (e) => {
    if (!document.getElementById('czLightbox')) { document.removeEventListener('keydown', onKey); return; }
    if (e.key === 'Escape') lb.remove();
    if (e.key === 'ArrowLeft')  goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  };
  document.addEventListener('keydown', onKey);
  lb.addEventListener('remove', () => document.removeEventListener('keydown', onKey));

  document.body.appendChild(lb);
  goTo(current);
  closeBtn.focus();
}

// Botão circular "só ícone" que expande para revelar o texto no hover/foco.
// O círculo (40px) é a área do ícone; o rótulo cresce com transição de max-width.
// O fundo/cor vêm inline (variam por ação); a forma e a animação vêm da classe .cz-xbtn.
function makeExpandBtn(iconName, label, { bg, color, disabled = false, title } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cz-xbtn';
  btn.disabled = !!disabled;
  btn.title = title || label;
  btn.setAttribute('aria-label', label);
  btn.style.background = bg;
  btn.style.color = color;
  if (disabled) btn.style.cursor = 'not-allowed';
  btn.innerHTML = `<span class="cz-xic">${icon(iconName, 18)}</span><span class="cz-xlabel">${label}</span>`;
  return btn;
}

// Injeta uma única vez o CSS dos botões expansíveis (hover/foco revela o rótulo).
function ensureExpandBtnStyles() {
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

function makeBulkBtn(text, isDanger = false) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = text;
  btn.style.cssText = `
    padding: 0.375rem 0.875rem; border-radius: 9999px;
    font-size: 0.8125rem; font-weight: 500; cursor: pointer;
    background: transparent;
    color: ${isDanger ? 'var(--red)' : 'var(--text-primary)'};
    border: 1px solid ${isDanger ? 'var(--red)' : 'var(--border)'};
    transition: border-color 0.15s, color 0.15s;
  `;
  return btn;
}
