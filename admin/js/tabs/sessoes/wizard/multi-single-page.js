// Página única para modo multi_selection (Seleção em Grupo): 1 única seção.
// O grid unificado (unified-photo-grid.js) absorveu tudo:
//   - Upload de fotos brutas
//   - Grid com badges de estado (selecionada/editada/oculta)
//   - Painel de participantes com Link / WhatsApp / Copiar código / Reabrir / Gerenciar
//   - Botão Entregar fotos
//   - Botão Preview como cliente
//   - Polling adaptativo em background
//
// Resultado: tela única sem seção "Compartilhar" separada.

import { renderUnifiedPhotoGrid } from './unified-photo-grid.js';
import { renderStepSection } from './step-section.js';

export function renderMultiSinglePage(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.25rem; margin:0; width:100%;';

  // Card único ("Fotos da Sessão") — sem metáfora de etapa (plain): não há mais "passos"
  // pra estar no meio de um. O grid unificado já carrega o status (participantes, toolbar, badges).
  wrap.appendChild(renderStepSection({
    displayNumber: 1,
    title:         'Fotos da Sessão',
    content:       renderUnifiedPhotoGrid({ session, refresh }),
    plain:         true
  }));

  return wrap;
}
