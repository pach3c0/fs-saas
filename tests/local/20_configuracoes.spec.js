// Configurações — cobertura exaustiva das 5 seções (Mensagens, Sessões, Entrega,
// Notificações, Escassês & Vendas) + API /api/organization/preferences (whitelist,
// clamps, merge granular, 400 sem campo válido) e os clamps de /integrations da
// seção de vendas (daysWarning 1–30, couponPrefix ≤8, desconto 0–100, discountByDay
// sanitizado). Autosave debounced (600ms) com status "Salvando… → ✓ Salvo".
// A org `teste` é compartilhada — todo teste restaura o que tocou.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

const PUT_PREFS = (r) => r.url().includes('/api/organization/preferences') && r.request().method() === 'PUT';
const PUT_INTEG = (r) => r.url().includes('/api/organization/integrations') && r.request().method() === 'PUT';

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

async function irParaConfiguracoes(page) {
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('configuracoes'));
  await expect(page.getByText('Escassês & Vendas', { exact: true })).toBeVisible({ timeout: 10000 });
}

// Sempre escopado em #tabContent — "Mensagens"/"Sessões" também existem no menu lateral
async function abrirSecao(page, label) {
  await page.locator('#tabContent').getByRole('button', { name: label, exact: true }).click();
}

// ── API: preferences ──────────────────────────────────────────────────────────

test('API: preferences exige token; PUT vazio → 400; GET retorna objeto', async ({ page, request }) => {
  expect((await request.get('/api/organization/preferences')).status()).toBe(401);
  expect((await request.put('/api/organization/preferences', { data: {} })).status()).toBe(401);

  await H.loginAdmin(page);
  const g = await api(page, 'GET', '/api/organization/preferences');
  expect(g.status).toBe(200);
  expect(typeof g.json.preferences).toBe('object');

  const vazio = await api(page, 'PUT', '/api/organization/preferences', {});
  expect(vazio.status).toBe(400);
  // tipos errados são ignorados campo a campo — sem nada válido, 400
  const errado = await api(page, 'PUT', '/api/organization/preferences', {
    sessionDefaults: { packageLimit: 'trinta' }, galleryDeliveryDefault: 'sempre',
  });
  expect(errado.status).toBe(400);
});

test('API: PUT é merge granular com clamps — um campo não apaga o resto', async ({ page }) => {
  await H.loginAdmin(page);
  const antes = (await api(page, 'GET', '/api/organization/preferences')).json.preferences;
  try {
    // salva template e default em PUTs separados
    await api(page, 'PUT', '/api/organization/preferences', {
      messageTemplates: { shareEmail: 'Template E2E config' },
    });
    const r2 = await api(page, 'PUT', '/api/organization/preferences', {
      sessionDefaults: { packageLimit: 2000, extraPhotoPrice: -5, deadlineDays: 400 },
      galleryDeliveryDefault: 'direct',
    });
    const p = r2.json.preferences;
    // merge: o template do 1º PUT segue lá
    expect(p.messageTemplates.shareEmail).toBe('Template E2E config');
    // clamps: 1–1000, ≥0, 0–365
    expect(p.sessionDefaults.packageLimit).toBe(1000);
    expect(p.sessionDefaults.extraPhotoPrice).toBe(0);
    expect(p.sessionDefaults.deadlineDays).toBe(365);
    expect(p.galleryDeliveryDefault).toBe('direct');
    // resolução fora do enum é ignorada
    const r3 = await api(page, 'PUT', '/api/organization/preferences', {
      sessionDefaults: { photoResolution: 999, packageLimit: 30 },
    });
    expect(r3.json.preferences.sessionDefaults.photoResolution).toBe(p.sessionDefaults.photoResolution);
  } finally {
    await api(page, 'PUT', '/api/organization/preferences', {
      messageTemplates: { shareEmail: antes.messageTemplates?.shareEmail || '' },
      sessionDefaults: {
        packageLimit: antes.sessionDefaults?.packageLimit ?? 30,
        extraPhotoPrice: antes.sessionDefaults?.extraPhotoPrice ?? 25,
        deadlineDays: antes.sessionDefaults?.deadlineDays ?? 0,
      },
      galleryDeliveryDefault: antes.galleryDeliveryDefault || 'ask',
    });
  }
});

test('API: clamps da seção de vendas em /integrations (daysWarning, prefixo, desconto)', async ({ page }) => {
  await H.loginAdmin(page);
  const antes = (await api(page, 'GET', '/api/organization/integrations')).json.integrations;
  try {
    const r = await api(page, 'PUT', '/api/organization/integrations', {
      deadlineAutomation: { daysWarning: 99 },
      salesAutomator: {
        couponPrefix: 'PREFIXOGIGANTE',
        couponDiscountPercent: 250,
        postDelivery: { discountByDay: { 15: 10, 7: 120, abc: 5, '-2': 9 } },
      },
    });
    const integ = r.json.integrations;
    expect(integ.deadlineAutomation.daysWarning).toBe(30);       // clamp 1–30
    expect(integ.salesAutomator.couponPrefix).toBe('PREFIXOG');  // slice 8
    expect(integ.salesAutomator.couponDiscountPercent).toBe(100); // clamp 0–100
    expect(integ.salesAutomator.postDelivery.discountByDay).toEqual({ 15: 10, 7: 100 }); // sanitizado
  } finally {
    await api(page, 'PUT', '/api/organization/integrations', {
      deadlineAutomation: { daysWarning: antes.deadlineAutomation?.daysWarning ?? 3 },
      salesAutomator: {
        couponPrefix: antes.salesAutomator?.couponPrefix || 'CZ',
        couponDiscountPercent: antes.salesAutomator?.couponDiscountPercent ?? 10,
        postDelivery: { discountByDay: antes.salesAutomator?.postDelivery?.discountByDay || {} },
      },
    });
  }
});

// ── UI ────────────────────────────────────────────────────────────────────────

test('UI: sub-nav com 5 seções e troca de conteúdo', async ({ page }) => {
  await H.loginAdmin(page);
  await irParaConfiguracoes(page);
  for (const s of ['Mensagens', 'Sessões', 'Entrega', 'Notificações', 'Escassês & Vendas']) {
    await expect(page.locator('#tabContent').getByRole('button', { name: s, exact: true })).toBeVisible();
  }
  // abre em Mensagens
  await expect(page.getByText('E-mail — envio do link')).toBeVisible();
  await abrirSecao(page, 'Entrega');
  await expect(page.getByText('Padrão de entrega da galeria')).toBeVisible();
  await abrirSecao(page, 'Notificações');
  await expect(page.getByText('Preferências de notificação')).toBeVisible();
});

test('UI: Mensagens — editar template salva (✓ Salvo), persiste; chips, exemplo, preview e restaurar', async ({ page }) => {
  await H.loginAdmin(page);
  const antes = (await api(page, 'GET', '/api/organization/preferences')).json.preferences;
  try {
    await irParaConfiguracoes(page);
    const ta = page.locator('textarea').first(); // shareEmail (1º canal)

    // editar dispara autosave debounced
    const put = page.waitForResponse(PUT_PREFS);
    await ta.fill('Olá {nome}, suas fotos E2E chegaram!');
    await put;
    await expect(page.getByText('✓ Salvo')).toBeVisible();
    // preview interpola amostras
    await expect(page.getByText('Olá Marina, suas fotos E2E chegaram!')).toBeVisible();
    // persistiu
    const depois = (await api(page, 'GET', '/api/organization/preferences')).json.preferences;
    expect(depois.messageTemplates.shareEmail).toBe('Olá {nome}, suas fotos E2E chegaram!');

    // chip insere a variável no texto
    const putChip = page.waitForResponse(PUT_PREFS);
    await page.locator('button', { hasText: '{negocio}' }).first().click();
    await putChip;
    expect(await ta.inputValue()).toContain('{negocio}');

    // "Usar exemplo" preenche com o starter; "Restaurar padrão do app" limpa
    const putEx = page.waitForResponse(PUT_PREFS);
    await page.locator('button', { hasText: 'Usar exemplo' }).first().click();
    await putEx;
    expect(await ta.inputValue()).toContain('já estão disponíveis');
    const putReset = page.waitForResponse(PUT_PREFS);
    await page.locator('button', { hasText: 'Restaurar padrão do app' }).first().click();
    await putReset;
    expect(await ta.inputValue()).toBe('');
    await expect(ta).toHaveAttribute('placeholder', /mensagem padrão do app/);
  } finally {
    await api(page, 'PUT', '/api/organization/preferences', {
      messageTemplates: { shareEmail: antes.messageTemplates?.shareEmail || '' },
    });
  }
});

test('UI: Sessões — padrões salvam e persistem ao reabrir', async ({ page }) => {
  await H.loginAdmin(page);
  const antes = (await api(page, 'GET', '/api/organization/preferences')).json.preferences;
  try {
    await irParaConfiguracoes(page);
    await abrirSecao(page, 'Sessões');
    await expect(page.getByText('Padrões de novas sessões')).toBeVisible();

    const inputs = page.locator('#tabContent input[type="number"]');
    const put = page.waitForResponse(PUT_PREFS);
    await inputs.first().fill('44'); // Pacote padrão
    await put;
    await expect(page.getByText('✓ Salvo')).toBeVisible();

    // toggle desliga comentários
    const putT = page.waitForResponse(PUT_PREFS);
    await page.locator('label', { hasText: 'Comentários nas fotos habilitados' }).locator('input').setChecked(false);
    await putT;

    // reabre a seção — valores relidos do backend
    await page.evaluate(() => window.switchTab('dashboard'));
    await page.waitForTimeout(800);
    await irParaConfiguracoes(page);
    await abrirSecao(page, 'Sessões');
    await expect(page.locator('#tabContent input[type="number"]').first()).toHaveValue('44');
    await expect(page.locator('label', { hasText: 'Comentários nas fotos habilitados' }).locator('input')).not.toBeChecked();
  } finally {
    await api(page, 'PUT', '/api/organization/preferences', {
      sessionDefaults: {
        packageLimit: antes.sessionDefaults?.packageLimit ?? 30,
        commentsEnabled: antes.sessionDefaults?.commentsEnabled !== false,
      },
    });
  }
});

test('UI: Entrega — escolher "Entregar direto" salva e fica marcado ao reabrir', async ({ page }) => {
  await H.loginAdmin(page);
  const antes = (await api(page, 'GET', '/api/organization/preferences')).json.preferences;
  try {
    await irParaConfiguracoes(page);
    await abrirSecao(page, 'Entrega');
    // "Sempre perguntar" cita "Entregar direto" na descrição — filtrar pela descrição única
    const radioDireto = () => page.locator('label', { hasText: 'Pula a etapa Compartilhar' }).locator('input[type="radio"]');
    const put = page.waitForResponse(PUT_PREFS);
    await radioDireto().check();
    await put;

    await page.evaluate(() => window.switchTab('dashboard'));
    await page.waitForTimeout(800);
    await irParaConfiguracoes(page);
    await abrirSecao(page, 'Entrega');
    await expect(radioDireto()).toBeChecked();
  } finally {
    await api(page, 'PUT', '/api/organization/preferences', {
      galleryDeliveryDefault: antes.galleryDeliveryDefault || 'ask',
    });
  }
});

test('UI: Notificações — desligar um aviso persiste', async ({ page }) => {
  await H.loginAdmin(page);
  const antes = (await api(page, 'GET', '/api/organization/preferences')).json.preferences;
  try {
    await irParaConfiguracoes(page);
    await abrirSecao(page, 'Notificações');
    const put = page.waitForResponse(PUT_PREFS);
    await page.locator('label', { hasText: 'Cliente pede fotos extras' }).locator('input').setChecked(false);
    await put;
    const depois = (await api(page, 'GET', '/api/organization/preferences')).json.preferences;
    expect(depois.notifications.extraRequested).toBe(false);
  } finally {
    await api(page, 'PUT', '/api/organization/preferences', {
      notifications: { extraRequested: antes.notifications?.extraRequested !== false },
    });
  }
});

test('UI: Escassês & Vendas — painel dos 3 prazos, toggles, prefixo e desconto por etapa', async ({ page }) => {
  await H.loginAdmin(page);
  const antes = (await api(page, 'GET', '/api/organization/integrations')).json.integrations;
  try {
    await irParaConfiguracoes(page);
    await abrirSecao(page, 'Escassês & Vendas');

    // painel explicativo dos 3 prazos
    for (const t of ['Prazo de seleção', 'Janela de compra', 'Exclusão do storage']) {
      await expect(page.getByText(t, { exact: true })).toBeVisible();
    }
    await expect(page.getByText('Lembrete de seleção (pré-entrega)')).toBeVisible();
    await expect(page.getByText('Escassês de vendas (pós-entrega)')).toBeVisible();

    // ligar o lembrete → PUT /integrations
    const put1 = page.waitForResponse(PUT_INTEG);
    await page.locator('label', { hasText: 'Ativar lembrete de seleção' }).locator('input').setChecked(true);
    await put1;
    await expect(page.getByText('✓ Salvo')).toBeVisible();

    // prefixo do cupom (debounce 600ms)
    const put2 = page.waitForResponse(PUT_INTEG);
    await page.locator('input[maxlength="8"]').fill('E2EPRE');
    await put2;

    // desconto da etapa "15 dias antes (%)" — o wrap do numberField é o div mais interno
    // que contém só esse label + input
    const quinze = page.locator('#tabContent div')
      .filter({ hasText: '15 dias antes (%)' }).last().locator('input[type="number"]');
    const put3 = page.waitForResponse(PUT_INTEG);
    await quinze.fill('33');
    await put3;

    const integ = (await api(page, 'GET', '/api/organization/integrations')).json.integrations;
    expect(integ.deadlineAutomation.enabled).toBe(true);
    expect(integ.salesAutomator.couponPrefix).toBe('E2EPRE');
    expect(integ.salesAutomator.postDelivery.discountByDay['15']).toBe(33);

    // editor de mensagem do lembrete: preview interpola
    const taLembrete = page.locator('textarea').first();
    const put4 = page.waitForResponse(PUT_INTEG);
    await taLembrete.fill('Faltam {dias} dias, {nome}!');
    await put4;
    await expect(page.getByText('Faltam 3 dias, Marina!')).toBeVisible();
  } finally {
    await api(page, 'PUT', '/api/organization/integrations', {
      deadlineAutomation: {
        enabled: antes.deadlineAutomation?.enabled === true,
        messageTemplate: antes.deadlineAutomation?.messageTemplate || '',
      },
      salesAutomator: {
        couponPrefix: antes.salesAutomator?.couponPrefix || 'CZ',
        postDelivery: { discountByDay: antes.salesAutomator?.postDelivery?.discountByDay || {} },
      },
    });
  }
});

test('UI: falha no carregamento → toast de erro (aba ainda renderiza)', async ({ page }) => {
  await H.loginAdmin(page);
  await page.route('**/api/organization/preferences', (route) => route.abort());
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('configuracoes'));
  await expect(page.locator('#toast-container')).toContainText('Erro ao carregar configurações', { timeout: 10000 });
  // o layout ainda monta (com defaults vazios)
  await expect(page.locator('#tabContent').getByRole('button', { name: 'Mensagens', exact: true })).toBeVisible();
  await page.unroute('**/api/organization/preferences');
});
