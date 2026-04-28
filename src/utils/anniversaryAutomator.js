const Session = require('../models/Session');
const Organization = require('../models/Organization');
const {
  sendReactivation90dEmail,
  sendReactivation30dEmail,
  sendReactivation7dEmail
} = require('./email');

/**
 * Motor de reativacao anual (CRM Fase 2 - Fatia E)
 *
 * Para cada sessao recorrente cuja data do evento (eventDate) faz aniversario
 * em N dias (90/30/7), envia ao cliente um e-mail de reativacao com a 1a
 * foto do ensaio anterior como memoria visual.
 *
 * Eventos recorrentes (hard-coded por hora): aniversario, ensaio.
 *   - Casamento, formatura etc nao geram reativacao anual (one-shot).
 *
 * Idempotencia: o trigger persistido inclui o ano (ex: reactivation_90d_2026)
 * para que cada cliente receba no maximo 1 e-mail por nivel por ano.
 */

const RECURRING_TYPES = ['aniversario', 'ensaio'];

const TRIGGERS = {
  90: { name: 'reactivation_90d', sender: sendReactivation90dEmail },
  30: { name: 'reactivation_30d', sender: sendReactivation30dEmail },
  7:  { name: 'reactivation_7d',  sender: sendReactivation7dEmail }
};

/**
 * Compara dia/mes (ignorando ano) entre duas datas em UTC.
 * Casa 29/fev em ano nao-bissexto com 28/fev (suaviza edge case).
 */
function isAnniversaryToday(eventDate, targetDate) {
  if (!eventDate) return false;
  const ev = new Date(eventDate);
  const m = ev.getUTCMonth();
  const d = ev.getUTCDate();
  const tm = targetDate.getUTCMonth();
  const td = targetDate.getUTCDate();
  if (m === tm && d === td) return true;
  // 29/fev -> 28/fev fora de ano bissexto
  const isLeapTarget = ((targetDate.getUTCFullYear() % 4 === 0) && (targetDate.getUTCFullYear() % 100 !== 0)) || (targetDate.getUTCFullYear() % 400 === 0);
  if (m === 1 && d === 29 && tm === 1 && td === 28 && !isLeapTarget) return true;
  return false;
}

function formatEventDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

async function processarNivel(diasOffset, orgIds, orgMap, now) {
  const triggerCfg = TRIGGERS[diasOffset];
  if (!triggerCfg) return { sent: 0, skipped: 0 };

  // Data alvo: hoje + diasOffset (UTC midnight)
  const target = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + diasOffset
  ));
  const ano = target.getUTCFullYear();
  const triggerKey = `${triggerCfg.name}_${ano}`;

  // Buscar candidatas: sessoes recorrentes que ja completaram pelo menos ~11 meses
  const cutoff = new Date(now.getTime() - 11 * 30 * 24 * 60 * 60 * 1000);
  const sessions = await Session.find({
    organizationId: { $in: orgIds },
    isActive: true,
    eventType: { $in: RECURRING_TYPES },
    eventDate: { $exists: true, $ne: null, $lte: cutoff },
    clientEmail: { $ne: '' }
  }).select('name clientEmail eventDate eventType photos coverPhoto salesAutomation organizationId').lean();

  let sent = 0;
  let skipped = 0;

  for (const s of sessions) {
    try {
      if (!isAnniversaryToday(s.eventDate, target)) { skipped++; continue; }

      const org = orgMap[String(s.organizationId)];
      const cfg = org?.integrations?.salesAutomator;
      if (!cfg?.enabled) { skipped++; continue; }
      if (cfg.reactivation?.enabled === false) { skipped++; continue; }

      // Idempotencia anual: se ja disparou esse trigger neste ano, pula
      const triggers = s.salesAutomation?.sentTriggers || [];
      if (triggers.some(t => t.trigger === triggerKey)) { skipped++; continue; }

      // Foto memoria: cover ou primeira foto da sessao
      const memoryUrl = s.coverPhoto || (Array.isArray(s.photos) && s.photos[0]?.url) || '';
      const memoryFull = memoryUrl
        ? (memoryUrl.startsWith('http') ? memoryUrl : `${process.env.BASE_URL || 'https://app.cliquezoom.com.br'}${memoryUrl}`)
        : '';

      await triggerCfg.sender(
        s.clientEmail,
        '', // clientName desconhecido nesse nivel
        s.name,
        formatEventDate(s.eventDate),
        org.name,
        org.slug,
        memoryFull
      );

      // Persistir trigger (com sufixo de ano) — usa updateOne para nao perder concorrencia
      await Session.updateOne(
        { _id: s._id },
        { $push: { 'salesAutomation.sentTriggers': { trigger: triggerKey, sentAt: new Date(), couponCode: '' } } }
      );

      sent++;
    } catch (error) {
      console.error(`[anniversaryAutomator] Erro processando sessao ${s._id} (${triggerCfg.name}):`, error.message);
    }
  }

  return { sent, skipped };
}

async function run(organizationId = null) {
  const now = new Date();

  const orgQuery = organizationId ? { _id: organizationId } : { isActive: true };
  const orgs = await Organization.find(orgQuery)
    .select('_id name slug integrations')
    .lean();

  const orgMap = Object.fromEntries(orgs.map(o => [String(o._id), o]));
  const enabledOrgs = orgs.filter(o => o?.integrations?.salesAutomator?.enabled && o?.integrations?.salesAutomator?.reactivation?.enabled !== false);
  if (enabledOrgs.length === 0) return { sent: 0, skipped: 0 };

  // Coletar conjunto de niveis a processar
  const niveisSet = new Set();
  for (const o of enabledOrgs) {
    const dias = o.integrations?.salesAutomator?.reactivation?.daysBeforeAnniversary || [];
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
