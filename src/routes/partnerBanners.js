const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const PartnerBanner = require('../models/PartnerBanner');
const BannerConfig = require('../models/BannerConfig');

// ============================================================================
// ROTAS PÚBLICAS (Para fotógrafos autenticados)
// ============================================================================

// GET /api/banners - Listar banners parceiros ativos
router.get('/banners', authenticateToken, async (req, res) => {
  try {
    const banners = await PartnerBanner.find({ active: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    let config = await BannerConfig.findOne().lean();
    if (!config) config = { interval: 0 };
    res.json({ success: true, banners, interval: config.interval, accentColor: config.accentColor || '#3fb950' });
  } catch (error) {
    if (req.logger) req.logger.error('Erro ao buscar banners ativos', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/theme - Cor secundária da marca (token --cz-secondary) p/ o painel do fotógrafo.
// Fonte única: BannerConfig.accentColor (mesmo valor que pinta o banner). Lido no boot do admin.
router.get('/theme', authenticateToken, async (req, res) => {
  try {
    const config = await BannerConfig.findOne().lean();
    res.json({ success: true, secondaryColor: (config && config.accentColor) || '#3fb950' });
  } catch (error) {
    if (req.logger) req.logger.error('Erro ao buscar tema', { error: error.message });
    res.status(500).json({ success: false, secondaryColor: '#3fb950' });
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
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/banners/config - Obter config (Superadmin)
router.get('/admin/banners/config', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    let config = await BannerConfig.findOne().lean();
    if (!config) config = { interval: 0 };
    res.json({ success: true, interval: config.interval, accentColor: config.accentColor || '#3fb950' });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/banners/config - Salvar config (Superadmin)
router.post('/admin/banners/config', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { interval, accentColor } = req.body;
    let config = await BannerConfig.findOne();
    if (!config) config = new BannerConfig();
    config.interval = Number(interval) || 0;
    // Só aceita hex #RRGGBB válido; ignora qualquer outra coisa (evita CSS injection no front).
    if (typeof accentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(accentColor.trim())) {
      config.accentColor = accentColor.trim();
    }
    await config.save();
    res.json({ success: true, interval: config.interval, accentColor: config.accentColor || '#3fb950' });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/banners - Criar um banner de parceiro (Superadmin)
router.post('/admin/banners', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { title, description, imageUrl, linkUrl, order, active } = req.body;
    
    if (!title || !imageUrl) {
      return res.status(400).json({ success: false, error: 'Título e imagem do banner são obrigatórios' });
    }

    const banner = await PartnerBanner.create({
      title,
      description: description || '',
      imageUrl,
      linkUrl: linkUrl || '',
      order: order || 0,
      active: active !== undefined ? active : true
    });

    res.status(201).json({ success: true, banner });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /admin/banners/:id - Atualizar um banner de parceiro (Superadmin)
router.put('/admin/banners/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { title, description, imageUrl, linkUrl, order, active } = req.body;
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
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
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /admin/banners/:id - Remover um banner de parceiro (Superadmin)
router.delete('/admin/banners/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const banner = await PartnerBanner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, error: 'Banner não encontrado' });
    }
    res.json({ success: true, message: 'Banner removido com sucesso' });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
