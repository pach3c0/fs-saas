const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Organization = require('../models/Organization');

// GET /api/organization/profile - Dados do perfil da organizacao
router.get('/organization/profile', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId).lean();
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organizacao nao encontrada' });
    }

    res.json({
      success: true,
      data: {
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        phone: org.phone,
        whatsapp: org.whatsapp,
        email: org.email,
        website: org.website,
        bio: org.bio,
        address: org.address,
        city: org.city,
        state: org.state,
        primaryColor: org.primaryColor,
        watermarkType: org.watermarkType,
        watermarkText: org.watermarkText,
        watermarkOpacity: org.watermarkOpacity,
        watermarkPosition: org.watermarkPosition,
        watermarkSize: org.watermarkSize,
        plan: org.plan
      }
    });
  } catch (error) {
    req.logger.error('Erro ao buscar perfil', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/organization/profile - Atualizar perfil da organizacao
router.put('/organization/profile', authenticateToken, async (req, res) => {
  try {
    const allowedFields = [
      'name', 'logo', 'phone', 'whatsapp', 'email', 'website',
      'bio', 'address', 'city', 'state', 'primaryColor',
      'watermarkType', 'watermarkText', 'watermarkOpacity', 'watermarkPosition', 'watermarkSize'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const org = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!org) {
      return res.status(404).json({ success: false, error: 'Organizacao nao encontrada' });
    }

    res.json({ success: true, data: org });
  } catch (error) {
    req.logger.error('Erro ao atualizar perfil', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/organization/public - Dados publicos da org (para galeria do cliente)
router.get('/organization/public', async (req, res) => {
  try {
    const orgId = req.organizationId;
    if (!orgId) {
      return res.status(400).json({ success: false, error: 'Organizacao nao identificada' });
    }

    const org = await Organization.findById(orgId).lean();
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organizacao nao encontrada' });
    }

    res.json({
      success: true,
      data: {
        name: org.name,
        logo: org.logo,
        primaryColor: org.primaryColor,
        watermarkType: org.watermarkType,
        watermarkText: org.watermarkText,
        watermarkOpacity: org.watermarkOpacity
      }
    });
  } catch (error) {
    req.logger.error('Erro ao buscar dados publicos', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/onboarding - Status do onboarding
router.get('/onboarding', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId).select('onboarding').lean();
    if (!org) return res.status(404).json({ error: 'Organizacao nao encontrada' });
    res.json({ success: true, onboarding: org.onboarding });
  } catch (error) {
    req.logger.error('Erro ao buscar onboarding', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// GET /api/organization/integrations - Configs de integracoes/automacoes
router.get('/organization/integrations', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId).select('integrations').lean();
    if (!org) return res.status(404).json({ success: false, error: 'Organizacao nao encontrada' });
    res.json({ success: true, integrations: org.integrations || {} });
  } catch (error) {
    req.logger.error('Erro ao buscar integrations', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/organization/integrations - Atualizar integrations (atualmente: salesAutomator)
router.put('/organization/integrations', authenticateToken, async (req, res) => {
  try {
    const { salesAutomator } = req.body;
    const $set = {};

    if (salesAutomator && typeof salesAutomator === 'object') {
      if (typeof salesAutomator.enabled === 'boolean') {
        $set['integrations.salesAutomator.enabled'] = salesAutomator.enabled;
      }
      if (salesAutomator.scarcity && typeof salesAutomator.scarcity === 'object') {
        if (typeof salesAutomator.scarcity.enabled === 'boolean') {
          $set['integrations.salesAutomator.scarcity.enabled'] = salesAutomator.scarcity.enabled;
        }
        if (Array.isArray(salesAutomator.scarcity.daysSchedule)) {
          $set['integrations.salesAutomator.scarcity.daysSchedule'] = salesAutomator.scarcity.daysSchedule
            .map(n => Number(n)).filter(n => Number.isFinite(n) && n > 0);
        }
      }
      if (typeof salesAutomator.couponPrefix === 'string') {
        $set['integrations.salesAutomator.couponPrefix'] = salesAutomator.couponPrefix.trim().slice(0, 8) || 'CZ';
      }
      if (typeof salesAutomator.couponDiscountPercent === 'number') {
        const pct = Math.max(0, Math.min(100, salesAutomator.couponDiscountPercent));
        $set['integrations.salesAutomator.couponDiscountPercent'] = pct;
      }
    }

    if (Object.keys($set).length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhuma configuracao valida enviada' });
    }

    const org = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { $set },
      { new: true, runValidators: true }
    ).select('integrations');

    if (!org) return res.status(404).json({ success: false, error: 'Organizacao nao encontrada' });
    res.json({ success: true, integrations: org.integrations });
  } catch (error) {
    req.logger.error('Erro ao atualizar integrations', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/onboarding/dismiss - Finalizar onboarding manualmente
router.post('/onboarding/dismiss', authenticateToken, async (req, res) => {
  try {
    await Organization.findByIdAndUpdate(req.user.organizationId, {
      'onboarding.completed': true
    });
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro ao finalizar onboarding', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
