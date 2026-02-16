const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');
const { createUploader } = require('../utils/multerConfig');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const archiver = require('archiver');
const { checkDeadlines } = require('../utils/deadlineChecker');

const uploadSession = createUploader('sessions');

// ============================================================================
// ROTAS DO CLIENTE
// ============================================================================

// CLIENTE: Validar código
router.post('/client/verify-code', async (req, res) => {
  try {
    const { accessCode } = req.body;
    const session = await Session.findOne({ 
      accessCode, 
      isActive: true,
      organizationId: req.organizationId 
    }).populate('organizationId'); // Popular dados da organização

    if (!session) return res.status(401).json({ error: 'Código inválido' });

    // Notificar admin
    try { 
      await Notification.create({ 
        type: 'session_accessed', 
        sessionId: session._id, 
        sessionName: session.name, 
        message: `${session.name} acessou a galeria`,
        organizationId: session.organizationId
      }); 
    } catch(e){}

    res.json({
      success: true,
      sessionId: session._id,
      clientName: session.name,
      sessionType: session.type || '',
      galleryDate: session.date ? new Date(session.date).toLocaleDateString('pt-BR') : '',
      totalPhotos: (session.photos || []).length,
      mode: session.mode || 'gallery',
      selectionStatus: session.selectionStatus || 'pending',
      packageLimit: session.packageLimit || 30,
      extraPhotoPrice: session.extraPhotoPrice || 25,
      watermark: session.watermark !== false,
      accessCode: session.accessCode,
      selectionDeadline: session.selectionDeadline,
      coverPhoto: session.coverPhoto || '',
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

// CLIENTE: Listar fotos
router.get('/client/photos/:sessionId', async (req, res) => {
  try {
    const session = await Session.findOne({ 
      _id: req.params.sessionId,
      organizationId: req.organizationId
    }).populate('organizationId');

    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    res.json({
      success: true,
      name: session.name,
      type: session.type,
      photos: session.photos,
      selectedPhotos: session.selectedPhotos || [],
      mode: session.mode,
      selectionStatus: session.selectionStatus,
      watermark: session.watermark,
      selectionDeadline: session.selectionDeadline,
      packageLimit: session.packageLimit,
      extraPhotoPrice: session.extraPhotoPrice,
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
    const { photoId } = req.body;
    const session = await Session.findOne({
      _id: req.params.sessionId,
      organizationId: req.organizationId
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    // Validar prazo
    if (session.selectionDeadline && new Date() > new Date(session.selectionDeadline)) {
      return res.status(403).json({ error: 'O prazo de seleção expirou' });
    }

    if (!session.selectedPhotos) session.selectedPhotos = [];

    const idx = session.selectedPhotos.indexOf(photoId);
    if (idx > -1) {
      session.selectedPhotos.splice(idx, 1);
    } else {
      session.selectedPhotos.push(photoId);
    }

    if (session.selectionStatus === 'pending' && session.selectedPhotos.length > 0) {
      session.selectionStatus = 'in_progress';
      try { 
        await Notification.create({ 
          type: 'selection_started', 
          sessionId: session._id, 
          sessionName: session.name, 
          message: `${session.name} iniciou a seleção`,
          organizationId: session.organizationId
        }); 
      } catch(e){}
    }

    await session.save();
    res.json({ success: true, selectedCount: session.selectedPhotos.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Finalizar seleção
router.post('/client/submit-selection/:sessionId', async (req, res) => {
  try {
    const session = await Session.findOne({ 
      _id: req.params.sessionId,
      organizationId: req.organizationId
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    // Validar prazo
    if (session.selectionDeadline && new Date() > new Date(session.selectionDeadline)) {
      return res.status(403).json({ error: 'O prazo de seleção expirou' });
    }

    session.selectionStatus = 'submitted';
    session.selectionSubmittedAt = new Date();
    await session.save();

    try { 
      await Notification.create({ 
        type: 'selection_submitted', 
        sessionId: session._id, 
        sessionName: session.name, 
        message: `${session.name} finalizou a seleção (${session.selectedPhotos.length} fotos)`,
        organizationId: session.organizationId
      }); 
    } catch(e){}

    res.json({ success: true });
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
    if (session.selectionStatus !== 'submitted') return res.status(400).json({ error: 'Seleção não está no status enviada' });

    try { 
      await Notification.create({ 
        type: 'reopen_requested', 
        sessionId: session._id, 
        sessionName: session.name, 
        message: `${session.name} pediu reabertura da seleção`,
        organizationId: session.organizationId
      }); 
    } catch(e){}

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
        message: `${session.name} comentou em uma foto`,
        organizationId: session.organizationId
      }); 
    } catch(e){}

    res.json({ success: true, comment: newComment });
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
      .sort({ createdAt: -1 });
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const session = await Session.create({ 
      ...req.body, 
      accessCode, 
      isActive: true,
      organizationId: req.user.organizationId
    });
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
      { new: true }
    );
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    res.json({ success: true, session });
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
      // Tentar limpar arquivos (opcional, pode falhar sem erro)
      session.photos.forEach(p => {
        if (p.url.startsWith('/uploads/')) {
          try { fs.unlinkSync(path.join(__dirname, '../..', p.url)); } catch(e){}
        }
      });
      await Session.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/photos', authenticateToken, uploadSession.array('photos'), async (req, res) => {
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

      // Gerar thumb comprimida (1200px, qualidade 85)
      await sharp(originalPath)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(thumbPath);

      newPhotos.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        filename: file.filename,
        url: `/uploads/${orgId}/sessions/${thumbFilename}`,      // thumb para galeria
        urlOriginal: `/uploads/${orgId}/sessions/${file.filename}`, // original para entrega
        uploadedAt: new Date()
      });
    }

    session.photos.push(...newPhotos);
    await session.save();
    res.json({ success: true, photos: newPhotos });
  } catch (error) {
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
      // Deletar thumb
      if (photo.url && photo.url.startsWith('/uploads/')) {
        try { fs.unlinkSync(path.join(__dirname, '../..', photo.url)); } catch(e){}
      }
      // Deletar original
      if (photo.urlOriginal && photo.urlOriginal.startsWith('/uploads/')) {
        try { fs.unlinkSync(path.join(__dirname, '../..', photo.urlOriginal)); } catch(e){}
      }
      session.photos.splice(idx, 1);

      if (session.selectedPhotos) {
        session.selectedPhotos = session.selectedPhotos.filter(id => id !== req.params.photoId);
      }

      await session.save();
    }
    res.json({ success: true });
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
    await Session.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { selectionStatus: 'delivered', watermark: false, deliveredAt: new Date() }
    );
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

    const photo = session.photos.find(p => p.id === req.params.photoId);
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada' });

    // Se highResDelivery ativo e urlOriginal existe, servir original; caso contrário thumb
    const urlToServe = (session.highResDelivery && photo.urlOriginal) ? photo.urlOriginal : photo.url;
    const filePath = path.join(__dirname, '../..', urlToServe);

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo não encontrado' });

    const filename = path.basename(filePath);
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
    if (session.selectionStatus !== 'delivered') return res.status(403).json({ error: 'Fotos ainda não foram entregues' });

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
      const urlToServe = (session.highResDelivery && photo.urlOriginal) ? photo.urlOriginal : photo.url;
      const filePath = path.join(__dirname, '../..', urlToServe);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: path.basename(filePath) });
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
