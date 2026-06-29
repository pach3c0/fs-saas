// unified-grid/helpers.js — Helpers puros do grid unificado: derivações sobre a
// sessão (snapshot/seleção/mapa de participantes) + factories de botão reaproveitadas.
// Parado aqui (em vez de em stats/participants) para quebrar o ciclo de import
// stats ↔ participants (ambos usam makeExtraActionBtn). Extraído sem alteração de comportamento.

import { escapeHtml } from '../../../../utils/helpers.js';

export function buildSnapshot(session) {
  return JSON.stringify({
    selected: (session.selectedPhotos || []).slice().sort(),
    status: session.selectionStatus,
    comments: (session.photos || []).map(p => `${p.id}:${p.comments?.length || 0}`).sort(),
    participants: (session.participants || []).map(p =>
      `${p._id}:${p.selectionStatus}:${(p.selectedPhotos || []).length}`).sort()
  });
}

// Em multi_selection: conjunto de photoIds selecionados pela união dos participantes.
export function buildSelectedSet(session) {
  const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';
  if (isMulti) {
    const s = new Set();
    (session.participants || []).forEach(p => (p.selectedPhotos || []).forEach(id => s.add(id)));
    return s;
  }
  return new Set(session.selectedPhotos || []);
}

// Em multi_selection: mapeia photoId → primeiros nomes dos participantes que a selecionaram.
export function buildPhotoSelectorsMap(session) {
  const map = new Map();
  (session.participants || []).forEach(p => {
    const firstName = String(p.name || '').split(' ')[0] || 'P';
    (p.selectedPhotos || []).forEach(id => {
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(firstName);
    });
  });
  return map;
}

export function renderSelectorChips(names) {
  if (!names?.length) return '';
  const visible = names.slice(0, 3);
  const extra   = names.length - visible.length;
  let html = visible.map(n =>
    `<span style="background:var(--yellow);color:black;padding:1px 6px;border-radius:999px;font-size:0.5625rem;line-height:1.2;white-space:nowrap;">✓ ${escapeHtml(n)}</span>`
  ).join('');
  if (extra > 0) html += `<span style="background:var(--bg-elevated);color:var(--text-primary);padding:1px 6px;border-radius:999px;font-size:0.5625rem;line-height:1.2;">+${extra}</span>`;
  return html;
}

export function allParticipantsSubmitted(session) {
  const ps = session.participants || [];
  if (!ps.length) return false;
  return ps.every(p => ['submitted', 'delivered'].includes(p.selectionStatus));
}

// Botão de ação para pedidos de fotos extras (cor persistente, sem reset no hover).
// Usado por stats.js (nível-sessão) e participants.js (nível-participante).
export function makeExtraActionBtn(labelHtml, color) {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = labelHtml;
  b.style.cssText = `
    display:inline-flex; align-items:center; gap:.25rem;
    background:color-mix(in srgb, ${color} 8%, transparent); color:${color};
    border:1px solid ${color}; border-radius:var(--r-field);
    padding:.25rem .625rem; cursor:pointer; font-size:.6875rem; font-weight:600;
  `;
  return b;
}

// Botão de bulk da toolbar (ocultar/mostrar/deletar).
export function makeBulkBtn(text, isDanger) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = text;
  btn.className = isDanger ? 'cz-ug-bulk danger' : 'cz-ug-bulk neutral';
  return btn;
}
