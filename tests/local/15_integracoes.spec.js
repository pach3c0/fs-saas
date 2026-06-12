// Integrações — cobertura exaustiva: API (401 sem token, GET formato, PUT salva GA/Pixel com trim,
// PUT parcial não apaga o resto, PUT vazio/tipos inválidos → 400) + segurança (rota pública
// /api/site/config NÃO vaza accessToken nem automações internas) + UI (render dos cards, valores
// persistidos, salvar com toast, link p/ Configurações) + site público (injeção do gtag e do
// Meta Pixel quando habilitados; nada injetado quando desabilitados).
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

const SITE_URL = `${H.BASE}/site?_tenant=${H.TENANT}`;
const GA_ID = 'G-E2ETESTE99';
const PIXEL_ID = '998877665544332';

// fetch autenticado dentro da page (mesmo padrão dos outros specs)
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

// Volta GA e Pixel ao estado neutro (org `teste` é compartilhada pela suíte toda)
async function resetIntegracoes(page) {
  const r = await api(page, 'PUT', '/api/organization/integrations', {
    googleAnalytics: { enabled: false, measurementId: '' },
    metaPixel: { enabled: false, pixelId: '' },
  });
  expect(r.status).toBe(200);
}

async function irParaIntegracoes(page) {
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('integracoes'));
  await expect(page.getByText('Integrações & Marketing').first()).toBeVisible({ timeout: 10000 });
}

// Abre o site público numa página própria, bloqueando as chamadas externas reais
// (googletagmanager/facebook) — o teste valida a INJEÇÃO das tags, não o tracking em si.
async function abrirSitePublico(browser) {
  const ctx = await browser.newContext();
  await ctx.route(/googletagmanager\.com|facebook\.net|facebook\.com/, (route) => route.abort());
  const p = await ctx.newPage();
  await p.goto(SITE_URL);
  await p.waitForTimeout(1500); // injectAnalyticsScripts roda após o fetch do config
  return { ctx, page: p };
}

// ── API ────────────────────────────────────────────────────────────────────

test('API: rotas exigem autenticação (401 sem token)', async ({ request }) => {
  expect((await request.get('/api/organization/integrations')).status()).toBe(401);
  expect((await request.put('/api/organization/integrations', {
    data: { googleAnalytics: { enabled: true } },
  })).status()).toBe(401);
});

test('API: GET retorna o objeto de integrações com GA e Pixel', async ({ page }) => {
  await H.loginAdmin(page);
  const r = await api(page, 'GET', '/api/organization/integrations');
  expect(r.status).toBe(200);
  expect(r.json.success).toBe(true);
  expect(r.json.integrations).toHaveProperty('googleAnalytics');
  expect(r.json.integrations).toHaveProperty('metaPixel');
});

test('API: PUT salva GA e Pixel aplicando trim nos IDs', async ({ page }) => {
  await H.loginAdmin(page);
  const r = await api(page, 'PUT', '/api/organization/integrations', {
    googleAnalytics: { enabled: true, measurementId: `  ${GA_ID}  ` },
    metaPixel: { enabled: true, pixelId: `  ${PIXEL_ID}  ` },
  });
  expect(r.status).toBe(200);
  expect(r.json.integrations.googleAnalytics.measurementId).toBe(GA_ID);
  expect(r.json.integrations.metaPixel.pixelId).toBe(PIXEL_ID);

  // GET reflete o que foi persistido
  const g = await api(page, 'GET', '/api/organization/integrations');
  expect(g.json.integrations.googleAnalytics).toMatchObject({ enabled: true, measurementId: GA_ID });
  expect(g.json.integrations.metaPixel).toMatchObject({ enabled: true, pixelId: PIXEL_ID });
  await resetIntegracoes(page);
});

test('API: PUT parcial (só Pixel) não apaga a config de GA', async ({ page }) => {
  await H.loginAdmin(page);
  await api(page, 'PUT', '/api/organization/integrations', {
    googleAnalytics: { enabled: true, measurementId: GA_ID },
  });
  const r = await api(page, 'PUT', '/api/organization/integrations', {
    metaPixel: { enabled: false, pixelId: '111' },
  });
  expect(r.status).toBe(200);
  expect(r.json.integrations.googleAnalytics).toMatchObject({ enabled: true, measurementId: GA_ID });
  expect(r.json.integrations.metaPixel.pixelId).toBe('111');
  await resetIntegracoes(page);
});

test('API: PUT sem nenhum campo válido → 400 (vazio e tipos errados)', async ({ page }) => {
  await H.loginAdmin(page);
  const vazio = await api(page, 'PUT', '/api/organization/integrations', {});
  expect(vazio.status).toBe(400);

  // tipos errados são ignorados campo a campo — sem nada válido, 400
  const errado = await api(page, 'PUT', '/api/organization/integrations', {
    googleAnalytics: { enabled: 'sim', measurementId: 123 },
    metaPixel: 'tudo',
  });
  expect(errado.status).toBe(400);
  expect(errado.json.error).toContain('Nenhuma configuracao valida');
});

// ── Segurança: rota pública não vaza segredos ────────────────────────────────

test('Segurança: /api/site/config público NÃO expõe accessToken nem automações internas', async ({ page, request }) => {
  await H.loginAdmin(page);
  // garante que existe conteúdo interno que NÃO pode vazar
  await api(page, 'PUT', '/api/organization/integrations', {
    deadlineAutomation: { enabled: true, messageTemplate: 'template interno e2e' },
    salesAutomator: { couponPrefix: 'E2E' },
  });

  const res = await request.get(`/api/site/config?_tenant=${H.TENANT}`);
  expect(res.status()).toBe(200);
  const integ = (await res.json()).integrations;

  // o que o site precisa continua lá
  expect(integ).toHaveProperty('googleAnalytics');
  expect(integ).toHaveProperty('metaPixel');
  expect(integ).toHaveProperty('whatsapp');
  expect(integ).toHaveProperty('seo');

  // o que é interno NÃO pode aparecer
  expect(integ.metaPixel).not.toHaveProperty('accessToken');
  expect(integ).not.toHaveProperty('deadlineAutomation');
  expect(integ).not.toHaveProperty('salesAutomator');
});

// ── UI ───────────────────────────────────────────────────────────────────────

test('UI: aba renderiza os 2 cards, reflete valores salvos e tem o atalho p/ Configurações', async ({ page }) => {
  await H.loginAdmin(page);
  // semeia estado conhecido via API antes de abrir a aba
  await api(page, 'PUT', '/api/organization/integrations', {
    googleAnalytics: { enabled: true, measurementId: GA_ID },
    metaPixel: { enabled: false, pixelId: PIXEL_ID },
  });

  await irParaIntegracoes(page);
  await expect(page.getByText('Google Analytics 4')).toBeVisible();
  await expect(page.getByText('Meta Pixel (Facebook)')).toBeVisible();
  await expect(page.locator('#gaEnabled')).toBeChecked();
  await expect(page.locator('#gaId')).toHaveValue(GA_ID);
  await expect(page.locator('#pixelEnabled')).not.toBeChecked();
  await expect(page.locator('#pixelId')).toHaveValue(PIXEL_ID);
  await expect(page.locator('#saveBtn')).toBeVisible();
  // aviso de que o lembrete de prazo migrou p/ Configurações
  await expect(page.getByText('lembrete de prazo de seleção')).toBeVisible();
  await resetIntegracoes(page);
});

test('UI: preencher GA + Pixel e Salvar → toast de sucesso e persiste ao reabrir a aba', async ({ page }) => {
  await H.loginAdmin(page);
  await resetIntegracoes(page);
  await irParaIntegracoes(page);

  await page.locator('#gaEnabled').check();
  await page.locator('#gaId').fill(GA_ID);
  await page.locator('#pixelEnabled').check();
  await page.locator('#pixelId').fill(PIXEL_ID);
  await page.locator('#saveBtn').click();
  await expect(page.locator('#toast-container')).toContainText('Integrações salvas com sucesso', { timeout: 10000 });

  // sai e volta — a aba relê do backend
  await page.evaluate(() => window.switchTab('dashboard'));
  await page.waitForTimeout(800);
  await irParaIntegracoes(page);
  await expect(page.locator('#gaEnabled')).toBeChecked();
  await expect(page.locator('#gaId')).toHaveValue(GA_ID);
  await expect(page.locator('#pixelEnabled')).toBeChecked();
  await expect(page.locator('#pixelId')).toHaveValue(PIXEL_ID);
  await resetIntegracoes(page);
});

test('UI: link "Configurações › Escassês & Vendas" navega para a aba Configurações', async ({ page }) => {
  await H.loginAdmin(page);
  await irParaIntegracoes(page);
  await page.getByText('Configurações › Escassês & Vendas').click();
  await expect(page.getByText('Escassês & Vendas').first()).toBeVisible({ timeout: 10000 });
});

// ── Site público: injeção das tags ──────────────────────────────────────────

test('Site público: GA e Pixel habilitados → gtag e fbq injetados com os IDs', async ({ page, browser }) => {
  await H.loginAdmin(page);
  await api(page, 'PUT', '/api/organization/integrations', {
    googleAnalytics: { enabled: true, measurementId: GA_ID },
    metaPixel: { enabled: true, pixelId: PIXEL_ID },
  });

  const { ctx, page: sp } = await abrirSitePublico(browser);
  try {
    // GA: script externo com o ID + config inline
    await expect(sp.locator(`script[src*="googletagmanager.com/gtag/js?id=${GA_ID}"]`)).toHaveCount(1);
    const inlineGa = await sp.evaluate(() =>
      [...document.querySelectorAll('script:not([src])')].some(s => s.innerHTML.includes('gtag("config"')));
    expect(inlineGa).toBe(true);

    // Pixel: snippet fbq com o ID + noscript de fallback
    const temFbq = await sp.evaluate((id) =>
      [...document.querySelectorAll('script:not([src])')].some(s => s.innerHTML.includes(`fbq("init", "${id}")`)), PIXEL_ID);
    expect(temFbq).toBe(true);
    // noscript criado via JS guarda o conteúdo como TEXTO (não vira <img> com JS ativo) —
    // valida o fallback pelo conteúdo, não por seletor de elemento
    const temNoscript = await sp.evaluate((id) =>
      [...document.querySelectorAll('noscript')].some(n => n.innerHTML.includes(`facebook.com/tr?id=${id}`)), PIXEL_ID);
    expect(temNoscript).toBe(true);
  } finally {
    await ctx.close();
    await resetIntegracoes(page);
  }
});

test('Site público: GA e Pixel desabilitados → nenhuma tag injetada', async ({ page, browser }) => {
  await H.loginAdmin(page);
  await resetIntegracoes(page);

  const { ctx, page: sp } = await abrirSitePublico(browser);
  try {
    await expect(sp.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
    const temTracking = await sp.evaluate(() =>
      [...document.querySelectorAll('script:not([src])')].some(s =>
        s.innerHTML.includes('gtag("config"') || s.innerHTML.includes('fbq("init"')));
    expect(temTracking).toBe(false);
  } finally {
    await ctx.close();
  }
});
