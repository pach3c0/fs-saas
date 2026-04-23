const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const Subscription = require('../models/Subscription');
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

    // Cria a preferência de pagamento (Checkout Pro)
    const preference = new Preference(client);

    const response = await preference.create({
        body: {
            items: [
                {
                    id: planName,
                    title: `Plano ${planName} - CliqueZoom`,
                    quantity: 1,
                    // Converte de centavos (padrão Stripe no plans.js) para decimal, se for o caso
                    unit_price: plan.price > 1000 ? plan.price / 100 : plan.price,
                    currency_id: 'BRL',
                }
            ],
            external_reference: organizationId.toString(), // Salva a Org para recuperar no webhook
            back_urls: {
                success: `${process.env.BASE_URL}/admin?payment=success`,
                failure: `${process.env.BASE_URL}/admin?payment=canceled`,
                pending: `${process.env.BASE_URL}/admin?payment=pending`
            },
            auto_return: 'approved',
            // notification_url: `${process.env.BASE_URL}/api/billing/webhook/mercadopago`
        }
    });

    // Retorna a URL de pagamento do Mercado Pago (init_point)
    return response.init_point;
}

async function handleWebhook(eventBody, eventQuery) {
    try {
        // O Mercado Pago envia notificações via POST. Dependendo de como você configurar,
        // o ID vem no body ou na query string (topic=payment&id=123)
        const paymentId = eventBody?.data?.id || eventQuery?.id;
        const type = eventBody?.type || eventQuery?.topic;

        if (type === 'payment' && paymentId) {
            const payment = new Payment(client);
            const paymentData = await payment.get({ id: paymentId });

            if (paymentData.status === 'approved') {
                const extRef = paymentData.external_reference;

                // Caso 1: Pagamento de Fotos Extras (orgId:sessionId)
                if (extRef && extRef.includes(':')) {
                    const [orgId, sessionId] = extRef.split(':');
                    const Session = require('../models/Session');
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
                        const Notification = require('../models/Notification');
                        await Notification.create({
                            type: 'extra_photos_paid',
                            sessionId: session._id,
                            sessionName: session.name,
                            message: `Pagamento de ${session.extraRequest.photos.length} fotos extras recebido!`,
                            organizationId: orgId
                        });
                    }
                }
                // Caso 2: Assinatura de Plano (apenas orgId)
                else {
                    const orgId = extRef;
                    const planName = paymentData.additional_info?.items?.[0]?.id || 'basic';

                    await Subscription.findOneAndUpdate(
                        { organizationId: orgId },
                        {
                            plan: planName,
                            status: 'active',
                            // Atualizar limites conforme plano
                            limits: plans[planName]?.limits
                        },
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