const Session = require('../models/Session');
const Organization = require('../models/Organization');
const { sendPostDeliveryUpsellEmail, clientGalleryUrl } = require('./email');
const { EVENT_LABELS, firstName, gerarCouponCode, applyScarcityVars } = require('./salesShared');
const logger = require('./logger');

/**
 * Motor de upsell pós-entrega.
 *
 * Janela de compra: depois que o fotógrafo entrega as fotos selecionadas, a
 * galeria continua disponível até a data de exclusão do storage
 * (storageRetentionUntil). Neste intervalo, dispara e-mails puxando a venda das
 * fotos que ficaram de fora do pacote, com desconto crescente conforme a
 * exclusão se aproxima.
 *
 * Níveis em org.integrations.salesAutomator.postDelivery.daysSchedule (dias ANTES
 * da exclusão). Idempotência: cada (sessionId, upsell_Nd) dispara uma vez via
 * salesAutomation.sentTriggers. Escopo: modo seleção.
 */

const WINDOW_HOURS = 12; // janela de tolerância (cron roda a cada 6h)

async function processarNivel(diasAlvo, orgIds, orgMap, now) {
  const targetMs = diasAlvo * 24 * 60 * 60 * 1000;
  const windowMs = WINDOW_HOURS * 60 * 60 * 1000;
  const lower = new Date(now.getTime() + targetMs - windowMs);
  const upper = new Date(now.getTime() + targetMs + windowMs);

  const sessions = await Session.find({
    organizationId: { $in: orgIds },
    isActive: true,
    mode: 'selection',
    selectionStatus: 'delivered',
    archivedAt: null,
    storageRetentionUntil: { $gte: lower, $lte: upper },
    'salesAutomation.enabled': { $ne: false }
  }).populate('clientId', 'name');

  let sent = 0;
  let skipped = 0;

  for (const session of sessions) {
    try {
      const org = orgMap[String(session.organizationId)];
      const cfg = org?.integrations?.salesAutomator;
      const pd = cfg?.postDelivery;
      if (!pd?.enabled) { skipped++; continue; }

      const triggerName = `upsell_${diasAlvo}d`;

      // Idempotência
      const triggers = session.salesAutomation?.sentTriggers || [];
      if (triggers.some(t => t.trigger === triggerName)) { skipped++; continue; }

      // Fotos que ficaram de fora do pacote (potencial de venda)
      const totalFotos = Array.isArray(session.photos) ? session.photos.length : 0;
      const selecionadas = Array.isArray(session.selectedPhotos) ? session.selectedPhotos.length : 0;
      const restantes = Math.max(0, totalFotos - selecionadas);
      if (restantes <= 0) { skipped++; continue; }
      if (!session.clientEmail) { skipped++; continue; }

      const discount = pd.discountByDay?.[String(diasAlvo)] ?? cfg.couponDiscountPercent ?? 10;
      const couponCode = gerarCouponCode(cfg.couponPrefix, session._id, `U${diasAlvo}D`);
      const recipientName = firstName(session.clientId?.name) || '';

      let customBody = '';
      if (pd.messageTemplate) {
        customBody = applyScarcityVars(pd.messageTemplate, {
          nome: recipientName,
          negocio: org.name,
          evento: EVENT_LABELS[session.eventType] || EVENT_LABELS.outro,
          fotos_restantes: restantes,
          dias: diasAlvo,
          cupom: couponCode,
          desconto: discount,
          preco_extra: session.extraPhotoPrice,
          link: clientGalleryUrl(org.slug, session.accessCode)
        });
      }

      await sendPostDeliveryUpsellEmail(
        session.clientEmail, recipientName, session.name, org.name,
        restantes, couponCode, discount, session.accessCode, org.slug, diasAlvo, customBody
      );

      session.salesAutomation = session.salesAutomation || { enabled: true, sentTriggers: [] };
      session.salesAutomation.sentTriggers = session.salesAutomation.sentTriggers || [];
      session.salesAutomation.sentTriggers.push({
        trigger: triggerName,
        sentAt: new Date(),
        couponCode
      });
      await session.save();
      sent++;
    } catch (error) {
      logger.error(`[postDeliveryAutomator] Erro processando sessao ${session._id} (upsell_${diasAlvo}d):`, error.message);
    }
  }

  return { sent, skipped };
}

/**
 * Roda o upsell pós-entrega para todas as orgs com postDelivery ativado.
 */
async function run(organizationId = null) {
  const now = new Date();

  const orgQuery = organizationId ? { _id: organizationId } : { isActive: true };
  const orgs = await Organization.find(orgQuery)
    .select('_id name slug integrations')
    .lean();

  const orgMap = Object.fromEntries(orgs.map(o => [String(o._id), o]));
  const enabledOrgs = orgs.filter(o => o?.integrations?.salesAutomator?.postDelivery?.enabled);
  if (enabledOrgs.length === 0) return { sent: 0, skipped: 0 };

  // União dos níveis (dias antes da exclusão) das orgs ativas
  const niveisSet = new Set();
  for (const o of enabledOrgs) {
    const dias = o.integrations?.salesAutomator?.postDelivery?.daysSchedule || [];
    for (const d of dias) {
      if (Number.isFinite(d) && d > 0) niveisSet.add(d);
    }
  }

  const orgIds = enabledOrgs.map(o => o._id);
  let totalSent = 0;
  let totalSkipped = 0;

  for (const dia of [...niveisSet].sort((a, b) => b - a)) {
    const r = await processarNivel(dia, orgIds, orgMap, now);
    totalSent += r.sent;
    totalSkipped += r.skipped;
  }

  return { sent: totalSent, skipped: totalSkipped };
}

module.exports = { run };
