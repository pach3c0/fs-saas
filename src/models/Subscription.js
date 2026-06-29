const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true, index: true },

  // Plano
  plan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'studio'],
    default: 'free'
  },

  // Status da assinatura
  status: {
    type: String,
    enum: ['active', 'past_due', 'canceled', 'trialing', 'pending'],
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
  // Unicidade garantida por ÍNDICE PARCIAL (definido após o schema), não no campo:
  // o antigo `unique+sparse` indexava `null` explícito (default do campo) e fazia o 2º
  // cadastro novo colidir (E11000 {mpPreapprovalId:null}). O índice parcial só indexa
  // quando o valor é STRING → nulls/ausentes ilimitados, strings continuam únicas.
  mpPreapprovalId: { type: String, default: null },
  // ID da última notificação processada (idempotência). Impede reprocessar o mesmo evento
  // quando o MP faz retry automático da mesma notificação.
  lastEventId: { type: String, default: null },
  // plano que a org está fechando no checkout (gravado em /billing/checkout,
  // lido pelo webhook p/ mapear o plano sem depender de parsear o `reason`).
  pendingPlan: { type: String, default: null },

  // Data em que a assinatura paga ATUAL entrou em vigor. Base para calcular a janela de
  // arrependimento do CDC (Art. 49 — 7 dias corridos). Gravada quando a assinatura vira
  // `active` (checkout autorizado ou webhook), zerada ao reverter pro Free.
  subscribedAt: { type: Date, default: null },
  // Plano imediatamente ANTES da troca atual (gravado no checkout, antes de aplicar o novo).
  // Reservado p/ Fase 2 (reverter pro plano pago anterior num upgrade estornado). Hoje só registro.
  previousPlan: { type: String, default: null },

  // F4 — Faturas recorrentes (evento `subscription_authorized_payment` do MP).
  // Observabilidade + inadimplência: cada cobrança mensal da PreApproval viva atualiza isto.
  lastPaymentAt: { type: Date, default: null },          // data da última fatura processada
  lastPaymentStatus: { type: String, default: null },    // 'approved' | 'rejected' | status do MP
  // Idempotência DEDICADA das faturas (separada de lastEventId, que é do ciclo de vida da
  // assinatura) — evita que um evento de fatura sobrescreva a idempotência do preapproval e vice-versa.
  lastPaymentEventId: { type: String, default: null },
  // (Legado) Idempotência por id de NOTIFICAÇÃO. Substituída por refundedPaymentIds: o mesmo
  // estorno físico chega por 2 tópicos com ids de notificação DIFERENTES → dedup por evento
  // deixava passar a 2ª entrega. Mantido só p/ não exigir migração; não é mais a chave de dedup.
  lastRefundEventId: { type: String, default: null },
  // Idempotência de ESTORNO/CHARGEBACK pelo PAGAMENTO FÍSICO (payment.id). Um mesmo estorno
  // tem o MESMO payment.id nos tópicos 'payment', 'subscription_authorized_payment' e
  // 'topic_chargebacks_wh' → dedup cross-tópico. Persiste através de re-assinatura, então um
  // estorno antigo reentregue DEPOIS de o cliente re-assinar NÃO derruba a sub nova. O id só é
  // gravado APÓS o revert concluir → se o revert lançar, o MP retenta e o estorno não se perde.
  refundedPaymentIds: { type: [String], default: [] },

  // Marca terminal de "revertida por estorno/chargeback" (CDC). Serve de:
  //  • idempotência do PRÓPRIO revert (não rebaixa/audita 2× para o mesmo estorno);
  //  • guarda anti-RESSURREIÇÃO: eventos de ativação atrasados/reenviados (payment approved,
  //    preapproval authorized) NÃO podem reativar uma sub já revertida (recobrar pós-estorno
  //    violaria o CDC Art. 42). É LIMPA em um novo checkout legítimo (re-assinatura).
  revertedAt: { type: Date, default: null },

  // O cancelamento da recorrência no MP falhou de forma TRANSIENTE (5xx/timeout) durante um
  // estorno. O id da preapproval é PRESERVADO e este flag liga → o graceChecker re-tenta
  // cancelar (senão a recorrência seguiria viva cobrando após o estorno — devolução em dobro).
  mpCancelPending: { type: Boolean, default: false },

  // ── Fase 2 — Reembolso de ARREPENDIMENTO (CDC Art. 49, janela de 7 dias) ──
  // payment.id da PRIMEIRA fatura desta assinatura (capturado no webhook de fatura). É o
  // pagamento estornado no "reembolso integral" da 1ª compra — NUNCA o lastPaymentId, que é
  // sobrescrito a cada renovação (estornaria a fatura errada). Limpo no revert e numa nova
  // assinatura (cada assinatura captura a sua própria 1ª fatura).
  firstPaymentId: { type: String, default: null },
  // Trava de idempotência do refund VOLUNTÁRIO: ligada ANTES de chamar a API de refund do MP.
  // Se o processo cair entre o refund e o revert local, o webhook 'refunded' conclui o revert
  // (auto-cura); isto impede disparar um 2º refund enquanto um está em curso. O revert a zera.
  refundInFlight: { type: Boolean, default: false },
  // Congelamento COMERCIAL pós-reembolso (gate "moderado"): bloqueia NOVOS uploads e a VENDA
  // automática de fotos extras, mas mantém legíveis as galerias já entregues (não pune o cliente
  // final do fotógrafo). Evita que o arrependimento (dinheiro devolvido) vire um mês grátis de
  // uso pleno do storage/venda. Ligado no revert por refund; desligado numa nova assinatura
  // (ou na mão pelo super-admin). Contas protegidas/override/cortesia nunca são congeladas.
  storageFrozen: { type: Boolean, default: false },

  // Preço personalizado por org (em centavos). Quando `> 0`, sobrescreve o preço
  // do catálogo (plans.js) no checkout DESTA org. `null` = usa o preço do plano.
  // Vale só na próxima assinatura — não altera assinatura já ativa no MP.
  customPriceCents: { type: Number, default: null },

  // Storage adicional recorrente (camada aditiva sobre o plano). É somado por cima
  // do limite base e do valor mensal — ver src/services/subscriptionPricing.js.
  // Sobrevive a troca de plano (o webhook só reseta `limits`, não estes campos).
  // 0 = sem adicional. Cobrado na mensalidade enquanto a assinatura estiver ativa.
  storageAddonGB: { type: Number, default: 0 },          // GB extras sobre o plano
  storageAddonPriceCents: { type: Number, default: 0 },  // R$/mês extra (centavos)

  // Conta cortesia (sem cobrança — esposa, sócio, parceiro, conta de admin).
  // É só rótulo/controle: exibe selo no painel do cliente e some os CTAs de upgrade.
  // Os limites continuam definidos pelo plano + override.
  isCourtesy: { type: Boolean, default: false },
  courtesyNote: { type: String, default: '' },      // ex.: "Esposa", "Sócio"

  // F3 — Carência de regularização (exit-cortesia / início de cobrança).
  // `graceUntil` = prazo POR ORG definido pelo super-admin (o dia que ele quiser).
  // Enquanto não vence, a org funciona normal (só recebe aviso). Quando vence sem
  // regularizar, o graceChecker SUSPENDE a org (Organization.isActive=false +
  // suspendedReason='billing') — NUNCA deleta (offboarding ignora suspensão por billing).
  // `graceWarnedAt` = quando o aviso prévio foi enviado (idempotência do aviso).
  // Ambos são zerados ao redefinir o prazo e ao reativar a org.
  graceUntil: { type: Date, default: null },
  graceWarnedAt: { type: Date, default: null },

  // Override de limites por org. Quando ligado, os `limits` abaixo são CUSTOMIZADOS
  // e não são sobrescritos ao trocar de plano. Desligar reverte ao plano base.
  overrideEnabled: { type: Boolean, default: false },

  // Limites de uso (efetivos). Espelham o plano base, salvo override ligado.
  // Modelo storage-only: sessões/fotos/álbuns são ILIMITADOS (-1) em todos os tiers;
  // o medidor real é o de storage. Defaults espelham o Free (fonte: models/plans.js).
  // Mesmo assim, a VERDADE de exibição/enforcement vem de effectiveLimits(sub)
  // (deriva de plans.js sem override) — estes defaults só evitam snapshot velho.
  limits: {
    maxSessions: { type: Number, default: -1 },     // ilimitado
    maxPhotos: { type: Number, default: -1 },       // ilimitado
    maxAlbums: { type: Number, default: -1 },       // ilimitado
    maxStorage: { type: Number, default: 3072 },    // MB — Free 3 GB
    customDomain: { type: Boolean, default: false }
  },

  // Uso atual (incrementar ao criar sessões/fotos/álbuns)
  usage: {
    sessions: { type: Number, default: 0 },
    photos: { type: Number, default: 0 },
    albums: { type: Number, default: 0 },
    storage: { type: Number, default: 0 },  // MB — legado/morto, removido na Fase 4

    // Medidor de storage (Fase 1 — SÓ-MEDE, não bloqueia). Gravados pelo
    // reconciliador diário (src/utils/storageReconciler.js), que varre o disco
    // real da org. Valores em BYTES.
    //  • storageQuotaBytes = o que o plano LIMITA (só fotos de sessão; espelha a
    //    barra do painel do fotógrafo) — será a base do gate na Fase 2.
    //  • storageBytes = disco total da org (sessions+site+vídeos); informativo
    //    para o super admin / operação.
    storageBytes: { type: Number, default: 0 },
    storageQuotaBytes: { type: Number, default: 0 },
    storageReconciledAt: { type: Date, default: null }
  }

}, { timestamps: true });

// Unicidade do id de assinatura do MP via ÍNDICE PARCIAL: só vale quando mpPreapprovalId
// é uma STRING (assinatura viva). Assim `null`/ausente (orgs sem assinatura) NÃO entram no
// índice → cadastros ilimitados, sem o footgun do unique+sparse (que indexava null explícito
// e quebrava o 2º cadastro com E11000). Em prod exige migração: dropar `mpPreapprovalId_1`
// antigo antes de este criar (autoIndex não dropa índices fora do schema).
SubscriptionSchema.index(
  { mpPreapprovalId: 1 },
  { unique: true, partialFilterExpression: { mpPreapprovalId: { $type: 'string' } } }
);

module.exports = mongoose.model('Subscription', SubscriptionSchema);