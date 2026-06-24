const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Notification = require('../models/Notification');
const Subscription = require('../models/Subscription');
const { authenticateToken } = require('../middleware/auth');
const { checkLimit, checkSessionLimit, checkPhotoLimit } = require('../middleware/planLimits');
const { checkHoneyPot } = require('../middleware/security');
const rateLimit = require('express-rate-limit');
const { createUploader } = require('../utils/multerConfig');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const storage = require('../services/storage');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const archiver = require('archiver');
const { checkDeadlines } = require('../utils/deadlineChecker');
const { sendGalleryAvailableEmail, sendPhotosDeliveredEmail, sendSelectionSubmittedEmail, sendExtraPhotosRequestedEmail, sendExtraPhotosRejectedEmail, sendUpsellEmail, buildWhatsAppGalleryLink, sendPendingDownloadEmail } = require('../utils/email');
const Client = require('../models/Client');
const Organization = require('../models/Organization');
const { trackEvent } = require('../utils/activityTracker');

const uploadSession = createUploader('sessions');

// Registra evento no array events[] da sessão sem bloquear a resposta principal
async function _logEvent(sessionId, type, meta = {}) {
  try {
    await Session.updateOne(
      { _id: sessionId },
      { $push: { events: { type, ts: new Date(), meta } } }
    );
  } catch (_) {}
}

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

    // Preview do fotógrafo: _ap é o JWT do próprio dono da sessão.
    // Quando válido, o acesso não conta como acesso do cliente (não grava firstAccessAt nem notifica).
    let adminPreview = false;
    const apToken = req.body?._ap;
    if (apToken) {
      try {
        const payload = jwt.verify(apToken, process.env.JWT_SECRET || 'fs-fotografias-secret-key');
        const orgId = session.organizationId?._id || session.organizationId;
        adminPreview = payload.organizationId?.toString() === orgId.toString();
      } catch (_) {}
    }

    // Bloqueio de emergência ativado pelo fotógrafo.
    // Bypass permitido quando é preview admin (_ap válido do dono da sessão).
    if (session.clientAccessBlocked && !adminPreview) {
      return res.status(403).json({ error: 'Galeria temporariamente indisponível. Entre em contato com o fotógrafo.' });
    }

    // Bloquear acesso a galeria entregue com prazo vencido
    if (
      session.mode === 'gallery' &&
      session.selectionStatus === 'delivered' &&
      session.selectionDeadline &&
      new Date() > new Date(session.selectionDeadline)
    ) {
      return res.status(403).json({ error: 'O prazo de acesso à galeria expirou' });
    }

    // Galeria em Grupo (entrega direta, sem etapa de entrega): o prazo vale como prazo de acesso.
    if (
      session.mode === 'multi_gallery' &&
      session.selectionDeadline &&
      new Date() > new Date(session.selectionDeadline)
    ) {
      return res.status(403).json({ error: 'O prazo de acesso à galeria expirou' });
    }

    // Preview do fotógrafo não registra acesso nem notifica — só o acesso real do cliente conta.
    if (!adminPreview) {
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
    }

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
      galleryDeliveryMode: session.galleryDeliveryMode || null,
      packageLimit: participant ? participant.packageLimit : (session.packageLimit ?? 30),
      extraPhotoPrice: (participant && participant.extraPhotoPrice != null) ? participant.extraPhotoPrice : (session.extraPhotoPrice || 25),
      // Tabela de preços por faixa de quantidade (display) — vazia = usa extraPhotoPrice
      pricingTable: session.pricingTable || [],
      watermark: session.watermark !== false,
      commentsEnabled: session.commentsEnabled !== false,
      selectionIcon: (session.organizationId && session.organizationId.preferences && session.organizationId.preferences.selectionIcon) || 'heart',
      extraRequest: (participant ? participant.extraRequest : session.extraRequest) || { status: 'none', photos: [] },
      // Cortesias explícitas: do participante (multi) ou da sessão (seleção individual).
      courtesyPhotos: participant ? (participant.courtesyPhotos || []) : (session.courtesyPhotos || []),
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
        watermark: {
          watermarkType: session.organizationId.watermarkType,
          watermarkText: session.organizationId.watermarkText,
          watermarkOpacity: session.organizationId.watermarkOpacity,
          watermarkPosition: session.organizationId.watermarkPosition,
          watermarkSize: session.organizationId.watermarkSize,
          watermarkFontColor: session.organizationId.watermarkFontColor,
          watermarkFontFamily: session.organizationId.watermarkFontFamily,
          watermarkFontWeight: session.organizationId.watermarkFontWeight,
          watermarkFontStyle: session.organizationId.watermarkFontStyle,
          watermarkLetterSpacing: session.organizationId.watermarkLetterSpacing,
          watermarkRotation: session.organizationId.watermarkRotation,
          watermarkCustomSize: session.organizationId.watermarkCustomSize,
          watermarkShadow: session.organizationId.watermarkShadow,
          watermarkImageFilter: session.organizationId.watermarkImageFilter,
          watermarkImageOpacity: session.organizationId.watermarkImageOpacity,
          watermarkLayers: session.organizationId.watermarkLayers || []
        }
      } : null
    });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
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
    req.logger.error('Erro interno', { error: error.message });
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

    if (session.clientAccessBlocked) {
      let adminPreview = false;
      const apToken = req.query?._ap;
      if (apToken) {
        try {
          const payload = jwt.verify(apToken, process.env.JWT_SECRET || 'fs-fotografias-secret-key');
          const orgId = session.organizationId?._id || session.organizationId;
          adminPreview = payload.organizationId?.toString() === orgId.toString();
        } catch (_) {}
      }
      if (!adminPreview) {
        return res.status(403).json({ error: 'Galeria temporariamente indisponível. Entre em contato com o fotógrafo.' });
      }
    }

    const { participantId } = req.query;
    let selectedPhotos = session.selectedPhotos || [];
    let selectionStatus = session.selectionStatus;
    let packageLimit = session.packageLimit;
    let extraPhotoPrice = session.extraPhotoPrice;
    let extraRequest = session.extraRequest;
    // Cortesia EXPLÍCITA: na seleção individual vem de session.courtesyPhotos (o fotógrafo escolhe).
    // No multi é sobrescrita abaixo pela lista do participante.
    let courtesyPhotos = session.courtesyPhotos || [];

    if ((session.mode === 'multi_selection' || session.mode === 'multi_instant') && participantId) {
      const p = session.participants.id(participantId);
      if (p) {
        selectedPhotos = p.selectedPhotos || [];
        selectionStatus = p.selectionStatus;
        packageLimit = p.packageLimit;
        if (p.extraPhotoPrice != null) extraPhotoPrice = p.extraPhotoPrice;
        extraRequest = p.extraRequest;
        courtesyPhotos = p.courtesyPhotos || [];
      }
    }

    // SANITIZAÇÃO DE SAÍDA — isolamento entre participantes no pool COMPARTILHADO do multi.
    // 1) Nunca enviar o caminho da alta (urlOriginal/urlRaw) ao cliente. O front só usa urlOriginal
    //    como BOOLEANO ("foto pronta?") e o download passa pela rota /client/download com ACL. Sem isto,
    //    qualquer participante leria o path no JSON e baixaria a alta de QUALQUER outro direto pelo
    //    /uploads estático (sem marca, sem auth) — vazamento cross-participante de alta resolução.
    // 2) Comentários: devolver só o thread DESTE participante (multi) ou os de sessão (individual),
    //    espelhando commentsFor() do cliente — evita vazar comentário privado de outro participante.
    const reqParticipantId = ((session.mode === 'multi_selection' || session.mode === 'multi_instant') && participantId) ? String(participantId) : '';
    const safePhotos = (session.photos || []).filter(p => !p.hidden).map(p => {
      const o = p.toObject ? p.toObject() : { ...p };
      o.urlOriginal = o.urlOriginal ? true : '';   // booleano "pronta", sem expor o caminho real
      delete o.urlRaw; delete o.widthRaw; delete o.heightRaw;
      if (Array.isArray(o.comments)) {
        o.comments = o.comments.filter(c => String(c.participantId || '') === reqParticipantId);
      }
      return o;
    });

    res.json({
      success: true,
      name: session.name,
      type: session.type,
      photos: safePhotos,
      selectedPhotos: selectedPhotos,
      // Cortesias explícitas deste participante (multi). Vazia em seleção individual.
      courtesyPhotos: courtesyPhotos,
      mode: session.mode,
      selectionStatus: selectionStatus,
      // Em modo galeria: 'direct' = entrega direta sem marca d'água; 'preview' = prévia com marca d'água
      galleryDeliveryMode: session.galleryDeliveryMode || null,
      watermark: session.watermark,
      commentsEnabled: session.commentsEnabled !== false,
      selectionIcon: (session.organizationId && session.organizationId.preferences && session.organizationId.preferences.selectionIcon) || 'heart',
      extraRequest: extraRequest || { status: 'none', photos: [] },
      selectionDeadline: session.selectionDeadline,
      packageLimit: packageLimit,
      extraPhotoPrice: extraPhotoPrice,
      // Tabela de preços por faixa de quantidade (display) — vazia = usa extraPhotoPrice
      pricingTable: session.pricingTable || [],
      allowExtraPurchasePostSubmit: session.allowExtraPurchasePostSubmit !== false,
      allowReopen: session.allowReopen !== false,
      deliveredAt: session.deliveredAt || null,
      // Garantir que organization venha também no refresh
      organization: session.organizationId ? {
        id: session.organizationId._id,
        name: session.organizationId.name,
        logo: session.organizationId.logo,
        watermark: {
          watermarkType: session.organizationId.watermarkType,
          watermarkText: session.organizationId.watermarkText,
          watermarkOpacity: session.organizationId.watermarkOpacity,
          watermarkPosition: session.organizationId.watermarkPosition,
          watermarkSize: session.organizationId.watermarkSize,
          watermarkFontColor: session.organizationId.watermarkFontColor,
          watermarkFontFamily: session.organizationId.watermarkFontFamily,
          watermarkFontWeight: session.organizationId.watermarkFontWeight,
          watermarkFontStyle: session.organizationId.watermarkFontStyle,
          watermarkLetterSpacing: session.organizationId.watermarkLetterSpacing,
          watermarkRotation: session.organizationId.watermarkRotation,
          watermarkCustomSize: session.organizationId.watermarkCustomSize,
          watermarkShadow: session.organizationId.watermarkShadow,
          watermarkImageFilter: session.organizationId.watermarkImageFilter,
          watermarkImageOpacity: session.organizationId.watermarkImageOpacity,
          watermarkLayers: session.organizationId.watermarkLayers || []
        }
      } : null
    });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Selecionar/desselecionar foto (toggle)
router.put('/client/select/:sessionId', async (req, res) => {
  try {
    const { photoId, participantId } = req.body;
    if (!photoId) return res.status(400).json({ error: 'photoId é obrigatório' });
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

    if ((session.mode === 'multi_selection' || session.mode === 'multi_instant') && participantId) {
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
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Substituir seleção em bloco (usado pelo "Selecionar Tudo")
router.post('/client/selection/:sessionId', async (req, res) => {
  try {
    const { accessCode, selectedPhotos, participantId } = req.body;
    if (!Array.isArray(selectedPhotos)) return res.status(400).json({ error: 'selectedPhotos deve ser array' });

    const session = await Session.findOne({ _id: req.params.sessionId, organizationId: req.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    if (session.selectionDeadline && new Date() > new Date(session.selectionDeadline)) {
      return res.status(403).json({ error: 'O prazo de seleção expirou' });
    }
    if (session.selectionStatus === 'submitted' || session.selectionStatus === 'delivered') {
      return res.status(403).json({ error: 'A seleção já foi enviada ou entregue' });
    }

    if ((session.mode === 'multi_selection' || session.mode === 'multi_instant') && participantId) {
      const participant = session.participants.id(participantId);
      if (!participant) return res.status(404).json({ error: 'Participante não encontrado' });
      participant.selectedPhotos = selectedPhotos;
      if (participant.selectionStatus === 'pending' && selectedPhotos.length > 0) {
        participant.selectionStatus = 'in_progress';
      }
    } else {
      session.selectedPhotos = selectedPhotos;
      if (session.selectionStatus === 'pending' && selectedPhotos.length > 0) {
        session.selectionStatus = 'in_progress';
      }
    }

    await session.save();
    res.json({ success: true, selectedCount: selectedPhotos.length });
  } catch (error) {
    req.logger.error('Erro bulk select', { error: error.message });
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
    let isInstant = false;
    if ((session.mode === 'multi_selection' || session.mode === 'multi_instant') && participantId) {
      participant = session.participants.id(participantId);
      if (!participant) return res.status(404).json({ error: 'Participante não encontrado' });
      if (session.mode === 'multi_instant') {
        participant.selectionStatus = 'delivered';
        participant.submittedAt = new Date();
        isInstant = true;
      } else {
        participant.selectionStatus = 'submitted';
        participant.submittedAt = new Date();
      }
    } else {
      session.selectionStatus = 'submitted';
      session.selectionSubmittedAt = new Date();
    }

    await session.save();

    const selectedCount = participant ? participant.selectedPhotos.length : session.selectedPhotos.length;

    // Track selection submitted — ação do cliente (rota pública, sem usuário autenticado).
    trackEvent(session.organizationId, null, 'selection_submitted', {
      sessionId: session._id,
      selectedPhotos: selectedCount
    });

    _logEvent(session._id, 'selection_submitted', {
      count: selectedCount,
      participantName: participant ? participant.name : null
    });

    try {
      await Notification.create({
        type: isInstant ? 'selection_delivered' : 'selection_submitted',
        sessionId: session._id,
        sessionName: participant ? `${participant.name} (${session.name})` : session.name,
        message: `${participant ? participant.name : session.name} finalizou a seleção${isInstant ? ' e já recebeu as fotos' : ` (${selectedCount} fotos)`}`,
        organizationId: session.organizationId
      });
    } catch (e) { }

    // Notificar fotografo por e-mail + upsell para o cliente
    try {
      const org = await Organization.findById(session.organizationId).select('email name slug preferences.notifications.selectionSubmitted').lean();
      const clientName = participant ? participant.name : session.name;

      if (org?.email && org?.preferences?.notifications?.selectionSubmitted !== false) {
        sendSelectionSubmittedEmail(org.email, clientName, selectedCount, session._id, org.slug).catch(() => { });
      }

      // Upsell: oferecer fotos extras ao cliente se a sessão tiver preço configurado E permitido no config
      const clientEmail = participant ? participant.email : session.clientEmail;
      const canUpsell = session.allowExtraPurchasePostSubmit !== false; // por padrão habilitado
      // Preço efetivo: participante pode ter o seu próprio; senão herda o padrão da sessão.
      const effectiveExtraPrice = (participant && participant.extraPhotoPrice != null)
        ? participant.extraPhotoPrice
        : session.extraPhotoPrice;

      // Upsell já enviado? Flag por participante no multi; por sessão no individual.
      const upsellAlreadySent = participant
        ? participant.extraRequest?.upsellingSent
        : session.extraRequest?.upsellingSent;

      if (clientEmail && effectiveExtraPrice > 0 && canUpsell && !upsellAlreadySent) {
        sendUpsellEmail(
          clientEmail,
          clientName,
          session.name,
          org?.name || '',
          effectiveExtraPrice,
          session._id,
          participant ? participant.accessCode : session.accessCode,
          org?.slug || ''
        ).catch(() => { });

        // Marcar como enviado
        if (participant) {
          if (!participant.extraRequest) participant.extraRequest = { status: 'none', photos: [] };
          participant.extraRequest.upsellingSent = true;
          await session.save();
        } else {
          await Session.findByIdAndUpdate(session._id, { 'extraRequest.upsellingSent': true });
        }
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
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Pedir reabertura da seleção
router.post('/client/request-reopen/:sessionId', async (req, res) => {
  try {
    const { accessCode, participantId } = req.body;
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.organizationId
    });
    if (!session || !session.isActive) return res.status(404).json({ error: 'Sessão não encontrada' });

    // Validar se reabertura está permitida no config
    if (session.allowReopen === false) {
      return res.status(403).json({ error: 'A reabertura desta sessão não está permitida pelo fotógrafo.' });
    }

    // Seleção em Grupo: o pedido é do participante (autentica pelo código dele) e marca só a seleção dele.
    const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';
    let participant = null;
    if (isMulti && participantId) {
      participant = session.participants.id(participantId);
      if (!participant || participant.accessCode !== accessCode) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
      if (participant.selectionStatus !== 'submitted') return res.status(400).json({ error: 'Seleção não está no status enviada' });
      participant.reopenRequested = true;
    } else {
      if (session.accessCode !== accessCode) return res.status(403).json({ error: 'Acesso não autorizado' });
      if (session.selectionStatus !== 'submitted') return res.status(400).json({ error: 'Seleção não está no status enviada' });
      session.reopenRequested = true;
    }
    await session.save();

    _logEvent(session._id, 'reopen_requested', { participantId: participant ? participant._id : null });

    try {
      const org = await Organization.findById(session.organizationId).select('preferences.notifications.reopenRequested').lean();
      if (org?.preferences?.notifications?.reopenRequested !== false) {
        const who = participant ? `${participant.name} (${session.name})` : session.name;
        await Notification.create({
          type: 'reopen_requested',
          sessionId: session._id,
          sessionName: session.name,
          message: `${who} pediu reabertura da seleção`,
          organizationId: session.organizationId
        });
      }
    } catch (e) { }

    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.put('/sessions/:id/dismiss-reopen', authenticateToken, async (req, res) => {
  try {
    const { participantId } = req.body || {};
    if (participantId) {
      // Seleção em Grupo: recusa o pedido de um participante específico.
      const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
      if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
      const p = session.participants.id(participantId);
      if (!p) return res.status(404).json({ error: 'Participante não encontrado' });
      p.reopenRequested = false;
      await session.save();
    } else {
      await Session.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId },
        { reopenRequested: false }
      );
    }
    _logEvent(req.params.id, 'reopen_dismissed', { participantId: participantId || null });
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Marcar/desmarcar "upload concluído" (wizard passo 1)
// body: { completed: true } trava o upload (uploadsCompletedAt = now)
// body: { completed: false } reabre o upload (uploadsCompletedAt = null)
router.put('/sessions/:id/complete-uploads', authenticateToken, async (req, res) => {
  try {
    const completed = req.body?.completed !== false;
    const current = await Session.findOne(
      { _id: req.params.id, organizationId: req.user.organizationId }
    ).select('mode packageLimit photos').lean();
    if (!current) return res.status(404).json({ error: 'Sessão não encontrada' });

    // Em modo seleção, exige que o pool de fotos atenda ao mínimo do pacote —
    // espelha a regra do cliente, que não consegue submeter seleção abaixo do limite.
    if (completed && current.mode === 'selection') {
      const visiblePhotos = (current.photos || []).filter(p => !p.hidden).length;
      const limit = current.packageLimit || 0;
      if (limit > 0 && visiblePhotos < limit) {
        return res.status(400).json({
          error: `Suba pelo menos ${limit} fotos antes de concluir. Atualmente: ${visiblePhotos}.`
        });
      }
    }

    const update = completed ? { uploadsCompletedAt: new Date() } : { uploadsCompletedAt: null };
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      update,
      { returnDocument: 'after' }
    ).select('uploadsCompletedAt photos').lean();
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    if (completed) {
      _logEvent(req.params.id, 'uploads_completed', {
        totalPhotos: (session.photos || []).filter(p => !p.hidden).length
      });
    }

    res.json({ success: true, uploadsCompletedAt: session.uploadsCompletedAt });
  } catch (error) {
    req.logger.error('Erro ao concluir upload', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Bloqueio de emergência — impede acesso do cliente sem apagar dados.
// Alterna clientAccessBlocked (toggle). Admin continua com acesso total.
router.put('/sessions/:id/toggle-client-access', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
      .select('clientAccessBlocked name');
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    session.clientAccessBlocked = !session.clientAccessBlocked;
    await session.save();

    req.logger.info(`Sessão ${session.name}: acesso do cliente ${session.clientAccessBlocked ? 'bloqueado' : 'desbloqueado'}`);
    res.json({ success: true, clientAccessBlocked: session.clientAccessBlocked });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Marcar visualização do passo de código (wizard passo 2)
// Idempotente: só seta codeViewedAt se ainda não estiver setado.
router.put('/sessions/:id/view-code', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne(
      { _id: req.params.id, organizationId: req.user.organizationId }
    ).select('codeViewedAt');
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (!session.codeViewedAt) {
      session.codeViewedAt = new Date();
      await session.save();
    }
    res.json({ success: true, codeViewedAt: session.codeViewedAt });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Modo Galeria — define se compartilha prévia (com marca d'água) antes de entregar
// ou entrega direto (pula o passo Compartilhar). Só preferência de fluxo do wizard.
router.put('/sessions/:id/gallery-delivery-mode', authenticateToken, async (req, res) => {
  try {
    const { mode } = req.body;
    if (!['preview', 'direct'].includes(mode)) {
      return res.status(400).json({ error: 'Modo inválido. Use "preview" ou "direct".' });
    }
    const session = await Session.findOne(
      { _id: req.params.id, organizationId: req.user.organizationId }
    ).select('mode galleryDeliveryMode');
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.mode !== 'gallery') {
      return res.status(400).json({ error: 'Disponível apenas para sessões em modo Galeria.' });
    }
    session.galleryDeliveryMode = mode;
    await session.save();
    res.json({ success: true, galleryDeliveryMode: session.galleryDeliveryMode });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Autosave das mensagens customizadas (Share / Deliver)
router.put('/sessions/:id/custom-messages', authenticateToken, async (req, res) => {
  try {
    const { customShareEmailIntro, customShareWhatsAppText, customDeliverEmailIntro, customDeliverWhatsAppText } = req.body;
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    if (customShareEmailIntro !== undefined) session.customShareEmailIntro = customShareEmailIntro;
    if (customShareWhatsAppText !== undefined) session.customShareWhatsAppText = customShareWhatsAppText;
    if (customDeliverEmailIntro !== undefined) session.customDeliverEmailIntro = customDeliverEmailIntro;
    if (customDeliverWhatsAppText !== undefined) session.customDeliverWhatsAppText = customDeliverWhatsAppText;

    await session.save();
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});


// CLIENTE: Adicionar comentário
router.post('/client/comments/:sessionId', async (req, res) => {
  try {
    const { accessCode, photoId, text, participantId } = req.body;
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.organizationId
    });

    if (!session || !session.isActive) return res.status(404).json({ error: 'Sessão não encontrada' });

    // Em Seleção em Grupo o participante usa o código próprio (≠ código da sessão).
    // Valida contra o participante quando vier participantId; senão, contra a sessão.
    const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';
    let participant = null;
    if (isMulti && participantId) {
      participant = session.participants.id(participantId);
      if (!participant || participant.accessCode !== accessCode) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
    } else if (session.accessCode !== accessCode) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    // Validar prazo
    if (session.selectionDeadline && new Date() > new Date(session.selectionDeadline)) {
      return res.status(403).json({ error: 'O prazo de seleção expirou' });
    }

    const photo = session.photos.find(p => p.id === photoId);
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada' });

    const newComment = {
      text,
      createdAt: new Date(),
      author: 'client',
      participantId: participant ? participant._id : null,
      participantName: participant ? participant.name : ''
    };

    if (!photo.comments) photo.comments = [];
    photo.comments.push(newComment);

    await session.save();

    try {
      const who = participant ? participant.name : session.name;
      await Notification.create({
        type: 'comment_added',
        sessionId: session._id,
        sessionName: session.name,
        photoId: photoId,
        message: `${who} comentou em uma foto`,
        organizationId: session.organizationId
      });
    } catch (e) { }

    res.json({ success: true, comment: newComment });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Solicitar fotos extras após envio da seleção
router.post('/client/request-extra-photos/:sessionId', async (req, res) => {
  try {
    const { accessCode, photos, participantId } = req.body;
    if (!photos || !photos.length) return res.status(400).json({ error: 'Selecione ao menos uma foto' });

    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.organizationId
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';
    let participant = null;

    if (isMulti && participantId) {
      participant = session.participants.id(participantId);
      if (!participant || participant.accessCode !== accessCode) return res.status(403).json({ error: 'Acesso não autorizado' });
      if (participant.selectionStatus !== 'submitted' && participant.selectionStatus !== 'delivered') return res.status(400).json({ error: 'Seleção ainda não foi enviada' });
      if (participant.extraRequest && participant.extraRequest.status === 'pending') {
        return res.status(400).json({ error: 'Já existe uma solicitação de extras pendente' });
      }
      participant.extraRequest = { status: 'pending', photos, requestedAt: new Date() };
    } else {
      if (session.accessCode !== accessCode) return res.status(403).json({ error: 'Acesso não autorizado' });
      if (session.selectionStatus !== 'submitted' && session.selectionStatus !== 'delivered') return res.status(400).json({ error: 'Seleção ainda não foi enviada' });
      if (session.extraRequest && session.extraRequest.status === 'pending') {
        return res.status(400).json({ error: 'Já existe uma solicitação de extras pendente' });
      }
      session.extraRequest = { status: 'pending', photos, requestedAt: new Date() };
    }
    await session.save();

    const who = participant ? `${participant.name} (${session.name})` : session.name;
    try {
      await Notification.create({
        type: 'extra_photos_requested',
        sessionId: session._id,
        sessionName: who,
        message: `${who} solicitou ${photos.length} foto(s) extra(s)`,
        organizationId: session.organizationId
      });
    } catch (e) { }

    try {
      const org = await Organization.findById(session.organizationId).select('email name preferences.notifications.extraRequested').lean();
      if (org?.email && org?.preferences?.notifications?.extraRequested !== false) {
        sendExtraPhotosRequestedEmail(org.email, who, photos.length).catch(() => { });
      }
    } catch (e) { }

    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
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
    req.logger.error('Erro interno', { error: error.message });
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
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions', authenticateToken, checkLimit, checkSessionLimit, async (req, res) => {
  try {
    const { mode } = req.body;

    // Cliente NÃO é exigido na criação: a sessão nasce como rascunho (criada ao clicar no
    // card de tipo) e o cliente é vinculado depois, no painel lateral do wizard. A exigência
    // de cliente passa para o momento de compartilhar (POST /sessions/:id/send-code).

    const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Evitar CastErrors do Mongoose limpando strings vazias
    const sessionData = { ...req.body };
    if (!sessionData.clientId) delete sessionData.clientId;
    if (!sessionData.date) delete sessionData.date;
    if (!sessionData.selectionDeadline) delete sessionData.selectionDeadline;

    // Modo Galeria: aplica o padrão de entrega configurado (Configurações › Entrega)
    if (mode === 'gallery' && sessionData.galleryDeliveryMode == null) {
      const orgPref = await Organization.findById(req.user.organizationId).select('preferences.galleryDeliveryDefault').lean();
      const def = orgPref?.preferences?.galleryDeliveryDefault;
      if (def === 'preview' || def === 'direct') sessionData.galleryDeliveryMode = def;
    }

    const session = await Session.create({
      ...sessionData,
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

    _logEvent(session._id, 'session_created', {
      mode: session.mode,
      packageLimit: session.packageLimit,
      eventType: session.eventType
    });

    // Track session creation for SaaS Admin v2
    trackEvent(req.user.organizationId, req.user.userId, 'session_created', {
      sessionId: session._id,
      mode: session.mode,
      eventType: session.eventType
    });

    res.json({ success: true, session });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.put('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.clientId === '') delete updateData.clientId;
    if (updateData.date === '') updateData.date = null;
    if (updateData.selectionDeadline === '') updateData.selectionDeadline = null;
    if (updateData.storageRetentionUntil === '') updateData.storageRetentionUntil = null;
    if (updateData.storageRetentionUntil) {
      updateData.storageRetentionUntil = new Date(updateData.storageRetentionUntil);
    }

    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      updateData,
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
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Enviar codigo de acesso manualmente ao cliente
// body opcional: { channel: 'email' | 'whatsapp' | 'both', emailIntro?: string } — default 'email'
// emailIntro: parágrafo personalizado pelo fotógrafo que substitui o texto padrão no e-mail.
// Para 'whatsapp': não envia mensagem; retorna whatsappUrl (wa.me) que o front abre em nova aba.
router.post('/sessions/:id/send-code', authenticateToken, async (req, res) => {
  try {
    const channel = req.body?.channel || 'email';
    // 'copy' = fotógrafo copiou código/link pelo botão (não envia nada, só registra que compartilhou).
    // É o sinal confiável de "compartilhou": como o código não é selecionável por mouse, o único
    // jeito de extraí-lo é por um botão — todos marcam codeSentAt.
    if (!['email', 'whatsapp', 'both', 'copy'].includes(channel)) {
      return res.status(400).json({ error: 'Canal inválido (use email, whatsapp, both ou copy)' });
    }
    const customEmailIntro = typeof req.body?.emailIntro === 'string' ? req.body.emailIntro.trim().slice(0, 1000) : undefined;

    const session = await Session.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    // Cliente é exigido aqui (não na criação): só compartilha quando há cliente vinculado.
    // Multi-Seleção (Seleção em Grupo) tem fluxo de compartilhamento por participante — não exige.
    const isMultiShare = session.mode === 'multi_selection' || session.mode === 'multi_instant' || session.mode === 'multi_gallery';
    const hasLinkedClient = !!(session.clientId || session.rhynoCustomerId || session.clientEmail);
    if (!isMultiShare && !hasLinkedClient) {
      return res.status(400).json({ error: 'Vincule um cliente à sessão antes de compartilhar o código.' });
    }

    // Em modo seleção, o pool de fotos visíveis precisa atender ao mínimo do pacote antes
    // de compartilhar — espelha a regra do cliente, que não submete seleção abaixo do limite.
    // packageLimit 0 = sem mínimo (fotógrafo só quer criar a sessão sem ter as fotos ainda).
    if (session.mode === 'selection') {
      const visiblePhotos = (session.photos || []).filter(p => !p.hidden).length;
      const limit = session.packageLimit || 0;
      if (limit > 0 && visiblePhotos < limit) {
        return res.status(400).json({
          error: `Suba pelo menos ${limit} fotos antes de compartilhar. Atualmente: ${visiblePhotos}.`
        });
      }
    }

    // Resolve cliente uma única vez para email e telefone
    let clientName = session.name;
    let clientEmail = session.clientEmail || '';
    let clientPhone = '';
    if (session.clientId) {
      const client = await Client.findById(session.clientId).select('email phone name').lean();
      if (client) {
        if (!clientEmail) clientEmail = client.email || '';
        clientPhone = client.phone || '';
        if (client.name) clientName = client.name;
      }
    } else if (session.rhynoCustomerId) {
      if (session.clientName) clientName = session.clientName;
      clientPhone = session.clientPhone || '';
    }

    const org = await Organization.findById(req.user.organizationId).select('name slug').lean();
    const orgName = org?.name || 'Fotógrafo';

    const wantsEmail = channel === 'email' || channel === 'both';
    const wantsWhatsApp = channel === 'whatsapp' || channel === 'both';

    if (wantsEmail && !clientEmail) {
      return res.status(400).json({ error: 'Nenhum e-mail cadastrado para este cliente' });
    }

    const result = { success: true };

    if (wantsEmail) {
      await sendGalleryAvailableEmail(clientEmail, clientName, session.accessCode, orgName, org?.slug, customEmailIntro);
      result.emailSentTo = clientEmail;
    }

    if (wantsWhatsApp) {
      result.whatsappUrl = buildWhatsAppGalleryLink(
        clientPhone,
        clientName,
        session.accessCode,
        orgName,
        org?.slug,
        session.eventType
      );
      result.hasPhone = Boolean(clientPhone);
    }

    session.codeSentAt = new Date();
    await session.save();

    // Track code sent
    trackEvent(req.user.organizationId, req.user.userId, 'code_sent', {
      sessionId: session._id,
      channel: channel || 'unknown'
    });

    _logEvent(session._id, 'code_sent', {
      channel,
      recipient: wantsEmail ? clientEmail : clientPhone || ''
    });

    // Update onboarding step
    await Organization.findByIdAndUpdate(req.user.organizationId, {
      'onboarding.steps.linkSent': true
    });

    if (wantsEmail && !wantsWhatsApp) result.message = `E-mail enviado para ${clientEmail}`;
    else if (wantsWhatsApp && !wantsEmail) result.message = clientPhone ? 'Link de WhatsApp gerado' : 'Link de WhatsApp gerado (cliente sem telefone — você precisará digitar)';
    else if (channel === 'copy') result.message = 'Compartilhamento registrado';

    res.json(result);
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Aceitar solicitação de fotos extras
router.put('/sessions/:id/extra-request/accept', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const { participantId } = req.body;
    const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';

    if (isMulti && participantId) {
      const p = session.participants.id(participantId);
      if (!p) return res.status(404).json({ error: 'Participante não encontrado' });
      if (!p.extraRequest || p.extraRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Nenhuma solicitação pendente' });
      }
      if (!p.selectedPhotos) p.selectedPhotos = [];
      const extras = p.extraRequest.photos || [];
      extras.forEach(id => { if (!p.selectedPhotos.includes(id)) p.selectedPhotos.push(id); });
      p.extraRequest.status = 'accepted';
      p.extraRequest.respondedAt = new Date();
    } else {
      if (!session.extraRequest || session.extraRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Nenhuma solicitação pendente' });
      }
      // Adicionar fotos extras às já selecionadas (sem duplicatas)
      const extras = session.extraRequest.photos || [];
      extras.forEach(id => { if (!session.selectedPhotos.includes(id)) session.selectedPhotos.push(id); });
      session.extraRequest.status = 'accepted';
      session.extraRequest.respondedAt = new Date();
    }
    await session.save();
    res.json({ success: true, session });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Recusar solicitação de fotos extras
router.put('/sessions/:id/extra-request/reject', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const { participantId } = req.body;
    const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';
    const reason = req.body.reason || '';
    let clientEmail = '';

    if (isMulti && participantId) {
      const p = session.participants.id(participantId);
      if (!p) return res.status(404).json({ error: 'Participante não encontrado' });
      if (!p.extraRequest || p.extraRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Nenhuma solicitação pendente' });
      }
      p.extraRequest.status = 'rejected';
      p.extraRequest.respondedAt = new Date();
      p.extraRequest.rejectReason = reason;
      clientEmail = p.email || '';
    } else {
      if (!session.extraRequest || session.extraRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Nenhuma solicitação pendente' });
      }
      session.extraRequest.status = 'rejected';
      session.extraRequest.respondedAt = new Date();
      session.extraRequest.rejectReason = reason;
      clientEmail = session.clientEmail || (session.clientId ? (await Client.findById(session.clientId).select('email').lean())?.email : '');
    }
    await session.save();

    // Enviar e-mail de notificação para o cliente
    try {
      if (clientEmail) {
        const org = await Organization.findById(req.user.organizationId).select('name slug').lean();
        if (sendExtraPhotosRejectedEmail) {
          sendExtraPhotosRejectedEmail(clientEmail, session.name, org?.name || 'O fotógrafo', reason, org?.slug).catch(() => { });
        }
      }
    } catch (e) {
      req.logger.error('Erro ao enviar email de recusa:', { message: e.message });
    }

    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
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

      // Ler dimensoes do original ANTES de qualquer processamento (resolucao real de entrega)
      const origMeta = await sharp(originalPath).metadata();

      // Gerar thumb comprimida (resolucao configurada na sessao, qualidade 85)
      const thumbRes = session.photoResolution || 1200;
      await sharp(originalPath)
        .resize(thumbRes, thumbRes, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(thumbPath);

      generatedThumbs.push(thumbPath);

      const { width, height } = await sharp(thumbPath).metadata();

      // No modo galeria (entrega direta), o fotografo ja sobe as fotos em alta resolucao prontas, entao preservamos a original.
      // Vale para galeria individual, Galeria em Grupo (multi_gallery) e multi_instant (real-time).
      const isGalleryMode = session.mode === 'gallery' || session.mode === 'multi_gallery' || session.mode === 'multi_instant';
      if (!isGalleryMode) {
        await storage.deleteFile(originalPath);
      }

      newPhotos.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        filename: file.originalname, // Nome original preservado para exportação e Lightroom
        url: `/uploads/${orgId}/sessions/${thumbFilename}`,
        urlOriginal: isGalleryMode ? `/uploads/${orgId}/sessions/${file.filename}` : '',
        width,
        height,
        widthOriginal: origMeta.width,
        heightOriginal: origMeta.height,
        uploadedAt: new Date()
      });
    }

    session.photos.push(...newPhotos);
    await session.save();

    _logEvent(session._id, 'photos_uploaded', {
      count: newPhotos.length,
      filenames: newPhotos.map(p => p.filename)
    });

    // Track photos upload for SaaS Admin v2
    trackEvent(req.user.organizationId, req.user.userId, 'photos_uploaded', {
      sessionId: session._id,
      photoCount: newPhotos.length,
      totalPhotos: session.photos.length
    });

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
        const origMetaNew = await sharp(originalPath).metadata();

        await sharp(originalPath)
          .resize(thumbRes, thumbRes, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(thumbPath);

        generatedThumbs.push(thumbPath);
        const thumbMetaNew = await sharp(thumbPath).metadata();

        newPhotos.push({
          id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          filename: originalName,
          url: `/uploads/${orgId}/sessions/${thumbFilename}`,
          urlOriginal: `/uploads/${orgId}/sessions/${file.filename}`,
          width: thumbMetaNew.width,
          height: thumbMetaNew.height,
          widthOriginal: origMetaNew.width,
          heightOriginal: origMetaNew.height,
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

      // PRESERVAR A CRUA: na 1a edição, guardamos o thumb cru em urlRaw (sem apagar) para
      // permitir reverter a edição depois sem tirar a foto da seleção de ninguém.
      // Em re-edições (urlRaw já existe), o photo.url atual é thumb de uma edição anterior → pode apagar.
      if (!photo.urlRaw) {
        photo.urlRaw = photo.url;
        photo.widthRaw = photo.width;
        photo.heightRaw = photo.height;
      } else if (photo.url) {
        const oldThumbPath = path.join(__dirname, '../..', photo.url);
        await storage.deleteFile(oldThumbPath);
      }

      const originalPath = file.path;
      const thumbFilename = 'thumb-' + file.filename;
      const thumbPath = path.join(path.dirname(originalPath), thumbFilename);

      // Ler dimensoes do original antes de criar thumb
      const origMetaEdit = await sharp(originalPath).metadata();

      // Gerar nova thumb a partir da foto editada
      const thumbRes = session.photoResolution || 1200;
      await sharp(originalPath)
        .resize(thumbRes, thumbRes, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(thumbPath);

      generatedThumbs.push(thumbPath);
      const thumbMetaEdit = await sharp(thumbPath).metadata();

      photo.url = `/uploads/${orgId}/sessions/${thumbFilename}`;
      photo.urlOriginal = `/uploads/${orgId}/sessions/${file.filename}`;
      photo.width = thumbMetaEdit.width;
      photo.height = thumbMetaEdit.height;
      photo.widthOriginal = origMetaEdit.width;
      photo.heightOriginal = origMetaEdit.height;
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

    _logEvent(session._id, 'edited_uploaded', {
      count: matched.length,
      filenames: matched
    });

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
        req.logger.error(`Erro ao deletar arquivos da foto ${photo.id}`, { error: e.message });
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
    req.logger.error('Erro bulk delete', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Ocultar/mostrar fotos em massa — deve vir ANTES de /:photoId
router.put('/sessions/:id/photos/bulk-hidden', authenticateToken, async (req, res) => {
  try {
    const { photoIds, hidden } = req.body;
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs inválida' });
    }
    if (typeof hidden !== 'boolean') {
      return res.status(400).json({ error: 'Campo hidden obrigatório (boolean)' });
    }

    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    // Em modo seleção, garante que não ficam menos visíveis do que o pacote
    if (hidden && session.mode === 'selection') {
      const hidingSet = new Set(photoIds.map(String));
      const visibleAfter = (session.photos || []).filter(p => !p.hidden && !hidingSet.has(String(p.id))).length;
      if (visibleAfter < (session.packageLimit || 0)) {
        return res.status(400).json({
          error: `Não é possível ocultar: restariam ${visibleAfter} foto(s) visíveis (mínimo do pacote: ${session.packageLimit}).`
        });
      }
    }

    let changed = 0;
    const idSet = new Set(photoIds.map(String));
    session.photos.forEach(p => {
      if (idSet.has(String(p.id))) {
        p.hidden = hidden;
        changed++;
      }
    });
    await session.save();

    req.logger.info(`Sessão ${session.name}: ${changed} fotos ${hidden ? 'ocultadas' : 'reexibidas'} em massa`);
    res.json({ success: true, changed });
  } catch (error) {
    req.logger.error('Erro bulk-hidden', { error: error.message });
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

// ADMIN: Remover SÓ a versão editada de uma foto (reverter), mantendo a foto na galeria
// e na seleção de todos. Restaura a preview crua (urlRaw) preservada no upload-edited.
// Não decrementa o contador do plano (a foto continua existindo).
router.delete('/sessions/:sessionId/photos/:photoId/edited', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.user.organizationId
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const photo = session.photos.find(p => p.id === req.params.photoId);
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada' });
    if (!photo.urlOriginal) return res.status(400).json({ error: 'Esta foto não tem versão editada para remover.' });

    const deletions = [];
    // Apaga a editada em alta (urlOriginal).
    if (photo.urlOriginal && photo.urlOriginal.startsWith('/uploads/')) {
      deletions.push(storage.deleteFile(path.join(__dirname, '../..', photo.urlOriginal)));
    }
    // Apaga a editada subida via campo legado urlEditada, se houver.
    if (photo.urlEditada && photo.urlEditada.startsWith('/uploads/')) {
      deletions.push(storage.deleteFile(path.join(__dirname, '../..', photo.urlEditada)));
    }

    if (photo.urlRaw) {
      // Caminho normal: havia crua preservada → apaga o thumb DA EDIÇÃO e restaura a crua.
      if (photo.url && photo.url !== photo.urlRaw && photo.url.startsWith('/uploads/')) {
        deletions.push(storage.deleteFile(path.join(__dirname, '../..', photo.url)));
      }
      photo.url = photo.urlRaw;
      photo.width = photo.widthRaw;
      photo.height = photo.heightRaw;
      photo.urlRaw = undefined;
      photo.widthRaw = undefined;
      photo.heightRaw = undefined;
    }
    // Legado (editada antes da preservação da crua): não há crua para restaurar — mantém o
    // thumb atual como preview e só limpa a alta. A foto continua na seleção; basta re-subir a editada.

    photo.urlOriginal = '';
    photo.urlEditada = '';
    photo.widthOriginal = undefined;
    photo.heightOriginal = undefined;

    await Promise.all(deletions);
    session.markModified('photos');
    await session.save();

    res.json({ success: true });
  } catch (error) {
    req.logger?.error('Remove Edited Error', { error: error.message, stack: error.stack, sessionId: req.params.sessionId, photoId: req.params.photoId });
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
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Reabertura da seleção pelo fotógrafo.
// Dois cenários atendidos pelo mesmo endpoint:
//   - Aceitar pedido do cliente (botão no passo Entregar): reopenRequested → false.
//   - Reabertura direta pelo fotógrafo (botão no passo Acompanhar): independente de pedido.
// Body opcional { participantId } reabre apenas um participante em multi-seleção;
// sem participantId, reabre todos os participantes que já haviam enviado.
router.put('/sessions/:id/reopen', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';
    const { participantId } = req.body || {};

    if (isMulti && (session.participants || []).length > 0) {
      let reopened = 0;
      const targets = participantId
        ? [session.participants.id(participantId)].filter(Boolean)
        : session.participants;
      if (participantId && targets.length === 0) {
        return res.status(404).json({ error: 'Participante não encontrado' });
      }
      targets.forEach((p) => {
        if (p.selectionStatus === 'submitted' || p.selectionStatus === 'delivered') {
          p.selectionStatus = 'in_progress';
          p.submittedAt = undefined;
          p.reopenRequested = false; // aceitar limpa o pedido do participante
          reopened++;
        }
      });
      // Sessão volta a aguardar enquanto houver participante reaberto
      session.selectionStatus = 'in_progress';
    } else {
      session.selectionStatus = 'in_progress';
      // Limpa o carimbo de envio para o passo Acompanhar voltar a ficar ativo.
      // O cliente re-define ao reenviar a seleção.
      session.selectionSubmittedAt = undefined;
    }

    session.reopenRequested = false;
    await session.save();

    _logEvent(req.params.id, 'reopen_accepted', { by: 'photographer', participantId: participantId || null });
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.put('/sessions/:id/deliver', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    const customEmailIntro = typeof req.body?.emailIntro === 'string' ? req.body.emailIntro.trim().slice(0, 1000) : undefined;

    // Entrega FLEXÍVEL (seleção individual): entrega o que já tem versão editada (urlOriginal).
    // Fotos selecionadas ainda sem editada NÃO bloqueiam — ficam "em edição" para o cliente e podem
    // ser entregues numa próxima entrega (ex.: cliente paga 15 de 30 agora, o resto depois). O front
    // avisa "X de Y" antes de confirmar. Renomear no Photoshop também deixa de travar a entrega:
    // a editada (com nome novo) entra como entrega normal, não como pendência.
    const selectedSet = new Set(session.selectedPhotos || []);
    const courtesySet = new Set(session.courtesyPhotos || []);
    const missing = [];
    const extrasDelivered = [];
    let deliveredCount = 0;     // editadas em geral (extra = editada fora da seleção)
    let deliverableCount = 0;   // editadas que o cliente REALMENTE baixa (seleção ∪ cortesia)

    for (const photo of session.photos) {
      if (photo.urlOriginal) {
        deliveredCount++;
        if (selectedSet.has(photo.id) || courtesySet.has(photo.id)) deliverableCount++;
        if (!selectedSet.has(photo.id)) extrasDelivered.push(photo.id);
      } else if (selectedSet.has(photo.id)) {
        missing.push(photo.filename || photo.id);
      }
    }

    // Seleção individual: precisa de ao menos UMA foto ENTREGÁVEL — editada E que o cliente baixa
    // (seleção ∪ cortesia). Editar fotos FORA da seleção NÃO habilita a entrega: senão a sessão fica
    // "entregue" mas o ZIP do cliente (urlOriginal ∩ entitled) sai vazio → o download abre tela preta.
    // multi_selection: gate é por-participante em /participants/:pid/deliver (session.selectedPhotos vazio).
    if (session.mode === 'selection' && deliverableCount === 0) {
      return res.status(400).json({
        error: 'Não foi possível liberar a entrega: nenhuma das fotos escolhidas pelo cliente está editada ainda. Edite ao menos uma foto da seleção e tente de novo.'
      });
    }

    // Modo galeria: todas as fotos visíveis precisam ter urlOriginal
    if (session.mode === 'gallery') {
      const missingGallery = session.photos.filter(p => !p.hidden && !p.urlOriginal);
      if (missingGallery.length > 0) {
        return res.status(400).json({
          error: `${missingGallery.length} foto(s) sem arquivo original. Re-suba as fotos antes de entregar.`,
          missing: missingGallery.map(p => p.filename || p.id)
        });
      }
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

    // Track session delivered
    trackEvent(session.organizationId, req.user.userId, 'session_delivered', {
      sessionId: session._id,
      mode: session.mode,
      selectedCount: session.selectedPhotos.length
    });

    _logEvent(session._id, 'delivered', {
      selectedCount: session.selectedPhotos.length,
      extrasCount: extrasDelivered.length
    });

    // Notificar cliente por e-mail (se não pular)
    if (session.clientEmail && !req.body.skipEmail) {
      const org = await Organization.findById(session.organizationId).select('name slug');
      const recipientName = session.clientName || session.name;
      sendPhotosDeliveredEmail(session.clientEmail, recipientName, session.accessCode, org?.name || 'Fotógrafo', org?.slug, customEmailIntro).catch(() => { });
    }

    res.json({ success: true, extrasCount: extrasDelivered.length });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
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
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:sessionId/photos/:photoId/comments', authenticateToken, async (req, res) => {
  try {
    const { text, participantId } = req.body;
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.user.organizationId
    });

    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const photo = session.photos.find(p => p.id === req.params.photoId);
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada' });

    // Em Seleção em Grupo, a resposta é direcionada a um participante (só ele a vê).
    let targetParticipant = null;
    if (participantId) {
      targetParticipant = session.participants.id(participantId);
      if (!targetParticipant) return res.status(404).json({ error: 'Participante não encontrado' });
    }

    const newComment = {
      text,
      createdAt: new Date(),
      author: 'admin',
      participantId: targetParticipant ? targetParticipant._id : null,
      participantName: targetParticipant ? targetParticipant.name : ''
    };

    if (!photo.comments) photo.comments = [];
    photo.comments.push(newComment);

    await session.save();
    res.json({ success: true, comment: newComment });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
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
      // Formato Lightroom: "NOME. NOME. NOME." — sem extensão, sem quebra de linha
      const conteudo = session.photos
        .filter(p => selectedIds.includes(p.id))
        .map(p => p.filename.replace(/\.[^.]+$/, '') + '.')
        .join(' ');

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="selecao-${session.name.replace(/\s+/g, '-')}.txt"`);
      res.send(conteudo);
    })
    .catch(error => {
      res.status(500).json({ error: error.message });
    });
});

// ADMIN: Gerenciar Participantes (Multi-Seleção)

// Adicionar participante
router.post('/sessions/:id/participants', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, packageLimit, extraPhotoPrice, clientId } = req.body;
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const participantData = {
      name, email, phone, packageLimit, accessCode,
      selectionStatus: 'pending',
      selectedPhotos: []
    };
    // Preço próprio só é gravado se enviado; null/ausente = herda o padrão da sessão.
    if (extraPhotoPrice !== undefined && extraPhotoPrice !== '' && extraPhotoPrice !== null) {
      participantData.extraPhotoPrice = Math.max(0, Number(extraPhotoPrice));
    }
    if (clientId) participantData.clientId = clientId;

    session.participants.push(participantData);

    await session.save();
    res.json({ success: true, participants: session.participants });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
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
    if (req.body.extraPhotoPrice !== undefined) {
      // '' ou null limpa o preço próprio (volta a herdar o padrão da sessão).
      p.extraPhotoPrice = (req.body.extraPhotoPrice === '' || req.body.extraPhotoPrice === null)
        ? null
        : Math.max(0, Number(req.body.extraPhotoPrice));
    }

    await session.save();
    res.json({ success: true, participants: session.participants });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
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
    req.logger.error('Erro interno', { error: error.message });
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

    // Mesmo gate da seleção individual: só entrega se houver ≥1 foto ENTREGÁVEL deste participante
    // (editada E na seleção ∪ cortesia dele). Sem isto o participante fica "entregue" mas o download
    // dele sai vazio (ZIP filtra urlOriginal ∩ entitled) → tela preta na galeria do participante.
    const selSet = new Set((p.selectedPhotos || []).map(String));
    const courtSet = new Set((p.courtesyPhotos || []).map(String));
    const deliverable = (session.photos || []).filter(ph => ph.urlOriginal && (selSet.has(ph.id) || courtSet.has(ph.id))).length;
    if (deliverable === 0) {
      return res.status(400).json({
        error: 'Não foi possível liberar a entrega: nenhuma das fotos escolhidas por este participante está editada ainda. Edite ao menos uma foto da seleção dele e tente de novo.'
      });
    }

    p.selectionStatus = 'delivered';
    await session.save();
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: define a lista de fotos de CORTESIA de um participante (multi_selection / multi_instant).
// Idempotente — recebe a lista COMPLETA de IDs e substitui. Valida que cada ID existe no pool da
// sessão e descarta o que já estiver na seleção do participante (cortesia é sempre fora do pacote).
router.put('/sessions/:id/participants/:pid/courtesy', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const p = session.participants.id(req.params.pid);
    if (!p) return res.status(404).json({ error: 'Participante não encontrado' });

    const requested = Array.isArray(req.body.photos) ? req.body.photos.map(String) : [];
    const poolIds = new Set((session.photos || []).map(ph => ph.id));
    const selectedSet = new Set((p.selectedPhotos || []).map(String));
    // Só IDs reais do pool e que NÃO estejam na seleção do participante.
    const clean = [...new Set(requested)].filter(id => poolIds.has(id) && !selectedSet.has(id));

    p.courtesyPhotos = clean;
    await session.save();
    res.json({ success: true, courtesyPhotos: clean });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Cortesia na SELEÇÃO INDIVIDUAL (espelha o endpoint do participante acima).
// O fotógrafo presenteia fotos fora da seleção do cliente; idempotente (salva a lista completa).
router.put('/sessions/:id/courtesy', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const requested = Array.isArray(req.body.photos) ? req.body.photos.map(String) : [];
    const poolIds = new Set((session.photos || []).map(ph => ph.id));
    const selectedSet = new Set((session.selectedPhotos || []).map(String));
    // Só IDs reais do pool e que NÃO estejam na seleção do cliente (o que já é dele não é cortesia).
    const clean = [...new Set(requested)].filter(id => poolIds.has(id) && !selectedSet.has(id));

    session.courtesyPhotos = clean;
    await session.save();
    res.json({ success: true, courtesyPhotos: clean });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
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
    req.logger.error('Erro interno', { error: error.message });
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
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ROTAS DE DOWNLOAD (FASE 4 - Entrega em Alta Resolução)
// ============================================================================

// CLIENTE: Download de foto individual (alta resolução)
router.get('/client/download/:sessionId/:photoId', async (req, res) => {
  try {
    const { code, participantId } = req.query;
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.organizationId
    });

    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    // Validar acesso: código da sessão ou participante
    if (session.mode === 'multi_gallery' && participantId) {
      // Galeria em Grupo: entrega direta — participante baixa assim que tem o código (sem gate de entrega).
      const participant = session.participants.id(participantId);
      if (!participant || participant.accessCode !== code) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
      if (session.selectionDeadline && new Date() > new Date(session.selectionDeadline)) {
        return res.status(403).json({ error: 'O prazo de acesso à galeria expirou' });
      }
    } else if ((session.mode === 'multi_selection' || session.mode === 'multi_instant') && participantId) {
      const participant = session.participants.id(participantId);
      if (!participant || participant.accessCode !== code) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
      if (participant.selectionStatus !== 'delivered') {
        return res.status(403).json({ error: 'Fotos ainda não foram entregues para este participante' });
      }
      // ACL por foto (multi): só libera a alta do que é da SELEÇÃO ou CORTESIA deste participante.
      // No multi o pool é compartilhado e, com upload em massa em alta, TODAS as fotos teriam
      // urlOriginal — sem este gate qualquer participante baixaria a sessão inteira em alta.
      const entitled = new Set([
        ...(participant.selectedPhotos || []).map(String),
        ...(participant.courtesyPhotos || []).map(String)
      ]);
      if (!entitled.has(String(req.params.photoId))) {
        return res.status(403).json({ error: 'Esta foto não faz parte da sua seleção' });
      }
    } else {
      if (session.accessCode !== code) return res.status(403).json({ error: 'Acesso não autorizado' });
      if (session.selectionStatus !== 'delivered') return res.status(403).json({ error: 'Fotos ainda não foram entregues' });
      if (session.mode === 'gallery' && session.selectionDeadline && new Date() > new Date(session.selectionDeadline)) {
        return res.status(403).json({ error: 'O prazo de acesso à galeria expirou' });
      }
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
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Download de todas as fotos entregues em ZIP
router.get('/client/download-all/:sessionId', async (req, res) => {
  try {
    const { code, participantId } = req.query;
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.organizationId
    });

    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    // Validar acesso: código da sessão ou código de participante
    let participant = null;
    let isGroupGalleryParticipant = false;
    if (session.mode === 'multi_gallery' && participantId) {
      // Galeria em Grupo: entrega direta — participante baixa tudo assim que tem o código.
      participant = session.participants.id(participantId);
      if (!participant || participant.accessCode !== code) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
      if (session.selectionDeadline && new Date() > new Date(session.selectionDeadline)) {
        return res.status(403).json({ error: 'O prazo de acesso à galeria expirou' });
      }
      isGroupGalleryParticipant = true;
    } else if ((session.mode === 'multi_selection' || session.mode === 'multi_instant') && participantId) {
      participant = session.participants.id(participantId);
      if (!participant || participant.accessCode !== code) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
      if (participant.selectionStatus !== 'delivered') {
        return res.status(403).json({ error: 'Fotos ainda não foram entregues para este participante' });
      }
    } else {
      if (session.accessCode !== code) return res.status(403).json({ error: 'Acesso não autorizado' });
      if (session.mode !== 'gallery' && session.selectionStatus !== 'delivered') return res.status(403).json({ error: 'Fotos ainda não foram entregues' });
      if (session.mode === 'gallery' && session.selectionDeadline && new Date() > new Date(session.selectionDeadline)) {
        return res.status(403).json({ error: 'O prazo de acesso à galeria expirou' });
      }
    }

    // Determinar quais fotos incluir no ZIP.
    // ENTREGA PARCIAL (selection + multi_selection): só entra no ZIP o que JÁ foi editado/entregue
    // (tem urlOriginal). Foto "em edição" (selecionada mas ainda sem alta) NÃO vai pro ZIP — espelha
    // o gate por foto do download individual, e nunca entrega a thumb em baixa como se fosse a final.
    // 'multi_gallery'/'gallery': entrega direta, todas as fotos (sem etapa de edição parcial).
    let photosToZip;
    if (isGroupGalleryParticipant) {
      photosToZip = session.photos.filter(p => !p.hidden);
    } else if (participant) {
      const entitled = new Set([
        ...(participant.selectedPhotos || []).map(String),
        ...(participant.courtesyPhotos || []).map(String)
      ]);
      photosToZip = session.photos.filter(p => p.urlOriginal && entitled.has(String(p.id)));
    } else if (session.mode === 'selection') {
      const entitled = new Set([
        ...(session.selectedPhotos || []).map(String),
        ...(session.courtesyPhotos || []).map(String)
      ]);
      photosToZip = session.photos.filter(p => p.urlOriginal && entitled.has(String(p.id)));
    } else {
      photosToZip = session.photos;
    }

    if (photosToZip.length === 0) return res.status(404).json({ error: 'Nenhuma foto para download' });

    const sessionName = session.name.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="fotos-${sessionName}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    for (const photo of photosToZip) {
      const originalPath = photo.urlOriginal ? path.join(__dirname, '../..', photo.urlOriginal) : null;
      const thumbPath = photo.url ? path.join(__dirname, '../..', photo.url) : null;
      const originalName = photo.filename || path.basename(photo.urlOriginal || photo.url || 'foto.jpg');

      if (originalPath && fs.existsSync(originalPath)) {
        // Arquivo em alta resolução disponível — entrega normal
        archive.file(originalPath, { name: originalName });
      } else if (thumbPath && fs.existsSync(thumbPath)) {
        // Original ausente no disco — inclui thumb com prefixo PREVIEW_ para alertar o cliente
        req.logger?.error('[download-all] original ausente, entregando thumb como fallback', {
          photoId: photo.id, urlOriginal: photo.urlOriginal, sessionId: session._id
        });
        archive.file(thumbPath, { name: 'PREVIEW_' + originalName });
      } else {
        req.logger?.error('[download-all] nenhum arquivo encontrado no disco', {
          photoId: photo.id, urlOriginal: photo.urlOriginal, url: photo.url, sessionId: session._id
        });
      }
    }

    archive.on('error', (err) => {
      req.logger.error('Erro ao criar ZIP', { error: err.message });
      if (!res.headersSent) res.status(500).json({ error: 'Erro ao criar ZIP' });
    });

    await archive.finalize();
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RETENÇÃO DE STORAGE
// ============================================================================

// Salva/atualiza configuração de retenção de storage da sessão
router.put('/sessions/:id/storage-retention', authenticateToken, async (req, res) => {
  try {
    const { storageRetentionUntil, storageAutoDelete, storageBackupOnExpire } = req.body;

    const update = {
      storageAutoDelete: Boolean(storageAutoDelete),
      storageBackupOnExpire: Boolean(storageBackupOnExpire),
      storageNotificationSent: false // reset: nova data => nova notificação
    };

    if (storageRetentionUntil) {
      update.storageRetentionUntil = new Date(storageRetentionUntil);
    } else {
      update.storageRetentionUntil = null;
    }

    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      update,
      { returnDocument: 'after' }
    );
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    req.logger.info(`[storage-retention] Sessão ${session._id} — retentionUntil: ${update.storageRetentionUntil}`);
    res.json({ success: true, session });
  } catch (error) {
    req.logger.error('[storage-retention]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Arquiva sessão: remove fotos do disco (exceto capa), salva link externo opcional
router.post('/sessions/:id/archive', authenticateToken, async (req, res) => {
  try {
    const { externalStorageUrl } = req.body;

    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.archivedAt) return res.status(400).json({ error: 'Sessão já arquivada' });

    const uploadsBase = path.join(__dirname, '../../uploads/sessions', String(session._id));
    const coverFile = session.coverPhoto ? path.basename(session.coverPhoto) : null;

    if (fs.existsSync(uploadsBase)) {
      const entries = await fs.promises.readdir(uploadsBase);
      for (const entry of entries) {
        if (coverFile && entry === coverFile) continue;
        try {
          const full = path.join(uploadsBase, entry);
          const stat = await fs.promises.stat(full);
          if (stat.isFile()) await fs.promises.unlink(full);
        } catch (_) {}
      }
    }

    // Mantém apenas a capa no array de fotos — remove as demais
    const photosToKeep = coverFile
      ? session.photos.filter(p => path.basename(p.url || '') === coverFile || path.basename(p.urlOriginal || '') === coverFile)
      : [];

    session.archivedAt = new Date();
    session.externalStorageUrl = externalStorageUrl || '';
    session.storageNotificationSent = true;
    session.photos = photosToKeep;
    await session.save();

    _logEvent(session._id, 'archived', { externalStorageUrl: externalStorageUrl || '' });
    req.logger.info(`[archive] Sessão ${session._id} arquivada. Fotos removidas do disco.`);
    res.json({ success: true });
  } catch (error) {
    req.logger.error('[archive]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Deleta todas as fotos do disco de uma sessão (ação manual do fotógrafo via wizard)
router.post('/sessions/:id/delete-photos', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const uploadsBase = path.join(__dirname, '../../uploads/sessions', String(session._id));
    if (fs.existsSync(uploadsBase)) {
      const entries = await fs.promises.readdir(uploadsBase);
      for (const entry of entries) {
        try {
          const full = path.join(uploadsBase, entry);
          const stat = await fs.promises.stat(full);
          if (stat.isFile()) await fs.promises.unlink(full);
        } catch (_) {}
      }
    }

    session.archivedAt = new Date();
    session.storageNotificationSent = true;
    session.photos = [];
    session.coverPhoto = '';
    await session.save();

    _logEvent(session._id, 'photos_deleted', {});
    req.logger.info(`[delete-photos] Sessão ${session._id} — todas as fotos excluídas.`);
    res.json({ success: true });
  } catch (error) {
    req.logger.error('[delete-photos]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Backup ZIP das fotos originais (fotógrafo) — para download antes de arquivar/deletar
// Aceita token via query param (window.open não envia headers)
router.get('/sessions/:id/photos-backup', async (req, res) => {
  const token = req.query.token || (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || 'fs-fotografias-secret-key');
  } catch {
    return res.status(403).json({ error: 'Token inválido' });
  }
  req.user = user;
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: user.organizationId })
      .select('name photos coverPhoto archivedAt').lean();
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.archivedAt) return res.status(400).json({ error: 'Sessão já arquivada — fotos removidas do servidor' });

    const allPhotos = session.photos || [];
    if (allPhotos.length === 0) return res.status(404).json({ error: 'Nenhuma foto encontrada' });

    const sessionName = (session.name || 'sessao').replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${sessionName}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    let added = 0;
    for (const photo of allPhotos) {
      const srcPath = photo.urlOriginal
        ? path.join(__dirname, '../..', photo.urlOriginal)
        : (photo.url ? path.join(__dirname, '../..', photo.url) : null);
      if (!srcPath) continue;
      if (!fs.existsSync(srcPath)) continue;
      const fname = photo.filename || path.basename(srcPath);
      archive.file(srcPath, { name: fname });
      added++;
    }

    if (added === 0) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ error: 'Nenhum arquivo encontrado no disco' });
    }

    archive.on('error', (err) => {
      req.logger.error('[photos-backup] Erro ao criar ZIP', { error: err.message });
      if (!res.headersSent) res.status(500).json({ error: 'Erro ao criar ZIP' });
    });

    req.logger.info('[photos-backup] ZIP iniciado', { sessionId: session._id, fotos: added });
    await archive.finalize();
  } catch (error) {
    req.logger.error('[photos-backup]', { error: error.message });
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// HISTÓRICO DE DOWNLOADS DO CLIENTE
// ============================================================================

// Notificar cliente que as fotos serão removidas em breve (ação do fotógrafo)
router.post('/sessions/:id/notify-pending-download', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
      .populate('clientId', 'name email')
      .lean();
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (!session.deliveredAt) return res.status(400).json({ error: 'Sessão ainda não foi entregue' });

    const clientEmail = session.clientId?.email || session.clientEmail;
    if (!clientEmail) return res.status(400).json({ error: 'Cliente sem e-mail cadastrado' });

    const org = await Organization.findById(req.user.organizationId).select('slug name').lean();
    const baseUrl = process.env.BASE_DOMAIN
      ? `https://${org.slug}.${process.env.BASE_DOMAIN}`
      : `https://${org.slug}.cliquezoom.com.br`;
    const galleryUrl = `${baseUrl}/galeria?code=${session.accessCode}`;

    await sendPendingDownloadEmail(
      clientEmail,
      session.clientId?.name || 'Cliente',
      session.name,
      galleryUrl,
      org.name
    );

    _logEvent(session._id, 'pending_download_notified', { clientEmail });
    req.logger.info(`[notify-pending-download] Sessão ${session._id} — cliente ${clientEmail} notificado`);
    res.json({ success: true });
  } catch (error) {
    req.logger.error('[notify-pending-download]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Registrar evento de download (individual ou ZIP)
// Público — autenticado pelo accessCode (PWA não tem JWT)
router.post('/sessions/:id/track-download', async (req, res) => {
  try {
    const { accessCode, type, count, filenames, participantName } = req.body;
    if (!accessCode) return res.status(400).json({ error: 'accessCode obrigatório' });

    const session = await Session.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
      $or: [
        { accessCode },
        { 'participants.accessCode': accessCode }
      ]
    }).select('_id').lean();

    if (!session) return res.status(403).json({ error: 'Acesso não autorizado' });

    await _logEvent(req.params.id, 'client_downloaded', {
      type: type || 'individual',
      count: count || 1,
      filenames: filenames || [],
      participantName: participantName || null
    });

    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Diagnóstico de fotos — verifica urlOriginal no disco e auto-corrige gallery sem urlOriginal
router.get('/sessions/:id/photos/diagnose', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const report = [];
    let fixed = 0;

    for (const photo of session.photos) {
      const thumbPath = photo.url       ? path.join(__dirname, '../..', photo.url)       : null;
      const origPath  = photo.urlOriginal ? path.join(__dirname, '../..', photo.urlOriginal) : null;
      const thumbExists = thumbPath ? fs.existsSync(thumbPath) : false;
      const origExists  = origPath  ? fs.existsSync(origPath)  : false;

      let thumbSizeKB = null, origSizeKB = null, origDims = null, autoFixed = false;
      if (thumbExists) thumbSizeKB = Math.round(fs.statSync(thumbPath).size / 1024);
      if (origExists) {
        origSizeKB = Math.round(fs.statSync(origPath).size / 1024);
        try { const m = await sharp(origPath).metadata(); origDims = `${m.width}×${m.height}`; } catch {}
      }

      // Auto-corrige: galeria sem urlOriginal mas com arquivo original em disco
      // (thumb = "thumb-{hex}.jpg" → original = "{hex}.jpg" no mesmo diretório)
      if (session.mode === 'gallery' && !photo.urlOriginal && photo.url) {
        const derivedUrl = photo.url.replace(/\/thumb-([^/]+)$/, '/$1');
        const derivedPath = path.join(__dirname, '../..', derivedUrl);
        if (derivedUrl !== photo.url && fs.existsSync(derivedPath)) {
          photo.urlOriginal = derivedUrl;
          origSizeKB = Math.round(fs.statSync(derivedPath).size / 1024);
          try { const m = await sharp(derivedPath).metadata(); origDims = `${m.width}×${m.height}`; } catch {}
          autoFixed = true;
          fixed++;
        }
      }

      report.push({
        id: photo.id,
        filename: photo.filename,
        urlOriginal: photo.urlOriginal || null,
        url: photo.url,
        origExists: photo.urlOriginal ? fs.existsSync(path.join(__dirname, '../..', photo.urlOriginal)) : false,
        thumbExists,
        origSizeKB,
        thumbSizeKB,
        origDims,
        thumbDims: photo.width && photo.height ? `${photo.width}×${photo.height}` : null,
        autoFixed
      });
    }

    if (fixed > 0) await session.save();

    res.json({ success: true, mode: session.mode, totalPhotos: session.photos.length, autoFixed: fixed, photos: report });
  } catch (error) {
    req.logger.error('Diagnose error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});


// ============================================================================
// AUTO-INSCRIÇÃO PÚBLICA (Seleção em Grupo via QR Code / Link)
// ============================================================================

// PÚBLICA: Retorna dados básicos da sessão para exibir na página de cadastro
// Não requer autenticação — busca por accessCode E pelo slug da organização (via middleware tenant)
// Rate limit da auto-inscrição pública: 30 inscrições/min por IP.
// Curva floods de escrita não autenticada sem bloquear o público de um evento real
// (muitas pessoas podem compartilhar o mesmo IP/Wi-Fi do local). A dedupe por
// WhatsApp abaixo ainda impede duplicatas mesmo dentro desse limite.
const selfRegLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.' }
});

router.get('/sessions/register/:code', async (req, res) => {
  try {
    const session = await Session.findOne({
      accessCode: req.params.code,
      organizationId: req.organizationId,
      isActive: true,
      mode: 'multi_selection'
    }).select('name coverPhoto selectionDeadline selfRegEnabled selfRegDeadline').lean();

    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (!session.selfRegEnabled) return res.status(403).json({ error: 'Inscrições encerradas para esta sessão' });

    // Verifica prazo de inscrição
    const regDeadline = session.selfRegDeadline || session.selectionDeadline;
    if (regDeadline && new Date() > new Date(regDeadline)) {
      return res.status(403).json({ error: 'O prazo de inscrição encerrou' });
    }

    // Busca graus de parentesco configurados pela organização
    const org = await Organization.findById(req.organizationId)
      .select('name preferences.membershipRoles').lean();

    res.json({
      success: true,
      session: {
        name: session.name,
        coverPhoto: session.coverPhoto || '',
        deadline: regDeadline || null
      },
      membershipRoles: org?.preferences?.membershipRoles || ['Pai/Mãe', 'Parente', 'Professor', 'Convidado'],
      orgName: org?.name || ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PÚBLICA: Auto-inscrição — cria participante a partir do formulário público
router.post('/sessions/register/:code', selfRegLimiter, checkHoneyPot, async (req, res) => {
  try {
    const { name, phone, relationship } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    if (!phone || !phone.trim()) return res.status(400).json({ error: 'WhatsApp é obrigatório' });
    if (!relationship || !relationship.trim()) return res.status(400).json({ error: 'Grau de parentesco é obrigatório' });

    const session = await Session.findOne({
      accessCode: req.params.code,
      organizationId: req.organizationId,
      isActive: true,
      mode: 'multi_selection',
      selfRegEnabled: true
    });

    if (!session) return res.status(404).json({ error: 'Sessão não encontrada ou inscrições encerradas' });

    // Verifica prazo de inscrição
    const regDeadline = session.selfRegDeadline || session.selectionDeadline;
    if (regDeadline && new Date() > new Date(regDeadline)) {
      return res.status(403).json({ error: 'O prazo de inscrição encerrou' });
    }

    // Idempotência/anti-duplicata: se este WhatsApp já se inscreveu nesta sessão,
    // devolve o código existente em vez de criar outro participante (ex.: reescaneou o QR).
    const phoneDigits = phone.replace(/\D/g, '');
    const existing = (session.participants || []).find(
      p => p.phone && p.phone.replace(/\D/g, '') === phoneDigits
    );
    if (existing) {
      return res.json({
        success: true,
        participantCode: existing.accessCode,
        sessionCode: session.accessCode,
        alreadyRegistered: true
      });
    }

    const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    session.participants.push({
      name: name.trim(),
      phone: phone.trim(),
      relationship: relationship.trim(),
      accessCode,
      packageLimit: session.packageLimit ?? 30,
      selectionStatus: 'pending',
      selectedPhotos: []
    });

    await session.save();

    res.json({
      success: true,
      participantCode: accessCode,
      sessionCode: session.accessCode
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Retorna URL pública de inscrição para exibir QR Code no painel
router.get('/sessions/:id/register-link', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
      .select('accessCode selfRegEnabled selfRegDeadline selectionDeadline mode name').lean();
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.mode !== 'multi_selection') return res.status(400).json({ error: 'Auto-inscrição disponível apenas no modo Seleção em Grupo' });

    const org = await Organization.findById(req.user.organizationId).select('slug customDomain').lean();
    // Espelha o padrão canônico de link do cliente (subdomínio do fotógrafo), não path-based:
    // o resolveTenant identifica o tenant pelo subdomínio, então o link precisa ser <slug>.<base>.
    const base = org?.customDomain
      ? `https://${org.customDomain}`
      : (process.env.BASE_DOMAIN
          ? `https://${org?.slug || ''}.${process.env.BASE_DOMAIN}`
          : `https://${org?.slug || ''}.cliquezoom.com.br`);

    const url = `${base}/inscrever/${session.accessCode}`;

    res.json({
      success: true,
      url,
      selfRegEnabled: session.selfRegEnabled,
      selfRegDeadline: session.selfRegDeadline || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Ativar/desativar auto-inscrição e definir prazo
router.put('/sessions/:id/self-reg', authenticateToken, async (req, res) => {
  try {
    const { selfRegEnabled, selfRegDeadline } = req.body;
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    if (typeof selfRegEnabled === 'boolean') session.selfRegEnabled = selfRegEnabled;
    // Só altera o prazo se o campo veio no body — togglar o "ativar" sozinho não apaga o deadline.
    if ('selfRegDeadline' in req.body) {
      session.selfRegDeadline = selfRegDeadline ? new Date(selfRegDeadline) : null;
    }

    await session.save();
    res.json({ success: true, selfRegEnabled: session.selfRegEnabled, selfRegDeadline: session.selfRegDeadline });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Salvar tabela de preços progressiva da sessão
router.put('/sessions/:id/pricing-table', authenticateToken, async (req, res) => {
  try {
    const { pricingTable } = req.body;

    if (!Array.isArray(pricingTable)) return res.status(400).json({ error: 'pricingTable deve ser um array' });

    // Validação básica das faixas
    for (const row of pricingTable) {
      if (typeof row.from !== 'number' || row.from < 1) return res.status(400).json({ error: 'Cada faixa precisa de um "from" >= 1' });
      if (typeof row.price !== 'number' || row.price < 0) return res.status(400).json({ error: 'Preço inválido em uma das faixas' });
    }

    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { pricingTable },
      { new: true, select: 'pricingTable extraPhotoPrice' }
    );
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    res.json({ success: true, pricingTable: session.pricingTable });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Retorna dados de um participante para pré-preencher o modal Rhyno (conversão → cliente)
router.get('/sessions/:id/participants/:pid/to-client', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
      .select('participants').lean();
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const p = (session.participants || []).find(x => String(x._id) === req.params.pid);
    if (!p) return res.status(404).json({ error: 'Participante não encontrado' });

    // Retorna apenas os campos necessários para criar/pré-preencher um cliente no Rhyno
    res.json({
      success: true,
      participant: {
        name: p.name,
        phone: p.phone || '',
        email: p.email || '',
        relationship: p.relationship || ''
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
