const Session = require('../models/Session');
const Notification = require('../models/Notification');
const Organization = require('../models/Organization');
const { sendDeadlineWarningEmail, sendDeadlineExpiredEmail } = require('./email');

/**
 * Verifica prazos de seleção, gera notificações e envia e-mails se org tiver automação ativada.
 * @param {string|null} organizationId - Opcional: filtrar por organização
 */
async function checkDeadlines(organizationId = null) {
  const now = new Date();

  const baseQuery = { isActive: true };
  if (organizationId) baseQuery.organizationId = organizationId;

  // Carregar configs das orgs relevantes em uma única query
  const orgQuery = organizationId ? { _id: organizationId } : { isActive: true };
  const orgs = await Organization.find(orgQuery)
    .select('_id name integrations')
    .lean();
  const orgMap = Object.fromEntries(orgs.map(o => [String(o._id), o]));

  // 1. AVISO DE PRAZO
  // Busca sessões com prazo próximo (dentro do daysWarning configurado), não submetidas, sem aviso enviado.
  // Usamos o maior daysWarning possível (7) para buscar candidatos e filtramos por org abaixo.
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const warningSessions = await Session.find({
    ...baseQuery,
    selectionDeadline: { $exists: true, $ne: null, $gt: now, $lte: sevenDaysFromNow },
    selectionStatus: { $in: ['pending', 'in_progress'] },
    deadlineWarningSent: { $ne: true }
  });

  let warnings = 0;
  for (const session of warningSessions) {
    try {
      const org = orgMap[String(session.organizationId)];
      const automation = org?.integrations?.deadlineAutomation;
      const daysWarning = automation?.daysWarning ?? 3;

      const msLeft = new Date(session.selectionDeadline) - now;
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      // Só processa se dentro do threshold configurado para esta org
      if (daysLeft > daysWarning) continue;

      await Notification.create({
        type: 'deadline_warning',
        sessionId: session._id,
        sessionName: session.name,
        message: `Prazo de seleção de ${session.name} vence em breve`,
        organizationId: session.organizationId
      });

      if (automation?.enabled && automation?.sendEmail && session.clientEmail) {
        sendDeadlineWarningEmail(session.clientEmail, session.name, daysLeft, org.name).catch(() => {});
      }

      session.deadlineWarningSent = true;
      await session.save();
      warnings++;
    } catch (error) {
      console.error(`[deadlineChecker] Erro aviso sessão ${session._id}:`, error);
    }
  }

  // 2. EXPIRAÇÃO
  const expiredSessions = await Session.find({
    ...baseQuery,
    selectionDeadline: { $exists: true, $ne: null, $lt: now },
    selectionStatus: { $in: ['pending', 'in_progress'] },
    deadlineExpiredSent: { $ne: true }
  });

  let expired = 0;
  for (const session of expiredSessions) {
    try {
      const org = orgMap[String(session.organizationId)];
      const automation = org?.integrations?.deadlineAutomation;

      session.selectionStatus = 'expired';
      session.deadlineExpiredSent = true;

      await Notification.create({
        type: 'deadline_expired',
        sessionId: session._id,
        sessionName: session.name,
        message: `Prazo de seleção de ${session.name} expirou`,
        organizationId: session.organizationId
      });

      if (automation?.enabled && automation?.sendEmail && session.clientEmail) {
        sendDeadlineExpiredEmail(session.clientEmail, session.name, org.name).catch(() => {});
      }

      await session.save();
      expired++;
    } catch (error) {
      console.error(`[deadlineChecker] Erro expiração sessão ${session._id}:`, error);
    }
  }

  return { warnings, expired };
}

module.exports = { checkDeadlines };
