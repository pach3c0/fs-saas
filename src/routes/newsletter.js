const express = require('express');
const router = express.Router();
const Newsletter = require('../models/Newsletter');
const { authenticateToken } = require('../middleware/auth');

router.post('/newsletter/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });
    await Newsletter.create({ email, organizationId: req.organizationId });
    res.json({ success: true });
  } catch (error) {
    // Violação de constraint único (email já cadastrado nessa org)
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email já cadastrado na newsletter' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/newsletter', authenticateToken, async (req, res) => {
  try {
    const list = await Newsletter.find({ organizationId: req.user.organizationId }).sort({ createdAt: -1 });
    res.json({ subscribers: list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/newsletter/:email', authenticateToken, async (req, res) => {
  try {
    await Newsletter.findOneAndDelete({ 
      email: req.params.email, 
      organizationId: req.user.organizationId 
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
