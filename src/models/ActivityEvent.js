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
      'client_entered',           // cliente entrou na galeria (validou o código de acesso)
      'selection_submitted',      // cliente finalizou seleção
      'extra_requested',          // cliente pediu fotos extras
      'extra_responded',          // fotógrafo respondeu o pedido de extras (aceitou/recusou)
      'photos_downloaded',        // cliente baixou fotos (individual ou ZIP)
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
    // index { at: 1 } definido abaixo (sem TTL) — não duplicar com index: true
  }
}, { timestamps: false });

// Histórico PERMANENTE (decisão do dono): a jornada do fotógrafo + clientes não expira.
// Antes havia TTL de 180 dias aqui. Em prod o índice TTL já criado NÃO é alterado só por
// trocar o código — a integradora precisa dropar/recriar o índice (ver skills/pronto-*).
activityEventSchema.index({ at: 1 });
// Índice composto para o drill do super admin (jornada de UMA org por data).
activityEventSchema.index({ organizationId: 1, at: -1 });

module.exports = mongoose.model('ActivityEvent', activityEventSchema);
