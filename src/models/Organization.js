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
  plan: { type: String, enum: ['free', 'basic', 'pro'], default: 'free' },
  isActive: { type: Boolean, default: false },
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
  watermarkType: { type: String, enum: ['text', 'logo'], default: 'text' },
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
  // Site público do fotógrafo
  siteEnabled: { type: Boolean, default: true },
  siteTheme: {
    type: String,
    enum: ['elegante', 'minimalista', 'moderno', 'escuro', 'colorido'],
    default: 'elegante'
  },
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
    overlayOpacity: { type: Number, default: 30, min: 0, max: 80 },
    topBarHeight: { type: Number, default: 0, min: 0, max: 20 },
    bottomBarHeight: { type: Number, default: 0, min: 0, max: 20 },
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
    depoimentos: [{
      id: String,
      name: String,
      text: String,
      rating: { type: Number, default: 5 },
      photo: { type: String, default: '' },
      socialLink: { type: String, default: '' }
    }],
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
      photos: [{
        url: String,
        caption: { type: String, default: '' }
      }]
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
      photos: [String],
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
    newsletter: {
      title: { type: String, default: 'Fique por dentro' },
      description: { type: String, default: '' }
    },
    // Seções customizadas criadas pelo fotógrafo
    customSections: [{
      id: String,
      title: String,
      type: { type: String, enum: ['texto', 'texto-imagem', 'galeria', 'chamada', 'lista'], default: 'texto' },
      content: String,
      imageUrl: { type: String, default: '' },
      items: [{ text: String }],
      bgColor: { type: String, default: '' },
      textColor: { type: String, default: '' },
      order: { type: Number, default: 0 }
    }]
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
    }
  },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null }
}, { timestamps: true });

OrganizationSchema.index({ isActive: 1 });

module.exports = mongoose.model('Organization', OrganizationSchema);
