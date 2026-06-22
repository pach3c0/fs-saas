const mongoose = require('mongoose');

const PartnerBannerSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },     // Texto abaixo do banner
  imageUrl:    { type: String, required: true }, // Caminho relativo da imagem, ex: /uploads/nome.png
  linkUrl:  { type: String, default: '' },     // URL de redirecionamento (opcional)
  order:    { type: Number, default: 0 },      // Ordem de exibição
  active:   { type: Boolean, default: true }   // Controle de visibilidade
}, { timestamps: true });

module.exports = mongoose.model('PartnerBanner', PartnerBannerSchema);
