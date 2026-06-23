// Wrapper visual de etapa para os single-pages (Upload / Compartilhar / Acompanhar / Editadas).
// Em vez de um título minúsculo com linha fina (que "some" ao rolar), cada etapa vira um CARD
// com cabeçalho de estado: círculo numerado que vira ✓ verde (concluído), fica no accent
// (etapa atual) ou cadeado (travada), realce no card atual e pílula de status à direita.
//
// Fala a MESMA língua do stepper do topo: reaproveita computeWizardSteps() (done/current/locked),
// então o que aparece aqui embaixo bate com o que aparece lá em cima. É puramente apresentação —
// não toca em renderer de passo nem em lógica de dados.

import { icon } from '../../../utils/icons.js';
import { computeWizardSteps } from './stepper.js';

// Calcula o estado das etapas para o contexto single-page.
// computeWizardSteps marca "current" comparando com um currentStepId; aqui não há navegação,
// então a etapa atual é a PRIMEIRA acionável (não concluída e não travada) — a "próxima a fazer".
export function computeSinglePageSteps(session) {
  const base = computeWizardSteps(session, null);
  const next = base.find(s => !s.done && !s.locked);
  if (next) next.current = true;
  return base;
}

// stepState: { done, current, locked } — vindo de computeSinglePageSteps (ou null = card neutro).
// displayNumber: número exibido no círculo (posição visual 1..N, não o id interno do passo).
// title: texto do cabeçalho.
// content: HTMLElement já renderizado do passo (pode ser null).
export function renderStepSection({ stepState, displayNumber, title, content }) {
  const done = Boolean(stepState?.done);
  const current = Boolean(stepState?.current);
  const locked = Boolean(stepState?.locked);

  const section = document.createElement('section');

  let borderColor = 'var(--border)';
  let bg = 'var(--bg-surface)';
  if (current) {
    borderColor = 'color-mix(in srgb, var(--accent) 38%, transparent)';
    bg = 'color-mix(in srgb, var(--accent) 4%, var(--bg-surface))';
  }
  section.style.cssText = `
    display:flex; flex-direction:column; gap:1rem;
    background:${bg}; border:1px solid ${borderColor};
    border-radius:var(--r-card); padding:1.25rem 1.5rem;
    ${current ? 'box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);' : ''}
    opacity:${locked ? '0.72' : '1'};
    transition:border-color .15s, box-shadow .15s, opacity .15s;
  `;

  // Cabeçalho: círculo de estado + título + pílula de status.
  const header = document.createElement('div');
  header.style.cssText = 'display:flex; align-items:center; gap:0.75rem;';

  const circle = document.createElement('div');
  let circleBg = 'var(--bg-base)', circleColor = 'var(--text-muted)', circleBorder = '1px solid var(--border)';
  if (done) { circleBg = 'var(--green)'; circleColor = 'white'; circleBorder = 'none'; }
  else if (current) { circleBg = 'var(--accent)'; circleColor = 'var(--accent-on)'; circleBorder = 'none'; }
  circle.style.cssText = `
    width:30px; height:30px; border-radius:50%; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    background:${circleBg}; color:${circleColor}; border:${circleBorder};
    font-size:0.875rem; font-weight:700;
  `;
  if (done) circle.textContent = '✓';
  else if (locked) circle.innerHTML = icon('cadeado', 15);
  else circle.textContent = String(displayNumber);
  header.appendChild(circle);

  const titleEl = document.createElement('h3');
  titleEl.textContent = title;
  titleEl.style.cssText = 'flex:1; margin:0; font-size:0.9375rem; font-weight:650; color:var(--text-primary);';
  header.appendChild(titleEl);

  if (stepState) {
    let pillText = '', pillColor = '';
    if (done) { pillText = 'Concluído'; pillColor = 'var(--green)'; }
    else if (current) { pillText = 'Em andamento'; pillColor = 'var(--accent)'; }
    else if (locked) { pillText = 'Aguardando'; pillColor = 'var(--text-muted)'; }
    if (pillText) {
      const pill = document.createElement('span');
      pill.textContent = pillText;
      pill.style.cssText = `
        font-size:0.6875rem; font-weight:600; letter-spacing:0.03em; white-space:nowrap;
        padding:0.2rem 0.6rem; border-radius:var(--r-chip); color:${pillColor};
        background:color-mix(in srgb, ${pillColor} 12%, transparent);
        border:1px solid color-mix(in srgb, ${pillColor} 25%, transparent);
      `;
      header.appendChild(pill);
    }
  }

  section.appendChild(header);
  if (content) section.appendChild(content);
  return section;
}
