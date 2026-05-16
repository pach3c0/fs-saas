const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  ip: { type: String, required: true },
  userAgent: { type: String },
  event: { type: String, required: true }, // e.g., 'honey_pot_trap'
  route: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', null: true }
});

// Índice para limpeza automática após 30 dias para não inflar o banco
securityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('SecurityLog', securityLogSchema);
