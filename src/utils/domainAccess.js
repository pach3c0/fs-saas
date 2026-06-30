const Subscription = require('../models/Subscription');
const { can } = require('../services/subscriptionPricing');

// Gate read-side da "cerca" de domínio próprio: a org só serve o domínio customizado
// se o plano efetivo permite a capability `dominioProprio` (Pro/Studio). Quando uma org
// cai pro Free (estorno, cancelamento, refund, fim de ciclo, troca manual), o domínio
// próprio para de resolver — de forma reversível (re-upgrade volta a servir na hora,
// sem reconfigurar DNS; o dado de `customDomain` é mantido).
//
// Lê a Subscription AUTORITATIVA (não `org.plan`) de propósito: assim nunca barra quem
// paga por causa de um `Organization.plan` defasado. `can(sub, ...)` já trata sub nulo
// (org sem assinatura) como Free → false.
async function isCustomDomainServable(org) {
  if (!org || !org._id) return false;
  const sub = await Subscription.findOne({ organizationId: org._id }).select('plan').lean();
  return !!can(sub, 'dominioProprio');
}

module.exports = { isCustomDomainServable };
