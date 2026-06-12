// Domínio — cobertura exaustiva: API (status, validação de formato, normalização, duplicado em
// outra org, re-salvar o próprio, verify sem/with domínio, verify com DNS real propagado, DELETE
// com $unset + idempotente, 401 sem token) + UI (estado vazio, adicionar inválido/vazio/válido,
// instruções DNS, verificar não propagado, fluxo verificado, remover com cancelar/confirmar).
// Usa cliquezoom.com.br como domínio "propagado" (A record real → 5.189.174.18, o SERVER_IP default).
const { test, expect } = require('@playwright/test');
const { MongoClient } = require('mongodb');
const H = require('./helpers');

const MONGO_URI = 'mongodb://localhost:27017/cliquezoom-dev';
const DOM_TESTE = 'www.test-e2e-dominio.com.br'; // não resolve no DNS (verify deve falhar)
const DOM_REAL = 'cliquezoom.com.br'; // resolve para o IP do servidor (verify deve passar)
const ORG_DUP_SLUG = 'test-e2e-org-dup';

// fetch autenticado dentro da page (mesmo padrão dos outros specs)
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

async function limparDominio(page) {
  await api(page, 'DELETE', '/api/domains');
}

async function irParaDominio(page) {
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('dominio'));
  await expect(page.getByText('Domínio Personalizado').first()).toBeVisible({ timeout: 10000 });
}

// ── API ────────────────────────────────────────────────────────────────────

test('API: rotas exigem autenticação (401 sem token)', async ({ request }) => {
  expect((await request.get('/api/domains/status')).status()).toBe(401);
  expect((await request.post('/api/domains', { data: { domain: 'x.com.br' } })).status()).toBe(401);
  expect((await request.delete('/api/domains')).status()).toBe(401);
});

test('API: status sem domínio — formato da resposta', async ({ page }) => {
  await H.loginAdmin(page);
  await limparDominio(page);
  const r = await api(page, 'GET', '/api/domains/status');
  expect(r.status).toBe(200);
  expect(r.json.success).toBe(true);
  expect(r.json.customDomain).toBeNull();
  expect(r.json.serverIP).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
});

test('API: formatos inválidos de domínio → 400', async ({ page }) => {
  await H.loginAdmin(page);
  await limparDominio(page);
  const invalidos = ['abc', 'foo_bar.com', '-foo.com', 'foo..com', 'foo.c', 'foo bar.com', ''];
  for (const dominio of invalidos) {
    const r = await api(page, 'POST', '/api/domains', { domain: dominio });
    expect(r.status, `"${dominio}" deveria ser rejeitado`).toBe(400);
    expect(r.json.error).toBe('Domínio inválido');
  }
  // body sem o campo domain
  const semCampo = await api(page, 'POST', '/api/domains', {});
  expect(semCampo.status).toBe(400);
});

test('API: adicionar domínio válido → pending + instruções de DNS', async ({ page }) => {
  await H.loginAdmin(page);
  await limparDominio(page);
  const r = await api(page, 'POST', '/api/domains', { domain: DOM_TESTE });
  expect(r.status).toBe(200);
  expect(r.json.success).toBe(true);
  expect(r.json.instructions.type).toBe('A Record');
  expect(r.json.instructions.name).toBe(DOM_TESTE);
  expect(r.json.instructions.value).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
  expect(r.json.instructions.ttl).toBe(3600);

  const st = await api(page, 'GET', '/api/domains/status');
  expect(st.json.customDomain).toBe(DOM_TESTE);
  expect(st.json.domainStatus).toBe('pending');
  await limparDominio(page);
});

test('API: normaliza maiúsculas e espaços antes de salvar', async ({ page }) => {
  await H.loginAdmin(page);
  await limparDominio(page);
  const r = await api(page, 'POST', '/api/domains', { domain: '  WWW.Test-E2E-Dominio.COM.BR  ' });
  expect(r.status).toBe(200);
  const st = await api(page, 'GET', '/api/domains/status');
  expect(st.json.customDomain).toBe(DOM_TESTE);
  await limparDominio(page);
});

test('API: re-salvar o próprio domínio não acusa "outra conta"', async ({ page }) => {
  await H.loginAdmin(page);
  await limparDominio(page);
  expect((await api(page, 'POST', '/api/domains', { domain: DOM_TESTE })).status).toBe(200);
  const denovo = await api(page, 'POST', '/api/domains', { domain: DOM_TESTE });
  expect(denovo.status).toBe(200);
  expect(denovo.json.success).toBe(true);
  await limparDominio(page);
});

test('API: domínio já usado por OUTRA org → 400', async ({ page }) => {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const orgs = mongo.db().collection('organizations');
  const dominioDaOutra = 'www.test-e2e-org-dup.com.br';
  try {
    await orgs.deleteMany({ slug: ORG_DUP_SLUG });
    await orgs.insertOne({
      name: 'Org Dup E2E', slug: ORG_DUP_SLUG,
      customDomain: dominioDaOutra, domainStatus: 'pending',
    });

    await H.loginAdmin(page);
    await limparDominio(page);
    const r = await api(page, 'POST', '/api/domains', { domain: dominioDaOutra });
    expect(r.status).toBe(400);
    expect(r.json.error).toBe('Domínio já cadastrado em outra conta');
  } finally {
    await orgs.deleteMany({ slug: ORG_DUP_SLUG });
    await mongo.close();
  }
});

test('API: verify sem domínio configurado → 400', async ({ page }) => {
  await H.loginAdmin(page);
  await limparDominio(page);
  const r = await api(page, 'POST', '/api/domains/verify');
  expect(r.status).toBe(400);
  expect(r.json.error).toBe('Nenhum domínio configurado');
});

test('API: verify com DNS não propagado → success:false, continua pending', async ({ page }) => {
  await H.loginAdmin(page);
  await limparDominio(page);
  await api(page, 'POST', '/api/domains', { domain: DOM_TESTE });
  const r = await api(page, 'POST', '/api/domains/verify');
  expect(r.status).toBe(200);
  expect(r.json.success).toBe(false);
  expect(r.json.message).toContain('não propagado');
  const st = await api(page, 'GET', '/api/domains/status');
  expect(st.json.domainStatus).toBe('pending');
  await limparDominio(page);
});

test('API: verify com DNS propagado → verified + domainVerifiedAt', async ({ page }) => {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  try {
    await H.loginAdmin(page);
    await limparDominio(page);
    await api(page, 'POST', '/api/domains', { domain: DOM_REAL });
    const r = await api(page, 'POST', '/api/domains/verify');
    expect(r.status).toBe(200);
    expect(r.json.success).toBe(true);
    expect(r.json.message).toContain('verificado com sucesso');

    const st = await api(page, 'GET', '/api/domains/status');
    expect(st.json.domainStatus).toBe('verified');

    const org = await mongo.db().collection('organizations').findOne({ slug: 'teste' });
    expect(org.domainVerifiedAt).toBeInstanceOf(Date);
    await limparDominio(page);
  } finally {
    await mongo.close();
  }
});

test('API: DELETE remove o campo do documento ($unset, não null) e é idempotente', async ({ page }) => {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  try {
    await H.loginAdmin(page);
    await api(page, 'POST', '/api/domains', { domain: DOM_TESTE });
    const r = await api(page, 'DELETE', '/api/domains');
    expect(r.status).toBe(200);
    expect(r.json.success).toBe(true);

    // customDomain tem índice unique sparse: null gravado colidiria entre orgs — o campo
    // precisa SUMIR do documento, não virar null
    const org = await mongo.db().collection('organizations').findOne({ slug: 'teste' });
    expect('customDomain' in org).toBe(false);
    expect('domainVerifiedAt' in org).toBe(false);
    expect(org.domainStatus).toBe('pending');

    // idempotente: deletar de novo segue 200
    const denovo = await api(page, 'DELETE', '/api/domains');
    expect(denovo.status).toBe(200);
  } finally {
    await mongo.close();
  }
});

// ── UI ─────────────────────────────────────────────────────────────────────

test('UI: estado vazio — formulário de adicionar, sem instruções', async ({ page }) => {
  await H.loginAdmin(page);
  await limparDominio(page);
  await irParaDominio(page);
  await expect(page.locator('#inputDomain')).toBeVisible();
  await expect(page.locator('#inputDomain')).toHaveAttribute('placeholder', 'ex: www.seunome.com.br');
  await expect(page.locator('#btnAdd')).toHaveText(/Adicionar/);
  await expect(page.locator('#btnVerify')).toHaveCount(0);
  await expect(page.locator('#btnRemove')).toHaveCount(0);
  await expect(page.getByText('Instruções de Configuração DNS')).toHaveCount(0);
});

test('UI: adicionar vazio é no-op; inválido → toast de erro; válido → card pending + instruções', async ({ page }) => {
  await H.loginAdmin(page);
  await limparDominio(page);
  await irParaDominio(page);

  // vazio: nada acontece
  await page.locator('#btnAdd').click();
  await expect(page.locator('#inputDomain')).toBeVisible();

  // inválido: toast de erro, formulário permanece
  await page.locator('#inputDomain').fill('dominio_invalido');
  await page.locator('#btnAdd').click();
  await expect(page.locator('#toast-container')).toContainText('Domínio inválido');
  await expect(page.locator('#inputDomain')).toBeVisible();

  // válido: card ativo aguardando verificação + bloco de instruções DNS
  await page.locator('#inputDomain').fill(DOM_TESTE);
  await page.locator('#btnAdd').click();
  await expect(page.getByText(DOM_TESTE).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Aguardando verificação DNS')).toBeVisible();
  await expect(page.locator('#btnVerify')).toHaveText(/Verificar DNS/);
  await expect(page.locator('#btnRemove')).toBeVisible();
  await expect(page.getByText('Instruções de Configuração DNS')).toBeVisible();
  const tabela = page.locator('table');
  await expect(tabela).toContainText('A Record');
  await expect(tabela).toContainText(DOM_TESTE);
  await expect(tabela).toContainText(/\d+\.\d+\.\d+\.\d+/);
  await expect(tabela).toContainText('3600');

  await limparDominio(page);
});

test('UI: verificar DNS não propagado → toast informativo, botão reabilitado', async ({ page }) => {
  await H.loginAdmin(page);
  await limparDominio(page);
  await api(page, 'POST', '/api/domains', { domain: DOM_TESTE });
  await irParaDominio(page);

  await page.locator('#btnVerify').click();
  await expect(page.locator('#toast-container')).toContainText('não propagado');
  await expect(page.locator('#btnVerify')).toHaveText(/Verificar DNS/);
  await expect(page.locator('#btnVerify')).toBeEnabled();
  await expect(page.getByText('Aguardando verificação DNS')).toBeVisible();

  await limparDominio(page);
});

test('UI: fluxo verificado — badge verde, sem botão Verificar nem instruções', async ({ page }) => {
  await H.loginAdmin(page);
  await limparDominio(page);
  await irParaDominio(page);

  await page.locator('#inputDomain').fill(DOM_REAL);
  await page.locator('#btnAdd').click();
  await expect(page.locator('#btnVerify')).toBeVisible({ timeout: 10000 });

  await page.locator('#btnVerify').click();
  await expect(page.locator('#toast-container')).toContainText('verificado com sucesso', { timeout: 15000 });
  await expect(page.getByText('✓ Verificado e Ativo')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#btnVerify')).toHaveCount(0);
  await expect(page.getByText('Instruções de Configuração DNS')).toHaveCount(0);
  await expect(page.locator('#btnRemove')).toBeVisible();

  await limparDominio(page);
});

test('UI: remover — cancelar mantém, confirmar volta ao formulário', async ({ page }) => {
  await H.loginAdmin(page);
  await limparDominio(page);
  await api(page, 'POST', '/api/domains', { domain: DOM_TESTE });
  await irParaDominio(page);

  // cancelar: domínio continua
  await page.locator('#btnRemove').click();
  await page.locator('#confirmCancel').click();
  await expect(page.getByText(DOM_TESTE).first()).toBeVisible();

  // confirmar: volta ao formulário de adicionar
  await page.locator('#btnRemove').click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#inputDomain')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#btnRemove')).toHaveCount(0);

  const st = await api(page, 'GET', '/api/domains/status');
  expect(st.json.customDomain).toBeNull();
});
