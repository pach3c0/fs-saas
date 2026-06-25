const mongoose = require('mongoose');

// Resumos (briefings) de saúde da plataforma gerados pelo agente — agendados ou
// sob demanda. Texto pronto (markdown leve) + metadados de entrega.
const agentDigestSchema = new mongoose.Schema({
  period: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
  trigger: { type: String, enum: ['scheduled', 'manual'], default: 'scheduled' },
  text: { type: String, default: '' },
  emailedTo: { type: String, default: null },   // destinatário do e-mail, se enviado
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

agentDigestSchema.index({ createdAt: -1 });
// TTL 180 dias
agentDigestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15552000 });

module.exports = mongoose.model('AgentDigest', agentDigestSchema);
