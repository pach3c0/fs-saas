// Cobre 3 features não-commitadas neste branch:
//   1. Gate de entrega aprimorado — bloqueia entrega quando nenhuma foto da seleção está editada
//      (seleção individual + por participante no multi_selection).
//   2. Cards de upload no estado vazio (selection + multi_selection).
//   3. Fluxo E2E completo do multi_selection (2 participantes).
//
// Rodar:
//   npx playwright test --config=playwright.local.config.js \
//     tests/local/4_gate-e-cards-selecao-grupo.spec.js --workers=1

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const H = require('./helpers');

const PREFIX = 'gate-e2e-';

// ── Helpers de API ────────────────────────────────────────────────────────────

// Lança erro em status >= 400.
async function api(page, method, p, body) {
  return page.evaluate(async ({ method, p, body }) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(p, {
      method,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${text}`);
    return text ? JSON.parse(text) : {};
  }, { method, p, body });
}

// Retorna { ok, status, body } sem lançar — para testar cenários de 4xx.
async function apiRaw(page, method, p, body) {
  return page.evaluate(async ({ method, p, body }) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(p, {
      method,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text ? JSON.parse(text) : {} };
  }, { method, p, body });
}

async function limpar(page) {
  const { sessions } = await api(page, 'GET', '/api/sessions');
  for (const s of sessions || []) {
    if ((s.name || '').startsWith(PREFIX))
      await api(page, 'DELETE', `/api/sessions/${s._id}`).catch(() => {});
  }
}

// Cria via card de modo (UI) — wizard fica aberto. Retorna { sessionId, accessCode, name }.
async function criarViaCard(page, mode, patch = {}) {
  const respP = page.waitForResponse(r => r.url().includes('/api/sessions') && r.request().method() === 'POST');
  await page.locator(`.session-type-card[data-mode="${mode}"]`).click();
  const data = await (await respP).json();
  const { _id: sessionId, accessCode } = data.session;
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

// Sobe fotos no caminho "originais". No estado vazio (selection/multi_selection) aparece o card
// "Subir originais"; caso já haja fotos (toolbar), usa "Subir fotos".
// Aceita um único arquivo ou array; se array, sobe UM POR UM para garantir ordem determinística
// no session.photos (importante nos gate tests que assumem foto_1=índice0, foto_2=índice1...).
async function subirOriginals(page, files) {
  const list = Array.isArray(files) ? files : [files];
  for (const f of list) {
    const grid = page.locator('#wizardContent input[type="checkbox"][data-id]');
    const before = await grid.count();
    const btnCard = page.locator('#wizardContent button', { hasText: 'Subir originais' });
    const isCard = await btnCard.isVisible().catch(() => false);
    const [fc] = await Promise.all([
      page.waitForEvent('filechooser'),
      isCard
        ? btnCard.first().click()
        : page.getByRole('button', { name: 'Subir fotos', exact: true }).first().click(),
    ]);
    await fc.setFiles([f]);
    await expect(grid).toHaveCount(before + 1, { timeout: 30000 });
  }
}

// Sobe fotos editadas via API (match por filename → seta urlOriginal na foto correspondente).
async function subirEditadasViaApi(page, sessionId, files) {
  const token = await page.evaluate(() => localStorage.getItem('authToken'));
  for (const f of files) {
    const resp = await page.request.post(`${H.BASE}/api/sessions/${sessionId}/photos/upload-edited`, {
      headers: { Authorization: 'Bearer ' + token },
      multipart: { photos: { name: path.basename(f), mimeType: 'image/jpeg', buffer: fs.readFileSync(f) } },
    });
    expect(resp.ok(), `upload-edited ${path.basename(f)} → ${resp.status()}`).toBeTruthy();
  }
}

// Adiciona participante via API. Retorna { accessCode, _id }.
async function addParticipante(page, sessionId, patch = {}) {
  const r = await api(page, 'POST', `/api/sessions/${sessionId}/participants`, {
    name: `Participante-${Date.now()}`,
    email: `p${Date.now()}@e2e.com`,
    phone: '11988887777',
    packageLimit: 2,
    extraPhotoPrice: 30,
    ...patch,
  });
  const part = r.participants[r.participants.length - 1];
  return { accessCode: part.accessCode, _id: part._id };
}

// ── Testes ────────────────────────────────────────────────────────────────────

test('MULTI-SELEÇÃO — fluxo completo (2 participantes: seleção → entrega → download)', async ({ page, browser }) => {
  test.setTimeout(180000);
  const erros = [];
  page.on('pageerror', e => erros.push(`admin: ${e.message}`));

  await H.loginAdmin(page);
  await H.esconderPainelUpload(page);
  await limpar(page);

  // Cria sessão, adiciona 2 participantes e sobe 3 fotos
  const { sessionId, name } = await criarViaCard(page, 'multi_selection');
  const p1 = await addParticipante(page, sessionId, { name: 'Alice', packageLimit: 2 });
  const p2 = await addParticipante(page, sessionId, { name: 'Bob',   packageLimit: 2 });
  await subirOriginals(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);

  // Alice: seleciona fotos 0 + 1, finaliza
  const { ctx: ctx1, page: c1 } = await H.clienteAbrir(browser, p1.accessCode);
  c1.on('pageerror', e => erros.push(`Alice: ${e.message}`));
  await expect(c1.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(c1.locator('.photo-heart')).toHaveCount(3, { timeout: 15000 });
  await H.clienteSelecionar(c1, 2);
  await c1.locator('#submitBtn').click();
  await c1.locator('#gcConfirm').click();
  await expect(c1.locator('.status-title')).toContainText('Seleção Enviada', { timeout: 10000 });
  await ctx1.close();

  // Bob: seleciona fotos 1 + 2, finaliza
  const { ctx: ctx2, page: c2 } = await H.clienteAbrir(browser, p2.accessCode);
  c2.on('pageerror', e => erros.push(`Bob: ${e.message}`));
  await expect(c2.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(c2.locator('.photo-heart')).toHaveCount(3, { timeout: 15000 });
  await c2.locator('.photo-heart').nth(1).click(); await c2.waitForTimeout(300);
  await c2.locator('.photo-heart').nth(2).click(); await c2.waitForTimeout(300);
  await c2.locator('#submitBtn').click();
  await c2.locator('#gcConfirm').click();
  await expect(c2.locator('.status-title')).toContainText('Seleção Enviada', { timeout: 10000 });
  await ctx2.close();

  await page.bringToFront();

  // Admin: verifica que ambos submeteram
  const { session } = await api(page, 'GET', `/api/sessions/${sessionId}`);
  const submetidos = (session.participants || []).filter(p => p.selectionStatus === 'submitted');
  expect(submetidos.length, '2 participantes submetidos').toBe(2);

  // Admin: sobe editadas para as 3 fotos (cobre toda a união das seleções)
  await subirEditadasViaApi(page, sessionId, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);

  // Admin: entrega cada participante individualmente (mesmo fluxo do botão "Entregar" na UI)
  await api(page, 'PUT', `/api/sessions/${sessionId}/participants/${p1._id}/deliver`, {});
  await api(page, 'PUT', `/api/sessions/${sessionId}/participants/${p2._id}/deliver`, {});

  // Alice baixa: deve ver 2 overlays (fotos que ela selecionou = 0 + 1)
  const { ctx: ctx3, page: d1 } = await H.clienteAbrir(browser, p1.accessCode);
  d1.on('pageerror', e => erros.push(`Alice-dl: ${e.message}`));
  await expect(d1.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(d1.locator('.photo-download-overlay')).toHaveCount(2, { timeout: 10000 });
  await ctx3.close();

  // Bob baixa: deve ver 2 overlays (fotos que ele selecionou = 1 + 2)
  const { ctx: ctx4, page: d2 } = await H.clienteAbrir(browser, p2.accessCode);
  d2.on('pageerror', e => erros.push(`Bob-dl: ${e.message}`));
  await expect(d2.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(d2.locator('.photo-download-overlay')).toHaveCount(2, { timeout: 10000 });
  await ctx4.close();

  expect(erros, 'erros JS').toEqual([]);
  await api(page, 'DELETE', `/api/sessions/${sessionId}`);
});

test('SELEÇÃO — gate de entrega: bloqueia quando nenhuma foto selecionada está editada', async ({ page, browser }) => {
  test.setTimeout(120000);
  await H.loginAdmin(page);
  await H.esconderPainelUpload(page);
  await limpar(page);

  const { sessionId, accessCode } = await criarViaCard(page, 'selection', { packageLimit: 2 });
  await subirOriginals(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);

  // Cliente seleciona as 2 primeiras fotos (foto_1, foto_2) e finaliza
  const { ctx, page: cp } = await H.clienteAbrir(browser, accessCode);
  await expect(cp.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await H.clienteSelecionar(cp, 2);
  await cp.locator('#submitBtn').click();
  await cp.locator('#gcConfirm').click();
  await expect(cp.locator('.status-title')).toContainText('Seleção Enviada', { timeout: 10000 });
  await ctx.close();

  await page.bringToFront();

  // Gate 1: sem nenhuma editada → 400
  const r1 = await apiRaw(page, 'PUT', `/api/sessions/${sessionId}/deliver`, { skipEmail: true });
  expect(r1.status, 'gate 1 — sem editada alguma').toBe(400);
  expect(r1.body.error).toContain('nenhuma das fotos escolhidas');

  // Gate 2: sobe editada da foto_3 (NÃO está na seleção do cliente) → ainda 400
  await subirEditadasViaApi(page, sessionId, [H.FOTO_3]);
  const r2 = await apiRaw(page, 'PUT', `/api/sessions/${sessionId}/deliver`, { skipEmail: true });
  expect(r2.status, 'gate 2 — editada fora da seleção').toBe(400);
  expect(r2.body.error).toContain('nenhuma das fotos escolhidas');

  // Gate 3: sobe editada da foto_1 (SIM está na seleção) → libera entrega
  await subirEditadasViaApi(page, sessionId, [H.FOTO_1]);
  const r3 = await apiRaw(page, 'PUT', `/api/sessions/${sessionId}/deliver`, { skipEmail: true });
  expect(r3.status, 'gate 3 — editada na seleção → libera').toBe(200);

  await api(page, 'DELETE', `/api/sessions/${sessionId}`);
});

test('MULTI-SELEÇÃO — gate por participante: bloqueia / libera entrega individualmente', async ({ page, browser }) => {
  test.setTimeout(120000);
  await H.loginAdmin(page);
  await H.esconderPainelUpload(page);
  await limpar(page);

  const { sessionId } = await criarViaCard(page, 'multi_selection');
  const p1 = await addParticipante(page, sessionId, { packageLimit: 2 });
  await subirOriginals(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);

  // Participante seleciona fotos 0 + 1 (foto_1, foto_2) e finaliza
  const { ctx, page: cp } = await H.clienteAbrir(browser, p1.accessCode);
  await expect(cp.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await H.clienteSelecionar(cp, 2);
  await cp.locator('#submitBtn').click();
  await cp.locator('#gcConfirm').click();
  await expect(cp.locator('.status-title')).toContainText('Seleção Enviada', { timeout: 10000 });
  await ctx.close();

  await page.bringToFront();

  // Gate 1: sem editada alguma → 400
  const g1 = await apiRaw(page, 'PUT', `/api/sessions/${sessionId}/participants/${p1._id}/deliver`, {});
  expect(g1.status, 'gate 1 (multi) — sem editada').toBe(400);
  expect(g1.body.error).toContain('nenhuma das fotos escolhidas');

  // Gate 2: sobe editada da foto_3 (NÃO selecionada) → ainda 400
  await subirEditadasViaApi(page, sessionId, [H.FOTO_3]);
  const g2 = await apiRaw(page, 'PUT', `/api/sessions/${sessionId}/participants/${p1._id}/deliver`, {});
  expect(g2.status, 'gate 2 (multi) — editada fora da seleção').toBe(400);

  // Gate 3: sobe editada da foto_1 (selecionada) → libera
  await subirEditadasViaApi(page, sessionId, [H.FOTO_1]);
  const g3 = await apiRaw(page, 'PUT', `/api/sessions/${sessionId}/participants/${p1._id}/deliver`, {});
  expect(g3.status, 'gate 3 (multi) — editada na seleção → libera').toBe(200);

  await api(page, 'DELETE', `/api/sessions/${sessionId}`);
});

test('Cards de upload — aparecem em selection/multi_selection, ausentes em gallery', async ({ page }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await H.esconderPainelUpload(page);
  await limpar(page);

  // selection → cards aparecem com texto e botões corretos
  const { sessionId: sid1 } = await criarViaCard(page, 'selection');
  await expect(page.locator('#wizardContent')).toContainText('Como você quer enviar as fotos', { timeout: 8000 });
  await expect(page.locator('#wizardContent button', { hasText: 'Subir originais' })).toBeVisible();
  await expect(page.locator('#wizardContent button', { hasText: 'Subir editadas' })).toBeVisible();
  await expect(page.locator('#wizardContent')).toContainText('Fotos originais (sem edição)');
  await expect(page.locator('#wizardContent')).toContainText('Fotos já editadas');
  await page.locator('#wizardConfigPanel button[title="Fechar"]').click();
  await api(page, 'DELETE', `/api/sessions/${sid1}`);

  // multi_selection → idem
  const { sessionId: sid2 } = await criarViaCard(page, 'multi_selection');
  await expect(page.locator('#wizardContent')).toContainText('Como você quer enviar as fotos', { timeout: 8000 });
  await expect(page.locator('#wizardContent button', { hasText: 'Subir originais' })).toBeVisible();
  await expect(page.locator('#wizardContent button', { hasText: 'Subir editadas' })).toBeVisible();
  await page.locator('#wizardConfigPanel button[title="Fechar"]').click();
  await api(page, 'DELETE', `/api/sessions/${sid2}`);

  // gallery → NÃO mostra cards (mostra toolbar + mensagem de estado vazio)
  const { sessionId: sid3 } = await criarViaCard(page, 'gallery');
  await expect(page.locator('#wizardContent button', { hasText: 'Subir fotos', exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#wizardContent button', { hasText: 'Subir originais' })).toHaveCount(0);
  await expect(page.locator('#wizardContent')).not.toContainText('Como você quer enviar as fotos');
  await page.locator('#wizardConfigPanel button[title="Fechar"]').click();
  await api(page, 'DELETE', `/api/sessions/${sid3}`);
});

test('Cards de upload — caminho B (editadas) grava uploadFlow e ajusta toolbar', async ({ page }) => {
  test.setTimeout(90000);
  await H.loginAdmin(page);
  await H.esconderPainelUpload(page);
  await limpar(page);

  const { sessionId } = await criarViaCard(page, 'selection');

  // Estado vazio: card "Subir editadas" visível
  await expect(page.locator('#wizardContent button', { hasText: 'Subir editadas' })).toBeVisible({ timeout: 8000 });

  // Clica "Subir editadas" — pickFlow() salva uploadFlow='edited' via API antes de abrir filechooser
  const [fc] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }),
    page.locator('#wizardContent button', { hasText: 'Subir editadas' }).click(),
  ]);
  await fc.setFiles([H.FOTO_1]);
  await expect(page.locator('#wizardContent input[type="checkbox"][data-id]')).toHaveCount(1, { timeout: 30000 });

  // Toolbar pós-upload: "Subir mais fotos" visível, "Subir fotos" ausente
  await expect(page.locator('#wizardContent button', { hasText: 'Subir mais fotos' })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#wizardContent button', { hasText: 'Subir fotos', exact: true })).toHaveCount(0);

  // API confirma uploadFlow persistido como 'edited'
  const { session } = await api(page, 'GET', `/api/sessions/${sessionId}`);
  expect(session.uploadFlow, 'uploadFlow persistido').toBe('edited');

  await page.locator('#wizardConfigPanel button[title="Fechar"]').click();
  await api(page, 'DELETE', `/api/sessions/${sessionId}`);
});
