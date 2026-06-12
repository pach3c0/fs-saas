// Ações destrutivas do painel de Armazenamento (passo Entregar): arquivar e deletar fotos.
// Cobre as duas saídas de `_confirmWithDownloadCheck`: com aviso de download pendente
// (sessão entregue, cliente não baixou) e sem aviso (sessão não entregue).
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

// Cria uma galeria com prazo de retenção, sobe fotos e leva até o passo Entregar
// (onde vive o painel de Armazenamento). Retorna { accessCode, name }.
async function galeriaComRetencao(page) {
  const ctx = await H.criarSessao(page, { mode: 'gallery' });

  const dataRet = new Date(); dataRet.setDate(dataRet.getDate() + 30);
  const retStr = dataRet.toISOString().split('T')[0];
  const retInput = page.locator('#wizardConfigPanel [data-cfg="storageRetentionUntil"]');
  const putRet = page.waitForResponse(
    (r) => /\/api\/sessions\/[a-f0-9]+$/.test(r.url()) && r.request().method() === 'PUT'
  );
  await retInput.fill(retStr);
  await retInput.blur();
  await putRet;

  await H.subirFotosWizard(page, [H.FOTO_1, H.FOTO_2, H.FOTO_3]);
  await H.concluirUpload(page);
  await H.irParaPasso(page, 'Compartilhar');
  await page.locator('button', { hasText: /Compartilhar prévia/i }).click();
  await page.waitForTimeout(600);
  await H.irParaPasso(page, 'Entregar');
  return ctx;
}

test('Arquivar — remove fotos do servidor (mantém capa) e salva link externo', async ({ page, context }) => {
  test.setTimeout(120000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { name } = await galeriaComRetencao(page);

  // Entrega a galeria (depois disso o cliente já pode baixar — mas não baixou nada ainda,
  // o que dispara o aviso de "download pendente" ao tentar arquivar).
  await H.esconderPainelUpload(page);
  const delResp = page.waitForResponse(
    (r) => /\/api\/sessions\/[a-f0-9]+\/deliver$/.test(r.url()) && r.request().method() === 'PUT'
  );
  await page.locator('#wizardContent button', { hasText: /Entregar e notificar/i }).click();
  await page.locator('#confirmOk').click();
  await delResp;
  await page.waitForTimeout(800); // galeria pula para "Compartilhar" após entregar
  await H.irParaPasso(page, 'Entregar');
  await expect(page.locator('#wizardContent')).toContainText('Sessão Entregue', { timeout: 8000 });

  // Arquiva: clique → aviso de download pendente → prosseguir → confirmar → prompt do link externo
  await H.esconderPainelUpload(page);
  await page.locator('#wizardContent button', { hasText: /Arquivar/i }).click();
  await expect(page.locator('#dl-warn-modal')).toBeVisible({ timeout: 8000 });
  page.once('dialog', (d) => d.accept('https://drive.google.com/e2e-archive')); // prompt do link externo
  await page.locator('#dl-warn-modal button', { hasText: /Arquivar mesmo assim/i }).click();
  await page.locator('#confirmOk').click(); // showConfirm "Arquivar"

  // O wizard troca para a tela de arquivada (badge + card de armazenamento externo)
  await expect(page.locator('#wizardContent')).toContainText('Sessão arquivada', { timeout: 10000 });
  await expect(page.locator('#wizardContent')).toContainText('Armazenamento externo');
  await expect(page.locator('#wizardContent')).toContainText('drive.google.com/e2e-archive');

  await H.fecharWizard(page);
  await H.deletarSessao(page, name);
});

test('Deletar todas as fotos — exclui tudo do servidor (galeria não entregue, sem aviso)', async ({ page, context }) => {
  test.setTimeout(120000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await H.loginAdmin(page);
  await H.limparSessoesDeTeste(page);

  const { name } = await galeriaComRetencao(page);

  // Sem entrega → `_confirmWithDownloadCheck` vai direto para a confirmação (sem o modal de aviso).
  await H.esconderPainelUpload(page);
  await page.locator('#wizardContent button', { hasText: /Deletar todas as fotos/i }).click();
  await page.locator('#confirmOk').click(); // showConfirm "Deletar permanentemente"

  // delete-photos também seta archivedAt → tela de arquivada, sem link externo.
  await expect(page.locator('#wizardContent')).toContainText('Sessão arquivada', { timeout: 10000 });
  await expect(page.locator('#wizardContent')).toContainText('Sem link externo cadastrado', { timeout: 5000 });

  await H.fecharWizard(page);
  await H.deletarSessao(page, name);
});
