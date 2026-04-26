const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    name: String,
    clientEmail: { type: String, default: '' },
    type: String, // Família, Casamento, Evento, etc
    date: Date,
    accessCode: String,
    photos: {
        type: [{
            id: String,
            filename: String,
            url: String,         // thumb (comprimida para galeria)
            urlOriginal: String, // original sem compressao (para entrega em alta)
            uploadedAt: Date,
            comments: [{
                text: String,
                createdAt: { type: Date, default: Date.now },
                author: { type: String, enum: ['client', 'admin'], default: 'client' }
            }],
            hidden: { type: Boolean, default: false }
        }],
        // Teto defensivo: evita estourar o limite de 16MB por doc do MongoDB.
        // 10k fotos por sessão cobre qualquer evento real.
        validate: [arr => arr.length <= 10000, 'Limite de 10000 fotos por sessão atingido']
    },
    // Modo da sessao
    mode: { type: String, enum: ['selection', 'gallery', 'multi_selection'], default: 'selection' },
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
    photoResolution: { type: Number, enum: [960, 1200, 1400, 1600], default: 1200 }, // Resolucao das thumbs de selecao
    watermark: { type: Boolean, default: true },
    commentsEnabled: { type: Boolean, default: true }, // Exibir botao de comentario na galeria do cliente
    canShare: { type: Boolean, default: false },
    allowExtraPurchasePostSubmit: { type: Boolean, default: true },
    allowReopen: { type: Boolean, default: true },
    // Solicitacao de fotos extras (apos submit da selecao)
    extraRequest: {
        status: { type: String, enum: ['none', 'pending', 'accepted', 'rejected'], default: 'none' },
        photos: [String],       // IDs das fotos extras solicitadas
        requestedAt: Date,
        respondedAt: Date,
        paid: { type: Boolean, default: false },
        paymentId: String,      // Stripe/MP Preference ID
        upsellingSent: { type: Boolean, default: false }
    },
    isActive: { type: Boolean, default: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    // CRM: cliente vinculado
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    // Multi-selecao: participantes individuais (modo multi_selection)
    participants: [{
        name: { type: String, required: true },
        email: { type: String, default: '' },
        phone: { type: String, default: '' },
        accessCode: { type: String, required: true },
        selectedPhotos: [String],
        selectionStatus: {
            type: String,
            enum: ['pending', 'in_progress', 'submitted', 'delivered'],
            default: 'pending'
        },
        packageLimit: { type: Number, default: 30 },
        submittedAt: Date,
        deliveredAt: Date
    }]
}, { timestamps: true });

// Index composto para busca rápida de sessão por org + código
sessionSchema.index({ organizationId: 1, accessCode: 1 });

module.exports = mongoose.model('Session', sessionSchema);
