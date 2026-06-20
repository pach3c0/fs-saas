// Página única para modo multi_gallery (Galeria em Grupo): empilha 2 seções
// (Upload, Compartilhar com os Convidados) — mesmo padrão da Galeria individual,
// mas a entrega é por participante (cada convidado tem código próprio e baixa tudo).
// Não há etapa de seleção nem de entrega: compartilhar o link JÁ é entregar.
// O renderStepShare detecta multi_gallery (isMulti) e mostra o painel de participantes.

import { renderStepUpload } from './steps/1-upload.js';
import { renderStepShare } from './steps/2-share.js';

function sectionTitle(text) {
  const h = document.createElement('h3');
  h.style.cssText = `
    font-size:0.75rem; font-weight:700; letter-spacing:0.1em; color:var(--text-muted);
    text-transform:uppercase; margin:0 0 0.5rem; padding-bottom:0.75rem;
    border-bottom:1px solid var(--border);
  `;
  h.textContent = text;
  return h;
}

export function renderMultiGallerySinglePage(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:2rem; max-width:900px; margin:0 auto; width:100%;';

  // Seção 1: UPLOAD
  const uploadSection = document.createElement('section');
  uploadSection.style.cssText = 'display:flex; flex-direction:column; gap:1rem;';
  uploadSection.appendChild(sectionTitle('1. Upload de Fotos'));
  const uploadContent = renderStepUpload({ session, refresh, inSinglePage: true });
  if (uploadContent) uploadSection.appendChild(uploadContent);
  wrap.appendChild(uploadSection);

  // Seção 2: COMPARTILHAR COM OS CONVIDADOS (lista de participantes — cada um com link próprio)
  const shareSection = document.createElement('section');
  shareSection.style.cssText = 'display:flex; flex-direction:column; gap:1rem;';
  shareSection.appendChild(sectionTitle('2. Compartilhar com os Convidados'));
  const shareContent = renderStepShare({ session, refresh, switchStep: null, inSinglePage: true });
  if (shareContent) shareSection.appendChild(shareContent);
  wrap.appendChild(shareSection);

  return wrap;
}
