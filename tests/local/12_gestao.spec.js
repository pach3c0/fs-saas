// Gestão — cobertura cheia cross-app (CliqueZoom ↔ ERP Rhyno):
//  A) Backend CliqueZoom: /api/gestao/sso-url (formato), /api/gestao/customers GET/POST (validações).
//  B) UI da aba: iframe carrega via SSO SEM tela de login, modo embed (sem sidebar do Rhyno),
//     sub-menu agrupado navega entre as telas, sem link "Abrir em nova aba".
//  C) Regra de negócio do Rhyno: OS só aceita item do catálogo (API direta :8000 + cross-app via iframe).
// PRÉ-REQUISITO: stack Rhyno UP — rhyno-pg + rhyno-api (:8000, uvicorn) + Vite (:5173).
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

const RHYNO_API = 'http://localhost:8000';
const RHYNO_EMAIL = 'teste@cliquezoom.local';
const RHYNO_PASS = 'teste123';
// Nomes em MAIÚSCULAS: o input de item da OS força uppercase ao digitar
const SVC_NAME = 'TEST-E2E SERVICO GESTAO';
const PROD_NAME = 'TEST-E2E PRODUTO GESTAO';

// ── Helpers Rhyno (API direta, servidor-a-servidor como o plano pede) ──────

async function rhynoToken(request) {
  const r = await request.post(`${RHYNO_API}/auth/login`, {
    form: { username: RHYNO_EMAIL, password: RHYNO_PASS },
  });
  expect(r.ok(), 'login no Rhyno (stack precisa estar UP)').toBeTruthy();
  return (await r.json()).access_token;
}

async function rh(request, token, method, path, body) {
  const r = await request.fetch(`${RHYNO_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status(), ok: r.ok(), json: await r.json().catch(() => null) };
}

// Garante ≥1 serviço e ≥1 produto de teste no catálogo do tenant (idempotente).
async function seedCatalogo(request, token) {
  let svc = (await rh(request, token, 'GET', `/services/?search=${encodeURIComponent(SVC_NAME)}`)).json;
  let serviceId = svc?.items?.[0]?.id;
  if (!serviceId) {
    const r = await rh(request, token, 'POST', '/services/', { name: SVC_NAME, price_base: 150 });
    expect(r.ok).toBeTruthy();
    serviceId = r.json.id;
  }
  let prod = (await rh(request, token, 'GET', `/products/?search=${encodeURIComponent(PROD_NAME)}`)).json;
  let productId = prod?.items?.[0]?.id;
  if (!productId) {
    const r = await rh(request, token, 'POST', '/products/', { name: PROD_NAME, price_daily: 50 });
    expect(r.ok).toBeTruthy();
    productId = r.json.id;
  }
  return { serviceId, productId };
}

// Pega (ou cria) um customer do tenant p/ ancorar a OS.
async function getCustomerId(request, token) {
  const r = await rh(request, token, 'GET', '/customers/?limit=1&profile=customer&search=Cliente Teste E2E');
  if (r.json?.items?.length) return r.json.items[0].id;
  const c = await rh(request, token, 'POST', '/customers/', {
    name: 'Cliente Teste E2E Gestao', document: H.gerarCPF(), person_type: 'fisica', is_customer: true,
  });
  expect(c.ok).toBeTruthy();
  return c.json.id;
}

const itemServico = (overrides = {}) => ({
  item_type: 'service', description: SVC_NAME, quantity: 1, unit: 'UN',
  unit_price: 150, total_price: 150, ...overrides,
});

// ── Helpers CliqueZoom ─────────────────────────────────────────────────────

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

async function irParaGestao(page) {
  await H.esconderPainelUpload(page);
  const sso = page.waitForResponse((r) => r.url().includes('/api/gestao/sso-url'));
  await page.evaluate(() => window.switchTab('gestao'));
  await expect(page.locator('#gestaoFrame')).toBeVisible({ timeout: 10000 });
  await sso;
}

const frame = (page) => page.frameLocator('#gestaoFrame');

// ── A) Backend CliqueZoom — rotas /api/gestao ──────────────────────────────

test('API sso-url: gera URL de SSO com asserção, embed=1 e redirect respeitado', async ({ page }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);

  const padrao = await api(page, 'GET', '/api/gestao/sso-url');
  expect(padrao.status).toBe(200);
  expect(padrao.json.success).toBe(true);
  expect(padrao.json.url).toContain('/sso?assertion=');
  expect(padrao.json.url).toContain('embed=1');
  expect(padrao.json.url).toContain(`redirect=${encodeURIComponent('/dashboard')}`);

  const custom = await api(page, 'GET', '/api/gestao/sso-url?redirect=/customers');
  expect(custom.json.url).toContain(`redirect=${encodeURIComponent('/customers')}`);
});

test('API customers GET: lista no formato do seletor de sessão (ids "rhyno:") e search filtra', async ({ page, request }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);

  // Garante 1 customer conhecido no Rhyno
  const token = await rhynoToken(request);
  await getCustomerId(request, token);

  const todos = await api(page, 'GET', '/api/gestao/customers');
  expect(todos.status).toBe(200);
  expect(todos.json.success).toBe(true);
  expect(Array.isArray(todos.json.clients)).toBe(true);
  expect(todos.json.clients.length).toBeGreaterThan(0);
  for (const c of todos.json.clients) {
    expect(c._id).toMatch(/^rhyno:\d+$/);
    expect(typeof c.name).toBe('string');
  }

  const filtrado = await api(page, 'GET', '/api/gestao/customers?search=Cliente Teste E2E');
  expect(filtrado.json.clients.length).toBeGreaterThan(0);
  for (const c of filtrado.json.clients) expect(c.name).toContain('Cliente Teste E2E');
});

test('API customers POST: valida nome, CPF/CNPJ (obrigatório, inválido, duplicado) e cria com sucesso', async ({ page }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);

  const semNome = await api(page, 'POST', '/api/gestao/customers', { cpf: H.gerarCPF() });
  expect(semNome.status).toBe(400);

  const semDoc = await api(page, 'POST', '/api/gestao/customers', { name: 'Sem Documento E2E' });
  expect(semDoc.status).toBe(400);
  expect(semDoc.json.error).toMatch(/CPF\/CNPJ/i);

  const cpfInvalido = await api(page, 'POST', '/api/gestao/customers', { name: 'CPF Invalido E2E', cpf: '00000000000' });
  expect(cpfInvalido.status).toBe(400);
  expect(cpfInvalido.json.error).toMatch(/CPF|cadastr/i); // mensagem acionável

  const cpf = H.gerarCPF();
  const ok = await api(page, 'POST', '/api/gestao/customers', {
    name: `Cliente Teste E2E ${Date.now()}`, cpf, email: 'gestao@e2e.com', phone: '11988887777',
  });
  expect(ok.status).toBe(200);
  expect(ok.json.success).toBe(true);
  expect(ok.json.client._id).toMatch(/^rhyno:\d+$/);

  // Mesmo documento de novo → Rhyno rejeita duplicado
  const dup = await api(page, 'POST', '/api/gestao/customers', { name: 'Duplicado E2E', cpf });
  expect(dup.status).toBe(400);
});

// ── B) UI da aba Gestão (iframe + SSO + embed) ─────────────────────────────

test('Aba Gestão: sub-menu agrupado, SSO entra direto no dashboard (sem login) e embed esconde a sidebar do Rhyno', async ({ page }) => {
  test.setTimeout(90000);
  await H.loginAdmin(page);
  await irParaGestao(page);

  // Sub-menu: 4 grupos e 11 seções, Dashboard ativo por padrão
  for (const g of ['Operação', 'Cadastros', 'Financeiro', 'Relacionamento']) {
    await expect(page.locator('#gestaoSubnav')).toContainText(g);
  }
  await expect(page.locator('.gestao-sec')).toHaveCount(11);
  await expect(page.locator('.gestao-sec[data-active="true"]')).toHaveText(/Dashboard/);

  // Sem link "Abrir em nova aba" (removido por decisão de UX)
  await expect(page.locator('#tabContent')).not.toContainText('Abrir em nova aba');

  // SSO: dentro do iframe o dashboard do Rhyno renderiza SEM tela de login
  await expect(frame(page).locator('h1', { hasText: 'Dashboard' })).toBeVisible({ timeout: 30000 });
  await expect(frame(page).locator('input[type="password"]')).toHaveCount(0);
  // Modo embed: a sidebar própria do Rhyno (<aside>) fica oculta
  await expect(frame(page).locator('aside')).toHaveCount(0);
});

test('Sub-navegação: trocar de seção navega o iframe em ?embed=1 mantendo a sessão (sem novo login)', async ({ page }) => {
  test.setTimeout(90000);
  await H.loginAdmin(page);
  await irParaGestao(page);
  await expect(frame(page).locator('h1', { hasText: 'Dashboard' })).toBeVisible({ timeout: 30000 });

  // Operação → Clientes
  await page.locator('.gestao-sec', { hasText: 'Clientes' }).click();
  await expect(page.locator('.gestao-sec[data-active="true"]')).toHaveText(/Clientes/);
  expect(await page.locator('#gestaoFrame').getAttribute('src')).toContain('/customers?embed=1');
  await expect(frame(page).locator('h1', { hasText: 'Clientes e Fornecedores' })).toBeVisible({ timeout: 30000 });
  await expect(frame(page).locator('input[type="password"]')).toHaveCount(0);

  // Operação → Ordens de Serviço
  await page.locator('.gestao-sec', { hasText: 'Ordens de Serviço' }).click();
  expect(await page.locator('#gestaoFrame').getAttribute('src')).toContain('/service-orders?embed=1');
  await expect(frame(page).locator('h1', { hasText: 'Ordens de Serviço' })).toBeVisible({ timeout: 30000 });

  // Cadastros → Produtos / Serviços (catálogo)
  await page.locator('.gestao-sec', { hasText: 'Produtos / Serviços' }).click();
  expect(await page.locator('#gestaoFrame').getAttribute('src')).toContain('/catalog?embed=1');
  await expect(frame(page).locator('aside')).toHaveCount(0); // embed persiste na navegação
});

// ── C) Regra de negócio: OS só aceita item do catálogo ─────────────────────

test('API Rhyno: OS com item de texto livre é rejeitada (400); item do catálogo salva e fica vinculado', async ({ request }) => {
  test.setTimeout(60000);
  const token = await rhynoToken(request);
  const { serviceId, productId } = await seedCatalogo(request, token);
  const customerId = await getCustomerId(request, token);

  // Serviço sem service_id (texto livre) → 400 com mensagem da regra
  const livre = await rh(request, token, 'POST', '/service-orders/', {
    customer_id: customerId, items: [itemServico()],
  });
  expect(livre.status).toBe(400);
  expect(livre.json.detail).toMatch(/selecionado do catálogo/i);

  // Peça sem product_id → 400
  const pecaLivre = await rh(request, token, 'POST', '/service-orders/', {
    customer_id: customerId, items: [itemServico({ item_type: 'part', description: PROD_NAME })],
  });
  expect(pecaLivre.status).toBe(400);

  // service_id inexistente → 400 "não está cadastrado"
  const fantasma = await rh(request, token, 'POST', '/service-orders/', {
    customer_id: customerId, items: [itemServico({ service_id: 999999 })],
  });
  expect(fantasma.status).toBe(400);
  expect(fantasma.json.detail).toMatch(/não está cadastrado/i);

  // Item do catálogo → cria; reler confirma o vínculo
  const ok = await rh(request, token, 'POST', '/service-orders/', {
    customer_id: customerId, items: [itemServico({ service_id: serviceId })],
  });
  expect(ok.ok).toBeTruthy();
  const osId = ok.json.id;
  const relida = await rh(request, token, 'GET', `/service-orders/${osId}`);
  expect(relida.json.items[0].service_id).toBe(serviceId);

  // PUT trocando para item solto → 400 (a regra vale na edição também)
  const editLivre = await rh(request, token, 'PUT', `/service-orders/${osId}`, {
    items: [itemServico()],
  });
  expect(editLivre.status).toBe(400);

  // PUT com produto do catálogo → ok
  const editOk = await rh(request, token, 'PUT', `/service-orders/${osId}`, {
    items: [itemServico({ item_type: 'part', description: PROD_NAME, product_id: productId })],
  });
  expect(editOk.ok).toBeTruthy();

  await rh(request, token, 'DELETE', `/service-orders/${osId}`); // limpeza
});

test('Cross-app (iframe): item digitado à mão mostra ⚠ e bloqueia; item do catálogo mostra ✓ e a OS é criada', async ({ page, request }) => {
  test.setTimeout(150000);
  const token = await rhynoToken(request);
  await seedCatalogo(request, token);
  await getCustomerId(request, token);

  await H.loginAdmin(page);
  await irParaGestao(page);
  await expect(frame(page).locator('h1', { hasText: 'Dashboard' })).toBeVisible({ timeout: 30000 });

  // Vai para Ordens de Serviço e abre o form de criação
  await page.locator('.gestao-sec', { hasText: 'Ordens de Serviço' }).click();
  const f = frame(page);
  await expect(f.locator('h1', { hasText: 'Ordens de Serviço' })).toBeVisible({ timeout: 30000 });
  await f.locator('button', { hasText: 'Novo Orçamento' }).click();

  // Cliente (obrigatório): autocomplete 3+ chars
  const cliInput = f.locator('input[placeholder="Digite 3 caracteres para buscar cliente"]');
  await expect(cliInput).toBeVisible({ timeout: 15000 });
  await cliInput.fill('Cliente Teste E2E');
  await f.locator('button', { hasText: 'Cliente Teste E2E' }).first().click();

  // Adiciona item e digita texto livre → quebra o vínculo → badge ⚠
  await f.locator('button', { hasText: 'Adicionar Item' }).click();
  const itemInput = f.locator('input[placeholder="Digite 3+ caracteres para buscar..."]').first();
  await itemInput.fill('ITEM FORA DO CATALOGO');
  await expect(f.getByText('⚠ Selecione um item do catálogo')).toBeVisible({ timeout: 10000 });

  // Submit bloqueado no front: toast de erro e segue na mesma tela
  await f.locator('button[type="submit"]', { hasText: 'Criar OS' }).click();
  await expect(f.getByText(/Todo item da OS precisa ser selecionado do catálogo/i)).toBeVisible({ timeout: 10000 });
  await expect(f.locator('button[type="submit"]', { hasText: 'Criar OS' })).toBeVisible();

  // Seleciona o serviço do catálogo na busca → badge ✓ e salva de verdade
  await itemInput.fill(SVC_NAME.slice(0, 12)); // "TEST-E2E SER"
  await f.locator('button', { hasText: SVC_NAME }).first().click();
  await expect(f.getByText('✓ Vinculado ao catálogo')).toBeVisible({ timeout: 10000 });
  await f.locator('button[type="submit"]', { hasText: 'Criar OS' }).click();

  // Sucesso: volta para a lista de OS
  await expect(f.locator('h1', { hasText: 'Ordens de Serviço' })).toBeVisible({ timeout: 20000 });

  // Limpeza: apaga a OS criada agora (a mais recente do tenant) via API
  const lista = await rh(request, token, 'GET', '/service-orders/?limit=1');
  const criada = lista.json?.items?.[0];
  if (criada) await rh(request, token, 'DELETE', `/service-orders/${criada.id}`);
});
