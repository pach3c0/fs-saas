// Fluxos de venda de extras pós-entrega e conversa por foto (cliente ↔ fotógrafo).
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

test('Extras pós-entrega — cliente pede foto fora da seleção, admin aceita', async ({ page, context, browser }) => {
  test.setTimeout(120000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { accessCode, name } = await H.criarSessao(page, { mode: 'selection' });
  await H.aplicarConfig(page, { packageLimit: 2, extraPhotoPrice: 30 });
  // Ordem determinística: foto1, foto2, foto3
  await H.subirFotosSequencial(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
  await H.concluirUpload(page);
  await H.compartilharCopiarCodigo(page);
  await H.fecharWizard(page);

  // Cliente seleciona as 2 primeiras (foto1, foto2) e finaliza — foto3 fica de fora
  const c1 = await H.clienteAbrir(browser, accessCode);
  await expect(c1.page.locator('.photo-heart')).toHaveCount(3, { timeout: 15000 });
  await c1.page.locator('.photo-heart').nth(0).click();
  await c1.page.waitForTimeout(300);
  await c1.page.locator('.photo-heart').nth(1).click();
  await c1.page.waitForTimeout(300);
  await c1.page.locator('#submitBtn').click();
  await c1.page.locator('#gcConfirm').click();
  await expect(c1.page.locator('.status-title')).toContainText('Seleção Enviada', { timeout: 10000 });
  await c1.ctx.close();

  // Admin sobe editadas das 2 selecionadas e entrega
  await H.voltarParaSessoes(page);
  await H.abrirWizard(page, name);
  await H.irParaPasso(page, 'Editadas');
  await H.subirEditada(page, H.FOTO_1);
  await H.subirEditada(page, H.FOTO_2);
  await expect(page.locator('#wizardContent')).toContainText('Todas as fotos editadas enviadas', { timeout: 30000 });
  await H.irParaPasso(page, 'Entregar');
  await page.locator('button', { hasText: /Entregar e notificar/i }).click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#wizardContent')).toContainText('Sessão Entregue', { timeout: 10000 });
  await H.fecharWizard(page);

  // Cliente (entregue): foto3 aparece como extra; solicita
  const c2 = await H.clienteAbrir(browser, accessCode);
  await expect(c2.page.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  await expect(c2.page.locator('.extra-heart')).toHaveCount(1, { timeout: 10000 });
  await c2.page.locator('.extra-heart').first().click();
  await c2.page.locator('#extrasPayBtn').click();
  await expect(c2.page.getByText(/Solicitação de fotos extras enviada/i)).toBeVisible({ timeout: 8000 });
  await c2.ctx.close();

  // Admin vê e aceita a solicitação no passo Entregar
  await H.voltarParaSessoes(page);
  await H.abrirWizard(page, name);
  await H.irParaPasso(page, 'Entregar');
  await expect(page.locator('#wizardContent')).toContainText(/extra.*solicitada/i, { timeout: 10000 });
  await page.locator('button', { hasText: /Aceitar.*extra/i }).click();
  await expect(page.getByText(/Extras aceitos/i)).toBeVisible({ timeout: 8000 });
  await H.fecharWizard(page);

  await H.deletarSessao(page, name);
});

test('Comentários — cliente comenta numa foto, fotógrafo responde, cliente vê a resposta', async ({ page, context, browser }) => {
  test.setTimeout(120000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { accessCode, name } = await H.criarSessao(page, { mode: 'selection' });
  await H.aplicarConfig(page, { packageLimit: 2, commentsEnabled: true });
  await H.subirFotosWizard(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
  await H.concluirUpload(page);
  await H.compartilharCopiarCodigo(page);
  await H.fecharWizard(page);

  // Cliente comenta na 1ª foto (em modo seleção)
  const c = await H.clienteAbrir(browser, accessCode);
  await expect(c.page.locator('.photo-comment')).toHaveCount(3, { timeout: 15000 });
  await c.page.locator('.photo-comment').first().click();
  await expect(c.page.locator('#commentModal')).toBeVisible({ timeout: 5000 });
  await c.page.locator('#newCommentText').fill('Pode clarear essa foto?');
  await c.page.locator('#saveCommentBtn').click();
  await expect(c.page.locator('#commentsList')).toContainText('Pode clarear', { timeout: 8000 });
  await c.page.locator('#closeCommentBtn').click();

  // Admin responde no passo Acompanhar (badge 💬 na foto)
  await H.voltarParaSessoes(page);
  await H.abrirWizard(page, name);
  await H.irParaPasso(page, 'Acompanhar');
  await page.locator('#wizardContent button', { hasText: '💬' }).first().click();
  await expect(page.locator('#commentsModal')).toBeVisible({ timeout: 8000 });
  await H.esconderPainelUpload(page); // painel de upload intercepta o botão de enviar
  await page.locator('#adminCommentInput').fill('Claro, já ajusto!');
  await page.locator('#sendAdminCommentBtn').click();
  await expect(page.locator('#commentsList')).toContainText('Claro, já ajusto', { timeout: 8000 });
  await page.locator('#closeCommentsModal').click();

  // Cliente recarrega e vê a resposta do fotógrafo
  await c.page.reload();
  await expect(c.page.locator('.photo-comment')).toHaveCount(3, { timeout: 15000 });
  await c.page.locator('.photo-comment').first().click();
  await expect(c.page.locator('#commentModal')).toBeVisible({ timeout: 5000 });
  await expect(c.page.locator('#commentsList')).toContainText('Claro, já ajusto', { timeout: 8000 });
  await c.ctx.close();

  // Fechar o comentário restaura o wizard (fica aberto sobre a lista) — fechar antes de deletar
  await page.bringToFront();
  await expect(page.locator('#sessionWizardModal')).toBeVisible({ timeout: 8000 });
  await H.fecharWizard(page);
  await H.deletarSessao(page, name);
});
