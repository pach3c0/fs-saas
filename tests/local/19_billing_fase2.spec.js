// Billing Fase 2 — validação E2E (CDC): arrependimento (Art. 49, reembolso 1ª compra) +
// aceite recorrente (Art. 39 III). Cobre backend (elegibilidade no /subscription, guards do
// POST /refund, guard de consentimento no /checkout) e UI (botão de reembolso por canRefund,
// trava do submit do CardForm até marcar o aceite).
//
// SEGURANÇA: nunca toca o MP nem dispara refund REAL (ambiente dev = não-live: token TEST +
// MP_TEST_PAYER_EMAIL). Exercita branches de REJEIÇÃO + leitura e o caminho de refund MANUAL
// (sem mpPreapprovalId → sem chamada ao MP), sempre restaurando a fixture. A subscription da org
// `teste` é compartilhada — todo teste restaura o que tocou.
const { test, expect } = require('@playwright/test');
const { MongoClient } = require('mongodb');
const H = require('./helpers');

const MONGO_URI = 'mongodb://localhost:27017/cliquezoom-dev';
const DIA = 86400000;

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

// Client Mongo único e reusado (abrir/fechar por chamada expira a sessão entre 3 ops na mesma
// sequência — espelha o padrão singleton do spec 20). Fechado no afterAll.
let _mongo;
async function mongo() {
  if (!_mongo) { _mongo = new MongoClient(MONGO_URI); await _mongo.connect(); }
  return _mongo;
}
async function orgTesteId() {
  const m = await mongo();
  const org = await m.db().collection('organizations').findOne({ slug: 'teste' }, { projection: { _id: 1 } });
  return org._id;
}

// Aplica patch na subscription da org teste; devolve o doc original p/ restaurar.
async function patchSubscription(patch) {
  const m = await mongo();
  const orgId = await orgTesteId();
  const subs = m.db().collection('subscriptions');
  const original = await subs.findOne({ organizationId: orgId });
  await subs.updateOne({ organizationId: orgId }, { $set: patch });
  return original;
}

async function restaurarSubscription(original) {
  const m = await mongo();
  const { _id, ...resto } = original;
  await m.db().collection('subscriptions').replaceOne({ _id }, resto);
}

async function lerSubscription() {
  const m = await mongo();
  return m.db().collection('subscriptions').findOne({ organizationId: await orgTesteId() });
}

test.afterAll(async () => { if (_mongo) await _mongo.close(); });

async function irParaPlano(page) {
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('plano'));
  await expect(page.getByText('Seu Plano', { exact: true })).toBeVisible({ timeout: 10000 });
}

// Estado-base que torna a 1ª compra reembolsável (dentro da janela de 7 dias).
const PRIMEIRA_COMPRA_NA_JANELA = {
  plan: 'pro', previousPlan: 'free', status: 'active',
  isCourtesy: false, overrideEnabled: false, refundInFlight: false,
};

// ── BACKEND ─────────────────────────────────────────────────────────────────────

test('API: GET /subscription expõe refund {kind, canRefund, refundWindowEndsAt} conforme estado', async ({ page }) => {
  await H.loginAdmin(page);

  // (a) 1ª compra dentro da janela → canRefund=true, kind=first_purchase, janela no futuro
  let original = await patchSubscription({ ...PRIMEIRA_COMPRA_NA_JANELA, subscribedAt: new Date() });
  try {
    const r = (await api(page, 'GET', '/api/billing/subscription')).json;
    expect(r.refund).toBeTruthy();
    expect(r.refund.kind).toBe('first_purchase');
    expect(r.refund.canRefund).toBe(true);
    expect(new Date(r.refund.refundWindowEndsAt).getTime()).toBeGreaterThan(Date.now());
  } finally { await restaurarSubscription(original); }

  // (b) fora da janela (30 dias atrás) → canRefund=false
  original = await patchSubscription({ ...PRIMEIRA_COMPRA_NA_JANELA, subscribedAt: new Date(Date.now() - 30 * DIA) });
  try {
    const r = (await api(page, 'GET', '/api/billing/subscription')).json;
    expect(r.refund.kind).toBe('first_purchase');
    expect(r.refund.canRefund).toBe(false);
  } finally { await restaurarSubscription(original); }

  // (c) upgrade (previousPlan pago) → kind=upgrade, canRefund=false mesmo dentro da janela
  original = await patchSubscription({ plan: 'pro', previousPlan: 'basic', status: 'active', isCourtesy: false, overrideEnabled: false, subscribedAt: new Date() });
  try {
    const r = (await api(page, 'GET', '/api/billing/subscription')).json;
    expect(r.refund.kind).toBe('upgrade');
    expect(r.refund.canRefund).toBe(false);
  } finally { await restaurarSubscription(original); }
});

test('API: POST /refund respeita os guards (free→400, cortesia/override→403, upgrade/janela→422)', async ({ page }) => {
  await H.loginAdmin(page);

  // free → 400 (nada pago a reembolsar)
  let original = await patchSubscription({ plan: 'free' });
  try {
    const r = await api(page, 'POST', '/api/billing/refund', {});
    expect(r.status).toBe(400);
  } finally { await restaurarSubscription(original); }

  // cortesia → 403
  original = await patchSubscription({ ...PRIMEIRA_COMPRA_NA_JANELA, isCourtesy: true, subscribedAt: new Date() });
  try {
    expect((await api(page, 'POST', '/api/billing/refund', {})).status).toBe(403);
  } finally { await restaurarSubscription(original); }

  // override (plano personalizado) → 403
  original = await patchSubscription({ ...PRIMEIRA_COMPRA_NA_JANELA, overrideEnabled: true, subscribedAt: new Date() });
  try {
    expect((await api(page, 'POST', '/api/billing/refund', {})).status).toBe(403);
  } finally { await restaurarSubscription(original); }

  // upgrade (previousPlan pago) → 422
  original = await patchSubscription({ plan: 'pro', previousPlan: 'basic', status: 'active', isCourtesy: false, overrideEnabled: false, subscribedAt: new Date() });
  try {
    expect((await api(page, 'POST', '/api/billing/refund', {})).status).toBe(422);
  } finally { await restaurarSubscription(original); }

  // 1ª compra FORA da janela → 422
  original = await patchSubscription({ ...PRIMEIRA_COMPRA_NA_JANELA, subscribedAt: new Date(Date.now() - 30 * DIA) });
  try {
    expect((await api(page, 'POST', '/api/billing/refund', {})).status).toBe(422);
  } finally { await restaurarSubscription(original); }
});

test('API: POST /checkout com cardTokenId exige recurringConsent (CDC 39 III) → 400', async ({ page }) => {
  await H.loginAdmin(page);
  // cartão tokenizado SEM aceite → 400 antes de qualquer chamada ao MP (token falso nunca é usado).
  const semAceite = await api(page, 'POST', '/api/billing/checkout', { plan: 'basic', cardTokenId: 'fake-token-xyz' });
  expect(semAceite.status).toBe(400);
  expect(semAceite.json.error).toContain('autorizar');

  const recusado = await api(page, 'POST', '/api/billing/checkout', { plan: 'basic', cardTokenId: 'fake-token-xyz', recurringConsent: false });
  expect(recusado.status).toBe(400);
});

// Caminho de refund MANUAL (dev = não-live, e SEM mpPreapprovalId → zero contato com o MP):
// prova que o handler restruturado reverte pro Free + congela + LIBERA a trava refundInFlight.
test('API: POST /refund (manual, sem MP) → reverte pro Free, congela e libera refundInFlight', async ({ page }) => {
  await H.loginAdmin(page);
  const original = await patchSubscription({
    ...PRIMEIRA_COMPRA_NA_JANELA, subscribedAt: new Date(),
    firstPaymentId: null, mpPreapprovalId: null, refundInFlight: false, revertedAt: null, storageFrozen: false,
  });
  try {
    const r = await api(page, 'POST', '/api/billing/refund', {});
    expect(r.status).toBe(200);
    expect(r.json.manual).toBe(true);            // sem firstPaymentId/não-live → caminho manual
    const sub = await lerSubscription();
    expect(sub.plan).toBe('free');               // revertSubscriptionToFree aplicou
    expect(sub.status).toBe('canceled');
    expect(sub.storageFrozen).toBe(true);        // freeze do arrependimento (congela uso comercial)
    expect(sub.refundInFlight).toBe(false);      // trava liberada (não prende o cliente)
    expect(sub.revertedAt).toBeTruthy();
  } finally { await restaurarSubscription(original); }
});

// Lock atômico: um refund já em curso (refundInFlight=true) barra o 2º POST com 409 — e NÃO muta nada.
test('API: POST /refund com refundInFlight=true → 409 (lock) sem reverter', async ({ page }) => {
  await H.loginAdmin(page);
  const original = await patchSubscription({
    ...PRIMEIRA_COMPRA_NA_JANELA, subscribedAt: new Date(),
    firstPaymentId: null, mpPreapprovalId: null, refundInFlight: true, revertedAt: null,
  });
  try {
    const r = await api(page, 'POST', '/api/billing/refund', {});
    expect(r.status).toBe(409);
    const sub = await lerSubscription();
    expect(sub.plan).toBe('pro');                // não reverteu — o lock barrou antes de qualquer mutação
  } finally { await restaurarSubscription(original); }
});

// ── UI ──────────────────────────────────────────────────────────────────────────

test('UI: botão "Cancelar e reembolsar" aparece só quando refund.canRefund', async ({ page }) => {
  await H.loginAdmin(page);

  // canRefund=true → botão visível
  let original = await patchSubscription({ ...PRIMEIRA_COMPRA_NA_JANELA, subscribedAt: new Date() });
  try {
    await irParaPlano(page);
    await expect(page.locator('#refundBtn')).toBeVisible();
    await expect(page.locator('#refundBtn')).toHaveText('Cancelar e reembolsar');
  } finally { await restaurarSubscription(original); }

  // fora da janela → bloco some
  original = await patchSubscription({ ...PRIMEIRA_COMPRA_NA_JANELA, subscribedAt: new Date(Date.now() - 30 * DIA) });
  try {
    await irParaPlano(page);
    await expect(page.locator('#refundBtn')).toHaveCount(0);
  } finally { await restaurarSubscription(original); }
});

test('UI: aceite recorrente trava o submit do CardForm até marcar (CDC 39 III)', async ({ page }) => {
  await H.loginAdmin(page);
  // free + sem preapproval → clicar num plano pago abre o CardForm (assinatura nova, não troca).
  const original = await patchSubscription({ plan: 'free', mpPreapprovalId: null, status: 'active', isCourtesy: false, overrideEnabled: false });
  try {
    await irParaPlano(page);

    // Stub do SDK do MP: loadMercadoPagoSdk faz curto-circuito se window.MercadoPago já existe.
    // O cardForm fake dispara onFormMounted (→ formMounted=true) sem tocar a rede do MP.
    await page.evaluate(() => {
      window.MercadoPago = function () {
        return {
          cardForm: (opts) => {
            Promise.resolve().then(() => opts.callbacks.onFormMounted && opts.callbacks.onFormMounted(null));
            return { getCardFormData: () => ({ token: 'fake' }), unmount: () => {} };
          },
        };
      };
    });

    await page.locator('.selectPlanBtn[data-plan="basic"]').first().click();

    // Modal aberto: checkbox de aceite presente e desmarcado; submit travado mesmo após montar.
    await expect(page.locator('#czConsent')).toBeVisible();
    await expect(page.locator('#czConsent')).not.toBeChecked();
    await expect(page.locator('#czCardSubmit')).toHaveText('Assinar agora'); // formMounted=true
    await expect(page.locator('#czCardSubmit')).toBeDisabled();

    // Marca o aceite → libera
    await page.locator('#czConsent').check();
    await expect(page.locator('#czCardSubmit')).toBeEnabled();

    // Desmarca → trava de novo
    await page.locator('#czConsent').uncheck();
    await expect(page.locator('#czCardSubmit')).toBeDisabled();
  } finally { await restaurarSubscription(original); }
});
