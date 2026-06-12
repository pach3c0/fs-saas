// Helpers da suíte E2E LOCAL (nova UI: modal enxuto + painel de config no wizard).
// Rodam contra o servidor local (playwright.local.config.js) e o DB cliquezoom-dev.
// Login: teste@teste.com.br / 055360 (senha resetada p/ testes). Tenant do cliente: "teste".
const { expect } = require('@playwright/test');
const path = require('path');

const BASE = 'http://localhost:3051';
const ADMIN_EMAIL = 'teste@teste.com.br';
const ADMIN_PASSWORD = '055360';
const TENANT = 'teste';
const PREFIXO = 'test-e2e-';
const CLIENT_URL = `${BASE}/cliente/?_tenant=${TENANT}`;

const FIX = (n) => path.join(__dirname, '..', 'fixtures', n);
const FOTO = FIX('foto-teste.jpg');
const FOTO_1 = FIX('foto-teste-1.jpg');
const FOTO_2 = FIX('foto-teste-2.jpg');
const FOTO_3 = FIX('foto-teste-3.jpg');

const putSessao = (r) => /\/api\/sessions\/[a-f0-9]+$/.test(r.url()) && r.request().method() === 'PUT';

// Gera um CPF VÁLIDO (com dígitos verificadores corretos). Necessário porque o cadastro de
// cliente da sessão agora grava no Rhyno, que rejeita CPF inválido (ex.: "00000000000").
function gerarCPF() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));
  for (let j = 9; j < 11; j++) {
    let s = 0;
    for (let i = 0; i < j; i++) s += n[i] * ((j + 1) - i);
    let d = (s * 10) % 11;
    if (d === 10) d = 0;
    n.push(d);
  }
  return n.join('');
}

async function loginAdmin(page) {
  await page.goto('/admin');
  await page.locator('#adminEmail').fill(ADMIN_EMAIL);
  await page.locator('#adminPassword').fill(ADMIN_PASSWORD);
  await page.locator('#loginSubmitBtn').click();
  await expect(page.locator('#adminPanel')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.switchTab('sessoes'));
  await page.waitForSelector('#sessionsList', { timeout: 20000 });
}

async function esconderPainelUpload(page) {
  await page.evaluate(() => {
    window.globalUploadPanel?.hide?.();
    const r = document.getElementById('upload-panel-root');
    if (r) r.style.display = 'none';
  });
}

async function limparSessoesDeTeste(page) {
  await esconderPainelUpload(page);
  for (let i = 0; i < 30; i++) {
    const card = page.locator('#sessionsList > div').filter({ hasText: PREFIXO }).first();
    if (await card.count() === 0) break;
    const del = card.locator('button[title="Deletar sessão"]');
    if (await del.count() === 0) break;
    await del.click();
    await page.locator('#confirmOk').click();
    await page.waitForTimeout(1000);
  }
}

// Cria via modal enxuto e DEIXA O WIZARD ABERTO. Retorna { accessCode, sessionId, name }.
async function criarSessao(page, opts = {}) {
  const {
    mode = 'selection',
    name = `${PREFIXO}${Date.now()}`,
    eventDaysAgo = 10,
    deadlineDays = 10, // negativo = prazo no passado (expirado)
    withCover = true,
  } = opts;

  await page.locator('#addSessionBtn').click();
  await expect(page.locator('#newSessionModal')).toBeVisible();
  await page.locator('#sessionMode').selectOption(mode);
  await page.waitForTimeout(400);
  await page.locator('#sessionName').fill(name);

  const evt = new Date(); evt.setDate(evt.getDate() - eventDaysAgo);
  await page.locator('#sessionDate').fill(evt.toISOString().split('T')[0]);
  const dl = new Date(); dl.setDate(dl.getDate() + deadlineDays);
  await page.locator('#sessionDeadline').fill(dl.toISOString().split('T')[0] + (deadlineDays < 0 ? 'T00:01' : 'T23:59'));

  if (withCover) {
    await page.locator('#coverInput').setInputFiles(FOTO);
    await expect(page.locator('#coverPreview img')).toBeVisible({ timeout: 10000 });
  }

  if (mode !== 'multi_selection') {
    await page.locator('#clientSearchInput').fill('Cliente Teste E2E');
    await expect(page.locator('#clientSearchDropdown')).toBeVisible({ timeout: 5000 });
    await page.locator('#clientSearchDropdown div').last().click();
    await expect(page.locator('#modalCliente')).toBeVisible({ timeout: 5000 });
    await page.locator('#clienteEmail').fill(`t${Date.now()}@e2e.com`);
    await page.locator('#clienteTelefone').fill('11999999999');
    await page.locator('#clienteCpf').fill(gerarCPF()); // Rhyno exige CPF válido
    await page.locator('#btnSalvarCliente').click();
    await expect(page.locator('#modalCliente')).not.toBeVisible({ timeout: 10000 });
  }

  const respP = page.waitForResponse((r) => r.url().includes('/api/sessions') && r.request().method() === 'POST');
  await page.locator('#confirmNewSession').click();
  const data = await (await respP).json();
  await expect(page.locator('#sessionWizardModal')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#wizardConfigPanel')).toBeVisible({ timeout: 5000 });
  return { accessCode: data.session.accessCode, sessionId: data.session._id, name };
}

// ---- Edição de config no painel direito (autosave) ----
async function setConfigNumero(page, cfg, valor) {
  const el = page.locator(`#wizardConfigPanel [data-cfg="${cfg}"]`);
  const put = page.waitForResponse(putSessao);
  await el.fill(String(valor));
  await el.blur();
  await put;
  await page.waitForTimeout(250); // deixa o refresh (campos impactantes) assentar
}
async function setConfigSelect(page, cfg, valor) {
  const el = page.locator(`#wizardConfigPanel [data-cfg="${cfg}"]`);
  const put = page.waitForResponse(putSessao);
  await el.selectOption(String(valor));
  await put;
  await page.waitForTimeout(250);
}
async function setConfigCheck(page, cfg, marcado) {
  const el = page.locator(`#wizardConfigPanel [data-cfg="${cfg}"]`);
  // Os padrões do fotógrafo (Configurações › Sessões) pré-preenchem a criação — se o checkbox
  // já está no estado desejado, setChecked é no-op e o PUT nunca dispara (não esperar).
  if (await el.isChecked() === marcado) return;
  const put = page.waitForResponse(putSessao);
  await el.setChecked(marcado);
  await put;
}

// Aplica um conjunto de configs (não-impactantes primeiro, pacote/resolução por último).
async function aplicarConfig(page, cfg = {}) {
  if (cfg.extraPhotoPrice != null) await setConfigNumero(page, 'extraPhotoPrice', cfg.extraPhotoPrice);
  if (cfg.allowExtraPurchasePostSubmit != null) await setConfigCheck(page, 'allowExtraPurchasePostSubmit', cfg.allowExtraPurchasePostSubmit);
  if (cfg.allowReopen != null) await setConfigCheck(page, 'allowReopen', cfg.allowReopen);
  if (cfg.commentsEnabled != null) await setConfigCheck(page, 'commentsEnabled', cfg.commentsEnabled);
  if (cfg.photoResolution != null) await setConfigSelect(page, 'photoResolution', cfg.photoResolution);
  if (cfg.packageLimit != null) await setConfigNumero(page, 'packageLimit', cfg.packageLimit);
}

// ---- Wizard (passos) ----
async function subirFotosWizard(page, files) {
  const [fc] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('button', { hasText: '+ Subir fotos' }).first().click(),
  ]);
  await fc.setFiles(files);
  await expect(page.locator('#wizardContent div[style*="aspect-ratio"]')).toHaveCount(files.length, { timeout: 30000 });
}

// Sobe as fotos UMA A UMA (ordem determinística: files[0] = 1ª no grid).
// Útil quando o teste depende de saber qual foto está em cada índice.
async function subirFotosSequencial(page, files) {
  for (let i = 0; i < files.length; i++) {
    const [fc] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('button', { hasText: '+ Subir fotos' }).first().click(),
    ]);
    await fc.setFiles([files[i]]);
    await expect(page.locator('#wizardContent div[style*="aspect-ratio"]')).toHaveCount(i + 1, { timeout: 30000 });
  }
}

async function concluirUpload(page) {
  await page.locator('button', { hasText: '✓ Concluí upload' }).click();
  await page.locator('button', { hasText: 'Concluir' }).click();
}

async function irParaPasso(page, label) {
  await page.locator('#wizardSidebar button', { hasText: label }).click();
}

function botaoPasso(page, stepId) {
  return page.locator(`#wizardSidebar button[data-step-id="${stepId}"]`);
}

async function compartilharCopiarCodigo(page) {
  await irParaPasso(page, 'Compartilhar');
  await expect(page.locator('h2', { hasText: 'Compartilhar' })).toBeVisible({ timeout: 10000 });
  await page.locator('button', { hasText: 'Copiar código' }).click();
  await expect(page.locator('#wizardSidebar button', { hasText: 'Acompanhar' })).toBeEnabled({ timeout: 8000 });
}

async function subirEditada(page, file) {
  const [fc] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#wizardContent button', { hasText: /\+ Subir fotos editadas|\+ Subir mais editadas/i }).click(),
  ]);
  await fc.setFiles([file]);
}

async function fecharWizard(page) {
  await page.locator('#wizardHeader button[title="Fechar"]').click();
  await expect(page.locator('#sessionWizardModal')).not.toBeVisible({ timeout: 5000 });
}

async function abrirWizard(page, name) {
  await page.locator('#sessionsList > div').filter({ hasText: name }).first().click();
  await expect(page.locator('#sessionWizardModal')).toBeVisible({ timeout: 5000 });
}

async function voltarParaSessoes(page) {
  await page.bringToFront();
  await page.evaluate(() => { (window.loadTab || window.switchTab)?.('sessoes'); });
  await page.waitForTimeout(1500);
}

async function deletarSessao(page, name) {
  await voltarParaSessoes(page);
  await esconderPainelUpload(page);
  const del = page.locator('#sessionsList > div').filter({ hasText: name }).first().locator('button[title="Deletar sessão"]');
  await del.click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#sessionsList')).not.toContainText(name, { timeout: 10000 });
}

// ---- Marca d'água do ORG (config via API, usa o token do admin logado) ----
async function configurarMarcaDagua(page, patch) {
  return page.evaluate(async (p) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch('/api/organization/profile', {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
    if (!res.ok) throw new Error('PUT /organization/profile falhou: ' + res.status);
    return res.json();
  }, patch);
}
// Desliga a marca d'água (volta o org ao estado de fábrica).
// ⚠️ watermarkType tem enum ['text','logo','both'] — '' é rejeitado pelo schema (o helper
// falhava silencioso com '' e a limpeza nunca acontecia; descoberto no módulo Perfil).
async function limparMarcaDagua(page) {
  return configurarMarcaDagua(page, { watermarkType: 'text', watermarkText: '', watermarkLayers: [] });
}

// ---- Cliente (galeria) ----
async function clienteAbrir(browser, accessCode) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(CLIENT_URL);
  await expect(p.locator('#loginSection')).toBeVisible({ timeout: 10000 });
  await p.locator('#accessCode').fill(accessCode);
  await p.locator('#loginBtn').click();
  return { ctx, page: p };
}

async function clienteSelecionar(cp, n) {
  const hearts = cp.locator('.photo-heart');
  for (let i = 0; i < n; i++) {
    await hearts.nth(i).click();
    await cp.waitForTimeout(300);
  }
}

module.exports = {
  BASE, ADMIN_EMAIL, ADMIN_PASSWORD, TENANT, PREFIXO, CLIENT_URL,
  FOTO, FOTO_1, FOTO_2, FOTO_3,
  gerarCPF,
  loginAdmin, esconderPainelUpload, limparSessoesDeTeste, criarSessao,
  setConfigNumero, setConfigSelect, setConfigCheck, aplicarConfig,
  subirFotosWizard, subirFotosSequencial, concluirUpload, irParaPasso, botaoPasso, compartilharCopiarCodigo,
  subirEditada, fecharWizard, abrirWizard, voltarParaSessoes, deletarSessao,
  configurarMarcaDagua, limparMarcaDagua,
  clienteAbrir, clienteSelecionar,
};
