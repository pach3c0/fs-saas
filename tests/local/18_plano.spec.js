// Plano — cobertura exaustiva: API (/api/billing/plans público, /subscription formato +
// storage em disco, /cancel sem assinatura → 400, /checkout sem Stripe → erro limpo) +
// UI (card do plano atual, 3 barras de uso com ∞ p/ ilimitado, cor por faixa 70%/90% via
// limites semeados no Mongo, breakdown de storage, cards de planos com ATUAL/Em Breve,
// fluxo de cancelamento com confirm, erro de carregamento).
// A subscription da org `teste` é compartilhada — todo teste restaura o que tocou.
const { test, expect } = require('@playwright/test');
const { MongoClient } = require('mongodb');
const H = require('./helpers');

const MONGO_URI = 'mongodb://localhost:27017/cliquezoom-dev';

async function api(page, method, url, body) {
  return page.evaluate(async ({ method, url, body }) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(url, {
      method,
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  }, { method, url, body });
}

async function irParaPlano(page) {
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('plano'));
  // exact: o card de cancelamento contém "Seu plano permanece..." (substring case-insensitive)
  await expect(page.getByText('Seu Plano', { exact: true })).toBeVisible({ timeout: 10000 });
}

// Aplica um patch na subscription da org teste direto no Mongo. Retorna o doc original.
async function patchSubscription(patch) {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  try {
    const orgs = mongo.db().collection('organizations');
    const org = await orgs.findOne({ slug: 'teste' }, { projection: { _id: 1 } });
    const subs = mongo.db().collection('subscriptions');
    const original = await subs.findOne({ organizationId: org._id });
    await subs.updateOne({ organizationId: org._id }, { $set: patch });
    return original;
  } finally {
    await mongo.close();
  }
}

async function restaurarSubscription(original) {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  try {
    const subs = mongo.db().collection('subscriptions');
    const { _id, ...resto } = original;
    await subs.replaceOne({ _id }, resto);
  } finally {
    await mongo.close();
  }
}

// ── API ───────────────────────────────────────────────────────────────────────

test('API: subscription/checkout/cancel exigem token; /plans é público', async ({ request }) => {
  expect((await request.get('/api/billing/subscription')).status()).toBe(401);
  expect((await request.post('/api/billing/checkout', { data: { plan: 'basic' } })).status()).toBe(401);
  expect((await request.post('/api/billing/cancel', { data: {} })).status()).toBe(401);
  // a tabela de preços é pública por design (sem dado sensível)
  expect((await request.get('/api/billing/plans')).status()).toBe(200);
});

test('API: /plans retorna os 3 planos com preço, limites e features', async ({ request }) => {
  const { plans } = await (await request.get('/api/billing/plans')).json();
  for (const key of ['free', 'basic', 'pro']) {
    expect(plans, `plano ${key}`).toHaveProperty(key);
    expect(typeof plans[key].name).toBe('string');
    expect(typeof plans[key].price).toBe('number');
    expect(Array.isArray(plans[key].features)).toBe(true);
    expect(plans[key].limits).toHaveProperty('maxSessions');
    expect(plans[key].limits).toHaveProperty('maxStorage');
  }
  expect(plans.free.price).toBe(0);
  expect(plans.pro.limits.maxSessions).toBe(-1); // ilimitado
});

test('API: /subscription retorna assinatura, planDetails, stripeConfigured e storage real', async ({ page }) => {
  await H.loginAdmin(page);
  const r = await api(page, 'GET', '/api/billing/subscription');
  expect(r.status).toBe(200);
  const { subscription, planDetails, stripeConfigured, usage } = r.json;
  expect(['free', 'basic', 'pro']).toContain(subscription.plan);
  expect(subscription.limits).toHaveProperty('maxSessions');
  expect(subscription.usage).toHaveProperty('sessions');
  expect(planDetails.name).toBeTruthy(); // detalhes do plano atual
  expect(typeof stripeConfigured).toBe('boolean');
  // storage calculado em disco, com breakdown por área
  expect(typeof usage.storageMB).toBe('number');
  for (const k of ['sessionsMB', 'siteMB', 'videosMB']) {
    expect(typeof usage.breakdown[k], `breakdown.${k}`).toBe('number');
  }
});

test('API: cancel sem assinatura Stripe → 400 "Nenhuma assinatura ativa"', async ({ page }) => {
  await H.loginAdmin(page);
  const r = await api(page, 'POST', '/api/billing/cancel', {});
  expect(r.status).toBe(400);
  expect(r.json.error).toContain('Nenhuma assinatura ativa');
});

test('API: checkout sem Stripe configurado → erro limpo (sem checkoutUrl)', async ({ page }) => {
  await H.loginAdmin(page);
  const sub = (await api(page, 'GET', '/api/billing/subscription')).json;
  test.skip(sub.stripeConfigured, 'Stripe configurado neste ambiente — checkout real fora do escopo');
  const r = await api(page, 'POST', '/api/billing/checkout', { plan: 'basic' });
  expect(r.status).toBe(500);
  expect(r.json).not.toHaveProperty('checkoutUrl');
});

// ── UI ────────────────────────────────────────────────────────────────────────

test('UI: card do plano atual com 3 barras de uso, ∞ para ilimitado e breakdown de storage', async ({ page }) => {
  await H.loginAdmin(page);
  const d = (await api(page, 'GET', '/api/billing/subscription')).json;
  await irParaPlano(page);

  await expect(page.getByText(d.planDetails.name).first()).toBeVisible();
  // escopo no conteúdo — "Sessões" também existe no menu lateral
  for (const barra of ['Sessões', 'Fotos', 'Armazenamento (MB)']) {
    await expect(page.locator('#tabContent').getByText(barra, { exact: true })).toBeVisible();
  }
  // limites -1 viram ∞ (org teste tem maxSessions/maxPhotos ilimitados p/ a suíte)
  if (d.subscription.limits.maxSessions === -1) {
    await expect(page.getByText(/\/ ∞/).first()).toBeVisible();
  }
  // breakdown do disco
  await expect(page.getByText(`Sessões: ${d.usage.breakdown.sessionsMB} MB`)).toBeVisible();
  await expect(page.getByText(`Site: ${d.usage.breakdown.siteMB} MB`)).toBeVisible();
  await expect(page.getByText(`Vídeos: ${d.usage.breakdown.videosMB} MB`)).toBeVisible();
});

test('UI: seção de planos — card ATUAL desabilitado e pagos com "Em Breve" sem Stripe', async ({ page }) => {
  await H.loginAdmin(page);
  const d = (await api(page, 'GET', '/api/billing/subscription')).json;
  await irParaPlano(page);

  await expect(page.getByText('Planos Disponíveis')).toBeVisible();
  for (const nome of ['Free', 'Basic', 'Pro']) {
    await expect(page.getByText(nome, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText('ATUAL', { exact: true })).toBeVisible();
  await expect(page.locator('button', { hasText: 'Plano Atual' })).toBeDisabled();

  if (!d.stripeConfigured) {
    // sem gateway: botões de upgrade desabilitados com aviso
    const emBreve = page.locator('button', { hasText: 'Em Breve' });
    expect(await emBreve.count()).toBeGreaterThanOrEqual(1);
    await expect(emBreve.first()).toBeDisabled();
    await expect(page.getByText('Pagamentos online em breve').first()).toBeVisible();
    expect(await page.locator('.selectPlanBtn').count()).toBe(0);
  } else {
    expect(await page.locator('.selectPlanBtn').count()).toBeGreaterThanOrEqual(1);
  }
});

test('UI: barras mudam de cor por faixa de uso (70% amarelo, 90% vermelho + aviso)', async ({ page }) => {
  await H.loginAdmin(page);
  // storage real da org (~MBs); semeia limites que forcem as faixas
  const d = (await api(page, 'GET', '/api/billing/subscription')).json;
  const mb = Math.max(1, Math.ceil(d.usage.storageMB));
  const original = await patchSubscription({
    'limits.maxStorage': mb,                            // uso ≈ 100% → vermelho
    'limits.maxPhotos': Math.ceil(d.subscription.usage.photos / 0.75) || 100, // ≈75% → amarelo
  });
  try {
    await irParaPlano(page);
    await expect(page.getByText('⚠ Limite quase atingido').first()).toBeVisible();
    // cor inline: a barra de storage (vermelha) e a de fotos (amarela)
    const barras = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#tabContent div[style*="height:100%"]'))
        .map(el => el.getAttribute('style'));
    });
    expect(barras.some(s => s.includes('var(--ad-red)')), 'barra vermelha ≥90%').toBe(true);
    expect(barras.some(s => s.includes('var(--ad-yellow)')), 'barra amarela ≥70%').toBe(true);
  } finally {
    await restaurarSubscription(original);
  }
});

test('UI: plano free não mostra cancelamento e tem "Ver planos ↓" com scroll', async ({ page }) => {
  await H.loginAdmin(page);
  const original = await patchSubscription({ plan: 'free' });
  try {
    await irParaPlano(page);
    await expect(page.getByText('Cancelar assinatura')).not.toBeVisible();
    const verBtn = page.locator('#verPlansBtn');
    await expect(verBtn).toBeVisible();
    await verBtn.click();
    await page.waitForTimeout(800); // smooth scroll
    await expect(page.locator('#planosSection')).toBeInViewport();
  } finally {
    await restaurarSubscription(original);
  }
});

test('UI: cancelar assinatura — Manter aborta; confirmar sem Stripe → toast de erro', async ({ page }) => {
  await H.loginAdmin(page);
  await irParaPlano(page); // org teste é pro → card de cancelamento visível
  const cancelBtn = page.locator('#cancelBtn');
  await cancelBtn.scrollIntoViewIfNeeded();

  // Manter Plano → nada acontece
  await cancelBtn.click();
  await page.locator('#confirmCancel').click();
  await expect(cancelBtn).toBeEnabled();

  // Confirmar → POST /billing/cancel → 400 (sem stripeSubscriptionId) → toast de erro
  await cancelBtn.click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#toast-container')).toContainText('Nenhuma assinatura ativa', { timeout: 10000 });
});

test('UI: falha no carregamento → mensagem de erro (sem quebrar a aba)', async ({ page }) => {
  await H.loginAdmin(page);
  await page.route('**/api/billing/subscription', (route) => route.abort());
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('plano'));
  await expect(page.getByText(/Erro ao carregar/)).toBeVisible({ timeout: 10000 });
  await page.unroute('**/api/billing/subscription');
});
