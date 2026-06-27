const Organization = require('../models/Organization');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { isProtectedSlug } = require('./protectedOrgs');
const { cancelPreapproval } = require('../middleware/mercadopago');
const { sendBillingGraceWarningEmail, sendBillingSuspendedEmail } = require('./email');
const logger = require('./logger');

// F3 — Carência de regularização (exit-cortesia / início de cobrança).
// Roda 1×/dia. Para cada org com prazo (`Subscription.graceUntil`) definido pelo
// super-admin: avisa quando faltam <= GRACE_WARN_DAYS; quando o prazo vence sem
// regularizar, SUSPENDE a org (isActive=false + suspendedReason='billing').
// A suspensão é INDEFINIDA e NÃO exclui nada — o offboardingChecker ignora
// suspensão por billing. Reativação é manual (super-admin /approve).
const WARN_DAYS = parseInt(process.env.GRACE_WARN_DAYS || '7');
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// E-mail confiável = User dono (Organization.email tem default '' — não confiável).
async function ownerEmailFor(org) {
  if (org.ownerId) {
    const owner = await User.findById(org.ownerId).select('email').lean();
    if (owner?.email) return owner.email.trim();
  }
  return (org.email || '').trim() || null;
}

// Retry de cancelamento de recorrência no MP que falhou de forma TRANSIENTE durante um estorno
// (revertSubscriptionToFree preservou o mpPreapprovalId e ligou mpCancelPending). Sem isto, a
// assinatura seguiria viva no MP cobrando após o estorno = devolução em dobro (CDC Art. 42).
async function retryPendingCancellations() {
  const subs = await Subscription.find({ mpCancelPending: true, mpPreapprovalId: { $type: 'string' } })
    .select('organizationId mpPreapprovalId').lean();
  if (!subs.length) return { retried: 0, ok: 0 };

  let ok = 0;
  for (const sub of subs) {
    try {
      await cancelPreapproval(sub.mpPreapprovalId);
      await Subscription.updateOne({ _id: sub._id }, { $set: { mpCancelPending: false }, $unset: { mpPreapprovalId: '' } });
      logger.info(`[graceChecker] recorrência cancelada no retry org=${sub.organizationId}`);
      ok++;
    } catch (e) {
      const code = e?.status || e?.statusCode || e?.cause?.status || e?.response?.status;
      const definitive = code === 400 || code === 404 ||
        /already.*cancel|not.*found|cancelad|does not exist/i.test(e?.message || '');
      if (definitive) {
        // Já não cobra mais no MP → encerra o retry e solta o id.
        await Subscription.updateOne({ _id: sub._id }, { $set: { mpCancelPending: false }, $unset: { mpPreapprovalId: '' } });
        ok++;
      } else {
        logger.warn(`[graceChecker] retry de cancelamento ainda falhando org=${sub.organizationId}: ${e.message}`);
      }
    }
  }
  logger.info(`[graceChecker] retry de cancelamentos pendentes: ${ok}/${subs.length}`);
  return { retried: subs.length, ok };
}

async function checkGracePeriods() {
  // Antes da carência: re-tenta cancelamentos de recorrência que falharam (transiente) num estorno.
  await retryPendingCancellations().catch(e =>
    logger.error('[graceChecker] erro no retry de cancelamentos pendentes', { message: e.message }));

  // populate evita N+1 (1 query em vez de 1 + N findById por org em carência).
  const subs = await Subscription.find({ graceUntil: { $ne: null } })
    .select('organizationId graceUntil graceWarnedAt isCourtesy')
    .populate('organizationId', '_id name slug email ownerId isActive suspendedReason')
    .lean();
  if (!subs.length) return { warned: 0, suspended: 0, skipped: 0 };

  let warned = 0, suspended = 0, skipped = 0;
  const now = new Date();

  for (const sub of subs) {
    const org = sub.organizationId;
    if (!org) { skipped++; continue; }

    // Já inativa → nada a fazer (não re-suspende nem reavisa).
    if (org.isActive === false) { skipped++; continue; }

    // Voltou à cortesia → carência não se aplica: limpa o prazo.
    if (sub.isCourtesy) {
      await Subscription.updateOne({ _id: sub._id }, { $set: { graceUntil: null, graceWarnedAt: null } });
      skipped++;
      continue;
    }

    const graceUntil = new Date(sub.graceUntil);
    const daysLeft = Math.ceil((graceUntil - now) / MS_PER_DAY);

    if (graceUntil <= now) {
      // Prazo vencido → SUSPENDE. Contas protegidas são SEMPRE puladas (rede de segurança).
      if (isProtectedSlug(org.slug)) {
        logger.warn(`[graceChecker] Org PROTEGIDA não suspensa apesar do prazo vencido org=${org._id} slug=${org.slug}`);
        skipped++;
        continue;
      }
      try {
        await Organization.updateOne(
          { _id: org._id },
          { $set: { isActive: false, suspendedReason: 'billing' } }
        );
        // Prazo consumido → zera p/ não reprocessar (o motivo fica em suspendedReason).
        // Zera graceWarnedAt junto: mantém a invariante "sem prazo → sem aviso pendente".
        await Subscription.updateOne({ _id: sub._id }, { $set: { graceUntil: null, graceWarnedAt: null } });
        logger.info(`[graceChecker] Org suspensa por carência vencida org=${org._id} name="${org.name}"`);

        const email = await ownerEmailFor(org);
        if (email) {
          await sendBillingSuspendedEmail(email, org.name).catch(e =>
            logger.error(`[graceChecker] Erro email suspensão org=${org._id}:`, { message: e.message })
          );
        }
        suspended++;
      } catch (e) {
        logger.error(`[graceChecker] Erro ao suspender org=${org._id}:`, { message: e.message });
      }
    } else if (daysLeft <= WARN_DAYS && !sub.graceWarnedAt) {
      // Janela de aviso (uma vez por prazo — graceWarnedAt é zerado ao redefinir o prazo).
      const email = await ownerEmailFor(org);
      if (email) {
        await sendBillingGraceWarningEmail(email, org.name, daysLeft).catch(e =>
          logger.error(`[graceChecker] Erro email aviso org=${org._id}:`, { message: e.message })
        );
      }
      await Subscription.updateOne({ _id: sub._id }, { $set: { graceWarnedAt: now } });
      logger.info(`[graceChecker] Aviso de carência enviado org=${org._id} daysLeft=${daysLeft}`);
      warned++;
    }
  }

  logger.info(`[graceChecker] Rodada concluída: warned=${warned} suspended=${suspended} skipped=${skipped}`);
  return { warned, suspended, skipped };
}

module.exports = { checkGracePeriods, retryPendingCancellations };
