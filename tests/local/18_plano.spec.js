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

test('API: cancel sem plano pago (Free) → 400 "Nenhuma assinatura ativa"', async ({ page }) => {
  await H.loginAdmin(page);
  // Pós-migração MP: o cancel só devolve 400 quando o plano é Free (não há recorrência a matar).
  const original = await patchSubscription({ plan: 'free' });
  try {
    const r = await api(page, 'POST', '/api/billing/cancel', {});
    expect(r.status).toBe(400);
    expect(r.json.error).toContain('Nenhuma assinatura ativa');
  } finally {
    await restaurarSubscription(original);
  }
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

  // escopo no #tabContent: "Pro" casa como substring de "Produtos / Serviços" na sidebar
  await expect(page.locator('#tabContent').getByText(d.planDetails.name).first()).toBeVisible();
  // escopo no conteúdo — "Sessões" também existe no menu lateral
  for (const barra of ['Sessões', 'Fotos', 'Armazenamento — fotos (MB)']) {
    await expect(page.locator('#tabContent').getByText(barra, { exact: true })).toBeVisible();
  }
  // limites -1 viram ∞ — a UI usa os limites EFETIVOS (d.limits, derivados de plans.js)
  if (d.limits.maxSessions === -1) {
    await expect(page.getByText(/\/ ∞/).first()).toBeVisible();
  }
  // breakdown do disco (labels atuais do medidor)
  await expect(page.getByText(`Fotos das sessões: ${d.usage.breakdown.sessionsMB} MB`)).toBeVisible();
  await expect(page.getByText(`Site/logo: ${d.usage.breakdown.siteMB} MB`)).toBeVisible();
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

test('UI: barras mudam de cor por faixa de uso (≥70% amarelo, ≥90% vermelho + aviso)', async ({ page }) => {
  await H.loginAdmin(page);
  // Os limites EFETIVOS derivam de plans.js (fonte única) e IGNORAM sub.limits — exceto
  // com overrideEnabled, que faz valer o sub.limits gravado. Forçamos as faixas via override
  // + contadores de uso semeados (usage.sessions/photos ficam no doc da assinatura).
  const original = await patchSubscription({
    overrideEnabled: true,
    'limits.maxSessions': 100, 'usage.sessions': 95,   // 95% → vermelho + aviso
    'limits.maxPhotos': 100,   'usage.photos': 75,     // 75% → amarelo
  });
  try {
    await irParaPlano(page);
    await expect(page.getByText('⚠ Limite quase atingido').first()).toBeVisible();
    // cor inline: a barra de sessões (vermelha ≥90%) e a de fotos (amarela ≥70%)
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

test('UI: cancelar assinatura — "Manter" não dispara POST; confirmar dispara e mostra toast', async ({ page }) => {
  await H.loginAdmin(page);
  // Intercepta o cancel pra teste determinístico — não toca o MP real nem altera a fixture
  // (org teste pro pode ter mpPreapprovalId; um cancel real mutaria o estado compartilhado).
  let cancelCalls = 0;
  await page.route('**/api/billing/cancel', async (route) => {
    cancelCalls++;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await irParaPlano(page); // org teste é pro → card de cancelamento visível
  const cancelBtn = page.locator('#cancelBtn');
  await cancelBtn.scrollIntoViewIfNeeded();

  // "Manter Plano" (#confirmCancel) → aborta, NENHUM POST
  await cancelBtn.click();
  await page.locator('#confirmCancel').click();
  await expect(cancelBtn).toBeEnabled();
  expect(cancelCalls).toBe(0);

  // "Cancelar Plano" (#confirmOk) → dispara POST → toast de sucesso
  await cancelBtn.click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#toast-container')).toContainText('Cancelamento agendado', { timeout: 10000 });
  expect(cancelCalls).toBe(1);
});

test('UI: falha no carregamento → mensagem de erro (sem quebrar a aba)', async ({ page }) => {
  await H.loginAdmin(page);
  await page.route('**/api/billing/subscription', (route) => route.abort());
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('plano'));
  await expect(page.getByText(/Erro ao carregar/)).toBeVisible({ timeout: 10000 });
  await page.unroute('**/api/billing/subscription');
});
