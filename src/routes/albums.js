const express = require('express');
const router = express.Router();
const Album = require('../models/Album');
const Session = require('../models/Session');
const Subscription = require('../models/Subscription');
const Client = require('../models/Client');
const Organization = require('../models/Organization');
const { authenticateToken } = require('../middleware/auth');
const { checkLimit, checkAlbumLimit } = require('../middleware/planLimits');
const { sendAlbumAvailableEmail, sendAlbumApprovedEmail, sendAlbumRevisionEmail } = require('../utils/email');

// === ROTAS ADMIN (Protegidas) ===

// Listar álbuns da organização
router.get('/albums', authenticateToken, async (req, res) => {
  try {
    const { clientId, status } = req.query;
    const query = { organizationId: req.user.organizationId, isActive: true };

    if (clientId) query.clientId = clientId;
    if (status) query.status = status;

    const albums = await Album.find(query)
      .populate('sessionId', 'name date')
      .sort({ createdAt: -1 });

    res.json({ success: true, albums });
  } catch (error) {
    console.error('Erro ao listar álbuns:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar álbuns' });
  }
});

// Criar novo álbum
router.post('/albums', authenticateToken, checkLimit, checkAlbumLimit, async (req, res) => {
  try {
    const { name, sessionId, welcomeText } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Nome do álbum é obrigatório' });
    }

    // Validar sessão apenas se informada
    let linkedClientId;
    if (sessionId) {
      const session = await Session.findOne({
        _id: sessionId,
        organizationId: req.user.organizationId
      });
      if (!session) return res.status(404).json({ success: false, error: 'Sessão não encontrada' });
      linkedClientId = session.clientId;
    }

    const album = new Album({
      organizationId: req.user.organizationId,
      sessionId: sessionId || undefined,
      clientId: linkedClientId,
      name: name.trim(),
      welcomeText: welcomeText || '',
      accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      pages: []
    });

    await album.save();

    // Incrementar uso de álbuns na assinatura
    await Subscription.findOneAndUpdate(
      { organizationId: req.user.organizationId },
      { $inc: { 'usage.albums': 1 } }
    );

    res.json({ success: true, album });
  } catch (error) {
    console.error('Erro ao criar álbum:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar álbum' });
  }
});

// Obter detalhes do álbum (admin)
router.get('/albums/:id', authenticateToken, async (req, res) => {
  try {
    const album = await Album.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    }).populate('sessionId');

    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });

    res.json({ success: true, album });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao buscar álbum' });
  }
});

// Atualizar álbum (nome, welcomeText, status, pages, coverPhoto)
router.put('/albums/:id', authenticateToken, async (req, res) => {
  try {
    const { name, welcomeText, status, pages, coverPhoto } = req.body;

    const album = await Album.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });

    if (name !== undefined) album.name = name;
    if (welcomeText !== undefined) album.welcomeText = welcomeText;
    if (status !== undefined) album.status = status;
    if (coverPhoto !== undefined) album.coverPhoto = coverPhoto;
    if (pages !== undefined) {
      album.pages = pages;
      album.version = (album.version || 1) + 1; // Incrementar versão ao mudar páginas
    }

    await album.save();
    res.json({ success: true, album });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao atualizar álbum' });
  }
});

// Enviar para cliente (mudar status para 'sent')
router.post('/albums/:id/send', authenticateToken, async (req, res) => {
  try {
    const album = await Album.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { status: 'sent' },
      { new: true }
    );
    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });

    // Notificar cliente por e-mail (via CRM)
    if (album.clientId) {
      const [client, org] = await Promise.all([
        Client.findById(album.clientId).select('email name'),
        Organization.findById(req.user.organizationId).select('name')
      ]);
      if (client?.email) {
        sendAlbumAvailableEmail(client.email, client.name, album.accessCode, album.name, org?.name || 'Fotógrafo').catch(() => {});
      }
    }

    res.json({ success: true, album });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remover álbum (soft delete)
router.delete('/albums/:id', authenticateToken, async (req, res) => {
  try {
    const album = await Album.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { isActive: false },
      { new: true }
    );

    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });

    res.json({ success: true, message: 'Álbum removido' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao remover álbum' });
  }
});

// === ROTAS CLIENTE (Públicas com Access Code) ===

// Verificar código de acesso
router.post('/client/album/verify-code', async (req, res) => {
  try {
    const { accessCode } = req.body;
    const album = await Album.findOne({ accessCode, isActive: true }).populate('sessionId', 'name');

    if (!album) return res.status(404).json({ success: false, error: 'Código inválido' });

    res.json({
      success: true,
      albumId: album._id,
      name: album.name,
      status: album.status,
      clientName: album.sessionId?.name || album.name
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obter dados do álbum (cliente)
router.get('/client/album/:id', async (req, res) => {
  try {
    const { code } = req.query;
    const album = await Album.findOne({ _id: req.params.id, accessCode: code, isActive: true });

    if (!album) return res.status(403).json({ success: false, error: 'Acesso negado' });

    res.json({ success: true, album });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cliente aprova uma página individual
router.put('/client/album/:albumId/pages/:pageId/approve', async (req, res) => {
  try {
    const { code } = req.body;
    const album = await Album.findOne({ _id: req.params.albumId, accessCode: code, isActive: true });

    if (!album) return res.status(403).json({ success: false, error: 'Acesso negado' });

    const page = album.pages.id(req.params.pageId);
    if (!page) return res.status(404).json({ success: false, error: 'Página não encontrada' });

    page.status = 'approved';
    album.version = (album.version || 1) + 1;

    // Se todas as páginas estiverem aprovadas, marcar álbum como aprovado automaticamente
    if (album.pages.length > 0 && album.pages.every(p => p.status === 'approved')) {
      album.status = 'approved';
      album.approvedAt = new Date();
    }

    await album.save();
    res.json({ success: true, album });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cliente pede revisão de uma página
router.put('/client/album/:albumId/pages/:pageId/request-revision', async (req, res) => {
  try {
    const { code, comment } = req.body;
    const album = await Album.findOne({ _id: req.params.albumId, accessCode: code, isActive: true });

    if (!album) return res.status(403).json({ success: false, error: 'Acesso negado' });

    const page = album.pages.id(req.params.pageId);
    if (!page) return res.status(404).json({ success: false, error: 'Página não encontrada' });

    page.status = 'revision_requested';
    if (comment && comment.trim()) {
      page.comments.push({ text: comment.trim(), author: 'client', createdAt: new Date() });
    }

    album.status = 'revision_requested';
    album.version = (album.version || 1) + 1;

    await album.save();

    // Notificar fotografo por e-mail
    try {
      const org = await Organization.findById(album.organizationId).select('email slug');
      if (org?.email) {
        sendAlbumRevisionEmail(org.email, 'Cliente', album.name, comment || '', org.slug).catch(() => {});
      }
    } catch(e){}

    res.json({ success: true, album });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cliente aprova o álbum completo
router.post('/client/album/:albumId/approve-all', async (req, res) => {
  try {
    const { code } = req.body;
    const album = await Album.findOne({ _id: req.params.albumId, accessCode: code, isActive: true });

    if (!album) return res.status(403).json({ success: false, error: 'Acesso negado' });

    album.status = 'approved';
    album.approvedAt = new Date();
    album.version = (album.version || 1) + 1;

    await album.save();

    // Notificar fotografo por e-mail
    try {
      const org = await Organization.findById(album.organizationId).select('email slug');
      if (org?.email) {
        sendAlbumApprovedEmail(org.email, 'Cliente', album.name, org.slug).catch(() => {});
      }
    } catch(e){}

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
