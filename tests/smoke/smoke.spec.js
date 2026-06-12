// Smoke test — verifica que a plataforma está de pé. 100% read-only:
// nenhum login, nenhuma escrita — seguro contra produção (fotógrafa real ativa).
const { test, expect } = require('@playwright/test');

test.describe('Smoke — plataforma no ar', () => {
  test('API health responde ok com Mongo conectado', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.mongodb.state).toBe(1);
  });

  test('painel do fotógrafo (/admin) renderiza a tela de login', async ({ page }) => {
    await page.goto('/admin/');
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('painel saas (/saas-admin) renderiza a tela de login', async ({ page }) => {
    await page.goto('/saas-admin/');
    await expect(page.locator('#loginEmail')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#loginPassword')).toBeVisible();
  });
});
