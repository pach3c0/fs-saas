// SMOKE da nova UI de PÁGINA ÚNICA (selection/gallery) — foco no que o CLIENTE vê.
// Escrito em 2026-06-19 para validar a refatoração não-commitada antes de subir pra produção.
//
// Por que um smoke próprio (e não a suíte 0_/2_/3_): a refatoração mudou DOIS pilares que a
// suíte antiga assume:
//   1) Criação: não há mais #addSessionBtn + modal + #sessionMode. Agora clica-se num
//      .session-type-card[data-mode=...] que cria um rascunho (POST /api/sessions) e abre o wizard.
//   2) Wizard: selection/gallery/multi viraram PÁGINA ÚNICA (sem #wizardSidebar/stepper).
// Por isso aqui o lado admin (config/entrega/limpeza) é feito via API (robusto), e a UI é
// exercida onde importa: clique de criação, upload de fotos e TODO o fluxo do cliente.
// Captura pageerror das duas páginas como sinal forte de quebra no refactor.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const H = require('./helpers');

const PREFIX = 'smoke-sp-';

// Chamada autenticada com o token do admin logado na página.
async function api(page, method, path, body) {
  return page.evaluate(async ({ method, path, body }) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(path, {
      method,
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
    return text ? JSON.parse(text) : {};
  }, { method, path, body });
}

async function limparSmoke(page) {
  const { sessions } = await api(page, 'GET', '/api/sessions');
  for (const s of (sessions || [])) {
    if ((s.name || '').startsWith(PREFIX)) {
      await api(page, 'DELETE', `/api/sessions/${s._id}`).catch(() => {});
    }
  }
}

// Cria via card de modo (UI), captura o POST p/ pegar id+accessCode, configura via API.
async function criarViaCard(page, mode, patch = {}) {
  const respP = page.waitForResponse((r) => r.url().endsWith('/api/sessions') && r.request().method() === 'POST');
  await page.locator(`.session-type-card[data-mode="${mode}"]`).click();
  const data = await (await respP).json();
  const sessionId = data.session._id;
  const accessCode = data.session.accessCode;
  await expect(page.locator('#sessionWizardModal')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#wizardConfigPanel')).toBeVisible({ timeout: 8000 });
  const name = `${PREFIX}${mode}-${Date.now()}`;
  const dl = new Date(); dl.setDate(dl.getDate() + 10);
  await api(page, 'PUT', `/api/sessions/${sessionId}`, {
    name,
    selectionDeadline: `${dl.toISOString().split('T')[0]}T23:59`,
    ...patch,
  });
  return { sessionId, accessCode, name };
}

// Upload de fotos brutas pelo botão "Subir fotos" do wizard (página única).
// Cada foto no grid tem um checkbox com data-id (marcador estável por foto).
async function subirFotosUI(page, files) {
  const grid = page.locator('#wizardContent input[type="checkbox"][data-id]');
  const before = await grid.count();
  const [fc] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Subir fotos', exact: true }).first().click(),
  ]);
  await fc.setFiles(files);
  await expect(grid).toHaveCount(before + files.length, { timeout: 30000 });
}

// Sobe fotos editadas via API (match por filename, igual ao botão da UI), mais rápido e
// robusto que reabrir o wizard e passar pela fila de upload. Marca urlOriginal nas selecionadas.
async function subirEditadasViaApi(page, sessionId, files) {
  const token = await page.evaluate(() => localStorage.getItem('authToken'));
  for (const f of files) {
    const resp = await page.request.post(`${H.BASE}/api/sessions/${sessionId}/photos/upload-edited`, {
      headers: { Authorization: 'Bearer ' + token },
      multipart: { photos: { name: path.basename(f), mimeType: 'image/jpeg', buffer: fs.readFileSync(f) } },
    });
    expect(resp.ok(), `upload-edited ${path.basename(f)} -> ${resp.status()}`).toBeTruthy();
  }
}

test('SELEÇÃO (single-page) — cliente seleciona, finaliza e baixa', async ({ page, context, browser }) => {
  test.setTimeout(240000);
  const adminErrors = [];
  page.on('pageerror', (e) => adminErrors.push(e.message));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await H.loginAdmin(page);
  await H.esconderPainelUpload(page);
  await limparSmoke(page);

  const { sessionId, accessCode } = await criarViaCard(page, 'selection', { packageLimit: 2, extraPhotoPrice: 30 });
  await subirFotosUI(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
  await expect(page.locator('#wizardContent')).toContainText('Compartilhar', { timeout: 8000 });

  // --- CLIENTE: login + seleção (3 = 1 extra de R$30) + finaliza  [NÚCLEO] ---
  const { ctx, page: cp } = await H.clienteAbrir(browser, accessCode);
  const clientErrors = [];
  cp.on('pageerror', (e) => clientErrors.push(e.message));
  await expect(cp.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(cp.locator('.photo-heart')).toHaveCount(3, { timeout: 15000 });
  await H.clienteSelecionar(cp, 3);
  await expect(cp.locator('#extraInfo')).toContainText('fotos extras');
  await expect(cp.locator('#extraInfo')).toContainText('R$ 30,00');
  await cp.locator('#submitBtn').click();
  await cp.locator('#gcConfirm').click();
  await expect(cp.locator('.status-title')).toContainText('Seleção Enviada', { timeout: 10000 });
  expect(clientErrors, 'erros JS no CLIENTE (seleção)').toEqual([]);
  await ctx.close();

  // --- Admin: sobe editadas (API) + entrega (API) ---
  await subirEditadasViaApi(page, sessionId, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
  await api(page, 'PUT', `/api/sessions/${sessionId}/deliver`, { skipEmail: true });

  // --- CLIENTE: baixa (3 overlays de download) ---
  const { ctx: ctx2, page: fp } = await H.clienteAbrir(browser, accessCode);
  const clientErrors2 = [];
  fp.on('pageerror', (e) => clientErrors2.push(e.message));
  await expect(fp.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(fp.locator('.photo-download-overlay')).toHaveCount(3, { timeout: 10000 });
  expect(clientErrors2, 'erros JS no CLIENTE (download)').toEqual([]);
  await ctx2.close();

  expect(adminErrors, 'erros JS no ADMIN').toEqual([]);
  await api(page, 'DELETE', `/api/sessions/${sessionId}`);
});

test('GALERIA (single-page) — cliente visualiza e baixa após entrega', async ({ page, browser }) => {
  test.setTimeout(120000);
  const adminErrors = [];
  page.on('pageerror', (e) => adminErrors.push(e.message));

  await H.loginAdmin(page);
  await H.esconderPainelUpload(page);
  await limparSmoke(page);

  const { sessionId, accessCode } = await criarViaCard(page, 'gallery');
  await subirFotosUI(page, [H.FOTO_1, H.FOTO_2]);
  await expect(page.locator('#wizardContent')).toContainText('Compartilhar', { timeout: 8000 });
  await api(page, 'PUT', `/api/sessions/${sessionId}/deliver`, { skipEmail: true }); // marca delivered

  const { ctx, page: cp } = await H.clienteAbrir(browser, accessCode);
  const clientErrors = [];
  cp.on('pageerror', (e) => clientErrors.push(e.message));
  await expect(cp.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(cp.locator('.photo-download-overlay')).toHaveCount(2, { timeout: 10000 });
  expect(clientErrors, 'erros JS no CLIENTE (galeria)').toEqual([]);
  await ctx.close();

  expect(adminErrors, 'erros JS no ADMIN (galeria)').toEqual([]);
  await api(page, 'DELETE', `/api/sessions/${sessionId}`);
});

async function addParticipante(page, sessionId, patch = {}) {
  const r = await api(page, 'POST', `/api/sessions/${sessionId}/participants`, {
    name: 'Participante Smoke',
    email: `p${Date.now()}@e2e.com`,
    phone: '11988887777',
    packageLimit: 2,
    extraPhotoPrice: 30,
    ...patch,
  });
  const part = r.participants[r.participants.length - 1];
  return part.accessCode;
}

test('MULTI-SELEÇÃO (single-page) — participante seleciona, finaliza (com extra)', async ({ page, browser }) => {
  test.setTimeout(120000);
  const adminErrors = [];
  page.on('pageerror', (e) => adminErrors.push(e.message));

  await H.loginAdmin(page);
  await H.esconderPainelUpload(page);
  await limparSmoke(page);

  const { sessionId } = await criarViaCard(page, 'multi_selection');
  const partCode = await addParticipante(page, sessionId, { packageLimit: 2, extraPhotoPrice: 30 });
  await subirFotosUI(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);

  // --- PARTICIPANTE (cliente): login pelo código próprio + seleção + extra + finaliza ---
  const { ctx, page: cp } = await H.clienteAbrir(browser, partCode);
  const clientErrors = [];
  cp.on('pageerror', (e) => clientErrors.push(e.message));
  await expect(cp.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(cp.locator('.photo-heart')).toHaveCount(3, { timeout: 15000 });
  await H.clienteSelecionar(cp, 3);
  await expect(cp.locator('#extraInfo')).toContainText('R$ 30,00'); // packageLimit do participante = 2
  await cp.locator('#submitBtn').click();
  await cp.locator('#gcConfirm').click();
  await expect(cp.locator('.status-title')).toContainText('Seleção Enviada', { timeout: 10000 });
  expect(clientErrors, 'erros JS no PARTICIPANTE (multi-seleção)').toEqual([]);
  await ctx.close();

  expect(adminErrors, 'erros JS no ADMIN (multi-seleção)').toEqual([]);
  await api(page, 'DELETE', `/api/sessions/${sessionId}`);
});

test('GALERIA EM GRUPO (multi_gallery) — convidado visualiza e baixa', async ({ page, browser }) => {
  test.setTimeout(120000);
  const adminErrors = [];
  page.on('pageerror', (e) => adminErrors.push(e.message));

  await H.loginAdmin(page);
  await H.esconderPainelUpload(page);
  await limparSmoke(page);

  const { sessionId } = await criarViaCard(page, 'multi_gallery');
  const partCode = await addParticipante(page, sessionId, { packageLimit: 0 });
  await subirFotosUI(page, [H.FOTO_1, H.FOTO_2]);
  // multi_gallery = entrega direta (sem etapa de deliver): convidado já baixa.

  const { ctx, page: cp } = await H.clienteAbrir(browser, partCode);
  const clientErrors = [];
  cp.on('pageerror', (e) => clientErrors.push(e.message));
  await expect(cp.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(cp.locator('.photo-download-overlay')).toHaveCount(2, { timeout: 10000 });
  expect(clientErrors, 'erros JS no CONVIDADO (galeria em grupo)').toEqual([]);
  await ctx.close();

  expect(adminErrors, 'erros JS no ADMIN (galeria em grupo)').toEqual([]);
  await api(page, 'DELETE', `/api/sessions/${sessionId}`);
});
