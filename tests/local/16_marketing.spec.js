// Marketing — cobertura exaustiva das 2 views do toggle:
//   • Visão Geral (KPIs/funil/status/modos/eventos/GA — /api/marketing/overview)
//   • Vendas Automáticas (pills de status, KPIs do robô, cupons — /api/sales/dashboard, reusa renderCrm)
// API (401, formato, deltas determinísticos com sessão real, GA, redeem/unredeem/404) +
// UI (render, números batem com a API, GA configurado/não, erro de carregamento, toggle,
// pills Ativado/Desativado, atalho Configurar, ciclo do cupom com toasts).
const { test, expect } = require('@playwright/test');
const { MongoClient, ObjectId } = require('mongodb');
const H = require('./helpers');

const MONGO_URI = 'mongodb://localhost:27017/cliquezoom-dev';
const GA_ID = 'G-MKTE2E001';
const CUPOM = 'E2EMKT77';

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

async function irParaMarketing(page) {
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('marketing'));
  await expect(page.getByText('Marketing & Performance')).toBeVisible({ timeout: 10000 });
}

// A view Vendas Automáticas faz fetch próprio (/api/sales/dashboard) — esperar o conteúdo real
async function abrirVendasAutomaticas(page) {
  await page.locator('.mkt-toggle[data-view="vendas"]').click();
  await expect(page.getByText('Lembrete & Escassês de Vendas')).toBeVisible({ timeout: 10000 });
}

// Semeia um gatilho com cupom direto no Mongo (não há endpoint que crie triggers —
// em produção é o postDeliveryAutomator quem grava)
async function semearCupom(sessionId, code) {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  try {
    await mongo.db().collection('sessions').updateOne(
      { _id: new ObjectId(sessionId) },
      { $set: { 'salesAutomation.sentTriggers': [
        { trigger: 'upsell_7d', sentAt: new Date(), couponCode: code, redeemedAt: null },
      ] } }
    );
  } finally {
    await mongo.close();
  }
}

// GA e automações de volta ao estado neutro (org `teste` é compartilhada pela suíte)
async function resetConfig(page) {
  const r = await api(page, 'PUT', '/api/organization/integrations', {
    googleAnalytics: { enabled: false, measurementId: '' },
    deadlineAutomation: { enabled: false },
    salesAutomator: { postDelivery: { enabled: false } },
  });
  expect(r.status).toBe(200);
}

// ── API ───────────────────────────────────────────────────────────────────────

test('API: rotas exigem autenticação (401 sem token)', async ({ request }) => {
  expect((await request.get('/api/marketing/overview')).status()).toBe(401);
  expect((await request.get('/api/sales/dashboard')).status()).toBe(401);
  expect((await request.post('/api/sales/coupons/QUALQUER/redeem', { data: {} })).status()).toBe(401);
});

test('API: overview retorna o formato completo (KPIs, funil, status, breakdowns, crm, rates, ga)', async ({ page }) => {
  await H.loginAdmin(page);
  const r = await api(page, 'GET', '/api/marketing/overview');
  expect(r.status).toBe(200);
  expect(r.json.success).toBe(true);

  for (const k of ['sessions30d', 'clients30d', 'clientsAll', 'totalSessions', 'totalPhotosUploaded']) {
    expect(typeof r.json[k], k).toBe('number');
  }
  // deltas são number ou null (null quando o período anterior é 0)
  for (const k of ['sessionsDelta', 'clientsDelta']) {
    expect(r.json[k] === null || typeof r.json[k] === 'number', k).toBe(true);
  }
  for (const k of ['totalSessions', 'codeSent', 'accessed', 'submitted', 'delivered', 'expired']) {
    expect(typeof r.json.funnel[k], `funnel.${k}`).toBe('number');
  }
  for (const k of ['pending', 'in_progress', 'submitted', 'delivered', 'expired']) {
    expect(typeof r.json.statusCount[k], `statusCount.${k}`).toBe('number');
  }
  expect(Array.isArray(r.json.byEventType)).toBe(true);
  expect(typeof r.json.byMode).toBe('object');
  expect(typeof r.json.crm.totalTriggers).toBe('number');
  expect(typeof r.json.crm.redeemedCoupons).toBe('number');
  for (const k of ['accessRate', 'submitRate', 'deliveryRate']) {
    expect(r.json.rates[k] === null || typeof r.json.rates[k] === 'number', `rates.${k}`).toBe(true);
  }
  expect(typeof r.json.ga.configured).toBe('boolean');
});

test('API: sales/dashboard retorna formato completo (integrations, 6 KPIs, cupons)', async ({ page }) => {
  await H.loginAdmin(page);
  const r = await api(page, 'GET', '/api/sales/dashboard');
  expect(r.status).toBe(200);
  expect(r.json.success).toBe(true);
  expect(typeof r.json.integrations).toBe('object');
  for (const k of ['sessoesMonitoradas', 'fotosPendentes', 'receitaPotencial', 'triggersDisparados', 'cuponsEmitidos', 'cuponsConvertidos']) {
    expect(typeof r.json.kpis[k], `kpis.${k}`).toBe('number');
  }
  expect(Array.isArray(r.json.cupons)).toBe(true);
});

test('API: GA do overview reflete a config de Integrações (configurado ↔ não)', async ({ page }) => {
  await H.loginAdmin(page);
  await resetConfig(page);
  let r = await api(page, 'GET', '/api/marketing/overview');
  expect(r.json.ga).toEqual({ configured: false, measurementId: null });

  await api(page, 'PUT', '/api/organization/integrations', {
    googleAnalytics: { enabled: true, measurementId: GA_ID },
  });
  r = await api(page, 'GET', '/api/marketing/overview');
  expect(r.json.ga).toEqual({ configured: true, measurementId: GA_ID });
  await resetConfig(page);
});

test('API: deltas determinísticos — sessão criada com 3 fotos + preço extra + código compartilhado', async ({ page, context }) => {
  test.setTimeout(150000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']); // "Copiar código" em headless
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const antesOv = (await api(page, 'GET', '/api/marketing/overview')).json;
  const antesSd = (await api(page, 'GET', '/api/sales/dashboard')).json;

  const { name } = await H.criarSessao(page, { mode: 'selection' });
  await H.aplicarConfig(page, { extraPhotoPrice: 10, packageLimit: 3 });
  await H.subirFotosWizard(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
  await H.concluirUpload(page);
  await H.compartilharCopiarCodigo(page); // registra codeSentAt
  await H.fecharWizard(page);

  const depoisOv = (await api(page, 'GET', '/api/marketing/overview')).json;
  const depoisSd = (await api(page, 'GET', '/api/sales/dashboard')).json;

  // Overview: totais, janela 30d, funil e breakdown por modo
  expect(depoisOv.totalSessions).toBe(antesOv.totalSessions + 1);
  expect(depoisOv.sessions30d).toBe(antesOv.sessions30d + 1);
  expect(depoisOv.funnel.codeSent).toBe(antesOv.funnel.codeSent + 1);
  expect(depoisOv.byMode.selection || 0).toBe((antesOv.byMode.selection || 0) + 1);
  expect(depoisOv.statusCount.pending).toBe(antesOv.statusCount.pending + 1);
  expect(depoisOv.totalPhotosUploaded).toBe(antesOv.totalPhotosUploaded + 3);

  // Sales: sessão entra no radar do robô — 3 fotos não escolhidas × R$ 10
  expect(depoisSd.kpis.sessoesMonitoradas).toBe(antesSd.kpis.sessoesMonitoradas + 1);
  expect(depoisSd.kpis.fotosPendentes).toBe(antesSd.kpis.fotosPendentes + 3);
  expect(depoisSd.kpis.receitaPotencial).toBe(antesSd.kpis.receitaPotencial + 30);

  await H.deletarSessao(page, name);
});

// ── UI: Visão Geral ───────────────────────────────────────────────────────────

test('UI: Visão Geral renderiza todas as seções e os números batem com a API', async ({ page }) => {
  await H.loginAdmin(page);
  const data = (await api(page, 'GET', '/api/marketing/overview')).json;
  await irParaMarketing(page);

  // 4 KPI cards (valor + total no rodapé do card)
  const cardSessoes = page.locator('div').filter({ hasText: /Sessões \(30d\)[\s\S]*no total/ }).last();
  await expect(cardSessoes).toContainText(String(data.sessions30d));
  await expect(cardSessoes).toContainText(`${data.totalSessions} no total`);
  const cardClientes = page.locator('div').filter({ hasText: /Clientes \(30d\)[\s\S]*no total/ }).last();
  await expect(cardClientes).toContainText(`${data.clientsAll} no total`);
  const taxaAcesso = data.rates.accessRate !== null ? `${data.rates.accessRate}%` : '—';
  await expect(page.locator('div').filter({ hasText: /Taxa de Acesso[\s\S]*galeria/ }).last()).toContainText(taxaAcesso);
  await expect(page.getByText('Taxa de Entrega')).toBeVisible();

  // Funil com as 5 etapas (valor da 1ª barra = total de sessões)
  await expect(page.getByText('Funil de Sessões')).toBeVisible();
  for (const etapa of ['Sessões criadas', 'Código enviado', 'Cliente acessou', 'Seleção enviada', 'Entregue']) {
    await expect(page.getByText(etapa, { exact: true }).first()).toBeVisible();
  }
  const linhaCriadas = page.locator('div').filter({ hasText: /Sessões criadas[\s\S]*%\)/ }).last();
  await expect(linhaCriadas).toContainText(`${data.funnel.totalSessions} `);

  // Status das sessões (5 linhas)
  await expect(page.getByText('Status das Sessões')).toBeVisible();
  for (const st of ['Aguardando', 'Em andamento', 'Expirado']) {
    await expect(page.getByText(st, { exact: true })).toBeVisible();
  }

  // Modos de sessão + resumo de vendas automáticas
  await expect(page.getByText('Modos de Sessão')).toBeVisible();
  const cardCrm = page.locator('div').filter({ hasText: /Vendas automáticas[\s\S]*Cupons usados/ }).last();
  await expect(cardCrm).toContainText(String(data.crm.totalTriggers));
  await expect(cardCrm).toContainText('E-mails enviados');
});

test('UI: card do GA alterna entre não configurado (aponta p/ Integrações) e conectado (ID + link)', async ({ page }) => {
  await H.loginAdmin(page);
  await resetConfig(page);
  await irParaMarketing(page);
  await expect(page.getByText('Google Analytics não configurado')).toBeVisible();
  await expect(page.getByText(/Configure o Measurement ID na aba/)).toBeVisible();

  await api(page, 'PUT', '/api/organization/integrations', {
    googleAnalytics: { enabled: true, measurementId: GA_ID },
  });
  // re-render da aba relê o overview
  await page.evaluate(() => window.switchTab('dashboard'));
  await page.waitForTimeout(800);
  await irParaMarketing(page);
  await expect(page.getByText('Google Analytics conectado')).toBeVisible();
  await expect(page.getByText(GA_ID)).toBeVisible();
  await expect(page.locator('a', { hasText: 'Abrir Google Analytics' })).toHaveAttribute('href', 'https://analytics.google.com');
  await resetConfig(page);
});

test('UI: falha no overview → mensagem de erro (sem quebrar a aba)', async ({ page }) => {
  await H.loginAdmin(page);
  await page.route('**/api/marketing/overview', (route) => route.abort());
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('marketing'));
  await expect(page.getByText('Erro ao carregar dados.')).toBeVisible({ timeout: 10000 });
  await page.unroute('**/api/marketing/overview');
});

// ── UI: toggle + Vendas Automáticas ──────────────────────────────────────────

test('UI: toggle alterna entre Visão Geral e Vendas Automáticas (e volta)', async ({ page }) => {
  await H.loginAdmin(page);
  await irParaMarketing(page);

  // default = Visão Geral
  await expect(page.getByText('Funil de Sessões')).toBeVisible();

  await abrirVendasAutomaticas(page);
  await expect(page.locator('h2', { hasText: 'Vendas Automáticas' })).toBeVisible();
  // 6 KPIs do robô
  for (const kpi of ['Sessões monitoradas', 'Fotos pendentes', 'Receita potencial', 'Gatilhos disparados', 'Cupons emitidos', 'Convertidos']) {
    await expect(page.getByText(kpi).first()).toBeVisible();
  }
  await expect(page.getByText('Funil de Sessões')).not.toBeVisible();

  // volta pra Visão Geral
  await page.locator('.mkt-toggle[data-view="overview"]').click();
  await expect(page.getByText('Funil de Sessões')).toBeVisible();
  await expect(page.getByText('Lembrete & Escassês de Vendas')).not.toBeVisible();
});

test('UI: pills de status refletem a config (Ativado/Desativado) e botão Configurar navega', async ({ page }) => {
  await H.loginAdmin(page);

  // ambos ligados
  await api(page, 'PUT', '/api/organization/integrations', {
    deadlineAutomation: { enabled: true },
    salesAutomator: { postDelivery: { enabled: true } },
  });
  await irParaMarketing(page);
  await abrirVendasAutomaticas(page);
  // hasText com string usa texto normalizado (regex com ^ não casa com o textContent cru)
  const pillLembrete = page.locator('div').filter({ hasText: 'Lembrete de seleção:' }).last();
  const pillEscassez = page.locator('div').filter({ hasText: 'Escassês de vendas (pós-entrega):' }).last();
  await expect(pillLembrete).toContainText('Ativado');
  await expect(pillEscassez).toContainText('Ativado');

  // ambos desligados → re-render
  await resetConfig(page);
  await page.evaluate(() => window.switchTab('dashboard'));
  await page.waitForTimeout(800);
  await irParaMarketing(page);
  await abrirVendasAutomaticas(page);
  await expect(pillLembrete).toContainText('Desativado');
  await expect(pillEscassez).toContainText('Desativado');

  // atalho Configurar → aba Configurações
  await page.getByText('Configurar', { exact: true }).click();
  await expect(page.getByText('Escassês & Vendas').first()).toBeVisible({ timeout: 10000 });
});

test('UI: sem cupons emitidos → estado vazio da lista', async ({ page }) => {
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page); // remove sessões semeadas de runs anteriores
  await irParaMarketing(page);
  await abrirVendasAutomaticas(page);
  await expect(page.getByText('Nenhum cupom foi emitido ainda')).toBeVisible();
});

// ── Cupons: ciclo completo (API + UI) ────────────────────────────────────────

test('Cupons: semeado → listado; redeem/unredeem via API e via UI; código inexistente → 404', async ({ page }) => {
  test.setTimeout(150000);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { sessionId, name } = await H.criarSessao(page, { mode: 'selection' });
  await H.fecharWizard(page);
  await semearCupom(sessionId, CUPOM);

  // API: cupom aparece em aberto, com os campos da listagem
  let r = (await api(page, 'GET', '/api/sales/dashboard')).json;
  const cupom = r.cupons.find((c) => c.code === CUPOM);
  expect(cupom).toBeTruthy();
  expect(cupom.trigger).toBe('upsell_7d');
  expect(cupom.sessionName).toBe(name);
  expect(cupom.redeemed).toBe(false);
  expect(r.kpis.cuponsEmitidos).toBeGreaterThanOrEqual(1);
  expect(r.kpis.triggersDisparados).toBeGreaterThanOrEqual(1);

  // API: marcar usado → redeemedAt; desmarcar → null; inexistente → 404
  let red = await api(page, 'POST', `/api/sales/coupons/${CUPOM}/redeem`, { redeemed: true });
  expect(red.status).toBe(200);
  expect(red.json.redeemedAt).toBeTruthy();
  r = (await api(page, 'GET', '/api/sales/dashboard')).json;
  expect(r.cupons.find((c) => c.code === CUPOM).redeemed).toBe(true);
  expect(r.kpis.cuponsConvertidos).toBeGreaterThanOrEqual(1);

  red = await api(page, 'POST', `/api/sales/coupons/${CUPOM}/redeem`, { redeemed: false });
  expect(red.status).toBe(200);
  expect(red.json.redeemedAt).toBeNull();
  expect((await api(page, 'POST', '/api/sales/coupons/NAOEXISTE/redeem', {})).status).toBe(404);

  // UI: linha do cupom com badge e botão de alternância (toast em cada ação).
  // A linha é o div que contém o código E o botão de ação (o código sozinho fica num div interno).
  const linhaCupom = () => page.locator('div')
    .filter({ hasText: CUPOM })
    .filter({ has: page.locator('button[data-coupon-action]') })
    .last();
  await irParaMarketing(page);
  await abrirVendasAutomaticas(page);
  await expect(linhaCupom()).toContainText('Em aberto');
  await linhaCupom().locator('button', { hasText: 'Marcar como usado' }).click();
  await expect(page.locator('#toast-container')).toContainText('Cupom marcado como usado', { timeout: 10000 });
  await expect(linhaCupom()).toContainText('Convertido');
  await linhaCupom().locator('button', { hasText: 'Desmarcar' }).click();
  await expect(page.locator('#toast-container')).toContainText('voltou para "em aberto"', { timeout: 10000 });
  await expect(linhaCupom()).toContainText('Em aberto');

  await H.deletarSessao(page, name);
});
