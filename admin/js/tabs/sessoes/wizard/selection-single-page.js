// Página única para modo selection: empilha 4 seções (Upload, Compartilhar, Acompanhar, Editadas).

import { renderStepUpload } from './steps/1-upload.js';
import { renderStepShare } from './steps/2-share.js';
import { renderStepTracking } from './steps/4-tracking.js';
import { renderStepEdited } from './steps/5-edited.js';
import { icon } from '../../../utils/icons.js';

export function renderSelectionSinglePage(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:2rem; margin:0; width:100%;';

  // Seção 1: UPLOAD
  const uploadSection = document.createElement('section');
  uploadSection.style.cssText = 'display:flex; flex-direction:column; gap:1rem;';
  const uploadTitle = document.createElement('h3');
  uploadTitle.style.cssText = `
    font-size:0.75rem; font-weight:700; letter-spacing:0.1em; color:var(--text-muted);
    text-transform:uppercase; margin:0 0 0.5rem; padding-bottom:0.75rem;
    border-bottom:1px solid var(--border);
  `;
  uploadTitle.textContent = '1. Upload de Fotos';
  uploadSection.appendChild(uploadTitle);
  const uploadContent = renderStepUpload({ session, refresh, inSinglePage: true });
  if (uploadContent) uploadSection.appendChild(uploadContent);
  wrap.appendChild(uploadSection);

  // Seção 2: COMPARTILHAR
  const shareSection = document.createElement('section');
  shareSection.style.cssText = 'display:flex; flex-direction:column; gap:1rem;';
  const shareTitle = document.createElement('h3');
  shareTitle.style.cssText = `
    font-size:0.75rem; font-weight:700; letter-spacing:0.1em; color:var(--text-muted);
    text-transform:uppercase; margin:0 0 0.5rem; padding-bottom:0.75rem;
    border-bottom:1px solid var(--border);
  `;
  shareTitle.textContent = '2. Compartilhar';
  shareSection.appendChild(shareTitle);
  const shareContent = renderStepShare({ session, refresh, switchStep: null, inSinglePage: true });
  if (shareContent) shareSection.appendChild(shareContent);
  wrap.appendChild(shareSection);

  // Seção 3: ACOMPANHAR
  const trackSection = document.createElement('section');
  trackSection.style.cssText = 'display:flex; flex-direction:column; gap:1rem;';
  const trackTitle = document.createElement('h3');
  trackTitle.style.cssText = `
    font-size:0.75rem; font-weight:700; letter-spacing:0.1em; color:var(--text-muted);
    text-transform:uppercase; margin:0 0 0.5rem; padding-bottom:0.75rem;
    border-bottom:1px solid var(--border);
  `;
  trackTitle.textContent = '3. Acompanhar Seleção';
  trackSection.appendChild(trackTitle);
  const trackContent = renderStepTracking({ session, refresh, inSinglePage: true });
  if (trackContent) trackSection.appendChild(trackContent);
  wrap.appendChild(trackSection);

  // Seção 4: EDITADAS
  const editSection = document.createElement('section');
  editSection.style.cssText = 'display:flex; flex-direction:column; gap:1rem;';
  const editTitle = document.createElement('h3');
  editTitle.style.cssText = `
    font-size:0.75rem; font-weight:700; letter-spacing:0.1em; color:var(--text-muted);
    text-transform:uppercase; margin:0 0 0.5rem; padding-bottom:0.75rem;
    border-bottom:1px solid var(--border);
  `;
  editTitle.textContent = '4. Upload de Fotos Editadas';
  editSection.appendChild(editTitle);

  // Se cliente ainda não enviou seleção, mostra lock card
  if (!session.selectionSubmittedAt) {
    const lockedCard = document.createElement('div');
    lockedCard.style.cssText = `
      background:color-mix(in srgb, var(--orange) 8%, transparent);
      border:1px solid color-mix(in srgb, var(--orange) 25%, transparent);
      border-radius:var(--r-card); padding:2rem 1.5rem;
      text-align:left;
    `;
    const iconEl = document.createElement('div');
    iconEl.style.cssText = 'display:flex;justify-content:flex-start;margin-bottom:0.75rem;color:var(--orange);';
    iconEl.innerHTML = icon('cadeado', 32);
    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-weight:600; margin-bottom:0.25rem; color:var(--text-primary);';
    titleEl.textContent = 'Aguardando seleção do cliente';
    const descEl = document.createElement('div');
    descEl.style.cssText = 'font-size:0.875rem; color:var(--text-secondary);';
    descEl.textContent = 'O cliente ainda não enviou a seleção de fotos. Após enviar, você poderá fazer upload das editadas aqui.';
    lockedCard.appendChild(iconEl);
    lockedCard.appendChild(titleEl);
    lockedCard.appendChild(descEl);
    editSection.appendChild(lockedCard);
  } else {
    const editContent = renderStepEdited({ session, refresh, inSinglePage: true });
    if (editContent) editSection.appendChild(editContent);
  }

  wrap.appendChild(editSection);
  return wrap;
}
