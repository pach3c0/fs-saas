const { test, expect } = require('@playwright/test');

test('Onda 5 - Retenção de Storage MVP', async ({ page }) => {
  // Login
  console.log('🔐 Fazendo login...');
  await page.goto('http://localhost:3051/admin');
  await page.fill('input[type="email"]', 'teste@teste.com.br');
  await page.fill('input[type="password"]', '055360');
  await page.click('button:has-text("Login")');
  await page.waitForURL('**/admin/**', { timeout: 10000 });
  console.log('✅ Login bem-sucedido');

  // Navegar para Sessões
  console.log('📋 Abrindo aba de Sessões...');
  await page.click('button:has-text("Sessoes")');
  await page.waitForSelector('#sessionsList', { timeout: 5000 });
  console.log('✅ Aba de Sessões carregada');

  // Verificar que o form tem o campo de storage
  await page.click('#addSessionBtn');
  await page.waitForSelector('#sessionStorageRetentionUntil', { timeout: 3000 });
  console.log('✅ Campo de retenção de storage existe no form');
  
  // Fechar modal
  await page.click('#cancelNewSession');
  await page.waitForTimeout(500);
  
  console.log('✅ Teste de Onda 5 concluído!');
});
