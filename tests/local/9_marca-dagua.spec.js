// Marca d'água do org propagada à galeria pública do cliente.
// Configura uma marca de texto no org e verifica que o overlay aparece sobre cada foto
// no modo seleção (prévia). Restaura o org ao final (try/finally) para não vazar config.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

test('Marca d\'água — overlay com o texto configurado aparece na seleção do cliente', async ({ page, context, browser }) => {
  test.setTimeout(120000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  let name;
  try {
    await H.configurarMarcaDagua(page, {
      watermarkType: 'text',
      watermarkText: 'CliqueZoom PROVA',
      watermarkOpacity: 35,
      watermarkPosition: 'center',
      watermarkLayers: [], // força o sistema antigo (texto) em vez de camadas
    });

    const s = await H.criarSessao(page, { mode: 'selection' });
    name = s.name;
    await H.aplicarConfig(page, { packageLimit: 2 });
    await H.subirFotosWizard(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
    await H.concluirUpload(page);
    await H.compartilharCopiarCodigo(page);
    await H.fecharWizard(page);

    // Cliente em modo seleção (prévia) → marca d'água sobre cada uma das 3 fotos
    const c = await H.clienteAbrir(browser, s.accessCode);
    await expect(c.page.locator('.photo-heart')).toHaveCount(3, { timeout: 15000 });
    await expect(c.page.locator('#photoGrid')).toContainText('CliqueZoom PROVA', { timeout: 10000 });
    const marcas = c.page.locator('#photoGrid span', { hasText: 'CliqueZoom PROVA' });
    await expect(marcas.first()).toBeVisible();
    await expect(marcas).toHaveCount(3);
    await c.ctx.close();
  } finally {
    await H.limparMarcaDagua(page).catch(() => {});
  }

  if (name) await H.deletarSessao(page, name);
});
