// Perfil — cobertura exaustiva: dados do negócio (form + Salvar), logotipo (upload + persistência)
// e o editor de Marca D'água em camadas (canvas, painel, lista, toolbar, autosave, drag) +
// API (/api/organization/profile GET/PUT: 401, formato, whitelist, name vazio → 400,
// watermarkLayers persistido) + cliente (galeria renderiza as camadas sobre as fotos).
// A org `teste` é compartilhada pela suíte — todo teste restaura o que tocou.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

const PUT_PROFILE = (r) => r.url().includes('/api/organization/profile') && r.request().method() === 'PUT';

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

async function irParaPerfil(page) {
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('perfil'));
  await expect(page.getByText('Perfil e Identidade Visual')).toBeVisible({ timeout: 10000 });
}

// Espera o autosave do editor (debounce de 800ms → PUT → toast)
async function esperarAutosave(page, acao) {
  const put = page.waitForResponse(PUT_PROFILE, { timeout: 8000 });
  await acao();
  const res = await put;
  expect(res.status()).toBe(200);
}

// ── API ───────────────────────────────────────────────────────────────────────

test('API: profile exige autenticação (401 sem token)', async ({ request }) => {
  expect((await request.get('/api/organization/profile')).status()).toBe(401);
  expect((await request.put('/api/organization/profile', { data: { name: 'X' } })).status()).toBe(401);
});

test('API: GET retorna o formato completo do perfil', async ({ page }) => {
  await H.loginAdmin(page);
  const r = await api(page, 'GET', '/api/organization/profile');
  expect(r.status).toBe(200);
  expect(r.json.success).toBe(true);
  const d = r.json.data;
  expect(typeof d.name).toBe('string');
  expect(typeof d.slug).toBe('string');
  expect(Array.isArray(d.watermarkLayers)).toBe(true);
  expect(typeof d.integrations).toBe('object');
  for (const k of ['logo', 'whatsapp', 'email', 'website']) {
    expect(d, `campo ${k} presente`).toHaveProperty(k);
  }
});

test('API: PUT salva os campos do negócio; campos fora da whitelist (slug) são ignorados', async ({ page }) => {
  await H.loginAdmin(page);
  const antes = (await api(page, 'GET', '/api/organization/profile')).json.data;
  try {
    const r = await api(page, 'PUT', '/api/organization/profile', {
      name: 'Negócio E2E Perfil',
      whatsapp: '11988887777',
      website: 'https://e2e-perfil.example.com',
      slug: 'slug-hackeado', // fora da whitelist — não pode mudar
    });
    expect(r.status).toBe(200);

    const depois = (await api(page, 'GET', '/api/organization/profile')).json.data;
    expect(depois.name).toBe('Negócio E2E Perfil');
    expect(depois.whatsapp).toBe('11988887777');
    expect(depois.website).toBe('https://e2e-perfil.example.com');
    expect(depois.slug).toBe(antes.slug); // intacto
  } finally {
    await api(page, 'PUT', '/api/organization/profile', {
      name: antes.name, whatsapp: antes.whatsapp || '', website: antes.website || '',
    });
  }
});

test('API: PUT com name vazio → 400 (validação do schema vira erro de cliente)', async ({ page }) => {
  await H.loginAdmin(page);
  const r = await api(page, 'PUT', '/api/organization/profile', { name: '' });
  expect(r.status).toBe(400);
  expect(r.json.success).toBe(false);
});

test('API: PUT watermarkLayers persiste a estrutura completa das camadas', async ({ page }) => {
  await H.loginAdmin(page);
  const layers = [
    { id: 'e2etx1', type: 'text', x: 10, y: 40, w: 80, h: 15, opacity: 0.4, rotation: -20,
      text: 'PROVA E2E', fontSize: 28, fontFamily: 'Arial', fontWeight: 'bold',
      fontStyle: 'italic', color: '#ff0000', letterSpacing: 2, shadow: true },
    { id: 'e2eimg1', type: 'image', x: 5, y: 5, w: 20, h: 15, opacity: 0.5, rotation: 0,
      url: '/uploads/fake-logo.png', filter: 'white' },
  ];
  try {
    const r = await api(page, 'PUT', '/api/organization/profile', { watermarkLayers: layers });
    expect(r.status).toBe(200);
    const lidas = (await api(page, 'GET', '/api/organization/profile')).json.data.watermarkLayers;
    expect(lidas).toHaveLength(2);
    expect(lidas[0]).toMatchObject({ type: 'text', text: 'PROVA E2E', fontStyle: 'italic', color: '#ff0000' });
    expect(lidas[1]).toMatchObject({ type: 'image', filter: 'white', url: '/uploads/fake-logo.png' });
  } finally {
    await H.limparMarcaDagua(page);
  }
});

// ── UI: dados do negócio ──────────────────────────────────────────────────────

test('UI: aba renderiza as 3 seções com os valores salvos (copy sem "estúdio")', async ({ page }) => {
  await H.loginAdmin(page);
  const d = (await api(page, 'GET', '/api/organization/profile')).json.data;
  await irParaPerfil(page);

  await expect(page.getByText('Dados do Negócio')).toBeVisible();
  await expect(page.getByText('Logotipo')).toBeVisible();
  await expect(page.getByText("Marca D'água")).toBeVisible();
  // feedback do usuário: nunca "estúdio" em copy do fotógrafo
  await expect(page.locator('#tabContent')).not.toContainText(/est[úu]dio/i);

  await expect(page.locator('#orgName')).toHaveValue(d.name);
  await expect(page.locator('#orgEmail')).toHaveValue(d.email || '');
  await expect(page.locator('#orgWhatsapp')).toHaveValue(d.whatsapp || '');
  await expect(page.locator('#orgWebsite')).toHaveValue(d.website || '');
  await expect(page.locator('#saveProfileBtn')).toBeVisible();
});

test('UI: editar dados e Salvar Perfil → toast, persiste ao reabrir a aba', async ({ page }) => {
  await H.loginAdmin(page);
  const antes = (await api(page, 'GET', '/api/organization/profile')).json.data;
  try {
    await irParaPerfil(page);
    await page.locator('#orgWhatsapp').fill('11977776666');
    await page.locator('#orgWebsite').fill('https://salvo-pela-ui.example.com');
    await page.locator('#saveProfileBtn').click();
    await expect(page.locator('#toast-container')).toContainText('Perfil salvo!', { timeout: 10000 });

    // sai e volta — a aba relê do backend
    await page.evaluate(() => window.switchTab('dashboard'));
    await page.waitForTimeout(800);
    await irParaPerfil(page);
    await expect(page.locator('#orgWhatsapp')).toHaveValue('11977776666');
    await expect(page.locator('#orgWebsite')).toHaveValue('https://salvo-pela-ui.example.com');
  } finally {
    // Salvar Perfil também envia watermarkLayers (os defaults do editor) — restaurar tudo
    await api(page, 'PUT', '/api/organization/profile', {
      whatsapp: antes.whatsapp || '', website: antes.website || '',
    });
    await H.limparMarcaDagua(page);
  }
});

test('UI: nome vazio → aviso e nada é salvo', async ({ page }) => {
  await H.loginAdmin(page);
  const antes = (await api(page, 'GET', '/api/organization/profile')).json.data;
  await irParaPerfil(page);
  await page.locator('#orgName').fill('');
  await page.locator('#saveProfileBtn').click();
  await expect(page.locator('#toast-container')).toContainText('O nome do negócio é obrigatório', { timeout: 10000 });
  // nada mudou no banco
  const depois = (await api(page, 'GET', '/api/organization/profile')).json.data;
  expect(depois.name).toBe(antes.name);
});

// ── UI: editor de marca d'água ────────────────────────────────────────────────

test('UI: editor abre com as camadas padrão e painel pedindo seleção', async ({ page }) => {
  await H.loginAdmin(page);
  await H.limparMarcaDagua(page); // sem layers salvas → editor monta o template padrão
  await irParaPerfil(page);

  // padrão: 2 camadas de texto (+1 de imagem se houver logo)
  const camadas = page.locator('#wmCanvas .wm-layer');
  expect(await camadas.count()).toBeGreaterThanOrEqual(2);
  await expect(page.locator('#wmCanvas')).toContainText('Cópia não autorizada');
  await expect(page.locator('#wmPanel')).toContainText('Clique numa camada para editar');
  // lista espelha o canvas
  expect(await page.locator('#wmLayerList > div').count()).toBeGreaterThanOrEqual(2);
});

test('UI: + Texto adiciona camada, painel edita texto/opacidade/rotação, autosave dispara', async ({ page }) => {
  await H.loginAdmin(page);
  await H.limparMarcaDagua(page);
  try {
    await irParaPerfil(page);
    const antes = await page.locator('#wmCanvas .wm-layer').count();

    await esperarAutosave(page, () => page.locator('#wmAddText').click());
    await expect(page.locator('#wmCanvas .wm-layer')).toHaveCount(antes + 1);
    await expect(page.locator('#toast-container')).toContainText("Marca d'água salva!", { timeout: 5000 });
    await expect(page.locator('#wmPanel')).toContainText('Camada de Texto');
    await expect(page.locator('#wmLayerList')).toContainText('Novo texto');

    // editar texto → canvas reflete
    await esperarAutosave(page, () => page.locator('#lp-text').fill('Texto Editado E2E'));
    await expect(page.locator('#wmCanvas')).toContainText('Texto Editado E2E');
    await expect(page.locator('#wmLayerList')).toContainText('Texto Editado E2E');

    // opacidade e rotação refletem no style da camada selecionada (borda accent)
    const sel = page.locator('#wmCanvas .wm-layer').last();
    await esperarAutosave(page, () => page.locator('#lp-opacity').fill('80'));
    await expect(page.locator('#lp-opacity-lbl')).toHaveText('80%');
    await expect(sel).toHaveCSS('opacity', '0.8');
    await esperarAutosave(page, () => page.locator('#lp-rotation').fill('45'));
    await expect(page.locator('#lp-rot-lbl')).toHaveText('45°');

    // persistiu no backend
    const salvas = (await api(page, 'GET', '/api/organization/profile')).json.data.watermarkLayers;
    const nova = salvas.find((l) => l.text === 'Texto Editado E2E');
    expect(nova).toBeTruthy();
    expect(nova.opacity).toBeCloseTo(0.8);
    expect(nova.rotation).toBe(45);
  } finally {
    await H.limparMarcaDagua(page);
  }
});

test('UI: toolbar — duplicar, mover frente/trás, deletar e deletar sem seleção', async ({ page }) => {
  await H.loginAdmin(page);
  await H.limparMarcaDagua(page);
  try {
    await irParaPerfil(page);
    const base = await page.locator('#wmCanvas .wm-layer').count();

    // sem seleção → aviso
    await page.locator('#wmDelete').click();
    await expect(page.locator('#toast-container')).toContainText('Selecione uma camada', { timeout: 5000 });

    // seleciona a 1ª camada da lista (clique na lista também seleciona)
    await page.locator('#wmLayerList > div').first().click();
    await expect(page.locator('#wmPanel')).not.toContainText('Clique numa camada');

    // duplicar → +1 e a cópia fica selecionada
    await esperarAutosave(page, () => page.locator('#wmDuplicate').click());
    await expect(page.locator('#wmCanvas .wm-layer')).toHaveCount(base + 1);

    // mover para trás e para frente (ordem na lista muda — sem erro e mantém contagem)
    await esperarAutosave(page, () => page.locator('#wmMoveDown').click());
    await esperarAutosave(page, () => page.locator('#wmMoveUp').click());
    await expect(page.locator('#wmCanvas .wm-layer')).toHaveCount(base + 1);

    // deletar a cópia → volta ao total e painel limpa
    await esperarAutosave(page, () => page.locator('#wmDelete').click());
    await expect(page.locator('#wmCanvas .wm-layer')).toHaveCount(base);
    await expect(page.locator('#wmPanel')).toContainText('Clique numa camada');
  } finally {
    await H.limparMarcaDagua(page);
  }
});

test('UI: arrastar camada no canvas muda a posição e autosava', async ({ page }) => {
  await H.loginAdmin(page);
  await H.limparMarcaDagua(page);
  try {
    await irParaPerfil(page);
    const camada = page.locator('#wmCanvas .wm-layer').first();
    const antes = await camada.evaluate((el) => ({ left: el.style.left, top: el.style.top }));

    // o canvas fica abaixo da dobra — sem scroll o mouse clica fora da viewport
    await camada.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const box = await camada.boundingBox();
    const put = page.waitForResponse(PUT_PROFILE, { timeout: 8000 });
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 8 });
    await page.mouse.up();
    await put;

    const depois = await page.locator('#wmCanvas .wm-layer').first().evaluate(
      (el) => ({ left: el.style.left, top: el.style.top }));
    expect(depois).not.toEqual(antes);
  } finally {
    await H.limparMarcaDagua(page);
  }
});

test('UI: ↺ Padrão restaura o template com confirmação', async ({ page }) => {
  await H.loginAdmin(page);
  await H.limparMarcaDagua(page);
  try {
    await irParaPerfil(page);
    // muda algo primeiro (adiciona camada)
    await esperarAutosave(page, () => page.locator('#wmAddText').click());
    const comExtra = await page.locator('#wmCanvas .wm-layer').count();

    // cancelar não mexe
    await page.locator('#wmReset').click();
    await page.locator('#confirmCancel').click();
    await expect(page.locator('#wmCanvas .wm-layer')).toHaveCount(comExtra);

    // confirmar restaura o padrão (a camada extra some)
    await esperarAutosave(page, async () => {
      await page.locator('#wmReset').click();
      await page.locator('#confirmOk').click();
    });
    await expect(page.locator('#wmCanvas .wm-layer')).toHaveCount(comExtra - 1);
    await expect(page.locator('#wmCanvas')).toContainText('Cópia não autorizada');
  } finally {
    await H.limparMarcaDagua(page);
  }
});

test('UI: upload de logo troca o preview e Salvar Perfil persiste', async ({ page }) => {
  await H.loginAdmin(page);
  const antes = (await api(page, 'GET', '/api/organization/profile')).json.data;
  try {
    await irParaPerfil(page);
    const srcAntes = await page.locator('#logoPreview').getAttribute('src');
    await page.locator('#logoUpload').setInputFiles(H.FOTO);
    await expect(page.locator('#logoPreview')).not.toHaveAttribute('src', srcAntes, { timeout: 15000 });
    const srcNovo = await page.locator('#logoPreview').getAttribute('src');
    expect(srcNovo).toContain('/uploads/');

    await page.locator('#saveProfileBtn').click();
    await expect(page.locator('#toast-container')).toContainText('Perfil salvo!', { timeout: 10000 });
    const salvo = (await api(page, 'GET', '/api/organization/profile')).json.data;
    expect(srcNovo).toContain(salvo.logo);
  } finally {
    await api(page, 'PUT', '/api/organization/profile', { logo: antes.logo || '' });
    await H.limparMarcaDagua(page);
  }
});

// ── Cliente: camadas aplicadas na galeria ─────────────────────────────────────

test('Cliente: galeria renderiza as watermarkLayers sobre as fotos em modo seleção', async ({ page, context, browser }) => {
  test.setTimeout(150000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  let name;
  try {
    await H.configurarMarcaDagua(page, {
      watermarkLayers: [
        { id: 'e2ecli1', type: 'text', x: 10, y: 40, w: 80, h: 15, opacity: 0.5, rotation: 0,
          text: 'E2E LAYER PROVA', fontSize: 24, fontFamily: 'Arial', fontWeight: 'bold',
          fontStyle: 'normal', color: '#ffffff', letterSpacing: 1, shadow: true },
      ],
    });

    const s = await H.criarSessao(page, { mode: 'selection' });
    name = s.name;
    await H.aplicarConfig(page, { packageLimit: 2 });
    await H.subirFotosWizard(page, [H.FOTO_1, H.FOTO_2]);
    await H.concluirUpload(page);
    await H.compartilharCopiarCodigo(page);
    await H.fecharWizard(page);

    const c = await H.clienteAbrir(browser, s.accessCode);
    await expect(c.page.locator('.photo-heart')).toHaveCount(2, { timeout: 15000 });
    await expect(c.page.locator('#photoGrid')).toContainText('E2E LAYER PROVA', { timeout: 10000 });
    // uma camada por foto
    const marcas = c.page.locator('#photoGrid').getByText('E2E LAYER PROVA');
    await expect(marcas).toHaveCount(2);
    await c.ctx.close();
  } finally {
    await H.limparMarcaDagua(page).catch(() => {});
  }

  if (name) await H.deletarSessao(page, name);
});
