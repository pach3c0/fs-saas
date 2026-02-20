const express = require('express');
const router = express.Router();
const LandingData = require('../models/LandingData');
const { authenticateToken } = require('../middleware/auth');
const { requireSuperadmin } = require('../middleware/auth');

// GET público — landing page busca dados aqui
router.get('/landing/config', async (req, res) => {
  try {
    let data = await LandingData.findOne();
    if (!data) {
      data = await LandingData.create({});
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao buscar landing config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT protegido — saas-admin salva dados aqui
router.put('/admin/landing/config', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const payload = req.body;
    const data = await LandingData.findOneAndUpdate(
      {},
      { $set: payload },
      { upsert: true, new: true, runValidators: false }
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao salvar landing config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
