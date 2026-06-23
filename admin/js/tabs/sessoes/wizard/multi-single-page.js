// Página única para modo multi_selection (Seleção em Grupo): empilha 4 seções
// (Upload, Compartilhar, Acompanhar, Editadas) — mesmo padrão da Seleção individual.
// A diferença é que tudo gira em torno dos participantes (cada um com seu código/seleção):
// o passo Compartilhar mostra a lista de participantes, e Acompanhar/Editadas operam sobre
// a união das seleções. Os renderers de passo já tratam o modo multi internamente.
//
// Cada seção é um card de estado (ver step-section.js): concluído/atual/travado, espelhando
// o stepper do topo — pra dar a divisão visual e o "você está aqui" ao rolar a página.

import { renderStepUpload } from './steps/1-upload.js';
import { renderStepShare } from './steps/2-share.js';
import { renderStepTracking } from './steps/4-tracking.js';
import { renderStepEdited } from './steps/5-edited.js';
import { icon } from '../../../utils/icons.js';
import { renderStepSection, computeSinglePageSteps } from './step-section.js';

// Todos os participantes já enviaram a seleção? (libera a seção Editadas, espelhando o
// passo Acompanhar do stepper, que exigia todos submetidos para destravar Editadas.)
function allParticipantsSubmitted(session) {
  const ps = session.participants || [];
  if (!ps.length) return false;
  return ps.every(p => ['submitted', 'delivered'].includes(p.selectionStatus));
}

export function renderMultiSinglePage(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.25rem; margin:0; width:100%;';

  // Estado das etapas (ids [1,2,4,5] → seções 1..4), na mesma língua do stepper do topo.
  const steps = computeSinglePageSteps(session);

  // Seção 1: UPLOAD
  wrap.appendChild(renderStepSection({
    stepState: steps[0],
    displayNumber: 1,
    title: 'Upload de Fotos',
    content: renderStepUpload({ session, refresh, inSinglePage: true })
  }));

  // Seção 2: COMPARTILHAR (lista de participantes — cada um com código próprio)
  wrap.appendChild(renderStepSection({
    stepState: steps[1],
    displayNumber: 2,
    title: 'Compartilhar com os Participantes',
    content: renderStepShare({ session, refresh, switchStep: null, inSinglePage: true })
  }));

  // Seção 3: ACOMPANHAR (progresso de cada participante)
  wrap.appendChild(renderStepSection({
    stepState: steps[2],
    displayNumber: 3,
    title: 'Acompanhar Participantes',
    content: renderStepTracking({ session, refresh, inSinglePage: true })
  }));

  // Seção 4: EDITADAS (liberada quando todos os participantes finalizarem)
  let editContent;
  if (!allParticipantsSubmitted(session)) {
    editContent = document.createElement('div');
    editContent.style.cssText = `
      background:color-mix(in srgb, var(--orange) 8%, transparent);
      border:1px solid color-mix(in srgb, var(--orange) 25%, transparent);
      border-radius:var(--r-card); padding:2rem 1.5rem; text-align:left;
    `;
    const iconEl = document.createElement('div');
    iconEl.style.cssText = 'display:flex;justify-content:flex-start;margin-bottom:0.75rem;color:var(--orange);';
    iconEl.innerHTML = icon('cadeado', 32);
    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-weight:600; margin-bottom:0.25rem; color:var(--text-primary);';
    titleEl.textContent = 'Aguardando os participantes';
    const descEl = document.createElement('div');
    descEl.style.cssText = 'font-size:0.875rem; color:var(--text-secondary);';
    descEl.textContent = 'Os participantes ainda não finalizaram suas seleções. Quando todos enviarem, você poderá subir as fotos editadas aqui.';
    editContent.appendChild(iconEl);
    editContent.appendChild(titleEl);
    editContent.appendChild(descEl);
  } else {
    editContent = renderStepEdited({ session, refresh, inSinglePage: true });
  }
  wrap.appendChild(renderStepSection({
    stepState: steps[3],
    displayNumber: 4,
    title: 'Upload de Fotos Editadas',
    content: editContent
  }));

  return wrap;
}
