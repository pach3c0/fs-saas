const { MercadoPagoConfig, Preference, Payment, PreApprovalPlan, PreApproval } = require('mercadopago');
const Subscription = require('../models/Subscription');
const Session = require('../models/Session');
const Notification = require('../models/Notification');
const plans = require('../models/plans');

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

    // Cria a preferência de assinatura (PreApprovalPlan)
    const planObj = new PreApprovalPlan(client);

    const priceAmount = plan.price > 1000 ? plan.price / 100 : plan.price;

    const response = await planObj.create({
        body: {
            reason: `Plano ${planName} - CliqueZoom`,
            auto_recurring: {
                frequency: 1,
                frequency_type: 'months',
                transaction_amount: priceAmount,
                currency_id: 'BRL'
            },
            back_url: process.env.BASE_URL.includes('localhost') ? `https://app.cliquezoom.com.br/admin?payment=success` : `${process.env.BASE_URL}/admin?payment=success`,
            external_reference: organizationId.toString()
        }
    });

    // Retorna a URL de assinatura do Mercado Pago (init_point)
    return response.init_point;
}

async function handleWebhook(eventBody, eventQuery) {
    try {
        // O Mercado Pago envia notificações via POST. Dependendo de como você configurar,
        // o ID vem no body ou na query string (topic=payment&id=123)
        const paymentId = eventBody?.data?.id || eventQuery?.id;
        const type = eventBody?.type || eventQuery?.topic;

        // --- MANIPULAÇÃO DE ASSINATURAS (SUBSCRIPTIONS) ---
        if (type === 'subscription_preapproval' && paymentId) {
            const preApproval = new PreApproval(client);
            const subscriptionData = await preApproval.get({ id: paymentId });
            
            const orgId = subscriptionData.external_reference;
            const status = subscriptionData.status; // 'authorized', 'paused', 'cancelled'
            
            // Tenta deduzir qual plano foi assinado a partir da descrição ("Plano basic - CliqueZoom")
            let planName = 'basic';
            if (subscriptionData.reason && subscriptionData.reason.includes('pro')) planName = 'pro';

            if (orgId && status) {
                await Subscription.findOneAndUpdate(
                    { organizationId: orgId },
                    {
                        plan: planName,
                        status: status === 'authorized' ? 'active' : status,
                        limits: plans[planName]?.limits
                    },
                    { upsert: true }
                );
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
        console.error('Erro ao processar Webhook do Mercado Pago:', error);
        // Permite que o controller retorne um erro 500 para que o MP realize retentativas
        throw error;
    }
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

module.exports = { createCheckoutSession, createExtraPhotosPreference, handleWebhook };