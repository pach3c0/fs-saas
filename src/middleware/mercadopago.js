const { MercadoPagoConfig, Preference, Payment, PreApprovalPlan, PreApproval } = require('mercadopago');
const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const Organization = require('../models/Organization');
const User = require('../models/User');
const Session = require('../models/Session');
const Notification = require('../models/Notification');
const plans = require('../models/plans');
const { effectiveMonthlyCents } = require('../services/subscriptionPricing');
const { isProtectedSlug } = require('../utils/protectedOrgs');
const { auditSystem } = require('../utils/auditLogger');
const logger = require('../utils/logger');

// Mapa de status MP → enum interno da Subscription.
// Necessário porque: (a) MP usa 'cancelled' (2 l) mas nosso enum é 'canceled';
// (b) 'paused' (inadimplente) vira 'past_due'; (c) garante que status desconhecidos
// não quebrem a validação do Mongoose com ValidationError.
const MP_STATUS_MAP = {
  authorized: 'active',
  paused:     'past_due',
  cancelled:  'canceled',
  pending:    'pending',
};
function normalizeMpStatus(s) {
  return MP_STATUS_MAP[s] || 'past_due';
}

// Extrai o plano a partir do campo `reason` da PreApproval (fallback quando pendingPlan
// não foi gravado no checkout). Cobre os 4 planos pagos em qualquer capitalização.
function parsePlanFromReason(reason = '') {
  const r = reason.toLowerCase();
  if (r.includes('studio')) return 'studio';
  if (r.includes('pro'))    return 'pro';
  if (r.includes('basic'))  return 'basic';
  return null;
}

// Configuração do Client do Mercado Pago (SDK v2)
const client = process.env.MERCADOPAGO_ACCESS_TOKEN
    ? new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN })
    : null;

async function createCheckoutSession(organizationId, planName, paymentData = null) {
    if (!client) {
        throw new Error('Mercado Pago não configurado. Adicione MERCADOPAGO_ACCESS_TOKEN no .env');
    }

    const plan = plans[planName];
    if (!plan || plan.price === 0) {
        throw new Error('Plano inválido');
    }

    // Cartão tokenizado (CardForm) só existe no caminho PreApproval avulsa. No caminho legado
    // (PreApprovalPlan, flag off) não há como autorizar com card_token → erro explícito em vez
    // de cair silenciosamente no fluxo hospedado.
    const cardTokenId = paymentData?.cardTokenId || null;
    if (cardTokenId && process.env.MP_USE_PREAPPROVAL !== 'true') {
        throw new Error('Checkout com cartão indisponível (MP_USE_PREAPPROVAL desligado).');
    }

    let sub = await Subscription.findOne({ organizationId });
    if (!sub) sub = new Subscription({ organizationId, plan: 'free' });
    sub.pendingPlan = planName;
    // Registra o plano ANTES da troca (reservado p/ Fase 2 — reverter pro plano anterior).
    sub.previousPlan = sub.plan;
    // Novo checkout = re-assinatura EXPLÍCITA → libera a ativação (zera a marca anti-ressurreição
    // de um estorno anterior). Sem isto, o webHook 'authorized' da nova assinatura seria ignorado.
    sub.revertedAt = null;
    // Re-assinatura também ZERA o estado de reembolso/congelamento da assinatura anterior: a nova
    // assinatura captura a sua própria 1ª fatura (firstPaymentId) e o congelamento comercial
    // (storageFrozen) é levantado porque o cliente voltou a pagar.
    sub.firstPaymentId = null;
    sub.refundInFlight = false;
    sub.storageFrozen = false;
    // Invariante: uma sub que inicia novo checkout NUNCA carrega cancel pendente de uma assinatura
    // anterior. Sem isto, se um estorno deixou mpCancelPending=true (cancel transiente) e o cliente
    // re-assina antes da varredura, o graceChecker cancelaria a assinatura NOVA e paga (id vivo).
    sub.mpCancelPending = false;
    const cents = effectiveMonthlyCents({ ...sub.toObject(), plan: planName });
    const priceAmount = cents / 100;

    const backUrl = process.env.BASE_URL.includes('localhost')
        ? 'https://app.cliquezoom.com.br/admin?payment=success'
        : `${process.env.BASE_URL}/admin?payment=success`;

    if (process.env.MP_USE_PREAPPROVAL !== 'true') {
        // Caminho legado: PreApprovalPlan (valor fixo atrelado ao plano).
        const planObj = new PreApprovalPlan(client);
        const response = await planObj.create({
            body: {
                reason: `Plano ${planName} - CliqueZoom`,
                auto_recurring: {
                    frequency: 1,
                    frequency_type: 'months',
                    transaction_amount: priceAmount,
                    currency_id: 'BRL'
                },
                back_url: backUrl,
                external_reference: organizationId.toString()
            }
        });
        await sub.save();
        return { mode: 'redirect', checkoutUrl: response.init_point };
    }

    // ── TROCA DE PLANO numa assinatura VIVA E ATIVA → update(), NÃO cancel+create ──
    // Decisão 2026-06-28 (SEM pró-rata): quem já paga e troca de plano tem o valor da
    // recorrência AJUSTADO na PreApproval existente — o MP mantém o next_payment_date e
    // honra o novo valor a partir do PRÓXIMO ciclo (provado no sandbox 2026-06-27). As
    // features do plano novo são liberadas na hora; NÃO há cobrança avulsa agora.
    // Conserta a ARMADILHA do cancel+create (linhas abaixo): em sub paga ele cobrava o
    // plano novo CHEIO por cima do antigo já pago (double-charge) ou, se o cliente
    // abandonasse o checkout, deixava a org sem assinatura nenhuma. Aqui não usamos
    // card_token: o cartão já está atrelado à assinatura viva.
    // Limitação conhecida (Fase 2): no DOWNGRADE os limites caem na hora em vez de só no
    // fim do ciclo já pago — falta o scheduler de fim de ciclo (billing.js:145). NÃO é
    // regressão: o caminho atual com card_token (linha ~155) também rebaixa na hora.
    if (sub.mpPreapprovalId && sub.status === 'active') {
        // Cortesia NUNCA é cobrada (invariante por construção, espelha syncPreapprovalAmount:759).
        // Inalcançável pela UI hoje — conta cortesia é roteada ao suporte (cortesiaUpgradeBtn),
        // não ao checkout — mas é defesa-em-profundidade contra chamada programática: sem isto,
        // uma cortesia com PreApproval viva teria o valor ajustado e passaria a ser cobrada.
        // Encerrar a cortesia (isCourtesy=false) é pré-requisito explícito para cobrar.
        if (sub.isCourtesy) {
            throw new Error('Conta cortesia não passa por checkout automático. Encerre a cortesia antes de cobrar.');
        }
        const oldCents = effectiveMonthlyCents(sub.toObject()); // sub.plan ainda é o ANTIGO aqui
        // 1) Ajusta o valor no MP ANTES de mexer no local: se o MP recusar, aborta sem drift.
        await updatePreapprovalAmount(sub.mpPreapprovalId, cents);
        // 2) Reflete o plano novo localmente (features liberadas já; respeita override de limites).
        sub.plan = planName;
        sub.pendingPlan = null;
        if (!sub.overrideEnabled && plans[planName]?.limits) sub.limits = plans[planName].limits;
        try {
            await sub.save();
        } catch (err) {
            // Save local falhou após o update() no MP → tenta voltar o valor no MP p/ não
            // cobrar o novo valor sem o plano refletido (evita drift). Best-effort.
            try { await updatePreapprovalAmount(sub.mpPreapprovalId, oldCents); } catch (_) {}
            throw err;
        }
        // Espelha no Organization.plan (campo de display que a lista do SaaS Admin lê).
        await Organization.updateOne({ _id: organizationId }, { $set: { plan: planName } });
        return { mode: 'updated', status: 'active', plan: planName, preapprovalId: sub.mpPreapprovalId };
    }

    // Novo caminho (MP_USE_PREAPPROVAL=1): PreApproval avulsa por org.
    // Sem preapproval_plan_id → valor mutável via update(); destrava storage-addon e preço custom.
    // payer_email vem do User dono da org (não Organization.email, que pode estar vazio).
    const org = await Organization.findById(organizationId).lean();
    const owner = org?.ownerId ? await User.findById(org.ownerId).lean() : null;
    // Override de teste (sandbox): MP_TEST_PAYER_EMAIL força o pagador p/ uma conta de
    // teste compradora do MP, sem alterar o e-mail (login) do dono. Em produção a env
    // não existe → usa owner.email normalmente.
    // CardForm: o e-mail vem do formulário (identificador do pagador — NÃO exige conta MP).
    // Fluxo hospedado legado: cai no override de teste (sandbox) ou no e-mail do dono.
    const payerEmail = (paymentData && paymentData.payerEmail) || process.env.MP_TEST_PAYER_EMAIL || owner?.email;
    if (!payerEmail) throw new Error('E-mail do dono não encontrado para criar assinatura MP');

    // Dedupe: cancela PreApproval anterior desta org antes de criar nova.
    // NOTA: a troca de plano numa assinatura VIVA E ATIVA já foi tratada acima via
    // updatePreapprovalAmount (update, não cancel+create) — então aqui só chegam subs
    // NÃO-ativas (ex.: pending que nunca autorizou, ou id órfão de um checkout abandonado).
    // Nesses casos não há cobrança viva a duplicar, então cancelar a antiga e criar nova
    // é seguro e desejável (limpa o resíduo no MP).
    if (sub.mpPreapprovalId) {
        try {
            const paOld = new PreApproval(client);
            await paOld.update({ id: sub.mpPreapprovalId, body: { status: 'cancelled' } });
        } catch (_) { /* prossegue mesmo se o cancel falhar (sub pode já não existir no MP) */ }
        sub.mpPreapprovalId = null;
    }

    // CardForm (cartão tokenizado) → a assinatura nasce AUTHORIZED, sem redirect nem conta MP.
    // Sem token → fluxo hospedado legado (status pending + init_point p/ o cliente logar no MP).
    const body = {
        reason: `Plano ${planName} - CliqueZoom`,
        payer_email: payerEmail,
        auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: priceAmount,
            currency_id: 'BRL'
        },
        back_url: backUrl,
        external_reference: organizationId.toString(),
        status: cardTokenId ? 'authorized' : 'pending'
    };
    // card_token_id é uso único (expira em 7 dias) e já carrega os dados do cartão. O CPF
    // coletado no form serve só p/ a tokenização no browser — NÃO é reenviado aqui.
    if (cardTokenId) body.card_token_id = cardTokenId;

    const pa = new PreApproval(client);
    const response = await pa.create({ body });

    // Grava o id já no checkout (não espera o webhook) para que cancel e update funcionem
    // imediatamente, sem depender de o usuário completar o pagamento primeiro.
    sub.mpPreapprovalId = response.id;
    if (cardTokenId) {
        // Assinatura já autorizada: reflete plano/status localmente sem esperar o webhook
        // (que chega em seguida e reconfirma, idempotente). Cartão em análise → fica pending.
        sub.plan = planName;
        sub.status = normalizeMpStatus(response.status);
        sub.pendingPlan = null;
        // Marca o início da assinatura paga (base do D+7 do CDC) quando já nasce ativa.
        if (sub.status === 'active') sub.subscribedAt = new Date();
        if (!sub.overrideEnabled && plans[planName]?.limits) sub.limits = plans[planName].limits;
    }
    try {
        await sub.save();
    } catch (err) {
        // Compensating cancel: desfaz a PreApproval recém-criada para não ficar órfã no MP.
        try { await pa.update({ id: response.id, body: { status: 'cancelled' } }); } catch (_) {}
        throw err;
    }

    // Espelha o plano no Organization.plan (campo denormalizado que a lista do SaaS Admin e o
    // contador "orgs por plano" leem). O Subscription é a fonte da verdade do enforcement; sem
    // esta sincronização a org pagante apareceria "free" no painel admin (drift de display).
    if (cardTokenId && sub.status === 'active') {
        await Organization.updateOne({ _id: organizationId }, { $set: { plan: planName } });
    }

    if (cardTokenId) {
        return { mode: 'authorized', status: normalizeMpStatus(response.status), preapprovalId: response.id };
    }
    return { mode: 'redirect', checkoutUrl: response.init_point };
}

// Verifica a assinatura HMAC-SHA256 do webhook do Mercado Pago.
// O MP assina cada notificação no header `x-signature` (formato `ts=<unix>,v1=<hash>`).
// O manifesto assinado é exatamente: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
// onde data.id vem da query (lowercase se alfanumérico) e x-request-id do header.
// Gate de rollout: SEM `MP_WEBHOOK_SECRET` no .env → retorna { ok:true, enforced:false }
// (não bloqueia, só permite avisar no log). Assim o código sobe inerte e passa a EXIGIR
// assinatura no instante em que o segredo for configurado em produção (fail-closed daí).
function verifyWebhookSignature({ headers = {}, query = {} } = {}) {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) return { ok: true, enforced: false };

    const xSignature = headers['x-signature'];
    const xRequestId = headers['x-request-id'];
    if (!xSignature) return { ok: false, enforced: true, reason: 'sem header x-signature' };

    // Extrai ts e v1 de `ts=...,v1=...`
    let ts, v1;
    for (const part of String(xSignature).split(',')) {
        const idx = part.indexOf('=');
        if (idx === -1) continue;
        const key = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (key === 'ts') ts = value;
        else if (key === 'v1') v1 = value;
    }
    if (!ts || !v1) return { ok: false, enforced: true, reason: 'x-signature sem ts/v1' };

    const rawId = query['data.id'] != null ? query['data.id'] : query.id;
    const dataId = rawId != null ? String(rawId).toLowerCase() : '';

    const manifest = `id:${dataId};request-id:${xRequestId || ''};ts:${ts};`;
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    // Comparação em tempo constante; tamanhos diferentes já reprovam.
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(String(v1), 'hex');
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    return ok ? { ok: true, enforced: true } : { ok: false, enforced: true, reason: 'hash não confere' };
}

async function handleWebhook(eventBody, eventQuery) {
    try {
        // O Mercado Pago envia notificações via POST. Dependendo de como você configurar,
        // o ID vem no body ou na query string (topic=payment&id=123)
        const paymentId = eventBody?.data?.id || eventQuery?.id;
        const type = eventBody?.type || eventQuery?.topic;

        // --- MANIPULAÇÃO DE ASSINATURAS (SUBSCRIPTIONS) ---
        if (type === 'subscription_preapproval' && paymentId) {
            // eventBody.id = ID da notificação (único por envio — usado p/ idempotência).
            // paymentId    = ID da PreApproval (entidade MP buscada na API).
            const eventId = eventBody?.id ? String(eventBody.id) : null;

            const preApproval = new PreApproval(client);
            const subscriptionData = await preApproval.get({ id: paymentId });

            const orgId = subscriptionData.external_reference;
            const mpStatus = subscriptionData.status;

            if (orgId && mpStatus) {
                let sub = await Subscription.findOne({ organizationId: orgId });
                if (!sub) sub = new Subscription({ organizationId: orgId, plan: 'free' });

                // Idempotência: descarta reenvios do mesmo evento (retry automático do MP).
                if (eventId && sub.lastEventId === eventId) return;

                const internalStatus = normalizeMpStatus(mpStatus);

                if (internalStatus === 'canceled') {
                    // Assinatura CANCELADA no MP (cliente cancelou no app, cancelamento automático
                    // após 3 falhas, ou o painel cancelou junto de um estorno). A recorrência morre.
                    // NÃO rebaixa o plano aqui: cancelamento simples (CDC > 7 dias) mantém o acesso
                    // até o fim do ciclo já pago. A REMOÇÃO de acesso por ESTORNO (dinheiro devolvido)
                    // é feita pelos branches de pagamento estornado → revertSubscriptionToFree.
                    sub.status = 'canceled';
                    sub.cancelAtPeriodEnd = true;
                    sub.pendingPlan = null;
                    if (eventId) sub.lastEventId = eventId;
                    await sub.save();
                    return;
                }

                // Guarda anti-RESSURREIÇÃO: sub já revertida por estorno (revertedAt) e SEM novo
                // checkout (que limpa revertedAt) → um 'authorized' atrasado/reenviado NÃO reativa o
                // plano pago (recobrar pós-estorno violaria o CDC Art. 42). Re-assinatura legítima
                // passa pelo checkout, que zera revertedAt.
                if (internalStatus === 'active' && sub.revertedAt) {
                    logger.warn(`[billing] ativação ignorada: sub revertida por estorno sem novo checkout org=${orgId}`,
                        { orgId: String(orgId) });
                    if (eventId) await Subscription.updateOne({ _id: sub._id }, { $set: { lastEventId: eventId } });
                    return;
                }

                // authorized → active | paused → past_due: ativa/atualiza o plano.
                // Mapeia o plano: pendingPlan (gravado no checkout) > reason > fallback 'basic'.
                const planName = sub.pendingPlan
                    || parsePlanFromReason(subscriptionData.reason)
                    || 'basic';

                sub.plan = planName;
                sub.status = internalStatus;
                sub.mpPreapprovalId = subscriptionData.id || paymentId;
                sub.pendingPlan = null;
                if (internalStatus === 'active') {
                    // Marca o início da assinatura paga (base do D+7 do CDC) na 1ª ativação.
                    if (!sub.subscribedAt) sub.subscribedAt = new Date();
                    // Pagou/ativou → regulariza: limpa carência (senão o graceChecker suspende depois).
                    sub.graceUntil = null;
                    sub.graceWarnedAt = null;
                }
                // Só grava quando há eventId (notificação webhook v2). Evento via IPN/query
                // não tem id → NÃO sobrescreve o lastEventId anterior com null (senão perderia
                // a proteção de idempotência no próximo reenvio).
                if (eventId) sub.lastEventId = eventId;
                // Só aplica os limites do plano base quando NÃO há override custom
                // (senão apagaria os limites personalizados da org). customPriceCents é preservado.
                if (!sub.overrideEnabled && plans[planName]?.limits) {
                    sub.limits = plans[planName].limits;
                }
                await sub.save();
                // Espelha o plano no Organization.plan (denormalizado p/ a lista do SaaS Admin).
                if (internalStatus === 'active') {
                    await Organization.updateOne({ _id: orgId }, { $set: { plan: planName } });
                }
            }
            return; // Webhook tratado
        }

        // --- FATURAS RECORRENTES DA ASSINATURA (F4) ---
        // Cada cobrança mensal de uma PreApproval viva chega como 'subscription_authorized_payment'
        // (paymentId = id do authorized_payment). Confirma pagamento (active) ou marca inadimplência
        // (past_due). Não há classe no SDK v2 → busca via API crua. Idempotência dedicada.
        if (type === 'subscription_authorized_payment' && paymentId) {
            const eventId = eventBody?.id ? String(eventBody.id) : null;

            const ap = await getAuthorizedPayment(paymentId);
            const preapprovalId = ap?.preapproval_id;
            if (!preapprovalId) return; // sem vínculo com assinatura — ignora

            const sub = await Subscription.findOne({ mpPreapprovalId: preapprovalId });
            if (!sub) return; // assinatura desconhecida — nada a fazer

            // Idempotência das faturas (campo próprio, não colide com lastEventId do preapproval).
            if (eventId && sub.lastPaymentEventId === eventId) return;

            // ap.status: 'processed' (cobrada) | 'recycling'/'rejected' (falhou, MP retenta)
            //            | 'scheduled' (agendada) | 'cancelled'. Pagamento real em ap.payment.status.
            const apStatus = ap?.status;
            const payStatus = ap?.payment?.status; // 'approved' | 'rejected' | 'refunded' | 'charged_back' | ...

            // Estorno/chargeback de uma fatura → dinheiro DEVOLVIDO: remove acesso + mata a
            // recorrência (CDC Art. 49 = arrependimento 7d; Art. 42 §ú = cobrar após estorno = dobro).
            // revertSubscriptionToFree é idempotente e respeita org protegida/cortesia.
            const estornado = payStatus === 'refunded';
            const chargeback = payStatus === 'charged_back';
            // Estorno parcial pode SOMAR até o total (MP só acumula transaction_amount_refunded e
            // mantém o status). Confere o valor real do pagamento p/ não deixar acesso pago após
            // 100% devolvido (CDC Art. 42).
            let parcialVirouTotal = false;
            if (payStatus === 'partially_refunded' && ap?.payment?.id) {
                try {
                    const p = await new Payment(client).get({ id: ap.payment.id });
                    const amt = p?.transaction_amount, ref = p?.transaction_amount_refunded;
                    if (typeof amt === 'number' && typeof ref === 'number' && ref >= amt - 0.01) parcialVirouTotal = true;
                } catch (e) { logger.warn(`[billing] falha ao conferir estorno parcial ap=${paymentId}: ${e.message}`); }
            }
            if (estornado || chargeback || parcialVirouTotal) {
                // Observabilidade (idempotente). A idempotência do ESTORNO é por payment.id
                // (handleRefundRevert), cross-tópico e à prova de re-entrega pós-re-assinatura.
                await Subscription.updateOne({ _id: sub._id }, { $set: { lastPaymentAt: new Date(), lastPaymentStatus: payStatus } });
                await handleRefundRevert(sub, ap?.payment?.id, {
                    reason: chargeback ? 'invoice_charged_back' : 'invoice_refunded',
                    suspend: chargeback
                });
                return;
            }

            const aprovado = payStatus === 'approved' || apStatus === 'processed';
            const falhou = payStatus === 'rejected' || apStatus === 'recycling' || apStatus === 'rejected';

            // Observabilidade + idempotência: registrado SEMPRE (inclui falha → lastPaymentAt
            // nunca fica stale, e uma futura query de inadimplência enxerga a última tentativa).
            const obs = {
                lastPaymentAt: new Date(),
                lastPaymentStatus: aprovado ? 'approved' : (falhou ? 'rejected' : (apStatus || 'unknown'))
            };
            if (eventId) obs.lastPaymentEventId = eventId;
            if (aprovado) {
                obs.pendingPlan = null; // limpa pendingPlan órfão de checkout antigo
                // 1ª fatura desta assinatura → guarda o payment.id p/ o reembolso INTEGRAL de
                // arrependimento (CDC Art. 49). Só na 1ª (não sobrescreve a cada renovação, senão
                // estornaria a fatura errada) e só se o MP nos deu o id físico do pagamento.
                if (!sub.firstPaymentId && ap?.payment?.id) obs.firstPaymentId = String(ap.payment.id);
            }
            await Subscription.updateOne({ _id: sub._id }, { $set: obs });

            // Transição de status SÓ p/ não-cortesia e ATÔMICA no banco (filtro isCourtesy):
            // garante que uma cortesia jamais é cobrada/rebaixada por fatura, mesmo que alguém
            // ligue/desligue cortesia em paralelo com o webhook (sem janela de corrida).
            if (aprovado) {
                // Pagou → ativa e REGULARIZA: limpa carência (graceChecker não suspende depois).
                // Filtro revertedAt:null impede que uma fatura "fantasma" (recorrência que ainda não
                // foi cancelada por falha transiente) reative uma sub já revertida por estorno.
                await Subscription.updateOne(
                    { _id: sub._id, isCourtesy: { $ne: true }, revertedAt: null },
                    { $set: { status: 'active', graceUntil: null, graceWarnedAt: null } }
                );
            } else if (falhou) {
                await Subscription.updateOne({ _id: sub._id, isCourtesy: { $ne: true } }, { $set: { status: 'past_due' } });
            }
            return; // Webhook tratado
        }

        // --- CHARGEBACK (contestação no cartão) ---
        // Exige o tópico `topic_chargebacks_wh` HABILITADO no painel do MP. Resolução best-effort:
        // chargeback → payment → external_reference (orgId) → sub. Resolveu: reverte + suspende
        // (em disputa). Não resolveu: warn p/ tratamento manual. Validar E2E quando houver 1 real.
        if ((type === 'topic_chargebacks_wh' || type === 'chargebacks') && paymentId) {
            try {
                const cb = await getChargeback(paymentId);
                const payId = Array.isArray(cb?.payments) ? cb.payments[0] : (cb?.payment_id || null);
                let orgId = null;
                if (payId) {
                    const payment = new Payment(client);
                    const pd = await payment.get({ id: payId });
                    const extRef = pd?.external_reference;
                    if (extRef && !String(extRef).includes(':')) orgId = extRef;
                }
                const sub = orgId ? await Subscription.findOne({ organizationId: orgId }) : null;
                if (sub) {
                    // Dedup pelo payment.id da disputa (mesmo estorno em vários tópicos).
                    await handleRefundRevert(sub, payId, { reason: 'chargeback', suspend: true });
                    logger.warn(`[billing] chargeback → org revertida e suspensa org=${orgId} cb=${paymentId}`, { orgId });
                } else {
                    logger.warn(`[billing] chargeback recebido sem org resolvida cb=${paymentId} — tratar manualmente`);
                }
            } catch (e) {
                logger.error(`[billing] erro ao processar chargeback cb=${paymentId}: ${e.message}`);
            }
            return; // Webhook tratado
        }

        // --- MANIPULAÇÃO DE PAGAMENTOS ÚNICOS OU FATURAS DE ASSINATURA ---
        if (type === 'payment' && paymentId) {
            const payment = new Payment(client);
            const paymentData = await payment.get({ id: paymentId });
            const extRef = paymentData.external_reference;
            const st = paymentData.status;

            const orgRef = (extRef && !String(extRef).includes(':')) ? extRef : null; // só orgId puro (extra-fotos tem ':')

            // Estorno/chargeback TOTAL de fatura de ASSINATURA. Rede de segurança caso o MP notifique
            // pelo tópico 'payment' em vez de 'subscription_authorized_payment'. Idempotente com aquele branch.
            if (st === 'refunded' || st === 'charged_back') {
                if (orgRef) {
                    const sub = await Subscription.findOne({ organizationId: orgRef });
                    if (sub) {
                        await handleRefundRevert(sub, paymentId, {
                            reason: st === 'charged_back' ? 'payment_charged_back' : 'payment_refunded',
                            suspend: st === 'charged_back'
                        });
                    } else {
                        logger.warn(`[billing] estorno em 'payment' sem sub p/ org=${orgRef} payment=${paymentId} — conciliação manual`, { orgId: orgRef });
                    }
                } else {
                    // Fatura recorrente pode não carregar external_reference no objeto payment → não
                    // some silenciosamente: registra p/ conciliação (o branch authorized_payment é o primário).
                    logger.error(`[billing] estorno em 'payment' sem org resolvível payment=${paymentId} status=${st} extRef=${extRef} — conciliação manual`);
                }
                return;
            }
            // Estorno PARCIAL: só reverte se a SOMA dos parciais atingiu o total (CDC); senão, registra.
            if (st === 'partially_refunded') {
                const amt = paymentData.transaction_amount, ref = paymentData.transaction_amount_refunded;
                const virouTotal = typeof amt === 'number' && typeof ref === 'number' && ref >= amt - 0.01;
                if (virouTotal && orgRef) {
                    const sub = await Subscription.findOne({ organizationId: orgRef });
                    if (sub) {
                        await handleRefundRevert(sub, paymentId, { reason: 'payment_refunded_cumulative', suspend: false });
                    }
                    return;
                }
                logger.warn(`[billing] estorno PARCIAL payment=${paymentId} ref=${ref}/${amt} extRef=${extRef} — sem reversão automática`,
                    orgRef ? { orgId: orgRef } : {});
                return;
            }

            if (paymentData.status === 'approved') {

                // Caso 1: Pagamento de Fotos Extras (orgId:sessionId)
                if (extRef && extRef.includes(':')) {
                    const [orgId, sessionId] = extRef.split(':');
                    const session = await Session.findById(sessionId);

                    if (session && session.extraRequest.status === 'pending') {
                        // Mesclar extras na seleção principal
                        const newSelected = [...new Set([...session.selectedPhotos, ...session.extraRequest.photos])];

                        session.selectedPhotos = newSelected;
                        session.extraRequest.status = 'accepted';
                        session.extraRequest.paid = true;
                        session.extraRequest.respondedAt = new Date();

                        await session.save();

                        // Notificar fotógrafo
                        await Notification.create({
                            type: 'extra_photos_paid',
                            sessionId: session._id,
                            sessionName: session.name,
                            message: `Pagamento de ${session.extraRequest.photos.length} fotos extras recebido!`,
                            organizationId: orgId
                        });
                    }
                }
                // Caso 2: Pagamento de fatura de Assinatura (apenas orgId)
                else {
                    const orgId = extRef;
                    // Confirma assinatura ativa, MAS nunca RESSUSCITA uma sub revertida por estorno
                    // (plan free / revertedAt) — um 'approved' atrasado/reenviado recobrando pós-estorno
                    // violaria o CDC Art. 42. Sem upsert (org real já tem sub; não criar do nada).
                    await Subscription.updateOne(
                        { organizationId: orgId, plan: { $ne: 'free' }, revertedAt: null },
                        { $set: { status: 'active' } }
                    );
                }
            }
        }
    } catch (error) {
        // Sem `req` aqui — deixa o controller (billing.js) logar com req.logger.
        // Propaga para o MP fazer as retentativas.
        throw error;
    }
}

// F4 — Busca uma fatura recorrente (authorized_payment) no MP. O SDK v2 não tem classe
// para este recurso, então usamos a API crua com o access token. Devolve o JSON do MP
// (campos usados: preapproval_id, status, payment.status).
async function getAuthorizedPayment(authorizedPaymentId) {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new Error('Mercado Pago não configurado.');
    const resp = await fetch(`https://api.mercadopago.com/authorized_payments/${authorizedPaymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error(`MP authorized_payments ${authorizedPaymentId}: HTTP ${resp.status}`);
    return resp.json();
}

// Busca um chargeback no MP (API crua — sem classe no SDK v2). Campos usados: payments[]/payment_id.
async function getChargeback(chargebackId) {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new Error('Mercado Pago não configurado.');
    const resp = await fetch(`https://api.mercadopago.com/v1/chargebacks/${chargebackId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error(`MP chargebacks ${chargebackId}: HTTP ${resp.status}`);
    return resp.json();
}

// Estorna (refund) um pagamento no MP — API crua (sem classe no SDK v2, igual getChargeback).
// Body vazio = refund TOTAL (devolve o valor inteiro da fatura). `X-Idempotency-Key`
// DETERMINÍSTICA (inclui o payment.id e o tipo de valor) → um retry NUNCA devolve em dobro
// (CDC Art. 42 — cobrar/operar em dobro é vedado). Lança em erro do MP; o caller trata sem
// marcar o estorno como concluído, então o fluxo é re-tentável. Retorna o JSON do refund.
async function refundPayment(paymentId, idempotencyKey) {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new Error('Mercado Pago não configurado.');
    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': String(idempotencyKey),
        },
        body: '{}', // sem `amount` = refund total
    });
    if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`MP refund ${paymentId}: HTTP ${resp.status} ${txt}`);
    }
    return resp.json();
}

// Estorno já tratado? Dedup pelo PAGAMENTO FÍSICO (payment.id), não pelo id da notificação:
// o mesmo estorno chega por vários tópicos com ids de notificação diferentes, mas SEMPRE com o
// mesmo payment.id. Persiste através de re-assinatura. Sem payId (não resolvido) → processa e
// deixa o gate revertedAt do revert cuidar da idempotência da escrita.
async function refundAlreadyHandled(subId, payId) {
    if (!payId) return false;
    const s = await Subscription.findById(subId).select('refundedPaymentIds').lean();
    return !!(s && Array.isArray(s.refundedPaymentIds) && s.refundedPaymentIds.includes(String(payId)));
}

// Marca um estorno como consumido — chamado SÓ DEPOIS do revert concluir. $addToSet é idempotente.
async function markRefundHandled(subId, payId) {
    if (!payId) return;
    await Subscription.updateOne({ _id: subId }, { $addToSet: { refundedPaymentIds: String(payId) } });
}

// Reverte por estorno/chargeback de forma idempotente e SEGURA contra perda de evento:
//  1) se o payment.id já foi tratado → no-op (cross-tópico + sobrevive re-assinatura);
//  2) reverte (idempotente via revertedAt:null dentro do próprio revert);
//  3) marca o payment.id APENAS após o revert concluir. Se o revert lançar (ex.: DB transiente),
//     o id NÃO é marcado → o MP retenta e o estorno é reprocessado (CDC Art. 42 — nunca perder
//     um estorno e seguir cobrando). Retorna true se reverteu agora, false se já estava tratado.
async function handleRefundRevert(sub, payId, opts) {
    if (await refundAlreadyHandled(sub._id, payId)) return false;
    await revertSubscriptionToFree(sub, opts);
    await markRefundHandled(sub._id, payId);
    return true;
}

// Reverte uma assinatura para o plano Free e mata a recorrência no MP (se ainda viva).
// Chamado quando o dinheiro é DEVOLVIDO (estorno total / chargeback) — diferente de um
// cancelamento simples, que mantém acesso até o fim do ciclo (CDC > 7 dias). Idempotente,
// fail-soft e RESPEITA contas protegidas/cortesia (nunca rebaixa Flávia/Davi/dono).
//   reason  → rótulo p/ auditoria (invoice_refunded | payment_refunded | chargeback | ...)
//   suspend → true (chargeback) também desativa a org (em disputa), espelhando o F3 (sem excluir).
//   freeze  → true (refund VOLUNTÁRIO de arrependimento) liga storageFrozen: congela uso comercial
//             (upload novo + venda automática) pra arrependimento não virar mês grátis de uso pleno.
async function revertSubscriptionToFree(sub, { reason = 'refund', suspend = false, freeze = false } = {}) {
    if (!sub || !sub._id) return { reverted: false, skipped: 'no_sub' };

    const org = await Organization.findById(sub.organizationId)
        .select('slug name ownerId isActive').lean();

    // FAIL-CLOSED: se a org não resolve (apagada / lag de réplica), ABORTA — uma salvaguarda de
    // conta protegida não pode rodar cega. Melhor não rebaixar do que rebaixar a Flávia por engano.
    if (!org) {
        logger.error(`[billing-revert] org NÃO resolvida reason=${reason} org=${sub.organizationId} — abortando reversão (conciliação manual)`,
            { orgId: String(sub.organizationId) });
        return { reverted: false, skipped: 'org_not_found' };
    }

    // Rede de segurança 1: contas protegidas (dono/sócios/produção) NUNCA são rebaixadas/suspensas.
    if (isProtectedSlug(org.slug)) {
        logger.warn(`[billing-revert] org PROTEGIDA não rebaixada reason=${reason} org=${sub.organizationId} slug=${org.slug}`,
            { orgId: String(sub.organizationId) });
        return { reverted: false, skipped: 'protected' };
    }
    // Rede de segurança 2 (NÃO depende de env): override = org curada à mão pelo super-admin
    // (limites/preço customizados). Toda conta real curada carrega override → blindagem extra
    // caso PROTECTED_ORG_SLUGS suma/tenha typo. Cliente comum NÃO tem override → é revertido normal.
    if (sub.overrideEnabled) {
        logger.warn(`[billing-revert] org com OVERRIDE não rebaixada automaticamente reason=${reason} org=${sub.organizationId} — revisar manualmente`,
            { orgId: String(sub.organizationId) });
        return { reverted: false, skipped: 'override' };
    }
    // Cortesia nunca foi cobrada → não há o que reverter (e nunca rebaixa cortesia).
    if (sub.isCourtesy) {
        return { reverted: false, skipped: 'courtesy' };
    }

    const fromPlan = sub.plan;

    // Mata a recorrência no MP se ainda existir. Distingue erro DEFINITIVO (já cancelada /
    // inexistente → seguro apagar o id) de TRANSIENTE (5xx/timeout → PRESERVA o id e marca
    // mpCancelPending p/ o graceChecker re-tentar; senão a recorrência seguiria viva cobrando
    // após o estorno = devolução em dobro, CDC Art. 42).
    let cancelConfirmed = true, cancelPending = false;
    if (sub.mpPreapprovalId) {
        try {
            await cancelPreapproval(sub.mpPreapprovalId);
        } catch (e) {
            const code = e?.status || e?.statusCode || e?.cause?.status || e?.response?.status;
            const definitive = code === 400 || code === 404 ||
                /already.*cancel|not.*found|cancelad|does not exist/i.test(e?.message || '');
            if (definitive) {
                logger.warn(`[billing-revert] preapproval já cancelada/inexistente org=${sub.organizationId}: ${e.message}`);
            } else {
                cancelConfirmed = false; cancelPending = true;
                logger.error(`[billing-revert] cancel preapproval FALHOU (transiente) org=${sub.organizationId}: ${e.message} — mantém id p/ retry`,
                    { orgId: String(sub.organizationId) });
            }
        }
    }

    const set = {
        plan: 'free',
        status: 'canceled',
        pendingPlan: null,
        subscribedAt: null,
        customPriceCents: null,
        storageAddonGB: 0,
        storageAddonPriceCents: 0,
        // Conta no Free não tem carência de cobrança nem ciclo a "cancelar no fim" → limpa o estado
        // (senão o graceChecker suspenderia indevidamente e o painel mostraria "cancelamento agendado").
        graceUntil: null,
        graceWarnedAt: null,
        cancelAtPeriodEnd: false,
        revertedAt: new Date(),
        mpCancelPending: cancelPending,
        // Fase 2: a 1ª fatura foi consumida (estornada ou não há mais o que estornar) e o refund,
        // se havia, terminou → limpa a trava in-flight. firstPaymentId zerado evita reembolsar de
        // novo a mesma fatura numa eventual re-entrega de evento.
        firstPaymentId: null,
        refundInFlight: false,
    };
    // Congelamento comercial só no refund VOLUNTÁRIO (freeze). Nos outros reverts (estorno via
    // webhook, chargeback c/ suspend, cancel de fim de ciclo) não congela: chargeback já suspende
    // a org e cancel-de-ciclo usou o que pagou. Nunca rebaixa por engano: protegida/override/
    // cortesia já saíram acima, então só cliente comum chega aqui.
    if (freeze) set.storageFrozen = true;
    // Sem override → volta aos limites do Free (override já saiu antes, mas mantém a checagem por clareza).
    if (!sub.overrideEnabled) set.limits = plans.free.limits;
    const update = { $set: set };
    if (cancelConfirmed) update.$unset = { mpPreapprovalId: '' }; // só apaga o id quando o cancel foi CONFIRMADO

    // Escrita ATÔMICA com dupla guarda: isCourtesy (cortesia ligada em paralelo = TOCTOU) e
    // revertedAt:null (idempotência do próprio revert — só rebaixa/audita 1× por estorno).
    const result = await Subscription.updateOne(
        { _id: sub._id, isCourtesy: { $ne: true }, revertedAt: null },
        update
    );
    const reverted = result.matchedCount === 1;

    // Espelha o downgrade no Organization.plan (denormalizado p/ a lista do SaaS Admin),
    // só quando o revert REALMENTE aconteceu (idempotente via matchedCount).
    if (reverted) {
        await Organization.updateOne({ _id: sub.organizationId }, { $set: { plan: 'free' } });
    }

    // Suspensão (chargeback) é independente do gate de revertedAt: um chargeback pode chegar DEPOIS
    // de um estorno já ter revertido (eventos diferentes). Mas cortesia nunca é suspensa → relê do banco.
    let didSuspend = false;
    if (suspend && org.isActive !== false) {
        const fresh = await Subscription.findById(sub._id).select('isCourtesy').lean();
        if (fresh && !fresh.isCourtesy) {
            // Chargeback: suspende a org (em disputa) — espelha o F3 (isActive=false), NUNCA exclui dados.
            await Organization.updateOne(
                { _id: sub.organizationId },
                { $set: { isActive: false, suspendedReason: 'chargeback' } }
            );
            didSuspend = true;
        }
    }

    // Auditoria/loga só quando ALGO mudou (evita poluir o AuditLog permanente em retries no-op).
    if (reverted || didSuspend) {
        auditSystem('billing_revert', sub.organizationId, { reason, suspend: didSuspend, fromPlan, cancelPending });
        logger.warn(`[billing-revert] revertida reason=${reason} suspend=${didSuspend} cancelPending=${cancelPending} de=${fromPlan} org=${sub.organizationId}`,
            { orgId: String(sub.organizationId) });
    }
    return { reverted, suspended: didSuspend, cancelPending, skipped: reverted ? null : 'noop' };
}

// Cancela de fato a assinatura no Mercado Pago.
async function cancelPreapproval(preapprovalId) {
    if (!client) {
        throw new Error('Mercado Pago não configurado.');
    }
    const preApproval = new PreApproval(client);
    return preApproval.update({ id: preapprovalId, body: { status: 'cancelled' } });
}

// Lê a PreApproval no MP (objeto completo, inclui `next_payment_date` = data da próxima
// cobrança = fim do ciclo já pago). Usado no cancelamento p/ gravar `currentPeriodEnd`.
async function getPreapproval(preapprovalId) {
    if (!client) {
        throw new Error('Mercado Pago não configurado.');
    }
    const preApproval = new PreApproval(client);
    return preApproval.get({ id: preapprovalId });
}

// Atualiza o valor cobrado de uma assinatura (PreApproval) JÁ ATIVA no Mercado Pago.
// Usado quando o adicional de storage muda o total da mensalidade de quem já assina —
// o checkout normal só vale p/ assinatura nova. amountCents sempre em centavos.
async function updatePreapprovalAmount(preapprovalId, amountCents) {
    if (!client) {
        throw new Error('Mercado Pago não configurado.');
    }
    const preApproval = new PreApproval(client);
    return preApproval.update({
        id: preapprovalId,
        body: {
            auto_recurring: {
                transaction_amount: amountCents / 100,
                currency_id: 'BRL'
            }
        }
    });
}

// F2 — Sincroniza o valor cobrado na assinatura MP VIVA com o total efetivo atual
// (preço custom + storage addon). Fonte ÚNICA chamada por /custom-price e /storage-addon,
// para que o guard de cortesia seja impossível de esquecer. Guards, nesta ordem:
//   • cortesia       → conta cortesia NUNCA é cobrada (proibido por construção);
//   • flag desligada → modo legado (PreApprovalPlan): o MP ignora update de valor numa
//                      assinatura atrelada a plano, então nem tenta — evita devolver
//                      "atualizado" enganoso ao super-admin;
//   • sem id / inativa → vale só no próximo checkout (assinatura ainda não vive no MP).
// Lança se o MP rejeitar o update — o caller trata SEM desfazer o save local.
// Retorna { updated, skipped }.
async function syncPreapprovalAmount(sub) {
    if (sub.isCourtesy)                            return { updated: false, skipped: 'courtesy' };
    if (process.env.MP_USE_PREAPPROVAL !== 'true') return { updated: false, skipped: 'legacy_flag_off' };
    if (!sub.mpPreapprovalId || sub.status !== 'active')
                                        return { updated: false, skipped: 'not_active' };
    await updatePreapprovalAmount(sub.mpPreapprovalId, effectiveMonthlyCents(sub));
    return { updated: true, skipped: null };
}

async function createExtraPhotosPreference(organizationId, sessionId, photosCount, totalPrice) {
    if (!client) {
        throw new Error('Mercado Pago não configurado.');
    }

    const preference = new Preference(client);

    const response = await preference.create({
        body: {
            items: [
                {
                    id: `extra_${sessionId}`,
                    title: `${photosCount} Fotos Extras - Galeria`,
                    quantity: 1,
                    unit_price: totalPrice,
                    currency_id: 'BRL',
                }
            ],
            external_reference: `${organizationId}:${sessionId}`, // Org:Session
            metadata: {
                type: 'extra_photos',
                sessionId: sessionId.toString(),
                photosCount: photosCount
            },
            back_urls: {
                success: `${process.env.BASE_URL}/cliente/?sessionId=${sessionId}&payment=success`,
                failure: `${process.env.BASE_URL}/cliente/?sessionId=${sessionId}&payment=failed`,
                pending: `${process.env.BASE_URL}/cliente/?sessionId=${sessionId}&payment=pending`
            },
            auto_return: 'approved'
        }
    });

    return response.init_point;
}

module.exports = { createCheckoutSession, createExtraPhotosPreference, handleWebhook, verifyWebhookSignature, cancelPreapproval, getPreapproval, updatePreapprovalAmount, syncPreapprovalAmount, revertSubscriptionToFree, handleRefundRevert, refundAlreadyHandled, markRefundHandled, refundPayment };