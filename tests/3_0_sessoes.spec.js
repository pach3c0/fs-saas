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

  // Abrir wizard clicando no card da primeira sessão
  const card = page.locator('#sessionsList > div').first();
  await card.click();
  await expect(page.locator('#sessionWizardModal')).toBeVisible({ timeout: 5000 });

  // Clicar no botão ⚙️ (editar) no header do wizard
  const editBtn = page.locator('#wizardHeader button[title="Editar configurações da sessão"]');
  await expect(editBtn).toBeVisible({ timeout: 5000 });
  await editBtn.click();

  await expect(page.locator('#editSessionModal')).toBeVisible({ timeout: 5000 });

  const novoNome = `test-auto-editado-${Date.now()}`;
  await page.locator('#editSessionName').fill(novoNome);
  await page.locator('#editSessionModal button', { hasText: 'Salvar' }).click();

  await expect(page.locator('body')).toContainText('Configuração salva', { timeout: 8000 });

  // Fechar o wizard ao final
  await page.locator('#wizardHeader button[title="Fechar"]').click();
});

test('Sessões — upload e remoção de foto', async ({ page }) => {
  await loginAdmin(page);

  // Abrir wizard clicando no card da primeira sessão
  const card = page.locator('#sessionsList > div').first();
  await card.click();
  await expect(page.locator('#sessionWizardModal')).toBeVisible({ timeout: 5000 });

  // Verificar que estamos no passo 1 (Upload)
  await expect(page.locator('h2', { hasText: 'Upload' })).toBeVisible({ timeout: 10000 });

  const grid = page.locator('#wizardContent div[style*="aspect-ratio"]');

  // Contar fotos antes do upload
  const antesCount = await grid.count();

  // Fazer upload via input file
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('button', { hasText: '+ Subir fotos' }).first().click(),
  ]);
  await fileChooser.setFiles(FOTO_FIXTURE);

  // Aguardar nova foto aparecer no grid
  await expect(grid).toHaveCount(antesCount + 1, { timeout: 30000 });

  // Remover a foto (selecionar com checkbox e deletar)
  const ultimaFoto = grid.last();
  await ultimaFoto.hover();
  // Procurar por botão com ícone que oculta a foto (hidden toggle) — na verdade, podemos deletar selecionando e clicando "Deletar selecionadas"
  const checkbox = ultimaFoto.locator('input[type="checkbox"]').first();
  if (await checkbox.count() > 0) {
    await checkbox.check();
    const deleteBtn = page.locator('button', { hasText: 'Deletar selecionadas' }).first();
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      await page.locator('#confirmOk').click();
    }
  } else {
    // Fallback: tentar clicar em botão de remover direto (se existir)
    const removeBtn = ultimaFoto.locator('button').filter({ hasText: /Ocultar|Remover/ }).first();
    if (await removeBtn.count() > 0) {
      await removeBtn.click();
      await page.locator('#confirmOk').click();
    }
  }

  // Aguardar que a foto seja removida
  await expect(grid).toHaveCount(antesCount, { timeout: 10000 });

  // Fechar wizard
  await page.locator('#wizardHeader button[title="Fechar"]').click();
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
  const card = page.locator('#sessionsList > div').filter({ hasText: nome }).first();
  const deleteBtn = card.locator('button[title="Deletar sessão"]');
  await expect(deleteBtn).toBeVisible({ timeout: 5000 });
  await deleteBtn.click();

  // Aceitar confirmação do modal showConfirm (id confirmOk)
  await page.locator('#confirmOk').click();

  await expect(page.locator('#sessionsList')).not.toContainText(nome, { timeout: 10000 });
});
