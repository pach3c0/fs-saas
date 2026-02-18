const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true, index: true },

  // Plano
  plan: {
    type: String,
    enum: ['free', 'basic', 'pro'],
    default: 'free'
  },

  // Status da assinatura
  status: {
    type: String,
    enum: ['active', 'past_due', 'canceled', 'trialing'],
    default: 'active'
  },

  // Pagamento
  stripeCustomerId: { type: String, default: null },
  stripeSubscriptionId: { type: String, default: null },
  currentPeriodEnd: { type: Date, default: null },
  cancelAtPeriodEnd: { type: Boolean, default: false },

  // Trial
  trialEndsAt: { type: Date, default: null },

  // Limites de uso
  limits: {
    maxSessions: { type: Number, default: 5 },      // free: 5, basic: 50, pro: unlimited (-1)
    maxPhotos: { type: Number, default: 100 },      // free: 100, basic: 5000, pro: unlimited
    maxAlbums: { type: Number, default: 1 },        // free: 1, basic: 10, pro: unlimited
    maxStorage: { type: Number, default: 500 },     // MB
    customDomain: { type: Boolean, default: false }
  },

  // Uso atual (incrementar ao criar sessões/fotos/álbuns)
  usage: {
    sessions: { type: Number, default: 0 },
    photos: { type: Number, default: 0 },
    albums: { type: Number, default: 0 },
    storage: { type: Number, default: 0 }  // MB
  }

}, { timestamps: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);