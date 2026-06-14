const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const PartnerBanner = require('../models/PartnerBanner');

// ============================================================================
// ROTAS PÚBLICAS (Para fotógrafos autenticados)
// ============================================================================

// GET /api/banners - Listar banners parceiros ativos
router.get('/banners', authenticateToken, async (req, res) => {
  try {
    const banners = await PartnerBanner.find({ active: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    res.json({ success: true, banners });
  } catch (error) {
    if (req.logger) req.logger.error('Erro ao buscar banners ativos', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ROTAS ADMINISTRATIVAS (SaaS Admin - Apenas Superadmin)
// ============================================================================

// GET /api/admin/banners - Listar todos os banners (Superadmin)
router.get('/admin/banners', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const banners = await PartnerBanner.find()
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json({ success: true, banners });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/banners - Criar um banner de parceiro (Superadmin)
router.post('/admin/banners', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { title, imageUrl, linkUrl, order, active } = req.body;
    
    if (!title || !imageUrl) {
      return res.status(400).json({ success: false, error: 'Título e imagem do banner são obrigatórios' });
    }

    const banner = await PartnerBanner.create({
      title,
      imageUrl,
      linkUrl: linkUrl || '',
      order: order || 0,
      active: active !== undefined ? active : true
    });

    res.status(201).json({ success: true, banner });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/banners/:id - Atualizar um banner de parceiro (Superadmin)
router.put('/api/admin/banners/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { title, imageUrl, linkUrl, order, active } = req.body;
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (linkUrl !== undefined) updateData.linkUrl = linkUrl;
    if (order !== undefined) updateData.order = order;
    if (active !== undefined) updateData.active = active;

    const banner = await PartnerBanner.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    );

    if (!banner) {
      return res.status(404).json({ success: false, error: 'Banner não encontrado' });
    }

    res.json({ success: true, banner });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/banners/:id - Remover um banner de parceiro (Superadmin)
router.delete('/api/admin/banners/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const banner = await PartnerBanner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, error: 'Banner não encontrado' });
    }
    res.json({ success: true, message: 'Banner removido com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
