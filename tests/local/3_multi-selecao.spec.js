// Modo MULTI-SELEÇÃO (nova UI, local): participantes com códigos próprios.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

async function addParticipante(page, nome, limite) {
  await page.locator('#newPartName').fill(nome);
  await page.locator('#newPartLimit').fill(String(limite));
  await page.locator('#addParticipantBtn').click();
}

test('Multi-Seleção — 2 participantes selecionam, admin acompanha, edita e entrega', async ({ page, context, browser }) => {
  test.setTimeout(160000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  // Cria multi (sem cliente) → wizard
  const { name } = await H.criarSessao(page, { mode: 'multi_selection' });
  await H.subirFotosWizard(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
  await H.concluirUpload(page);

  // Compartilhar → gerenciar participantes (abre #participantsModal sobre o wizard)
  await H.irParaPasso(page, 'Compartilhar');
  await page.locator('button', { hasText: /Gerenciar participantes/i }).click();
  await expect(page.locator('#participantsModal')).toBeVisible({ timeout: 8000 });

  await addParticipante(page, 'Participante Um', 2);
  await expect(page.locator('#participantsList [onclick^="copySessionCode"]')).toHaveCount(1, { timeout: 8000 });
  await addParticipante(page, 'Participante Dois', 2);
  await expect(page.locator('#participantsList [onclick^="copySessionCode"]')).toHaveCount(2, { timeout: 8000 });

  const codigos = await page.locator('#participantsList [onclick^="copySessionCode"]').allInnerTexts();
  const [code1, code2] = codigos.map((c) => c.trim());
  expect(code1).toBeTruthy();
  expect(code2).toBeTruthy();

  await page.locator('#closeParticipantsModal').click();
  await expect(page.locator('#sessionWizardModal')).toBeVisible({ timeout: 8000 });
  await H.fecharWizard(page);

  // Participante 1 seleciona fotos 0,1 e envia
  const p1 = await H.clienteAbrir(browser, code1);
  await expect(p1.page.locator('.photo-heart')).toHaveCount(3, { timeout: 15000 });
  await p1.page.locator('.photo-heart').nth(0).click();
  await p1.page.waitForTimeout(300);
  await p1.page.locator('.photo-heart').nth(1).click();
  await p1.page.waitForTimeout(300);
  await p1.page.locator('#submitBtn').click();
  await p1.page.locator('#gcConfirm').click();
  await expect(p1.page.locator('.status-title')).toContainText('Seleção Enviada', { timeout: 10000 });
  await p1.ctx.close();

  // Participante 2 seleciona fotos 1,2 e envia (união = 3)
  const p2 = await H.clienteAbrir(browser, code2);
  await expect(p2.page.locator('.photo-heart')).toHaveCount(3, { timeout: 15000 });
  await p2.page.locator('.photo-heart').nth(1).click();
  await p2.page.waitForTimeout(300);
  await p2.page.locator('.photo-heart').nth(2).click();
  await p2.page.waitForTimeout(300);
  await p2.page.locator('#submitBtn').click();
  await p2.page.locator('#gcConfirm').click();
  await expect(p2.page.locator('.status-title')).toContainText('Seleção Enviada', { timeout: 10000 });
  await p2.ctx.close();

  // Admin acompanha: 2/2 participantes
  await H.voltarParaSessoes(page);
  await H.abrirWizard(page, name);
  await H.irParaPasso(page, 'Acompanhar');
  await expect(page.locator('#wizardContent')).toContainText('2 / 2', { timeout: 15000 });

  // Editadas: união de 3 → sobe as 3
  await H.irParaPasso(page, 'Editadas');
  await expect(page.locator('h2', { hasText: 'Editadas' })).toBeVisible({ timeout: 5000 });
  await H.subirEditada(page, H.FOTO_1);
  await H.subirEditada(page, H.FOTO_2);
  await H.subirEditada(page, H.FOTO_3);
  await expect(page.locator('#wizardContent')).toContainText('Todas as fotos editadas enviadas', { timeout: 30000 });

  // Entregar todos os participantes prontos
  await H.irParaPasso(page, 'Entregar');
  await page.locator('button', { hasText: /Entregar todos/i }).click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#wizardContent')).toContainText(/entregue/i, { timeout: 12000 });
  await H.fecharWizard(page);

  await H.deletarSessao(page, name);
});
