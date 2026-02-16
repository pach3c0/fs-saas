const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    name: String,
    type: String, // Família, Casamento, Evento, etc
    date: Date,
    accessCode: String,
    photos: [{
        id: String,
        filename: String,
        url: String,         // thumb (comprimida para galeria)
        urlOriginal: String, // original sem compressao (para entrega em alta)
        uploadedAt: Date,
        comments: [{
            text: String,
            createdAt: { type: Date, default: Date.now },
            author: { type: String, enum: ['client', 'admin'], default: 'client' }
        }]
    }],
    // Modo da sessao
    mode: { type: String, enum: ['selection', 'gallery'], default: 'selection' },
    packageLimit: { type: Number, default: 30 },
    extraPhotoPrice: { type: Number, default: 25 },
    // Fluxo de selecao
    selectionStatus: { type: String, enum: ['pending', 'in_progress', 'submitted', 'delivered', 'expired'], default: 'pending' },
    selectedPhotos: [String],
    selectionSubmittedAt: Date,
    selectionDeadline: Date,
    deadlineWarningSent: { type: Boolean, default: false }, // Aviso de 3 dias enviado?
    deadlineExpiredSent: { type: Boolean, default: false }, // Aviso de expirado enviado?
    deliveredAt: Date,
    // Foto de capa da galeria
    coverPhoto: { type: String, default: '' },
    // Config
    highResDelivery: { type: Boolean, default: false }, // Entrega em alta resolucao
    watermark: { type: Boolean, default: true },
    canShare: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true }
}, { timestamps: true });

// Index composto para busca rápida de sessão por org + código
sessionSchema.index({ organizationId: 1, accessCode: 1 });

module.exports = mongoose.model('Session', sessionSchema);
