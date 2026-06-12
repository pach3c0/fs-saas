// Exceções e ramos do modo SELEÇÃO (nova UI, local).
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

// A — Acesso: código inválido é rejeitado (sem setup admin).
test('Cliente — código inválido é rejeitado', async ({ browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(H.CLIENT_URL);
  await expect(p.locator('#loginSection')).toBeVisible({ timeout: 10000 });
  await p.locator('#accessCode').fill('CODIGOINVALIDOXYZ');
  await p.locator('#loginBtn').click();
  await expect(p.locator('#errorMessage')).toBeVisible({ timeout: 10000 });
  await expect(p.locator('#gallerySection')).toBeHidden();
  await ctx.close();
});

// B — Pacote: não finaliza abaixo do limite; finaliza no limite exato (0 extras).
test('Cliente — não finaliza abaixo do limite; finaliza no limite (0 extras)', async ({ page, context, browser }) => {
  test.setTimeout(90000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { accessCode, name } = await H.criarSessao(page, { mode: 'selection' });
  await H.aplicarConfig(page, { extraPhotoPrice: 30, packageLimit: 2 });
  await H.subirFotosWizard(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
  await H.concluirUpload(page);
  await H.compartilharCopiarCodigo(page);
  await H.fecharWizard(page);

  const { ctx, page: cp } = await H.clienteAbrir(browser, accessCode);
  await expect(cp.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(cp.locator('.photo-heart')).toHaveCount(3, { timeout: 15000 });

  // 1 selecionada → finalizar é bloqueado (toast, sem modal de confirmação)
  await cp.locator('.photo-heart').nth(0).click();
  await cp.waitForTimeout(300);
  await cp.locator('#submitBtn').click();
  await expect(cp.getByText(/Selecione pelo menos 2/)).toBeVisible({ timeout: 4000 });
  await expect(cp.locator('#gcConfirm')).toHaveCount(0);

  // 2 selecionadas (= limite) → 0 extras → finaliza
  await cp.locator('.photo-heart').nth(1).click();
  await cp.waitForTimeout(300);
  await expect(cp.locator('#extraInfo')).toBeHidden();
  await cp.locator('#submitBtn').click();
  await cp.locator('#gcConfirm').click();
  await expect(cp.locator('.status-title')).toContainText('Seleção Enviada', { timeout: 10000 });
  await ctx.close();

  await H.deletarSessao(page, name);
});

// C — Entrega: o passo "Entregar" fica travado até TODAS as editadas subirem (gate da regra de ouro).
test('Admin — "Entregar" travado até todas as editadas subirem', async ({ page, context, browser }) => {
  test.setTimeout(120000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { accessCode, name } = await H.criarSessao(page, { mode: 'selection' });
  await H.aplicarConfig(page, { packageLimit: 2 });
  await H.subirFotosWizard(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
  await H.concluirUpload(page);
  await H.compartilharCopiarCodigo(page);
  await H.fecharWizard(page);

  const { ctx, page: cp } = await H.clienteAbrir(browser, accessCode);
  await expect(cp.locator('.photo-heart')).toHaveCount(3, { timeout: 15000 });
  await H.clienteSelecionar(cp, 3);
  await cp.locator('#submitBtn').click();
  await cp.locator('#gcConfirm').click();
  await expect(cp.locator('.status-title')).toContainText('Seleção Enviada', { timeout: 10000 });
  await ctx.close();

  await H.voltarParaSessoes(page);
  await H.abrirWizard(page, name);
  await H.irParaPasso(page, 'Editadas');
  await expect(page.locator('h2', { hasText: 'Editadas' })).toBeVisible({ timeout: 5000 });

  await expect(H.botaoPasso(page, 6)).toBeDisabled();
  await H.subirEditada(page, H.FOTO_1);
  await expect(page.locator('#wizardContent')).toContainText('1 de 3 fotos editadas enviadas', { timeout: 20000 });
  await expect(H.botaoPasso(page, 6)).toBeDisabled();
  await H.subirEditada(page, H.FOTO_2);
  await expect(page.locator('#wizardContent')).toContainText('2 de 3 fotos editadas enviadas', { timeout: 20000 });
  await H.subirEditada(page, H.FOTO_3);
  await expect(page.locator('#wizardContent')).toContainText('Todas as fotos editadas enviadas', { timeout: 30000 });
  await expect(H.botaoPasso(page, 6)).toBeEnabled();

  await H.irParaPasso(page, 'Entregar');
  await page.locator('button', { hasText: /Entregar e notificar/i }).click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#wizardContent')).toContainText('Sessão Entregue', { timeout: 10000 });
  await H.fecharWizard(page);

  await H.deletarSessao(page, name);
});

// D — Reabertura: cliente pede, admin reabre, cliente volta a poder selecionar.
test('Reabertura — cliente pede, admin reabre, cliente volta a selecionar', async ({ page, context, browser }) => {
  test.setTimeout(120000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { accessCode, name } = await H.criarSessao(page, { mode: 'selection' });
  await H.aplicarConfig(page, { packageLimit: 2 });
  await H.subirFotosWizard(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
  await H.concluirUpload(page);
  await H.compartilharCopiarCodigo(page);
  await H.fecharWizard(page);

  const { ctx, page: cp } = await H.clienteAbrir(browser, accessCode);
  await expect(cp.locator('.photo-heart')).toHaveCount(3, { timeout: 15000 });
  await H.clienteSelecionar(cp, 3);
  await cp.locator('#submitBtn').click();
  await cp.locator('#gcConfirm').click();
  await expect(cp.locator('.status-title')).toContainText('Seleção Enviada', { timeout: 10000 });

  // Cliente pede reabertura
  await cp.locator('#reopenRequestBtn').click();
  await expect(cp.locator('#reopenModal')).toBeVisible({ timeout: 5000 });
  await cp.locator('#confirmReopenBtn').click();
  await expect(cp.locator('#reopenRequestBtn')).toContainText('Pedido Enviado', { timeout: 8000 });

  // Admin vê o pedido e reabre (pelo passo Acompanhar)
  await H.voltarParaSessoes(page);
  await expect(page.locator('#sessionsList > div').filter({ hasText: name })).toContainText('Reabertura solicitada', { timeout: 10000 });
  await H.abrirWizard(page, name);
  await H.irParaPasso(page, 'Acompanhar');
  await page.locator('button', { hasText: /Reabrir seleção/i }).click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#wizardContent')).toContainText(/Aguardando/i, { timeout: 10000 });
  await H.fecharWizard(page);

  // Cliente recarrega → volta para o modo de seleção
  await cp.reload();
  await expect(cp.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(cp.locator('.photo-heart')).toHaveCount(3, { timeout: 15000 });
  await ctx.close();

  await H.deletarSessao(page, name);
});

// E — Prazo: sessão com prazo no passado mostra "Prazo Encerrado" ao cliente.
test('Cliente — prazo expirado mostra "Prazo Encerrado"', async ({ page, browser }) => {
  test.setTimeout(90000);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { accessCode, name } = await H.criarSessao(page, { mode: 'selection', deadlineDays: -1 });
  await H.fecharWizard(page); // não precisa upload/share para o cliente bater no prazo

  const { ctx, page: cp } = await H.clienteAbrir(browser, accessCode);
  await expect(cp.locator('#statusScreen')).toBeVisible({ timeout: 15000 });
  await expect(cp.locator('.status-title')).toContainText('Prazo Encerrado', { timeout: 10000 });
  await ctx.close();

  await H.deletarSessao(page, name);
});
