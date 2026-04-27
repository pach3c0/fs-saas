import { resolveImagePath } from '../../utils/helpers.js';
import { apiGet, apiDelete } from '../../utils/api.js';
import { appState } from '../../state.js';

export function setupModalDetail(container, state) {
  window.viewSessionPhotos = async (sessionId) => {
    state.currentSessionId = sessionId;
    const session = state.sessionsData.find(s => s._id === sessionId);
    if (!session) return;

    const modal = container.querySelector('#sessionPhotosModal');
    const title = container.querySelector('#photosModalTitle');
    const grid = container.querySelector('#sessionPhotosGrid');

    const modeLabels = { selection: 'Seleção', gallery: 'Galeria', multi_selection: 'Multi-Seleção' };
    title.textContent = `Fotos - ${session.name} (${modeLabels[session.mode] || 'Galeria'})`;

    const mainBtn = container.querySelector('#mainUploadBtn');
    const secondaryBtn = container.querySelector('#secondaryUploadBtn');
    const tabBar = container.querySelector('#photoTabBar');
    const isGalleryMode = session.mode === 'gallery';

    mainBtn.innerHTML = `<span>+</span> Upload`;
    mainBtn.htmlFor = 'sessionUploadInput';
    mainBtn.style.background = 'var(--accent)';
    mainBtn.title = isGalleryMode ? 'Adicionar fotos — cliente verá com marca d\'água até a entrega' : 'Adicionar novas fotos';
    mainBtn.style.display = 'flex';

    secondaryBtn.style.display = 'none';

    // Modo galeria: oculta aba "Entrega Final" — o fluxo é só upload → entregar na lista
    if (tabBar) tabBar.style.display = isGalleryMode ? 'none' : 'flex';

    // Banner de modo re-entrega
    const existingBanner = modal.querySelector('#redeliveryBanner');
    if (existingBanner) existingBanner.remove();
    if (session.redeliveryMode) {
      const banner = document.createElement('div');
      banner.id = 'redeliveryBanner';
      banner.style.cssText = 'background:rgba(255,166,87,0.12); border:1px solid rgba(255,166,87,0.4); color:var(--orange); padding:0.625rem 1rem; border-radius:0.5rem; font-size:0.8125rem; display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;';
      banner.innerHTML = `<span style="font-size:1rem;">⚠️</span> <span><strong>Modo re-entrega ativo</strong> — suba as fotos editadas faltantes e clique em "Confirmar entrega" na lista da sessão.</span>`;
      modal.querySelector('#photosModalTitle').insertAdjacentElement('afterend', banner);
    }

    const photos = session.photos || [];
    const selectedIds = session.selectedPhotos || [];

    const bulkBar = container.querySelector('#bulkActionsBar');
    const selectAllCheck = container.querySelector('#selectAllPhotos');
    const bulkDeleteBtn = container.querySelector('#bulkDeleteBtn');
    const countLabel = container.querySelector('#selectedPhotosCount');
    if (bulkBar) {
      bulkBar.style.display = photos.length > 0 ? 'flex' : 'none';
      selectAllCheck.checked = false;
      countLabel.textContent = '0 selecionadas';
      bulkDeleteBtn.style.display = 'none';
    }

    const isCover = (url) => url === session.coverPhoto;

    if (photos.length > 0) {
      grid.innerHTML = photos.map((photo, idx) => {
        const isSelected = selectedIds.includes(photo.id);
        const hasComments = photo.comments && photo.comments.length > 0;
        const isHidden = photo.hidden === true;
        const isCoverPhoto = isCover(photo.url);
        return `
          <div style="position:relative; aspect-ratio:3/2; background:var(--bg-elevated); border-radius:0.5rem; overflow:hidden; ${isSelected ? 'border:3px solid var(--green);' : ''} ${isCoverPhoto ? 'outline:3px solid var(--yellow); outline-offset:-3px;' : ''} ${isHidden ? 'opacity:0.6;' : ''}">
            <img src="${resolveImagePath(photo.url)}" alt="Foto ${idx + 1}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; ${isHidden ? 'filter:grayscale(1);' : ''}">

            <input type="checkbox" class="photo-bulk-check" data-id="${photo.id}" onclick="event.stopPropagation()" style="position:absolute; top:0.5rem; left:0.5rem; width:1.25rem; height:1.25rem; cursor:pointer; z-index:20; accent-color:var(--accent);">

            ${isHidden ? '<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.3); color:white; font-weight:600; font-size:0.75rem; pointer-events:none; z-index:2;">OCULTA</div>' : ''}
            ${isCoverPhoto ? '<div style="position:absolute; top:0.25rem; right:0.25rem; background:var(--yellow); color:black; font-size:0.625rem; padding:0.125rem 0.375rem; border-radius:0.25rem; z-index:3; font-weight:600;">CAPA</div>' : ''}
            ${isSelected && !isCoverPhoto ? '<div style="position:absolute; top:0.25rem; right:0.25rem; background:var(--green); color:white; font-size:0.625rem; padding:0.125rem 0.375rem; border-radius:0.25rem; z-index:2;">Selecionada</div>' : ''}
            ${hasComments ? '<div style="position:absolute; top:2rem; right:0.25rem; background:var(--accent); color:white; font-size:0.625rem; padding:0.125rem 0.375rem; border-radius:0.25rem; z-index:2;" title="Tem comentários">💬</div>' : ''}

            <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); opacity:0; transition:opacity 0.2s; display:flex; align-items:center; justify-content:center; gap:0.5rem; z-index:5;"
              onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0'">

              <button onclick="window.togglePhotoHidden('${sessionId}', '${photo.id}')" style="background:${isHidden ? 'var(--red)' : 'var(--accent)'}; color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer;" title="${isHidden ? 'Mostrar' : 'Ocultar'}">
                ${isHidden ? '👁️‍🗨️' : '👁️'}
              </button>
              <button onclick="openComments('${sessionId}', '${photo.id}')" style="background:var(--accent); color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer;" title="Comentários">
                💬
              </button>
              <button onclick="window.setSessionCover('${sessionId}', '${photo.url.replace(/'/g, "\\'")}')" style="background:${isCoverPhoto ? 'var(--yellow)' : 'rgba(255,255,255,0.2)'}; color:${isCoverPhoto ? 'black' : 'white'}; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer; font-size:0.875rem;" title="${isCoverPhoto ? 'Capa atual' : 'Definir como capa'}">
                🖼️
              </button>
            </div>
            <div style="position:absolute; bottom:0.25rem; left:0.25rem; background:rgba(0,0,0,0.7); color:white; font-size:0.625rem; padding:0.125rem 0.375rem; border-radius:0.25rem; z-index:2;">${idx + 1}</div>
          </div>
        `;
      }).join('');

      // Lógica de seleção em massa
      const checkboxes = grid.querySelectorAll('.photo-bulk-check');
      const updateBulkUI = () => {
        const checked = Array.from(checkboxes).filter(cb => cb.checked);
        countLabel.textContent = `${checked.length} selecionada${checked.length !== 1 ? 's' : ''}`;
        bulkDeleteBtn.style.display = checked.length > 0 ? 'inline-block' : 'none';
        selectAllCheck.checked = checked.length === checkboxes.length && checkboxes.length > 0;
        selectAllCheck.indeterminate = checked.length > 0 && checked.length < checkboxes.length;
      };

      checkboxes.forEach(cb => cb.onclick = (e) => { e.stopPropagation(); updateBulkUI(); });
      selectAllCheck.onchange = (e) => { checkboxes.forEach(cb => cb.checked = e.target.checked); updateBulkUI(); };

      bulkDeleteBtn.onclick = async () => {
        const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);
        const ids = checkedBoxes.map(cb => cb.dataset.id);
        if (!ids.length) return;

        const ok = await window.showConfirm?.(`Deletar permanentemente as ${ids.length} foto(s) selecionada(s)?`);
        if (!ok) return;

        try {
          bulkDeleteBtn.disabled = true;
          bulkDeleteBtn.textContent = 'Deletando...';

          await apiDelete(`/api/sessions/${sessionId}/photos/bulk`, { photoIds: ids });

          checkedBoxes.forEach(cb => {
            const card = cb.closest('[style*="aspect-ratio"]');
            if (card) card.remove();
          });

          const sessionLocal = state.sessionsData.find(s => s._id === sessionId);
          if (sessionLocal) sessionLocal.photos = (sessionLocal.photos || []).filter(p => !ids.includes(p.id));

          selectAllCheck.checked = false;
          selectAllCheck.indeterminate = false;
          countLabel.textContent = '0 selecionadas';
          bulkDeleteBtn.style.display = 'none';

          if (grid.querySelectorAll('[style*="aspect-ratio"]').length === 0) {
            grid.innerHTML = '<p style="color:var(--text-secondary); text-align:center; grid-column:1/-1; padding:3rem;">Nenhuma foto na sessão. Use o Upload acima.</p>';
            bulkBar.style.display = 'none';
          }

          window.showToast?.(`${ids.length} foto(s) deletada(s)!`, 'success');
          window.loadSidebarStorage?.();
        } catch (error) {
          window.showToast?.('Erro: ' + error.message, 'error');
        } finally {
          bulkDeleteBtn.disabled = false;
          bulkDeleteBtn.textContent = 'Deletar selecionadas';
        }
      };

    } else {
      grid.innerHTML = '<p style="color:var(--text-secondary); text-align:center; grid-column:1/-1; padding:3rem;">Nenhuma foto na sessão. Use o Upload acima.</p>';
    }

    // Aba Entrega Final — só para modo seleção
    if (!isGalleryMode) {
      const deliveredPhotos = photos.filter(p => p.urlOriginal);
      const selectedGrid = container.querySelector('#selectedPhotosGrid');
      const badge = container.querySelector('#deliveryCountBadge');
      const selectedCount = (session.selectedPhotos || []).length;
      badge.textContent = `${deliveredPhotos.length}/${selectedCount || photos.length}`;

      if (deliveredPhotos.length > 0) {
        selectedGrid.innerHTML = deliveredPhotos.map((photo) => `
          <div style="position:relative; aspect-ratio:3/2; background:var(--bg-elevated); border-radius:0.4rem; overflow:hidden; border:2px solid var(--green);">
            <img src="${resolveImagePath(photo.url)}" alt="Final" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;">
            <div style="position:absolute; bottom:0.25rem; right:0.25rem; background:var(--green); color:white; font-size:0.5rem; padding:0.1rem 0.3rem; border-radius:4px; font-weight:bold;">ALTA RES</div>
          </div>
        `).join('');
      } else {
        selectedGrid.innerHTML = `
          <div style="color:var(--text-muted); text-align:center; grid-column:1/-1; padding:2rem; font-size:0.875rem;">
            <p>Nenhuma foto editada enviada.</p>
            <p style="font-size:0.75rem; margin-top:0.5rem;">Use o botão <b>Subir Editadas</b> para enviar as fotos de entrega.</p>
          </div>`;
      }

      const exportBtn = container.querySelector('#exportSelectionBtn');
      exportBtn.style.display = selectedIds.length > 0 ? 'flex' : 'none';
      exportBtn.onclick = () => {
        window.open(`/api/sessions/${sessionId}/export?token=${appState.authToken}`, '_blank');
      };
    }

    window.switchPhotoTab('geral');
    modal.style.display = 'flex';
  };

  window.switchPhotoTab = (tab) => {
    const tabGeral = container.querySelector('#tabGeral');
    const tabEntrega = container.querySelector('#tabEntrega');
    const btnGeral = container.querySelector('#tabGeralBtn');
    const btnEntrega = container.querySelector('#tabEntregaBtn');
    const mainBtn = container.querySelector('#mainUploadBtn');
    const secondaryBtn = container.querySelector('#secondaryUploadBtn');

    const session = state.sessionsData.find(s => s._id === state.currentSessionId);
    if (!session) return;

    // Modo galeria: sempre na aba geral, sem botão secundário
    if (session.mode === 'gallery' || tab === 'geral') {
      tabGeral.style.display = 'flex';
      tabEntrega.style.display = 'none';
      btnGeral.style.borderBottomColor = 'var(--accent)';
      btnGeral.style.color = 'var(--text-primary)';
      if (btnEntrega) {
        btnEntrega.style.borderBottomColor = 'transparent';
        btnEntrega.style.color = 'var(--text-secondary)';
      }
      mainBtn.style.display = 'flex';
      secondaryBtn.style.display = 'none';
      return;
    }

    // Aba Entrega Final — somente modo seleção
    tabGeral.style.display = 'none';
    tabEntrega.style.display = 'flex';
    btnGeral.style.borderBottomColor = 'transparent';
    btnGeral.style.color = 'var(--text-secondary)';
    btnEntrega.style.borderBottomColor = 'var(--accent)';
    btnEntrega.style.color = 'var(--text-primary)';
    mainBtn.style.display = 'none';

    const selectedCount = (session.selectedPhotos || []).length;
    const limit = session.packageLimit || 30;
    const isSubmitted = session.selectionStatus === 'submitted' || session.selectionStatus === 'delivered';
    const meetsLimit = selectedCount >= limit;
    const uploadEnabled = isSubmitted && meetsLimit;

    secondaryBtn.style.display = 'flex';
    if (uploadEnabled) {
      secondaryBtn.style.opacity = '1';
      secondaryBtn.style.pointerEvents = 'auto';
      secondaryBtn.style.cursor = 'pointer';
      secondaryBtn.title = 'Subir fotos editadas';
    } else {
      secondaryBtn.style.opacity = '0.5';
      secondaryBtn.style.pointerEvents = 'none';
      secondaryBtn.style.cursor = 'not-allowed';
      secondaryBtn.title = 'Aguardando cliente finalizar seleção';

      const selectedGrid = container.querySelector('#selectedPhotosGrid');
      const deliveredCount = (session.photos?.filter(p => p.urlOriginal) || []).length;
      if (deliveredCount === 0) {
        selectedGrid.innerHTML = `
          <div style="background:rgba(255,166,87,0.05); border:1px solid rgba(255,166,87,0.15); color:var(--orange); padding:2.5rem; border-radius:0.75rem; text-align:center; grid-column:1/-1; font-size:0.875rem; display:flex; flex-direction:column; align-items:center; gap:0.75rem; margin-top:2rem;">
            <span style="font-size:1.5rem;">⚠️ Aguardando Finalização</span>
            <p style="color:var(--text-secondary); max-width:400px; margin:0 auto;">Aguardando o cliente finalizar a seleção das imagens (${selectedCount}/${limit}) para poder habilitar o envio das fotos editadas.</p>
          </div>
        `;
      }
    }
  };

  container.querySelector('#closePhotosModal').onclick = () => {
    container.querySelector('#sessionPhotosModal').style.display = 'none';
    state.currentSessionId = null;
  };
}
