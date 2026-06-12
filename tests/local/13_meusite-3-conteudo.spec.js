// Meu Site (bloco 3/N) — builders de conteúdo inline: Serviços (CRUD + bug do botão
// salvar com lista vazia), Depoimentos publicados (CRUD), Contato e Rodapé.
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

async function conteudoOriginal(page, chave) {
  const cfg = (await api(page, 'GET', '/api/site/admin/config')).json;
  return cfg.siteContent?.[chave];
}
async function restaurarConteudo(page, chave, valor) {
  await api(page, 'PUT', '/api/site/admin/config', { siteContent: { [chave]: valor ?? null } });
}

async function abrirSitePublico(browser) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(SITE_URL);
  return { ctx, page: p };
}

test('Serviços: adicionar, editar e salvar → aparece no público; remover até esvaziar ainda permite salvar', async ({ page, browser }) => {
  test.setTimeout(150000);
  await H.loginAdmin(page);
  const original = await conteudoOriginal(page, 'servicos');

  await irParaMeuSite(page);
  await subAba(page, 'config-servicos').click();
  await expect(page.locator('#addServicoBtn')).toBeVisible({ timeout: 10000 });
  const qtdInicial = await page.locator('[data-srv-title]').count();

  // Adiciona e edita
  await page.locator('#addServicoBtn').click();
  await expect(page.locator('[data-srv-title]')).toHaveCount(qtdInicial + 1);
  const titulo = `Serviço E2E ${Date.now()}`;
  const novoIdx = qtdInicial; // novo entra no fim
  await page.locator(`[data-srv-title="${novoIdx}"]`).fill(titulo);
  await page.locator(`[data-srv-desc="${novoIdx}"]`).fill('Descrição de teste E2E.');
  await page.locator(`[data-srv-price="${novoIdx}"]`).fill('R$ 123');

  let put = esperaPut(page);
  await page.locator('#saveServicosBtn').click();
  await put;
  const salvos = await conteudoOriginal(page, 'servicos');
  const item = (salvos || []).find((s) => s.title === titulo);
  expect(item).toBeTruthy();
  expect(item.price).toBe('R$ 123');

  // Público mostra o serviço
  const pub = await abrirSitePublico(browser);
  await expect(pub.page.locator('#section-servicos')).toContainText(titulo, { timeout: 15000 });
  await pub.ctx.close();

  // Remove TODOS os serviços — o botão salvar precisa continuar disponível (bug consertado:
  // antes ele só renderizava com lista não-vazia, e remover o último não podia ser salvo)
  while (await page.locator('button[title="Remover"]').count() > 0) {
    await page.locator('button[title="Remover"]').first().click();
    await page.locator('#confirmOk').click();
  }
  await expect(page.locator('#config-servicos')).toContainText('Nenhum serviço adicionado');
  await expect(page.locator('#saveServicosBtn')).toBeVisible();
  put = esperaPut(page);
  await page.locator('#saveServicosBtn').click();
  await put;
  expect(((await conteudoOriginal(page, 'servicos')) || []).length).toBe(0);

  await restaurarConteudo(page, 'servicos', original || []);
});

test('Depoimentos publicados: adicionar, editar, salvar → público; remover com confirm', async ({ page, browser }) => {
  test.setTimeout(150000);
  await H.loginAdmin(page);
  const original = await conteudoOriginal(page, 'depoimentos');

  await irParaMeuSite(page);
  await subAba(page, 'config-depoimentos').click();
  await expect(page.locator('#addDepoimentoBtn')).toBeVisible({ timeout: 10000 });
  const qtdInicial = await page.locator('[data-dep-name]').count();

  // Adiciona e edita
  await page.locator('#addDepoimentoBtn').click();
  await expect(page.locator('[data-dep-name]')).toHaveCount(qtdInicial + 1);
  const nome = `Cliente E2E ${Date.now()}`;
  const idx = qtdInicial;
  await page.locator(`[data-dep-name="${idx}"]`).fill(nome);
  await page.locator(`[data-dep-text="${idx}"]`).fill('Depoimento publicado direto pelo builder.');
  await page.locator(`[data-dep-rating="${idx}"]`).fill('4');

  let put = esperaPut(page);
  await page.locator('#saveDepoimentosBtn').click();
  await put;
  const salvos = await conteudoOriginal(page, 'depoimentos');
  const dep = (salvos || []).find((d) => d.name === nome);
  expect(dep).toBeTruthy();
  expect(dep.rating).toBe(4);

  // Público mostra o depoimento
  const pub = await abrirSitePublico(browser);
  await expect(pub.page.locator('#section-depoimentos')).toContainText(nome, { timeout: 15000 });
  await pub.ctx.close();

  // Remover (cancelar mantém; confirmar remove) e salvar
  const card = page.locator('#config-depoimentos div').filter({ has: page.locator(`[data-dep-name="${idx}"]`) }).first();
  await card.locator('button[title="Remover"]').first().click();
  await page.locator('#confirmCancel').click();
  await expect(page.locator(`[data-dep-name="${idx}"]`)).toBeVisible();
  await card.locator('button[title="Remover"]').first().click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('[data-dep-name]')).toHaveCount(qtdInicial);
  put = esperaPut(page);
  await page.locator('#saveDepoimentosBtn').click();
  await put;
  expect(((await conteudoOriginal(page, 'depoimentos')) || []).find((d) => d.name === nome)).toBeFalsy();

  await restaurarConteudo(page, 'depoimentos', original || []);
});

test('Contato: editar título/texto/endereço e salvar → persiste e aparece no público', async ({ page, browser }) => {
  test.setTimeout(120000);
  await H.loginAdmin(page);
  const original = await conteudoOriginal(page, 'contato');

  await irParaMeuSite(page);
  await subAba(page, 'config-contato').click();
  await expect(page.locator('#contatoTitle')).toBeVisible({ timeout: 10000 });

  const titulo = `Fale Comigo E2E ${Date.now()}`;
  await page.locator('#contatoTitle').fill(titulo);
  await page.locator('#contatoText').fill('Texto de contato vindo do teste E2E.');
  await page.locator('#contatoAddress').fill('Rua dos Testes, 42 - SP');

  const put = esperaPut(page);
  await page.locator('#saveContatoBtn').click();
  await put;
  const salvo = await conteudoOriginal(page, 'contato');
  expect(salvo.title).toBe(titulo);
  expect(salvo.address).toBe('Rua dos Testes, 42 - SP');

  const pub = await abrirSitePublico(browser);
  await expect(pub.page.locator('#section-contato')).toContainText(titulo, { timeout: 15000 });
  await pub.ctx.close();

  await restaurarConteudo(page, 'contato', original || {});
});

test('Rodapé: copyright, rede social e link útil salvam; remover link persiste sozinho', async ({ page, browser }) => {
  test.setTimeout(150000);
  await H.loginAdmin(page);
  const original = await conteudoOriginal(page, 'footer');

  await irParaMeuSite(page);
  await subAba(page, 'config-rodape').click();
  await expect(page.locator('#rodapeCopyright')).toBeVisible({ timeout: 10000 });

  const copyright = `© E2E ${Date.now()}`;
  await page.locator('#rodapeCopyright').fill(copyright);
  await page.locator('#socialInstagram').fill('https://instagram.com/teste-e2e');

  // Link útil novo
  await page.locator('#addRodapeLinkBtn').click();
  const qtdLinks = await page.locator('[data-link-label]').count();
  await page.locator(`[data-link-label="${qtdLinks - 1}"]`).fill('Portfólio E2E');
  await page.locator(`[data-link-url="${qtdLinks - 1}"]`).fill('#portfolio');

  let put = esperaPut(page);
  await page.locator('#saveRodapeBtn').click();
  await put;
  const salvo = await conteudoOriginal(page, 'footer');
  expect(salvo.copyright).toBe(copyright);
  expect(salvo.socialMedia.instagram).toBe('https://instagram.com/teste-e2e');
  expect((salvo.quickLinks || []).find((l) => l.label === 'Portfólio E2E')).toBeTruthy();

  // Público: copyright no rodapé
  const pub = await abrirSitePublico(browser);
  await expect(pub.page.locator('footer')).toContainText(copyright, { timeout: 15000 });
  await pub.ctx.close();

  // Remover o link (confirm) → salva sozinho (silent) e persiste
  const idxLink = (salvo.quickLinks || []).findIndex((l) => l.label === 'Portfólio E2E');
  put = esperaPut(page);
  await page.locator(`button[data-remove-link="${idxLink}"]`).click();
  await page.locator('#confirmOk').click();
  await put;
  const depois = await conteudoOriginal(page, 'footer');
  expect((depois.quickLinks || []).find((l) => l.label === 'Portfólio E2E')).toBeFalsy();

  await restaurarConteudo(page, 'footer', original || {});
});
