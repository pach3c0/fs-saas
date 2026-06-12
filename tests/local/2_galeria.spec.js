// Modo GALERIA (nova UI, local): upload → compartilhar prévia → entregar → cliente baixa.
// Galeria não tem seleção: o cliente visualiza e baixa direto após a entrega.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

test('Galeria — upload → compartilhar prévia → entregar → cliente baixa', async ({ page, context, browser }) => {
  test.setTimeout(120000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { accessCode, name } = await H.criarSessao(page, { mode: 'gallery' });

  // Galeria entrega os originais: upload no passo 1 já carrega as fotos finais
  await H.subirFotosWizard(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
  await H.concluirUpload(page);

  // Compartilhar: tela de escolha → "Compartilhar prévia"
  await H.irParaPasso(page, 'Compartilhar');
  await page.locator('button', { hasText: /Compartilhar prévia/i }).click();
  await expect(page.locator('button', { hasText: 'Copiar código' })).toBeVisible({ timeout: 8000 });
  await page.locator('button', { hasText: 'Copiar código' }).click();
  await page.waitForTimeout(800); // deixa o codeSentAt registrar

  // Entregar
  await H.irParaPasso(page, 'Entregar');
  await expect(page.locator('h2', { hasText: 'Entregar' })).toBeVisible({ timeout: 5000 });
  await page.locator('button', { hasText: /Entregar e notificar/i }).click();
  await page.locator('#confirmOk').click();
  // Em galeria, após entregar o wizard volta ao passo Compartilhar — valida pelo cliente
  await page.waitForTimeout(1500);
  await H.fecharWizard(page);

  // Cliente: galeria entregue, 3 fotos com download
  const { ctx, page: cp } = await H.clienteAbrir(browser, accessCode);
  await expect(cp.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(cp.locator('.photo-download-overlay')).toHaveCount(3, { timeout: 10000 });
  // Galeria não tem corações de seleção
  await expect(cp.locator('.photo-heart')).toHaveCount(0);
  await ctx.close();

  await H.deletarSessao(page, name);
});
