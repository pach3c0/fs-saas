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
  tags: [String]
}, { timestamps: true });

// Email unico por organizacao (sparse para permitir email vazio)
ClientSchema.index({ organizationId: 1, email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Client', ClientSchema);
