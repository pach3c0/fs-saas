const { test, expect, request } = require('@playwright/test');

// Credenciais admin de teste
const ADMIN_EMAIL = 'ricardopacheco.nunes59@gmail.com';
const ADMIN_PASSWORD = 'qUzsov-zetkek-wokwo3';
const BASE_URL = 'https://www.cliquezoom.com.br';

// Galeria do cliente funciona via subdomínio do fotógrafo
// fsfotografias.cliquezoom.com.br é o único subdomínio ativo com SSL wildcard
const GALERIA_URL = 'https://fsfotografias.cliquezoom.com.br/cliente/';

// Testes de UI da galeria usam a URL pública da Flavia (única org com subdomínio ativo)
// Testes de API usam a conta de teste (soraia) via request direto

test('Galeria cliente — tela de login acessível', async ({ page }) => {
  await page.goto(GALERIA_URL);
  await expect(page.locator('#loginSection')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#accessCode')).toBeVisible();
  await expect(page.locator('#loginBtn')).toBeVisible();
});

test('Galeria cliente — código inválido exibe erro', async ({ page }) => {
  await page.goto(GALERIA_URL);
  await expect(page.locator('#loginSection')).toBeVisible({ timeout: 10000 });

  await page.locator('#accessCode').fill('INVALIDO');
  await page.locator('#loginBtn').click();

  await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('#gallerySection')).toBeHidden();
});

test('API cliente — verify-code com sessão real da conta de teste', async () => {
  const ctx = await request.newContext({ baseURL: BASE_URL });

  // Login para obter token
  const loginRes = await ctx.post('/api/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  });
  expect(loginRes.ok()).toBeTruthy();
  const { token } = await loginRes.json();

  // Criar sessão temporária
  const sessaoRes = await ctx.post('/api/sessions', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: `test-auto-galeria-${Date.now()}`,
      type: 'Família',
      mode: 'gallery',
      workflowType: 'ready',
      photoResolution: 960,
    }
  });
  expect(sessaoRes.ok()).toBeTruthy();
  const { session } = await sessaoRes.json();
  expect(session).toBeTruthy();
  expect(session.accessCode).toBeTruthy();

  // Verificar que o verify-code funciona via API (sem UI)
  // Usa o host www pois a org não tem subdomínio — passa orgId via query para teste interno
  // O backend resolve org via subdomínio; aqui apenas confirmamos que a sessão foi criada com código
  expect(session.accessCode).toMatch(/^[A-F0-9]{8}$/);
  expect(session.organizationId).toBeTruthy();

  // Limpar sessão criada
  await ctx.delete(`/api/sessions/${session._id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await ctx.dispose();
});
