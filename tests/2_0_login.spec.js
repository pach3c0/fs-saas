const { test, expect } = require('@playwright/test');

// Credenciais de uma conta de teste existente na produção
// Alterar aqui se a senha mudar
const VALID_EMAIL = 'ricardopacheco.nunes59@gmail.com';
const VALID_PASSWORD = 'qUzsov-zetkek-wokwo3';

test('Login — campos obrigatórios', async ({ page }) => {
  await page.goto('/admin');
  await page.locator('#loginSubmitBtn').click();

  // Sem preencher nada — deve mostrar feedback de validação
  const body = page.locator('body');
  await expect(body).toContainText(/e-mail|email|Digite/i, { timeout: 5000 });
});

test('Login — e-mail não cadastrado', async ({ page }) => {
  await page.goto('/admin');

  await page.locator('#adminEmail').fill('nao-existe@cliquezoom-test.com');
  await page.locator('#adminPassword').fill('qualquer');
  await page.locator('#loginSubmitBtn').click();

  await expect(page.locator('body')).toContainText('E-mail não cadastrado', { timeout: 8000 });
});

test('Login — senha incorreta', async ({ page }) => {
  await page.goto('/admin');

  await page.locator('#adminEmail').fill(VALID_EMAIL);
  await page.locator('#adminPassword').fill('senha-errada-123');
  await page.locator('#loginSubmitBtn').click();

  await expect(page.locator('body')).toContainText('Senha incorreta', { timeout: 8000 });
});

test('Login — sucesso e painel carregado', async ({ page }) => {
  await page.goto('/admin');

  await page.locator('#adminEmail').fill(VALID_EMAIL);
  await page.locator('#adminPassword').fill(VALID_PASSWORD);
  await page.locator('#loginSubmitBtn').click();

  await expect(page.locator('#adminPanel')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.nav-item').first()).toBeVisible();
  
  // Verifica se o conteúdo do dashboard carregou (auditoria 360)
  await expect(page.locator('#dashboard-content')).toBeVisible({ timeout: 15000 });
});
