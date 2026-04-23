const { test, expect } = require('@playwright/test');

test('Jornada Completa: Erros e Cadastro com Sucesso', async ({ page }) => {
  console.log('Iniciando Teste Real em https://www.cliquezoom.com.br');

  // 1. Acessar o site
  await page.goto('/');
  await page.locator('#cadastro').scrollIntoViewIfNeeded();

  const slugInput = page.locator('#slug');
  const slugPreview = page.locator('#slugPreview');

  // --- PARTE 1: TESTAR VALIDAÇÃO EM TEMPO REAL ---
  console.log('Passo 1: Verificando feedback visual do slug...');
  
  // Tentamos um nome comum, se estiver ocupado validamos o erro, se estiver livre apenas logamos
  await slugInput.fill('estudio'); 
  await page.waitForTimeout(1000); // Esperar o debounce
  
  const currentText = await slugPreview.textContent();
  if (currentText.includes('Indisponível')) {
    console.log('✓ Detectou slug ocupado corretamente.');
    await expect(slugPreview).toHaveCSS('color', 'rgb(220, 38, 38)');
  } else {
    console.log('ℹ️ O slug "estudio" está livre na produção. Verificação visual OK.');
    await expect(slugPreview).toHaveCSS('color', 'rgb(22, 163, 74)');
  }

  // --- PARTE 2: TESTAR ERRO DE SENHAS DIFERENTES ---
  console.log('Passo 2: Verificando erro de senhas diferentes...');
  await page.fill('#name', 'Teste Pacheco');
  await page.fill('#email', 'greve_oculos3n@icloud.com');
  await page.fill('#orgName', 'Estúdio de Teste');
  
  // Garantir um slug livre para este passo
  const uniqueSlug = 'teste-pacheco-' + Math.floor(Math.random() * 1000);
  await slugInput.fill(uniqueSlug);
  await expect(slugPreview).toContainText('Disponível', { timeout: 8000 });

  await page.fill('#password', 'senha123');
  await page.fill('#confirmPassword', 'senhaErrada');
  await page.click('#submitBtn');

  const formError = page.locator('#formError');
  await expect(formError).toBeVisible();
  await expect(formError).toContainText('senhas nao conferem');
  console.log('✓ Erro de senhas diferentes validado.');

  // --- PARTE 3: SUCESSO FINAL ---
  console.log('Passo 3: Realizando cadastro de sucesso...');
  await page.fill('#confirmPassword', 'senha123'); // Corrigindo a senha
  
  console.log(`Cadastrando com slug: ${uniqueSlug}...`);
  await page.click('#submitBtn');

  // Validar se chegou na tela de sucesso
  const successState = page.locator('#successState');
  await expect(successState).toBeVisible({ timeout: 25000 });
  await expect(successState).toContainText('Cadastro realizado com sucesso!');
  
  console.log('✨ JORNADA FINALIZADA COM SUCESSO!');
  console.log(`Verifique seu e-mail: greve_oculos3n@icloud.com`);
});
