const mongoose = require('mongoose');

const PlatformUpdateSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  iconUrl:     { type: String, default: '' },    // Caminho da imagem/ícone, ex: /uploads/nome.png
  linkUrl:     { type: String, default: '' },    // URL externa (opcional)
  order:       { type: Number, default: 0 },     // Ordem de exibição
  active:      { type: Boolean, default: true }  // Controle de visibilidade
}, { timestamps: true });

module.exports = mongoose.model('PlatformUpdate', PlatformUpdateSchema);
