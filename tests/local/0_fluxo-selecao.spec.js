// Happy path do modo SELEÇÃO com a nova UI (modal enxuto + painel de config), rodando local.
// Prova a infra completa: admin cria/configura no painel, upload, compartilhar, cliente seleciona
// e finaliza, admin sobe editadas e entrega, cliente baixa.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

test('Seleção — fluxo completo (nova UI)', async ({ page, context, browser }) => {
  test.setTimeout(120000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']); // "Copiar código" em headless

  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  // Cria (modal enxuto) → entra no wizard; configura pacote/extra no painel direito
  const { accessCode, name } = await H.criarSessao(page, { mode: 'selection' });
  await H.aplicarConfig(page, { extraPhotoPrice: 30, packageLimit: 2 });

  // Upload das 3 fotos brutas
  await H.subirFotosWizard(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
  await H.concluirUpload(page);

  // Compartilhar (registra codeSentAt)
  await H.compartilharCopiarCodigo(page);
  await H.fecharWizard(page);

  // Cliente seleciona 3 (1 extra de R$30) e finaliza
  const { ctx, page: cp } = await H.clienteAbrir(browser, accessCode);
  await expect(cp.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(cp.locator('.photo-heart')).toHaveCount(3, { timeout: 15000 });
  await H.clienteSelecionar(cp, 3);
  await expect(cp.locator('#extraInfo')).toContainText('+1 fotos extras');
  await expect(cp.locator('#extraInfo')).toContainText('R$ 30,00');
  await cp.locator('#submitBtn').click();
  await cp.locator('#gcConfirm').click();
  await expect(cp.locator('.status-title')).toContainText('Seleção Enviada', { timeout: 10000 });
  await ctx.close();

  // Admin: acompanhar (3/2 finalizada) → editadas (3) → entregar
  await H.voltarParaSessoes(page);
  await H.abrirWizard(page, name);
  await H.irParaPasso(page, 'Acompanhar');
  await expect(page.locator('#wizardContent')).toContainText('3 / 2', { timeout: 15000 });
  await expect(page.locator('#wizardContent')).toContainText('Finalizada');

  await H.irParaPasso(page, 'Editadas');
  await expect(page.locator('h2', { hasText: 'Editadas' })).toBeVisible({ timeout: 5000 });
  await H.subirEditada(page, H.FOTO_1);
  await expect(page.locator('#wizardContent')).toContainText('1 de 3 fotos editadas enviadas', { timeout: 20000 });
  await H.subirEditada(page, H.FOTO_2);
  await expect(page.locator('#wizardContent')).toContainText('2 de 3 fotos editadas enviadas', { timeout: 20000 });
  await H.subirEditada(page, H.FOTO_3);
  await expect(page.locator('#wizardContent')).toContainText('Todas as fotos editadas enviadas', { timeout: 30000 });

  await H.irParaPasso(page, 'Entregar');
  await expect(page.locator('h2', { hasText: 'Entregar' })).toBeVisible({ timeout: 5000 });
  await page.locator('button', { hasText: /Entregar e notificar/i }).click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#wizardContent')).toContainText('Sessão Entregue', { timeout: 10000 });
  await H.fecharWizard(page);

  // Cliente baixa (3 overlays de download)
  const { ctx: ctx2, page: fp } = await H.clienteAbrir(browser, accessCode);
  await expect(fp.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(fp.locator('.photo-download-overlay')).toHaveCount(3, { timeout: 10000 });
  await ctx2.close();

  // Limpeza
  await H.deletarSessao(page, name);
});
