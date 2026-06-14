const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  content:  { type: String, required: true }, // Conteúdo em texto rico simples (HTML)
  imageUrl: { type: String, default: '' },    // Caminho da imagem, ex: /uploads/nome.png
  linkUrl:  { type: String, default: '' },    // URL externa
  linkText: { type: String, default: 'Saiba mais' }, // Texto de exibição do link
  active:   { type: Boolean, default: true }  // Flag de visibilidade
}, { timestamps: true });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
