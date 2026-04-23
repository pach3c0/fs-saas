const { test, expect } = require('@playwright/test');

test.describe('Landing Page - Jornada do Fotógrafo', () => {
  
  test('Deve carregar o conteúdo dinâmico e realizar cadastro com sucesso', async ({ page }) => {
    // 1. Acessar a Landing Page
    await page.goto('/');

    // 2. Verificar se o conteúdo dinâmico (Hero) carregou
    // Aguardamos que o título contenha o texto esperado (que venha do banco ou default)
    const headline = page.locator('#heroHeadline');
    await expect(headline).toBeVisible();
    
    // 3. Simular preenchimento do formulário
    const randomSuffix = Math.floor(Math.random() * 10000);
    const testSlug = `estudio-teste-${randomSuffix}`;
    const testEmail = `teste-${randomSuffix}@cliquezoom.com.br`;

    await page.fill('#name', 'Fotógrafo de Teste');
    await page.fill('#email', testEmail);
    await page.fill('#orgName', 'Meu Estúdio de Teste');
    
    // 4. Testar verificação de Slug em tempo real
    const slugInput = page.locator('#slug');
    await slugInput.fill(testSlug);

    // Aguardar o feedback visual (Verde/Disponível)
    const slugPreview = page.locator('#slugPreview');
    await expect(slugPreview).toContainText('Disponível', { timeout: 5000 });
    await expect(slugPreview).toHaveCSS('color', 'rgb(22, 163, 74)'); // #16a34a

    // 5. Preencher senhas e enviar
    await page.fill('#password', 'senha123');
    await page.fill('#confirmPassword', 'senha123');

    // 6. Clicar no botão de submissão
    await page.click('#submitBtn');

    // 7. Verificar estado de sucesso
    const successState = page.locator('#successState');
    await expect(successState).toBeVisible({ timeout: 10000 });
    await expect(successState).toContainText('Cadastro realizado com sucesso!');
    
    // Verificar se o slug correto aparece na mensagem de sucesso
    const successSlug = page.locator('#successSlug');
    await expect(successSlug).toContainText(`${testSlug}.cliquezoom.com.br`);
  });

  test('Deve mostrar erro ao tentar usar um slug já existente', async ({ page }) => {
    await page.goto('/');

    // Usaremos o slug 'soraia' que o usuário mencionou como exemplo de existente
    const slugInput = page.locator('#slug');
    await slugInput.fill('soraia');

    // Aguardar feedback de indisponibilidade (Vermelho)
    const slugPreview = page.locator('#slugPreview');
    await expect(slugPreview).toContainText('Indisponível', { timeout: 5000 });
    await expect(slugPreview).toHaveCSS('color', 'rgb(220, 38, 38)'); // #dc2626
  });

});
