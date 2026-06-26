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
  // (legados Stripe — não usados; o gateway ativo é o Mercado Pago)
  stripeCustomerId: { type: String, default: null },
  stripeSubscriptionId: { type: String, default: null },
  currentPeriodEnd: { type: Date, default: null },
  cancelAtPeriodEnd: { type: Boolean, default: false },

  // Mercado Pago
  // id da assinatura (PreApproval) no MP — vem do webhook; usado p/ cancelar de verdade.
  mpPreapprovalId: { type: String, default: null },
  // plano que a org está fechando no checkout (gravado em /billing/checkout,
  // lido pelo webhook p/ mapear o plano sem depender de parsear o `reason`).
  pendingPlan: { type: String, default: null },

  // Preço personalizado por org (em centavos). Quando `> 0`, sobrescreve o preço
  // do catálogo (plans.js) no checkout DESTA org. `null` = usa o preço do plano.
  // Vale só na próxima assinatura — não altera assinatura já ativa no MP.
  customPriceCents: { type: Number, default: null },

  // Conta cortesia (sem cobrança — esposa, sócio, parceiro, conta de admin).
  // É só rótulo/controle: exibe selo no painel do cliente e some os CTAs de upgrade.
  // Os limites continuam definidos pelo plano + override.
  isCourtesy: { type: Boolean, default: false },
  courtesyNote: { type: String, default: '' },      // ex.: "Esposa", "Sócio"

  // Override de limites por org. Quando ligado, os `limits` abaixo são CUSTOMIZADOS
  // e não são sobrescritos ao trocar de plano. Desligar reverte ao plano base.
  overrideEnabled: { type: Boolean, default: false },

  // Limites de uso (efetivos). Espelham o plano base, salvo override ligado.
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