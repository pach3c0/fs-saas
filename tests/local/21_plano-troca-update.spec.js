// Fase 1 (SEM pró-rata) — E2E da TROCA de plano de quem JÁ é assinante ativo.
// Verifica o comportamento NOVO do handler .selectPlanBtn em admin/js/tabs/plano.js:
//   - assinante ativo (status='active' + mpPreapprovalId) → showConfirm SEM CardForm,
//     POST /checkout SEM cartão, trata { mode:'updated' } com toast de sucesso;
//   - cancelar o confirm NÃO dispara POST;
//   - quem NÃO é assinante ativo cai no CardForm (outra branch), nunca no confirm de troca.
// A resposta do /checkout é MOCKADA (page.route) — não toca MP nem cobra. A sub da org
// `teste` é restaurada ao fim de cada teste.
const { test, expect } = require('@playwright/test');
const { MongoClient } = require('mongodb');
const H = require('./helpers');

const MONGO_URI = 'mongodb://localhost:27017/cliquezoom-dev';

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
  } finally { await mongo.close(); }
}

async function restaurarSubscription(original) {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  try {
    const { _id, ...resto } = original;
    await mongo.db().collection('subscriptions').replaceOne({ _id }, resto);
  } finally { await mongo.close(); }
}

async function irParaPlano(page) {
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('plano'));
  await expect(page.getByText('Seu Plano', { exact: true })).toBeVisible({ timeout: 10000 });
}

test('assinante ATIVO troca p/ Pro → confirm (sem CardForm) + POST sem cartão + toast', async ({ page }) => {
  await H.loginAdmin(page);
  const original = await patchSubscription({
    plan: 'basic', status: 'active', isCourtesy: false, mpPreapprovalId: 'PA-E2E-LIVE',
  });
  try {
    let captured = null, postCount = 0;
    await page.route('**/api/billing/checkout', async (route) => {
      postCount++;
      captured = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ mode: 'updated', status: 'active', plan: 'pro' }) });
    });

    await irParaPlano(page);
    const proBtn = page.locator('.selectPlanBtn[data-plan="pro"]');
    await expect(proBtn).toBeVisible();
    await proBtn.click();

    // showConfirm aparece (NÃO o CardForm)
    const modal = page.locator('#confirm-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h3')).toContainText('Mudar para o Pro');
    await expect(modal.locator('p')).toContainText('nada é cobrado neste momento');
    await expect(modal.locator('p')).toContainText('119'); // valor efetivo do Pro
    await expect(page.locator('#czCardForm')).toHaveCount(0); // não abriu cartão

    await modal.locator('#confirmOk').click();

    // toast de sucesso (garante que o POST resolveu)
    await expect(page.locator('#toast-container')).toContainText('Plano alterado', { timeout: 10000 });
    // POST disparou 1x, com { plan:'pro' } e SEM cardTokenId
    expect(postCount).toBe(1);
    expect(captured).toEqual({ plan: 'pro' });
    expect(captured.cardTokenId).toBeUndefined();
  } finally { await restaurarSubscription(original); }
});

test('cancelar o confirm de troca NÃO dispara POST', async ({ page }) => {
  await H.loginAdmin(page);
  const original = await patchSubscription({
    plan: 'basic', status: 'active', isCourtesy: false, mpPreapprovalId: 'PA-E2E-LIVE',
  });
  try {
    let postCount = 0;
    await page.route('**/api/billing/checkout', async (route) => {
      postCount++;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ mode: 'updated' }) });
    });

    await irParaPlano(page);
    await page.locator('.selectPlanBtn[data-plan="pro"]').click();
    const modal = page.locator('#confirm-modal');
    await expect(modal).toBeVisible();
    await modal.locator('#confirmCancel').click();
    await expect(modal).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(postCount).toBe(0);
  } finally { await restaurarSubscription(original); }
});

test('quem NÃO é assinante ativo abre o CardForm — nunca o confirm de troca', async ({ page }) => {
  await H.loginAdmin(page);
  const original = await patchSubscription({
    plan: 'free', status: 'active', isCourtesy: false, mpPreapprovalId: null,
  });
  try {
    // Stub do SDK do MP p/ o CardForm renderizar sem depender da CDN (loadMercadoPagoSdk
    // early-returns quando window.MercadoPago existe).
    await page.addInitScript(() => {
      window.MercadoPago = function () {
        return { cardForm: () => ({ mount() {}, unmount() {}, getCardFormData: () => ({}) }) };
      };
    });
    let postCount = 0;
    await page.route('**/api/billing/checkout', async (route) => {
      postCount++;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ mode: 'authorized' }) });
    });

    await irParaPlano(page);
    await page.locator('.selectPlanBtn[data-plan="pro"]').click();

    await expect(page.locator('#czCardForm')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#confirm-modal')).toHaveCount(0);
    expect(postCount).toBe(0); // CardForm só posta após tokenizar o cartão
  } finally { await restaurarSubscription(original); }
});
