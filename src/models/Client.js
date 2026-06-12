const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  notes: { type: String, default: '' },
  cpf: { type: String, default: '' },
  // Mapeamento da migração para o Rhyno (CRM principal): id do Customer no ERP.
  // Preenchido pelo script de migração; também serve de idempotência (já migrado).
  rhynoCustomerId: { type: String, default: null },
  tags: [String],
  // CRM Fase 1: dados de inteligencia de negocio
  birthDate: { type: Date, default: null },
  lastEventType: { type: String, default: '' },
  lastEventDate: { type: Date, default: null },
  lifetimeValue: { type: Number, default: 0 },
  // CRM reativacao: data configurada pelo fotografo para envio automatico de e-mail
  nextContactDate: { type: Date, default: null },
  contactHistory: [{
    sentAt: { type: Date },
    note: { type: String, default: '' }
  }]
}, { timestamps: true });

// Email unico por organizacao (sparse para permitir email vazio)
ClientSchema.index({ organizationId: 1, email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Client', ClientSchema);
