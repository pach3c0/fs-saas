const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');

router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ organizationId: req.user.organizationId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ notifications });
  } catch (error) {
    req.logger.error('Erro ao listar notificações', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      organizationId: req.user.organizationId,
      read: false
    });
    res.json({ count });
  } catch (error) {
    req.logger.error('Erro ao contar notificações não lidas', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { read: true }
    );
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro ao marcar notificação como lida', { id: req.params.id, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/notifications/:id', authenticateToken, async (req, res) => {
  try {
    await Notification.deleteOne({ _id: req.params.id, organizationId: req.user.organizationId });
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro ao deletar notificação', { id: req.params.id, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.put('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { organizationId: req.user.organizationId, read: false },
      { read: true }
    );
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro ao marcar todas notificações como lidas', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Marcar notificação individual como não lida
router.put('/notifications/:id/unread', authenticateToken, async (req, res) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { read: false }
    );
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro ao marcar notificação como não lida', { id: req.params.id, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Excluir todas as notificações da organização
router.delete('/notifications', authenticateToken, async (req, res) => {
  try {
    await Notification.deleteMany({ organizationId: req.user.organizationId });
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro ao deletar todas notificações', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
