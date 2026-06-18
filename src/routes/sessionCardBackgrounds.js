const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const SessionCardBackground = require('../models/SessionCardBackground');

// ============================================================================
// ROTA PÚBLICA (consumida pelo catálogo de sessões do fotógrafo)
// ============================================================================

// GET /api/session-card-backgrounds - Imagens de fundo ativas por modo de sessão.
// Retorna só os modos com active=true E imageUrl preenchida. Keys ausentes fazem
// o card cair no tint sólido automaticamente (tratado no front).
router.get('/session-card-backgrounds', authenticateToken, async (req, res) => {
  try {
    const docs = await SessionCardBackground.find({ active: true }).lean();
    const backgrounds = {};
    for (const doc of docs) {
      if (doc.imageUrl) backgrounds[doc.key] = { imageUrl: doc.imageUrl, opacity: doc.opacity };
    }
    res.json({ success: true, backgrounds });
  } catch (error) {
    if (req.logger) req.logger.error('Erro ao buscar backgrounds dos cards de sessão', { error: error.message });
    // Fallback seguro: nunca quebra o catálogo, apenas cai no tint sólido.
    res.json({ success: true, backgrounds: {} });
  }
});

// ============================================================================
// ROTAS ADMINISTRATIVAS (SaaS Admin - Apenas Superadmin)
// ============================================================================

// GET /api/admin/session-card-backgrounds - Lista os 3 modos e seus estados.
// Sempre retorna as 3 keys (preenchendo defaults para as que ainda não existem).
router.get('/admin/session-card-backgrounds', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const docs = await SessionCardBackground.find().lean();
    const byKey = {};
    docs.forEach(doc => { byKey[doc.key] = doc; });
    const backgrounds = SessionCardBackground.KEYS.map(key => byKey[key] || { key, imageUrl: '', opacity: 0.18, active: true });
    res.json({ success: true, backgrounds });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/session-card-backgrounds/:key - Define/atualiza a imagem de fundo.
// Body: { imageUrl, opacity? }. A imagem já foi enviada via POST /api/admin/upload.
router.post('/admin/session-card-backgrounds/:key', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { key } = req.params;
    if (!SessionCardBackground.KEYS.includes(key)) {
      return res.status(400).json({ success: false, error: 'Modo inválido' });
    }
    const { imageUrl, opacity } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'imageUrl é obrigatório' });
    }
    const update = { imageUrl, active: true };
    if (opacity !== undefined) update.opacity = Math.max(0, Math.min(1, Number(opacity)));
    const background = await SessionCardBackground.findOneAndUpdate(
      { key },
      { $set: update },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true }
    );
    res.json({ success: true, background });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/admin/session-card-backgrounds/:key - Atualiza estado/opacidade. Body: { active?, opacity? }.
router.patch('/admin/session-card-backgrounds/:key', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { key } = req.params;
    if (!SessionCardBackground.KEYS.includes(key)) {
      return res.status(400).json({ success: false, error: 'Modo inválido' });
    }
    const update = {};
    if (req.body.active !== undefined) update.active = !!req.body.active;
    if (req.body.opacity !== undefined) update.opacity = Math.max(0, Math.min(1, Number(req.body.opacity)));
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'Nada para atualizar (active ou opacity)' });
    }
    const background = await SessionCardBackground.findOneAndUpdate(
      { key },
      { $set: update },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true }
    );
    res.json({ success: true, background });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/session-card-backgrounds/:key - Remove a imagem (volta ao tint sólido).
// Mantém o documento (e o estado active), apenas limpa a imageUrl.
router.delete('/admin/session-card-backgrounds/:key', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { key } = req.params;
    if (!SessionCardBackground.KEYS.includes(key)) {
      return res.status(400).json({ success: false, error: 'Modo inválido' });
    }
    await SessionCardBackground.findOneAndUpdate(
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
