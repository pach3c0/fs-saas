const { test, expect } = require('@playwright/test');

/**
 * Teste do módulo de Clientes (CRM) - LOCAL
 */

const TEST_EMAIL = 'test-auto-admin@exemplo.com';
const TEST_PASSWORD = 'password123';
const BASE_URL = 'http://localhost:3051';

async function loginAdmin(page) {
  await page.goto(`${BASE_URL}/admin`);
  await page.locator('#adminEmail').fill(TEST_EMAIL);
  await page.locator('#adminPassword').fill(TEST_PASSWORD);
  await page.locator('#loginSubmitBtn').click();
  await expect(page.locator('#adminPanel')).toBeVisible({ timeout: 15000 });
  
  await page.waitForSelector('.nav-item[data-tab="clientes"]', { timeout: 15000 });
  await page.waitForTimeout(1500);
  
  await page.evaluate(() => window.switchTab('clientes'));
  await page.waitForSelector('#btnNovoCliente', { timeout: 15000 });
}

test.describe('CRM — Gerenciamento de Clientes (LOCAL)', () => {
  
  test('Fluxo Completo: Criar, Buscar, Editar e Excluir Cliente', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER:', msg.text()));

    await loginAdmin(page);

    const timestamp = Date.now();
    const clientName = `test-auto-cliente-${timestamp}`;
    const clientEmail = `test-auto-${timestamp}@exemplo.com`;
    const newName = `test-auto-editado-${timestamp}`;

    // 1. Criar
    await page.locator('#btnNovoCliente').click();
    await page.locator('#clienteNome').fill(clientName);
    await page.locator('#clienteEmail').fill(clientEmail);
    await page.locator('#btnSalvarCliente').click();
    await expect(page.locator('#modalCliente')).not.toBeVisible({ timeout: 10000 });

    // 2. Buscar
    await page.locator('#searchClientes').fill(clientName);
    await page.waitForTimeout(1000);
    
    // 3. Editar
    const item = page.locator('.cliente-item', { hasText: clientName }).first();
    await item.locator('[data-editar]').click();
    await page.locator('#clienteNome').fill(newName);
    await page.locator('#btnSalvarCliente').click();
    await expect(page.locator('#modalCliente')).not.toBeVisible();
    
    // 4. Buscar Editado
    await page.locator('#searchClientes').fill(newName);
    await page.waitForTimeout(1500);
    await expect(page.locator('#clientesLista')).toContainText(newName);

    // 5. Excluir
    const deleteBtn = page.locator('.cliente-item', { hasText: newName }).first().locator('[data-deletar]');
    await deleteBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await deleteBtn.click();
    
    // Aguardar e clicar no botão OK
    await page.waitForSelector('#confirmOk', { timeout: 10000 });
    await page.locator('#confirmOk').click();
    
    await expect(page.locator('#clientesLista')).not.toContainText(newName, { timeout: 15000 });
  });
});
