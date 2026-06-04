// Stepper vertical lateral do wizard.
// Computa estado de cada passo (done/locked/active) baseado na sessão.

const STEP_DEFS = {
  1: { label: 'Upload', desc: 'Suba as fotos brutas' },
  2: { label: 'Compartilhar', desc: 'Código e envio ao cliente' },
  4: { label: 'Acompanhar', desc: 'Monitore a seleção' },
  5: { label: 'Editadas', desc: 'Suba as fotos finais' },
  6: { label: 'Entregar', desc: 'Libere o download' }
};

// Galeria escolheu "Entregar direto" (pula o passo Compartilhar).
export function galleryDirect(session) {
  return session?.mode === 'gallery' && session?.galleryDeliveryMode === 'direct';
}

// Define a ordem dos passos por modo da sessão.
// Galeria: pula seleção (4) e editadas (5) — fluxo direto Upload → Compartilhar → Entregar.
//   Se o fotógrafo escolheu "Entregar direto" (opts.galleryDirect), pula também o Compartilhar (2).
// Multi-Seleção / Seleção: fluxo completo, sem passo dedicado a "ver código".
export function stepIdsForMode(mode, opts = {}) {
  if (mode === 'gallery') return opts.galleryDirect ? [1, 6] : [1, 2, 6];
  return [1, 2, 4, 5, 6];
}

// Retorna o próximo passo aplicável após currentId, ou null se for o último.
export function nextStepIdAfter(mode, currentId, opts = {}) {
  const ids = stepIdsForMode(mode, opts);
  const idx = ids.indexOf(currentId);
  if (idx === -1 || idx === ids.length - 1) return null;
  return ids[idx + 1];
}

// Verifica se TODAS as fotos selecionadas (sessão ou união dos participantes) já têm versão editada.
function hasAllEditedPhotos(session) {
  const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';
  let selected;
  if (isMulti) {
    const set = new Set();
    (session.participants || []).forEach(p => (p.selectedPhotos || []).forEach(id => set.add(id)));
    selected = Array.from(set);
  } else {
    selected = session.selectedPhotos || [];
  }
  if (!selected.length) return false;
  const photoById = new Map((session.photos || []).map(p => [p.id, p]));
  return selected.every(id => Boolean(photoById.get(id)?.urlOriginal));
}

// Computa estado de cada passo para a sessão.
// Retorna array ordenado: [{ id, label, desc, done, locked, current }]
export function computeWizardSteps(session, currentStepId) {
  const ids = stepIdsForMode(session.mode, { galleryDirect: galleryDirect(session) });
  const photosCount = session.photos?.length || 0;
  const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';
  const isSubmitted = ['submitted', 'delivered'].includes(session.selectionStatus);

  // Multi: "concluído" é avaliado em termos de participantes (cada um tem seu fluxo).
  const participants = session.participants || [];
  const allParticipantsSubmitted = isMulti && participants.length > 0
    && participants.every(p => ['submitted', 'delivered'].includes(p.selectionStatus));
  const allParticipantsDelivered = isMulti && participants.length > 0
    && participants.every(p => p.selectionStatus === 'delivered');

  const doneById = {
    1: Boolean(session.uploadsCompletedAt) || (photosCount > 0 && Boolean(session.codeSentAt)),
    // Step 2 (Compartilhar): em multi, basta ter pelo menos 1 participante (cada um recebe seu código avulso).
    // Em selection/gallery, basta ter enviado o código (e-mail ou WhatsApp).
    2: isMulti ? participants.length > 0 : Boolean(session.codeSentAt),
    // Step 4: em multi, todos os participantes precisam ter enviado.
    4: isMulti ? allParticipantsSubmitted : (Boolean(session.selectionSubmittedAt) || isSubmitted),
    5: hasAllEditedPhotos(session),
    // Step 6: em multi, todos os participantes precisam ter sido entregues.
    6: isMulti ? allParticipantsDelivered : (Boolean(session.deliveredAt) || session.selectionStatus === 'delivered')
  };

  return ids.map((id, idx) => {
    const prevId = idx === 0 ? null : ids[idx - 1];
    const prevDone = prevId === null ? true : doneById[prevId];
    return {
      id,
      label: STEP_DEFS[id].label,
      desc: STEP_DEFS[id].desc,
      done: doneById[id],
      locked: !prevDone && !doneById[id],
      current: id === currentStepId
    };
  });
}

// Renderiza a sidebar vertical com os passos.
// onStepClick: (stepId) => void — só chamado se o passo não estiver locked.
export function renderStepper(steps, onStepClick) {
  const sidebar = document.createElement('div');
  sidebar.style.cssText = `
    width: 240px; flex-shrink: 0;
    background: var(--bg-surface);
    border-right: 1px solid var(--border);
    padding: 1.25rem 0.75rem;
    overflow-y: auto;
    display: flex; flex-direction: column; gap: 0.25rem;
  `;

  const title = document.createElement('div');
  title.textContent = 'ETAPAS';
  title.style.cssText = `
    font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.1em;
    color: var(--text-muted); padding: 0 0.75rem 0.75rem; text-transform: uppercase;
  `;
  sidebar.appendChild(title);

  steps.forEach((step, idx) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.disabled = step.locked;
    item.dataset.stepId = step.id;

    const isDone = step.done;
    const isCurrent = step.current;
    const isLocked = step.locked;

    // Cores conforme estado
    let bg = 'transparent';
    let border = '1px solid transparent';
    let textColor = 'var(--text-primary)';
    let circleBg = 'var(--bg-base)';
    let circleColor = 'var(--text-muted)';
    let circleBorder = '1px solid var(--border)';

    if (isLocked) {
      textColor = 'var(--text-muted)';
      circleColor = 'var(--text-muted)';
    }
    if (isDone) {
      circleBg = 'var(--green)';
      circleColor = 'white';
      circleBorder = 'none';
    }
    if (isCurrent) {
      bg = 'color-mix(in srgb, var(--accent) 12%, transparent)';
      border = '1px solid color-mix(in srgb, var(--accent) 30%, transparent)';
      if (!isDone) {
        circleBg = 'var(--accent)';
        circleColor = 'white';
        circleBorder = 'none';
      }
    }

    item.style.cssText = `
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.625rem 0.75rem; border-radius: 0.5rem;
      background: ${bg}; border: ${border};
      cursor: ${isLocked ? 'not-allowed' : 'pointer'};
      transition: background 0.15s;
      text-align: left; width: 100%; font: inherit;
    `;

    // Hover só se desbloqueado e não atual
    if (!isLocked && !isCurrent) {
      item.onmouseenter = () => { item.style.background = 'var(--bg-hover)'; };
      item.onmouseleave = () => { item.style.background = bg; };
    }

    // Círculo (número, check ou cadeado)
    const circle = document.createElement('div');
    circle.style.cssText = `
      width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      background: ${circleBg}; color: ${circleColor}; border: ${circleBorder};
      font-size: 0.75rem; font-weight: 600;
      ${isCurrent && !isDone ? 'animation: wizardPulse 2s ease-in-out infinite;' : ''}
    `;
    if (isDone) circle.textContent = '✓';
    else if (isLocked) circle.textContent = '🔒';
    else circle.textContent = String(idx + 1);

    // Texto (label + descrição)
    const textWrap = document.createElement('div');
    textWrap.style.cssText = 'display:flex; flex-direction:column; gap:0.125rem; min-width:0;';
    const label = document.createElement('div');
    label.textContent = step.label;
    label.style.cssText = `font-size: 0.875rem; font-weight: 500; color: ${textColor};`;
    const desc = document.createElement('div');
    desc.textContent = step.desc;
    desc.style.cssText = `font-size: 0.6875rem; color: var(--text-muted); line-height: 1.3;`;
    textWrap.appendChild(label);
    textWrap.appendChild(desc);

    item.appendChild(circle);
    item.appendChild(textWrap);

    if (isLocked) {
      item.title = 'Conclua o passo anterior para liberar';
    } else {
      item.onclick = () => onStepClick(step.id);
    }

    sidebar.appendChild(item);
  });

  // Linha de progresso conectando os passos (visual sutil)
  const footer = document.createElement('div');
  footer.style.cssText = 'margin-top:auto; padding:0.75rem; font-size:0.6875rem; color:var(--text-muted); text-align:center;';
  const doneCount = steps.filter(s => s.done).length;
  footer.textContent = `${doneCount} de ${steps.length} concluído(s)`;
  sidebar.appendChild(footer);

  return sidebar;
}

// Injeta keyframes uma única vez no head (pulso do passo ativo).
export function injectWizardStyles() {
  if (document.getElementById('wizard-styles')) return;
  const style = document.createElement('style');
  style.id = 'wizard-styles';
  style.textContent = `
    @keyframes wizardPulse {
      0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 50%, transparent); }
      50%      { box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 0%, transparent); }
    }
    @keyframes wizardChatPulse {
      0%, 100% { box-shadow: 0 0 0 2px var(--green); }
      50%      { box-shadow: 0 0 0 4px color-mix(in srgb, var(--green) 40%, transparent); }
    }
  `;
  document.head.appendChild(style);
}
