const mongoose = require('mongoose');

// Central de erros/avisos da plataforma — alimentada pelo transport do Winston
// (backend) e pelo POST /api/client-error (erros JS do frontend).
// Consumida pela aba "Eventos" do SaaS Admin e pelo Diagnóstico por org.
const platformLogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['error', 'warn'],
    required: true
  },
  message: { type: String, default: '' },        // truncada em 2000 chars na escrita
  source: {
    type: String,
    enum: ['backend', 'frontend-admin', 'frontend-cliente', 'frontend-album'],
    default: 'backend',
    index: true
  },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  userId: String,
  requestId: String,    // chave para deep-dive nos arquivos Winston via SSH
  stack: String,        // truncada em 4000 chars
  url: String,          // path da request (backend) ou location.href (frontend)
  status: Number,       // statusCode quando vier do middleware de request
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  at: { type: Date, default: Date.now }
}, { timestamps: false });

// TTL 30 dias — mesmo padrão do SecurityLog
platformLogSchema.index({ at: 1 }, { expireAfterSeconds: 2592000 });
platformLogSchema.index({ organizationId: 1, at: -1 });
platformLogSchema.index({ level: 1, at: -1 });

module.exports = mongoose.model('PlatformLog', platformLogSchema);
