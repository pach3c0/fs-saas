// Helpers compartilhados para os testes E2E de Sessões.
// Reaproveitam exatamente os seletores validados no fluxo verde (3_2_selecao-sessao).
// Alvo: produção (baseURL em playwright.config.js). Cada teste limpa o que cria.
const { expect } = require('@playwright/test');
const path = require('path');

const ADMIN_EMAIL = 'admin@cliquezoom.com.br';
const ADMIN_PASSWORD = '055360';
// Galeria do cliente: subdomínio do tenant do superadmin.
const CLIENT_BASE = 'https://cliquezoom-admin.cliquezoom.com.br/cliente/';
const PREFIXO_TESTE = 'test-e2e-selecao-';

const FIX = (n) => path.join(__dirname, '..', 'fixtures', n);
const FOTO = FIX('foto-teste.jpg');
const FOTO_1 = FIX('foto-teste-1.jpg');
const FOTO_2 = FIX('foto-teste-2.jpg');
const FOTO_3 = FIX('foto-teste-3.jpg');

async function loginAdmin(page) {
  await page.goto('/admin');
  await page.locator('#adminEmail').fill(ADMIN_EMAIL);
  await page.locator('#adminPassword').fill(ADMIN_PASSWORD);
  await page.locator('#loginSubmitBtn').click();
  await expect(page.locator('#adminPanel')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('.dashboard-stats, #dashboardContent, [data-tab="sessoes"]', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.switchTab('sessoes'));
  await page.waitForSelector('#sessionsList', { timeout: 20000 });
}

// O painel global de upload fica fixo na tela após os uploads e intercepta cliques na lista.
async function esconderPainelUpload(page) {
  await page.evaluate(() => {
    window.globalUploadPanel?.hide?.();
    const root = document.getElementById('upload-panel-root');
    if (root) root.style.display = 'none';
  });
}

// Remove sessões de teste residuais (best-effort, idempotente).
async function limparSessoesDeTeste(page) {
  await esconderPainelUpload(page);
  for (let i = 0; i < 30; i++) {
    const card = page.locator('#sessionsList > div').filter({ hasText: PREFIXO_TESTE }).first();
    if (await card.count() === 0) break;
    const delBtn = card.locator('button[title="Deletar sessão"]');
    if (await delBtn.count() === 0) break;
    await delBtn.click();
    await page.locator('#confirmOk').click();
    await page.waitForTimeout(1200);
  }
}

// Cria uma sessão pelo modal e retorna { accessCode, sessionId, name }.
async function criarSessao(page, opts = {}) {
  const {
    mode = 'selection',
    name = `${PREFIXO_TESTE}${Date.now()}`,
    packageLimit = 2,
    extraPrice = 30,
    allowExtra = true,
    allowReopen = true,
    resolution = '1200',
    deadlineDays = 10,    // dias a partir de hoje (negativo = no passado → expirado)
    eventDaysAgo = 10,
    comments = true,
  } = opts;

  await page.locator('#addSessionBtn').click();
  await expect(page.locator('#newSessionModal')).toBeVisible({ timeout: 5000 });
  await page.locator('#sessionMode').selectOption(mode);
  await page.waitForTimeout(500);
  await page.locator('#sessionName').fill(name);

  const evt = new Date();
  evt.setDate(evt.getDate() - eventDaysAgo);
  await page.locator('#sessionDate').fill(evt.toISOString().split('T')[0]);

  const dl = new Date();
  dl.setDate(dl.getDate() + deadlineDays);
  // hora 23:59 só quando no futuro; para data passada, usa início do dia para garantir expiração.
  const horaPrazo = deadlineDays < 0 ? 'T00:01' : 'T23:59';
  await page.locator('#sessionDeadline').fill(dl.toISOString().split('T')[0] + horaPrazo);

  await page.locator('#coverInput').setInputFiles(FOTO);
  await expect(page.locator('#coverPreview img')).toBeVisible({ timeout: 10000 });

  if (mode === 'selection' || mode === 'multi_selection') {
    await page.locator('#sessionLimit').fill(String(packageLimit));
  }
  if (mode === 'selection') {
    await page.locator('#sessionExtraPrice').fill(String(extraPrice));
    await page.locator('#sessionAllowExtraPurchase').setChecked(allowExtra);
    await page.locator('#sessionAllowReopen').setChecked(allowReopen);
  }
  await page.locator('#sessionResolution').selectOption(resolution);
  await page.locator('#sessionCommentsEnabled').setChecked(comments);

  // Cliente (obrigatório fora de multi_selection)
  if (mode !== 'multi_selection') {
    await page.locator('#clientSearchInput').fill('Cliente Teste E2E');
    await expect(page.locator('#clientSearchDropdown')).toBeVisible({ timeout: 5000 });
    await page.locator('#clientSearchDropdown div').last().click();
    await expect(page.locator('#modalCliente')).toBeVisible({ timeout: 5000 });
    await page.locator('#clienteEmail').fill(`test${Date.now()}@e2e.com`);
    await page.locator('#clienteTelefone').fill('11999999999');
    await page.locator('#clienteCpf').fill('00000000000');
    await page.locator('#btnSalvarCliente').click();
    await expect(page.locator('#modalCliente')).not.toBeVisible({ timeout: 10000 });
  }

  const respPromise = page.waitForResponse(
    (r) => r.url().includes('/api/sessions') && r.request().method() === 'POST'
  );
  await page.locator('#confirmNewSession').click();
  const resp = await respPromise;
  const data = await resp.json();
  await expect(page.locator('#sessionsList')).toContainText(name, { timeout: 10000 });
  return { accessCode: data.session.accessCode, sessionId: data.session._id, name };
}

async function abrirWizard(page, sessionName) {
  const card = page.locator('#sessionsList > div').filter({ hasText: sessionName }).first();
  await card.click();
  await expect(page.locator('#sessionWizardModal')).toBeVisible({ timeout: 5000 });
}

async function subirFotosWizard(page, files) {
  const [fc] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('button', { hasText: '+ Subir fotos' }).first().click(),
  ]);
  await fc.setFiles(files);
  await expect(page.locator('#wizardContent div[style*="aspect-ratio"]')).toHaveCount(files.length, { timeout: 30000 });
}

async function concluirUpload(page) {
  await page.locator('button', { hasText: '✓ Concluí upload' }).click();
  await page.locator('button', { hasText: 'Concluir' }).click();
}

async function irParaPasso(page, label) {
  await page.locator('#wizardSidebar button', { hasText: label }).click();
}

// Botão do passo na sidebar por id (1,2,4,5,6) — útil pra checar locked/enabled.
function botaoPasso(page, stepId) {
  return page.locator(`#wizardSidebar button[data-step-id="${stepId}"]`);
}

async function compartilharCopiarCodigo(page) {
  await irParaPasso(page, 'Compartilhar');
  await expect(page.locator('h2', { hasText: 'Compartilhar' })).toBeVisible({ timeout: 10000 });
  await page.locator('button', { hasText: 'Copiar código' }).click();
  await expect(page.locator('#wizardSidebar button', { hasText: 'Acompanhar' })).toBeEnabled({ timeout: 8000 });
}

async function fecharWizard(page) {
  await page.locator('#wizardHeader button[title="Fechar"]').click();
  await expect(page.locator('#sessionWizardModal')).not.toBeVisible({ timeout: 5000 });
}

// Abre a galeria do cliente num context novo e faz login com o código.
async function clienteAbrir(context, accessCode) {
  const p = await context.newPage();
  await p.goto(CLIENT_BASE);
  await expect(p.locator('#loginSection')).toBeVisible({ timeout: 10000 });
  await p.locator('#accessCode').fill(accessCode);
  await p.locator('#loginBtn').click();
  return p;
}

// Cliente seleciona N corações (em ordem) com pequeno delay para a animação/persistência.
async function clienteSelecionar(clientPage, n) {
  const hearts = clientPage.locator('.photo-heart');
  for (let i = 0; i < n; i++) {
    await hearts.nth(i).click();
    await clientPage.waitForTimeout(300);
  }
}

async function voltarParaSessoes(page, sessionName) {
  await page.bringToFront();
  await page.evaluate(() => { (window.loadTab || window.switchTab)?.('sessoes'); });
  await page.waitForTimeout(2000);
}

async function deletarSessao(page, sessionName) {
  await voltarParaSessoes(page, sessionName);
  await esconderPainelUpload(page);
  const del = page.locator('#sessionsList > div').filter({ hasText: sessionName }).first().locator('button[title="Deletar sessão"]');
  await del.click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#sessionsList')).not.toContainText(sessionName, { timeout: 10000 });
}

module.exports = {
  ADMIN_EMAIL, ADMIN_PASSWORD, CLIENT_BASE, PREFIXO_TESTE,
  FOTO, FOTO_1, FOTO_2, FOTO_3,
  loginAdmin, esconderPainelUpload, limparSessoesDeTeste, criarSessao,
  abrirWizard, subirFotosWizard, concluirUpload, irParaPasso, botaoPasso,
  compartilharCopiarCodigo, fecharWizard, clienteAbrir, clienteSelecionar,
  voltarParaSessoes, deletarSessao,
};
