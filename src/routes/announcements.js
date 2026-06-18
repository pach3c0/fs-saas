const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const Announcement = require('../models/Announcement');

// ============================================================================
// ROTAS PÚBLICAS (Para fotógrafos autenticados)
// ============================================================================

// GET /api/announcements - Listar comunicados ativos
router.get('/announcements', authenticateToken, async (req, res) => {
  try {
    const announcements = await Announcement.find({ active: true })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, announcements });
  } catch (error) {
    if (req.logger) req.logger.error('Erro ao buscar comunicados ativos', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ROTAS ADMINISTRATIVAS (SaaS Admin - Apenas Superadmin)
// ============================================================================

// GET /api/admin/announcements - Listar todos os comunicados (Superadmin)
router.get('/admin/announcements', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, announcements });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/announcements - Criar um comunicado (Superadmin)
router.post('/admin/announcements', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { title, content, imageUrl, linkUrl, linkText, active } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Título e conteúdo são obrigatórios' });
    }

    const announcement = await Announcement.create({
      title,
      content,
      imageUrl: imageUrl || '',
      linkUrl: linkUrl || '',
      linkText: linkText || 'Saiba mais',
      active: active !== undefined ? active : true
    });

    res.status(201).json({ success: true, announcement });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/announcements/:id - Atualizar um comunicado (Superadmin)
router.put('/api/admin/announcements/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { title, content, imageUrl, linkUrl, linkText, active } = req.body;
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (linkUrl !== undefined) updateData.linkUrl = linkUrl;
    if (linkText !== undefined) updateData.linkText = linkText;
    if (active !== undefined) updateData.active = active;

    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    );

    if (!announcement) {
      return res.status(404).json({ success: false, error: 'Comunicado não encontrado' });
    }

    res.json({ success: true, announcement });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/announcements/:id - Remover um comunicado (Superadmin)
router.delete('/api/admin/announcements/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, error: 'Comunicado não encontrado' });
    }
    res.json({ success: true, message: 'Comunicado removido com sucesso' });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
