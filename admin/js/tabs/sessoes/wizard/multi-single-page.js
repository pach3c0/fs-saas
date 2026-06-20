// Página única para modo multi_selection (Seleção em Grupo): empilha 4 seções
// (Upload, Compartilhar, Acompanhar, Editadas) — mesmo padrão da Seleção individual.
// A diferença é que tudo gira em torno dos participantes (cada um com seu código/seleção):
// o passo Compartilhar mostra a lista de participantes, e Acompanhar/Editadas operam sobre
// a união das seleções. Os renderers de passo já tratam o modo multi internamente.

import { renderStepUpload } from './steps/1-upload.js';
import { renderStepShare } from './steps/2-share.js';
import { renderStepTracking } from './steps/4-tracking.js';
import { renderStepEdited } from './steps/5-edited.js';
import { icon } from '../../../utils/icons.js';

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

// Todos os participantes já enviaram a seleção? (libera a seção Editadas, espelhando o
// passo Acompanhar do stepper, que exigia todos submetidos para destravar Editadas.)
function allParticipantsSubmitted(session) {
  const ps = session.participants || [];
  if (!ps.length) return false;
  return ps.every(p => ['submitted', 'delivered'].includes(p.selectionStatus));
}

export function renderMultiSinglePage(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:2rem; margin:0; width:100%;';

  // Seção 1: UPLOAD
  const uploadSection = document.createElement('section');
  uploadSection.style.cssText = 'display:flex; flex-direction:column; gap:1rem;';
  uploadSection.appendChild(sectionTitle('1. Upload de Fotos'));
  const uploadContent = renderStepUpload({ session, refresh, inSinglePage: true });
  if (uploadContent) uploadSection.appendChild(uploadContent);
  wrap.appendChild(uploadSection);

  // Seção 2: COMPARTILHAR (lista de participantes — cada um com código próprio)
  const shareSection = document.createElement('section');
  shareSection.style.cssText = 'display:flex; flex-direction:column; gap:1rem;';
  shareSection.appendChild(sectionTitle('2. Compartilhar com os Participantes'));
  const shareContent = renderStepShare({ session, refresh, switchStep: null, inSinglePage: true });
  if (shareContent) shareSection.appendChild(shareContent);
  wrap.appendChild(shareSection);

  // Seção 3: ACOMPANHAR (progresso de cada participante)
  const trackSection = document.createElement('section');
  trackSection.style.cssText = 'display:flex; flex-direction:column; gap:1rem;';
  trackSection.appendChild(sectionTitle('3. Acompanhar Participantes'));
  const trackContent = renderStepTracking({ session, refresh, inSinglePage: true });
  if (trackContent) trackSection.appendChild(trackContent);
  wrap.appendChild(trackSection);

  // Seção 4: EDITADAS (liberada quando todos os participantes finalizarem)
  const editSection = document.createElement('section');
  editSection.style.cssText = 'display:flex; flex-direction:column; gap:1rem;';
  editSection.appendChild(sectionTitle('4. Upload de Fotos Editadas'));

  if (!allParticipantsSubmitted(session)) {
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
    titleEl.textContent = 'Aguardando os participantes';
    const descEl = document.createElement('div');
    descEl.style.cssText = 'font-size:0.875rem; color:var(--text-secondary);';
    descEl.textContent = 'Os participantes ainda não finalizaram suas seleções. Quando todos enviarem, você poderá subir as fotos editadas aqui.';
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
