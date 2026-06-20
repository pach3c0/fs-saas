const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const { createUploader } = require('../utils/multerConfig');
const { sendTicketReplyEmail } = require('../utils/email');
const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { trackEvent } = require('../utils/activityTracker');

const uploader = createUploader('tickets', { maxFiles: 1, maxSize: 5 * 1024 * 1024 });

// FOTÓGRAFO — criar ticket
router.post('/tickets', authenticateToken, uploader.single('attachment'), async (req, res) => {
  try {
    const { subject, category, text } = req.body;
    const orgId = req.user.organizationId;

    if (!subject?.trim()) {
      return res.status(400).json({ success: false, error: 'Assunto é obrigatório' });
    }
    if (!text?.trim()) {
      return res.status(400).json({ success: false, error: 'Mensagem é obrigatória' });
    }

    const ticket = new Ticket({
      organizationId: orgId,
      subject: subject.trim(),
      category: category || 'duvida',
      messages: [{
        from: 'photographer',
        text: text.trim(),
        attachmentUrl: req.file ? `${process.env.BASE_URL || ''}/uploads/${orgId}/tickets/${req.file.filename}` : undefined,
        at: new Date()
      }]
    });

    await ticket.save();

    // Track support ticket creation
    trackEvent(orgId, req.user.userId, 'support_ticket_created', {
      ticketId: ticket._id,
      category: ticket.category
    });

    req.logger.info('Ticket criado', { ticketId: ticket._id });
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    req.logger.error('Erro ao criar ticket', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// FOTÓGRAFO — listar próprios tickets
router.get('/tickets', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const tickets = await Ticket.find({ organizationId: orgId })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ success: true, tickets });
  } catch (error) {
    req.logger.error('Erro ao listar tickets', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// FOTÓGRAFO — obter ticket com mensagens
router.get('/tickets/:id', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const ticket = await Ticket.findOne({ _id: req.params.id, organizationId: orgId }).lean();

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket não encontrado' });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    req.logger.error('Erro ao obter ticket', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// FOTÓGRAFO — responder no ticket
router.post('/tickets/:id/reply', authenticateToken, uploader.single('attachment'), async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ success: false, error: 'Mensagem é obrigatória' });
    }

    const ticket = await Ticket.findOne({ _id: req.params.id, organizationId: orgId });
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket não encontrado' });
    }

    ticket.messages.push({
      from: 'photographer',
      text: text.trim(),
      attachmentUrl: req.file ? `${process.env.BASE_URL || ''}/uploads/${orgId}/tickets/${req.file.filename}` : undefined,
      at: new Date()
    });

    // Se estava aguardando resposta, volta a aberto
    if (ticket.status === 'pending') {
      ticket.status = 'open';
    }

    await ticket.save();
    req.logger.info('Resposta adicionada ao ticket', { ticketId: ticket._id });
    res.json({ success: true, ticket });
  } catch (error) {
    req.logger.error('Erro ao responder ticket', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// FOTÓGRAFO — marcar mensagens do admin como lidas
router.put('/tickets/:id/read', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const ticket = await Ticket.findOne({ _id: req.params.id, organizationId: orgId });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket não encontrado' });
    }

    ticket.messages.forEach(msg => {
      if (msg.from === 'admin' && !msg.readAt) {
        msg.readAt = new Date();
      }
    });

    await ticket.save();
    res.json({ success: true, ticket });
  } catch (error) {
    req.logger.error('Erro ao marcar mensagens como lidas', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// SUPERADMIN — listar todos os tickets com filtros
router.get('/admin/tickets', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { status, category } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;

    const tickets = await Ticket.find(query)
      .populate('organizationId', 'name slug')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, tickets });
  } catch (error) {
    req.logger.error('Erro ao listar tickets (admin)', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// SUPERADMIN — responder ticket
router.post('/admin/tickets/:id/reply', authenticateToken, requireSuperadmin, uploader.single('attachment'), async (req, res) => {
  try {
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ success: false, error: 'Mensagem é obrigatória' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket não encontrado' });
    }

    // Buscar organização para pegar e-mail do fotógrafo
    const org = await Organization.findById(ticket.organizationId).lean();
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organização não encontrada' });
    }

    // Buscar fotógrafo para e-mail
    const user = await User.findOne({ organizationId: ticket.organizationId }).lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    // Adicionar mensagem
    ticket.messages.push({
      from: 'admin',
      text: text.trim(),
      attachmentUrl: req.file ? `${process.env.BASE_URL || ''}/uploads/${ticket.organizationId}/tickets/${req.file.filename}` : undefined,
      at: new Date()
    });

    // Mudar status para pendente (aguardando resposta do fotógrafo)
    ticket.status = 'pending';

    await ticket.save();

    // Criar notificação para o fotógrafo
    await Notification.create({
      type: 'ticket_reply',
      message: `Nova resposta no chamado: ${ticket.subject}`,
      organizationId: ticket.organizationId
    });

    // Enviar e-mail
    await sendTicketReplyEmail(user.email, user.name, ticket.subject, text.trim());

    req.logger.info('Resposta de admin adicionada ao ticket', { ticketId: ticket._id });
    res.json({ success: true, ticket });
  } catch (error) {
    req.logger.error('Erro ao responder ticket (admin)', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// SUPERADMIN — mudar status do ticket
router.put('/admin/tickets/:id/status', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['open', 'pending', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status inválido' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket não encontrado' });
    }

    ticket.status = status;

    if (status === 'resolved') {
      ticket.closedAt = new Date();
    } else {
      ticket.closedAt = undefined;
    }

    await ticket.save();
    req.logger.info('Status do ticket atualizado', { ticketId: ticket._id, newStatus: status });
    res.json({ success: true, ticket });
  } catch (error) {
    req.logger.error('Erro ao atualizar status do ticket', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
