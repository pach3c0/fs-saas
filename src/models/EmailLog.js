const mongoose = require('mongoose');

// Registro de cada tentativa de envio de e-mail da plataforma.
// Alimentado pelo sendEmail() central em src/utils/email.js (fire-and-forget).
// Consumido pela aba Eventos (toggle E-mails) e pelo Diagnóstico por org.
const emailLogSchema = new mongoose.Schema({
  to: { type: String, index: true },
  subject: String,
  template: String,    // derivado do wrapper: 'welcome', 'gallery_available', 'ticket_reply'...
  orgSlug: String,     // quando o wrapper conhece a org (e-mails a clientes do fotógrafo)
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  ok: { type: Boolean, index: true },
  error: String,       // mensagem do SMTP quando ok=false
  skipped: { type: Boolean, default: false }, // SMTP não configurado (dev)
  at: { type: Date, default: Date.now }
}, { timestamps: false });

// TTL 90 dias
emailLogSchema.index({ at: 1 }, { expireAfterSeconds: 7776000 });
emailLogSchema.index({ ok: 1, at: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
