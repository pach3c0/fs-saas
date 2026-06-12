// Gestão de fotos no passo Upload: ocultar/mostrar, definir capa, deletar, reabrir upload,
// e a regra de não ocultar abaixo do pacote (seleção).
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

test('Admin — ocultar/mostrar, capa, deletar e reabrir upload (galeria)', async ({ page }) => {
  test.setTimeout(90000);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { name } = await H.criarSessao(page, { mode: 'gallery' });
  await H.subirFotosWizard(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);

  // Ocultar a 1ª foto → filtro "Ocultas (1)"
  await page.locator('#wizardContent button[title="Ocultar foto"]').first().click();
  await expect(page.locator('#wizardContent button', { hasText: /Ocultas \(1\)/ })).toBeVisible({ timeout: 8000 });
  // Mostrar de volta → "Ocultas (0)"
  await page.locator('#wizardContent button[title="Mostrar foto"]').first().click();
  await expect(page.locator('#wizardContent button', { hasText: /Ocultas \(0\)/ })).toBeVisible({ timeout: 8000 });

  // Definir capa numa foto do grid → badge CAPA
  await page.locator('#wizardContent button[title="Definir como capa"]').first().click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#wizardContent')).toContainText('CAPA', { timeout: 8000 });

  // Deletar 1 foto via seleção + "Deletar selecionadas" → restam 2
  await page.locator('#wizardContent input[type="checkbox"][data-id]').first().check();
  await page.locator('#wizardContent button', { hasText: 'Deletar selecionadas' }).click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#wizardContent button', { hasText: /Todas \(2\)/ })).toBeVisible({ timeout: 8000 });

  // Concluir upload e reabrir
  await H.concluirUpload(page);
  await expect(page.locator('button', { hasText: 'Reabrir upload' })).toBeVisible({ timeout: 8000 });
  await page.locator('button', { hasText: 'Reabrir upload' }).click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('button', { hasText: '✓ Concluí upload' })).toBeVisible({ timeout: 8000 });

  await H.fecharWizard(page);
  await H.deletarSessao(page, name);
});

test('Admin — não permite ocultar abaixo do pacote (seleção)', async ({ page }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { name } = await H.criarSessao(page, { mode: 'selection' });
  await H.aplicarConfig(page, { packageLimit: 3 });
  await H.subirFotosWizard(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);

  // Pacote 3 com 3 visíveis → ocultar é bloqueado com aviso
  await page.locator('#wizardContent button[title="Ocultar foto"]').first().click();
  await expect(page.getByText(/Não é possível ocultar/)).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#wizardContent button', { hasText: /Visíveis \(3\)/ })).toBeVisible();

  await H.fecharWizard(page);
  await H.deletarSessao(page, name);
});
