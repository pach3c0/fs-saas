// unified-photo-grid.js — Grid único para os modos selection e multi_selection.
// Substitui os três grids separados (Upload / Acompanhar / Editadas) por uma única
// visualização inteligente onde cada card mostra seu estado via borda + badge no hover.
//
// Estados de cada card (prioridade top→bottom):
//   1. Editada ✓   — photo.urlOriginal existe          → borda --green
//   2. Selecionada  — photo.id ∈ seleção do cliente     → borda --yellow
//   3. Oculta       — photo.hidden === true              → borda --border, opacidade 0.4
//   4. Normal       — sem estado especial                → borda --border

import { apiGet, apiPut, apiDelete } from '../../../utils/api.js';
import { resolveImagePath, escapeHtml } from '../../../utils/helpers.js';
import { UploadQueue } from '../../../utils/upload.js';
import { UploadPanel } from '../../../components/upload-panel.js';
import { appState } from '../../../state.js';
import { icon } from '../../../utils/icons.js';
import { wizardState, stopWizardPolling } from './state.js';
import { openOverlayModal } from './utils.js';
// Modais/handlers reaproveitados dos step files (mesma lógica, um lugar só):
import { openSessionCourtesyModal } from './steps/5-edited.js';
import { openCourtesyModal } from './steps/6-deliver.js';
import { acceptExtraParticipant, rejectExtraParticipant } from './steps/4-tracking.js';

// ── Constantes de polling ──────────────────────────────────────────────────
const POLL_DEFAULT_MS  = 30_000;
const POLL_FAST_MS     = 10_000;
const FAST_WINDOW_MS   = 120_000;

// ── Upload Queue global (compartilhado com 1-upload.js) ────────────────────
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
    panel.onRetry  = (id) => window.globalUploadQueue.retry(id);
  }
  window.globalUploadQueue.onQueueDone = onDone;
  return window.globalUploadQueue;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function buildSnapshot(session) {
  return JSON.stringify({
    selected: (session.selectedPhotos || []).slice().sort(),
    status: session.selectionStatus,
    comments: (session.photos || []).map(p => `${p.id}:${p.comments?.length || 0}`).sort(),
    participants: (session.participants || []).map(p =>
      `${p._id}:${p.selectionStatus}:${(p.selectedPhotos || []).length}`).sort()
  });
}

// Em multi_selection: conjunto de photoIds selecionados pela união dos participantes.
function buildSelectedSet(session) {
  const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';
  if (isMulti) {
    const s = new Set();
    (session.participants || []).forEach(p => (p.selectedPhotos || []).forEach(id => s.add(id)));
    return s;
  }
  return new Set(session.selectedPhotos || []);
}

// Em multi_selection: mapeia photoId → primeiros nomes dos participantes que a selecionaram.
function buildPhotoSelectorsMap(session) {
  const map = new Map();
  (session.participants || []).forEach(p => {
    const firstName = String(p.name || '').split(' ')[0] || 'P';
    (p.selectedPhotos || []).forEach(id => {
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(firstName);
    });
  });
  return map;
}

function renderSelectorChips(names) {
  if (!names?.length) return '';
  const visible = names.slice(0, 3);
  const extra   = names.length - visible.length;
  let html = visible.map(n =>
    `<span style="background:var(--yellow);color:black;padding:1px 6px;border-radius:999px;font-size:0.5625rem;line-height:1.2;white-space:nowrap;">✓ ${escapeHtml(n)}</span>`
  ).join('');
  if (extra > 0) html += `<span style="background:var(--bg-elevated);color:var(--text-primary);padding:1px 6px;border-radius:999px;font-size:0.5625rem;line-height:1.2;">+${extra}</span>`;
  return html;
}

function allParticipantsSubmitted(session) {
  const ps = session.participants || [];
  if (!ps.length) return false;
  return ps.every(p => ['submitted', 'delivered'].includes(p.selectionStatus));
}

// ── Injeção de estilos (uma vez) ───────────────────────────────────────────
function ensureStyles() {
  if (document.getElementById('cz-unified-grid-styles')) return;
  const s = document.createElement('style');
  s.id = 'cz-unified-grid-styles';
  s.textContent = `
    /* Lightbox */
    #czUGLightbox {
      position:fixed; inset:0; z-index:9999;
      background:rgba(0,0,0,0.88);
      backdrop-filter:saturate(180%) blur(18px);
      -webkit-backdrop-filter:saturate(180%) blur(18px);
      display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:1rem;
      animation:czUGFadeIn .22s ease;
    }
    @keyframes czUGFadeIn { from{opacity:0} to{opacity:1} }
    #czUGLightbox img {
      max-width:90vw; max-height:78vh; object-fit:contain;
      border-radius:var(--r-field);
      box-shadow:0 32px 80px rgba(0,0,0,.7);
      animation:czUGImgIn .2s cubic-bezier(.4,0,.2,1);
    }
    @keyframes czUGImgIn { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
    .cz-ug-btn {
      box-sizing:border-box;
      display:inline-flex; align-items:center;
      height:44px; min-width:44px; padding:0;
      background:rgba(255,255,255,.08);
      border:1px solid rgba(255,255,255,.15); border-radius:9999px;
      color:white; cursor:pointer;
      overflow:hidden; white-space:nowrap;
      font-family:inherit; font-weight:500; font-size:.875rem;
      transition:background .2s, min-width .3s cubic-bezier(.4,0,.2,1), border-color .2s;
      backdrop-filter:blur(8px);
    }
    .cz-ug-btn:hover { background:rgba(255,255,255,.16); border-color:rgba(255,255,255,.35); }
    .cz-ug-btn .cz-ug-ic { width:44px; height:44px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .cz-ug-btn .cz-ug-lbl { max-width:0; opacity:0; overflow:hidden; transition:max-width .3s cubic-bezier(.4,0,.2,1), opacity .2s ease, padding-right .3s; }
    .cz-ug-btn:hover .cz-ug-lbl { max-width:10rem; opacity:1; padding-right:1rem; }
    .cz-ug-btn[disabled] { opacity:.3; cursor:not-allowed; }
    #czUGCounter { font-size:.75rem; color:rgba(255,255,255,.5); font-variant-numeric:tabular-nums; letter-spacing:.04em; }

    /* Pílula de upload da toolbar */
    .cz-ug-pill {
      box-sizing:border-box;
      display:inline-flex; align-items:center; gap:.5rem;
      height:36px; padding:0 1rem;
      border:1px solid var(--border); border-radius:9999px;
      cursor:pointer; font-weight:500; font-size:.8125rem;
      font-family:inherit; white-space:nowrap;
      transition:all .2s cubic-bezier(.4,0,.2,1);
      background:transparent; color:var(--text-primary);
    }
    .cz-ug-pill:not([disabled]):hover {
      background:color-mix(in srgb, var(--accent) 10%, var(--bg-surface));
      border-color:var(--accent); color:var(--accent);
      transform:translateY(-1px);
      box-shadow:0 4px 12px color-mix(in srgb, var(--accent) 15%, transparent);
    }
    .cz-ug-pill[disabled] { opacity:.45; cursor:not-allowed; }
    .cz-ug-pill.primary { background:var(--green); color:white; border-color:transparent; }
    .cz-ug-pill.primary:hover { filter:brightness(1.1); box-shadow:0 4px 14px color-mix(in srgb, var(--green) 30%, transparent); }

    /* Chip de filtro */
    .cz-ug-chip {
      padding:.2rem .55rem; border-radius:9999px;
      font-size:.75rem; font-weight:500; cursor:pointer;
      border:1px solid var(--border); background:transparent;
      color:var(--text-secondary); font-family:inherit;
      transition:background .15s, border-color .15s, color .15s;
    }
    .cz-ug-chip.active {
      background:color-mix(in srgb, var(--accent) 12%, transparent);
      border-color:color-mix(in srgb, var(--accent) 35%, transparent);
      color:var(--text-primary);
    }

    /* Bulk */
    .cz-ug-bulk {
      padding:.25rem .75rem; border-radius:9999px;
      font-size:.8125rem; font-weight:500; cursor:pointer;
      background:transparent; font-family:inherit;
      transition:border-color .15s, color .15s;
    }
    .cz-ug-bulk.danger { color:var(--red); border:1px solid var(--red); }
    .cz-ug-bulk.neutral { color:var(--text-primary); border:1px solid var(--border); }
  `;
  document.head.appendChild(s);
}

// ── Componente principal ───────────────────────────────────────────────────
export function renderUnifiedPhotoGrid({ session, refresh }) {
  ensureStyles();
  stopWizardPolling();

  const isMulti   = session.mode === 'multi_selection' || session.mode === 'multi_instant';
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

  // Botão Subir Brutas
  const btnBrutas = document.createElement('button');
  btnBrutas.type = 'button';
  btnBrutas.className = 'cz-ug-pill primary';
  btnBrutas.innerHTML = `<span style="display:flex;align-items:center;">${icon('upload', 14)}</span><span>Subir fotos</span>`;
  btnBrutas.onclick = () => fileInputBrutas.click();
  toolbar.appendChild(btnBrutas);

  // Botão Subir Editadas
  const btnEdited = document.createElement('button');
  btnEdited.type = 'button';
  btnEdited.className = 'cz-ug-pill';
  btnEdited.style.cssText += 'border-color:color-mix(in srgb, var(--yellow) 40%, transparent); color:var(--text-primary);';
  btnEdited.innerHTML = `<span style="display:flex;align-items:center;">${icon('upload', 14)}</span><span>Subir editadas</span>`;
  btnEdited.onclick = () => fileInputEdited.click();
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
        Object.values(chips).forEach(c => c.classList.remove('active'));
        Object.values(pChips).forEach(c => c.classList.remove('active'));
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
          hidden: 'Nenhuma foto oculta.'
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
    // Sem fotos ainda
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

  return wrap;
}

// ── Stats Panel ────────────────────────────────────────────────────────────
function renderStatsPanel(session, isMulti, selectionDone, countSelected, countEdited, refresh) {
  const panel = document.createElement('div');
  panel.style.cssText = `
    background:var(--bg-surface); border:1px solid var(--border);
    border-radius:var(--r-card); overflow:hidden;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    padding:.5rem .875rem;
    display:flex; align-items:center; justify-content:space-between; gap:.75rem;
    border-bottom:1px solid var(--border); cursor:pointer; user-select:none;
  `;

  const titleEl = document.createElement('span');
  titleEl.style.cssText = 'font-size:.75rem; font-weight:600; color:var(--text-secondary); letter-spacing:.05em; text-transform:uppercase;';
  titleEl.textContent = isMulti ? 'Progresso dos Participantes' : 'Status da Seleção';
  header.appendChild(titleEl);

  const toggleIcon = document.createElement('span');
  toggleIcon.style.cssText = 'color:var(--text-muted); display:flex; align-items:center; transition:transform .2s;';
  toggleIcon.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
  header.appendChild(toggleIcon);

  const body = document.createElement('div');
  body.style.cssText = 'padding:.625rem .875rem;';

  let collapsed = false;
  header.onclick = () => {
    collapsed = !collapsed;
    body.style.display = collapsed ? 'none' : 'block';
    toggleIcon.style.transform = collapsed ? 'rotate(180deg)' : '';
  };

  // Conteúdo do body
  if (isMulti) {
    body.appendChild(renderParticipantsTable(session, refresh));
  } else {
    body.appendChild(renderSingleStats(session, selectionDone, countSelected, countEdited, refresh));
  }

  panel.appendChild(header);
  panel.appendChild(body);
  return panel;
}

function renderSingleStats(session, selectionDone, countSelected, countEdited, refresh) {
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:.5rem;';

  const photos = session.photos || [];
  const totalComments = photos.reduce((acc, p) => acc + (p.comments?.length || 0), 0);
  const isSubmitted = ['submitted', 'delivered'].includes(session.selectionStatus);

  const statCard = (label, value, color = 'var(--text-primary)') => {
    const c = document.createElement('div');
    c.style.cssText = 'background:var(--bg-base); border:1px solid var(--border); border-radius:var(--r-card); padding:.5rem .75rem;';
    c.innerHTML = `
      <div style="font-size:.625rem; font-weight:600; letter-spacing:.05em; color:var(--text-muted); text-transform:uppercase; margin-bottom:.125rem;">${label}</div>
      <div style="font-size:1.0625rem; font-weight:600; color:${color};">${value}</div>
    `;
    return c;
  };

  grid.appendChild(statCard('Selecionadas', String(countSelected), 'var(--accent)'));
  grid.appendChild(statCard('Editadas', String(countEdited), countEdited === countSelected && countSelected > 0 ? 'var(--green)' : 'var(--text-primary)'));
  grid.appendChild(statCard('Mensagens', String(totalComments), totalComments > 0 ? 'var(--green)' : 'var(--text-muted)'));

  const statusHtml = isSubmitted
    ? `<span style="display:inline-flex;align-items:center;gap:.25rem;">${icon('checkCircle', 14)} Finalizada</span>`
    : `<span style="display:inline-flex;align-items:center;gap:.25rem;">${icon('relogio', 14)} Aguardando</span>`;
  grid.appendChild(statCard('Status', statusHtml, isSubmitted ? 'var(--green)' : 'var(--yellow)'));

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:.5rem;';
  wrap.appendChild(grid);

  // Fotos extras solicitadas pelo cliente — aceitar/recusar (nível-sessão).
  if (session.extraRequest?.status === 'pending') {
    const extraCount = session.extraRequest.photos?.length || 0;
    const extraRow = document.createElement('div');
    extraRow.style.cssText = `
      display:flex; align-items:center; gap:.5rem; flex-wrap:wrap;
      background:color-mix(in srgb, var(--yellow) 8%, transparent);
      border:1px solid color-mix(in srgb, var(--yellow) 30%, transparent);
      border-radius:var(--r-card); padding:.5rem .75rem;
    `;
    const label = document.createElement('span');
    label.style.cssText = 'font-size:.8125rem; color:var(--text-primary); font-weight:600; flex:1; min-width:140px;';
    label.textContent = `📸 Cliente pediu ${extraCount} foto(s) extra(s)`;
    extraRow.appendChild(label);

    const acceptBtn = makeExtraActionBtn(`${icon('checkCircle', 13)} Aceitar`, 'var(--green)');
    acceptBtn.title = `Aceitar ${extraCount} foto(s) extra(s) e adicionar à seleção`;
    acceptBtn.onclick = () => handleAcceptExtra(session, refresh);
    extraRow.appendChild(acceptBtn);

    const rejectBtn = makeExtraActionBtn(`${icon('x', 13)} Recusar`, 'var(--red)');
    rejectBtn.title = 'Recusar o pedido de fotos extras';
    rejectBtn.onclick = () => handleRejectExtra(session, refresh);
    extraRow.appendChild(rejectBtn);

    wrap.appendChild(extraRow);
  }

  // Botão reabrir (quando já submetido)
  if (session.selectionStatus === 'submitted') {
    const reopenBtn = document.createElement('button');
    reopenBtn.type = 'button';
    reopenBtn.className = 'cz-ug-pill';
    reopenBtn.style.cssText += 'border-color:var(--orange); color:var(--orange); align-self:flex-start;';
    reopenBtn.innerHTML = `<span style="display:flex;align-items:center;">${icon('reabrir', 14)}</span><span>Reabrir seleção</span>`;
    reopenBtn.onclick = async () => {
      const ok = await window.showConfirm?.('Reabrir a seleção? O cliente poderá alterar as fotos.', { confirmText: 'Reabrir', cancelText: 'Cancelar' });
      if (!ok) return;
      try {
        await apiPut(`/api/sessions/${session._id}/reopen`, {});
        window.showToast?.('Seleção reaberta.', 'success');
        await refresh();
      } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
    };
    wrap.appendChild(reopenBtn);
  }

  return wrap;
}

// Botão de ação para pedidos de fotos extras (cor persistente, sem reset no hover).
function makeExtraActionBtn(labelHtml, color) {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = labelHtml;
  b.style.cssText = `
    display:inline-flex; align-items:center; gap:.25rem;
    background:color-mix(in srgb, ${color} 8%, transparent); color:${color};
    border:1px solid ${color}; border-radius:var(--r-field);
    padding:.25rem .625rem; cursor:pointer; font-size:.6875rem; font-weight:600;
  `;
  return b;
}

// Aceita as fotos extras solicitadas pelo cliente (seleção individual, nível-sessão).
async function handleAcceptExtra(session, refresh) {
  const count = session.extraRequest?.photos?.length || 0;
  const ok = await window.showConfirm?.(
    `Aceitar ${count} foto(s) extra(s) solicitada(s)? Elas serão adicionadas à seleção do cliente.`,
    { confirmText: 'Aceitar', cancelText: 'Cancelar' }
  );
  if (!ok) return;
  try {
    await apiPut(`/api/sessions/${session._id}/extra-request/accept`, {});
    window.showToast?.('Extras aceitas e adicionadas à seleção!', 'success');
    await refresh();
  } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
}

// Recusa as fotos extras (nível-sessão). Modal com motivo obrigatório — vai no e-mail ao cliente.
function handleRejectExtra(session, refresh) {
  document.getElementById('ugRejectExtraModal')?.remove();
  const modalHtml = `
    <div id="ugRejectExtraModal" style="position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.75);">
      <div style="background:var(--bg-elevated); padding:1.5rem; border-radius:var(--r-card); width:100%; max-width:400px; border:1px solid var(--border); box-shadow:0 10px 15px -3px rgba(0,0,0,0.5);">
        <h3 style="color:var(--text-primary); font-size:1.125rem; font-weight:600; margin-bottom:1rem;">Recusar Fotos Extras</h3>
        <p style="color:var(--text-secondary); font-size:0.875rem; margin-bottom:0.5rem;">Informe ao cliente o motivo da recusa (obrigatório):</p>
        <textarea id="ugRejectReasonInput" rows="3" style="width:100%; padding:0.5rem; background:var(--bg-base); border:1px solid var(--border); color:var(--text-primary); border-radius:var(--r-field); margin-bottom:1rem; font-family:inherit; resize:none;" placeholder="Ex: O pacote escolhido não permite extras, ou o pagamento não foi confirmado..."></textarea>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
          <button id="ugCancelRejectBtn" style="padding:0.5rem 1rem; background:transparent; border:1px solid var(--border); color:var(--text-secondary); border-radius:var(--r-field); cursor:pointer;">Cancelar</button>
          <button id="ugConfirmRejectBtn" style="padding:0.5rem 1rem; background:var(--red); border:none; color:white; border-radius:var(--r-field); cursor:pointer; font-weight:600;">Recusar Pedido</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = document.getElementById('ugRejectExtraModal');
  document.getElementById('ugCancelRejectBtn').onclick = () => modal.remove();
  document.getElementById('ugConfirmRejectBtn').onclick = async () => {
    const reason = document.getElementById('ugRejectReasonInput').value.trim();
    if (!reason) {
      window.showToast?.('Por favor, informe um motivo para o cliente.', 'warning');
      return;
    }
    const btn = document.getElementById('ugConfirmRejectBtn');
    btn.textContent = 'Aguarde...';
    btn.disabled = true;
    try {
      await apiPut(`/api/sessions/${session._id}/extra-request/reject`, { reason });
      modal.remove();
      window.showToast?.('Solicitação recusada e cliente notificado.', 'success');
      await refresh();
    } catch (e) {
      btn.textContent = 'Recusar Pedido';
      btn.disabled = false;
      window.showToast?.('Erro ao recusar: ' + e.message, 'error');
    }
  };
}

function renderParticipantsTable(session, refresh) {
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
      const base = window.location.origin;
      await navigator.clipboard.writeText(`${base}/cliente/?code=${p.accessCode}`);
      window.showToast?.(`Link de ${p.name} copiado`, 'success');
    };
    shareActions.appendChild(linkBtn);

    const waBtn = miniShareBtn(`${icon('whatsapp', 13)} WhatsApp`);
    waBtn.title = `Enviar WhatsApp para ${p.name}`;
    waBtn.onclick = () => {
      const phone   = String(p.phone || '').replace(/\D/g, '');
      const base    = window.location.origin;
      const gallUrl = `${base}/cliente/?code=${p.accessCode}`;
      const orgName = appState.appData?.organization?.name || 'CliqueZoom';
      const msg = status === 'delivered' 
        ? `Olá, ${p.name}! 📸\n\nSuas fotos finais já estão disponíveis para download na ${orgName}!\n\nAcesse: ${gallUrl}\nOu use o código: *${p.accessCode}*`
        : `Olá, ${p.name}! 📸\n\nSuas fotos estão prontas para seleção na ${orgName}.\n\nAcesse: ${gallUrl}\nOu use o código: *${p.accessCode}*`;
      const waUrl = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
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
      const base = window.location.origin;
      const url = `${base}/cliente/?code=${p.accessCode}&_ap=${encodeURIComponent(appState.authToken || '')}`;
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

// ── Handlers de upload ─────────────────────────────────────────────────────
function handleUploadBrutas(e, session, refresh) {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  const queue = getOrCreateQueue(async () => {
    window.showToast?.('Uploads finalizados!', 'success');
    await refresh();
  });
  queue.add(files, `/api/sessions/${session._id}/photos`);
  e.target.value = '';
}

async function handleUploadEdited(e, session, refresh, selectedIds) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  const photos = session.photos || [];
  const unmatched   = [];
  const notSelected = [];

  files.forEach(f => {
    const match = photos.find(p => p.filename === f.name);
    if (!match) unmatched.push(f.name);
    else if (!selectedIds.includes(match.id)) notSelected.push(f.name);
  });

  const allowUnmatched = unmatched.length > 0;

  const proceed = () => {
    const queue = getOrCreateQueue(async () => {
      window.showToast?.('Editadas enviadas!', 'success');
      await refresh();
    });
    queue.add(files, `/api/sessions/${session._id}/photos/upload-edited?allowUnmatched=${allowUnmatched}`);
    e.target.value = '';
  };

  if (unmatched.length || notSelected.length) {
    const msgs = [
      unmatched.length   ? `${unmatched.length} arquivo(s) sem correspondente na galeria` : '',
      notSelected.length ? `${notSelected.length} arquivo(s) não foram selecionado(s) pelo cliente` : ''
    ].filter(Boolean).join(' · ');
    const ok = await window.showConfirm?.(`Atenção: ${msgs}. Continuar mesmo assim?`, { confirmText: 'Sim, continuar', cancelText: 'Cancelar' });
    if (ok) proceed();
    else e.target.value = '';
  } else {
    proceed();
  }
}

// ── Handler entregar ───────────────────────────────────────────────────────
async function handleDeliver(session, refresh, delivered, selected, isDelivered, isPartial) {
  const { showDeliveryModal } = await import('./steps/2-share.js');
  const { buildWhatsAppDeliveryLink } = await import('./utils.js');

  if (isPartial && !isDelivered) {
    const pendingCount = selected.length - delivered.length;
    const ok = await window.showConfirm?.(
      `Você está entregando ${delivered.length} de ${selected.length} fotos selecionadas. ` +
      `As ${pendingCount} restantes continuam pendentes e você pode entregá-las depois. Continuar?`,
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
        session, accessCode: session.accessCode,
        recipientName: session.clientName || session.name,
        recipientPhone: session.clientPhone,
        orgName, customText: payload.whatsappText
      });
      window.open(url, '_blank');
    }
    await refresh();
  } catch (err) {
    window.showToast?.('Erro: ' + err.message, 'error');
  }
}

// ── Ações individuais ──────────────────────────────────────────────────────
async function handleToggleHidden(photo, session, refresh) {
  try {
    await apiPut(`/api/sessions/${session._id}/photos/${photo.id}/toggle-hidden`);
    await refresh();
  } catch (err) {
    window.showToast?.(err.message || 'Erro ao ocultar foto', 'error');
  }
}

async function handleSetCover(photo, session, refresh) {
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

function openCommentsModal(sessionId, photoId) {
  if (window.openComments) {
    window.openComments(sessionId, photoId);
  } else {
    window.showToast?.('Módulo de comentários não disponível.', 'warning');
  }
}

// ── Bulk actions ───────────────────────────────────────────────────────────
async function handleBulkToggleHidden(hidden, session, selectedIds, refresh, btn) {
  const ids = Array.from(selectedIds);
  if (!ids.length) return;
  const ok = await window.showConfirm?.(
    `${hidden ? 'Ocultar' : 'Mostrar'} ${ids.length} foto${ids.length !== 1 ? 's' : ''}?`,
    { confirmText: hidden ? 'Ocultar' : 'Mostrar', cancelText: 'Cancelar' }
  );
  if (!ok) return;
  btn.disabled = true;
  btn.textContent = hidden ? 'Ocultando...' : 'Mostrando...';
  try {
    await apiPut(`/api/sessions/${session._id}/photos/bulk-hidden`, { photoIds: ids, hidden });
    const n = ids.length;
    window.showToast?.(`${n} foto${n !== 1 ? 's' : ''} ${hidden ? 'ocultada' : 'mostrada'}${n !== 1 ? 's' : ''}!`, 'success');
    selectedIds.clear();
    await refresh();
  } catch (err) {
    window.showToast?.(err.message || 'Erro', 'error');
    btn.disabled = false;
    btn.textContent = hidden ? 'Ocultar' : 'Mostrar';
  }
}

async function handleBulkDelete(session, selectedIds, refresh, btn) {
  const ids = Array.from(selectedIds);
  if (!ids.length) return;
  const ok = await window.showConfirm?.(
    `Deletar permanentemente ${ids.length} foto${ids.length !== 1 ? 's' : ''}? Esta ação não pode ser desfeita.`,
    { confirmText: 'Deletar', cancelText: 'Cancelar' }
  );
  if (!ok) return;
  btn.disabled = true;
  btn.textContent = 'Deletando...';
  try {
    await apiDelete(`/api/sessions/${session._id}/photos/bulk`, { photoIds: ids });
    const n = ids.length;
    window.showToast?.(`${n} foto${n !== 1 ? 's' : ''} deletada${n !== 1 ? 's' : ''}!`, 'success');
    selectedIds.clear();
    await refresh();
  } catch (err) {
    window.showToast?.(err.message || 'Erro ao deletar', 'error');
    btn.disabled = false;
    btn.textContent = 'Deletar';
  }
}

// ── Bulk button helper ─────────────────────────────────────────────────────
function makeBulkBtn(text, isDanger) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = text;
  btn.className = isDanger ? 'cz-ug-bulk danger' : 'cz-ug-bulk neutral';
  return btn;
}

// ── Polling adaptativo ─────────────────────────────────────────────────────
function setupPolling(session, refresh) {
  const tick = async () => {
    if (document.visibilityState === 'hidden') {
      wizardState.pollingTimer = null;
      return;
    }
    try {
      const data = await apiGet(`/api/sessions/${session._id}`);
      const fresh = data.session || data;
      const newSnap = buildSnapshot(fresh);
      const oldSnap = wizardState.lastSelectionSnapshot;
      if (oldSnap && oldSnap !== newSnap) {
        wizardState.lastSelectionSnapshot = newSnap;
        wizardState.pollingLastChangeAt = Date.now();
        window.showToast?.('Seleção atualizada pelo cliente', 'info');
        await refresh();
        return;
      }
      if (!oldSnap) wizardState.lastSelectionSnapshot = newSnap;
    } catch (err) {
      // silencioso — sem toast de erro de polling
    }
    const sinceChange = Date.now() - (wizardState.pollingLastChangeAt || 0);
    const interval    = sinceChange < FAST_WINDOW_MS ? POLL_FAST_MS : POLL_DEFAULT_MS;
    wizardState.pollingTimer = setTimeout(tick, interval);
  };

  if (!wizardState.lastSelectionSnapshot) {
    wizardState.lastSelectionSnapshot = buildSnapshot(session);
  }
  wizardState.pollingTimer = setTimeout(tick, POLL_DEFAULT_MS);

  wizardState.pollingVisibilityHandler = () => {
    if (document.visibilityState === 'visible' && !wizardState.pollingTimer) tick();
  };
  document.addEventListener('visibilitychange', wizardState.pollingVisibilityHandler);
}

// ── Lightbox ───────────────────────────────────────────────────────────────
function openLightbox(photos, startIndex) {
  if (!document.getElementById('cz-ug-lb-styles')) {
    const s = document.createElement('style');
    s.id = 'cz-ug-lb-styles';
    s.textContent = `
      #czUGLbCounter { font-size:.75rem; color:rgba(255,255,255,.5); font-variant-numeric:tabular-nums; letter-spacing:.04em; }
    `;
    document.head.appendChild(s);
  }

  document.getElementById('czUGLightbox')?.remove();
  let current = startIndex;

  const lb = document.createElement('div');
  lb.id = 'czUGLightbox';

  const lbIcon = (paths, size = 20) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0">${paths}</svg>`;

  const IC_X    = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
  const IC_PREV = '<polyline points="15 18 9 12 15 6"/>';
  const IC_NEXT = '<polyline points="9 18 15 12 9 6"/>';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'cz-ug-btn';
  closeBtn.innerHTML = `<span class="cz-ug-ic">${lbIcon(IC_X, 20)}</span><span class="cz-ug-lbl">Fechar</span>`;
  closeBtn.onclick = () => lb.remove();

  const imgEl = document.createElement('img');
  imgEl.alt = '';

  const counter = document.createElement('div');
  counter.id = 'czUGLbCounter';

  const navRow = document.createElement('div');
  navRow.style.cssText = 'display:flex; align-items:center; gap:1.5rem;';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'cz-ug-btn';
  prevBtn.innerHTML = `<span class="cz-ug-ic">${lbIcon(IC_PREV, 22)}</span><span class="cz-ug-lbl">Anterior</span>`;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'cz-ug-btn';
  nextBtn.innerHTML = `
    <span class="cz-ug-lbl" style="max-width:0;opacity:0;padding-left:1rem;padding-right:0;transition:max-width .3s cubic-bezier(.4,0,.2,1),opacity .2s ease,padding-left .3s;">Próxima</span>
    <span class="cz-ug-ic">${lbIcon(IC_NEXT, 22)}</span>
  `;
  nextBtn.addEventListener('mouseenter', () => {
    const lbl = nextBtn.querySelector('span:first-child');
    lbl.style.maxWidth = '10rem'; lbl.style.opacity = '1'; lbl.style.paddingLeft = '1rem';
  });
  nextBtn.addEventListener('mouseleave', () => {
    const lbl = nextBtn.querySelector('span:first-child');
    lbl.style.maxWidth = '0'; lbl.style.opacity = '0'; lbl.style.paddingLeft = '0';
  });

  function goTo(idx) {
    current = Math.max(0, Math.min(photos.length - 1, idx));
    const photo = photos[current];
    imgEl.src = resolveImagePath(photo.url);
    imgEl.alt = photo.filename || `Foto ${current + 1}`;
    counter.textContent = `${current + 1} / ${photos.length}`;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === photos.length - 1;
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

  lb.addEventListener('click', (e) => { if (e.target === lb) lb.remove(); });

  const onKey = (e) => {
    if (!document.getElementById('czUGLightbox')) { document.removeEventListener('keydown', onKey); return; }
    if (e.key === 'Escape')     lb.remove();
    if (e.key === 'ArrowLeft')  goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  };
  document.addEventListener('keydown', onKey);

  document.body.appendChild(lb);
  goTo(current);
  closeBtn.focus();
}
