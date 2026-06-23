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
            url: String,           // thumb (comprimida para galeria)
            urlOriginal: String,   // original sem compressao (para entrega em alta)
            urlEditada: String,    // foto editada subida pelo fotografo (substitui url na entrega)
            width: Number,         // largura da thumb (para render do grid)
            height: Number,        // altura da thumb (para render do grid)
            widthOriginal: Number, // largura do arquivo original (resolucao real de entrega)
            heightOriginal: Number,
            uploadedAt: Date,
            comments: [{
                text: String,
                createdAt: { type: Date, default: Date.now },
                author: { type: String, enum: ['client', 'admin'], default: 'client' },
                // Seleção em Grupo: dono do "thread" (o comentário só é visível a ESTE participante).
                // Comentário do participante → o próprio; resposta do admin → o participante alvo.
                // Vazio/null em seleção individual (todos do mesmo cliente).
                participantId: { type: mongoose.Schema.Types.ObjectId, default: null },
                participantName: { type: String, default: '' }
            }],
            hidden: { type: Boolean, default: false }
        }],
        // Teto defensivo: evita estourar o limite de 16MB por doc do MongoDB.
        // 10k fotos por sessão cobre qualquer evento real.
        validate: [arr => arr.length <= 10000, 'Limite de 10000 fotos por sessão atingido']
    },
    // Modo da sessao
    mode: { type: String, enum: ['selection', 'gallery', 'multi_selection', 'multi_instant', 'multi_gallery'], default: 'selection' },
    packageLimit: { type: Number, default: 30 },
    extraPhotoPrice: { type: Number, default: 25 },
    // Fluxo de selecao
    selectionStatus: { type: String, enum: ['pending', 'in_progress', 'submitted', 'delivered', 'expired'], default: 'pending' },
    selectedPhotos: [String],
    // Cortesias EXPLÍCITAS na seleção individual (fotógrafo presenteia fotos fora da seleção).
    // Espelha participant.courtesyPhotos do multi. Aditivo, nasce vazio — sem auto-dedução por upload.
    courtesyPhotos: [String],
    selectionSubmittedAt: Date,
    codeSentAt: Date,        // quando admin enviou o código/link por e-mail ao cliente
    firstAccessAt: Date,     // quando o cliente acessou a galeria pela primeira vez
    lastEditedUploadAt: Date, // quando admin fez o último upload de fotos editadas
    uploadsCompletedAt: Date, // fotógrafo marcou "concluí upload" — destrava passo de envio do código (wizard)
    codeViewedAt: Date,       // fotógrafo abriu o passo do código no wizard — habilita o passo de envio
    // Modo Galeria: escolha do fotógrafo no passo Compartilhar.
    // null = ainda não decidiu (mostra a tela de escolha); 'preview' = fluxo com prévia/marca d'água; 'direct' = pula Compartilhar
    galleryDeliveryMode: { type: String, enum: ['preview', 'direct', null], default: null },
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
    // Integração Rhyno: cliente vindo do ERP (fonte da verdade do CRM).
    // Convive com clientId (legado) durante a transição; snapshot evita ir ao Rhyno toda hora.
    rhynoCustomerId: { type: String, default: null },
    clientName: { type: String, default: '' },
    clientPhone: { type: String, default: '' },
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
        // Preço da foto extra deste participante. null = herda o padrão da sessão (extraPhotoPrice).
        extraPhotoPrice: { type: Number, default: null },
        // Grau de parentesco informado na auto-inscrição (ex: 'Pai/Mãe', 'Professor', etc.)
        relationship: { type: String, default: '' },
        // Seleção em Grupo — CORTESIA EXPLÍCITA: fotos que o fotógrafo decidiu presentear a ESTE
        // participante, fora da seleção dele. Diferente do modo seleção individual (onde a cortesia é
        // DEDUZIDA de "foto em alta fora da seleção"), no multi o pool é compartilhado entre N pessoas —
        // então "fora da seleção" é o caso normal e NÃO pode virar cortesia automática. Aqui a cortesia
        // é sempre uma ação deliberada do fotógrafo, isolada por participante. Nasce vazia (aditivo).
        courtesyPhotos: [String],
        // Seleção em Grupo: este participante pediu reabertura da própria seleção (aguardando o fotógrafo).
        reopenRequested: { type: Boolean, default: false },
        // Seleção em Grupo: solicitação de fotos extras individual deste participante.
        // Espelha o extraRequest da sessão, mas isolado por participante.
        extraRequest: {
            status: { type: String, enum: ['none', 'pending', 'accepted', 'rejected'], default: 'none' },
            photos: [String],
            requestedAt: Date,
            respondedAt: Date,
            rejectReason: { type: String, default: '' },
            upsellingSent: { type: Boolean, default: false }
        },
        submittedAt: Date,
        deliveredAt: Date
    }],
    // Auto-inscrição pública via QR Code / Link
    selfRegEnabled: { type: Boolean, default: false },   // habilita a página pública de cadastro
    selfRegDeadline: { type: Date, default: null },       // prazo independente de inscrição (null = usa selectionDeadline)

    // Tabela de preços CUMULATIVA por faixa (limiar) de quantidade de fotos extras.
    // Cada foto extra é cobrada pelo preço da faixa em que ela cai (estilo imposto):
    // o total sempre cresce com a quantidade → sem "conflito de valores".
    // Vazia = usa extraPhotoPrice fixo. O editor do admin define só "from" + "price"
    // (a faixa vale do "from" até o início da próxima); "to" é opcional/legado.
    // Ex (limiares): [{ from:1, price:10 }, { from:11, price:8 }, { from:16, price:7 }]
    pricingTable: [{
        from:  { type: Number, required: true },  // a partir de quantas fotos extras vale a faixa
        to:    { type: Number, default: null },   // opcional/legado (não usado no cálculo cumulativo)
        price: { type: Number, required: true }   // preço de cada foto extra nesta faixa
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

// Índices para buscas otimizadas
sessionSchema.index({ organizationId: 1, accessCode: 1 });
sessionSchema.index({ storageRetentionUntil: 1, isActive: 1 }); // Scheduler de retenção

module.exports = mongoose.model('Session', sessionSchema);
