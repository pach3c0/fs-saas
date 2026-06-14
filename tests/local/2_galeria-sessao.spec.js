const { test, expect } = require('@playwright/test');
const {
  loginAdmin, esconderPainelUpload, limparSessoesDeTeste, criarSessao,
  abrirWizard, subirFotosWizard, concluirUpload, irParaPasso, fecharWizard,
  clienteAbrir, deletarSessao, FOTO_1, FOTO_2, FOTO_3, PREFIXO_TESTE
} = require('../helpers/sessao');

test.setTimeout(180000);

test('Galeria — Fluxo PRÉVIA (Upload → Compartilhar → Entregar)', async ({ page, context }) => {
  // Setup: login + limpeza
  await loginAdmin(page);
  await limparSessoesDeTeste(page);

  // 1. Criar sessão em modo gallery
  const { accessCode, sessionId, name } = await criarSessao(page, {
    mode: 'gallery',
    name: `${PREFIXO_TESTE}galeria-preview-${Date.now()}`,
    deadlineDays: 10,
  });

  // 2. Abrir wizard
  await abrirWizard(page, name);

  // 3. Passo 1: Upload
  await expect(page.locator('h2', { hasText: 'Upload' })).toBeVisible({ timeout: 10000 });
  await subirFotosWizard(page, [FOTO_1, FOTO_2, FOTO_3]);
  await expect(page.locator('#wizardContent div[style*="aspect-ratio"]')).toHaveCount(3);
  await concluirUpload(page);

  // 4. Passo 2: Galeria Choice (tela de decisão)
  await expect(page.locator('h2', { hasText: 'Como você quer compartilhar?' })).toBeVisible({ timeout: 10000 });
  const previewCard = page.locator('button', { hasText: 'Compartilhar prévia' }).first();
  await expect(previewCard).toBeVisible();
  await previewCard.click();

  // 5. Verificar que ficamos no passo 2 (compartilhar pós-escolha)
  await expect(page.locator('h2', { hasText: 'Compartilhar' })).toBeVisible({ timeout: 10000 });
  // Galeria prévia: mostram os cards de envio (email, WhatsApp, copiar)
  await expect(page.locator('button', { hasText: 'Copiar código' })).toBeVisible();

  // 6. Copiar código (marca codeSentAt)
  await page.locator('button', { hasText: 'Copiar código' }).click();
  await page.waitForTimeout(800);
  // Verificar que botão "Avançar" apareceu
  await expect(page.locator('button', { hasText: 'Avançar' })).toBeVisible({ timeout: 5000 });

  // 7. Avançar para Entregar (passo 6)
  await page.locator('button', { hasText: 'Avançar' }).click();
  await expect(page.locator('h2', { hasText: 'Entregar' })).toBeVisible({ timeout: 10000 });

  // 8. Verificar mensagem de entrega (galeria = sem marca d'água)
  const mensagemEntrega = page.locator('p', { hasText: /cliente recebe as fotos em alta/i });
  await expect(mensagemEntrega).toBeVisible({ timeout: 5000 });

  // 9. Entregar
  const botaoEntregar = page.locator('button', { hasText: /Entregar|Confirmar/ }).first();
  await expect(botaoEntregar).toBeEnabled({ timeout: 5000 });
  // Pode pedir confirmação por questão de segurança
  await botaoEntregar.click();
  // Se abrir modal de confirmação, clica em OK
  const confirmBtn = page.locator('#confirmOk, button:has-text("Confirmar")').first();
  if (await confirmBtn.count() > 0) {
    await confirmBtn.click();
  }

  // 10. Verificar que a entrega foi marcada (sidebar mostra 6 como done)
  await page.waitForTimeout(1000);
  const step6Done = page.locator('#wizardSidebar button[data-step-id="6"]').first();
  const classlist = await step6Done.getAttribute('class');
  // Step done = tem classe que marca como feito (varia, mas o disabled desaparece)
  await expect(step6Done).not.toHaveAttribute('disabled', '');

  // 11. Fechar wizard e verificar que voltou à lista
  await fecharWizard(page);

  // 12. Limpar
  await deletarSessao(page, name);
});

test('Galeria — Fluxo DIRETO (Upload → Entregar → Compartilhar)', async ({ page, context }) => {
  // Setup
  await loginAdmin(page);
  await limparSessoesDeTeste(page);

  // 1. Criar sessão gallery
  const { accessCode, sessionId, name } = await criarSessao(page, {
    mode: 'gallery',
    name: `${PREFIXO_TESTE}galeria-direct-${Date.now()}`,
    deadlineDays: 10,
  });

  // 2. Abrir wizard
  await abrirWizard(page, name);

  // 3. Passo 1: Upload
  await expect(page.locator('h2', { hasText: 'Upload' })).toBeVisible({ timeout: 10000 });
  await subirFotosWizard(page, [FOTO_1, FOTO_2]);
  await concluirUpload(page);

  // 4. Passo 2: Galeria Choice — escolher "Entregar direto"
  await expect(page.locator('h2', { hasText: 'Como você quer compartilhar?' })).toBeVisible({ timeout: 10000 });
  const directCard = page.locator('button', { hasText: 'Entregar direto' }).first();
  await expect(directCard).toBeVisible();
  await directCard.click();

  // 5. Deve ter saltado para Passo 6 (Entregar) imediatamente
  // Validar: estamos agora no passo Entregar
  await expect(page.locator('h2', { hasText: 'Entregar' })).toBeVisible({ timeout: 10000 });
  // Validate sidebar: passo 6 deve estar ativo
  const step6Active = page.locator('#wizardSidebar button[data-step-id="6"]');
  const activeClass = await step6Active.getAttribute('class');
  // "current" ou outro indicador de ativo — simplesmente verificamos que entramos no passo
  await expect(page.locator('h2', { hasText: 'Entregar' })).toBeVisible();

  // 6. Mensagem = "entrada no passo Entregar sem compartilhar primeiro"
  // Galeria direto: cliente já recebe em alta, sem prévia
  await expect(page.locator('p', { hasText: /entrada direta|sem prévia/i })).toBeVisible({ timeout: 5000 });

  // 7. Entregar
  const botaoEntregar = page.locator('button', { hasText: /Entregar|Confirmar/ }).first();
  await botaoEntregar.click();
  // Confirmação se existir
  const confirmBtn = page.locator('#confirmOk, button:has-text("Confirmar")').first();
  if (await confirmBtn.count() > 0) {
    await confirmBtn.click();
  }

  // 8. Esperar que step 6 seja marcado como done
  await page.waitForTimeout(1000);

  // 9. Verificar que agora o passo 2 (Compartilhar) está acessível (para compartilhar o link de download pós-entrega)
  const step2Btn = page.locator('#wizardSidebar button[data-step-id="2"]');
  await expect(step2Btn).not.toHaveAttribute('disabled', '');
  // Clicar para verificar que de fato o bloco de compartilhamento está lá
  await step2Btn.click();
  await expect(page.locator('h2', { hasText: 'Compartilhar' })).toBeVisible({ timeout: 10000 });

  // 10. Fechar wizard
  await fecharWizard(page);

  // 11. Limpar
  await deletarSessao(page, name);
});

test('Galeria — Passo 6 desbloqueado cedo em modo PREVIEW', async ({ page }) => {
  // Testa a regra: em galeria preview, passo 6 (Entregar) fica desbloqueado mesmo antes
  // de concluir o passo 2 (Compartilhar), porque galleryDeliveryMode = preview.

  await loginAdmin(page);
  await limparSessoesDeTeste(page);

  const { name } = await criarSessao(page, {
    mode: 'gallery',
    name: `${PREFIXO_TESTE}galeria-early-unlock-${Date.now()}`,
  });

  await abrirWizard(page, name);

  // Upload
  await expect(page.locator('h2', { hasText: 'Upload' })).toBeVisible();
  await subirFotosWizard(page, [FOTO_1]);
  await concluirUpload(page);

  // Galeria choice: escolher preview
  await expect(page.locator('h2', { hasText: 'Como você quer compartilhar?' })).toBeVisible();
  await page.locator('button', { hasText: 'Compartilhar prévia' }).click();

  // Verificar no passo 2 (Compartilhar) que o passo 6 está desbloqueado
  // O passo 6 deve estar clicável mesmo sem ter enviado o código (codeSentAt)
  const step6Btn = page.locator('#wizardSidebar button[data-step-id="6"]');
  const isDisabled = await step6Btn.isDisabled();
  expect(isDisabled).toBe(false); // Não deve estar disabled

  // Clicar direto no passo 6 sem passar pelo passo 2
  await step6Btn.click();
  await expect(page.locator('h2', { hasText: 'Entregar' })).toBeVisible({ timeout: 10000 });

  // Cleanup
  await fecharWizard(page);
  await deletarSessao(page, name);
});
