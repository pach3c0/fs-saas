const { test, expect } = require('@playwright/test');

test('Login no Painel Administrativo', async ({ page }) => {
  console.log('Iniciando Teste de Login em https://www.cliquezoom.com.br/admin');

  // 1. Acessar a página de login
  await page.goto('/admin');
  
  // Esperar o formulário de login carregar (ajustado para os IDs reais do index.html)
  const emailInput = page.locator('#adminEmail');
  const passwordInput = page.locator('#adminPassword');
  const loginBtn = page.locator('#loginSubmitBtn');

  // --- CENÁRIO DE ERRO: E-mail inexistente ---
  console.log('Passo 1: Testando e-mail não cadastrado...');
  await emailInput.fill('nao-existente@cliquezoom.com.br');
  await passwordInput.fill('qualquer-coisa');
  await loginBtn.click();

  // O sistema deve mostrar um alerta ou mensagem de erro
  // No seu projeto, o backend retorna "E-mail não cadastrado" no login
  await expect(page.locator('body')).toContainText('E-mail não cadastrado', { timeout: 8000 });
  console.log('✓ Erro de e-mail inexistente validado.');

  // --- CENÁRIO DE SUCESSO: Login Real ---
  console.log('Passo 2: Testando login com credenciais válidas...');
  
  await emailInput.fill('greve_oculos3n@icloud.com');
  await passwordInput.fill('mudar123'); // Senha que usamos no teste de cadastro
  
  await loginBtn.click();

  // Validação: Após o login bem sucedido, o #loginForm deve sumir e o #adminPanel deve aparecer
  // Ou podemos checar pela presença de um item de menu real
  await expect(page.locator('#adminPanel')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.nav-item').first()).toBeVisible();
  
  console.log('✨ LOGIN REALIZADO COM SUCESSO!');
  console.log('O robô está agora dentro do seu painel administrativo.');
});
