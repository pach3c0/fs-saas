const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createCheckoutSession, handleWebhook } = require('../services/stripe');
const Subscription = require('../models/Subscription');
const plans = require('../config/plans');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    res.json({ subscription: sub, planDetails: plans[sub.plan] });
  } catch (error) {
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
    res.status(500).json({ error: error.message });
  }
});

// Webhook do Stripe
router.post('/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    await handleWebhook(event);
    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cancelar assinatura
router.post('/billing/cancel', authenticateToken, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ organizationId: req.user.organizationId });
    if (!sub.stripeSubscriptionId) {
      return res.status(400).json({ error: 'Nenhuma assinatura ativa' });
    }

    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    sub.cancelAtPeriodEnd = true;
    await sub.save();

    res.json({ success: true, message: 'Assinatura será cancelada no final do período' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;