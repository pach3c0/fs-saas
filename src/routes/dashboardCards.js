const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const DashboardCard = require('../models/DashboardCard');

// ============================================================================
// ROTA PÚBLICA (consumida pelo dashboard do fotógrafo)
// ============================================================================

// GET /api/dashboard-cards - Imagens de fundo ativas dos 4 cards de métrica.
// Retorna só os cards com active=true E imageUrl preenchida. Chaves ausentes
// fazem o card cair no estilo sólido automaticamente (tratado no front).
router.get('/dashboard-cards', authenticateToken, async (req, res) => {
  try {
    const docs = await DashboardCard.find({ active: true }).lean();
    const cards = {};
    for (const doc of docs) {
      if (doc.imageUrl) cards[doc.key] = { imageUrl: doc.imageUrl, opacity: doc.opacity };
    }
    res.json({ success: true, cards });
  } catch (error) {
    if (req.logger) req.logger.error('Erro ao buscar imagens dos cards do dashboard', { error: error.message });
    // Fallback seguro: nunca quebra o dashboard, apenas cai no estilo sólido.
    res.json({ success: true, cards: {} });
  }
});

// ============================================================================
// ROTAS ADMINISTRATIVAS (SaaS Admin - Apenas Superadmin)
// ============================================================================

// GET /api/admin/dashboard-cards - Lista os 4 cards e seus estados.
// Sempre retorna as 4 keys (preenchendo defaults para as que ainda não existem).
router.get('/admin/dashboard-cards', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const docs = await DashboardCard.find().lean();
    const byKey = {};
    docs.forEach(doc => { byKey[doc.key] = doc; });
    const cards = DashboardCard.KEYS.map(key => byKey[key] || { key, imageUrl: '', opacity: 0.2, active: true });
    res.json({ success: true, cards });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/dashboard-cards/:key - Define/atualiza a imagem de fundo do card.
// Body: { imageUrl }. A imagem já foi enviada via POST /api/admin/upload.
router.post('/admin/dashboard-cards/:key', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { key } = req.params;
    if (!DashboardCard.KEYS.includes(key)) {
      return res.status(400).json({ success: false, error: 'Card inválido' });
    }
    const { imageUrl, opacity } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'imageUrl é obrigatório' });
    }
    const update = { imageUrl, active: true };
    if (opacity !== undefined) update.opacity = Math.max(0, Math.min(1, Number(opacity)));
    const card = await DashboardCard.findOneAndUpdate(
      { key },
      { $set: update },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true }
    );
    res.json({ success: true, card });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/admin/dashboard-cards/:key - Atualiza estado/opacidade. Body: { active?, opacity? }.
router.patch('/admin/dashboard-cards/:key', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { key } = req.params;
    if (!DashboardCard.KEYS.includes(key)) {
      return res.status(400).json({ success: false, error: 'Card inválido' });
    }
    const update = {};
    if (req.body.active !== undefined) update.active = !!req.body.active;
    if (req.body.opacity !== undefined) update.opacity = Math.max(0, Math.min(1, Number(req.body.opacity)));
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'Nada para atualizar (active ou opacity)' });
    }
    const card = await DashboardCard.findOneAndUpdate(
      { key },
      { $set: update },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true }
    );
    res.json({ success: true, card });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/dashboard-cards/:key - Remove a imagem (volta ao estilo sólido).
// Mantém o documento (e o estado active), apenas limpa a imageUrl.
router.delete('/admin/dashboard-cards/:key', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { key } = req.params;
    if (!DashboardCard.KEYS.includes(key)) {
      return res.status(400).json({ success: false, error: 'Card inválido' });
    }
    await DashboardCard.findOneAndUpdate(
      { key },
      { $set: { imageUrl: '' } },
      { returnDocument: 'after' }
    );
    res.json({ success: true, message: 'Imagem removida' });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
