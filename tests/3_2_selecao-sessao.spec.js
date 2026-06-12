const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const ADMIN_EMAIL = 'admin@cliquezoom.com.br';
const ADMIN_PASSWORD = '055360';
const SESSION_NAME = `test-e2e-selecao-${Date.now()}`;
const FOTO_FIXTURE = path.join(__dirname, 'fixtures/foto-teste.jpg');
const FOTO_FIXTURE_1 = path.join(__dirname, 'fixtures/foto-teste-1.jpg');
const FOTO_FIXTURE_2 = path.join(__dirname, 'fixtures/foto-teste-2.jpg');
const FOTO_FIXTURE_3 = path.join(__dirname, 'fixtures/foto-teste-3.jpg');

if (!fs.existsSync(FOTO_FIXTURE_1)) fs.copyFileSync(FOTO_FIXTURE, FOTO_FIXTURE_1);
if (!fs.existsSync(FOTO_FIXTURE_2)) fs.copyFileSync(FOTO_FIXTURE, FOTO_FIXTURE_2);
if (!fs.existsSync(FOTO_FIXTURE_3)) fs.copyFileSync(FOTO_FIXTURE, FOTO_FIXTURE_3);

async function loginAdmin(page) {
  await page.goto('/admin');
  await page.locator('#adminEmail').fill(ADMIN_EMAIL);
  await page.locator('#adminPassword').fill(ADMIN_PASSWORD);
  await page.locator('#loginSubmitBtn').click();
  await expect(page.locator('#adminPanel')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('.dashboard-stats, #dashboardContent, [data-tab="sessoes"]', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.switchTab('sessoes'));
  await page.waitForSelector('#sessionsList', { timeout: 20000 });
}

// O painel global de upload (#upload-panel-root) fica fixo na tela após os uploads
// e intercepta cliques na lista de sessões. Escondê-lo antes de interagir com a lista.
async function esconderPainelUpload(page) {
  await page.evaluate(() => {
    window.globalUploadPanel?.hide?.();
    const root = document.getElementById('upload-panel-root');
    if (root) root.style.display = 'none';
  });
}

// Remove sessões de teste residuais (prefixo "test-e2e-selecao-") deixadas por
// execuções anteriores que falharam antes da limpeza. Mantém o ambiente limpo
// e idempotente. Best-effort: não falha o teste se algo der errado.
async function limparSessoesDeTeste(page) {
  await esconderPainelUpload(page);
  for (let i = 0; i < 30; i++) {
    const card = page.locator('#sessionsList > div').filter({ hasText: 'test-e2e-selecao-' }).first();
    if (await card.count() === 0) break;
    const delBtn = card.locator('button[title="Deletar sessão"]');
    if (await delBtn.count() === 0) break;
    await delBtn.click();
    await page.locator('#confirmOk').click();
    await page.waitForTimeout(1200); // aguarda re-render da lista
  }
}

test('Sessões — Fluxo completo de seleção E2E', async ({ page, browser }) => {
  test.setTimeout(180000); // 3 minutos para fluxo completo com múltiplos uploads
  // 1. ADMIN CRIAR SESSÃO
  await loginAdmin(page);
  await limparSessoesDeTeste(page); // remove órfãs de execuções anteriores

  await page.locator('#addSessionBtn').click();
  await expect(page.locator('#newSessionModal')).toBeVisible({ timeout: 5000 });

  await page.locator('#sessionMode').selectOption('selection');
  await page.waitForTimeout(500); // Aguarda fade do wrapper

  await page.locator('#sessionName').fill(SESSION_NAME);
  // Datas e Prazos
  const dataEvento = new Date();
  dataEvento.setDate(dataEvento.getDate() - 10);
  const strDataEvento = dataEvento.toISOString().split('T')[0];
  await page.locator('#sessionDate').fill(strDataEvento);
  
  const prazoSelecao = new Date();
  prazoSelecao.setDate(prazoSelecao.getDate() + 10);
  const strPrazoSelecao = prazoSelecao.toISOString().split('T')[0] + 'T23:59';
  await page.locator('#sessionDeadline').fill(strPrazoSelecao);

  // Upload de Foto de Capa
  await page.locator('#coverInput').setInputFiles(FOTO_FIXTURE);
  await expect(page.locator('#coverPreview img')).toBeVisible({ timeout: 10000 }); // Aguarda preview

  // Limite e Preço Extra
  await page.locator('#sessionLimit').fill('2'); // Pacote de 2 fotos
  await page.locator('#sessionExtraPrice').fill('30'); // R$ 30 por foto extra
  await page.locator('#sessionAllowExtraPurchase').check();

  // Resolução
  await page.locator('#sessionResolution').selectOption('1200');

  // Opções Avançadas
  await page.locator('#sessionCommentsEnabled').check();
  await page.locator('#sessionSalesAutomation').check();
  // Preencher e criar novo cliente
  await page.locator('#clientSearchInput').fill('Cliente Teste E2E');
  await expect(page.locator('#clientSearchDropdown')).toBeVisible({ timeout: 5000 });
  await page.locator('#clientSearchDropdown div').last().click();

  await expect(page.locator('#modalCliente')).toBeVisible({ timeout: 5000 });
  await page.locator('#clienteEmail').fill(`test${Date.now()}@e2e.com`);
  await page.locator('#clienteTelefone').fill('11999999999');
  await page.locator('#clienteCpf').fill('00000000000');
  await page.locator('#btnSalvarCliente').click();
  await expect(page.locator('#modalCliente')).not.toBeVisible({ timeout: 10000 });

  const responsePromise = page.waitForResponse(response => 
    response.url().includes('/api/sessions') && response.request().method() === 'POST'
  );
  
  await page.locator('#confirmNewSession').click();
  const response = await responsePromise;
  const data = await response.json();
  const accessCode = data.session.accessCode;

  await expect(page.locator('#sessionsList')).toContainText(SESSION_NAME, { timeout: 10000 });

  // 2. ADMIN FAZER UPLOAD DE FOTO
  const card = page.locator('#sessionsList').locator('div', { hasText: SESSION_NAME }).first();
  await card.click(); // Abre o Wizard da Sessão

  await expect(page.locator('#sessionWizardModal')).toBeVisible({ timeout: 5000 });

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('button', { hasText: '+ Subir fotos' }).click(),
  ]);
  await fileChooser.setFiles([FOTO_FIXTURE_1, FOTO_FIXTURE_2, FOTO_FIXTURE_3]);

  // O grid de fotos fica dentro do #wizardContent
  const gridSlot = page.locator('#wizardContent');
  await expect(gridSlot.locator('div[style*="aspect-ratio"]')).toHaveCount(3, { timeout: 30000 });

  // Clicar em "Concluí upload" no Wizard
  await page.locator('button', { hasText: '✓ Concluí upload' }).click();
  
  // Confirmar no alerta
  await page.locator('button', { hasText: 'Concluir' }).click();

  // Clicar no passo "Compartilhar" na barra lateral do wizard
  await page.locator('#wizardSidebar button', { hasText: 'Compartilhar' }).click();

  // Agora ele avança para o Passo 2: Compartilhar
  await expect(page.locator('h2', { hasText: 'Compartilhar' })).toBeVisible({ timeout: 10000 });

  // Customizar mensagens
  const textareas = page.locator('#wizardContent textarea');
  // textareas.nth(0) -> Email, textareas.nth(1) -> WhatsApp
  await textareas.nth(0).fill('Mensagem de email customizada E2E.');
  await textareas.nth(1).fill('Olá! Suas fotos estão prontas para seleção.');

  // Salvar customizações (tem um debounce ou blur que salva, então clicamos fora ou forçamos blur)
  await textareas.nth(1).blur();
  await page.waitForTimeout(1000);

  // Clica em 'Copiar código' para registrar que foi compartilhado e destravar o próximo passo
  await page.locator('button', { hasText: 'Copiar código' }).click();
  await expect(page.locator('button', { hasText: '✓ Copiado!' })).toBeVisible({ timeout: 5000 });

  // Opcional: clicar em 'Próximo: Acompanhar seleção'
  await page.locator('button', { hasText: /Próximo: Acompanhar seleção/i }).click();

  // Fechar o modal do wizard
  await page.locator('#wizardHeader').locator('button[title="Fechar"]').click();
  await expect(page.locator('#sessionWizardModal')).not.toBeVisible({ timeout: 5000 });

  // 3. CLIENTE ACESSAR GALERIA E SELECIONAR FOTOS
  const clientContext = await browser.newContext();
  const clientPage = await clientContext.newPage();
  
  await clientPage.goto('https://cliquezoom-admin.cliquezoom.com.br/cliente/');
  await expect(clientPage.locator('#loginSection')).toBeVisible({ timeout: 10000 });
  
  await clientPage.locator('#accessCode').fill(accessCode);
  await clientPage.locator('#loginBtn').click();
  
  // Esperar o `#gallerySection` aparecer ou capturar erro
  await Promise.race([
    expect(clientPage.locator('#gallerySection')).toBeVisible({ timeout: 15000 }),
    clientPage.locator('#errorMessage').waitFor({ state: 'visible', timeout: 15000 }).then(async () => {
      const errText = await clientPage.locator('#errorMessage').innerText();
      throw new Error(`Login falhou na página do cliente: ${errText}`);
    })
  ]);
  
  // Clica no coração de todas as fotos (3)
  const heartBtns = clientPage.locator('.photo-heart');
  await expect(heartBtns).toHaveCount(3, { timeout: 15000 });
  for (let i = 0; i < 3; i++) {
    await heartBtns.nth(i).click();
    await clientPage.waitForTimeout(300); // pequeno delay para a animação do like
  }
  
  // Verifica contador e valor extra na barra flutuante
  const extraInfo = clientPage.locator('#extraInfo');
  await expect(extraInfo).toContainText('+1 fotos extras');
  await expect(extraInfo).toContainText('R$ 30,00');

  // Clica em Finalizar Seleção
  await clientPage.locator('#submitBtn').click();
  
  // Confirma modal de finalização
  const gcConfirm = clientPage.locator('#gcConfirm');
  await expect(gcConfirm).toBeVisible({ timeout: 5000 });
  await gcConfirm.click();

  // Aguarda tela de sucesso
  await expect(clientPage.locator('#statusScreen')).toBeVisible({ timeout: 10000 });
  await expect(clientPage.locator('.status-title')).toContainText('Seleção Enviada');

  await clientContext.close();

  // 5. ADMIN VALIDAR RETORNO E UPLOAD DE EDITADAS
  await page.bringToFront();
  await page.evaluate(() => {
    if (window.loadTab) window.loadTab('sessoes');
    else if (window.switchTab) window.switchTab('sessoes');
  });
  await page.waitForTimeout(2000); // aguarda os dados recarregarem
  
  // Abrir a sessão novamente
  const cardParaValidar = page.locator('#sessionsList').locator('div', { hasText: SESSION_NAME }).first();
  await cardParaValidar.click();
  await expect(page.locator('#sessionWizardModal')).toBeVisible({ timeout: 5000 });

  // Ir para Passo 4 (Acompanhar) para checar o status e valor extra
  await page.locator('#wizardSidebar button', { hasText: 'Acompanhar' }).click();
  await expect(page.locator('#wizardContent')).toContainText('3 / 2', { timeout: 15000 }); // Valida 3 selecionadas de limite 2
  await expect(page.locator('#wizardContent')).toContainText('Finalizada'); // Valida status finalizada

  // Ir para Passo 5 (Editadas)
  await page.locator('#wizardSidebar button', { hasText: 'Editadas' }).click();
  await expect(page.locator('h2', { hasText: 'Editadas' })).toBeVisible({ timeout: 5000 });
  
  // Fazer upload das editadas
  const [fileChooserEdited] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#wizardContent button', { hasText: /\+ Subir fotos editadas|\+ Subir mais editadas/i }).click(),
  ]);
  await fileChooserEdited.setFiles([FOTO_FIXTURE_1]);
  await expect(page.locator('#wizardContent')).toContainText('1 de 3 fotos editadas enviadas', { timeout: 20000 });

  const [fileChooserEdited2] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#wizardContent button', { hasText: /\+ Subir fotos editadas|\+ Subir mais editadas/i }).click(),
  ]);
  await fileChooserEdited2.setFiles([FOTO_FIXTURE_2]);
  await expect(page.locator('#wizardContent')).toContainText('2 de 3 fotos editadas enviadas', { timeout: 20000 });

  const [fileChooserEdited3] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#wizardContent button', { hasText: /\+ Subir fotos editadas|\+ Subir mais editadas/i }).click(),
  ]);
  await fileChooserEdited3.setFiles([FOTO_FIXTURE_3]);

  // Aguardar upload das editadas terminar (modal de sucesso ou barra preenchida)
  await expect(page.locator('#wizardContent')).toContainText('Todas as fotos editadas enviadas', { timeout: 30000 });

  // 6. ADMIN: ENTREGA (Passo 6)
  await page.locator('#wizardSidebar button', { hasText: 'Entregar' }).click();
  await expect(page.locator('h2', { hasText: 'Entregar' })).toBeVisible({ timeout: 5000 });
  
  // Clicar em Liberar Download
  await page.locator('button', { hasText: /Concluir Entrega|Liberar|Entregar e notificar/i }).click();
  // Aguardar confirmação se houver (modal js)
  try {
    await page.locator('#confirmOk').click({ timeout: 2000 });
  } catch (e) { /* ignore se não houver alerta */ }
  
  await expect(page.locator('#wizardContent')).toContainText('Sessão Entregue', { timeout: 10000 });

  // Fechar wizard
  await page.locator('#wizardHeader').locator('button[title="Fechar"]').click();

  // 7. CLIENTE: ACESSAR E BAIXAR
  const finalContext = await browser.newContext();
  const finalPage = await finalContext.newPage();
  await finalPage.goto('https://cliquezoom-admin.cliquezoom.com.br/cliente/');
  await expect(finalPage.locator('#loginSection')).toBeVisible({ timeout: 10000 });
  
  await finalPage.locator('#accessCode').fill(accessCode);
  await finalPage.locator('#loginBtn').click();
  
  // Deve ver as fotos entregues com botões de download
  await expect(finalPage.locator('#gallerySection')).toBeVisible({ timeout: 15000 });
  const downloadBtns = finalPage.locator('.photo-download-overlay');
  await expect(downloadBtns).toHaveCount(3, { timeout: 10000 });

  await finalContext.close();

  // 8. ADMIN DELETAR SESSÃO PARA LIMPEZA
  await page.bringToFront();
  await page.evaluate(() => {
    if (window.loadTab) window.loadTab('sessoes');
    else if (window.switchTab) window.switchTab('sessoes');
  });
  await page.waitForTimeout(2000); // aguarda recarregar
  await esconderPainelUpload(page); // painel de upload intercepta cliques na lista
  const deleteBtn = page.locator('#sessionsList > div').filter({ hasText: SESSION_NAME }).first().locator('button[title="Deletar sessão"]');
  await deleteBtn.click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#sessionsList')).not.toContainText(SESSION_NAME, { timeout: 10000 });
});
