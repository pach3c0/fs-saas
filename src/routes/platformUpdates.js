const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const PlatformUpdate = require('../models/PlatformUpdate');
const path = require('path');
const fs = require('fs');

// Ler versão atual do package.json
let platformVersion = '1.0.0';
try {
  const pkgPath = path.join(__dirname, '../../package.json');
  const pkgData = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(pkgData);
  platformVersion = pkg.version || '1.0.0';
} catch (err) {
  // Fallback seguro se falhar ao ler o arquivo
}

// ============================================================================
// ROTAS PÚBLICAS (Para fotógrafos autenticados)
// ============================================================================

// GET /api/platform-updates - Listar novidades ativas e retornar versão da plataforma
router.get('/platform-updates', authenticateToken, async (req, res) => {
  try {
    const updates = await PlatformUpdate.find({ active: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json({ success: true, version: platformVersion, updates });
  } catch (error) {
    if (req.logger) req.logger.error('Erro ao buscar novidades da plataforma', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ROTAS ADMINISTRATIVAS (SaaS Admin - Apenas Superadmin)
// ============================================================================

// GET /api/admin/platform-updates - Listar todas as novidades (Superadmin)
router.get('/admin/platform-updates', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const updates = await PlatformUpdate.find()
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json({ success: true, updates });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/platform-updates - Criar uma novidade (Superadmin)
router.post('/admin/platform-updates', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { title, description, iconUrl, linkUrl, order, active } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Título e descrição são obrigatórios' });
    }

    const update = await PlatformUpdate.create({
      title,
      description,
      iconUrl: iconUrl || '',
      linkUrl: linkUrl || '',
      order: order || 0,
      active: active !== undefined ? active : true
    });

    res.status(201).json({ success: true, update });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/platform-updates/:id - Atualizar uma novidade (Superadmin)
router.put('/admin/platform-updates/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { title, description, iconUrl, linkUrl, order, active } = req.body;
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (iconUrl !== undefined) updateData.iconUrl = iconUrl;
    if (linkUrl !== undefined) updateData.linkUrl = linkUrl;
    if (order !== undefined) updateData.order = order;
    if (active !== undefined) updateData.active = active;

    const update = await PlatformUpdate.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    );

    if (!update) {
      return res.status(404).json({ success: false, error: 'Novidade não encontrada' });
    }

    res.json({ success: true, update });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/platform-updates/:id - Remover uma novidade (Superadmin)
router.delete('/api/admin/platform-updates/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const update = await PlatformUpdate.findByIdAndDelete(req.params.id);
    if (!update) {
      return res.status(404).json({ success: false, error: 'Novidade não encontrada' });
    }
    res.json({ success: true, message: 'Novidade removida com sucesso' });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
