// Exit-cortesia / iniciar cobrança de conta existente — validação E2E.
// Backend (super-admin): PUT /admin/organizations/:id/start-billing — guards (free→400,
// protegida→403 via mock, já-ativa→409) + transição (encerra cortesia, status=pending).
// Cliente: CTA "Pagar agora" na aba Plano quando status=pending + plano pago + sem cortesia,
// abrindo o CardForm (SDK do MP stubado, sem rede/cartão real).
//
// SEGURANÇA: nunca dispara checkout/refund real. Toda alteração no Mongo é restaurada.
// A subscription da org `teste` é compartilhada — todo teste restaura o que tocou.
const { test, expect } = require('@playwright/test');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const H = require('./helpers');

const MONGO_URI = 'mongodb://localhost:27017/cliquezoom-dev';
const SECRET = process.env.JWT_SECRET || 'fs-fotografias-secret-key';

// fetch com Authorization explícito (usado p/ o token de super-admin, distinto do fotógrafo).
async function apiAs(page, token, method, url, body) {
  return page.evaluate(async ({ token, method, url, body }) => {
    const res = await fetch(url, {
      method,
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  }, { token, method, url, body });
}

// fetch com o token do fotógrafo logado (localStorage).
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
async function superadminToken() {
  const m = await mongo();
  const sa = await m.db().collection('users').findOne({ role: 'superadmin' }, { projection: { _id: 1 } });
  return jwt.sign({ userId: String(sa._id), role: 'superadmin' }, SECRET, { expiresIn: '10m' });
}

async function irParaPlano(page) {
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('plano'));
  await expect(page.getByText('Seu Plano', { exact: true })).toBeVisible({ timeout: 10000 });
}

test.afterAll(async () => { if (_mongo) await _mongo.close(); });

// ── BACKEND (super-admin) ─────────────────────────────────────────────────────────

test('API: start-billing exige super-admin (fotógrafo comum → 403)', async ({ page }) => {
  await H.loginAdmin(page);
  const orgId = String(await orgTesteId());
  // token do fotógrafo (não superadmin) → requireSuperadmin barra.
  const r = await api(page, 'PUT', `/api/admin/organizations/${orgId}/start-billing`, {});
  expect(r.status).toBe(403);
});

test('API: start-billing — guards (free→400, já-ativa→409)', async ({ page }) => {
  await H.loginAdmin(page);
  const orgId = String(await orgTesteId());
  const token = await superadminToken();

  // plano free → 400 (nada a cobrar)
  let original = await patchSubscription({ plan: 'free' });
  try {
    expect((await apiAs(page, token, 'PUT', `/api/admin/organizations/${orgId}/start-billing`, {})).status).toBe(400);
  } finally { await restaurarSubscription(original); }

  // assinatura paga viva (não cortesia) → 409
  original = await patchSubscription({ plan: 'pro', status: 'active', isCourtesy: false, mpPreapprovalId: 'live-fake-id' });
  try {
    expect((await apiAs(page, token, 'PUT', `/api/admin/organizations/${orgId}/start-billing`, {})).status).toBe(409);
  } finally { await restaurarSubscription(original); }
});

test('API: start-billing em cortesia paga → encerra cortesia + status=pending', async ({ page }) => {
  await H.loginAdmin(page);
  const orgId = String(await orgTesteId());
  const token = await superadminToken();

  const original = await patchSubscription({ plan: 'pro', status: 'active', isCourtesy: true, courtesyNote: 'Sócio', cancelAtPeriodEnd: true });
  try {
    const r = await apiAs(page, token, 'PUT', `/api/admin/organizations/${orgId}/start-billing`, {});
    expect(r.status).toBe(200);
    expect(r.json.subStatus).toBe('pending');
    // confirma o estado persistido
    const sub = await lerSubscription();
    expect(sub.status).toBe('pending');
    expect(sub.isCourtesy).toBe(false);
    expect(sub.cancelAtPeriodEnd).toBe(false);
  } finally { await restaurarSubscription(original); }
});

// ── CLIENTE (aba Plano) ─────────────────────────────────────────────────────────

test('UI: "Pagar agora" aparece só com cobrança pendente em plano pago não-cortesia', async ({ page }) => {
  await H.loginAdmin(page);

  // pendente + pro + sem cortesia → CTA visível
  let original = await patchSubscription({ plan: 'pro', status: 'pending', isCourtesy: false, mpPreapprovalId: null });
  try {
    await irParaPlano(page);
    await expect(page.locator('#payNowBtn')).toBeVisible();
    await expect(page.locator('#payNowBtn')).toHaveText('Pagar agora');
  } finally { await restaurarSubscription(original); }

  // assinatura ativa → sem CTA
  original = await patchSubscription({ plan: 'pro', status: 'active', isCourtesy: false, mpPreapprovalId: 'live-fake-id' });
  try {
    await irParaPlano(page);
    await expect(page.locator('#payNowBtn')).toHaveCount(0);
  } finally { await restaurarSubscription(original); }

  // cortesia (mesmo pendente) → sem CTA (cortesia não vê cobrança)
  original = await patchSubscription({ plan: 'pro', status: 'pending', isCourtesy: true });
  try {
    await irParaPlano(page);
    await expect(page.locator('#payNowBtn')).toHaveCount(0);
  } finally { await restaurarSubscription(original); }
});

test('UI: "Pagar agora" abre o CardForm do plano atual (com aceite recorrente)', async ({ page }) => {
  await H.loginAdmin(page);
  const original = await patchSubscription({ plan: 'pro', status: 'pending', isCourtesy: false, mpPreapprovalId: null });
  try {
    await irParaPlano(page);

    // Stub do SDK do MP (curto-circuito de loadMercadoPagoSdk se window.MercadoPago existe).
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

    await page.locator('#payNowBtn').click();

    // Modal de cartão aberto, com o aceite de recorrência (CDC 39 III) travando o submit.
    await expect(page.locator('#czConsent')).toBeVisible();
    await expect(page.locator('#czCardSubmit')).toBeDisabled();
    await page.locator('#czConsent').check();
    await expect(page.locator('#czCardSubmit')).toBeEnabled();
  } finally { await restaurarSubscription(original); }
});
