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
            urlEditada: String,  // foto editada subida pelo fotografo (substitui url na entrega)
            width: Number,
            height: Number,
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
    mode: { type: String, enum: ['selection', 'gallery', 'multi_selection', 'multi_instant'], default: 'selection' },
    packageLimit: { type: Number, default: 30 },
    extraPhotoPrice: { type: Number, default: 25 },
    // Fluxo de selecao
    selectionStatus: { type: String, enum: ['pending', 'in_progress', 'submitted', 'delivered', 'expired'], default: 'pending' },
    selectedPhotos: [String],
    selectionSubmittedAt: Date,
    codeSentAt: Date,        // quando admin enviou o código/link por e-mail ao cliente
    firstAccessAt: Date,     // quando o cliente acessou a galeria pela primeira vez
    lastEditedUploadAt: Date, // quando admin fez o último upload de fotos editadas
    uploadsCompletedAt: Date, // fotógrafo marcou "concluí upload" — destrava passo de envio do código (wizard)
    codeViewedAt: Date,       // fotógrafo abriu o passo do código no wizard — habilita o passo de envio
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
    customShareEmailIntro: { type: String, default: '' },
    customShareWhatsAppText: { type: String, default: '' },
    customDeliverEmailIntro: { type: String, default: '' },
    customDeliverWhatsAppText: { type: String, default: '' },
    allowExtraPurchasePostSubmit: { type: Boolean, default: true },
    allowReopen: { type: Boolean, default: true },
    reopenRequested: { type: Boolean, default: false }, // cliente solicitou reabertura — aguardando decisão do admin
    // Multi-Seleção: se true, cada participante vê sua posição na fila de entrega (gatilho de urgência).
    showDeliveryQueuePosition: { type: Boolean, default: false },
    // Re-entrega: ativado pelo admin para subir fotos faltantes sem fechar o download do cliente
    redeliveryMode: { type: Boolean, default: false },
    // Histórico de ciclos de entrega (audit trail)
    deliveryHistory: [{
        deliveredAt: Date,
        selectedCount: Number,
        extrasDelivered: [String], // IDs de fotos entregues que não foram selecionadas
        reopenedAt: Date,
        reopenReason: String
    }],
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
    // Bloqueio de emergência: impede acesso do cliente sem apagar dados.
    // Admin continua visualizando e gerenciando normalmente.
    clientAccessBlocked: { type: Boolean, default: false },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    // CRM: cliente vinculado
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    // Multi-selecao: participantes individuais (modo multi_selection)
    participants: [{
        name: { type: String, required: true },
        email: { type: String, default: '' },
        phone: { type: String, default: '' },
        accessCode: { type: String, required: true },
        clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
        selectedPhotos: [String],
        selectionStatus: {
            type: String,
            enum: ['pending', 'in_progress', 'submitted', 'delivered'],
            default: 'pending'
        },
        packageLimit: { type: Number, default: 30 },
        submittedAt: Date,
        deliveredAt: Date
    }],
    // CRM Fase 2: classificacao de evento + automacao de vendas
    eventType: {
        type: String,
        enum: ['aniversario', 'casamento', 'formatura', 'corporativo', 'show', 'ensaio', 'gestante', 'newborn', 'debutante', 'batizado', 'outro'],
        default: 'outro',
        index: true
    },
    eventDate: { type: Date, default: null },
    salesAutomation: {
        enabled: { type: Boolean, default: true },
        sentTriggers: [{
            trigger: { type: String }, // ex: scarcity_7d, scarcity_15d, reactivation_90d
            sentAt: { type: Date, default: Date.now },
            couponCode: { type: String, default: '' },
            redeemedAt: { type: Date, default: null } // marcacao manual de cupom usado
        }]
    },
    // Retenção de storage: fotógrafo define até quando as fotos ficam no servidor
    storageRetentionUntil: { type: Date, default: null },
    storageAutoDelete: { type: Boolean, default: false },         // fotógrafo autorizou exclusão automática na data
    storageBackupOnExpire: { type: Boolean, default: false },     // gera ZIP de backup antes de deletar/arquivar
    storageNotificationSent: { type: Boolean, default: false },   // evita notificação duplicada
    archivedAt: { type: Date, default: null },                    // quando as fotos foram removidas do disco
    externalStorageUrl: { type: String, default: '' },            // link Drive/Dropbox após arquivamento
    // Histórico de eventos da sessão (timeline)
    events: [{
        type: { type: String, required: true },
        ts:   { type: Date, default: Date.now },
        meta: { type: mongoose.Schema.Types.Mixed, default: {} }
    }]
}, { timestamps: true });

// Index composto para busca rápida de sessão por org + código
sessionSchema.index({ organizationId: 1, accessCode: 1 });

module.exports = mongoose.model('Session', sessionSchema);
