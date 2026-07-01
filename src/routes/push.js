// Rotas de Web Push (VAPID) do painel do fotógrafo.
// O front (admin/js/utils/push.js) registra a subscription do dispositivo aqui; o pushService
// envia os pushes. Tudo autenticado (JWT) e escopado por organizationId.
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const PushSubscription = require('../models/PushSubscription');
const pushService = require('../services/pushService');

// Chave pública VAPID (applicationServerKey) — pública por natureza. null se push desabilitado.
router.get('/push/public-key', authenticateToken, (req, res) => {
  res.json({ publicKey: pushService.getPublicKey(), enabled: pushService.isEnabled() });
});

// Registrar (ou reativar) a subscription deste dispositivo. Upsert por endpoint (chave única).
router.post('/push/subscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint, keys, userAgent } = req.body || {};
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Subscription inválida' });
    }
    await PushSubscription.updateOne(
      { endpoint },
      {
        $set: {
          userId: req.user.userId,
          organizationId: req.user.organizationId,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
          userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 300) : '',
          isActive: true
        }
      },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    req.logger.error('[push] erro ao registrar subscription', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Cancelar a subscription deste dispositivo.
router.post('/push/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'endpoint obrigatório' });
    await PushSubscription.deleteOne({ endpoint, organizationId: req.user.organizationId });
    res.json({ success: true });
  } catch (error) {
    req.logger.error('[push] erro ao cancelar subscription', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Enviar um push de teste para todos os dispositivos da org (botão "Enviar teste").
router.post('/push/test', authenticateToken, async (req, res) => {
  try {
    if (!pushService.isEnabled()) {
      return res.status(503).json({ error: 'Push não está configurado no servidor' });
    }
    const { sent } = await pushService.dispatchToOrg(req.user.organizationId, {
      title: 'Teste ✅',
      body: 'Se você recebeu isto, as notificações no celular estão funcionando.',
      url: '/admin/',
      tag: 'push-test'
    });
    res.json({ success: true, sent });
  } catch (error) {
    req.logger.error('[push] erro ao enviar teste', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Listar dispositivos registrados (para a UI mostrar/remover).
router.get('/push/subscriptions', authenticateToken, async (req, res) => {
  try {
    const subs = await PushSubscription.find({ organizationId: req.user.organizationId })
      .select('endpoint userAgent isActive lastSuccessAt createdAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ subscriptions: subs });
  } catch (error) {
    req.logger.error('[push] erro ao listar subscriptions', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
