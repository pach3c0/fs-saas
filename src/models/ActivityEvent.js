const mongoose = require('mongoose');

const activityEventSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'login',                    // fotógrafo fez login
      'session_created',          // criou uma sessão
      'photos_uploaded',          // upload de fotos completo
      'code_sent',                // enviou código de acesso
      'code_viewed_by_client',    // cliente visualizou o código
      'selection_submitted',      // cliente finalizou seleção
      'session_delivered',        // sessão foi entregue
      'feature_configured',       // configurou uma feature (marca d'água, integrações, etc)
      'plan_upgraded',            // mudou de plano
      'domain_verified',          // domínio customizado verificado
      'support_ticket_created',   // abriu chamado de suporte
      'support_ticket_resolved'   // suporte respondeu
    ],
    required: true,
    index: true
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // sessionId, photoCount, featureName, newPlan, domain, ticketId, etc
  },
  at: {
    type: Date,
    default: Date.now
    // index { at: 1 } definido abaixo com TTL — não duplicar com index: true
  }
}, { timestamps: false });

// TTL para performance (manter apenas últimos 180 dias)
activityEventSchema.index({ at: 1 }, { expireAfterSeconds: 15552000 });

module.exports = mongoose.model('ActivityEvent', activityEventSchema);
