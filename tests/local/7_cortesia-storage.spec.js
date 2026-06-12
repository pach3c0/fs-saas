// Cortesia (foto fora da seleção entregue como agrado) e painel de Armazenamento.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

test('Cortesia — foto fora da seleção com editada vira cortesia (admin + cliente)', async ({ page, context, browser }) => {
  test.setTimeout(120000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { accessCode, name } = await H.criarSessao(page, { mode: 'selection' });
  await H.aplicarConfig(page, { packageLimit: 2 });
  await H.subirFotosSequencial(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
  await H.concluirUpload(page);
  await H.compartilharCopiarCodigo(page);
  await H.fecharWizard(page);

  // Cliente seleciona foto1, foto2 — foto3 fica de fora
  const c = await H.clienteAbrir(browser, accessCode);
  await expect(c.page.locator('.photo-heart')).toHaveCount(3, { timeout: 15000 });
  await c.page.locator('.photo-heart').nth(0).click(); await c.page.waitForTimeout(300);
  await c.page.locator('.photo-heart').nth(1).click(); await c.page.waitForTimeout(300);
  await c.page.locator('#submitBtn').click();
  await c.page.locator('#gcConfirm').click();
  await expect(c.page.locator('.status-title')).toContainText('Seleção Enviada', { timeout: 10000 });
  await c.ctx.close();

  // Admin: editadas das 2 selecionadas + foto3 como cortesia (confirma o aviso de "não selecionada")
  await H.voltarParaSessoes(page);
  await H.abrirWizard(page, name);
  await H.irParaPasso(page, 'Editadas');
  await H.subirEditada(page, H.FOTO_1);
  await H.subirEditada(page, H.FOTO_2);
  await expect(page.locator('#wizardContent')).toContainText('Todas as fotos editadas enviadas', { timeout: 30000 });
  // foto3 não selecionada → ao subir editada, pede confirmação
  await H.subirEditada(page, H.FOTO_3);
  await page.locator('#confirmOk').click();
  await expect(page.locator('#wizardContent')).toContainText('Cortesia', { timeout: 15000 });

  // Entrega
  await H.irParaPasso(page, 'Entregar');
  await page.locator('button', { hasText: /Entregar e notificar/i }).click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#wizardContent')).toContainText('Sessão Entregue', { timeout: 10000 });
  await H.fecharWizard(page);

  // Cliente: 3 fotos para download (2 selecionadas + 1 cortesia) com badge Cortesia
  const c2 = await H.clienteAbrir(browser, accessCode);
  await expect(c2.page.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(c2.page.locator('.photo-download-overlay')).toHaveCount(3, { timeout: 10000 });
  await expect(c2.page.locator('#photoGrid')).toContainText('Cortesia');
  await c2.ctx.close();

  await H.deletarSessao(page, name);
});

test('Armazenamento — painel de retenção aparece com seus controles (galeria)', async ({ page, context }) => {
  test.setTimeout(90000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { name } = await H.criarSessao(page, { mode: 'gallery' });

  // Define um prazo de retenção pelo painel
  const dataRet = new Date(); dataRet.setDate(dataRet.getDate() + 30);
  const retStr = dataRet.toISOString().split('T')[0];
  const retInput = page.locator('#wizardConfigPanel [data-cfg="storageRetentionUntil"]');
  const putRet = page.waitForResponse((r) => /\/api\/sessions\/[a-f0-9]+$/.test(r.url()) && r.request().method() === 'PUT');
  await retInput.fill(retStr);
  await retInput.blur();
  await putRet;

  await H.subirFotosWizard(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
  await H.concluirUpload(page);

  // Galeria: escolher prévia (libera o passo Entregar onde fica o painel de storage)
  await H.irParaPasso(page, 'Compartilhar');
  await page.locator('button', { hasText: /Compartilhar prévia/i }).click();
  await page.waitForTimeout(600);
  await H.irParaPasso(page, 'Entregar');
  // Com prazo de retenção definido, o painel de Armazenamento aparece com seus controles.
  await expect(page.locator('#wizardContent')).toContainText('Armazenamento', { timeout: 8000 });
  await expect(page.locator('#wizardContent input[type="date"]').first()).toBeVisible();
  await expect(page.locator('#wizardContent button', { hasText: /Estender prazo/i })).toBeVisible();
  await expect(page.locator('#wizardContent button', { hasText: /Arquivar/i })).toBeVisible();
  await expect(page.locator('#wizardContent button', { hasText: /Deletar todas as fotos/i })).toBeVisible();

  await H.fecharWizard(page);
  await H.deletarSessao(page, name);
});
