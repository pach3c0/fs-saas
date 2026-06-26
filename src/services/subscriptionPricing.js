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

// Limite efetivo de storage (em MB): limite base do plano/override + GB adicionais.
// `limits.maxStorage` continua sendo o base (plano ou override); o adicional só soma aqui.
function effectiveStorageMB(sub) {
  if (!sub) return 0;
  const base = sub.limits?.maxStorage || 0;
  return base + (sub.storageAddonGB || 0) * 1024;
}

module.exports = { effectiveMonthlyCents, effectiveStorageMB };
