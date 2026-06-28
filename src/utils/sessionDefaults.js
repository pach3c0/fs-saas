// Fonte única dos PADRÕES de criação de sessão (Configurações › Sessões).
//
// Por que existe: a sessão (Seleção em grupo e demais modos) nasce por 2 caminhos — menu
// Sessões e Triagem. Antes, os padrões do fotógrafo eram aplicados SÓ no frontend do
// admin (admin/js/tabs/sessoes/modal-form.js), então a sessão criada pela Triagem mandava
// payload mínimo e caía nos defaults crus do schema (ex.: galeria nascia com watermark:true).
// Centralizando no backend, qualquer origem produz uma sessão idêntica — a única diferença
// legítima por origem é o rosto (faceEnabled / persons / selfRegEnabled).
//
// Regra de ouro: preenche cada campo SÓ quando ausente em `sessionData`. Um valor explícito
// do cliente sempre vence → zero regressão para quem já manda o campo.

'use strict';

// Modos que entregam a galeria inteira sem etapa de seleção → sem marca d'água por padrão.
function ehGaleria(mode) {
  return mode === 'gallery' || mode === 'multi_gallery';
}

// Aplica os padrões do fotógrafo sobre `sessionData` (mutação in-place; também retorna).
// `org` é o documento da org (lean) — lê de `org.preferences.sessionDefaults`.
// O mapeamento espelha byte-a-byte o que o modal-form.js fazia no admin.
function applyOrgSessionDefaults(sessionData, org, mode) {
  if (!sessionData) return sessionData;
  const sd = (org && org.preferences && org.preferences.sessionDefaults) || {};
  const ausente = (campo) => sessionData[campo] === undefined || sessionData[campo] === null;

  if (ausente('packageLimit'))    sessionData.packageLimit    = sd.packageLimit != null ? sd.packageLimit : 30;
  if (ausente('extraPhotoPrice')) sessionData.extraPhotoPrice = sd.extraPhotoPrice != null ? sd.extraPhotoPrice : 25;
  if (ausente('photoResolution')) sessionData.photoResolution = sd.photoResolution != null ? parseInt(sd.photoResolution, 10) : 1200;

  if (ausente('allowExtraPurchasePostSubmit')) sessionData.allowExtraPurchasePostSubmit = sd.allowExtraPurchase !== false;
  if (ausente('allowReopen'))                  sessionData.allowReopen                  = sd.allowReopen !== false;
  if (ausente('commentsEnabled'))              sessionData.commentsEnabled              = sd.commentsEnabled === true;

  // Marca d'água: derivada do MODO (espelha o admin), não dos sessionDefaults.
  if (ausente('watermark')) sessionData.watermark = !ehGaleria(mode);

  if (ausente('eventType')) sessionData.eventType = 'outro';
  if (sessionData.salesAutomation == null) sessionData.salesAutomation = { enabled: true };

  // Prazo padrão (só se configurado E o cliente não mandou um): vale pra seleção e pro
  // acesso da galeria. Mesmo cálculo do modal-form.js (T23:59 do dia +deadlineDays).
  if (ausente('selectionDeadline') && sd.deadlineDays > 0) {
    const dl = new Date();
    dl.setDate(dl.getDate() + sd.deadlineDays);
    sessionData.selectionDeadline = `${dl.toISOString().split('T')[0]}T23:59`;
  }

  return sessionData;
}

module.exports = { applyOrgSessionDefaults };
