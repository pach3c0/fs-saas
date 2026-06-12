// Locks por estágio do painel de config (lógica nova do redesign).
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

test('Painel — resolução trava após o 1º upload', async ({ page }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { name } = await H.criarSessao(page, { mode: 'selection' });
  // Antes do upload: resolução editável
  await expect(page.locator('#wizardConfigPanel [data-cfg="photoResolution"]')).toBeEnabled();

  // Após subir 1 foto: trava
  await H.subirFotosWizard(page, [H.FOTO_1]);
  await expect(page.locator('#wizardConfigPanel [data-cfg="photoResolution"]')).toBeDisabled({ timeout: 8000 });
  await expect(page.locator('#wizardConfigPanel')).toContainText('Trava após o 1º upload');

  await H.fecharWizard(page);
  await H.deletarSessao(page, name);
});

test('Painel — modo trava e pacote ganha mínimo após o envio do cliente', async ({ page, context, browser }) => {
  test.setTimeout(90000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { accessCode, name } = await H.criarSessao(page, { mode: 'selection' });
  await H.aplicarConfig(page, { packageLimit: 2 });
  // Antes do envio: modo editável
  await expect(page.locator('#wizardConfigPanel [data-cfg="mode"]')).toBeEnabled();

  await H.subirFotosWizard(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
  await H.concluirUpload(page);
  await H.compartilharCopiarCodigo(page);
  await H.fecharWizard(page);

  const { ctx, page: cp } = await H.clienteAbrir(browser, accessCode);
  await expect(cp.locator('.photo-heart')).toHaveCount(3, { timeout: 15000 });
  await H.clienteSelecionar(cp, 2);
  await cp.locator('#submitBtn').click();
  await cp.locator('#gcConfirm').click();
  await expect(cp.locator('.status-title')).toContainText('Seleção Enviada', { timeout: 10000 });
  await ctx.close();

  await H.voltarParaSessoes(page);
  await H.abrirWizard(page, name);

  // Modo travado após o envio
  await expect(page.locator('#wizardConfigPanel [data-cfg="mode"]')).toBeDisabled();
  await expect(page.locator('#wizardConfigPanel')).toContainText('O modo trava');

  // Pacote: mínimo = 2 (já selecionadas); tentar 1 volta para 2
  const pkg = page.locator('#wizardConfigPanel [data-cfg="packageLimit"]');
  await expect(pkg).toHaveAttribute('min', '2');
  await pkg.fill('1');
  await pkg.blur();
  await expect(pkg).toHaveValue('2');

  await H.fecharWizard(page);
  await H.deletarSessao(page, name);
});

// Capa agora se ajusta no painel lateral (a ⚙️/modal de edição foi aposentada).
test('Painel — capa: subir pelo painel salva e remover limpa', async ({ page }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  // Cria sem capa para validar o ajuste pelo painel
  const { name } = await H.criarSessao(page, { mode: 'selection', withCover: false });

  const panel = page.locator('#wizardConfigPanel');
  await expect(panel).toContainText('Foto de capa');
  await expect(panel.locator('img')).toHaveCount(0); // sem capa ainda

  // Sobe a capa pelo painel (upload + autosave via PUT)
  const putCover = page.waitForResponse(r => /\/api\/sessions\/[a-f0-9]+$/.test(r.url()) && r.request().method() === 'PUT');
  await panel.locator('[data-cfg="coverPhoto"]').setInputFiles(H.FOTO);
  await putCover;
  await expect(panel.locator('img')).toHaveCount(1, { timeout: 10000 });
  await expect(panel.locator('button', { hasText: 'Remover capa' })).toBeVisible();

  // Remove a capa
  const putRemove = page.waitForResponse(r => /\/api\/sessions\/[a-f0-9]+$/.test(r.url()) && r.request().method() === 'PUT');
  await panel.locator('button', { hasText: 'Remover capa' }).click();
  await putRemove;
  await expect(panel.locator('img')).toHaveCount(0);
  await expect(panel).toContainText('Sem capa');

  await H.fecharWizard(page);
  await H.deletarSessao(page, name);
});
