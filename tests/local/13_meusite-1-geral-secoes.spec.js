// Meu Site (bloco 1/N) — casca do builder, status do site (cortina "Em breve"),
// tema (galeria/preview/salvar) e Seções (toggle/ordem/restaurar).
// O builder abre em modo próprio: painel de props à esquerda + preview (#builder-iframe) à direita.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

const SITE_URL = `${H.BASE}/site?_tenant=${H.TENANT}`;

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

async function irParaMeuSite(page) {
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('meu-site'));
  await expect(page.locator('#adminPanel')).toHaveClass(/builder-mode/, { timeout: 10000 });
  await expect(page.locator('#builder-props')).toBeVisible();
  await expect(page.locator('#builder-preview')).toBeVisible();
  // Espera o painel de props renderizar (nav vertical do builder)
  await expect(page.locator('.builder-nav-item[data-target="config-geral"]')).toBeVisible({ timeout: 10000 });
}

const subAba = (page, target) => page.locator(`.builder-nav-item[data-target="${target}"]`);

// Abre o site público numa página própria (a cortina e as seções são client-side)
async function abrirSitePublico(browser, url = SITE_URL) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(url);
  return { ctx, page: p };
}

test('Builder: abre em modo próprio (props + preview), iframe carrega o site, aba Padrão oculta p/ não-superadmin, e sair restaura o painel', async ({ page }) => {
  test.setTimeout(90000);
  await H.loginAdmin(page);
  await irParaMeuSite(page);

  // Workspace some; iframe do preview aponta para o site
  await expect(page.locator('#workspace')).toBeHidden();
  await expect(page.locator('#builder-iframe')).toHaveAttribute('src', /\/site/, { timeout: 15000 });

  // Nav vertical: 14 sub-abas visíveis; "Padrão" (superadmin) fica oculta p/ a org de teste
  for (const t of ['config-geral', 'config-secoes', 'config-hero', 'config-sobre', 'config-portfolio',
    'config-servicos', 'config-depoimentos', 'config-albuns', 'config-estudio', 'config-contato',
    'config-faq', 'config-rodape', 'config-cliente', 'config-personalizar']) {
    await expect(subAba(page, t)).toBeVisible();
  }
  await expect(page.locator('#adminTemplateNavItem')).toBeHidden();

  // Botões de device trocam o ativo
  await page.locator('.bd-btn[data-device="mobile"]').click();
  await expect(page.locator('.bd-btn[data-device="mobile"]')).toHaveClass(/active/);
  await expect(page.locator('.bd-btn[data-device="desktop"]')).not.toHaveClass(/active/);
  await page.locator('.bd-btn[data-device="desktop"]').click();
  await expect(page.locator('.bd-btn[data-device="desktop"]')).toHaveClass(/active/);

  // Sair do builder (trocar de tab) restaura o workspace
  await page.evaluate(() => window.switchTab('dashboard'));
  await expect(page.locator('#adminPanel')).not.toHaveClass(/builder-mode/, { timeout: 10000 });
  await expect(page.locator('#builder-preview')).toBeHidden();
  await expect(page.locator('#workspace')).toBeVisible();
});

test('Status do site: desativar mostra cortina "Em breve" no público; reativar volta o site', async ({ page, browser }) => {
  test.setTimeout(120000);
  await H.loginAdmin(page);
  await irParaMeuSite(page);

  const toggle = page.locator('#siteEnabledToggle');
  // O input é invisível (opacity:0) — o clique vai no label do switch
  const switchLabel = page.locator('label:has(#siteEnabledToggle)');
  expect(await toggle.isChecked()).toBe(true); // estado base do ambiente dev

  // Desativa → PUT + badge DESATIVADO
  let put = page.waitForResponse((r) => r.url().includes('/api/site/admin/config') && r.request().method() === 'PUT');
  await switchLabel.click();
  await put;
  await expect(page.locator('#siteStatusBadge')).toBeVisible();

  // Público: cortina "Em breve" (client-side) no lugar do site
  const off = await abrirSitePublico(browser);
  await expect(off.page.getByText('Estamos preparando algo especial')).toBeVisible({ timeout: 15000 });
  await expect(off.page.locator('#section-hero')).toHaveCount(0); // body substituído pela cortina
  await off.ctx.close();

  // Reativa → badge some e o site volta
  put = page.waitForResponse((r) => r.url().includes('/api/site/admin/config') && r.request().method() === 'PUT');
  await switchLabel.click();
  await put;
  await expect(page.locator('#siteStatusBadge')).toBeHidden();

  const on = await abrirSitePublico(browser);
  await expect(on.page.locator('#section-hero')).toBeVisible({ timeout: 15000 });
  await on.ctx.close();
});

test('Tema: galeria com 5 temas, selecionar não salva sozinho, Salvar persiste e aplica no público; Visualizar usa preview sem salvar', async ({ page, browser }) => {
  test.setTimeout(120000);
  await H.loginAdmin(page);

  // Snapshot p/ restaurar no fim
  const original = (await api(page, 'GET', '/api/site/admin/config')).json;
  const temaOriginal = original.siteTheme || 'elegante';
  const temaNovo = temaOriginal === 'escuro' ? 'moderno' : 'escuro';

  await irParaMeuSite(page);

  // Galeria: 5 cards; o tema salvo tem o check verde
  await expect(page.locator('.template-card')).toHaveCount(5);
  await expect(page.locator(`.template-card[data-theme="${temaOriginal}"] .material-symbols-outlined`)).toHaveText('check_circle');

  // Link Visualizar: preview por query, sem alterar o banco
  const href = await page.locator(`.template-card[data-theme="${temaNovo}"] a`).getAttribute('href');
  expect(href).toContain('_preview=1');
  expect(href).toContain(`_preview_theme=${temaNovo}`);
  expect(href).toContain(`_tenant=${H.TENANT}`);
  const prev = await abrirSitePublico(browser, href);
  await expect(prev.page.locator('html')).toHaveAttribute('data-theme', temaNovo, { timeout: 15000 });
  await prev.ctx.close();
  expect((await api(page, 'GET', '/api/site/admin/config')).json.siteTheme || 'elegante').toBe(temaOriginal);

  // Selecionar o card marca a seleção mas NÃO salva
  await page.locator(`.template-card[data-theme="${temaNovo}"]`).click();
  await expect(page.locator(`.template-card[data-theme="${temaNovo}"]`)).toHaveClass(/active/);
  expect((await api(page, 'GET', '/api/site/admin/config')).json.siteTheme || 'elegante').toBe(temaOriginal);

  // Salvar Tema → PUT persiste + label da topbar + público muda de tema
  const put = page.waitForResponse((r) => r.url().includes('/api/site/admin/config') && r.request().method() === 'PUT');
  await page.locator('#saveGeralBtn').click();
  await put;
  expect((await api(page, 'GET', '/api/site/admin/config')).json.siteTheme).toBe(temaNovo);
  await expect(page.locator('#builder-preview-theme-label')).toContainText(/Tema:/);

  const pub = await abrirSitePublico(browser);
  await expect(pub.page.locator('html')).toHaveAttribute('data-theme', temaNovo, { timeout: 15000 });
  await pub.ctx.close();

  // Restaura o tema original
  await api(page, 'PUT', '/api/site/admin/config', { siteTheme: temaOriginal });
});

test('Aplicar Exemplo: pede confirmação e cancelar não altera nada', async ({ page }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);

  const antes = (await api(page, 'GET', '/api/site/admin/config')).json;

  await irParaMeuSite(page);
  await page.locator('#applyDefaultTemplateBtn').click();
  await expect(page.locator('#confirm-modal')).toBeVisible();
  await expect(page.locator('#confirm-modal')).toContainText('Aplicar conteúdo de exemplo?');
  await page.locator('#confirmCancel').click();
  await expect(page.locator('#confirm-modal')).toHaveCount(0);

  const depois = (await api(page, 'GET', '/api/site/admin/config')).json;
  expect(depois.siteTheme).toBe(antes.siteTheme);
  expect(JSON.stringify(depois.siteContent?.servicos || null)).toBe(JSON.stringify(antes.siteContent?.servicos || null));
});

test('Seções: lista 10, desativar uma some do público, reordenar persiste e Restaurar volta ao padrão', async ({ page, browser }) => {
  test.setTimeout(150000);
  await H.loginAdmin(page);

  const original = (await api(page, 'GET', '/api/site/admin/config')).json;
  const secoesOriginais = original.siteSections || [];

  await irParaMeuSite(page);
  await subAba(page, 'config-secoes').click();
  await expect(page.locator('.sec-drag-item')).toHaveCount(10);

  // Desativa FAQ e salva
  await page.locator('input[data-sec-check="faq"]').uncheck();
  let put = page.waitForResponse((r) => r.url().includes('/api/site/admin/config') && r.request().method() === 'PUT');
  await page.locator('#saveSectionsBtn').click();
  await put;
  const semFaq = (await api(page, 'GET', '/api/site/admin/config')).json.siteSections;
  expect(semFaq).not.toContain('faq');

  // Público: seção FAQ não aparece (client-side esconde/omite a section)
  const pub = await abrirSitePublico(browser);
  await expect(pub.page.locator('#section-hero')).toBeVisible({ timeout: 15000 });
  await expect(pub.page.locator('#section-faq')).toBeHidden();
  await pub.ctx.close();

  // Reordena: desce a primeira seção uma posição e salva
  const primeira = await page.locator('.sec-drag-item').first().getAttribute('data-sec-id');
  await page.locator('.sec-drag-item').first().locator('button', { hasText: '▼' }).click();
  put = page.waitForResponse((r) => r.url().includes('/api/site/admin/config') && r.request().method() === 'PUT');
  await page.locator('#saveSectionsBtn').click();
  await put;
  const reordenadas = (await api(page, 'GET', '/api/site/admin/config')).json.siteSections;
  expect(reordenadas[1]).toBe(primeira); // a antiga 1ª agora é a 2ª entre as ativas

  // Restaurar padrão (confirm) → DEFAULTS do builder
  await page.locator('#restoreSectionsBtn').click();
  await expect(page.locator('#confirm-modal')).toBeVisible();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#confirm-modal')).toHaveCount(0);
  await expect.poll(async () => (await api(page, 'GET', '/api/site/admin/config')).json.siteSections)
    .toEqual(['hero', 'portfolio', 'albuns', 'servicos', 'estudio', 'depoimentos', 'contato', 'sobre', 'faq']);

  // Restaura o estado original do ambiente
  await api(page, 'PUT', '/api/site/admin/config', { siteSections: secoesOriginais });
});
