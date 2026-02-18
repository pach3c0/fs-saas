const plans = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,  // Stripe Price ID
    limits: {
      maxSessions: 5,
      maxPhotos: 100,
      maxAlbums: 1,
      maxStorage: 500,  // MB
      customDomain: false
    },
    features: [
      '5 sessões por mês',
      '100 fotos por sessão',
      '1 prova de álbum',
      '500MB de armazenamento',
      'Watermark customizado',
      'Galeria com seleção'
    ]
  },
  basic: {
    name: 'Basic',
    price: 4900,  // R$ 49,00 em centavos
    priceId: 'price_1Qk...',  // Placeholder: Substituir pelo ID real do Stripe
    limits: {
      maxSessions: 50,
      maxPhotos: 5000,
      maxAlbums: 10,
      maxStorage: 10000,  // 10GB
      customDomain: false
    },
    features: [
      '50 sessões por mês',
      '5.000 fotos por sessão',
      '10 provas de álbum',
      '10GB de armazenamento',
      'Todas as features do Free',
      'Suporte por email'
    ]
  },
  pro: {
    name: 'Pro',
    price: 9900,  // R$ 99,00
    priceId: 'price_1Qk...', // Placeholder: Substituir pelo ID real do Stripe
    limits: {
      maxSessions: -1,  // Ilimitado
      maxPhotos: -1,
      maxAlbums: -1,
      maxStorage: 50000,  // 50GB
      customDomain: true
    },
    features: [
      'Sessões ilimitadas',
      'Fotos ilimitadas',
      'Álbuns ilimitados',
      '50GB de armazenamento',
      'Domínio personalizado',
      'Todas as features do Basic',
      'Suporte prioritário'
    ]
  }
};

module.exports = plans;