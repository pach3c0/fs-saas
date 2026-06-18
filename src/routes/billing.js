const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createCheckoutSession, handleWebhook } = require('../middleware/mercadopago');
const Subscription = require('../models/Subscription');
const plans = require('../models/plans');
const storage = require('../services/storage');
const paymentConfigured = !!process.env.MERCADOPAGO_ACCESS_TOKEN;

// Listar planos disponíveis
router.get('/billing/plans', async (req, res) => {
  res.json({ plans });
});

// Assinatura atual
router.get('/billing/subscription', authenticateToken, async (req, res) => {
  try {
    let sub = await Subscription.findOne({ organizationId: req.user.organizationId });
    if (!sub) {
      sub = new Subscription({
        organizationId: req.user.organizationId,
        plan: 'free',
        status: 'active'
      });
      await sub.save();
    }
    
    const orgId = req.user.organizationId;
    const toMB = b => Math.round(b / 1024 / 1024 * 100) / 100;
    const [sessionsBytes, siteBytes, videosBytes] = await Promise.all([
      storage.getDirSize(`/${orgId}/sessions`),
      storage.getDirSize(`/${orgId}/site`),
      storage.getDirSize(`/${orgId}/videos`),
    ]);
    const storageBytes = sessionsBytes + siteBytes + videosBytes;
    const storageMB = toMB(storageBytes);

    res.json({
      subscription: sub,
      planDetails: plans[sub.plan],
      stripeConfigured: paymentConfigured,
      usage: {
        storageMB,
        storageBytes,
        breakdown: {
          sessionsMB: toMB(sessionsBytes),
          siteMB: toMB(siteBytes),
          videosMB: toMB(videosBytes)
        }
      }
    });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Criar checkout session (upgrade de plano)
router.post('/billing/checkout', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;
    const url = await createCheckoutSession(req.user.organizationId, plan);
    res.json({ checkoutUrl: url });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Webhook do Mercado Pago
router.post('/billing/webhook', express.json(), async (req, res) => {
  try {
    // No Mercado Pago, os dados podem vir no body ou na query
    await handleWebhook(req.body, req.query);
    res.json({ received: true });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Cancelar assinatura
router.post('/billing/cancel', authenticateToken, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ organizationId: req.user.organizationId });
    if (!sub || sub.plan === 'free') {
      return res.status(400).json({ error: 'Nenhuma assinatura ativa para cancelar' });
    }

    // Como estamos no MP e ainda não armazenamos o preapproval_id no MongoDB, 
    // faremos o downgrade para "free" no final do período no próprio banco de dados
    sub.cancelAtPeriodEnd = true;
    await sub.save();

    res.json({ success: true, message: 'Assinatura cancelada com sucesso. Voltará ao plano Free no próximo ciclo.' });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;