// Página única para modo gallery: empilha 2 seções (Upload, Compartilhar + Entregar).
// No modo galeria não há etapa de seleção — o cliente visualiza e baixa direto, e a
// entrega (notificação ao cliente) acontece embutida no passo Compartilhar.

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

export function renderGallerySinglePage(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:2rem; margin:0; width:100%;';

  // Seção 1: UPLOAD
  const uploadSection = document.createElement('section');
  uploadSection.style.cssText = 'display:flex; flex-direction:column; gap:1rem;';
  uploadSection.appendChild(sectionTitle('1. Upload de Fotos'));
  const uploadContent = renderStepUpload({ session, refresh, inSinglePage: true });
  if (uploadContent) uploadSection.appendChild(uploadContent);
  wrap.appendChild(uploadSection);

  // Seção 2: COMPARTILHAR E ENTREGAR
  const shareSection = document.createElement('section');
  shareSection.style.cssText = 'display:flex; flex-direction:column; gap:1rem;';
  shareSection.appendChild(sectionTitle('2. Compartilhar e Entregar'));
  const shareContent = renderStepShare({ session, refresh, switchStep: null, inSinglePage: true });
  if (shareContent) shareSection.appendChild(shareContent);
  wrap.appendChild(shareSection);

  return wrap;
}
