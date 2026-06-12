// Ajuda & Tutoriais — cobertura exaustiva das 2 views da sub-nav:
//   • Tutoriais em Vídeo (player destaque + busca + pills de categoria + grid — /api/tutorials)
//   • Manual do Usuário (accordion; banco /api/manual com PRIORIDADE sobre o estático
//     MANUAL_MODULES_STATIC; render dos 4 blocos: intro/callout/steps/image)
// + API: 401/403 (CRUD de tutoriais e manual é superadmin), CRUD completo de tutoriais,
//   /api/manual público só com publicados ordenados.
// O banco dev tem 0 tutoriais e 1 módulo manual DESPUBLICADO (dashboard, do usuário) — os
// testes semeiam com prefixo _e2e- e limpam no finally.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

const SUPER = { email: 'admin@cliquezoom.com.br', password: '055360' };

// fetch autenticado com o token do admin logado na page
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

// fetch como SUPERADMIN (login próprio a cada chamada — rate limit é pulado em dev)
async function apiSuper(page, method, url, body) {
  return page.evaluate(async ({ method, url, body, creds }) => {
    const login = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(creds),
    });
    const { token } = await login.json();
    const res = await fetch(url, {
      method,
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  }, { method, url, body, creds: SUPER });
}

// Espera a sub-nav (presente nas 2 views) — `ajudaView` é estado de módulo e a aba
// pode reabrir direto na view manual se o mesmo teste a abriu antes.
async function irParaAjuda(page) {
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('ajuda'));
  await expect(page.getByText('Tutoriais em Vídeo')).toBeVisible({ timeout: 10000 });
}

async function abrirTutoriais(page) {
  await page.getByText('Tutoriais em Vídeo', { exact: true }).click();
  await expect(page.getByText('CliqueZoom Academy')).toBeVisible({ timeout: 10000 });
}

async function abrirManual(page) {
  await page.getByText('Manual do Usuário', { exact: true }).click();
  await expect(page.locator('[data-manual-toggle]').first()).toBeVisible({ timeout: 10000 });
}

// Remove tutoriais e módulos de manual semeados (prefixo _e2e-/E2E)
async function limparSeeds(page) {
  const tuts = await apiSuper(page, 'GET', '/api/admin/tutorials');
  for (const t of tuts.json?.tutorials || []) {
    if (t.title.startsWith('E2E ')) await apiSuper(page, 'DELETE', `/api/admin/tutorials/${t._id}`);
  }
  const mods = await apiSuper(page, 'GET', '/api/admin/manual');
  for (const m of mods.json?.modules || []) {
    if (m.id.startsWith('_e2e-')) await apiSuper(page, 'DELETE', `/api/admin/manual/${m.id}`);
  }
}

// ── API ───────────────────────────────────────────────────────────────────────

test('API: tutoriais exigem token; CRUD é superadmin (403 p/ admin comum); /api/manual é público', async ({ page, request }) => {
  expect((await request.get('/api/tutorials')).status()).toBe(401);
  expect((await request.get('/api/admin/tutorials')).status()).toBe(401);
  expect((await request.get('/api/manual')).status()).toBe(200); // público (só publicados)

  await H.loginAdmin(page); // teste@ = role admin (não superadmin)
  expect((await api(page, 'GET', '/api/tutorials')).status).toBe(200);
  expect((await api(page, 'GET', '/api/admin/tutorials')).status).toBe(403);
  expect((await api(page, 'POST', '/api/admin/manual', { id: 'x', label: 'x' })).status).toBe(403);
});

test('API: CRUD de tutoriais (superadmin) — criar valida URL, editar, deletar', async ({ page }) => {
  await H.loginAdmin(page);
  try {
    // título/URL obrigatórios + URL do YouTube validada
    expect((await apiSuper(page, 'POST', '/api/admin/tutorials', { title: 'E2E sem url' })).status).toBe(400);
    expect((await apiSuper(page, 'POST', '/api/admin/tutorials', {
      title: 'E2E url ruim', videoUrl: 'https://vimeo.com/123',
    })).status).toBe(400);

    const criado = await apiSuper(page, 'POST', '/api/admin/tutorials', {
      title: 'E2E Tutorial CRUD', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      category: 'dashboard', level: 'Básico',
    });
    expect(criado.status).toBe(201);
    expect(criado.json.tutorial.youtubeId).toBe('dQw4w9WgXcQ'); // extraído da URL
    const id = criado.json.tutorial._id;

    // fotógrafo vê o ativo
    const lista = await api(page, 'GET', '/api/tutorials');
    expect(lista.json.tutorials.some((t) => t._id === id)).toBe(true);

    // editar: desativar → some da lista do fotógrafo
    const upd = await apiSuper(page, 'PUT', `/api/admin/tutorials/${id}`, { active: false });
    expect(upd.status).toBe(200);
    const lista2 = await api(page, 'GET', '/api/tutorials');
    expect(lista2.json.tutorials.some((t) => t._id === id)).toBe(false);

    expect((await apiSuper(page, 'DELETE', `/api/admin/tutorials/${id}`)).status).toBe(200);
  } finally {
    await limparSeeds(page);
  }
});

test('API: /api/manual entrega só módulos publicados, ordenados por order', async ({ page }) => {
  await H.loginAdmin(page);
  try {
    await apiSuper(page, 'POST', '/api/admin/manual', {
      id: '_e2e-b', label: 'E2E B', order: 2, isPublished: true,
      blocks: [{ type: 'intro', content: 'b' }],
    });
    await apiSuper(page, 'POST', '/api/admin/manual', {
      id: '_e2e-a', label: 'E2E A', order: 1, isPublished: true,
      blocks: [{ type: 'intro', content: 'a' }],
    });
    await apiSuper(page, 'POST', '/api/admin/manual', {
      id: '_e2e-rascunho', label: 'E2E Rascunho', order: 0, isPublished: false,
      blocks: [{ type: 'intro', content: 'r' }],
    });

    const r = await api(page, 'GET', '/api/manual');
    const ids = r.json.modules.map((m) => m.id).filter((i) => i.startsWith('_e2e-'));
    expect(ids).toEqual(['_e2e-a', '_e2e-b']); // rascunho fora, ordenado por order
    // id duplicado → 409
    expect((await apiSuper(page, 'POST', '/api/admin/manual', { id: '_e2e-a', label: 'dup' })).status).toBe(409);
  } finally {
    await limparSeeds(page);
  }
});

// ── UI: Tutoriais ─────────────────────────────────────────────────────────────

test('UI: sem tutoriais → estado vazio do player', async ({ page }) => {
  await H.loginAdmin(page);
  await limparSeeds(page); // garante 0 tutoriais E2E
  await irParaAjuda(page);
  await abrirTutoriais(page);
  // player vazio (bug consertado: updatePlayer rodava antes do root entrar no DOM)
  await expect(page.getByText('Nenhum tutorial cadastrado ou ativo.')).toBeVisible();
  await expect(page.getByText('Nenhum tutorial encontrado para os filtros atuais.')).toBeVisible();
});

test('UI: com tutoriais → player destaque, grid, filtro por categoria e busca', async ({ page }) => {
  await H.loginAdmin(page);
  // não carregar o YouTube de verdade
  await page.route(/youtube\.com|ytimg\.com/, (route) => route.abort());
  try {
    await apiSuper(page, 'POST', '/api/admin/tutorials', {
      title: 'E2E Painel Inicial', videoUrl: 'https://youtu.be/aaaaaaaaaaa',
      category: 'dashboard', level: 'Básico', order: 0,
    });
    await apiSuper(page, 'POST', '/api/admin/tutorials', {
      title: 'E2E Criando Sessões', videoUrl: 'https://youtu.be/bbbbbbbbbbb',
      category: 'sessoes', level: 'Intermediário', order: 1,
    });

    await irParaAjuda(page);
    await abrirTutoriais(page);
    // player destaque = 1º tutorial (iframe com o youtubeId)
    await expect(page.locator('iframe[src*="aaaaaaaaaaa"]')).toBeAttached();
    await expect(page.locator('.tutorial-card')).toHaveCount(2);

    // filtro por categoria
    await page.locator('.cat-pill[data-cat="sessoes"]').click();
    await expect(page.locator('.tutorial-card')).toHaveCount(1);
    await expect(page.locator('.tutorial-card')).toContainText('E2E Criando Sessões');
    await page.locator('.cat-pill[data-cat="all"]').click();
    await expect(page.locator('.tutorial-card')).toHaveCount(2);

    // busca por título
    await page.locator('#tutorialSearch').fill('Painel');
    await expect(page.locator('.tutorial-card')).toHaveCount(1);
    await expect(page.locator('.tutorial-card')).toContainText('E2E Painel Inicial');

    // clicar num card troca o destaque
    await page.locator('#tutorialSearch').fill('');
    await page.locator('.tutorial-card', { hasText: 'E2E Criando Sessões' }).click();
    await expect(page.locator('iframe[src*="bbbbbbbbbbb"]')).toBeAttached();
  } finally {
    await limparSeeds(page);
  }
});

// ── UI: Manual ────────────────────────────────────────────────────────────────

test('UI: manual estático (fallback) — accordion com os módulos do programa e toggle abre/fecha', async ({ page }) => {
  await H.loginAdmin(page);
  await limparSeeds(page); // sem módulos publicados no banco → fallback estático
  await irParaAjuda(page);
  await abrirManual(page);

  // módulos do programa presentes no fallback
  for (const id of ['dashboard', 'sessoes', 'marketing', 'perfil', 'plano']) {
    await expect(page.locator(`[data-manual-toggle="${id}"]`)).toBeAttached();
  }
  // toggle: plano fechado → abre → "Passo a passo" visível → fecha
  const body = page.locator('#manual-body-plano');
  await expect(body).toBeHidden();
  await page.locator('[data-manual-toggle="plano"]').click();
  await expect(body).toBeVisible();
  await expect(body.getByText('Passo a passo: O que fazer aqui?')).toBeVisible();
  await page.locator('[data-manual-toggle="plano"]').click();
  await expect(body).toBeHidden();
});

test('UI: módulo publicado no banco SUBSTITUI o estático e renderiza os 4 tipos de bloco', async ({ page }) => {
  await H.loginAdmin(page);
  try {
    await apiSuper(page, 'POST', '/api/admin/manual', {
      id: '_e2e-banco', label: 'E2E Banco', order: 0, isPublished: true,
      icon: '<circle cx="12" cy="12" r="10"/>',
      blocks: [
        { type: 'intro', content: 'Introdução vinda do banco E2E.' },
        { type: 'callout', content: 'Callout verde do banco.', color: 'green' },
        { type: 'steps', steps: [{ n: 1, who: 'fotógrafo', color: 'accent', title: 'Passo do banco', desc: 'Descrição do passo.' }] },
        { type: 'image', url: '/uploads/e2e-fake.jpg', caption: 'Legenda da captura' },
      ],
    });

    await irParaAjuda(page);
    await abrirManual(page);
    // o banco substitui TODO o estático: só o módulo publicado aparece
    await expect(page.locator('[data-manual-toggle="_e2e-banco"]')).toBeAttached();
    await expect(page.locator('[data-manual-toggle="marketing"]')).toHaveCount(0);

    await page.locator('[data-manual-toggle="_e2e-banco"]').click();
    const body = page.locator('#manual-body-_e2e-banco');
    await expect(body.getByText('Introdução vinda do banco E2E.')).toBeVisible();
    await expect(body.getByText('Callout verde do banco.')).toBeVisible();
    await expect(body.getByText('PASSO A PASSO')).toBeVisible();
    await expect(body.getByText('Passo do banco')).toBeVisible();
    await expect(body.locator('img[src="/uploads/e2e-fake.jpg"]')).toBeAttached();
    await expect(body.getByText('Legenda da captura')).toBeVisible();
  } finally {
    await limparSeeds(page);
  }
});

test('UI: despublicar o módulo do banco → fallback estático volta', async ({ page }) => {
  await H.loginAdmin(page);
  try {
    await apiSuper(page, 'POST', '/api/admin/manual', {
      id: '_e2e-temp', label: 'E2E Temp', isPublished: true,
      blocks: [{ type: 'intro', content: 'x' }],
    });
    await irParaAjuda(page);
    await abrirManual(page);
    await expect(page.locator('[data-manual-toggle="_e2e-temp"]')).toBeAttached();

    await apiSuper(page, 'PUT', '/api/admin/manual/_e2e-temp', { isPublished: false });
    // recarrega a aba (a view manual relê /api/manual no render da tab) — reabre direto
    // na view manual (ajudaView persistiu), então só esperamos o accordion
    await page.evaluate(() => window.switchTab('dashboard'));
    await page.waitForTimeout(800);
    await page.evaluate(() => window.switchTab('ajuda'));
    await expect(page.locator('[data-manual-toggle]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-manual-toggle="_e2e-temp"]')).toHaveCount(0);
    await expect(page.locator('[data-manual-toggle="marketing"]')).toBeAttached();
  } finally {
    await limparSeeds(page);
  }
});
