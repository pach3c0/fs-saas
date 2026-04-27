const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Notification = require('../models/Notification');
const Subscription = require('../models/Subscription');
const { authenticateToken } = require('../middleware/auth');
const { checkLimit, checkSessionLimit, checkPhotoLimit } = require('../middleware/planLimits');
const { createUploader } = require('../utils/multerConfig');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const storage = require('../services/storage');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const archiver = require('archiver');
const { checkDeadlines } = require('../utils/deadlineChecker');
const { sendGalleryAvailableEmail, sendPhotosDeliveredEmail, sendSelectionSubmittedEmail, sendExtraPhotosRequestedEmail, sendUpsellEmail } = require('../utils/email');
const Client = require('../models/Client');
const Organization = require('../models/Organization');

const uploadSession = createUploader('sessions');

// ============================================================================
// ROTAS DO CLIENTE
// ============================================================================

// CLIENTE: Validar código
router.post('/client/verify-code', async (req, res) => {
  try {
    const { accessCode } = req.body;
    let session = await Session.findOne({
      accessCode,
      isActive: true,
      organizationId: req.organizationId
    }).populate('organizationId'); // Popular dados da organização

    let participant = null;

    // Se não achou pelo código da sessão, tenta achar pelo código de participante
    if (!session) {
      session = await Session.findOne({
        'participants.accessCode': accessCode,
        isActive: true,
        organizationId: req.organizationId
      }).populate('organizationId');

      if (session) {
        participant = session.participants.find(p => p.accessCode === accessCode);
      }
    }

    if (!session) return res.status(401).json({ error: 'Código inválido' });

    // Bloquear acesso a galeria entregue com prazo vencido
    if (
      session.mode === 'gallery' &&
      session.selectionStatus === 'delivered' &&
      session.selectionDeadline &&
      new Date() > new Date(session.selectionDeadline)
    ) {
      return res.status(403).json({ error: 'O prazo de acesso à galeria expirou' });
    }

    // Registrar primeiro acesso do cliente
    if (!session.firstAccessAt) {
      session.firstAccessAt = new Date();
      await session.save();
    }

    // Notificar admin
    try {
      await Notification.create({
        type: 'session_accessed',
        sessionId: session._id,
        sessionName: participant ? `${participant.name} (${session.name})` : session.name,
        message: `${participant ? participant.name : session.name} acessou a galeria`,
        organizationId: session.organizationId
      });
    } catch (e) { }

    // Buscar dados do cliente CRM se vinculado
    let clientData = null;
    if (session.clientId) {
      try {
        const client = await Client.findById(session.clientId).select('name email phone').lean();
        if (client) clientData = { name: client.name, email: client.email, phone: client.phone };
      } catch (e) { }
    }

    res.json({
      success: true,
      sessionId: session._id,
      clientName: participant ? participant.name : session.name,
      sessionType: session.type || '',
      galleryDate: session.date ? new Date(session.date).toLocaleDateString('pt-BR') : '',
      totalPhotos: (session.photos || []).filter(p => !p.hidden).length,
      mode: session.mode || 'gallery',
      selectionStatus: participant ? participant.selectionStatus : (session.selectionStatus || 'pending'),
      packageLimit: participant ? participant.packageLimit : (session.packageLimit || 30),
      extraPhotoPrice: session.extraPhotoPrice || 25,
      watermark: session.watermark !== false,
      commentsEnabled: session.commentsEnabled !== false,
      extraRequest: session.extraRequest || { status: 'none', photos: [] },
      accessCode: session.accessCode,
      selectionDeadline: session.selectionDeadline,
      coverPhoto: session.coverPhoto || '',
      isParticipant: !!participant,
      participantId: participant ? participant._id : null,
      clientData,
      allowExtraPurchasePostSubmit: session.allowExtraPurchasePostSubmit !== false,
      allowReopen: session.allowReopen !== false,
      // Enviar dados da organização para o frontend
      organization: session.organizationId ? {
        id: session.organizationId._id,
        name: session.organizationId.name,
        logo: session.organizationId.logo,
        watermark: session.organizationId.watermarkType ? {
          watermarkType: session.organizationId.watermarkType,
          watermarkText: session.organizationId.watermarkText,
          watermarkOpacity: session.organizationId.watermarkOpacity,
          watermarkPosition: session.organizationId.watermarkPosition,
          watermarkSize: session.organizationId.watermarkSize
        } : null
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Manifest dinâmico para PWA
router.get('/client/manifest/:sessionId', async (req, res) => {
  try {
    const { code } = req.query;
    const session = await Session.findOne({
      _id: req.params.sessionId
    }).populate('organizationId');

    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.accessCode !== code) return res.status(403).json({ error: 'Acesso não autorizado' });

    const org = session.organizationId;
    const themeColor = org && org.primaryColor ? org.primaryColor : '#1a1a1a';
    const orgName = org ? org.name : 'CliqueZoom';

    // Ícones padrão (o usuário deve garantir que estes arquivos existam em /cliente/icons/)
    const icons = [
      {
        "src": "/cliente/icons/icon-192.png",
        "sizes": "192x192",
        "type": "image/png"
      },
      {
        "src": "/cliente/icons/icon-512.png",
        "sizes": "512x512",
        "type": "image/png"
      }
    ];

    const manifest = {
      name: session.name || orgName,
      short_name: session.name ? session.name.split(' ')[0] : 'Galeria',
      start_url: `/cliente/?code=${code}`,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: themeColor,
      orientation: "portrait",
      icons: icons
    };

    res.setHeader('Content-Type', 'application/manifest+json');
    res.json(manifest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Listar fotos
router.get('/client/photos/:sessionId', async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.organizationId
    }).populate('organizationId');

    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const { participantId } = req.query;
    let selectedPhotos = session.selectedPhotos || [];
    let selectionStatus = session.selectionStatus;
    let packageLimit = session.packageLimit;

    if (session.mode === 'multi_selection' && participantId) {
      const p = session.participants.id(participantId);
      if (p) {
        selectedPhotos = p.selectedPhotos || [];
        selectionStatus = p.selectionStatus;
        packageLimit = p.packageLimit;
      }
    }

    res.json({
      success: true,
      name: session.name,
      type: session.type,
      photos: (session.photos || []).filter(p => !p.hidden),
      selectedPhotos: selectedPhotos,
      mode: session.mode,
      selectionStatus: selectionStatus,
      watermark: session.watermark,
      commentsEnabled: session.commentsEnabled !== false,
      extraRequest: session.extraRequest || { status: 'none', photos: [] },
      selectionDeadline: session.selectionDeadline,
      packageLimit: packageLimit,
      extraPhotoPrice: session.extraPhotoPrice,
      allowExtraPurchasePostSubmit: session.allowExtraPurchasePostSubmit !== false,
      allowReopen: session.allowReopen !== false,
      deliveredAt: session.deliveredAt || null,
      // Garantir que organization venha também no refresh
      organization: session.organizationId ? {
        id: session.organizationId._id,
        name: session.organizationId.name,
        logo: session.organizationId.logo,
        watermark: session.organizationId.watermarkType ? {
          watermarkType: session.organizationId.watermarkType,
          watermarkText: session.organizationId.watermarkText,
          watermarkOpacity: session.organizationId.watermarkOpacity,
          watermarkPosition: session.organizationId.watermarkPosition,
          watermarkSize: session.organizationId.watermarkSize
        } : null
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Selecionar/desselecionar foto (toggle)
router.put('/client/select/:sessionId', async (req, res) => {
  try {
    const { photoId, participantId } = req.body;
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.organizationId
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    // Validar prazo
    if (session.selectionDeadline && new Date() > new Date(session.selectionDeadline)) {
      return res.status(403).json({ error: 'O prazo de seleção expirou' });
    }

    if (session.selectionStatus === 'submitted' || session.selectionStatus === 'delivered') {
      return res.status(403).json({
        success: false,
        error: 'A seleção já foi enviada ou entregue e não pode ser modificada diretamente. Solicite fotos extras pelo menu específico.'
      });
    }

    let currentSelection = [];
    let participant = null;

    if (session.mode === 'multi_selection' && participantId) {
      participant = session.participants.id(participantId);
      if (!participant) return res.status(404).json({ error: 'Participante não encontrado' });
      if (!participant.selectedPhotos) participant.selectedPhotos = [];
      currentSelection = participant.selectedPhotos;
    } else {
      if (!session.selectedPhotos) session.selectedPhotos = [];
      currentSelection = session.selectedPhotos;
    }

    const idx = currentSelection.indexOf(photoId);
    if (idx > -1) {
      currentSelection.splice(idx, 1);
    } else {
      currentSelection.push(photoId);
    }

    // Atualizar status para in_progress se for a primeira seleção
    let shouldNotify = false;
    if (participant) {
      if (participant.selectionStatus === 'pending' && currentSelection.length > 0) {
        participant.selectionStatus = 'in_progress';
        shouldNotify = true;
      }
    } else {
      if (session.selectionStatus === 'pending' && currentSelection.length > 0) {
        session.selectionStatus = 'in_progress';
        shouldNotify = true;
      }
    }

    await session.save();

    if (shouldNotify) {
      try {
        await Notification.create({
          type: 'selection_started',
          sessionId: session._id,
          sessionName: participant ? `${participant.name} (${session.name})` : session.name,
          message: `${participant ? participant.name : session.name} iniciou a seleção`,
          organizationId: session.organizationId
        });
      } catch (e) { }
    }

    res.json({ success: true, selectedCount: currentSelection.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Finalizar seleção
router.post('/client/submit-selection/:sessionId', async (req, res) => {
  try {
    const { participantId } = req.body;
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.organizationId
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    // Validar prazo
    if (session.selectionDeadline && new Date() > new Date(session.selectionDeadline)) {
      return res.status(403).json({ error: 'O prazo de seleção expirou' });
    }

    let participant = null;
    if (session.mode === 'multi_selection' && participantId) {
      participant = session.participants.id(participantId);
      if (!participant) return res.status(404).json({ error: 'Participante não encontrado' });
      participant.selectionStatus = 'submitted';
      participant.submittedAt = new Date();
    } else {
      session.selectionStatus = 'submitted';
      session.selectionSubmittedAt = new Date();
    }

    await session.save();

    const selectedCount = participant ? participant.selectedPhotos.length : session.selectedPhotos.length;

    try {
      await Notification.create({
        type: 'selection_submitted',
        sessionId: session._id,
        sessionName: participant ? `${participant.name} (${session.name})` : session.name,
        message: `${participant ? participant.name : session.name} finalizou a seleção (${selectedCount} fotos)`,
        organizationId: session.organizationId
      });
    } catch (e) { }

    // Notificar fotografo por e-mail + upsell para o cliente
    try {
      const org = await Organization.findById(session.organizationId).select('email name slug');
      const clientName = participant ? participant.name : session.name;

      if (org?.email) {
        sendSelectionSubmittedEmail(org.email, clientName, selectedCount, session._id, org.slug).catch(() => { });
      }

      // Upsell: oferecer fotos extras ao cliente se a sessão tiver preço configurado E permitido no config
      const clientEmail = participant ? participant.email : session.clientEmail;
      const canUpsell = session.allowExtraPurchasePostSubmit !== false; // por padrão habilitado

      if (clientEmail && session.extraPhotoPrice > 0 && canUpsell && !session.extraRequest?.upsellingSent) {
        sendUpsellEmail(
          clientEmail,
          clientName,
          session.name,
          org?.name || '',
          session.extraPhotoPrice,
          session._id,
          session.accessCode,
          org?.slug || ''
        ).catch(() => { });

        // Marcar como enviado
        await Session.findByIdAndUpdate(session._id, { 'extraRequest.upsellingSent': true });
      }
    } catch (e) { }

    const totalPhotos = session.photos?.length || 0;
    const extraUpsellAvailable = totalPhotos > selectedCount;

    res.json({
      success: true,
      extraUpsellAvailable,
      extraPhotoPrice: session.extraPhotoPrice || 25
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Pedir reabertura da seleção
router.post('/client/request-reopen/:sessionId', async (req, res) => {
  try {
    const { accessCode } = req.body;
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.organizationId
    });
    if (!session || !session.isActive) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.accessCode !== accessCode) return res.status(403).json({ error: 'Acesso não autorizado' });

    // Validar se reabertura está permitida no config
    if (session.allowReopen === false) {
      return res.status(403).json({ error: 'A reabertura desta sessão não está permitida pelo fotógrafo.' });
    }

    if (session.selectionStatus !== 'submitted') return res.status(400).json({ error: 'Seleção não está no status enviada' });

    try {
      await Notification.create({
        type: 'reopen_requested',
        sessionId: session._id,
        sessionName: session.name,
        message: `${session.name} pediu reabertura da seleção`,
        organizationId: session.organizationId
      });
    } catch (e) { }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Adicionar comentário
router.post('/client/comments/:sessionId', async (req, res) => {
  try {
    const { accessCode, photoId, text } = req.body;
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.organizationId
    });

    if (!session || !session.isActive) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.accessCode !== accessCode) return res.status(403).json({ error: 'Acesso não autorizado' });

    // Validar prazo
    if (session.selectionDeadline && new Date() > new Date(session.selectionDeadline)) {
      return res.status(403).json({ error: 'O prazo de seleção expirou' });
    }

    const photo = session.photos.find(p => p.id === photoId);
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada' });

    const newComment = {
      text,
      createdAt: new Date(),
      author: 'client'
    };

    if (!photo.comments) photo.comments = [];
    photo.comments.push(newComment);

    await session.save();

    try {
      await Notification.create({
        type: 'comment_added',
        sessionId: session._id,
        sessionName: session.name,
        photoId: photoId,
        message: `${session.name} comentou em uma foto`,
        organizationId: session.organizationId
      });
    } catch (e) { }

    res.json({ success: true, comment: newComment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Solicitar fotos extras após envio da seleção
router.post('/client/request-extra-photos/:sessionId', async (req, res) => {
  try {
    const { accessCode, photos } = req.body;
    if (!photos || !photos.length) return res.status(400).json({ error: 'Selecione ao menos uma foto' });

    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.organizationId
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.accessCode !== accessCode) return res.status(403).json({ error: 'Acesso não autorizado' });
    if (session.selectionStatus !== 'submitted' && session.selectionStatus !== 'delivered') return res.status(400).json({ error: 'Seleção ainda não foi enviada' });
    if (session.extraRequest && session.extraRequest.status === 'pending') {
      return res.status(400).json({ error: 'Já existe uma solicitação de extras pendente' });
    }

    session.extraRequest = {
      status: 'pending',
      photos,
      requestedAt: new Date()
    };
    await session.save();

    try {
      await Notification.create({
        type: 'extra_photos_requested',
        sessionId: session._id,
        sessionName: session.name,
        message: `${session.name} solicitou ${photos.length} foto(s) extra(s)`,
        organizationId: session.organizationId
      });
    } catch (e) { }

    try {
      const org = await Organization.findById(session.organizationId).select('email name');
      if (org?.email) {
        sendExtraPhotosRequestedEmail(org.email, session.name, photos.length).catch(() => { });
      }
    } catch (e) { }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ROTAS DO ADMIN
// ============================================================================

// ADMIN: CRUD Sessões
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await Session.find({ organizationId: req.user.organizationId })
      .sort({ createdAt: -1 })
      .populate('clientId', 'name email phone');
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Buscar sessão por ID (com fotos)
router.get('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    }).populate('clientId', 'name email phone');
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions', authenticateToken, checkLimit, checkSessionLimit, async (req, res) => {
  try {
    const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const session = await Session.create({
      ...req.body,
      accessCode,
      isActive: true,
      organizationId: req.user.organizationId
    });

    // Incrementar contador de uso
    await Subscription.findOneAndUpdate(
      { organizationId: req.user.organizationId },
      { $inc: { 'usage.sessions': 1 } }
    );

    // Update onboarding step
    await Organization.findByIdAndUpdate(req.user.organizationId, {
      'onboarding.steps.sessionCreated': true
    });

    // E-mail NAO é enviado aqui. O fotografo envia manualmente via POST /sessions/:id/send-code

    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body,
      { returnDocument: 'after' }
    );
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    // Update onboarding se vinculou cliente
    if (req.body.clientId || req.body.clientEmail) {
      await Organization.findByIdAndUpdate(req.user.organizationId, {
        'onboarding.steps.clientLinked': true
      });
    }

    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Enviar codigo de acesso manualmente ao cliente
router.post('/sessions/:id/send-code', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const email = session.clientEmail || (session.clientId ? (await Client.findById(session.clientId).select('email').lean())?.email : '');
    if (!email) return res.status(400).json({ error: 'Nenhum e-mail cadastrado para este cliente' });

    const org = await Organization.findById(req.user.organizationId).select('name slug');
    await sendGalleryAvailableEmail(email, session.name, session.accessCode, org?.name || 'Fotógrafo', org?.slug);

    session.codeSentAt = new Date();
    await session.save();

    // Update onboarding step
    await Organization.findByIdAndUpdate(req.user.organizationId, {
      'onboarding.steps.linkSent': true
    });

    res.json({ success: true, message: `E-mail enviado para ${email}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Aceitar solicitação de fotos extras
router.put('/sessions/:id/extra-request/accept', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (!session.extraRequest || session.extraRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Nenhuma solicitação pendente' });
    }
    // Adicionar fotos extras às já selecionadas (sem duplicatas)
    const extras = session.extraRequest.photos || [];
    extras.forEach(id => { if (!session.selectedPhotos.includes(id)) session.selectedPhotos.push(id); });
    session.extraRequest.status = 'accepted';
    session.extraRequest.respondedAt = new Date();
    await session.save();
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Recusar solicitação de fotos extras
router.put('/sessions/:id/extra-request/reject', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (!session.extraRequest || session.extraRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Nenhuma solicitação pendente' });
    }
    session.extraRequest.status = 'rejected';
    session.extraRequest.respondedAt = new Date();
    session.extraRequest.rejectReason = req.body.reason || '';
    await session.save();

    // Enviar e-mail de notificação para o cliente
    try {
      const clientEmail = session.clientEmail || (session.clientId ? (await Client.findById(session.clientId).select('email').lean())?.email : '');
      if (clientEmail) {
        const org = await Organization.findById(req.user.organizationId).select('name slug');
        const { sendExtraPhotosRejectedEmail } = require('../utils/email');
        if (sendExtraPhotosRejectedEmail) {
          sendExtraPhotosRejectedEmail(clientEmail, session.name, org?.name || 'O fotógrafo', session.extraRequest.rejectReason, org?.slug).catch(() => { });
        }
      }
    } catch (e) {
      console.error('Erro ao enviar email de recusa:', e);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });
    if (session) {
      const photoCount = session.photos.length;

      // Limpar arquivos físicos antes de remover do banco
      const deletions = [];
      session.photos.forEach(p => {
        if (p.url && p.url.startsWith('/uploads/')) {
          deletions.push(storage.deleteFile(p.url));
        }
        if (p.urlOriginal && p.urlOriginal.startsWith('/uploads/')) {
          deletions.push(storage.deleteFile(p.urlOriginal));
        }
        if (p.urlEditada && p.urlEditada.startsWith('/uploads/')) {
          deletions.push(storage.deleteFile(p.urlEditada));
        }
      });
      if (session.coverPhoto && session.coverPhoto.startsWith('/uploads/')) {
        deletions.push(storage.deleteFile(session.coverPhoto));
      }
      await Promise.all(deletions);
      await Session.findByIdAndDelete(req.params.id);

      // Decrementar contadores
      await Subscription.findOneAndUpdate(
        { organizationId: req.user.organizationId },
        {
          $inc: {
            'usage.sessions': -1,
            'usage.photos': -photoCount
          }
        }
      );
    }
    res.json({ success: true });
  } catch (error) {
    req.logger?.error('Delete Session Error', { error: error.message, stack: error.stack, sessionId: req.params.id });
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/photos', authenticateToken, checkLimit, checkPhotoLimit, uploadSession.array('photos'), async (req, res) => {
  const generatedThumbs = []; // declarado fora do try para ser acessível no catch
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const orgId = req.user.organizationId;
    const newPhotos = [];

    for (const file of req.files) {
      const originalPath = file.path;
      const thumbFilename = 'thumb-' + file.filename;
      const thumbPath = path.join(path.dirname(originalPath), thumbFilename);

      // Gerar thumb comprimida (resolucao configurada na sessao, qualidade 85)
      const thumbRes = session.photoResolution || 1200;
      await sharp(originalPath)
        .resize(thumbRes, thumbRes, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(thumbPath);

      generatedThumbs.push(thumbPath);

      // Original do upload nao tem valor (sera substituida pela editada via upload-edited).
      // Deleta do disco, urlOriginal fica vazio ate a re-subida.
      await storage.deleteFile(originalPath);

      newPhotos.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        filename: file.originalname, // Nome original preservado para exportação e Lightroom
        url: `/uploads/${orgId}/sessions/${thumbFilename}`,
        urlOriginal: '',
        uploadedAt: new Date()
      });
    }

    session.photos.push(...newPhotos);
    await session.save();

    // Incrementar contador de fotos
    await Subscription.findOneAndUpdate(
      { organizationId: req.user.organizationId },
      { $inc: { 'usage.photos': newPhotos.length } }
    );

    // Update onboarding step
    await Organization.findByIdAndUpdate(req.user.organizationId, {
      'onboarding.steps.photosUploaded': true
    });

    res.json({ success: true, photos: newPhotos });
  } catch (error) {
    req.logger?.error('Upload Photos Error', { error: error.message, stack: error.stack, sessionId: req.params.id });
    // Limpar arquivos físicos que o multer salvou para evitar órfãos
    if (req.files) {
      await Promise.all(req.files.map(f => storage.deleteFile(f.path).catch(() => { })));
    }
    if (generatedThumbs && generatedThumbs.length > 0) {
      await Promise.all(generatedThumbs.map(t => storage.deleteFile(t).catch(() => { })));
    }
    res.status(500).json({ error: error.message });
  }
});

// Upload das fotos editadas (fluxo post_edit) — casa por nome de arquivo
router.post('/sessions/:id/photos/upload-edited', authenticateToken, uploadSession.array('photos'), async (req, res) => {
  const generatedThumbs = []; // declarado fora do try para ser acessível no catch
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const orgId = req.user.organizationId;
    const allowUnmatched = req.query.allowUnmatched === 'true';
    const matched = [];
    const unmatched = [];
    const newPhotos = [];

    for (const file of req.files) {
      const originalName = file.originalname;
      const photo = session.photos.find(p => p.filename === originalName);

      if (!photo) {
        if (!allowUnmatched) {
          // Arquivo não casou — deletar e reportar
          await storage.deleteFile(file.path);
          unmatched.push(originalName);
          continue;
        }

        // Se permitir não-pareadas, tratar como nova foto (subindo como editada/original direto)
        const originalPath = file.path;
        const thumbFilename = 'thumb-' + file.filename;
        const thumbPath = path.join(path.dirname(originalPath), thumbFilename);
        const thumbRes = session.photoResolution || 1200;

        await sharp(originalPath)
          .resize(thumbRes, thumbRes, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(thumbPath);

        generatedThumbs.push(thumbPath);

        newPhotos.push({
          id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          filename: originalName,
          url: `/uploads/${orgId}/sessions/${thumbFilename}`,
          urlOriginal: `/uploads/${orgId}/sessions/${file.filename}`,
          uploadedAt: new Date()
        });
        matched.push(originalName);
        continue;
      }

      // Se havia urlOriginal anterior, deletar do disco
      if (photo.urlOriginal) {
        const oldPath = path.join(__dirname, '../..', photo.urlOriginal);
        await storage.deleteFile(oldPath);
      }

      // Deletar thumb antiga para substituir pela nova (com a edição final)
      if (photo.url) {
        const oldThumbPath = path.join(__dirname, '../..', photo.url);
        await storage.deleteFile(oldThumbPath);
      }

      const originalPath = file.path;
      const thumbFilename = 'thumb-' + file.filename;
      const thumbPath = path.join(path.dirname(originalPath), thumbFilename);

      // Gerar nova thumb a partir da foto editada
      const thumbRes = session.photoResolution || 1200;
      await sharp(originalPath)
        .resize(thumbRes, thumbRes, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(thumbPath);

      generatedThumbs.push(thumbPath);

      photo.url = `/uploads/${orgId}/sessions/${thumbFilename}`;
      photo.urlOriginal = `/uploads/${orgId}/sessions/${file.filename}`;
      matched.push(originalName);
    }

    if (newPhotos.length > 0) {
      session.photos.push(...newPhotos);
      // Incrementar contador de fotos
      await Subscription.findOneAndUpdate(
        { organizationId: req.user.organizationId },
        { $inc: { 'usage.photos': newPhotos.length } }
      );
    }

    session.markModified('photos');
    session.lastEditedUploadAt = new Date();
    await session.save();

    res.json({ success: true, matched, unmatched, newCount: newPhotos.length });
  } catch (error) {
    req.logger?.error('Upload Edited Photos Error', { error: error.message, stack: error.stack, sessionId: req.params.id });
    if (req.files) {
      await Promise.all(req.files.map(f => storage.deleteFile(f.path).catch(() => { })));
    }
    if (generatedThumbs && generatedThumbs.length > 0) {
      await Promise.all(generatedThumbs.map(t => storage.deleteFile(t).catch(() => { })));
    }
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Deletar fotos em massa — deve vir ANTES de /:photoId para evitar que 'bulk' seja capturado como parâmetro
router.delete('/sessions/:id/photos/bulk', authenticateToken, async (req, res) => {
  try {
    const { photoIds } = req.body;
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs inválida' });
    }

    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId }).lean();
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const photosToDelete = (session.photos || []).filter(p => photoIds.includes(p.id));
    const deletedCount = photosToDelete.length;

    // Deletar arquivos físicos
    for (const photo of photosToDelete) {
      try {
        const deletions = [];
        if (photo.url && photo.url.startsWith('/uploads/')) deletions.push(storage.deleteFile(photo.url));
        if (photo.urlOriginal && photo.urlOriginal.startsWith('/uploads/')) deletions.push(storage.deleteFile(photo.urlOriginal));
        if (photo.urlEditada && photo.urlEditada.startsWith('/uploads/')) deletions.push(storage.deleteFile(photo.urlEditada));
        await Promise.all(deletions);
      } catch (e) {
        console.error(`Erro ao deletar arquivos da foto ${photo.id}:`, e);
      }
    }

    // Remover do MongoDB de forma atômica (evita problemas de Mongoose não detectar mudanca em array)
    await Session.updateOne(
      { _id: req.params.id, organizationId: req.user.organizationId },
      {
        $pull: {
          photos: { id: { $in: photoIds } },
          selectedPhotos: { $in: photoIds }
        }
      }
    );

    // Decrementar contador de fotos
    if (deletedCount > 0) {
      await Subscription.findOneAndUpdate(
        { organizationId: req.user.organizationId },
        { $inc: { 'usage.photos': -deletedCount } }
      );
    }

    res.json({ success: true, deletedCount });
  } catch (error) {
    console.error('Erro bulk delete:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:sessionId/photos/:photoId', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.user.organizationId
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const idx = session.photos.findIndex(p => p.id === req.params.photoId);
    if (idx > -1) {
      const photo = session.photos[idx];
      const deletions = [];
      if (photo.url && photo.url.startsWith('/uploads/')) {
        deletions.push(storage.deleteFile(photo.url));
      }
      if (photo.urlOriginal && photo.urlOriginal.startsWith('/uploads/')) {
        deletions.push(storage.deleteFile(photo.urlOriginal));
      }
      if (photo.urlEditada && photo.urlEditada.startsWith('/uploads/')) {
        deletions.push(storage.deleteFile(photo.urlEditada));
      }
      await Promise.all(deletions);
      session.photos.splice(idx, 1);

      if (session.selectedPhotos) {
        session.selectedPhotos = session.selectedPhotos.filter(id => id !== req.params.photoId);
      }

      await session.save();

      // Decrementar contador de fotos
      await Subscription.findOneAndUpdate(
        { organizationId: req.user.organizationId },
        { $inc: { 'usage.photos': -1 } }
      );
    }
    res.json({ success: true });
  } catch (error) {
    req.logger?.error('Delete Photo Error', { error: error.message, stack: error.stack, sessionId: req.params.sessionId, photoId: req.params.photoId });
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Ocultar/Mostrar foto
router.put('/sessions/:id/photos/:photoId/toggle-hidden', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const photo = session.photos.find(p => p.id === req.params.photoId);
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada' });

    // Regra: se ocultar drops photos.length abaixo de packageLimit
    if (!photo.hidden) {
      const visiblePhotos = session.photos.filter(p => !p.hidden).length;
      if (session.mode === 'selection' && visiblePhotos <= session.packageLimit) {
        return res.status(400).json({ error: `Não é possível ocultar mais fotos. O pacote exige no mínimo ${session.packageLimit} fotos visíveis.` });
      }
    }

    photo.hidden = !photo.hidden;
    await session.save();

    res.json({ success: true, photoId: photo.id, hidden: photo.hidden });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/sessions/:id/reopen', authenticateToken, async (req, res) => {
  try {
    await Session.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { selectionStatus: 'in_progress' }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/sessions/:id/deliver', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    // Validação: todas as fotos selecionadas devem ter urlOriginal
    const selectedSet = new Set(session.selectedPhotos || []);
    const missing = [];
    const extrasDelivered = [];

    for (const photo of session.photos) {
      if (selectedSet.has(photo.id) && !photo.urlOriginal) {
        missing.push(photo.filename || photo.id);
      }
      if (photo.urlOriginal && !selectedSet.has(photo.id)) {
        extrasDelivered.push(photo.id);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: `${missing.length} foto(s) selecionada(s) sem versão editada. Suba as editadas antes de entregar.`,
        missing
      });
    }

    // Registrar ciclo no histórico de entregas
    session.deliveryHistory.push({
      deliveredAt: new Date(),
      selectedCount: session.selectedPhotos.length,
      extrasDelivered
    });

    session.selectionStatus = 'delivered';
    session.watermark = false;
    session.deliveredAt = new Date();
    session.redeliveryMode = false;

    await session.save();

    // Notificar cliente por e-mail
    if (session.clientEmail) {
      const org = await Organization.findById(session.organizationId).select('name slug');
      sendPhotosDeliveredEmail(session.clientEmail, session.name, session.accessCode, org?.name || 'Fotógrafo', org?.slug).catch(() => { });
    }

    res.json({ success: true, extrasCount: extrasDelivered.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/sessions/:id/reopen-delivery', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      selectionStatus: 'delivered'
    });
    if (!session) return res.status(400).json({ error: 'Sessão não está no estado entregue' });

    // Registrar reabertura no último ciclo do histórico
    const lastEntry = session.deliveryHistory[session.deliveryHistory.length - 1];
    if (lastEntry && !lastEntry.reopenedAt) {
      lastEntry.reopenedAt = new Date();
      lastEntry.reopenReason = req.body.reason || '';
    }

    session.redeliveryMode = true;
    await session.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:sessionId/photos/:photoId/comments', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.user.organizationId
    });

    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const photo = session.photos.find(p => p.id === req.params.photoId);
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada' });

    const newComment = {
      text,
      createdAt: new Date(),
      author: 'admin'
    };

    if (!photo.comments) photo.comments = [];
    photo.comments.push(newComment);

    await session.save();
    res.json({ success: true, comment: newComment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Exportar lista de fotos selecionadas (para Lightroom)
router.get('/sessions/:sessionId/export', (req, res) => {
  const token = req.query.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';
  let user;
  try {
    user = jwt.verify(token, secret);
  } catch {
    return res.status(403).json({ error: 'Token inválido' });
  }

  Session.findOne({ _id: req.params.sessionId, organizationId: user.organizationId })
    .then(session => {
      if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

      const selectedIds = session.selectedPhotos || [];
      const filenames = session.photos
        .filter(p => selectedIds.includes(p.id))
        .map(p => p.filename);

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="selecao-${session.name.replace(/\s+/g, '-')}.txt"`);
      res.send(filenames.join('\n'));
    })
    .catch(error => {
      res.status(500).json({ error: error.message });
    });
});

// ADMIN: Gerenciar Participantes (Multi-Seleção)

// Adicionar participante
router.post('/sessions/:id/participants', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, packageLimit } = req.body;
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    session.participants.push({
      name, email, phone, packageLimit, accessCode,
      selectionStatus: 'pending',
      selectedPhotos: []
    });

    await session.save();
    res.json({ success: true, participants: session.participants });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Editar participante
router.put('/sessions/:id/participants/:pid', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const p = session.participants.id(req.params.pid);
    if (!p) return res.status(404).json({ error: 'Participante não encontrado' });

    if (req.body.name) p.name = req.body.name;
    if (req.body.email !== undefined) p.email = req.body.email;
    if (req.body.phone !== undefined) p.phone = req.body.phone;
    if (req.body.packageLimit) p.packageLimit = req.body.packageLimit;

    await session.save();
    res.json({ success: true, participants: session.participants });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remover participante
router.delete('/sessions/:id/participants/:pid', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    session.participants.pull(req.params.pid);
    await session.save();
    res.json({ success: true, participants: session.participants });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Entregar participante individualmente
router.put('/sessions/:id/participants/:pid/deliver', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const p = session.participants.id(req.params.pid);
    if (!p) return res.status(404).json({ error: 'Participante não encontrado' });

    p.selectionStatus = 'delivered';
    await session.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Exportar seleções dos participantes
router.get('/sessions/:id/participants/export', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    let output = `SESSÃO: ${session.name}\nDATA: ${new Date().toLocaleDateString('pt-BR')}\nTOTAL DE PARTICIPANTES: ${session.participants.length}\n\n`;

    session.participants.forEach(p => {
      output += `----------------------------------------\n`;
      output += `PARTICIPANTE: ${p.name} (Código: ${p.accessCode})\n`;
      output += `STATUS: ${p.selectionStatus}\n`;
      output += `FOTOS SELECIONADAS (${p.selectedPhotos.length}):\n`;

      const filenames = session.photos.filter(ph => p.selectedPhotos.includes(ph.id)).map(ph => ph.filename);
      output += filenames.length > 0 ? filenames.join('\n') : '(nenhuma)';
      output += `\n\n`;
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="selecoes-${session.name.replace(/\s+/g, '-')}.txt"`);
    res.send(output);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Verificar prazos manualmente (Gatilho para Cron)
router.post('/sessions/check-deadlines', authenticateToken, async (req, res) => {
  try {
    // Verifica apenas para a organização do usuário logado
    const result = await checkDeadlines(req.user.organizationId);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ROTAS DE DOWNLOAD (FASE 4 - Entrega em Alta Resolução)
// ============================================================================

// CLIENTE: Download de foto individual (alta resolução)
router.get('/client/download/:sessionId/:photoId', async (req, res) => {
  try {
    const { code } = req.query;
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.organizationId
    });

    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.accessCode !== code) return res.status(403).json({ error: 'Acesso não autorizado' });
    if (session.selectionStatus !== 'delivered') return res.status(403).json({ error: 'Fotos ainda não foram entregues' });
    if (session.mode === 'gallery' && session.selectionDeadline && new Date() > new Date(session.selectionDeadline)) {
      return res.status(403).json({ error: 'O prazo de acesso à galeria expirou' });
    }

    const photo = session.photos.find(p => p.id === req.params.photoId);
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada' });

    // Sempre que houver urlOriginal (foto editada re-subida), servir ela; senao, a thumb
    const urlToServe = photo.urlOriginal || photo.url;
    const filePath = path.join(__dirname, '../..', urlToServe);

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo não encontrado' });

    const filename = photo.filename || path.basename(filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'image/jpeg');
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Download de todas as fotos entregues em ZIP
router.get('/client/download-all/:sessionId', async (req, res) => {
  try {
    const { code } = req.query;
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.organizationId
    });

    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.accessCode !== code) return res.status(403).json({ error: 'Acesso não autorizado' });
    if (session.mode !== 'gallery' && session.selectionStatus !== 'delivered') return res.status(403).json({ error: 'Fotos ainda não foram entregues' });
    if (session.mode === 'gallery' && session.selectionDeadline && new Date() > new Date(session.selectionDeadline)) {
      return res.status(403).json({ error: 'O prazo de acesso à galeria expirou' });
    }

    // Determinar quais fotos incluir no ZIP
    // No modo 'selection': só as fotos selecionadas; no modo 'gallery': todas
    const selectedIds = session.selectedPhotos || [];
    const photosToZip = session.mode === 'selection'
      ? session.photos.filter(p => selectedIds.includes(p.id))
      : session.photos;

    if (photosToZip.length === 0) return res.status(404).json({ error: 'Nenhuma foto para download' });

    const sessionName = session.name.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="fotos-${sessionName}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    for (const photo of photosToZip) {
      const urlToServe = photo.urlOriginal || photo.url;
      const filePath = path.join(__dirname, '../..', urlToServe);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: photo.filename || path.basename(filePath) });
      }
    }

    archive.on('error', (err) => {
      console.error('Erro ao criar ZIP:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Erro ao criar ZIP' });
    });

    await archive.finalize();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
