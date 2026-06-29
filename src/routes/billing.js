const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createCheckoutSession, handleWebhook, verifyWebhookSignature, cancelPreapproval, getPreapproval,
  refundPayment, revertSubscriptionToFree, markRefundHandled, findRefundablePreapprovalPayment,
  friendlyCheckoutError } = require('../middleware/mercadopago');
const Subscription = require('../models/Subscription');
const Organization = require('../models/Organization');
const User = require('../models/User');
const plans = require('../models/plans');
const storage = require('../services/storage');
const { effectiveStorageMB, effectiveLimits } = require('../services/subscriptionPricing');
const { isProtectedSlug } = require('../utils/protectedOrgs');
const { audit } = require('../utils/auditLogger');
const paymentConfigured = !!process.env.MERCADOPAGO_ACCESS_TOKEN;

// ── Fase 2 — Janela de arrependimento (CDC Art. 49) ──
const REFUND_WINDOW_DAYS = 7;
// O Brasil NÃO tem horário de verão desde 2019 → America/Sao_Paulo é fixo em UTC-3.
const BR_OFFSET_MS = 3 * 60 * 60 * 1000;
// Fim da janela = 23:59:59.999 do 7º dia (fuso BR), contado a partir de subscribedAt. O dia
// inteiro conta (pró-consumidor) — não é o instante cru subscribedAt+7×24h. Back e front usam
// ESTA conta (exposta no GET) pra nunca divergirem por fuso/segundos.
function refundWindowEndsAt(subscribedAt) {
  if (!subscribedAt) return null;
  const t = new Date(subscribedAt).getTime();
  if (isNaN(t)) return null;
  const br = new Date(t - BR_OFFSET_MS);     // mesmo instante com os campos UTC = relógio BR
  br.setUTCHours(0, 0, 0, 0);                 // início do dia BR
  const endBr = br.getTime() + (REFUND_WINDOW_DAYS - 1) * 86400000 + (86400000 - 1);
  return new Date(endBr + BR_OFFSET_MS);      // de volta ao instante UTC real
}

// Elegibilidade de reembolso de uma assinatura. SÓ a 1ª compra (Free→pago) tem reembolso
// integral; "desistir de upgrade" não gera reembolso (modelo sem pró-rata) — é trocar pro plano
// de baixo no fluxo normal. protegida/override são filtradas aqui pela UI (override cobre as reais
// curadas); o POST /billing/refund reconfere com isProtectedSlug + cortesia (defesa em profundidade).
function refundEligibility(sub) {
  const isFirstPurchase = !sub.previousPlan || sub.previousPlan === 'free';
  const paid = !!sub.plan && sub.plan !== 'free';
  const endsAt = refundWindowEndsAt(sub.subscribedAt);
  const withinWindow = !!endsAt && Date.now() <= endsAt.getTime();
  const notBlocked = !sub.isCourtesy && !sub.overrideEnabled;
  return {
    kind: isFirstPurchase ? 'first_purchase' : 'upgrade',
    refundWindowEndsAt: endsAt,
    canRefund: paid && isFirstPurchase && withinWindow && notBlocked && sub.status === 'active'
  };
}

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
      // Elegibilidade de reembolso de arrependimento (CDC) — a aba Plano usa pra mostrar
      // "Cancelar e reembolsar" só dentro da janela de 7 dias e só na 1ª compra.
      refund: refundEligibility(sub),
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
    const { plan, cardTokenId, payerEmail, identificationType, identificationNumber,
      recurringConsent, consentAmountCents } = req.body;
    // CDC Art. 39 III: cobrança recorrente no cartão exige aceite explícito do titular.
    // Só o checkout de cartão novo (cardTokenId presente) passa por aqui; a troca de plano de
    // assinante ativo reaproveita o cartão+aceite originais (sem cardTokenId) e o fluxo hospedado
    // tem o aceite na própria tela do Mercado Pago.
    if (cardTokenId && recurringConsent !== true) {
      return res.status(400).json({ error: 'É necessário autorizar a cobrança automática mensal para assinar.' });
    }
    const paymentData = cardTokenId
      ? { cardTokenId, payerEmail, identificationType, identificationNumber }
      : null;
    const result = await createCheckoutSession(req.user.organizationId, plan, paymentData);
    // Registro permanente do aceite de recorrência (CDC) — só na assinatura nova com cartão.
    if (cardTokenId) {
      const cents = Number(consentAmountCents);
      audit(req, 'recurring_consent', req.user.organizationId, {
        plan,
        amountCents: Number.isFinite(cents) && cents > 0 ? Math.round(cents) : (plans[plan]?.price ?? null),
        source: 'cardform'
      });
    }
    res.json(result);
  } catch (error) {
    // Recusa de cartão pelo MP → 402 com mensagem CLARA pro cliente (nunca "Erro interno do
    // servidor" pra um CVV errado). O raw fica só no log p/ ops. Demais erros → 500 genérico.
    const friendly = friendlyCheckoutError(error);
    if (friendly) {
      req.logger.warn('[billing-checkout] cartão recusado pelo MP', { mpError: error?.message, orgId: String(req.user.organizationId) });
      return res.status(402).json({ error: friendly, code: 'card_rejected' });
    }
    req.logger.error('[billing-checkout] erro interno', { error: error?.message });
    res.status(500).json({ error: 'Não foi possível processar o pagamento agora. Tente novamente em alguns instantes.' });
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
      // Fim do ciclo já pago = próxima data de cobrança da PreApproval. Lê ANTES de cancelar
      // (best-effort: se falhar, currentPeriodEnd não muda → acesso segue até downgrade manual).
      try {
        const pa = await getPreapproval(sub.mpPreapprovalId);
        const nextPay = pa?.next_payment_date ? new Date(pa.next_payment_date) : null;
        if (nextPay && !isNaN(nextPay.getTime())) sub.currentPeriodEnd = nextPay;
      } catch (e) {
        req.logger.warn('[billing] não foi possível ler next_payment_date no cancelamento', { error: e.message });
      }
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
    // currentPeriodEnd (next_payment_date do MP) gravado acima quando disponível; o
    // subscriptionPeriodChecker rebaixa pro Free ao vencer o ciclo. Sem a data (GET falhou) o
    // acesso segue até downgrade manual — erra a favor do cliente.

    res.json({ success: true, message: 'Assinatura cancelada — não haverá novas cobranças. Seu acesso ao plano atual continua ativo.' });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Cancelar E REEMBOLSAR (arrependimento ≤ 7 dias, CDC Art. 49) — único fluxo que dispara um
// refund REAL no MP. Vale só pra 1ª compra (Free→pago): desistir de UPGRADE não gera reembolso
// (modelo sem pró-rata — é trocar pro plano de baixo no fluxo normal). Reusa a MESMA máquina do
// estorno (revertSubscriptionToFree) + acopla o congelamento comercial (freeze).
router.post('/billing/refund', authenticateToken, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ organizationId: req.user.organizationId });
    if (!sub || sub.plan === 'free') {
      return res.status(400).json({ error: 'Nenhuma assinatura paga para reembolsar' });
    }

    // Guards de blindagem ANTES de tocar o MP (defesa em profundidade: o refund roda ANTES do
    // revert re-blindar). Espelham revertSubscriptionToFree — Flávia/Davi/dono nunca passam.
    if (sub.isCourtesy)     return res.status(403).json({ error: 'Conta cortesia não tem cobrança a reembolsar.' });
    if (sub.overrideEnabled) return res.status(403).json({ error: 'Conta com plano personalizado — reembolso pelo suporte.' });
    const org = await Organization.findById(sub.organizationId).select('slug').lean();
    if (org && isProtectedSlug(org.slug)) return res.status(403).json({ error: 'Conta protegida não passa por reembolso automático.' });

    const elig = refundEligibility(sub);
    if (elig.kind !== 'first_purchase') {
      return res.status(422).json({ error: 'Reembolso integral vale só para a primeira assinatura. Para desfazer um upgrade, troque para o plano anterior.' });
    }
    if (!elig.canRefund) {
      return res.status(422).json({ error: 'Fora da janela de arrependimento de 7 dias.', refundWindowEndsAt: elig.refundWindowEndsAt });
    }

    // Gate de AMBIENTE: nunca dispara refund real com token de teste / cobrança desligada / sandbox.
    const prodToken = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').startsWith('APP_USR-');
    const live = process.env.MP_USE_PREAPPROVAL === 'true' && prodToken && !process.env.MP_TEST_PAYER_EMAIL;

    // Lock ATÔMICO de reembolso (não TOCTOU): aquisição condicional no banco. Dois POST concorrentes
    // (duplo-clique/retry) — só um seta refundInFlight; o outro recebe 409. A trava é LIBERADA no
    // finally se o refund NÃO concluir, pra uma falha transiente não prender o cliente fora do
    // reembolso (CDC Art. 49). No sucesso o revert já zera refundInFlight (reescrever false é inócuo).
    const acq = await Subscription.updateOne(
      { _id: sub._id, refundInFlight: { $ne: true } },
      { $set: { refundInFlight: true } }
    );
    if ((acq.modifiedCount ?? acq.nModified ?? 0) !== 1) {
      return res.status(409).json({ error: 'Reembolso já em processamento.' });
    }

    let refundConcluido = false;
    try {
      let payId = sub.firstPaymentId; // captura ANTES do revert (que zera o campo)

      // Fecha o intervalo cobrar→cancelar: a 1ª fatura pode ter sido cobrada SEM o webhook
      // authorized_payment ter gravado o firstPaymentId ainda (corrida de poucos segundos). Em
      // ambiente live, busca no MP a fatura REAL desta org — validando VALOR (= o da PreApproval)
      // e identidade via GET autoritativo — e usa esse id pra estornar AUTOMÁTICO em vez de deixar
      // dinheiro de verdade preso. Falha aqui (rede / não-confirmado) degrada pro manual.
      let buscaFalhou = false;
      if (live && !payId && sub.mpPreapprovalId) {
        try {
          const pa = await getPreapproval(sub.mpPreapprovalId);
          const expected = pa?.auto_recurring?.transaction_amount;
          const found = await findRefundablePreapprovalPayment(sub.organizationId, expected, sub.refundedPaymentIds);
          if (found) {
            payId = found;
            req.logger.warn('[billing-refund] fatura localizada no MP via busca (firstPaymentId ausente)', { orgId: String(sub.organizationId), payId });
          }
        } catch (e) {
          buscaFalhou = true;
          req.logger.warn('[billing-refund] busca de fatura no MP falhou — caindo no manual', { error: e.message });
        }
      }

      // Degradação graciosa: sem o payment.id da 1ª fatura (checkout hospedado, nada cobrado de fato,
      // ou busca não confirmou) ou fora do ambiente live → cancela a recorrência (sem cobranças
      // futuras) + congela, e marca o refund pra processamento MANUAL no painel MP. Não trava o cliente.
      if (!payId || !live) {
        if (sub.mpPreapprovalId) {
          try { await cancelPreapproval(sub.mpPreapprovalId); }
          catch (e) { req.logger.warn('[billing-refund] cancel da recorrência falhou', { error: e.message }); }
        }
        await revertSubscriptionToFree(sub, { reason: 'first_purchase_refund_manual', freeze: true });
        // Conciliação: distingue dinheiro PROVAVELMENTE preso (live + tinha recorrência, mas a busca
        // não confirmou a fatura) de "nada cobrado" — o operador precisa estornar à mão no painel MP
        // dentro do prazo CDC. Loga alto só no caso que exige ação humana.
        const reason = !live ? 'test_env' : (buscaFalhou ? 'search_failed' : 'no_first_payment_id');
        if (live && sub.mpPreapprovalId) {
          req.logger.warn('[billing-refund] MANUAL — possível R$ preso: estornar no painel MP dentro do prazo CDC', { orgId: String(sub.organizationId), reason });
        }
        audit(req, 'refund_manual_pending', sub.organizationId, { reason, firstPaymentId: payId || null });
        return res.json({ success: true, manual: true, message: 'Assinatura cancelada. O reembolso será processado em até alguns dias úteis.' });
      }

      // Caminho real: dispara refund TOTAL idempotente; grava o payment.id IMEDIATAMENTE (antes do
      // revert) pra que o eco do webhook 'refunded' ache no-op mesmo se o revert falhar; reverte pro
      // Free + congela. idemKey determinística → retry nunca devolve em dobro (CDC Art. 42).
      const idemKey = `refund-${sub._id}-${payId}-full`;
      await refundPayment(payId, idemKey);
      await markRefundHandled(sub._id, payId);
      await revertSubscriptionToFree(sub, { reason: 'first_purchase_refund', freeze: true });
      refundConcluido = true;
      audit(req, 'refund_issued', sub.organizationId, { paymentId: payId, fromPlan: sub.plan });
      req.logger.warn('[billing-refund] refund integral emitido', { orgId: String(sub.organizationId), payId });
      return res.json({ success: true, message: 'Reembolso solicitado. O valor volta para o seu cartão pelo Mercado Pago e sua conta voltou ao plano gratuito.' });
    } finally {
      // Libera a trava se o refund NÃO concluiu (falha transiente) → permite nova tentativa.
      // A idempotência segue protegida pela idemKey determinística + refundedPaymentIds.
      if (!refundConcluido) {
        await Subscription.updateOne({ _id: sub._id }, { $set: { refundInFlight: false } }).catch(() => {});
      }
    }
  } catch (error) {
    req.logger.error('[billing-refund] erro', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
// Exportados p/ teste (harness E2E) — não alteram o comportamento do router.
module.exports.refundEligibility = refundEligibility;
module.exports.refundWindowEndsAt = refundWindowEndsAt;