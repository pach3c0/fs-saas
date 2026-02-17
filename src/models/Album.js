const mongoose = require('mongoose');

const sheetSchema = new mongoose.Schema({
  filename: String,
  url: String,                          // URL da imagem da lâmina
  order: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['awaiting_review', 'approved', 'revision_requested'],
    default: 'awaiting_review'
  },
  comments: [{
    text: String,
    author: { type: String, enum: ['client', 'admin'], default: 'client' },
    createdAt: { type: Date, default: Date.now }
  }]
});

const AlbumSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null
  },
  name: { type: String, required: true },         // Nome do cliente/álbum
  welcomeText: { type: String, default: '' },     // Mensagem de boas-vindas
  sheets: [sheetSchema],                          // Lâminas do álbum
  accessCode: { type: String, required: true },   // Código de acesso do cliente
  status: {
    type: String,
    enum: ['draft', 'sent', 'in_review', 'approved', 'revision_requested'],
    default: 'draft'
  },
  version: { type: Number, default: 1 },          // Versão atual
  sentAt: Date,
  approvedAt: Date
}, { timestamps: true });

AlbumSchema.index({ organizationId: 1, accessCode: 1 });

module.exports = mongoose.model('Album', AlbumSchema);
