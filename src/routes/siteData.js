const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const SiteData = require('../models/SiteData');
const Organization = require('../models/Organization');
const Session = require('../models/Session');
const Client = require('../models/Client');
const { authenticateToken } = require('../middleware/auth');

// ============================================================================
// ROTAS DE SITE DATA (Hero, Sobre, etc)
// ============================================================================
router.get('/site-data', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const [data, org] = await Promise.all([
      SiteData.findOne({ organizationId: orgId }).lean(),
      Organization.findById(orgId).select('name slug preferences').lean()
    ]);
    const payload = data || {};
    // Disponibiliza dados da org (nome, slug, preferências) globalmente no admin
    payload.organization = {
      name: org?.name || '',
      slug: org?.slug || '',
      preferences: org?.preferences || {}
    };
    res.json(payload);
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
      { returnDocument: 'after', upsert: true }
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
    if (mongoose.connection.readyState === 1) {
      const orgId = req.organizationId || req.user?.organizationId;
      const [data, org] = orgId
        ? await Promise.all([
            SiteData.findOne({ organizationId: orgId }).sort({ updatedAt: -1 }).lean(),
            Organization.findById(orgId).select('integrations').lean()
          ])
        : [null, null];
      const meta = org?.integrations?.metaPixel;
      return res.json({
        maintenance: data?.maintenance || { enabled: false },
        metaPixelId: (meta?.enabled && meta?.pixelId) ? meta.pixelId : null
      });
    }
    return res.json({ maintenance: { enabled: false }, metaPixelId: null });
  } catch (error) {
    req.logger.error('Erro ao carregar config', { error: error.message });
    return res.json({ maintenance: { enabled: false }, metaPixelId: null });
  }
});

// ============================================================================
// ROTA DE MARKETING
// ============================================================================
router.get('/marketing/overview', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const now = new Date();
    const start30d = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const start60d = new Date(now - 60 * 24 * 60 * 60 * 1000);

    const [
      sessionsAll,
      sessions30d,
      sessionsPrev30d,
      clientsAll,
      clients30d,
      clientsPrev30d,
      org
    ] = await Promise.all([
      Session.find({ organizationId: orgId, isActive: true }).select(
        'selectionStatus mode eventType photos firstAccessAt codeSentAt selectionSubmittedAt deliveredAt createdAt salesAutomation'
      ).lean(),
      Session.countDocuments({ organizationId: orgId, isActive: true, createdAt: { $gte: start30d } }),
      Session.countDocuments({ organizationId: orgId, isActive: true, createdAt: { $gte: start60d, $lt: start30d } }),
      Client.countDocuments({ organizationId: orgId }),
      Client.countDocuments({ organizationId: orgId, createdAt: { $gte: start30d } }),
      Client.countDocuments({ organizationId: orgId, createdAt: { $gte: start60d, $lt: start30d } }),
      Organization.findById(orgId).select('integrations').lean()
    ]);

    // Funil real
    const totalSessions = sessionsAll.length;
    const codeSent     = sessionsAll.filter(s => s.codeSentAt).length;
    const accessed     = sessionsAll.filter(s => s.firstAccessAt).length;
    const submitted    = sessionsAll.filter(s => ['submitted', 'delivered'].includes(s.selectionStatus)).length;
    const delivered    = sessionsAll.filter(s => s.selectionStatus === 'delivered').length;
    const expired      = sessionsAll.filter(s => s.selectionStatus === 'expired').length;

    // Status das sessoes ativas agora
    const statusCount = {
      pending:     sessionsAll.filter(s => s.selectionStatus === 'pending').length,
      in_progress: sessionsAll.filter(s => s.selectionStatus === 'in_progress').length,
      submitted:   sessionsAll.filter(s => s.selectionStatus === 'submitted').length,
      delivered:   sessionsAll.filter(s => s.selectionStatus === 'delivered').length,
      expired:     sessionsAll.filter(s => s.selectionStatus === 'expired').length
    };

    // Breakdown por tipo de evento
    const eventTypeMap = {};
    for (const s of sessionsAll) {
      const t = s.eventType || 'outro';
      eventTypeMap[t] = (eventTypeMap[t] || 0) + 1;
    }
    const byEventType = Object.entries(eventTypeMap)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));

    // Breakdown por modo
    const modeMap = {};
    for (const s of sessionsAll) {
      const m = s.mode || 'selection';
      modeMap[m] = (modeMap[m] || 0) + 1;
    }

    // Total de fotos entregues (soma das selecionadas nas sessoes delivered)
    const totalPhotosUploaded = sessionsAll.reduce((acc, s) => acc + (s.photos?.length || 0), 0);

    // CRM: triggers disparados
    const totalTriggers = sessionsAll.reduce((acc, s) => acc + (s.salesAutomation?.sentTriggers?.length || 0), 0);
    const redeemedCoupons = sessionsAll.reduce((acc, s) => {
      return acc + (s.salesAutomation?.sentTriggers?.filter(t => t.redeemedAt)?.length || 0);
    }, 0);

    // Variacao percentual vs periodo anterior
    const pct = (curr, prev) => prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);

    // Config GA
    const ga = org?.integrations?.googleAnalytics;
    const gaConfigured = !!(ga?.enabled && ga?.measurementId);
    const gaMeasurementId = gaConfigured ? ga.measurementId : null;

    res.json({
      success: true,
      // KPIs 30d
      sessions30d,
      sessionsPrev30d,
      sessionsDelta: pct(sessions30d, sessionsPrev30d),
      clients30d,
      clientsPrev30d,
      clientsDelta: pct(clients30d, clientsPrev30d),
      // Totais
      clientsAll,
      totalSessions,
      totalPhotosUploaded,
      // Funil
      funnel: { totalSessions, codeSent, accessed, submitted, delivered, expired },
      // Status atual
      statusCount,
      // Breakdowns
      byEventType,
      byMode: modeMap,
      // CRM
      crm: { totalTriggers, redeemedCoupons },
      // Taxas (evitar divisão por zero)
      rates: {
        accessRate:   codeSent   > 0 ? Math.round((accessed  / codeSent)   * 100) : null,
        submitRate:   accessed   > 0 ? Math.round((submitted / accessed)   * 100) : null,
        deliveryRate: submitted  > 0 ? Math.round((delivered / submitted)  * 100) : null
      },
      // Google Analytics
      ga: { configured: gaConfigured, measurementId: gaMeasurementId }
    });
  } catch (error) {
    req.logger.error('Erro ao buscar marketing overview', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
