const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
  siteEnabled: { type: Boolean, default: false },
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
    default: ['hero', 'sobre', 'portfolio', 'servicos', 'depoimentos', 'contato']
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
      photo: { type: String, default: '' }
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
    }
  }
}, { timestamps: true });

/**
 * Garante que o slug seja unico por organização.
 */
OrganizationSchema.index({ slug: 1 });

/**
 * Indice para otimizar buscas de organizações ativas.
 */
OrganizationSchema.index({ isActive: 1 });

module.exports = mongoose.model('Organization', OrganizationSchema);
