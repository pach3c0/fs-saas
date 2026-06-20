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
  await page.waitForSelector('.dashboard-stats, #dashboardContent, [data-tab="sessoes"]', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.switchTab('sessoes'));
  await page.waitForSelector('#sessionsList', { timeout: 20000 });
}

// Abre o modal de nova sessão, seleciona modo multi_selection (sem cliente obrigatório),
// preenche o nome e confirma.
async function criarSessaoTeste(page, nome) {
  await page.locator('#addSessionBtn').click();
  await expect(page.locator('#newSessionModal')).toBeVisible({ timeout: 5000 });
  await page.locator('#sessionMode').selectOption('multi_selection');
  await page.locator('#sessionName').fill(nome);
  await page.locator('#confirmNewSession').click();
  await expect(page.locator('#sessionsList')).toContainText(nome, { timeout: 10000 });
}

test('Sessões — criar sessão', async ({ page }) => {
  await loginAdmin(page);
  await criarSessaoTeste(page, SESSION_NAME);
});

test('Sessões — editar nome da sessão via config panel', async ({ page }) => {
  await loginAdmin(page);

  // Abre o wizard clicando no card da primeira sessão
  const card = page.locator('#sessionsList > div').first();
  await card.click();
  await expect(page.locator('#sessionWizardModal')).toBeVisible({ timeout: 5000 });

  // O config panel é sempre visível no lado direito do wizard.
  // O nome da sessão está em input[data-cfg="name"] e salva automaticamente ao perder foco.
  const nameInput = page.locator('#sessionWizardModal input[data-cfg="name"]');
  await expect(nameInput).toBeVisible({ timeout: 5000 });

  const novoNome = `test-auto-editado-${Date.now()}`;
  await nameInput.fill(novoNome);
  await nameInput.dispatchEvent('change'); // dispara o autosave

  // O config panel mostra um span "✓ salvo" (opacity 0→1) após salvar com sucesso.
  await expect(page.locator('#sessionWizardModal span').filter({ hasText: '✓ salvo' })).toBeVisible({ timeout: 8000 });

  // Fechar o wizard ao final
  await page.locator('#sessionWizardModal button[title="Fechar"]').click();
});

test('Sessões — upload e remoção de foto', async ({ page }) => {
  await loginAdmin(page);

  // Abre o wizard clicando no card da primeira sessão
  const card = page.locator('#sessionsList > div').first();
  await card.click();
  await expect(page.locator('#sessionWizardModal')).toBeVisible({ timeout: 5000 });

  // Verifica que estamos no passo 1 (Upload)
  await expect(page.locator('#sessionWizardModal h2', { hasText: 'Upload' })).toBeVisible({ timeout: 10000 });

  const grid = page.locator('#wizardContent div[style*="aspect-ratio"]');
  const antesCount = await grid.count();

  // Faz upload via input file
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#sessionWizardModal button', { hasText: '+ Subir fotos' }).first().click(),
  ]);
  await fileChooser.setFiles(FOTO_FIXTURE);

  // Aguarda nova foto aparecer no grid
  await expect(grid).toHaveCount(antesCount + 1, { timeout: 30000 });

  // Remove a última foto: checkbox + "Deletar selecionadas"
  const ultimaFoto = grid.last();
  await ultimaFoto.hover();
  const checkbox = ultimaFoto.locator('input[type="checkbox"]').first();
  if (await checkbox.count() > 0) {
    await checkbox.check();
    const deleteBtn = page.locator('#sessionWizardModal button', { hasText: 'Deletar selecionadas' }).first();
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      await page.locator('#confirmOk').click();
    }
  }

  await expect(grid).toHaveCount(antesCount, { timeout: 10000 });

  await page.locator('#sessionWizardModal button[title="Fechar"]').click();
});

test('Sessões — deletar sessão criada pelo teste', async ({ page }) => {
  await loginAdmin(page);

  // Cria uma sessão multi_selection dedicada a este teste
  const nome = `test-auto-delete-${Date.now()}`;
  await criarSessaoTeste(page, nome);

  // Localiza o card da sessão criada e abre o wizard
  const card = page.locator('#sessionsList > div').filter({ hasText: nome }).first();
  await card.click();
  await expect(page.locator('#sessionWizardModal')).toBeVisible({ timeout: 5000 });

  // Clica no botão "Excluir" no header do wizard (ícone lixeira)
  await page.locator('#sessionWizardModal button[title="Excluir"]').click();

  // Confirma no showConfirm
  await page.locator('#confirmOk').click();

  await expect(page.locator('#sessionsList')).not.toContainText(nome, { timeout: 10000 });
});
