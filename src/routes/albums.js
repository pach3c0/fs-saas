const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Album = require('../models/Album');
const Session = require('../models/Session');
const Subscription = require('../models/Subscription');
const { authenticateToken } = require('../middleware/auth');
const { checkLimit, checkAlbumLimit } = require('../middleware/planLimits');

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
    const { name, sessionId } = req.body;

    // Validar sessão
    const session = await Session.findOne({
      _id: sessionId,
      organizationId: req.user.organizationId
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const album = new Album({
      organizationId: req.user.organizationId,
      sessionId,
      clientId: session.clientId, // Vincula ao cliente da sessão se houver
      name,
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

// Obter detalhes do álbum
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

// Atualizar álbum (páginas, nome, status)
router.put('/albums/:id', authenticateToken, async (req, res) => {
  try {
    const { name, status, pages, coverPhoto } = req.body;
    
    const album = await Album.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });

    if (name) album.name = name;
    if (status) album.status = status;
    if (pages) album.pages = pages;
    if (coverPhoto) album.coverPhoto = coverPhoto;

    await album.save();
    res.json({ success: true, album });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao atualizar álbum' });
  }
});

// Enviar para cliente (mudar status)
router.post('/albums/:id/send', authenticateToken, async (req, res) => {
  try {
    const album = await Album.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { status: 'sent' },
      { new: true }
    );
    if (!album) return res.status(404).json({ error: 'Álbum não encontrado' });
    res.json({ success: true, album });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Verificar código
router.post('/client/album/verify-code', async (req, res) => {
  try {
    const { accessCode } = req.body;
    const album = await Album.findOne({ accessCode, isActive: true }).populate('sessionId');
    
    if (!album) return res.status(404).json({ error: 'Código inválido' });

    res.json({
      success: true,
      albumId: album._id,
      name: album.name,
      status: album.status,
      clientName: album.sessionId?.name
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter dados do álbum (Cliente)
router.get('/client/album/:id', async (req, res) => {
  try {
    const { code } = req.query;
    const album = await Album.findOne({ _id: req.params.id, accessCode: code, isActive: true });
    
    if (!album) return res.status(403).json({ error: 'Acesso negado' });
    
    res.json(album);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aprovar álbum
router.post('/client/album/:id/approve', async (req, res) => {
  try {
    const { code } = req.body;
    const album = await Album.findOneAndUpdate(
      { _id: req.params.id, accessCode: code },
      { status: 'approved', approvedAt: new Date() },
      { new: true }
    );
    if (!album) return res.status(403).json({ error: 'Acesso negado' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;