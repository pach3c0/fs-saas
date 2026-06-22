const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // E-mail do usuário-dono no ERP Rhyno (aba Gestão via SSO). Mapeia esta org ao
  // seu tenant Rhyno. null = ainda não provisionada → Gestão fica fail-CLOSED
  // (nunca cai num tenant compartilhado — evita o vazamento corrigido em 2026-06-19).
  rhynoUserEmail: { type: String, default: null },
  plan: { type: String, enum: ['free', 'basic', 'pro'], default: 'free' },
  isActive: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deactivatedAt: { type: Date, default: null },
  betaFeatures: { type: [String], default: [] },
  // Perfil do fotografo
  logo: { type: String, default: '' },
  phone: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  email: { type: String, default: '' },
  website: { type: String, default: '' },
  bio: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  // Identidade visual
  primaryColor: { type: String, default: '#1a1a1a' },
  // Watermark customizado
  watermarkType: { type: String, enum: ['text', 'logo', 'both'], default: 'text' },
  watermarkText: { type: String, default: '' },
  watermarkOpacity: { type: Number, min: 5, max: 50, default: 15 },
  watermarkPosition: {
    type: String,
    enum: ['center', 'bottom-right', 'bottom-left', 'top-right', 'top-left', 'tiled'],
    default: 'center'
  },
  watermarkSize: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'medium'
  },
  // Watermark avançado — Tipografia
  watermarkFontColor: { type: String, default: '#ffffff' },
  watermarkFontFamily: {
    type: String,
    enum: ['Arial', 'Playfair Display', 'Georgia', 'Inter', 'Montserrat', 'Dancing Script', 'Oswald', 'Roboto Slab'],
    default: 'Arial'
  },
  watermarkFontWeight: { type: String, enum: ['light', 'normal', 'bold'], default: 'bold' },
  watermarkFontStyle: { type: String, enum: ['normal', 'italic'], default: 'normal' },
  watermarkLetterSpacing: { type: Number, min: 0, max: 20, default: 0 },
  watermarkRotation: { type: Number, min: -180, max: 180, default: -30 },
  watermarkCustomSize: { type: Number, min: 8, max: 120, default: 24 },
  watermarkShadow: { type: Boolean, default: true },
  // Watermark avançado — Imagem/Logo
  watermarkImageFilter: { type: String, enum: ['none', 'grayscale', 'invert', 'white'], default: 'none' },
  watermarkImageOpacity: { type: Number, min: 5, max: 100, default: 80 },
  // Editor de marca d'água em camadas (sistema novo — substitui campos acima para novos usuários)
  // Cada layer: { id, type:'text'|'image', x, y, w, h, opacity, rotation,
  //   [texto]: text, fontSize, fontFamily, fontWeight, fontStyle, color, letterSpacing, shadow
  //   [imagem]: url, filter }
  watermarkLayers: { type: mongoose.Schema.Types.Mixed, default: [] },
  // Site público do fotógrafo
  siteEnabled: { type: Boolean, default: true },
  siteTheme: {
    type: String,
    enum: ['elegante', 'minimalista', 'moderno', 'escuro', 'colorido'],
    default: 'elegante'
  },
  customDomain: { type: String, unique: true, sparse: true },
  domainStatus: { type: String, enum: ['pending', 'verified'], default: 'pending' },
  domainVerifiedAt: { type: Date },
  // Configurações gerais do site
  siteConfig: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    heroTitle: { type: String, default: '' },
    heroSubtitle: { type: String, default: '' },
    heroImage: { type: String, default: '' },
    // Hero avançado
    heroScale: { type: Number, default: 1, min: 0.5, max: 2 },
    heroPosX: { type: Number, default: 50, min: 0, max: 100 },
    heroPosY: { type: Number, default: 50, min: 0, max: 100 },
    titlePosX: { type: Number, default: 50, min: 0, max: 100 },
    titlePosY: { type: Number, default: 40, min: 0, max: 100 },
    titleFontSize: { type: Number, default: 80, min: 10, max: 200 },
    subtitlePosX: { type: Number, default: 50, min: 0, max: 100 },
    subtitlePosY: { type: Number, default: 55, min: 0, max: 100 },
    subtitleFontSize: { type: Number, default: 40, min: 10, max: 100 },
    overlayOpacity: { type: Number, default: 30, min: 0, max: 100 },
    topBarHeight: { type: Number, default: 0, min: 0, max: 20 },
    bottomBarHeight: { type: Number, default: 0, min: 0, max: 20 },
    heroLayers: { type: mongoose.Schema.Types.Mixed, default: [] },
    whatsapp: { type: String, default: '' },
    whatsappMessage: { type: String, default: 'Olá! Vi seu site e gostaria de mais informações.' },
    instagramUrl: { type: String, default: '' },
    facebookUrl: { type: String, default: '' },
    email: { type: String, default: '' },
    copyright: { type: String, default: '' }
  },
  // Seções ativas e ordem
  siteSections: {
    type: [String],
    default: ['hero', 'portfolio', 'albuns', 'servicos', 'estudio', 'depoimentos', 'contato', 'sobre', 'faq']
  },
  // Conteúdo de cada seção
  siteContent: {
    sobre: {
      title: { type: String, default: 'Sobre Mim' },
      text: { type: String, default: '' },
      image: { type: String, default: '' }
    },
    servicos: [{
      id: String,
      title: String,
      description: String,
      price: String,
      icon: { type: String, default: '📷' }
    }],
    depoimentos: {
      type: [{
        id: String,
        name: String,
        text: String,
        rating: { type: Number, default: 5 },
        photo: { type: String, default: '' },
        socialLink: { type: String, default: '' }
      }],
      validate: [arr => !arr || arr.length <= 500, 'Limite de 500 depoimentos atingido']
    },
    pendingDepoimentos: [{
      id: String,
      name: String,
      text: String,
      email: { type: String, default: '' },
      rating: { type: Number, default: 5 },
      submittedAt: { type: Date, default: Date.now }
    }],
    portfolio: {
      title: { type: String, default: 'Portfólio' },
      subtitle: { type: String, default: '' },
      gridStyle: { type: String, default: 'standard' },
      photos: {
        type: [{
          url: String,
          caption: { type: String, default: '' },
          format: { type: String, default: '16/9' },
          transform: { type: mongoose.Schema.Types.Mixed, default: {} }
        }],
        validate: [arr => !arr || arr.length <= 2000, 'Limite de 2000 fotos no portfólio atingido']
      },
      canvasLayers: { type: mongoose.Schema.Types.Mixed, default: [] },
      canvasBg: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    contato: {
      title: { type: String, default: 'Entre em Contato' },
      text: { type: String, default: '' },
      address: { type: String, default: '' },
      mapEmbed: { type: String, default: '' }
    },
    albums: [{
      id: String,
      title: String,
      subtitle: String,
      cover: String,
      gridStyle: { type: String, default: 'standard' },
      photos: { type: [mongoose.Schema.Types.Mixed], default: [] },
      createdAt: String
    }],
    studio: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      address: { type: String, default: '' },
      hours: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      videoUrl: { type: String, default: '' },
      photos: [{
        image: String,
        posX: Number,
        posY: Number,
        scale: Number
      }],
      whatsappMessages: [{
        text: String,
        delay: { type: Number, default: 5 }
      }]
    },
    faq: [{
      id: String,
      question: String,
      answer: String
    }],
  },
  // Estilo personalizado do site
  siteStyle: {
    accentColor: { type: String, default: '' },
    bgColor: { type: String, default: '' },
    textColor: { type: String, default: '' },
    fontFamily: { type: String, default: '' },
    borderRadius: { type: String, default: '' }
  },
  // Integrações de marketing e analytics
  integrations: {
    googleAnalytics: {
      enabled: { type: Boolean, default: false },
      measurementId: { type: String, default: '' }
    },
    metaPixel: {
      enabled: { type: Boolean, default: false },
      pixelId: { type: String, default: '' },
      accessToken: { type: String, default: '' }
    },
    whatsapp: {
      enabled: { type: Boolean, default: true },
      number: { type: String, default: '' },
      message: { type: String, default: 'Olá! Vi seu site e gostaria de mais informações.' },
      position: { type: String, enum: ['bottom-right', 'bottom-left'], default: 'bottom-right' },
      showOnMobile: { type: Boolean, default: true }
    },
    seo: {
      googleSiteVerification: { type: String, default: '' },
      robots: { type: String, default: 'index, follow' }
    },
    // Lembrete de seleção (pré-entrega): avisa o cliente para selecionar antes do prazo. Sem desconto.
    deadlineAutomation: {
      enabled: { type: Boolean, default: false },
      daysWarning: { type: Number, default: 3 }, // quantos dias antes do prazo enviar aviso
      sendEmail: { type: Boolean, default: true },
      messageTemplate: { type: String, default: '' } // corpo customizado (variaveis); '' = texto de fabrica
    },
    // CRM Fase 2: escassês de vendas (upsell pós-entrega, sobre as fotos não compradas)
    salesAutomator: {
      reactivation: {
        enabled: { type: Boolean, default: true },
        daysBeforeAnniversary: { type: [Number], default: [90, 30, 7] }
      },
      // Upsell pos-entrega: janela entre a entrega e a exclusao do storage (storageRetentionUntil)
      postDelivery: {
        enabled: { type: Boolean, default: false },
        daysSchedule: { type: [Number], default: [15, 7, 1] },     // dias ANTES da exclusao
        discountByDay: { type: mongoose.Schema.Types.Mixed, default: {} }, // { '15':10, '7':15, '1':25 }
        messageTemplate: { type: String, default: '' }
      },
      couponPrefix: { type: String, default: 'CZ' },
      couponDiscountPercent: { type: Number, default: 10 }
    }
  },
  // Acesso de suporte (impersonação): o superadmin SÓ pode entrar no painel
  // do fotógrafo se ele autorizar aqui (privacidade — fotos sensíveis).
  // Default false: sem consentimento explícito, sem acesso.
  supportAccess: {
    enabled: { type: Boolean, default: false },
    updatedAt: { type: Date, default: null }
  },
  // Onboarding
  onboarding: {
    completed: { type: Boolean, default: false },
    guidedStep: { type: Number, default: 1 },
    skipped: { type: Boolean, default: false },
    steps: {
      sessionCreated:  { type: Boolean, default: false },
      photosUploaded:  { type: Boolean, default: false },
      clientLinked:    { type: Boolean, default: false },
      linkSent:        { type: Boolean, default: false }
    }
  },
  // Configurações personalizáveis pelo fotógrafo (aba Configurações)
  preferences: {
    // Templates de mensagem (1 por canal). Vazio = usa o preset de fábrica por tipo de evento.
    // Variáveis suportadas: {nome} {negocio} {evento} {link} {codigo}
    messageTemplates: {
      shareEmail:      { type: String, default: '' },
      shareWhatsApp:   { type: String, default: '' },
      deliverEmail:    { type: String, default: '' },
      deliverWhatsApp: { type: String, default: '' }
    },
    // Padrões pré-preenchidos ao criar uma nova sessão
    sessionDefaults: {
      packageLimit:       { type: Number, default: 30 },
      extraPhotoPrice:    { type: Number, default: 25 },
      photoResolution:    { type: Number, enum: [960, 1200, 1400, 1600], default: 1200 },
      deadlineDays:       { type: Number, default: 0 },   // 0 = sem prazo padrão
      allowExtraPurchase: { type: Boolean, default: true },
      allowReopen:        { type: Boolean, default: true },
      commentsEnabled:    { type: Boolean, default: true }
    },
    // Modo Galeria: comportamento padrão ao chegar no passo Compartilhar
    galleryDeliveryDefault: { type: String, enum: ['ask', 'preview', 'direct'], default: 'ask' },
    // Quais e-mails internos o fotógrafo recebe
    notifications: {
      selectionSubmitted: { type: Boolean, default: true },
      extraRequested:     { type: Boolean, default: true },
      reopenRequested:    { type: Boolean, default: true }
    },
    // Graus de parentesco exibidos no formulário de auto-inscrição (Seleção em Grupo)
    // O fotógrafo pode personalizar conforme o tipo de evento
    membershipRoles: {
      type: [String],
      default: ['Pai/Mãe', 'Parente', 'Professor', 'Convidado']
    }
  }
}, { timestamps: true });

OrganizationSchema.index({ isActive: 1 });

module.exports = mongoose.model('Organization', OrganizationSchema);
