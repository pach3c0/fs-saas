const express = require('express');
const router = express.Router();
const SiteData = require('../models/SiteData');
const { authenticateToken } = require('../middleware/auth');

// ============================================================================
// ROTAS DE SITE DATA (Hero, Sobre, etc)
// ============================================================================
router.get('/site-data', async (req, res) => {
  try {
    const orgId = req.organizationId || req.user?.organizationId;
    if (!orgId) return res.status(400).json({ error: 'Organização não identificada' });
    const data = await SiteData.findOne({ organizationId: orgId }).lean();
    res.json(data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/site-data', authenticateToken, async (req, res) => {
  try {
    // Proteção para não apagar dados acidentalmente
    const setFields = {};
    for (const key of Object.keys(req.body)) {
      if (key !== '_id' && key !== '__v' && key !== 'organizationId') setFields[key] = req.body[key];
    }
    const data = await SiteData.findOneAndUpdate(
      { organizationId: req.user.organizationId },
      { $set: { ...setFields, organizationId: req.user.organizationId } },
      { new: true, upsert: true }
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/hero', async (req, res) => {
  try {
    const orgId = req.organizationId || req.user?.organizationId;
    if (!orgId) return res.status(400).json({ error: 'Organização não identificada' });
    const data = await SiteData.findOne({ organizationId: orgId }).lean();
    res.json(data?.hero || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ROTAS DE FAQ
// ============================================================================
router.get('/faq', async (req, res) => {
  try {
    const orgId = req.organizationId || req.user?.organizationId;
    if (!orgId) return res.status(400).json({ error: 'Organização não identificada' });
    const data = await SiteData.findOne({ organizationId: orgId }).lean();
    res.json({ faqs: data?.faq?.faqs || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/faq', authenticateToken, async (req, res) => {
  try {
    const { question, answer } = req.body;
    const newFAQ = { id: `faq-${Date.now()}`, question, answer };
    await SiteData.findOneAndUpdate(
      { organizationId: req.user.organizationId }, 
      { $push: { 'faq.faqs': newFAQ } }, 
      { upsert: true }
    );
    res.json({ success: true, faq: newFAQ });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/faq/:index', authenticateToken, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const data = await SiteData.findOne({ organizationId: req.user.organizationId });
    if (!data || !data.faq || !data.faq.faqs[index]) return res.status(404).json({ error: 'FAQ não encontrada' });
    
    if (req.body.question) data.faq.faqs[index].question = req.body.question;
    if (req.body.answer) data.faq.faqs[index].answer = req.body.answer;
    
    await SiteData.findOneAndUpdate(
      { organizationId: req.user.organizationId }, 
      { 'faq.faqs': data.faq.faqs }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/faq/:index', authenticateToken, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const data = await SiteData.findOne({ organizationId: req.user.organizationId });
    if (!data || !data.faq || !data.faq.faqs) return res.status(404).json({ error: 'Dados não encontrados' });
    
    data.faq.faqs.splice(index, 1);
    await SiteData.findOneAndUpdate(
      { organizationId: req.user.organizationId }, 
      { 'faq.faqs': data.faq.faqs }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ROTA DE SITE-CONFIG (manutenção + Meta Pixel)
// ============================================================================
router.get('/site-config', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const orgId = req.organizationId || req.user?.organizationId;
      const data = orgId ? await SiteData.findOne({ organizationId: orgId }).sort({ updatedAt: -1 }).lean() : null;
      const meta = data?.integracoes?.metaPixel;
      return res.json({
        maintenance: data?.maintenance || { enabled: false },
        metaPixelId: (meta?.enabled && meta?.pixelId) ? meta.pixelId : null
      });
    }
    return res.json({ maintenance: { enabled: false }, metaPixelId: null });
  } catch (error) {
    console.error('Erro ao carregar config:', error.message);
    return res.json({ maintenance: { enabled: false }, metaPixelId: null });
  }
});

// ============================================================================
// ROTA DE MARKETING
// ============================================================================
router.get('/marketing/overview', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    visits: 1250,
    leads: 77,
    whatsapp: 45,
    cpa: 15.50
  });
});

module.exports = router;
