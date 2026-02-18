const mongoose = require('mongoose');

const AlbumSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  name: { type: String, required: true },
  status: { type: String, enum: ['draft', 'sent', 'approved', 'rejected', 'revision_requested'], default: 'draft' },

  // Páginas do álbum
  pages: [{
    pageNumber: Number,
    layoutType: { type: String, default: 'single' }, // 'single', 'double-horizontal', 'double-vertical', 'triple', 'quad'
    photos: [{
      photoId: String,  // ID da foto na sessão
      photoUrl: String,
      position: Number,  // 0, 1, 2, 3 (posição no layout)
      posX: { type: Number, default: 50 },
      posY: { type: Number, default: 50 },
      scale: { type: Number, default: 1 }
    }]
  }],

  // Configurações
  coverPhoto: String,
  size: { type: String, default: '30x30cm' },
  totalPages: { type: Number, default: 20 },
  
  // Aprovação do cliente
  accessCode: { type: String, required: true, unique: true },
  approvedAt: Date,
  clientComments: String,

  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Album', AlbumSchema);