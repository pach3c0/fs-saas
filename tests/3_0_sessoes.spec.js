const { test, expect } = require('@playwright/test');
const path = require('path');

const ADMIN_EMAIL = 'ricardopacheco.nunes59@gmail.com';
const ADMIN_PASSWORD = 'qUzsov-zetkek-wokwo3';
const SESSION_NAME = `test-auto-sessao-${Date.now()}`;
const FOTO_FIXTURE = path.join(__dirname, 'fixtures/foto-teste.jpg');

async function loginAdmin(page) {
  await page.goto('/admin');
  await page.locator('#adminEmail').fill(ADMIN_EMAIL);
  await page.locator('#adminPassword').fill(ADMIN_PASSWORD);
  await page.locator('#loginSubmitBtn').click();
  await expect(page.locator('#adminPanel')).toBeVisible({ timeout: 15000 });
  // Aguardar dashboard completamente renderizado (elemento específico do dashboard)
  await page.waitForSelector('.dashboard-stats, #dashboardContent, [data-tab="sessoes"]', { timeout: 15000 });
  // Pequena pausa para garantir que postLoginSetup terminou todas as chamadas async
  await page.waitForTimeout(1500);
  // Navegar para sessões e aguardar o DOM mostrar #sessionsList
  await page.evaluate(() => window.switchTab('sessoes'));
  await page.waitForSelector('#sessionsList', { timeout: 20000 });
}

test('Sessões — criar sessão', async ({ page }) => {
  await loginAdmin(page);

  await page.locator('#addSessionBtn').click();
  await expect(page.locator('#newSessionModal')).toBeVisible({ timeout: 5000 });

  await page.locator('#sessionName').fill(SESSION_NAME);
  await page.locator('#confirmNewSession').click();

  await expect(page.locator('#sessionsList')).toContainText(SESSION_NAME, { timeout: 10000 });
});

test('Sessões — editar nome da sessão', async ({ page }) => {
  await loginAdmin(page);

  // Editar a primeira sessão disponível (pode não ser a criada neste teste)
  const editBtn = page.locator('#sessionsList button', { hasText: 'Config' }).first();
  await expect(editBtn).toBeVisible({ timeout: 5000 });
  await editBtn.click();

  await expect(page.locator('#editSessionModal')).toBeVisible({ timeout: 5000 });

  const novoNome = `test-auto-editado-${Date.now()}`;
  await page.locator('#editSessionName').fill(novoNome);
  await page.locator('#editSessionModal button', { hasText: 'Salvar' }).click();

  await expect(page.locator('body')).toContainText('Configuração salva', { timeout: 8000 });
});

test('Sessões — upload e remoção de foto', async ({ page }) => {
  await loginAdmin(page);

  // Abrir modal de fotos da primeira sessão
  const fotosBtn = page.locator('#sessionsList button', { hasText: 'Fotos' }).first();
  await expect(fotosBtn).toBeVisible({ timeout: 5000 });
  await fotosBtn.click();

  await expect(page.locator('#sessionPhotosModal')).toBeVisible({ timeout: 5000 });

  const grid = page.locator('#sessionPhotosGrid');

  // Contar fotos antes do upload
  const antesCount = await grid.locator('div[style*="aspect-ratio"]').count();

  // Fazer upload via input file
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#uploadMoreBtn').click(),
  ]);
  await fileChooser.setFiles(FOTO_FIXTURE);

  // Aguardar nova foto aparecer no grid
  await expect(grid.locator('div[style*="aspect-ratio"]')).toHaveCount(antesCount + 1, { timeout: 20000 });

  // Remover a foto (hover para mostrar botão delete, clicar no último item)
  const ultimaFoto = grid.locator('div[style*="aspect-ratio"]').last();
  await ultimaFoto.hover();
  await ultimaFoto.locator('button[title="Remover"]').click();

  // Aceitar modal showConfirm customizado
  await page.locator('#confirmOk').click();

  await expect(grid.locator('div[style*="aspect-ratio"]')).toHaveCount(antesCount, { timeout: 10000 });
});

test('Sessões — deletar sessão criada pelo teste', async ({ page }) => {
  await loginAdmin(page);

  // Criar sessão para poder deletar
  const nome = `test-auto-delete-${Date.now()}`;
  await page.locator('#addSessionBtn').click();
  await page.locator('#sessionName').fill(nome);
  await page.locator('#confirmNewSession').click();
  await expect(page.locator('#sessionsList')).toContainText(nome, { timeout: 10000 });

  // Localizar o card da sessão criada e deletar
  const card = page.locator('#sessionsList').locator('div', { hasText: nome }).first();
  const deleteBtn = card.locator('button[title="Deletar"]');
  await deleteBtn.click();

  // Aceitar confirmação do modal showConfirm (id confirmOk)
  await page.locator('#confirmOk').click();

  await expect(page.locator('#sessionsList')).not.toContainText(nome, { timeout: 10000 });
});
