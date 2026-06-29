// unified-photo-grid.js — Grid único para os modos selection e multi_selection.
// Substitui os três grids separados (Upload / Acompanhar / Editadas) por uma única
// visualização inteligente onde cada card mostra seu estado via borda + badge no hover.
//
// Estados de cada card (prioridade top→bottom):
//   1. Editada ✓   — photo.urlOriginal existe          → borda --green
//   2. Selecionada  — photo.id ∈ seleção do cliente     → borda --yellow
//   3. Oculta       — photo.hidden === true              → borda --border, opacidade 0.4
//   4. Normal       — sem estado especial                → borda --border

import { apiDelete } from '../../../utils/api.js';
import { resolveImagePath, escapeHtml } from '../../../utils/helpers.js';
import { icon } from '../../../utils/icons.js';
import { stopWizardPolling } from './state.js';
import { openSessionCourtesyModal } from './steps/5-edited.js';
// Sub-módulos do grid unificado (extraídos para manter cada arquivo abaixo de ~600 linhas;
// o render principal abaixo orquestra; a lógica de cada cluster mora em unified-grid/*):
import { ensureStyles } from './unified-grid/styles.js';
import { buildSelectedSet, buildPhotoSelectorsMap, renderSelectorChips, allParticipantsSubmitted, makeBulkBtn } from './unified-grid/helpers.js';
import { renderStatsPanel } from './unified-grid/stats.js';
import { handleUploadBrutas, handleUploadEdited, handleUploadEditedDirect, renderUploadChoiceCards } from './unified-grid/upload-actions.js';
import { handleDeliver, handleToggleHidden, handleSetCover, openCommentsModal, handleBulkToggleHidden, handleBulkDelete } from './unified-grid/actions.js';
import { setupPolling } from './unified-grid/polling.js';
import { openLightbox } from './unified-grid/lightbox.js';

// ── Componente principal ───────────────────────────────────────────────────
export function renderUnifiedPhotoGrid({ session, refresh }) {
  ensureStyles();
  stopWizardPolling();

  const isMulti   = session.mode === 'multi_selection' || session.mode === 'multi_instant';
  // Caminho escolhido nos cards do estado vazio: 'edited' = sessão já é de fotos finais
  // (pula o re-upload), então a toolbar NÃO mostra "Subir fotos" (originais) — seria contraditório.
  const isEditedFlow = session.uploadFlow === 'edited';
  const allPhotos = session.photos || [];
  const selectedSet     = buildSelectedSet(session);
  const photoSelectorsMap = isMulti ? buildPhotoSelectorsMap(session) : null;
  // Cortesia explícita (só seleção individual; no multi a cortesia é por participante).
  const courtesySet = isMulti ? new Set() : new Set((session.courtesyPhotos || []).map(String));

  // Conta estados
  const countAll      = allPhotos.length;
  const countSelected = allPhotos.filter(p => selectedSet.has(p.id)).length;
  const countEdited   = allPhotos.filter(p => !!p.urlOriginal).length;
  // Editadas que ESTÃO na seleção (progresso real rumo à entrega). Difere de countEdited,
  // que inclui cortesias/extras editadas fora da seleção — por isso a barra usa esta.
  const editedSelected = allPhotos.filter(p => selectedSet.has(p.id) && !!p.urlOriginal).length;
  const countHidden   = allPhotos.filter(p => p.hidden).length;

  // Seleção do cliente concluída? (single: submitted/delivered; multi: todos)
  const selectionDone = isMulti
    ? allParticipantsSubmitted(session)
    : ['submitted', 'delivered'].includes(session.selectionStatus);

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1rem; width:100%;';

  // ── FILE INPUTS (brutas + editadas) ─────────────────────────────────────
  const fileInputBrutas = document.createElement('input');
  fileInputBrutas.type = 'file'; fileInputBrutas.accept = '.jpg,.jpeg,.png';
  fileInputBrutas.multiple = true; fileInputBrutas.style.display = 'none';
  fileInputBrutas.onchange = (e) => handleUploadBrutas(e, session, refresh);
  wrap.appendChild(fileInputBrutas);

  const fileInputEdited = document.createElement('input');
  fileInputEdited.type = 'file'; fileInputEdited.accept = '.jpg,.jpeg,.png';
  fileInputEdited.multiple = true; fileInputEdited.style.display = 'none';
  fileInputEdited.onchange = (e) => handleUploadEdited(e, session, refresh, Array.from(selectedSet));
  wrap.appendChild(fileInputEdited);

  // Caminho B (galeria vazia): subir fotos JÁ EDITADAS direto como pool de escolha.
  // Vai pro upload-edited (preserva a alta) sem o confirm de "sem correspondente".
  const fileInputEditedDirect = document.createElement('input');
  fileInputEditedDirect.type = 'file'; fileInputEditedDirect.accept = '.jpg,.jpeg,.png';
  fileInputEditedDirect.multiple = true; fileInputEditedDirect.style.display = 'none';
  fileInputEditedDirect.onchange = (e) => handleUploadEditedDirect(e, session, refresh);
  wrap.appendChild(fileInputEditedDirect);

  // ── STATS / PARTICIPANTES ────────────────────────────────────────────────
  // No multi o painel é a central de participantes (roster + Link/WhatsApp/Código/Preview +
  // Gerenciar/QR de auto-inscrição) — precisa aparecer SEMPRE, inclusive na sessão recém-criada
  // sem ninguém inscrito. No single é o status da seleção, que só faz sentido após atividade.
  const hasActivity = countSelected > 0 ||
    ['submitted', 'delivered', 'in_progress'].includes(session.selectionStatus) ||
    (isMulti && (session.participants || []).some(p => p.selectionStatus !== 'pending'));

  if (isMulti || hasActivity) {
    wrap.appendChild(renderStatsPanel(session, isMulti, selectionDone, countSelected, countEdited, refresh));
  }

  // ── TOOLBAR ──────────────────────────────────────────────────────────────
  const mkDivider = () => {
    const d = document.createElement('div');
    d.style.cssText = 'width:1px; height:18px; background:var(--border); flex-shrink:0;';
    return d;
  };

  const toolbar = document.createElement('div');
  toolbar.style.cssText = `
    display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;
    background:var(--bg-surface); border:1px solid var(--border);
    border-radius:var(--r-card); padding:0.4rem 0.75rem;
  `;

  // Botão Subir Brutas (originais) — escondido no fluxo "editadas": a sessão já está
  // comprometida com fotos finais, subir uma crua-sem-edição aqui seria contraditório.
  if (!isEditedFlow) {
    const btnBrutas = document.createElement('button');
    btnBrutas.type = 'button';
    btnBrutas.className = 'cz-ug-pill primary';
    btnBrutas.innerHTML = `<span style="display:flex;align-items:center;">${icon('upload', 14)}</span><span>Subir fotos</span>`;
    btnBrutas.title = 'Fotos sem edição: o cliente escolhe em versões leves e você edita as escolhidas depois.';
    btnBrutas.onclick = () => fileInputBrutas.click();
    toolbar.appendChild(btnBrutas);
  }

  // Botão Subir Editadas. No fluxo "editadas" vira "Subir mais fotos" e usa o upload direto
  // (sem o confirm de "sem correspondente") — todas as fotos aqui são finais.
  const btnEdited = document.createElement('button');
  btnEdited.type = 'button';
  btnEdited.className = isEditedFlow ? 'cz-ug-pill primary' : 'cz-ug-pill';
  if (!isEditedFlow) {
    btnEdited.style.cssText += 'border-color:color-mix(in srgb, var(--yellow) 40%, transparent); color:var(--text-primary);';
  }
  const editedLabel = isEditedFlow ? 'Subir mais fotos' : 'Subir editadas';
  btnEdited.innerHTML = `<span style="display:flex;align-items:center;">${icon('upload', 14)}</span><span>${editedLabel}</span>`;
  btnEdited.title = isEditedFlow
    ? 'Adicionar mais fotos já editadas ao pool de escolha.'
    : 'Fotos finais já tratadas — casa por nome de arquivo com as fotos da seleção (pula o re-upload).';
  btnEdited.onclick = () => (isEditedFlow ? fileInputEditedDirect : fileInputEdited).click();
  toolbar.appendChild(btnEdited);

  // Botão Cortesia (só seleção individual, quando já há fotos): presentear fotos fora da seleção.
  if (!isMulti && countAll > 0) {
    const btnCourtesy = document.createElement('button');
    btnCourtesy.type = 'button';
    btnCourtesy.className = 'cz-ug-pill';
    btnCourtesy.style.cssText += 'border-color:color-mix(in srgb, var(--accent) 40%, transparent); color:var(--text-primary);';
    btnCourtesy.innerHTML = `<span style="font-size:.875rem;line-height:1;">🎁</span><span>Dar cortesia</span>`;
    btnCourtesy.title = 'Presentear o cliente com fotos fora da seleção';
    btnCourtesy.onclick = () => openSessionCourtesyModal(session, refresh);
    toolbar.appendChild(btnCourtesy);
  }

  // Botão Entregar (aparece quando tem editadas)
  if (countEdited > 0 && !isMulti) {
    const isDelivered = Boolean(session.deliveredAt) || session.selectionStatus === 'delivered';
    const selected    = session.selectedPhotos || [];
    const delivered   = selected.filter(id => (session.photos || []).find(p => p.id === id && p.urlOriginal));
    const isPartial   = delivered.length < selected.length && selected.length > 0;

    const btnDeliver = document.createElement('button');
    btnDeliver.type = 'button';
    btnDeliver.className = 'cz-ug-pill';
    btnDeliver.style.cssText += isDelivered
      ? 'border-color:var(--orange); color:var(--orange);'
      : 'border-color:color-mix(in srgb, var(--green) 40%, transparent); color:var(--green);';
    const deliverLabel = isDelivered
      ? 'Re-entregar'
      : isPartial ? `Entregar ${delivered.length}/${selected.length}` : 'Entregar fotos';
    btnDeliver.innerHTML = `<span style="display:flex;align-items:center;">${icon('checkCircle', 14)}</span><span>${deliverLabel}</span>`;
    btnDeliver.onclick = () => handleDeliver(session, refresh, delivered, selected, isDelivered, isPartial);
    toolbar.appendChild(btnDeliver);
  }

  if (countAll > 0) {
    toolbar.appendChild(mkDivider());

    // Contador
    const counterEl = document.createElement('span');
    counterEl.id = 'cz-ug-counter-text';
    counterEl.style.cssText = 'font-size:.8125rem; color:var(--text-secondary); white-space:nowrap; flex-shrink:0;';
    counterEl.textContent = `${countAll} foto${countAll !== 1 ? 's' : ''}`;
    toolbar.appendChild(counterEl);

    // Progresso de edição da SELEÇÃO (quantas das fotos selecionadas já têm editada).
    if (countSelected > 0) {
      const pct = Math.round((editedSelected / countSelected) * 100);
      const done = editedSelected >= countSelected;
      const progressEl = document.createElement('div');
      progressEl.style.cssText = 'display:flex; align-items:center; gap:0.375rem; flex-shrink:0;';
      progressEl.title = `${editedSelected} de ${countSelected} foto(s) selecionada(s) pelo cliente já estão editadas`;
      progressEl.innerHTML = `
        <div style="width:60px; height:5px; background:var(--bg-base); border-radius:3px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:${done ? 'var(--green)' : 'var(--yellow)'}; transition:width .3s;"></div>
        </div>
        <span style="font-size:.6875rem; color:var(--text-muted); white-space:nowrap;">${editedSelected}/${countSelected} selecionadas editadas</span>
      `;
      toolbar.appendChild(progressEl);
    }

    // Spacer
    const spacer = document.createElement('div');
    spacer.style.cssText = 'flex:1; min-width:0;';
    toolbar.appendChild(spacer);

    // Chips de filtro
    let currentFilter = 'all';
    const selectedIds = new Set();
    const chips = {};

    const filterGroup = document.createElement('div');
    filterGroup.style.cssText = 'display:flex; gap:.25rem; flex-shrink:0;';

    // Filtros globais
    const filterDefs = [
      { key: 'all',      label: `Todas (${countAll})` },
      { key: 'selected', label: `Selecionadas (${countSelected})`, hide: countSelected === 0 },
      { key: 'edited',   label: `Editadas (${countEdited})`,       hide: countEdited === 0   },
      { key: 'hidden',   label: `Ocultas (${countHidden})`,        hide: countHidden === 0   },
    ].filter(f => !f.hide);

    filterDefs.forEach(({ key, label }) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = label;
      chip.className = 'cz-ug-chip' + (key === 'all' ? ' active' : '');
      chip.onclick = () => {
        currentFilter = key;
        currentParticipantFilter = null;
        currentPersonFilter = null;
        Object.values(chips).forEach(c => c.classList.remove('active'));
        Object.values(pChips).forEach(c => c.classList.remove('active'));
        Object.values(personChips).forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        rebuildGrid();
      };
      chips[key] = chip;
      filterGroup.appendChild(chip);
    });
    toolbar.appendChild(filterGroup);

    // Chips de filtro por participante (só no modo multi)
    const pChips = {};
    let currentParticipantFilter = null; // participantId ou null
    if (isMulti) {
      const participantsWithSelection = (session.participants || []).filter(p => (p.selectedPhotos || []).length > 0);
      if (participantsWithSelection.length > 0) {
        toolbar.appendChild(mkDivider());
        const pGroup = document.createElement('div');
        pGroup.style.cssText = 'display:flex; gap:.25rem; flex-shrink:0; flex-wrap:wrap;';
        const pLabel = document.createElement('span');
        pLabel.style.cssText = 'font-size:.6875rem; color:var(--text-muted); align-self:center; white-space:nowrap;';
        pLabel.textContent = 'Ver:';
        pGroup.appendChild(pLabel);

        participantsWithSelection.forEach(p => {
          const pCount = (p.selectedPhotos || []).length;
          const pFirstName = String(p.name || '').split(' ')[0] || p.name;
          const pChip = document.createElement('button');
          pChip.type = 'button';
          pChip.textContent = `${pFirstName} (${pCount})`;
          pChip.title = `Ver seleção de ${p.name}`;
          pChip.className = 'cz-ug-chip';
          pChip.onclick = () => {
            currentPersonFilter = null;
            Object.values(personChips).forEach(c => c.classList.remove('active'));
            if (currentParticipantFilter === p._id) {
              // Toggle off: volta para Todas
              currentParticipantFilter = null;
              currentFilter = 'all';
              Object.values(chips).forEach(c => c.classList.remove('active'));
              chips['all']?.classList.add('active');
              Object.values(pChips).forEach(c => c.classList.remove('active'));
            } else {
              currentParticipantFilter = p._id;
              currentFilter = 'participant';
              Object.values(chips).forEach(c => c.classList.remove('active'));
              Object.values(pChips).forEach(c => c.classList.remove('active'));
              pChip.classList.add('active');
            }
            rebuildGrid();
          };
          pChips[p._id] = pChip;
          pGroup.appendChild(pChip);
        });
        toolbar.appendChild(pGroup);
      }
    }

    // ── Chips de filtro por PESSOA (camada facial da Triagem) ───────────────
    // Mesmas "bolinhas" de rosto que o cliente vê na galeria: aparecem só quando a
    // sessão veio da Triagem (faceEnabled + persons[]). Filtra por personTags da foto.
    const personChips = {};
    let currentPersonFilter = null; // triagemId ou null
    const facePersons = (session.faceEnabled && Array.isArray(session.persons)) ? session.persons : [];
    if (facePersons.length > 0) {
      toolbar.appendChild(mkDivider());
      const faceGroup = document.createElement('div');
      faceGroup.style.cssText = 'display:flex; gap:.3rem; flex-shrink:0; flex-wrap:wrap; align-items:center;';
      const faceLabel = document.createElement('span');
      faceLabel.style.cssText = 'font-size:.6875rem; color:var(--text-muted); align-self:center; white-space:nowrap;';
      faceLabel.textContent = '👤 Pessoa:';
      faceGroup.appendChild(faceLabel);

      facePersons.forEach(pe => {
        const nm = (pe.name && pe.name.trim()) ? pe.name : 'Pessoa';
        const count = pe.photoCount || 0;
        const pChip = document.createElement('button');
        pChip.type = 'button';
        pChip.className = 'cz-ug-chip cz-ug-face-chip';
        const thumb = pe.thumbUrl
          ? `<img src="${resolveImagePath(pe.thumbUrl)}" alt="" style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex:none;">`
          : `<span style="width:22px;height:22px;border-radius:50%;background:var(--bg-base);display:inline-flex;align-items:center;justify-content:center;font-size:.7rem;flex:none;">👤</span>`;
        pChip.innerHTML = `${thumb}<span>${escapeHtml(nm)}</span><span style="opacity:.6;">${count}</span>`;
        pChip.title = `Ver fotos de ${nm}`;
        pChip.onclick = () => {
          // Toca o chip ativo de novo → limpa; senão ativa este e zera os outros grupos.
          if (currentPersonFilter === pe.triagemId) {
            currentPersonFilter = null;
            currentFilter = 'all';
            Object.values(chips).forEach(c => c.classList.remove('active'));
            chips['all']?.classList.add('active');
            Object.values(personChips).forEach(c => c.classList.remove('active'));
          } else {
            currentPersonFilter = pe.triagemId;
            currentFilter = 'person';
            currentParticipantFilter = null;
            Object.values(chips).forEach(c => c.classList.remove('active'));
            Object.values(pChips).forEach(c => c.classList.remove('active'));
            Object.values(personChips).forEach(c => c.classList.remove('active'));
            pChip.classList.add('active');
          }
          rebuildGrid();
        };
        personChips[pe.triagemId] = pChip;
        faceGroup.appendChild(pChip);
      });
      toolbar.appendChild(faceGroup);
    }

    toolbar.appendChild(mkDivider());

    // Checkbox selecionar tudo
    const selectAllCheck = document.createElement('input');
    selectAllCheck.type = 'checkbox';
    selectAllCheck.title = 'Selecionar todas';
    selectAllCheck.style.cssText = 'width:.875rem; height:.875rem; cursor:pointer; accent-color:var(--accent); flex-shrink:0;';

    // Botões de bulk
    const bulkHide   = makeBulkBtn('Ocultar', false);
    const bulkShow   = makeBulkBtn('Mostrar', false);
    const bulkDelete = makeBulkBtn('Deletar', true);
    [bulkHide, bulkShow, bulkDelete].forEach(b => { b.style.display = 'none'; });

    toolbar.appendChild(selectAllCheck);
    toolbar.appendChild(bulkHide);
    toolbar.appendChild(bulkShow);
    toolbar.appendChild(bulkDelete);

    wrap.appendChild(toolbar);

    // ── EMPTY STATE ────────────────────────────────────────────────────────
    const emptyState = document.createElement('div');
    emptyState.style.cssText = `
      display:none; border:2px dashed var(--border); border-radius:var(--r-card);
      padding:2rem 1.5rem; text-align:center; color:var(--text-muted); font-size:.875rem;
    `;

    // ── GRID SLOT ──────────────────────────────────────────────────────────
    const gridSlot = document.createElement('div');
    wrap.appendChild(emptyState);
    wrap.appendChild(gridSlot);

    // ── ESTADO INTERNO DO BULK ─────────────────────────────────────────────
    let currentCheckboxes = [];

    function getFilteredPhotos() {
      // Filtro por participante individual (modo multi)
      if (currentFilter === 'participant' && currentParticipantFilter) {
        const pObj = (session.participants || []).find(p => p._id === currentParticipantFilter);
        const pSet = new Set(pObj?.selectedPhotos || []);
        return allPhotos.filter(p => pSet.has(p.id));
      }
      // Filtro por PESSOA (camada facial): fotos cujas personTags contêm o triagemId.
      if (currentFilter === 'person' && currentPersonFilter) {
        return allPhotos.filter(p => Array.isArray(p.personTags) && p.personTags.includes(currentPersonFilter));
      }
      switch (currentFilter) {
        case 'selected': return allPhotos.filter(p => selectedSet.has(p.id));
        case 'edited':   return allPhotos.filter(p => !!p.urlOriginal);
        case 'hidden':   return allPhotos.filter(p => p.hidden);
        default:         return allPhotos;
      }
    }

    function updateBulkUI() {
      const filtered = getFilteredPhotos();
      const nFiltered = filtered.filter(p => selectedIds.has(String(p.id))).length;
      const nTotal    = filtered.length;

      counterEl.textContent = nFiltered > 0
        ? `${nFiltered} selecionada${nFiltered !== 1 ? 's' : ''}`
        : `${nTotal} foto${nTotal !== 1 ? 's' : ''}`;

      selectAllCheck.checked       = nFiltered === nTotal && nTotal > 0;
      selectAllCheck.indeterminate = nFiltered > 0 && nFiltered < nTotal;

      const allSel      = allPhotos.filter(p => selectedIds.has(String(p.id)));
      const hasVisible  = allSel.some(p => !p.hidden);
      const hasHidden   = allSel.some(p =>  p.hidden);
      const hasAny      = allSel.length > 0;
      bulkHide.style.display   = hasVisible ? 'inline-block' : 'none';
      bulkShow.style.display   = hasHidden  ? 'inline-block' : 'none';
      bulkDelete.style.display = hasAny     ? 'inline-block' : 'none';
    }

    selectAllCheck.onchange = (e) => {
      getFilteredPhotos().forEach(p => {
        if (e.target.checked) selectedIds.add(String(p.id));
        else selectedIds.delete(String(p.id));
      });
      currentCheckboxes.forEach(cb => { cb.checked = e.target.checked; });
      updateBulkUI();
    };

    bulkHide.onclick   = () => handleBulkToggleHidden(true,  session, selectedIds, refresh, bulkHide);
    bulkShow.onclick   = () => handleBulkToggleHidden(false, session, selectedIds, refresh, bulkShow);
    bulkDelete.onclick = () => handleBulkDelete(session, selectedIds, refresh, bulkDelete);

    // ── REBUILD GRID ───────────────────────────────────────────────────────
    function rebuildGrid() {
      currentCheckboxes = [];
      gridSlot.innerHTML = '';

      const filtered = getFilteredPhotos();

      if (filtered.length === 0) {
        emptyState.style.display = 'block';
        const msgs = {
          all: 'Nenhuma foto ainda.',
          selected: 'Nenhuma foto selecionada pelo cliente.',
          edited: 'Nenhuma foto editada enviada ainda.',
          hidden: 'Nenhuma foto oculta.',
          person: 'Nenhuma foto desta pessoa.'
        };
        emptyState.textContent = msgs[currentFilter] || 'Nenhuma foto.';
        updateBulkUI();
        return;
      }
      emptyState.style.display = 'none';

      const grid = document.createElement('div');
      grid.style.cssText = `
        display:flex; flex-wrap:wrap;
        justify-content:flex-start; align-items:flex-start;
        gap:1.25rem; width:100%;
      `;

      filtered.forEach(photo => {
        const isEdited   = !!photo.urlOriginal;
        const isSel      = selectedSet.has(photo.id);
        const isCourtesy = courtesySet.has(String(photo.id)) && !isSel;
        const isHidden   = photo.hidden === true;
        const isCover    = photo.url === session.coverPhoto;
        const isChecked  = selectedIds.has(String(photo.id));
        const hasComments = (photo.comments?.length || 0) > 0;
        const selectorNames = isMulti && isSel ? photoSelectorsMap?.get(photo.id) : null;

        // Estado do card (prioridade): editada > selecionada > cortesia > normal
        let borderColor, cardStatus;
        if (isEdited)        { borderColor = 'var(--green)';  cardStatus = 'edited';    }
        else if (isSel)      { borderColor = 'var(--yellow)'; cardStatus = 'selected';  }
        else if (isCourtesy) { borderColor = 'var(--accent)'; cardStatus = 'courtesy';  }
        else                 { borderColor = 'var(--border)'; cardStatus = 'normal';    }

        const cell = document.createElement('div');
        cell.style.cssText = `
          position:relative; width:200px; height:150px;
          border-radius:var(--r-card); background:var(--bg-surface);
          overflow:hidden; border:2px solid ${borderColor};
          ${isHidden ? 'opacity:.42;' : ''}
          cursor:pointer;
          transition:border-color .15s, box-shadow .15s;
        `;

        // Imagem
        const img = document.createElement('img');
        img.src = resolveImagePath(photo.url);
        img.alt = photo.filename || '';
        img.loading = 'lazy';
        img.style.cssText = `width:100%; height:100%; object-fit:cover; display:block; ${isHidden ? 'filter:grayscale(1);' : ''}`;
        cell.appendChild(img);

        // Checkbox
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.dataset.id = photo.id; cb.checked = isChecked;
        cb.style.cssText = `
          position:absolute; top:16px; left:16px;
          width:1.125rem; height:1.125rem; cursor:pointer; z-index:20;
          accent-color:var(--accent);
          transition:top .3s cubic-bezier(.4,0,.2,1), left .3s cubic-bezier(.4,0,.2,1);
        `;
        cb.addEventListener('click', e => e.stopPropagation());
        cb.addEventListener('change', () => {
          if (cb.checked) { selectedIds.add(String(photo.id)); cell.style.borderColor = 'white'; }
          else { selectedIds.delete(String(photo.id)); cell.style.borderColor = borderColor; }
          updateBulkUI();
        });
        currentCheckboxes.push(cb);
        cell.appendChild(cb);

        // Badge capa
        let coverB;
        if (isCover) {
          coverB = document.createElement('div');
          coverB.textContent = 'CAPA';
          coverB.style.cssText = `
            position:absolute; top:16px; right:16px; z-index:10;
            background:var(--yellow); color:black;
            font-size:.5625rem; font-weight:700; padding:2px 5px; border-radius:3px;
            transition:top .3s cubic-bezier(.4,0,.2,1), right .3s cubic-bezier(.4,0,.2,1);
          `;
          cell.appendChild(coverB);
        }

        // Badge estado (canto superior esquerdo — abaixo do checkbox, visível no hover)
        let stateB;
        if (cardStatus !== 'normal' || isHidden) {
          stateB = document.createElement('div');
          let stateText, stateBg, stateClr;
          if (isEdited)                       { stateText = '✓ Editada';   stateBg = 'var(--green)';      stateClr = 'white'; }
          else if (isSel)                     { stateText = 'Selecionada'; stateBg = 'var(--yellow)';     stateClr = 'black'; }
          else if (cardStatus === 'courtesy') { stateText = '★ Cortesia';  stateBg = 'var(--accent)';     stateClr = 'var(--accent-on)'; }
          else                                { stateText = 'Oculta';      stateBg = 'var(--text-muted)'; stateClr = 'white'; }
          stateB.textContent = stateText;
          stateB.style.cssText = `
            position:absolute; bottom:16px; left:16px; z-index:10;
            background:${stateBg}; color:${stateClr};
            font-size:.5625rem; font-weight:700; padding:2px 6px; border-radius:3px;
            opacity:0;
            transition:opacity .18s, bottom .3s cubic-bezier(.4,0,.2,1);
          `;
          cell.appendChild(stateB);
        }

        // Chips de participantes (multi — abaixo da foto no hover)
        let selChips;
        if (isMulti && isSel && selectorNames?.length) {
          selChips = document.createElement('div');
          selChips.style.cssText = `
            position:absolute; bottom:0; left:0; right:0;
            background:linear-gradient(transparent, rgba(0,0,0,.7));
            color:white; padding:8px 6px 6px;
            display:flex; flex-wrap:wrap; gap:2px; justify-content:center;
            opacity:0; transition:opacity .18s; pointer-events:none;
          `;
          selChips.innerHTML = renderSelectorChips(selectorNames);
          cell.appendChild(selChips);
        }

        // Badge comentários
        let chatBadge;
        if (hasComments) {
          chatBadge = document.createElement('button');
          chatBadge.type = 'button';
          chatBadge.style.cssText = `
            position:absolute; bottom:6px; left:50%; transform:translateX(-50%);
            background:var(--green); color:white;
            padding:2px 8px; border:none; border-radius:999px;
            font-size:.5625rem; font-weight:700;
            cursor:pointer; display:flex; align-items:center; gap:3px;
            white-space:nowrap; opacity:0;
            transition:opacity .18s;
          `;
          chatBadge.innerHTML = `💬 ${photo.comments.length}`;
          chatBadge.title = 'Ver mensagens do cliente';
          chatBadge.onclick = (e) => { e.stopPropagation(); openCommentsModal(session._id, photo.id); };
          cell.appendChild(chatBadge);
        }

        // Overlay hover (ações individuais)
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position:absolute; inset:0;
          background:rgba(0,0,0,.45);
          opacity:0; transition:opacity .18s;
          display:flex; align-items:center; justify-content:center;
          gap:.5rem; z-index:5; pointer-events:none;
        `;

        const makeIconBtn = (title, iconName, bgColor) => {
          const btn = document.createElement('button');
          btn.type = 'button'; btn.title = title;
          btn.style.cssText = `
            background:${bgColor}; color:white; border:none; border-radius:9999px;
            width:2rem; height:2rem; cursor:pointer;
            display:flex; align-items:center; justify-content:center;
            transition:background .15s; pointer-events:auto;
          `;
          btn.innerHTML = icon(iconName, 16);
          return btn;
        };

        // Botão ocultar/mostrar
        const eyeBtn = makeIconBtn(
          isHidden ? 'Mostrar foto' : 'Ocultar foto',
          'olho',
          isHidden ? 'var(--red)' : 'rgba(255,255,255,.15)'
        );
        eyeBtn.onmouseenter = () => eyeBtn.style.background = isHidden ? 'color-mix(in srgb, var(--red) 80%, white)' : 'rgba(255,255,255,.35)';
        eyeBtn.onmouseleave = () => eyeBtn.style.background = isHidden ? 'var(--red)' : 'rgba(255,255,255,.15)';
        eyeBtn.onclick = (e) => { e.stopPropagation(); handleToggleHidden(photo, session, refresh); };
        overlay.appendChild(eyeBtn);

        // Botão definir capa
        const coverBtn = makeIconBtn(
          isCover ? 'Capa atual' : 'Definir como capa',
          'foto',
          isCover ? 'var(--yellow)' : 'rgba(255,255,255,.15)'
        );
        coverBtn.style.color = isCover ? 'black' : 'white';
        coverBtn.onmouseenter = () => coverBtn.style.background = isCover ? 'color-mix(in srgb, var(--yellow) 80%, white)' : 'rgba(255,255,255,.35)';
        coverBtn.onmouseleave = () => coverBtn.style.background = isCover ? 'var(--yellow)' : 'rgba(255,255,255,.15)';
        if (!isCover) coverBtn.onclick = (e) => { e.stopPropagation(); handleSetCover(photo, session, refresh); };
        overlay.appendChild(coverBtn);

        // Botão remover edição (reverter): quando tem editada, remove SÓ a versão editada e
        // devolve a foto crua à seleção (sem tirar a foto da galeria nem da escolha de ninguém).
        if (isEdited) {
          const delEditedBtn = makeIconBtn('Remover edição', 'reabrir', 'rgba(255,255,255,.15)');
          delEditedBtn.onmouseenter = () => delEditedBtn.style.background = 'var(--orange)';
          delEditedBtn.onmouseleave = () => delEditedBtn.style.background = 'rgba(255,255,255,.15)';
          delEditedBtn.onclick = async (e) => {
            e.stopPropagation();
            const ok = await window.showConfirm?.(
              `Remover a versão editada de "${photo.filename}"? A foto volta para a seleção aguardando nova edição — ninguém perde a escolha. Você pode subir a editada de novo.`,
              { confirmText: 'Remover edição', cancelText: 'Cancelar' }
            );
            if (!ok) return;
            try {
              await apiDelete(`/api/sessions/${session._id}/photos/${photo.id}/edited`);
              window.showToast?.('Edição removida. A foto voltou para a seleção.', 'success');
              await refresh();
            } catch (err) {
              window.showToast?.('Erro: ' + err.message, 'error');
            }
          };
          overlay.appendChild(delEditedBtn);
        }

        cell.appendChild(overlay);

        // ── Hover ──────────────────────────────────────────────────────────
        cell.addEventListener('mouseenter', () => {
          if (!isChecked) cell.style.boxShadow = `0 4px 16px color-mix(in srgb, ${borderColor} 25%, transparent)`;
          overlay.style.opacity = '1';
          cb.style.top = '6px'; cb.style.left = '6px';
          if (coverB)   { coverB.style.top = '6px';   coverB.style.right = '6px'; }
          if (stateB)   { stateB.style.opacity = '1'; stateB.style.bottom = '6px'; }
          if (selChips) selChips.style.opacity = '1';
          if (chatBadge) chatBadge.style.opacity = '1';
        });
        cell.addEventListener('mouseleave', () => {
          cell.style.boxShadow = '';
          overlay.style.opacity = '0';
          cb.style.top = '16px'; cb.style.left = '16px';
          if (coverB)   { coverB.style.top = '16px';   coverB.style.right = '16px'; }
          if (stateB)   { stateB.style.opacity = '0';  stateB.style.bottom = '16px'; }
          if (selChips) selChips.style.opacity = '0';
          if (chatBadge) chatBadge.style.opacity = '0';
        });

        // Clique abre lightbox
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

    // ── POLLING ──────────────────────────────────────────────────────────
    if (!selectionDone) {
      setupPolling(session, refresh);
    }

  } else {
    // Sem fotos ainda.
    // Modos de seleção têm dois caminhos para o mesmo objetivo (cliente escolher):
    // originais (edita depois) × já editadas (pula o re-upload). O 1º upload é a hora
    // de decidir — então mostramos cards que explicam o "e depois?" de cada caminho.
    const isSelectionFork = session.mode === 'selection' || session.mode === 'multi_selection';
    if (isSelectionFork) {
      wrap.appendChild(renderUploadChoiceCards(session, fileInputBrutas, fileInputEditedDirect));
    } else {
      wrap.appendChild(toolbar);
      const empty = document.createElement('div');
      empty.style.cssText = `
        border:2px dashed var(--border); border-radius:var(--r-card);
        padding:3rem 1.5rem; text-align:center;
        color:var(--text-muted); font-size:.875rem;
      `;
      empty.innerHTML = `
        <div style="display:flex;justify-content:center;align-items:center;margin-bottom:.75rem;color:var(--text-muted);">${icon('camera', 36)}</div>
        <div>Nenhuma foto ainda. Clique em <strong>"Subir fotos"</strong> acima para começar.</div>
      `;
      wrap.appendChild(empty);
    }
  }

  return wrap;
}
