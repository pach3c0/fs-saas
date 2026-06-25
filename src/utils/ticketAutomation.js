// Automação de ciclo de vida do chamado de suporte.
// Quando um chamado está "pending" (admin ou IA respondeu por último → a bola
// está com o fotógrafo), conta o tempo de silêncio:
//   1) Após REMINDER_AFTER (default 24h) sem retorno → envia um LEMBRETE
//      (mensagem no chamado + e-mail) perguntando se já resolveu e avisando que
//      será concluído em ~1h.
//   2) Após CLOSE_AFTER_REMINDER (default 1h) do lembrete, ainda sem retorno →
//      conclui o chamado como "resolved" (mensagem + e-mail).
// Se o fotógrafo responde, a rota de resposta zera o relógio (reminderSentAt=null)
// e o status volta para "open", saindo deste fluxo.
// Durações configuráveis por env: TICKET_REMINDER_HOURS, TICKET_CLOSE_AFTER_REMINDER_HOURS.
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendTicketFollowupEmail, sendTicketAutoClosedEmail } = require('./email');
const logger = require('./logger');

const HOUR = 60 * 60 * 1000;
const REMINDER_AFTER_MS = (Number(process.env.TICKET_REMINDER_HOURS) || 24) * HOUR;
const CLOSE_AFTER_REMINDER_MS = (Number(process.env.TICKET_CLOSE_AFTER_REMINDER_HOURS) || 1) * HOUR;

const FOLLOWUP_TEXT = 'Estamos aguardando seu retorno neste chamado. Se o problema já foi resolvido, pode desconsiderar. Caso ainda precise de ajuda, responda por aqui — sem retorno, vamos concluir este chamado automaticamente em cerca de 1 hora.';
const CLOSE_TEXT = 'Como não tivemos retorno, este chamado foi concluído. Se precisar, é só abrir um novo chamado quando quiser.';

async function run() {
  const now = Date.now();
  const pendings = await Ticket.find({ status: 'pending' }).limit(300);

  for (const t of pendings) {
    const msgs = t.messages || [];
    const last = msgs[msgs.length - 1];
    // Só age quando a última mensagem é do admin/IA (a bola está com o fotógrafo).
    if (!last || last.from !== 'admin') continue;

    const reminded = t.autoClose?.reminderSentAt ? new Date(t.autoClose.reminderSentAt).getTime() : null;

    try {
      if (!reminded) {
        // Fase 1 — lembrete após o silêncio inicial.
        if (now - new Date(last.at).getTime() < REMINDER_AFTER_MS) continue;
        t.messages.push({ from: 'admin', text: FOLLOWUP_TEXT, at: new Date() });
        if (!t.autoClose) t.autoClose = {};
        t.autoClose.reminderSentAt = new Date();
        await t.save();
        const user = await User.findOne({ organizationId: t.organizationId }).select('email name').lean();
        if (user?.email) await sendTicketFollowupEmail(user.email, user.name, t.subject);
        await Notification.create({ type: 'ticket_reply', message: `Aguardando seu retorno: ${t.subject}`, organizationId: t.organizationId });
        logger.info('[ticketAutomation] lembrete enviado', { ticketId: String(t._id) });
      } else {
        // Fase 2 — conclui após o prazo do lembrete.
        if (now - reminded < CLOSE_AFTER_REMINDER_MS) continue;
        t.messages.push({ from: 'admin', text: CLOSE_TEXT, at: new Date() });
        t.status = 'resolved';
        t.closedAt = new Date();
        await t.save();
        const user = await User.findOne({ organizationId: t.organizationId }).select('email name').lean();
        if (user?.email) await sendTicketAutoClosedEmail(user.email, user.name, t.subject);
        await Notification.create({ type: 'ticket_reply', message: `Chamado concluído: ${t.subject}`, organizationId: t.organizationId });
        logger.info('[ticketAutomation] chamado auto-concluído', { ticketId: String(t._id) });
      }
    } catch (e) {
      logger.error('[ticketAutomation] erro ao processar chamado', { ticketId: String(t._id), error: e.message });
    }
  }
}

module.exports = { run };
