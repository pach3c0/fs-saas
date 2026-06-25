const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['duvida', 'bug', 'financeiro', 'sugestao', 'outro'],
    default: 'duvida'
  },
  status: {
    type: String,
    enum: ['open', 'pending', 'resolved'],
    default: 'open'
  },
  messages: [{
    from: {
      type: String,
      enum: ['photographer', 'admin'],
      required: true
    },
    text: {
      type: String,
      required: true
    },
    attachmentUrl: String,
    at: {
      type: Date,
      default: Date.now
    },
    readAt: Date
  }],
  closedAt: Date,
  // Automação de follow-up / auto-encerramento por falta de resposta do fotógrafo.
  // reminderSentAt = quando o lembrete ("ainda precisa de ajuda?") foi enviado;
  // zera (=null) sempre que alguém responde (admin/IA ou fotógrafo).
  autoClose: {
    reminderSentAt: { type: Date, default: null }
  }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
