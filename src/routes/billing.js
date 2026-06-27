const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createCheckoutSession, handleWebhook, verifyWebhookSignature, cancelPreapproval } = require('../middleware/mercadopago');
const Subscription = require('../models/Subscription');
const plans = require('../models/plans');
const storage = require('../services/storage');
const { effectiveStorageMB, effectiveLimits } = require('../services/subscriptionPricing');
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
    // Fonte única da fórmula de storage (ver storage.getOrgStorageBytes).
    const { sessions: sessionsBytes, site: siteBytes, videos: videosBytes, total: storageBytes } =
      await storage.getOrgStorageBytes(orgId);
    const storageMB = toMB(storageBytes);

    res.json({
      subscription: sub,
      planDetails: plans[sub.plan],
      stripeConfigured: paymentConfigured,
      // Limites EFETIVOS (derivam de plans.js sem override) — a UI usa estes, não o
      // sub.limits gravado, que pode estar defasado (ex.: Free velho 500MB/5/100).
      limits: effectiveLimits(sub),
      // Limite efetivo de storage (base do plano/override + adicional recorrente).
      maxStorageMB: effectiveStorageMB(sub),
      storageAddon: { gb: sub.storageAddonGB || 0, priceCents: sub.storageAddonPriceCents || 0 },
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
    // Segurança: valida a assinatura HMAC do Mercado Pago (header x-signature) antes de
    // confiar no evento. Sem MP_WEBHOOK_SECRET no .env NÃO bloqueia (só avisa) — o código
    // sobe inerte e passa a exigir assinatura assim que o segredo for setado em prod.
    const sig = verifyWebhookSignature({ headers: req.headers, query: req.query });
    if (!sig.ok) {
      req.logger.warn('Webhook MP rejeitado: assinatura inválida', { reason: sig.reason });
      return res.status(401).json({ error: 'invalid signature' });
    }
    if (!sig.enforced) {
      req.logger.warn('Webhook MP: MP_WEBHOOK_SECRET ausente — verificação de assinatura DESLIGADA');
    }
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

    // Se temos o id da assinatura no MP, cancelamos de fato lá; senão, marcamos
    // para downgrade no fim do período no próprio banco (fallback).
    if (sub.mpPreapprovalId) {
      await cancelPreapproval(sub.mpPreapprovalId);
      sub.status = 'canceled';
    } else {
      sub.cancelAtPeriodEnd = true;
    }
    await sub.save();

    res.json({ success: true, message: 'Assinatura cancelada com sucesso. Voltará ao plano Free no próximo ciclo.' });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;