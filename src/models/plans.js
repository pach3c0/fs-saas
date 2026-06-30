// Fonte ÚNICA da verdade dos planos da CliqueZoom.
// Todas as outras camadas derivam DAQUI — nunca duplicar números de plano:
//   - saasAdmin.js / agentActions.js (loadPlanLimits) lêem daqui
//   - auth.js (signup) usa plans.free.limits
//   - webhook do Mercado Pago (mercadopago.js) reseta sub.limits a partir daqui
//   - subscriptionPricing.js / billing.js calculam preço e storage efetivos daqui
//
// Medidor ÚNICO = storage. Sessões/fotos/álbuns são ILIMITADOS em todos os tiers
// (count caps = -1). O gate real é o de storage (middleware/storageLimit — Fase 2).
//
// Unidades: `limits.maxStorage` em MB · `price` em centavos · `seats` = usuários inclusos.
// `capabilities` = flags de gating de feature (consumidas no gating da Fase 3).
const plans = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,  // legado Stripe (não usado; remoção na Fase 4)
    seats: 1,
    limits: {
      maxSessions: -1,
      maxPhotos: -1,
      maxAlbums: -1,
      maxStorage: 3072,      // 3 GB
      customDomain: false
    },
    capabilities: {
      crm: 'taste',          // CRM "gostinho"
      ordemServico: true,    // ordem de serviço com campo de contrato (desce pra todos)
      aniversario: false,    // widget de lembrete de aniversário
      tarefasMetas: false,
      financasEmpresa: false,
      financasPessoal: false,
      gestaoMista: false,
      iaGestao: false,         // agente IA da Gestão (Rhyno) — custo de token (Pro+)
      integracaoAgenda: false, // integração Google Agenda (Pro+)
      importacaoMassa: false,  // importar base inteira de outro ERP (Basic+)
      dominioProprio: false,
      selo: true             // selo "powered by CliqueZoom" na galeria
    },
    features: [
      '3 GB de armazenamento',
      'Sessões ilimitadas',
      'Entrega em alta resolução',
      'Galeria com seleção (todos os modos)',
      'CRM essencial + Ordem de serviço com contrato',
      'Triagem por reconhecimento facial',
      'Selo CliqueZoom na galeria'
    ]
  },
  basic: {
    name: 'Basic',
    price: 3900,             // R$ 39,00
    priceId: null,
    seats: 1,
    limits: {
      maxSessions: -1,
      maxPhotos: -1,
      maxAlbums: -1,
      maxStorage: 20480,     // 20 GB
      customDomain: false
    },
    capabilities: {
      crm: 'full',
      ordemServico: true,
      aniversario: true,
      tarefasMetas: false,
      financasEmpresa: false,
      financasPessoal: false,
      gestaoMista: false,
      iaGestao: false,
      integracaoAgenda: false,
      importacaoMassa: true,   // Basic+ pode importar base inteira de outro ERP
      dominioProprio: false,
      selo: false
    },
    features: [
      '20 GB de armazenamento',
      'Tudo do Free, sem o selo na galeria',
      'CRM completo + lembrete de aniversário'
    ]
  },
  pro: {
    name: 'Pro',
    price: 11900,            // R$ 119,00
    priceId: null,
    seats: 2,
    limits: {
      maxSessions: -1,
      maxPhotos: -1,
      maxAlbums: -1,
      maxStorage: 153600,    // 150 GB
      customDomain: true
    },
    capabilities: {
      crm: 'full',
      ordemServico: true,
      aniversario: true,
      tarefasMetas: true,
      financasEmpresa: true,
      financasPessoal: false,
      gestaoMista: false,
      iaGestao: true,
      integracaoAgenda: true,
      importacaoMassa: true,
      dominioProprio: true,
      selo: false
    },
    features: [
      '150 GB de armazenamento',
      'Tudo do Basic',
      'Domínio próprio',
      'Tarefas, metas e finanças da empresa',
      '2 usuários inclusos'
    ]
  },
  studio: {
    name: 'Studio',
    price: 24900,            // R$ 249,00
    priceId: null,
    seats: 3,
    limits: {
      maxSessions: -1,
      maxPhotos: -1,
      maxAlbums: -1,
      maxStorage: 614400,    // 600 GB
      customDomain: true
    },
    capabilities: {
      crm: 'full',
      ordemServico: true,
      aniversario: true,
      tarefasMetas: true,
      financasEmpresa: true,
      financasPessoal: true,
      gestaoMista: true,
      iaGestao: true,
      integracaoAgenda: true,
      importacaoMassa: true,
      dominioProprio: true,
      selo: false
    },
    features: [
      '600 GB de armazenamento',
      'Tudo do Pro',
      'Finanças pessoais + gestão "misto"',
      '3 usuários inclusos'
    ]
  }
};

module.exports = plans;
