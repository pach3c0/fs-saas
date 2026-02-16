const Session = require('../models/Session');
const Notification = require('../models/Notification');

/**
 * Verifica prazos de seleção e gera notificações
 * @param {string|null} organizationId - Opcional: filtrar por organização
 */
async function checkDeadlines(organizationId = null) {
  const now = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);

  const baseQuery = { isActive: true };
  if (organizationId) baseQuery.organizationId = organizationId;

  // 1. AVISO DE 3 DIAS
  // Busca sessões com prazo nos próximos 3 dias, não submetidas, sem aviso enviado
  const warningSessions = await Session.find({
    ...baseQuery,
    selectionDeadline: { $exists: true, $ne: null, $gt: now, $lte: threeDaysFromNow },
    selectionStatus: { $in: ['pending', 'in_progress'] },
    deadlineWarningSent: { $ne: true }
  });

  for (const session of warningSessions) {
    try {
      await Notification.create({
        type: 'deadline_warning', // Ícone sugerido: ⚠️
        sessionId: session._id,
        sessionName: session.name,
        message: `Prazo de seleção de ${session.name} vence em breve`,
        organizationId: session.organizationId
      });
      
      session.deadlineWarningSent = true;
      await session.save();
    } catch (error) {
      console.error(`Erro ao processar aviso para sessão ${session._id}:`, error);
    }
  }

  // 2. EXPIRAÇÃO
  // Busca sessões vencidas, não submetidas, sem aviso de expiração
  const expiredSessions = await Session.find({
    ...baseQuery,
    selectionDeadline: { $exists: true, $ne: null, $lt: now },
    selectionStatus: { $in: ['pending', 'in_progress'] },
    deadlineExpiredSent: { $ne: true }
  });

  for (const session of expiredSessions) {
    try {
      // Atualiza status e marca como notificado
      session.selectionStatus = 'expired';
      session.deadlineExpiredSent = true;
      
      await Notification.create({
        type: 'deadline_expired', // Ícone sugerido: ⏰
        sessionId: session._id,
        sessionName: session.name,
        message: `Prazo de seleção de ${session.name} expirou`,
        organizationId: session.organizationId
      });

      await session.save();
    } catch (error) {
      console.error(`Erro ao processar expiração para sessão ${session._id}:`, error);
    }
  }
  
  return { warnings: warningSessions.length, expired: expiredSessions.length };
}

module.exports = { checkDeadlines };