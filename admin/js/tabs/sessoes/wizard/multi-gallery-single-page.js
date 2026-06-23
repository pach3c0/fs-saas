// Página única para modo multi_gallery (Galeria em Grupo): empilha 2 seções
// (Upload, Compartilhar com os Convidados) — mesmo padrão da Galeria individual,
// mas a entrega é por participante (cada convidado tem código próprio e baixa tudo).
// Não há etapa de seleção nem de entrega: compartilhar o link JÁ é entregar.
// O renderStepShare detecta multi_gallery (isMulti) e mostra o painel de participantes.
// Cada seção é um card de estado (ver step-section.js), espelhando o stepper do topo.

import { renderStepUpload } from './steps/1-upload.js';
import { renderStepShare } from './steps/2-share.js';
import { renderStepSection, computeSinglePageSteps } from './step-section.js';

export function renderMultiGallerySinglePage(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.25rem; max-width:900px; margin:0 auto; width:100%;';

  const steps = computeSinglePageSteps(session);

  // Seção 1: UPLOAD
  wrap.appendChild(renderStepSection({
    stepState: steps[0],
    displayNumber: 1,
    title: 'Upload de Fotos',
    content: renderStepUpload({ session, refresh, inSinglePage: true })
  }));

  // Seção 2: COMPARTILHAR COM OS CONVIDADOS (lista de participantes — cada um com link próprio)
  wrap.appendChild(renderStepSection({
    stepState: steps[1],
    displayNumber: 2,
    title: 'Compartilhar com os Convidados',
    content: renderStepShare({ session, refresh, switchStep: null, inSinglePage: true })
  }));

  return wrap;
}
