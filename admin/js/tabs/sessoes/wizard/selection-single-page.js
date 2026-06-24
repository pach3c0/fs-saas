// Página única para modo selection: 1 única seção.
// O grid unificado (unified-photo-grid.js) absorveu tudo:
//   - Upload de fotos brutas
//   - Grid com badges de estado (selecionada/editada/oculta)
//   - Painel de status (selecionadas, editadas, mensagens, status)
//   - Botão Entregar fotos (na toolbar quando há editadas)
//   - Polling adaptativo em background
//
// A funcionalidade de "Compartilhar" (código de acesso, e-mail, WhatsApp)
// permanece acessível via toolbar do grid unificado quando relevante,
// mas não ocupa uma seção separada na tela.

import { renderUnifiedPhotoGrid } from './unified-photo-grid.js';
import { renderStepShare } from './steps/2-share.js';
import { renderStepSection } from './step-section.js';

export function renderSelectionSinglePage(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.25rem; margin:0; width:100%;';

  // O grid unificado já tem upload, status, polling e botão entregar.
  // O compartilhar (código, e-mail, WhatsApp) fica como painel compacto abaixo do grid.
  const gridContent = document.createElement('div');
  gridContent.style.cssText = 'display:flex; flex-direction:column; gap:.75rem;';

  gridContent.appendChild(renderUnifiedPhotoGrid({ session, refresh }));

  // Painel de compartilhamento compacto (só link/código/WhatsApp, sem o h2 grande)
  const shareWrap = document.createElement('div');
  shareWrap.style.cssText = `
    background:var(--bg-surface); border:1px solid var(--border);
    border-radius:var(--r-card); overflow:hidden;
  `;

  const shareHeader = document.createElement('div');
  shareHeader.style.cssText = `
    padding:.5rem .875rem;
    display:flex; align-items:center; justify-content:space-between; gap:.75rem;
    border-bottom:1px solid var(--border); cursor:pointer; user-select:none;
  `;
  const shareTitleEl = document.createElement('span');
  shareTitleEl.style.cssText = 'font-size:.75rem; font-weight:600; color:var(--text-secondary); letter-spacing:.05em; text-transform:uppercase;';
  shareTitleEl.textContent = 'Compartilhar com o cliente';
  shareHeader.appendChild(shareTitleEl);

  const shareToggle = document.createElement('span');
  shareToggle.style.cssText = 'color:var(--text-muted); display:flex; align-items:center; transition:transform .2s;';
  shareToggle.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
  shareHeader.appendChild(shareToggle);

  const shareBody = document.createElement('div');
  shareBody.style.cssText = 'padding:.625rem .875rem;';

  let shareCollapsed = false;
  shareHeader.onclick = () => {
    shareCollapsed = !shareCollapsed;
    shareBody.style.display = shareCollapsed ? 'none' : 'block';
    shareToggle.style.transform = shareCollapsed ? 'rotate(180deg)' : '';
  };

  shareBody.appendChild(renderStepShare({ session, refresh, switchStep: null, inSinglePage: true }));
  shareWrap.appendChild(shareHeader);
  shareWrap.appendChild(shareBody);

  gridContent.appendChild(shareWrap);

  // Card único ("Fotos da Sessão") — sem metáfora de etapa (plain): não há mais "passos".
  wrap.appendChild(renderStepSection({
    displayNumber: 1,
    title:         'Fotos da Sessão',
    content:       gridContent,
    plain:         true
  }));

  return wrap;
}
