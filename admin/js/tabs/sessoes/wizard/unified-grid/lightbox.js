// unified-grid/lightbox.js — Lightbox do grid unificado (navegação por teclado/setas).
// Extraído de unified-photo-grid.js sem alteração de comportamento.

import { resolveImagePath } from '../../../../utils/helpers.js';

export function openLightbox(photos, startIndex) {
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
