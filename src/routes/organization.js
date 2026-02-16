const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Organization = require('../models/Organization');

// GET /api/organization/profile - Dados do perfil da organizacao
router.get('/organization/profile', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
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
        plan: org.plan
      }
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/organization/profile - Atualizar perfil da organizacao
router.put('/organization/profile', authenticateToken, async (req, res) => {
  try {
    const allowedFields = [
      'name', 'logo', 'phone', 'whatsapp', 'email', 'website',
      'bio', 'address', 'city', 'state', 'primaryColor',
      'watermarkType', 'watermarkText', 'watermarkOpacity'
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
    console.error('Erro ao atualizar perfil:', error);
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
    console.error('Erro ao buscar dados publicos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
