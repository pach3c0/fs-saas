// Meu Site (bloco 2/N) — Capa (Hero Studio): camadas de texto (adicionar, editar,
// excluir, props), imagem de fundo (upload + sliders), salvar/persistir no público,
// restaurar padrão e dirty-tracking ao trocar de sub-aba.
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

async function abrirCapa(page) {
  await page.locator('.builder-nav-item[data-target="config-hero"]').click();
  await expect(page.locator('#hcAddText')).toBeVisible({ timeout: 10000 });
}

// Snapshot/restauração do siteConfig (o PUT faz merge por sub-chave)
async function snapshotConfig(page) {
  return (await api(page, 'GET', '/api/site/admin/config')).json.siteConfig || {};
}
async function restaurarConfig(page, cfg) {
  await api(page, 'PUT', '/api/site/admin/config', { siteConfig: cfg });
}

test('Hero: adicionar camada de texto, editar props, salvar → aparece no site público; excluir → some', async ({ page, browser }) => {
  test.setTimeout(150000);
  await H.loginAdmin(page);
  const cfgOriginal = await snapshotConfig(page);

  await irParaMeuSite(page);
  await abrirCapa(page);

  // Adiciona camada → entra na lista e fica editável
  await page.locator('#hcAddText').click();
  await expect(page.locator('#hcLayerList .hc-layer-item')).toHaveCount((cfgOriginal.heroLayers || []).length + 1);

  // Seleciona a camada nova (primeira da lista — ordem invertida) → painel de props abre
  await page.locator('#hcLayerList .hc-layer-item').first().click();
  await expect(page.locator('#hcLayerProps')).toBeVisible();

  // Edita o texto → nome na lista acompanha
  const textoTeste = `TESTE-E2E-HERO-${Date.now()}`;
  await page.locator('#lpText').fill(textoTeste);
  await expect(page.locator('#hcLayerList .hc-layer-item').first()).toContainText(textoTeste.substring(0, 20));

  // Tamanho via slider atualiza o label
  await page.locator('#lpSize').fill('80');
  await expect(page.locator('#lpSizeVal')).toHaveText('80px');

  // Salvar → PUT persiste a camada
  let put = page.waitForResponse((r) => r.url().includes('/api/site/admin/config') && r.request().method() === 'PUT');
  await page.locator('#hcSaveBtn').click();
  await put;
  const salvo = await snapshotConfig(page);
  const camada = (salvo.heroLayers || []).find((l) => l.text === textoTeste);
  expect(camada).toBeTruthy();
  expect(camada.fontSize).toBe(80);

  // Público: o texto da camada aparece no hero
  const pub = await browser.newContext();
  const pp = await pub.newPage();
  await pp.goto(SITE_URL);
  await expect(pp.locator('#section-hero')).toContainText(textoTeste, { timeout: 15000 });
  await pub.close();

  // Excluir a camada (✕) e salvar → some da config
  await page.locator(`#hcLayerList .hc-layer-item`, { hasText: textoTeste.substring(0, 20) }).locator('.layer-del').click();
  await expect(page.locator('#hcLayerProps')).toBeHidden();
  put = page.waitForResponse((r) => r.url().includes('/api/site/admin/config') && r.request().method() === 'PUT');
  await page.locator('#hcSaveBtn').click();
  await put;
  const depois = await snapshotConfig(page);
  expect((depois.heroLayers || []).find((l) => l.text === textoTeste)).toBeFalsy();

  await restaurarConfig(page, cfgOriginal);
});

test('Hero: sliders de fundo (zoom/posição/overlay) atualizam labels e persistem ao salvar', async ({ page }) => {
  test.setTimeout(90000);
  await H.loginAdmin(page);
  const cfgOriginal = await snapshotConfig(page);

  await irParaMeuSite(page);
  await abrirCapa(page);

  await page.locator('#hcBgScale').fill('1.5');
  await expect(page.locator('#hcBgScaleVal')).toHaveText('1.5x');
  await page.locator('#hcBgPosX').fill('30');
  await expect(page.locator('#hcBgPosXVal')).toHaveText('30%');
  await page.locator('#hcBgOverlayOpacity').fill('60');
  await expect(page.locator('#hcBgOverlayOpacityVal')).toHaveText('60%');

  const put = page.waitForResponse((r) => r.url().includes('/api/site/admin/config') && r.request().method() === 'PUT');
  await page.locator('#hcSaveBtn').click();
  await put;

  const salvo = await snapshotConfig(page);
  expect(salvo.heroScale).toBe(1.5);
  expect(salvo.heroPosX).toBe(30);
  expect(salvo.overlayOpacity).toBe(60);

  await restaurarConfig(page, cfgOriginal);
});

test('Hero: upload de imagem de fundo seta heroImage e persiste', async ({ page }) => {
  test.setTimeout(90000);
  await H.loginAdmin(page);
  const cfgOriginal = await snapshotConfig(page);

  await irParaMeuSite(page);
  await abrirCapa(page);

  const upload = page.waitForResponse((r) => r.url().includes('/api/admin/upload') && r.request().method() === 'POST');
  await page.locator('#hcBgUpload').setInputFiles(H.FOTO);
  const upResp = await upload;
  expect(upResp.ok()).toBeTruthy();

  const put = page.waitForResponse((r) => r.url().includes('/api/site/admin/config') && r.request().method() === 'PUT');
  await page.locator('#hcSaveBtn').click();
  await put;

  const salvo = await snapshotConfig(page);
  expect(salvo.heroImage).toBeTruthy();
  expect(salvo.heroImage).toMatch(/\/uploads\//);

  await restaurarConfig(page, cfgOriginal);
});

test('Hero: Restaurar Padrão (confirm) zera camadas, imagem e ajustes', async ({ page }) => {
  test.setTimeout(90000);
  await H.loginAdmin(page);
  const cfgOriginal = await snapshotConfig(page);

  await irParaMeuSite(page);
  await abrirCapa(page);

  // Garante ≥1 camada antes de restaurar
  await page.locator('#hcAddText').click();
  let put = page.waitForResponse((r) => r.url().includes('/api/site/admin/config') && r.request().method() === 'PUT');
  await page.locator('#hcSaveBtn').click();
  await put;

  // Restaurar com confirm
  await page.locator('#hcRestoreBtn').click();
  await expect(page.locator('#confirm-modal')).toBeVisible();
  put = page.waitForResponse((r) => r.url().includes('/api/site/admin/config') && r.request().method() === 'PUT');
  await page.locator('#confirmOk').click();
  await put;

  const salvo = await snapshotConfig(page);
  expect(salvo.heroLayers || []).toHaveLength(0);
  expect(salvo.heroImage || '').toBe('');
  expect(salvo.heroScale).toBe(1);
  await expect(page.locator('#hcLayerList')).toContainText('Nenhum texto adicionado');

  await restaurarConfig(page, cfgOriginal);
});

test('Hero: alteração não salva dispara o confirm de dirty ao trocar de sub-aba (descartar segue sem salvar)', async ({ page }) => {
  test.setTimeout(90000);
  await H.loginAdmin(page);
  const cfgOriginal = await snapshotConfig(page);
  const qtdOriginal = (cfgOriginal.heroLayers || []).length;

  await irParaMeuSite(page);
  await abrirCapa(page);

  // Suja a Capa (camada nova + texto editado, sem salvar) e tenta trocar de sub-aba.
  // O detector de dirty compara INPUTS com o snapshot original — editar o texto da camada
  // cria/altera um input fora do snapshot, o que conta como mudança real.
  await page.locator('#hcAddText').click();
  await page.locator('#hcLayerList .hc-layer-item').first().click();
  await page.locator('#lpText').fill('TEXTO NAO SALVO E2E');
  await page.locator('.builder-nav-item[data-target="config-secoes"]').click();
  await expect(page.locator('#confirm-modal')).toBeVisible();
  await expect(page.locator('#confirm-modal')).toContainText('alterações não salvas');

  // Descartar (cancelar) → segue para Seções SEM salvar
  await page.locator('#confirmCancel').click();
  await expect(page.locator('#sectionsList')).toBeVisible({ timeout: 10000 });
  const cfg = await snapshotConfig(page);
  expect((cfg.heroLayers || []).length).toBe(qtdOriginal); // nada foi salvo

  await restaurarConfig(page, cfgOriginal);
});
