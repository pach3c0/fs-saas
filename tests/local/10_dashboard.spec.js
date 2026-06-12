// Dashboard — cobertura exaustiva: métricas, sessões recentes (clique abre o wizard),
// estado vazio, ações rápidas (Ver todas / Nova Sessão / Ver meu Site) e onboarding.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

async function irParaDashboard(page) {
  await page.evaluate(() => window.switchTab('dashboard'));
  await expect(page.locator('#dashboard-content')).toBeVisible({ timeout: 10000 });
  // Espera o loadDashboardData terminar (card real substitui o skeleton) — evita
  // clicar em elementos que ainda serão re-renderizados (detach race).
  await expect(page.locator('#metrics-grid > div', { hasText: 'Total de Sessões' })).toBeVisible({ timeout: 10000 });
}
const cardMetrica = (page, label) => page.locator('#metrics-grid > div', { hasText: label });

test('Render + métricas batem com a API (/api/sessions + /api/billing/subscription)', async ({ page, context }) => {
  test.setTimeout(90000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  // Garante ≥1 sessão para o "Total" ser significativo
  const { name } = await H.criarSessao(page, { mode: 'selection' });
  await H.fecharWizard(page);

  await irParaDashboard(page);
  await expect(cardMetrica(page, 'Total de Sessões')).toBeVisible({ timeout: 10000 });

  // Cabeçalho + carimbo de atualização
  await expect(page.locator('#dashboard-content')).toContainText('Olá');
  await expect(page.locator('#last-update')).toContainText('Atualizado');

  // Lê o esperado direto da API (mesma fonte que o dashboard usa)
  const esperado = await page.evaluate(async () => {
    const t = localStorage.getItem('authToken');
    const h = { Authorization: 'Bearer ' + t };
    const [s, b] = await Promise.all([
      fetch('/api/sessions', { headers: h }).then(r => r.json()),
      fetch('/api/billing/subscription', { headers: h }).then(r => r.json()),
    ]);
    const sessions = s.sessions || [];
    return {
      total: sessions.length,
      fotos: sessions.reduce((a, p) => a + (p.photos?.length || 0), 0),
      entregues: sessions.filter(x => x.selectionStatus === 'delivered').length,
      storageMB: b.usage?.storageMB ?? 0,
    };
  });

  await expect(cardMetrica(page, 'Total de Sessões')).toContainText(String(esperado.total));
  await expect(cardMetrica(page, 'Fotos Upadas')).toContainText(String(esperado.fotos));
  await expect(cardMetrica(page, 'Entregues')).toContainText(String(esperado.entregues));
  // "Espaço Usado" agora é formatado: GB a partir de 1 GB, MB abaixo disso (mesma lógica do dashboard).
  const fmtStorage = esperado.storageMB >= 1024 ? `${(esperado.storageMB / 1024).toFixed(1)} GB` : `${esperado.storageMB} MB`;
  await expect(cardMetrica(page, 'Espaço Usado')).toContainText(fmtStorage);

  await H.deletarSessao(page, name);
});

test('Sessão recente clicável abre o wizard da sessão certa', async ({ page, context }) => {
  test.setTimeout(90000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { name } = await H.criarSessao(page, { mode: 'selection' });
  await H.fecharWizard(page);

  await irParaDashboard(page);
  const linha = page.locator('#recent-sessions-list > div', { hasText: name }).first();
  await expect(linha).toBeVisible({ timeout: 10000 });
  await linha.click();

  // Antes do fix, viewSessionPhotos era indefinida e o clique não abria nada.
  await expect(page.locator('#sessionWizardModal')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#wizardConfigPanel [data-cfg="name"]')).toHaveValue(name);

  await H.fecharWizard(page);
  await H.deletarSessao(page, name);
});

test('Estado vazio — sem sessões mostra a mensagem e zera as métricas', async ({ page, context }) => {
  test.setTimeout(60000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);

  // Intercepta a listagem para simular org sem sessões (não-destrutivo)
  await page.route('**/api/sessions', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sessions: [] }) });
    }
    return route.continue();
  });

  await irParaDashboard(page);
  await expect(cardMetrica(page, 'Total de Sessões')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#recent-sessions-list')).toContainText('ainda não tem sessões');
  await expect(cardMetrica(page, 'Total de Sessões')).toContainText('0');

  await page.unroute('**/api/sessions');
});

// As 3 ações rápidas ficam em testes separados: cada uma navega para fora do dashboard,
// então um teste único exigiria bouncing dashboard→aba→dashboard, que gera race de re-render.
test('Ação rápida — "Ver todas" leva à aba Sessões', async ({ page, context }) => {
  test.setTimeout(60000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await irParaDashboard(page);
  await page.locator('#dashboard-content button', { hasText: 'Ver todas' }).click();
  await expect(page.locator('#sessionsList')).toBeVisible({ timeout: 10000 });
});

test('Ação rápida — "Nova Sessão" abre o modal de criação na aba Sessões', async ({ page, context }) => {
  test.setTimeout(60000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await irParaDashboard(page);
  await page.locator('#dashboard-content button', { hasText: 'Nova Sessão' }).click();
  await expect(page.locator('#newSessionModal')).toBeVisible({ timeout: 10000 });
});

test('Ação rápida — "Ver meu Site" abre o site público numa nova aba', async ({ page, context }) => {
  test.setTimeout(60000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await irParaDashboard(page);
  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.locator('#dashboard-content button', { hasText: 'Ver meu Site' }).click(),
  ]);
  await expect(popup).toHaveURL(/\/site\?_tenant=teste/);
  await popup.close();
});

test('Onboarding — progresso, "Ver Tutorial" leva à Ajuda e "Ocultar guia" some', async ({ page, context }) => {
  test.setTimeout(60000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  // Força um onboarding incompleto e neutraliza o dismiss.
  // O checklist exibe 3 passos (sessionCreated, photosUploaded, linkSent) — o "Vincular cliente"
  // saiu com a migração de Clientes p/ o Rhyno. Com 1 de 3 concluído → 33%.
  await page.route('**/api/onboarding', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      onboarding: { completed: false, steps: { sessionCreated: true, photosUploaded: false, clientLinked: false, linkSent: false } },
    }),
  }));
  await page.route('**/api/onboarding/dismiss', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }),
  }));

  await H.loginAdmin(page);
  await irParaDashboard(page);

  await expect(page.locator('#onboarding-section')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#onboarding-section')).toContainText('Comece por aqui');
  await expect(page.locator('#onboarding-section')).toContainText('33%');

  // "Ver Tutorial" (item não concluído) → aba Ajuda
  await page.locator('#onboarding-section span', { hasText: 'Ver Tutorial' }).first().click();
  await expect(page.locator('.nav-item[data-tab="ajuda"]')).toHaveClass(/active/, { timeout: 10000 });
  await expect(page.getByText('Manual do Usuário')).toBeVisible();

  // Volta e oculta o guia
  await irParaDashboard(page);
  await expect(page.locator('#onboarding-section')).toBeVisible({ timeout: 10000 });
  await page.locator('#onboarding-section button', { hasText: 'Ocultar guia' }).click();
  await expect(page.locator('#onboarding-section')).toBeHidden({ timeout: 8000 });

  await page.unroute('**/api/onboarding');
  await page.unroute('**/api/onboarding/dismiss');
});
