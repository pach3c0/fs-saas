// Página única para modo gallery: empilha 2 seções (Upload, Compartilhar + Entregar).
// No modo galeria não há etapa de seleção — o cliente visualiza e baixa direto, e a
// entrega (notificação ao cliente) acontece embutida no passo Compartilhar.
// Cada seção é um card de estado (ver step-section.js), espelhando o stepper do topo.

import { renderStepUpload } from './steps/1-upload.js';
import { renderStepShare } from './steps/2-share.js';
import { renderStepSection, computeSinglePageSteps } from './step-section.js';

export function renderGallerySinglePage(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.25rem; margin:0; width:100%;';

  const steps = computeSinglePageSteps(session);

  // Seção 1: UPLOAD
  wrap.appendChild(renderStepSection({
    stepState: steps[0],
    displayNumber: 1,
    title: 'Upload de Fotos',
    content: renderStepUpload({ session, refresh, inSinglePage: true })
  }));

  // Seção 2: COMPARTILHAR E ENTREGAR
  wrap.appendChild(renderStepSection({
    stepState: steps[1],
    displayNumber: 2,
    title: 'Compartilhar e Entregar',
    content: renderStepShare({ session, refresh, switchStep: null, inSinglePage: true })
  }));

  return wrap;
}
