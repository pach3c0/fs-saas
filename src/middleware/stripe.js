const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;
const Subscription = require('../models/Subscription');
const plans = require('../models/plans');

async function createCheckoutSession(organizationId, planName) {
  if (!stripe) {
    throw new Error('Stripe não configurado. Adicione STRIPE_SECRET_KEY no .env');
  }

  const plan = plans[planName];
  if (!plan || plan.price === 0) {
    throw new Error('Plano inválido');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: plan.priceId,
      quantity: 1
    }],
    success_url: `${process.env.BASE_URL}/admin?payment=success`,
    cancel_url: `${process.env.BASE_URL}/admin?payment=canceled`,
    client_reference_id: organizationId.toString(),
    metadata: {
      organizationId: organizationId.toString(),
      plan: planName
    }
  });

  return session.url;
}

async function handleWebhook(event) {
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const orgId = session.metadata.organizationId;
      const plan = session.metadata.plan;

      await Subscription.findOneAndUpdate(
        { organizationId: orgId },
        {
          plan: plan,
          status: 'active',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          currentPeriodEnd: new Date(session.subscription.current_period_end * 1000),
          limits: plans[plan].limits,
          usage: { sessions: 0, photos: 0, albums: 0, storage: 0 }  // Reset ao trocar de plano
        },
        { upsert: true }
      );
      break;

    case 'invoice.payment_succeeded':
      // Renovação bem-sucedida
      break;

    case 'invoice.payment_failed':
      // Marcar como past_due
      break;

    case 'customer.subscription.deleted':
      // Assinatura cancelada
      break;
  }
}

module.exports = { createCheckoutSession, handleWebhook };