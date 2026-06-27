const { MercadoPagoConfig, Preference, Payment, PreApprovalPlan, PreApproval } = require('mercadopago');
const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const Organization = require('../models/Organization');
const User = require('../models/User');
const Session = require('../models/Session');
const Notification = require('../models/Notification');
const plans = require('../models/plans');
const { effectiveMonthlyCents } = require('../services/subscriptionPricing');

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

async function createCheckoutSession(organizationId, planName) {
    if (!client) {
        throw new Error('Mercado Pago não configurado. Adicione MERCADOPAGO_ACCESS_TOKEN no .env');
    }

    const plan = plans[planName];
    if (!plan || plan.price === 0) {
        throw new Error('Plano inválido');
    }

    let sub = await Subscription.findOne({ organizationId });
    if (!sub) sub = new Subscription({ organizationId, plan: 'free' });
    sub.pendingPlan = planName;
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
        return response.init_point;
    }

    // Novo caminho (MP_USE_PREAPPROVAL=1): PreApproval avulsa por org.
    // Sem preapproval_plan_id → valor mutável via update(); destrava storage-addon e preço custom.
    // payer_email vem do User dono da org (não Organization.email, que pode estar vazio).
    const org = await Organization.findById(organizationId).lean();
    const owner = org?.ownerId ? await User.findById(org.ownerId).lean() : null;
    // Override de teste (sandbox): MP_TEST_PAYER_EMAIL força o pagador p/ uma conta de
    // teste compradora do MP, sem alterar o e-mail (login) do dono. Em produção a env
    // não existe → usa owner.email normalmente.
    const payerEmail = process.env.MP_TEST_PAYER_EMAIL || owner?.email;
    if (!payerEmail) throw new Error('E-mail do dono não encontrado para criar assinatura MP');

    // Dedupe: cancela PreApproval anterior desta org antes de criar nova.
    // ⚠️ ARMADILHA CONHECIDA (segura HOJE, 0 assinaturas vivas em prod): se a antiga
    // estivesse AUTHORIZED (paga/ativa) e o usuário abandonasse o novo checkout, ele
    // ficaria sem assinatura nenhuma. O caminho correto p/ TROCA DE PLANO numa sub viva
    // é updatePreapprovalAmount (não cancel+create) — mas isso depende da incógnita
    // "MP honra update?" ainda não provada no sandbox. Reavaliar antes de existir sub paga.
    if (sub.mpPreapprovalId) {
        try {
            const paOld = new PreApproval(client);
            await paOld.update({ id: sub.mpPreapprovalId, body: { status: 'cancelled' } });
        } catch (_) { /* prossegue mesmo se o cancel falhar (sub pode já não existir no MP) */ }
        sub.mpPreapprovalId = null;
    }

    const pa = new PreApproval(client);
    const response = await pa.create({
        body: {
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
            status: 'pending'
        }
    });

    // Grava o id já no checkout (não espera o webhook) para que cancel e update funcionem
    // imediatamente, sem depender de o usuário completar o pagamento primeiro.
    sub.mpPreapprovalId = response.id;
    try {
        await sub.save();
    } catch (err) {
        // Compensating cancel: desfaz a PreApproval recém-criada para não ficar órfã no MP.
        try { await pa.update({ id: response.id, body: { status: 'cancelled' } }); } catch (_) {}
        throw err;
    }

    return response.init_point;
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

                // Mapeia o plano: pendingPlan (gravado no checkout) > reason > fallback 'basic'.
                const planName = sub.pendingPlan
                    || parsePlanFromReason(subscriptionData.reason)
                    || 'basic';

                sub.plan = planName;
                sub.status = normalizeMpStatus(mpStatus);
                sub.mpPreapprovalId = subscriptionData.id || paymentId;
                sub.pendingPlan = null;
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
            const payStatus = ap?.payment?.status; // 'approved' | 'rejected' | ...
            const aprovado = payStatus === 'approved' || apStatus === 'processed';
            const falhou = payStatus === 'rejected' || apStatus === 'recycling' || apStatus === 'rejected';

            // Observabilidade + idempotência: registrado SEMPRE (inclui falha → lastPaymentAt
            // nunca fica stale, e uma futura query de inadimplência enxerga a última tentativa).
            const obs = {
                lastPaymentAt: new Date(),
                lastPaymentStatus: aprovado ? 'approved' : (falhou ? 'rejected' : (apStatus || 'unknown'))
            };
            if (eventId) obs.lastPaymentEventId = eventId;
            if (aprovado) obs.pendingPlan = null; // limpa pendingPlan órfão de checkout antigo
            await Subscription.updateOne({ _id: sub._id }, { $set: obs });

            // Transição de status SÓ p/ não-cortesia e ATÔMICA no banco (filtro isCourtesy):
            // garante que uma cortesia jamais é cobrada/rebaixada por fatura, mesmo que alguém
            // ligue/desligue cortesia em paralelo com o webhook (sem janela de corrida).
            if (aprovado) {
                await Subscription.updateOne({ _id: sub._id, isCourtesy: { $ne: true } }, { $set: { status: 'active' } });
            } else if (falhou) {
                await Subscription.updateOne({ _id: sub._id, isCourtesy: { $ne: true } }, { $set: { status: 'past_due' } });
            }
            return; // Webhook tratado
        }

        // --- MANIPULAÇÃO DE PAGAMENTOS ÚNICOS OU FATURAS DE ASSINATURA ---
        if (type === 'payment' && paymentId) {
            const payment = new Payment(client);
            const paymentData = await payment.get({ id: paymentId });

            if (paymentData.status === 'approved') {
                const extRef = paymentData.external_reference;

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
                    // Se for pagamento atrelado a um plano (Subscription invoice), confirmamos que está ativo
                    await Subscription.findOneAndUpdate(
                        { organizationId: orgId },
                        { status: 'active' },
                        { upsert: true }
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

// Cancela de fato a assinatura no Mercado Pago.
async function cancelPreapproval(preapprovalId) {
    if (!client) {
        throw new Error('Mercado Pago não configurado.');
    }
    const preApproval = new PreApproval(client);
    return preApproval.update({ id: preapprovalId, body: { status: 'cancelled' } });
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

module.exports = { createCheckoutSession, createExtraPhotosPreference, handleWebhook, verifyWebhookSignature, cancelPreapproval, updatePreapprovalAmount, syncPreapprovalAmount };