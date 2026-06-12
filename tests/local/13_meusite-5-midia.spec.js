// Meu Site (bloco 5/N) — builders de mídia: Sobre (RTEs + foto em camadas),
// Portfólio (upload múltiplo, estilo do grid, limpar tudo), Álbuns (criar/titular/salvar)
// e Estúdio (campos + Salvar Tudo). Fluxos principais; transforms/drag ficam no recon manual.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

const SITE_URL = `${H.BASE}/site?_tenant=${H.TENANT}`;

async function api(page, method, url, body) {
  return page.evaluate(async ({ method, url, body }) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(url, {
      method,
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  }, { method, url, body });
}

async function irParaMeuSite(page) {
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('meu-site'));
  await expect(page.locator('#adminPanel')).toHaveClass(/builder-mode/, { timeout: 10000 });
  await expect(page.locator('.builder-nav-item[data-target="config-geral"]')).toBeVisible({ timeout: 10000 });
}

const subAba = (page, target) => page.locator(`.builder-nav-item[data-target="${target}"]`);
const esperaPut = (page) => page.waitForResponse((r) => r.url().includes('/api/site/admin/config') && r.request().method() === 'PUT');
const conteudo = async (page, chave) => (await api(page, 'GET', '/api/site/admin/config')).json.siteContent?.[chave];

test('Sobre: editar título/texto (RTE), subir foto em camada e salvar → persiste e aparece no público', async ({ page, browser }) => {
  test.setTimeout(150000);
  await H.loginAdmin(page);
  const original = await conteudo(page, 'sobre');

  await irParaMeuSite(page);
  await subAba(page, 'config-sobre').click();
  await expect(page.locator('#scSaveBtn')).toBeVisible({ timeout: 10000 });

  const titulo = `Sobre E2E ${Date.now()}`;
  await page.locator('#scTitle_rte').click();
  await page.locator('#scTitle_rte').fill(titulo);
  await page.locator('#scTextWrap .cz-rte-body').click();
  await page.locator('#scTextWrap .cz-rte-body').fill('Texto do sobre escrito pelo teste E2E.');

  // Upload de foto vira camada na lista
  const qtdLayers = await page.locator('#sc-layer-list .sc-layer-item').count();
  const up = page.waitForResponse((r) => r.url().includes('/api/admin/upload') && r.request().method() === 'POST');
  await page.locator('#scAddPhoto').setInputFiles(H.FOTO_1);
  await up;
  await expect(page.locator('#sc-layer-list .sc-layer-item')).toHaveCount(qtdLayers + 1, { timeout: 15000 });

  const put = esperaPut(page);
  await page.locator('#scSaveBtn').click();
  await put;

  const salvo = await conteudo(page, 'sobre');
  expect(salvo.title).toContain(titulo);
  expect(salvo.text).toContain('Texto do sobre escrito pelo teste E2E.');
  expect((salvo.canvasLayers || []).length).toBe(qtdLayers + 1);

  const ctx = await browser.newContext();
  const pub = await ctx.newPage();
  await pub.goto(SITE_URL);
  await expect(pub.locator('#section-sobre')).toContainText(titulo, { timeout: 15000 });
  await ctx.close();

  await api(page, 'PUT', '/api/site/admin/config', { siteContent: { sobre: original || {} } });
});

test('Portfólio: upload múltiplo entra no grid e persiste; estilo Misto salva; público mostra as fotos; limpar tudo esvazia', async ({ page, browser }) => {
  test.setTimeout(180000);
  await H.loginAdmin(page);
  const original = await conteudo(page, 'portfolio');

  await irParaMeuSite(page);
  await subAba(page, 'config-portfolio').click();
  await expect(page.locator('#pUploadInput')).toBeAttached({ timeout: 10000 });
  const qtdInicial = await page.locator('#pPhotoGrid .p-item').count();

  // Upload de 2 fotos de uma vez
  await page.locator('#pUploadInput').setInputFiles([H.FOTO_1, H.FOTO_2]);
  await expect(page.locator('#pPhotoGrid .p-item')).toHaveCount(qtdInicial + 2, { timeout: 30000 });
  await expect.poll(async () => ((await conteudo(page, 'portfolio'))?.photos || []).length, { timeout: 15000 })
    .toBe(qtdInicial + 2);

  // Estilo do grid: Misto → persiste
  const put = esperaPut(page);
  await page.locator('#styleMixedBtn').click();
  await put;
  expect((await conteudo(page, 'portfolio')).gridStyle).toBe('mixed');

  // Público mostra a seção com imagens
  const ctx = await browser.newContext();
  const pub = await ctx.newPage();
  await pub.goto(SITE_URL);
  await expect(pub.locator('#section-portfolio img').first()).toBeVisible({ timeout: 15000 });
  await ctx.close();

  // Limpar tudo (confirm) → grid vazio persistido
  await page.locator('#pClearBtn').click();
  await expect(page.locator('#confirm-modal')).toBeVisible();
  await page.locator('#confirmOk').click();
  await expect.poll(async () => ((await conteudo(page, 'portfolio'))?.photos || []).length, { timeout: 15000 })
    .toBe(0);

  await api(page, 'PUT', '/api/site/admin/config', { siteContent: { portfolio: original || { photos: [] } } });
});

test('Álbuns: criar álbum, titular e salvar persiste; blur também salva sozinho', async ({ page }) => {
  test.setTimeout(120000);
  await H.loginAdmin(page);
  const original = await conteudo(page, 'albums');

  await irParaMeuSite(page);
  await subAba(page, 'config-albuns').click();
  await expect(page.locator('#addAlbumBtn')).toBeVisible({ timeout: 10000 });
  const qtd = await page.locator('[data-album-title]').count();

  // Criar Álbum → card novo no TOPO (unshift)
  await page.locator('#addAlbumBtn').click();
  await expect(page.locator('[data-album-title]')).toHaveCount(qtd + 1, { timeout: 10000 });

  const titulo = `Álbum E2E ${Date.now()}`;
  await page.locator('[data-album-title="0"]').fill(titulo);

  // Blur salva silencioso
  let put = esperaPut(page);
  await page.locator('[data-album-title="0"]').blur();
  await put;
  let albums = (await conteudo(page, 'albums')) || [];
  expect(albums[0].title).toBe(titulo);

  // Botão Salvar Alterações também persiste
  await page.locator('[data-album-subtitle="0"]').fill('Subtítulo E2E');
  put = esperaPut(page);
  await page.locator('#saveAlbumsBtn').click();
  await put;
  albums = (await conteudo(page, 'albums')) || [];
  expect(albums[0].subtitle).toBe('Subtítulo E2E');

  await api(page, 'PUT', '/api/site/admin/config', { siteContent: { albums: original || [] } });
});

test('Estúdio: campos (endereço/WhatsApp/título) + toggle do mapa salvam com "Salvar Tudo"', async ({ page }) => {
  test.setTimeout(120000);
  await H.loginAdmin(page);
  const original = await conteudo(page, 'studio');

  await irParaMeuSite(page);
  await subAba(page, 'config-estudio').click();
  await expect(page.locator('#saveStudioBtn')).toBeVisible({ timeout: 10000 });

  const titulo = `Estúdio E2E ${Date.now()}`;
  await page.locator('#studioTitle_rte').click();
  await page.locator('#studioTitle_rte').fill(titulo);
  await page.locator('#studioAddress').fill('Av. dos Testes, 1000 - SP');
  await page.locator('#studioWhatsapp').fill('11912345678');

  const mapaAntes = await page.locator('#studioMapEnabledToggle').isChecked();
  await page.locator('label:has(#studioMapEnabledToggle)').click(); // input invisível — clica no switch

  const put = esperaPut(page);
  await page.locator('#saveStudioBtn').click();
  await put;

  const salvo = await conteudo(page, 'studio');
  expect(salvo.title).toContain(titulo);
  expect(salvo.address).toBe('Av. dos Testes, 1000 - SP');
  expect(salvo.whatsapp).toBe('11912345678');
  expect(Boolean(salvo.mapEnabled !== false)).toBe(!mapaAntes);

  await api(page, 'PUT', '/api/site/admin/config', { siteContent: { studio: original || {} } });
});
