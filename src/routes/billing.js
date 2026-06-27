const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createCheckoutSession, handleWebhook, verifyWebhookSignature, cancelPreapproval } = require('../middleware/mercadopago');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
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
    // E-mail do usuário logado → pré-preenchido (e travado) no CardForm como payer_email,
    // pra não pedir e-mail ao fotógrafo (evita confusão "que e-mail eu ponho?").
    const loggedUser = await User.findById(req.user.userId).select('email').lean();
    const toMB = b => Math.round(b / 1024 / 1024 * 100) / 100;
    // Fonte única da fórmula de storage (ver storage.getOrgStorageBytes).
    const { sessions: sessionsBytes, site: siteBytes, videos: videosBytes, total: storageBytes } =
      await storage.getOrgStorageBytes(orgId);
    const storageMB = toMB(storageBytes);

    res.json({
      subscription: sub,
      planDetails: plans[sub.plan],
      stripeConfigured: paymentConfigured,
      // Public Key do MP (segura no browser) — presença habilita o CardForm in-page.
      // Ausente → front cai no checkout hospedado legado (redirect).
      mpPublicKey: process.env.MERCADOPAGO_PUBLIC_KEY || null,
      // E-mail do pagador (= usuário logado) pro CardForm preencher sozinho e travar.
      ownerEmail: loggedUser?.email || null,
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
// Dois modos: com `cardTokenId` (CardForm, cartão tokenizado no browser → assinatura
// authorized sem conta MP) ou sem ele (fluxo hospedado legado → devolve checkoutUrl).
router.post('/billing/checkout', authenticateToken, async (req, res) => {
  try {
    const { plan, cardTokenId, payerEmail, identificationType, identificationNumber } = req.body;
    const paymentData = cardTokenId
      ? { cardTokenId, payerEmail, identificationType, identificationNumber }
      : null;
    const result = await createCheckoutSession(req.user.organizationId, plan, paymentData);
    res.json(result);
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

    // Cancelamento VOLUNTÁRIO do fotógrafo (resilição). Mata a recorrência no MP, mas
    // MANTÉM o acesso até o fim do ciclo já pago — CDC: cancelamento após 7 dias não dá
    // reembolso retroativo. NÃO rebaixa o plano aqui (isso é só pro ESTORNO, via webhook
    // revertSubscriptionToFree). O cancelamento no MP dispara o webhook subscription_preapproval
    // (cancelled), que confirma status=canceled + cancelAtPeriodEnd de forma idempotente.
    if (sub.mpPreapprovalId) {
      try {
        await cancelPreapproval(sub.mpPreapprovalId);
        sub.status = 'canceled';
      } catch (e) {
        // Distingue erro DEFINITIVO (já cancelada/inexistente) de TRANSIENTE (5xx/timeout).
        // Transiente: agenda retry no graceChecker (mpCancelPending), senão a recorrência seguiria
        // viva cobrando mesmo o fotógrafo tendo clicado cancelar. Espelha o revert por estorno.
        const code = e?.status || e?.statusCode || e?.cause?.status || e?.response?.status;
        const definitive = code === 400 || code === 404 ||
          /already.*cancel|not.*found|cancelad|does not exist/i.test(e?.message || '');
        if (definitive) {
          sub.status = 'canceled'; // já estava cancelada no MP
        } else {
          sub.mpCancelPending = true; // graceChecker.retryPendingCancellations re-tenta
          req.logger.error('[billing] cancel voluntário falhou (transiente) — retry agendado', { error: e.message });
        }
      }
    }
    sub.cancelAtPeriodEnd = true;
    await sub.save();
    // TODO Fase 2: gravar currentPeriodEnd (next_payment_date do MP) + scheduler que rebaixa pro
    // Free ao vencer o ciclo. Hoje o acesso permanece até downgrade manual (erra a favor do cliente).

    res.json({ success: true, message: 'Assinatura cancelada — não haverá novas cobranças. Seu acesso ao plano atual continua ativo.' });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;