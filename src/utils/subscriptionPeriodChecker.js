const Subscription = require('../models/Subscription');
const { revertSubscriptionToFree } = require('../middleware/mercadopago');
const logger = require('./logger');

// Fase 2 — Fim de ciclo do cancelamento voluntário.
// Roda 1×/dia. O /billing/cancel mata a recorrência no MP mas MANTÉM o acesso até o fim do
// ciclo já pago (CDC: cancelamento após 7 dias não devolve o período corrente). Aqui, quando
// esse ciclo VENCE (`currentPeriodEnd <= agora`), a assinatura cai pro Free.
//
// Segurança: reusa `revertSubscriptionToFree`, que JÁ blinda contas protegidas/cortesia/override
// (Flávia, Davi, dono) e é idempotente (guard revertedAt:null). Sem `suspend` — fim de ciclo
// não é estorno/chargeback, só rebaixa o plano sem desativar a org nem mexer em dados.
//
// `currentPeriodEnd` só é gravado no cancelamento (next_payment_date do MP). Se ficou null
// (GET ao MP falhou), a sub NÃO entra na query → acesso segue até downgrade manual (erra a
// favor do cliente). O guard `$ne: null` é obrigatório: no BSON, null ordena ABAIXO de
// qualquer data, então `{ $lte: agora }` sozinho casaria com os nulls e rebaixaria cedo demais.
async function checkSubscriptionPeriods() {
  const now = new Date();
  const subs = await Subscription.find({
    cancelAtPeriodEnd: true,
    plan: { $ne: 'free' },
    currentPeriodEnd: { $ne: null, $lte: now },
  })
    .select('organizationId plan mpPreapprovalId overrideEnabled isCourtesy currentPeriodEnd')
    .lean();

  if (!subs.length) return { downgraded: 0, skipped: 0 };

  let downgraded = 0, skipped = 0;
  for (const sub of subs) {
    try {
      const r = await revertSubscriptionToFree(sub, { reason: 'cancel_period_end' });
      if (r.reverted) {
        downgraded++;
        logger.info(`[subscriptionPeriodChecker] ciclo vencido → Free org=${sub.organizationId} de=${sub.plan}`);
      } else {
        skipped++;
        logger.info(`[subscriptionPeriodChecker] não rebaixada (${r.skipped}) org=${sub.organizationId}`);
      }
    } catch (e) {
      skipped++;
      logger.error(`[subscriptionPeriodChecker] erro ao rebaixar org=${sub.organizationId}: ${e.message}`,
        { orgId: String(sub.organizationId) });
    }
  }

  logger.info(`[subscriptionPeriodChecker] Rodada concluída: downgraded=${downgraded} skipped=${skipped}`);
  return { downgraded, skipped };
}

module.exports = { checkSubscriptionPeriods };
