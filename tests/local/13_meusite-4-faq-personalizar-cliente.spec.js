// Meu Site (bloco 4/N) — FAQ (CRUD + preservação de edições nos re-renders),
// Personalizar (paleta/fonte em siteStyle + reset) e Área do Cliente (autosave).
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

test('FAQ: editar pergunta sobrevive ao "+ Adicionar" (bug consertado), salvar persiste e aparece no público; remover persiste', async ({ page, browser }) => {
  test.setTimeout(150000);
  await H.loginAdmin(page);
  const original = (await api(page, 'GET', '/api/site/admin/config')).json.siteContent?.faq;

  await irParaMeuSite(page);
  await subAba(page, 'config-faq').click();
  await expect(page.locator('#addFaqBtn')).toBeVisible({ timeout: 10000 });
  const qtd = await page.locator('.faq-editor-card').count();
  expect(qtd).toBeGreaterThan(0); // sem FAQ salvo, o builder semeia os padrões

  // Edita a 1ª pergunta SEM salvar e clica "+ Adicionar" — a edição precisa sobreviver
  const pergunta = `Pergunta E2E ${Date.now()}?`;
  const editorQ = page.locator('#faqQ_0_rte'); // contenteditable criado pelo addInlineToolbar
  await editorQ.click();
  await editorQ.fill(pergunta);
  await page.locator('#addFaqBtn').click();
  await expect(page.locator('.faq-editor-card')).toHaveCount(qtd + 1);
  await expect(page.locator('#faqQ_0_rte')).toHaveText(pergunta);

  // Edita a resposta da pergunta nova e salva
  const idxNova = qtd; // a nova entra no fim
  const editorA = page.locator(`#faqAWrap_${idxNova} .cz-rte-body`).first();
  await editorA.click();
  await editorA.fill('Resposta criada pelo teste E2E.');

  let put = esperaPut(page);
  await page.locator('#saveFaqBtn').click();
  await put;
  let faq = (await api(page, 'GET', '/api/site/admin/config')).json.siteContent?.faq || [];
  expect(faq[0].question).toContain(pergunta.replace('?', ''));
  expect(faq.length).toBe(qtd + 1);

  // Público mostra a pergunta editada
  const ctx = await browser.newContext();
  const pub = await ctx.newPage();
  await pub.goto(SITE_URL);
  await expect(pub.locator('#section-faq')).toContainText(pergunta.replace('?', ''), { timeout: 15000 });
  await ctx.close();

  // Remover a última (confirm) — persiste sozinho (salva silencioso)
  put = esperaPut(page);
  await page.locator('.faq-editor-card').last().locator('button[title="Remover"]').click();
  await page.locator('#confirmOk').click();
  await put;
  faq = (await api(page, 'GET', '/api/site/admin/config')).json.siteContent?.faq || [];
  expect(faq.length).toBe(qtd);

  await api(page, 'PUT', '/api/site/admin/config', { siteContent: { faq: original || [] } });
});

test('Personalizar: paleta e fonte salvam em siteStyle; Resetar Padrão (confirm) limpa', async ({ page }) => {
  test.setTimeout(120000);
  await H.loginAdmin(page);
  const original = (await api(page, 'GET', '/api/site/admin/config')).json.siteStyle;

  await irParaMeuSite(page);
  await subAba(page, 'config-personalizar').click();
  await expect(page.locator('#styleAccentColor')).toBeVisible({ timeout: 10000 });

  // Edita cores e fonte (color input via fill; o texto ao lado acompanha)
  await page.locator('#styleAccentColor').fill('#ff0066');
  await expect(page.locator('#styleAccentColorText')).toHaveText('#ff0066');
  await page.locator('#styleFontFamily').selectOption({ label: 'Montserrat (Bold)' });

  let put = esperaPut(page);
  await page.locator('#saveStyleBtn').click();
  await put;
  await expect(page.locator('#saveStyleBtn')).toHaveText('✓ Salvo!');

  let estilo = (await api(page, 'GET', '/api/site/admin/config')).json.siteStyle || {};
  expect(estilo.accentColor).toBe('#ff0066');
  expect(estilo.fontFamily).toContain('Montserrat');

  // Resetar Padrão → confirm → siteStyle vazio
  await page.locator('#resetStyleBtn').click();
  await expect(page.locator('#confirm-modal')).toBeVisible();
  put = esperaPut(page);
  await page.locator('#confirmOk').click();
  await put;
  estilo = (await api(page, 'GET', '/api/site/admin/config')).json.siteStyle || {};
  expect(estilo.accentColor || '').toBe('');

  await api(page, 'PUT', '/api/site/admin/config', { siteStyle: original || {} });
});

test('Área do Cliente: campos salvam sozinhos ao digitar (autosave) e o toggle controla a seção', async ({ page }) => {
  test.setTimeout(120000);
  await H.loginAdmin(page);
  const original = (await api(page, 'GET', '/api/site/admin/config')).json.siteContent?.areaCliente;

  await irParaMeuSite(page);
  await subAba(page, 'config-cliente').click();
  await expect(page.locator('#clTitle')).toBeVisible({ timeout: 10000 });

  // Digitar título → autosave (PUT sem botão)
  const titulo = `Área E2E ${Date.now()}`;
  let put = esperaPut(page);
  await page.locator('#clTitle').fill(titulo);
  await put;
  await expect.poll(async () =>
    (await api(page, 'GET', '/api/site/admin/config')).json.siteContent?.areaCliente?.title
  ).toBe(titulo);

  // Toggle de exibição → autosave
  const estadoInicial = await page.locator('#clIsActive').isChecked();
  put = esperaPut(page);
  await page.locator('#clIsActive').setChecked(!estadoInicial);
  await put;
  await expect.poll(async () =>
    (await api(page, 'GET', '/api/site/admin/config')).json.siteContent?.areaCliente?.isActive
  ).toBe(!estadoInicial);

  await api(page, 'PUT', '/api/site/admin/config', { siteContent: { areaCliente: original || {} } });
});
