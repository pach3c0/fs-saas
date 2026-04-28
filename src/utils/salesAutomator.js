const Session = require('../models/Session');
const Organization = require('../models/Organization');
const { sendScarcity7dEmail } = require('./email');

/**
 * Motor de vendas automaticas (CRM Fase 2 - Fatia A)
 *
 * Gatilho de escassez: detecta sessoes de selecao com prazo proximo e fotos
 * nao selecionadas, gera cupom e dispara e-mail de urgencia para o cliente.
 *
 * Fatia A: somente trigger de 7 dias. Fatia B adiciona 15d/3d/1d.
 *
 * Idempotencia: cada (sessionId, trigger) so dispara uma vez via salesAutomation.sentTriggers.
 */

const TRIGGER_NAME = 'scarcity_7d';
const TRIGGER_DAYS = 7;
const WINDOW_HOURS = 12; // janela de tolerancia (cron roda a cada 6h)

/**
 * Gera codigo de cupom no formato {prefix}-{sessionId6}-7D
 */
function gerarCouponCode(prefix, sessionId) {
  const id6 = String(sessionId).slice(-6).toUpperCase();
  const safePrefix = (prefix || 'CZ').replace(/[^A-Z0-9]/gi, '').toUpperCase() || 'CZ';
  return `${safePrefix}-${id6}-7D`;
}

async function run(organizationId = null) {
  const now = new Date();

  // Janela: deadline entre [now + 7d - 12h, now + 7d + 12h]
  const targetMs = TRIGGER_DAYS * 24 * 60 * 60 * 1000;
  const windowMs = WINDOW_HOURS * 60 * 60 * 1000;
  const lower = new Date(now.getTime() + targetMs - windowMs);
  const upper = new Date(now.getTime() + targetMs + windowMs);

  const orgQuery = organizationId ? { _id: organizationId } : { isActive: true };
  const orgs = await Organization.find(orgQuery)
    .select('_id name slug integrations')
    .lean();

  const orgMap = Object.fromEntries(orgs.map(o => [String(o._id), o]));
  const orgIds = orgs
    .filter(o => o?.integrations?.salesAutomator?.enabled)
    .map(o => o._id);

  if (orgIds.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  const sessions = await Session.find({
    organizationId: { $in: orgIds },
    isActive: true,
    mode: { $in: ['selection', 'multi_selection'] },
    selectionStatus: { $in: ['pending', 'in_progress', 'submitted'] },
    selectionDeadline: { $gte: lower, $lte: upper },
    'salesAutomation.enabled': { $ne: false }
  });

  let sent = 0;
  let skipped = 0;

  for (const session of sessions) {
    try {
      const org = orgMap[String(session.organizationId)];
      const cfg = org?.integrations?.salesAutomator;
      if (!cfg?.enabled) { skipped++; continue; }
      if (cfg.scarcity?.enabled === false) { skipped++; continue; }

      // Idempotencia: ja disparou esse trigger?
      const triggers = session.salesAutomation?.sentTriggers || [];
      if (triggers.some(t => t.trigger === TRIGGER_NAME)) { skipped++; continue; }

      // Calcular fotos restantes (fotos nao escolhidas pelo cliente)
      const totalFotos = Array.isArray(session.photos) ? session.photos.length : 0;
      const selecionadas = Array.isArray(session.selectedPhotos) ? session.selectedPhotos.length : 0;
      const restantes = Math.max(0, totalFotos - selecionadas);

      // Sem fotos sobrando = nao tem o que vender
      if (restantes <= 0) { skipped++; continue; }
      if (!session.clientEmail) { skipped++; continue; }

      const couponCode = gerarCouponCode(cfg.couponPrefix, session._id);
      const discount = cfg.couponDiscountPercent || 10;

      await sendScarcity7dEmail(
        session.clientEmail,
        '', // clientName - nao temos garantido na sessao
        session.name,
        org.name,
        restantes,
        couponCode,
        discount,
        session.accessCode,
        org.slug
      ).catch(err => {
        console.error(`[salesAutomator] Falha ao enviar e-mail sessao ${session._id}:`, err.message);
        throw err;
      });

      // Persistir trigger (idempotencia futura)
      session.salesAutomation = session.salesAutomation || { enabled: true, sentTriggers: [] };
      session.salesAutomation.sentTriggers = session.salesAutomation.sentTriggers || [];
      session.salesAutomation.sentTriggers.push({
        trigger: TRIGGER_NAME,
        sentAt: new Date(),
        couponCode
      });
      await session.save();
      sent++;
    } catch (error) {
      console.error(`[salesAutomator] Erro processando sessao ${session._id}:`, error.message);
    }
  }

  return { sent, skipped };
}

module.exports = { run };
