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
  tags: [String],
  // CRM Fase 1: dados de inteligencia de negocio
  birthDate: { type: Date, default: null },
  lastEventType: { type: String, default: '' },
  lastEventDate: { type: Date, default: null },
  lifetimeValue: { type: Number, default: 0 }
}, { timestamps: true });

// Email unico por organizacao (sparse para permitir email vazio)
ClientSchema.index({ organizationId: 1, email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Client', ClientSchema);
