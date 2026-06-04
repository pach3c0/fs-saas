const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Organization = require('../models/Organization');

// Sanitiza um mapa de desconto por dia { '7': 10, '3': 15 } — chaves numéricas, valores 0–100.
function _sanitizeDiscountMap(map) {
  const out = {};
  for (const [k, v] of Object.entries(map || {})) {
    const day = Number(k);
    const pct = Number(v);
    if (Number.isFinite(day) && day > 0 && Number.isFinite(pct)) {
      out[String(day)] = Math.max(0, Math.min(100, pct));
    }
  }
  return out;
}

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
        watermarkFontColor: org.watermarkFontColor,
        watermarkFontFamily: org.watermarkFontFamily,
        watermarkFontWeight: org.watermarkFontWeight,
        watermarkFontStyle: org.watermarkFontStyle,
        watermarkLetterSpacing: org.watermarkLetterSpacing,
        watermarkRotation: org.watermarkRotation,
        watermarkCustomSize: org.watermarkCustomSize,
        watermarkShadow: org.watermarkShadow,
        watermarkImageFilter: org.watermarkImageFilter,
        watermarkImageOpacity: org.watermarkImageOpacity,
        watermarkLayers: org.watermarkLayers || [],
        plan: org.plan,
        integrations: org.integrations || {}
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
      'watermarkType', 'watermarkText', 'watermarkOpacity', 'watermarkPosition', 'watermarkSize',
      'watermarkFontColor', 'watermarkFontFamily', 'watermarkFontWeight', 'watermarkFontStyle',
      'watermarkLetterSpacing', 'watermarkRotation', 'watermarkCustomSize', 'watermarkShadow',
      'watermarkImageFilter', 'watermarkImageOpacity', 'watermarkLayers'
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
      { returnDocument: 'after', runValidators: true }
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
        watermarkOpacity: org.watermarkOpacity,
        watermarkPosition: org.watermarkPosition,
        watermarkSize: org.watermarkSize,
        watermarkFontColor: org.watermarkFontColor,
        watermarkFontFamily: org.watermarkFontFamily,
        watermarkFontWeight: org.watermarkFontWeight,
        watermarkFontStyle: org.watermarkFontStyle,
        watermarkLetterSpacing: org.watermarkLetterSpacing,
        watermarkRotation: org.watermarkRotation,
        watermarkCustomSize: org.watermarkCustomSize,
        watermarkShadow: org.watermarkShadow,
        watermarkImageFilter: org.watermarkImageFilter,
        watermarkImageOpacity: org.watermarkImageOpacity,
        watermarkLayers: org.watermarkLayers || []
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

// PUT /api/organization/integrations - Atualizar integrations
router.put('/organization/integrations', authenticateToken, async (req, res) => {
  try {
    const { salesAutomator, googleAnalytics, metaPixel, deadlineAutomation } = req.body;
    const $set = {};

    if (googleAnalytics && typeof googleAnalytics === 'object') {
      if (typeof googleAnalytics.enabled === 'boolean') {
        $set['integrations.googleAnalytics.enabled'] = googleAnalytics.enabled;
      }
      if (typeof googleAnalytics.measurementId === 'string') {
        $set['integrations.googleAnalytics.measurementId'] = googleAnalytics.measurementId.trim();
      }
    }

    if (metaPixel && typeof metaPixel === 'object') {
      if (typeof metaPixel.enabled === 'boolean') {
        $set['integrations.metaPixel.enabled'] = metaPixel.enabled;
      }
      if (typeof metaPixel.pixelId === 'string') {
        $set['integrations.metaPixel.pixelId'] = metaPixel.pixelId.trim();
      }
    }

    if (deadlineAutomation && typeof deadlineAutomation === 'object') {
      if (typeof deadlineAutomation.enabled === 'boolean') {
        $set['integrations.deadlineAutomation.enabled'] = deadlineAutomation.enabled;
      }
      if (typeof deadlineAutomation.daysWarning === 'number') {
        $set['integrations.deadlineAutomation.daysWarning'] = Math.max(1, Math.min(30, deadlineAutomation.daysWarning));
      }
      if (typeof deadlineAutomation.sendEmail === 'boolean') {
        $set['integrations.deadlineAutomation.sendEmail'] = deadlineAutomation.sendEmail;
      }
      if (typeof deadlineAutomation.messageTemplate === 'string') {
        $set['integrations.deadlineAutomation.messageTemplate'] = deadlineAutomation.messageTemplate.slice(0, 2000);
      }
    }

    if (salesAutomator && typeof salesAutomator === 'object') {
      if (salesAutomator.postDelivery && typeof salesAutomator.postDelivery === 'object') {
        const pd = salesAutomator.postDelivery;
        if (typeof pd.enabled === 'boolean') {
          $set['integrations.salesAutomator.postDelivery.enabled'] = pd.enabled;
        }
        if (Array.isArray(pd.daysSchedule)) {
          $set['integrations.salesAutomator.postDelivery.daysSchedule'] = pd.daysSchedule
            .map(n => Number(n)).filter(n => Number.isFinite(n) && n > 0);
        }
        if (pd.discountByDay && typeof pd.discountByDay === 'object') {
          $set['integrations.salesAutomator.postDelivery.discountByDay'] = _sanitizeDiscountMap(pd.discountByDay);
        }
        if (typeof pd.messageTemplate === 'string') {
          $set['integrations.salesAutomator.postDelivery.messageTemplate'] = pd.messageTemplate.slice(0, 2000);
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
      { returnDocument: 'after', runValidators: true }
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

// GET /api/organization/preferences - Configurações personalizáveis do fotógrafo
router.get('/organization/preferences', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId).select('preferences').lean();
    if (!org) return res.status(404).json({ success: false, error: 'Organizacao nao encontrada' });
    res.json({ success: true, preferences: org.preferences || {} });
  } catch (error) {
    req.logger.error('Erro ao buscar preferences', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/organization/preferences - Atualizar preferências (whitelist + validação por campo)
router.put('/organization/preferences', authenticateToken, async (req, res) => {
  try {
    const { messageTemplates, sessionDefaults, galleryDeliveryDefault, notifications } = req.body;
    const $set = {};

    // Mensagens — strings (limite de tamanho)
    if (messageTemplates && typeof messageTemplates === 'object') {
      for (const key of ['shareEmail', 'shareWhatsApp', 'deliverEmail', 'deliverWhatsApp']) {
        if (typeof messageTemplates[key] === 'string') {
          $set[`preferences.messageTemplates.${key}`] = messageTemplates[key].slice(0, 2000);
        }
      }
    }

    // Padrões de nova sessão
    if (sessionDefaults && typeof sessionDefaults === 'object') {
      if (typeof sessionDefaults.packageLimit === 'number') {
        $set['preferences.sessionDefaults.packageLimit'] = Math.max(1, Math.min(1000, Math.round(sessionDefaults.packageLimit)));
      }
      if (typeof sessionDefaults.extraPhotoPrice === 'number') {
        $set['preferences.sessionDefaults.extraPhotoPrice'] = Math.max(0, Math.min(10000, sessionDefaults.extraPhotoPrice));
      }
      if ([960, 1200, 1400, 1600].includes(sessionDefaults.photoResolution)) {
        $set['preferences.sessionDefaults.photoResolution'] = sessionDefaults.photoResolution;
      }
      if (typeof sessionDefaults.deadlineDays === 'number') {
        $set['preferences.sessionDefaults.deadlineDays'] = Math.max(0, Math.min(365, Math.round(sessionDefaults.deadlineDays)));
      }
      for (const key of ['allowExtraPurchase', 'allowReopen', 'commentsEnabled']) {
        if (typeof sessionDefaults[key] === 'boolean') {
          $set[`preferences.sessionDefaults.${key}`] = sessionDefaults[key];
        }
      }
    }

    // Padrão de entrega da galeria
    if (['ask', 'preview', 'direct'].includes(galleryDeliveryDefault)) {
      $set['preferences.galleryDeliveryDefault'] = galleryDeliveryDefault;
    }

    // Preferências de notificação
    if (notifications && typeof notifications === 'object') {
      for (const key of ['selectionSubmitted', 'extraRequested', 'reopenRequested']) {
        if (typeof notifications[key] === 'boolean') {
          $set[`preferences.notifications.${key}`] = notifications[key];
        }
      }
    }

    if (Object.keys($set).length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum campo válido para atualizar' });
    }

    const org = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { $set },
      { new: true, runValidators: true }
    ).select('preferences').lean();
    if (!org) return res.status(404).json({ success: false, error: 'Organizacao nao encontrada' });

    res.json({ success: true, preferences: org.preferences || {} });
  } catch (error) {
    req.logger.error('Erro ao salvar preferences', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
