const { test, expect } = require('@playwright/test');

// Credenciais de teste — usar conta existente no ambiente de produção
// Não criar conta real aqui; o teste de cadastro usa slug e email únicos por execução
const TEST_EMAIL = `test-auto-${Date.now()}@cliquezoom-test.com`;

test('Jornada Completa: Erros e Cadastro com Sucesso', async ({ page }) => {
  // 1. Acessar o site
  await page.goto('/');
  await page.locator('#cadastro').scrollIntoViewIfNeeded();

  const slugInput = page.locator('#slug');
  const slugPreview = page.locator('#slugPreview');

  // --- PARTE 1: VALIDAÇÃO EM TEMPO REAL DO SLUG ---
  // Testa slug ocupado (slug "cliquezoom" deve sempre existir)
  await slugInput.fill('cliquezoom');
  await page.waitForTimeout(800);

  const currentText = await slugPreview.textContent();
  if (currentText.includes('Indisponível') || currentText.includes('ocupado')) {
    await expect(slugPreview).toHaveCSS('color', 'rgb(220, 38, 38)');
  }

  // --- PARTE 2: ERRO DE SENHAS DIFERENTES ---
  await page.fill('#name', 'Teste Automatizado');
  await page.fill('#email', TEST_EMAIL);
  await page.fill('#orgName', 'Estúdio Teste Auto');

  const uniqueSlug = `test-auto-${Date.now()}`;
  await slugInput.fill(uniqueSlug);
  await expect(slugPreview).toContainText('Disponível', { timeout: 8000 });

  await page.fill('#password', 'senha123');
  await page.fill('#confirmPassword', 'senhaErrada');
  await page.click('#submitBtn');

  const formError = page.locator('#formError');
  await expect(formError).toBeVisible();
  await expect(formError).toContainText('senhas nao conferem');

  // --- PARTE 3: SUCESSO FINAL ---
  await page.fill('#confirmPassword', 'senha123');
  await page.click('#submitBtn');

  const successState = page.locator('#successState');
  await expect(successState).toBeVisible({ timeout: 25000 });
  await expect(successState).toContainText('Cadastro realizado com sucesso!');
});
