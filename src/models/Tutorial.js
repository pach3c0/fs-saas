const mongoose = require('mongoose');

const TutorialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  videoUrl: { type: String, required: true },
  youtubeId: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['dashboard', 'clientes', 'sessoes', 'portfolio', 'crm_financeiro'], 
    default: 'dashboard' 
  },
  duration: { type: String, default: '5 min' },
  level: { type: String, enum: ['Básico', 'Intermediário', 'Avançado'], default: 'Básico' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Tutorial', TutorialSchema);
