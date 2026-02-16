const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minusculas, numeros e hifens']
  },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  plan: { type: String, enum: ['free', 'basic', 'pro'], default: 'free' },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
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
  watermarkOpacity: { type: Number, default: 15 }
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
