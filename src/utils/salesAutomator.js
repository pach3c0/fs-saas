const Session = require('../models/Session');
const Organization = require('../models/Organization');
const {
  sendScarcity15dEmail,
  sendScarcity7dEmail,
  sendScarcity3dEmail,
  sendScarcity24hEmail
} = require('./email');

/**
 * Motor de vendas automaticas (CRM Fase 2 - Fatia B)
 *
 * Gatilho de escassez: detecta sessoes de selecao com prazo proximo e fotos
 * nao selecionadas, gera cupom e dispara e-mail de urgencia para o cliente.
 *
 * Niveis suportados (definidos em org.integrations.salesAutomator.scarcity.daysSchedule):
 *   15d -> aviso suave, sem cupom
 *    7d -> primeira oferta com cupom
 *    3d -> ultima chance com cupom (urgencia)
 *    1d -> alerta final 24h com cupom
 *
 * Idempotencia: cada (sessionId, trigger) so dispara uma vez via
 * salesAutomation.sentTriggers.
 */

const WINDOW_HOURS = 12; // janela de tolerancia (cron roda a cada 6h)

// Mapa de configuracao por nivel de gatilho
const TRIGGERS = {
  15: { name: 'scarcity_15d', sender: sendScarcity15dEmail, withCoupon: false, suffix: '15D' },
  7:  { name: 'scarcity_7d',  sender: sendScarcity7dEmail,  withCoupon: true,  suffix: '7D' },
  3:  { name: 'scarcity_3d',  sender: sendScarcity3dEmail,  withCoupon: true,  suffix: '3D' },
  1:  { name: 'scarcity_24h', sender: sendScarcity24hEmail, withCoupon: true,  suffix: '24H' }
};

function gerarCouponCode(prefix, sessionId, suffix) {
  const id6 = String(sessionId).slice(-6).toUpperCase();
  const safePrefix = (prefix || 'CZ').replace(/[^A-Z0-9]/gi, '').toUpperCase() || 'CZ';
  return `${safePrefix}-${id6}-${suffix}`;
}

/**
 * Processa um nivel de gatilho especifico (ex: 7 dias).
 */
async function processarNivel(diasAlvo, orgIds, orgMap, now) {
  const triggerCfg = TRIGGERS[diasAlvo];
  if (!triggerCfg) return { sent: 0, skipped: 0 };

  const targetMs = diasAlvo * 24 * 60 * 60 * 1000;
  const windowMs = WINDOW_HOURS * 60 * 60 * 1000;
  const lower = new Date(now.getTime() + targetMs - windowMs);
  const upper = new Date(now.getTime() + targetMs + windowMs);

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

      // Idempotencia
      const triggers = session.salesAutomation?.sentTriggers || [];
      if (triggers.some(t => t.trigger === triggerCfg.name)) { skipped++; continue; }

      const totalFotos = Array.isArray(session.photos) ? session.photos.length : 0;
      const selecionadas = Array.isArray(session.selectedPhotos) ? session.selectedPhotos.length : 0;
      const restantes = Math.max(0, totalFotos - selecionadas);

      if (restantes <= 0) { skipped++; continue; }
      if (!session.clientEmail) { skipped++; continue; }

      let couponCode = '';
      const discount = cfg.couponDiscountPercent || 10;
      if (triggerCfg.withCoupon) {
        couponCode = gerarCouponCode(cfg.couponPrefix, session._id, triggerCfg.suffix);
      }

      // Disparo: cada template tem assinatura propria
      if (triggerCfg.withCoupon) {
        await triggerCfg.sender(
          session.clientEmail, '', session.name, org.name,
          restantes, couponCode, discount, session.accessCode, org.slug
        );
      } else {
        await triggerCfg.sender(
          session.clientEmail, '', session.name, org.name,
          restantes, session.accessCode, org.slug
        );
      }

      session.salesAutomation = session.salesAutomation || { enabled: true, sentTriggers: [] };
      session.salesAutomation.sentTriggers = session.salesAutomation.sentTriggers || [];
      session.salesAutomation.sentTriggers.push({
        trigger: triggerCfg.name,
        sentAt: new Date(),
        couponCode
      });
      await session.save();
      sent++;
    } catch (error) {
      console.error(`[salesAutomator] Erro processando sessao ${session._id} (${triggerCfg.name}):`, error.message);
    }
  }

  return { sent, skipped };
}

/**
 * Roda o motor de escassez para todas as orgs com automacao ativada.
 * Itera sobre cada nivel de daysSchedule configurado pela org.
 */
async function run(organizationId = null) {
  const now = new Date();

  const orgQuery = organizationId ? { _id: organizationId } : { isActive: true };
  const orgs = await Organization.find(orgQuery)
    .select('_id name slug integrations')
    .lean();

  const orgMap = Object.fromEntries(orgs.map(o => [String(o._id), o]));
  const enabledOrgs = orgs.filter(o => o?.integrations?.salesAutomator?.enabled);
  if (enabledOrgs.length === 0) return { sent: 0, skipped: 0 };

  // Coleta o conjunto de niveis a processar (uniao de daysSchedule entre orgs ativas)
  const niveisSet = new Set();
  for (const o of enabledOrgs) {
    const dias = o.integrations?.salesAutomator?.scarcity?.daysSchedule || [];
    for (const d of dias) {
      if (TRIGGERS[d]) niveisSet.add(d);
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
