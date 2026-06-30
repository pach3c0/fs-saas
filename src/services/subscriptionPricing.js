const plans = require('../models/plans');

// Fonte única de verdade do "preço efetivo" e do "storage efetivo" de uma assinatura.
// Centraliza a soma da camada aditiva (storage adicional recorrente) sobre o plano,
// para que checkout/MP, GET /billing/subscription e a UI nunca divirjam.

// Valor mensal efetivo (em centavos) que deve ir para o Mercado Pago:
// base (preço personalizado da org, se houver; senão o do catálogo) + adicional de storage.
function effectiveMonthlyCents(sub) {
  if (!sub) return 0;
  const base = sub.customPriceCents > 0
    ? sub.customPriceCents
    : (plans[sub.plan]?.price || 0);
  return base + (sub.storageAddonPriceCents || 0);
}

// Limites EFETIVOS de uma assinatura, derivados da fonte única (models/plans.js).
// Regra: SEM override → os limites são SEMPRE os do plano atual em plans.js (o
// `sub.limits` gravado pode estar defasado — ex.: snapshot velho de Free com
// 500MB/5/100 — e é IGNORADO); COM override → valem os limites customizados pelo
// super-admin. O adicional de storage recorrente soma em cima. Isso elimina a
// divergência "plano Free mostra 500MB / Sessões 5 / Fotos 100".
function effectiveLimits(sub) {
  const planId = (sub && plans[sub.plan]) ? sub.plan : 'free';
  const base = plans[planId].limits;
  const src = (sub?.overrideEnabled && sub.limits) ? sub.limits : base;
  const addonMB = (sub?.storageAddonGB || 0) * 1024;
  const baseStorage = src.maxStorage ?? base.maxStorage;
  return {
    maxSessions:  src.maxSessions  ?? base.maxSessions,
    maxPhotos:    src.maxPhotos    ?? base.maxPhotos,
    maxAlbums:    src.maxAlbums    ?? base.maxAlbums,
    customDomain: src.customDomain ?? base.customDomain,
    // -1 = ilimitado (override): não soma adicional, segue ilimitado.
    maxStorage:   baseStorage === -1 ? -1 : baseStorage + addonMB,
  };
}

// Limite efetivo de storage (em MB) = limite do plano/override + GB adicionais.
function effectiveStorageMB(sub) {
  return effectiveLimits(sub).maxStorage;
}

// Capability EFETIVA de uma assinatura, derivada da fonte única (models/plans.js).
// Diferente de limites/preço, as capabilities NÃO são customizáveis por org hoje:
// derivam puramente do `sub.plan` (override mexe só em limite/preço, não em feature).
// Org sem assinatura → Free. Retorna o valor da flag (boolean — ou 'taste'/'full' no
// caso de `crm`); undefined se a capability não existir no plano.
function can(sub, capability) {
  const planId = (sub && plans[sub.plan]) ? sub.plan : 'free';
  const caps = plans[planId].capabilities || {};
  return caps[capability];
}

// Mapa COMPLETO de capabilities efetivas de uma assinatura (todas as flags do tier).
// Usado pela UI (ex.: esconder itens da Gestão por plano) — uma leitura só em vez de
// N chamadas a `can()`. Org sem assinatura → Free. Cópia rasa (não vaza o objeto de plans.js).
function capabilitiesOf(sub) {
  const planId = (sub && plans[sub.plan]) ? sub.plan : 'free';
  return { ...(plans[planId].capabilities || {}) };
}

module.exports = { effectiveMonthlyCents, effectiveStorageMB, effectiveLimits, can, capabilitiesOf };
