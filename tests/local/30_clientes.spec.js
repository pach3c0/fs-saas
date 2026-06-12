// Módulo Clientes (CRM) — cobertura exaustiva: listagem, busca, filtros (aniversariantes, tipo evento),
// criação, edição, deleção unitária/em massa, timeline e reativações.

const { test, expect } = require('@playwright/test');
const H = require('./helpers');

// Helper interno para acessar a aba de clientes e aguardar carregar
async function irParaClientes(page) {
  await page.evaluate(() => window.switchTab('clientes'));
  await expect(page.locator('#clientesLista')).toBeVisible({ timeout: 10000 });
}

// Helper para limpar clientes criados nos testes
async function limparClientesDeTeste(page) {
  await irParaClientes(page);
  // Garante que lista carregou
  await page.waitForTimeout(1000);
  let count = await page.locator('.cliente-item', { hasText: H.PREFIXO }).count();
  while (count > 0) {
    // Vamos usar a deleção em massa para limpar rápido
    const checkboxes = page.locator('.cliente-item', { hasText: H.PREFIXO }).locator('.check[data-select-cliente]');
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check({ force: true });
    }
    await page.locator('#btnBulkDeleteClientes').click();
    await page.locator('#confirmOk').click();
    await page.waitForTimeout(1500); // Aguarda sumir
    count = await page.locator('.cliente-item', { hasText: H.PREFIXO }).count();
  }
}

test.describe('Módulo Clientes (CRM)', () => {
  test.beforeEach(async ({ page, context }) => {
    test.setTimeout(90000);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await H.loginAdmin(page);
    await limparClientesDeTeste(page);
  });

  test('1. Criação de Cliente com todos os campos e listagem correta', async ({ page }) => {
    await irParaClientes(page);
    
    const clientName = `${H.PREFIXO} Novo ${Date.now()}`;
    const clientEmail = `novo${Date.now()}@teste.com`;
    
    await page.locator('#btnNovoCliente').click();
    await expect(page.locator('#modalCliente')).toBeVisible({ timeout: 5000 });
    
    await page.locator('#clienteNome').fill(clientName);
    await page.locator('#clienteEmail').fill(clientEmail);
    await page.locator('#clienteTelefone').fill('11988887777');
    await page.locator('#clienteCpf').fill('12345678901');
    await page.locator('#clienteBirthDate').fill('1990-05-15');
    await page.locator('#clienteLastEventType').selectOption('Casamento');
    await page.locator('#clienteTags').fill('VIP, Noiva');
    await page.locator('#clienteNotas').fill('Cliente gerado via E2E');
    
    // Configura reativação para amanhã
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    await page.locator('#clienteNextContactDate').fill(amanha.toISOString().split('T')[0]);

    await page.locator('#btnSalvarCliente').click();
    await expect(page.locator('#modalCliente')).not.toBeVisible({ timeout: 5000 });
    
    // Verifica renderização no card
    const card = page.locator('.cliente-item', { hasText: clientName }).first();
    await expect(card).toBeVisible({ timeout: 5000 });
    await expect(card).toContainText(clientEmail);
    await expect(card).toContainText('11988887777');
    await expect(card).toContainText('Casamento'); // badge de evento
    await expect(card).toContainText('VIP'); // badge de tag
    await expect(card).toContainText('Noiva'); // badge de tag
    await expect(card).toContainText('15/Mai'); // aniversário
    await expect(card).toContainText('Cliente gerado via E2E'); // notas
    await expect(card.locator('span[title="Reativação agendada — e-mail será enviado automaticamente nesta data"]')).toBeVisible();
  });

  test('2. Edição de Cliente atualiza a lista', async ({ page }) => {
    await irParaClientes(page);
    
    const clientName = `${H.PREFIXO} Edit ${Date.now()}`;
    
    // Cria um rápido
    await page.locator('#btnNovoCliente').click();
    await page.locator('#clienteNome').fill(clientName);
    await page.locator('#clienteEmail').fill('edit@teste.com');
    await page.locator('#clienteTelefone').fill('1100000000');
    await page.locator('#clienteCpf').fill('00000000000');
    await page.locator('#btnSalvarCliente').click();
    
    const card = page.locator('.cliente-item', { hasText: clientName }).first();
    await expect(card).toBeVisible({ timeout: 5000 });
    
    // Edita
    await card.locator('button', { hasText: 'Editar' }).click();
    await expect(page.locator('#modalCliente')).toBeVisible({ timeout: 5000 });
    
    const novoNome = `${clientName} Atualizado`;
    await page.locator('#clienteNome').fill(novoNome);
    await page.locator('#clienteLastEventType').selectOption('Ensaio');
    await page.locator('#btnSalvarCliente').click();
    await expect(page.locator('#modalCliente')).not.toBeVisible({ timeout: 5000 });
    
    // Verifica atualização no DOM
    const cardEditado = page.locator('.cliente-item', { hasText: novoNome }).first();
    await expect(cardEditado).toBeVisible({ timeout: 5000 });
    await expect(cardEditado).toContainText('Ensaio');
  });

  test('3. Busca Textual (Nome, Email, Telefone)', async ({ page }) => {
    await irParaClientes(page);
    
    const unique = Date.now();
    const nome = `${H.PREFIXO} Busca ${unique}`;
    const email = `busca${unique}@teste.com`;
    const fone = `119${String(unique).slice(-8)}`;
    
    // Cria
    await page.locator('#btnNovoCliente').click();
    await page.locator('#clienteNome').fill(nome);
    await page.locator('#clienteEmail').fill(email);
    await page.locator('#clienteTelefone').fill(fone);
    await page.locator('#clienteCpf').fill('00000000000');
    await page.locator('#btnSalvarCliente').click();
    
    await expect(page.locator('.cliente-item', { hasText: nome })).toBeVisible({ timeout: 5000 });
    
    // Busca nome
    await page.locator('#searchClientes').fill(unique.toString());
    await page.waitForTimeout(500); // aguarda debounce manual se existir ou DOM update
    await expect(page.locator('.cliente-item')).toHaveCount(1);
    await expect(page.locator('.cliente-item').first()).toContainText(nome);
    
    // Busca email
    await page.locator('#searchClientes').fill(email);
    await page.waitForTimeout(500);
    await expect(page.locator('.cliente-item')).toHaveCount(1);
    
    // Busca falha
    await page.locator('#searchClientes').fill('NenhumClienteComEsseNomeAbsurdo');
    await page.waitForTimeout(500);
    await expect(page.locator('.cliente-item')).toHaveCount(0);
    await expect(page.locator('#clientesLista')).toContainText('Nenhum cliente encontrado');
    
    // Limpa busca
    await page.locator('#searchClientes').fill('');
    await page.waitForTimeout(500);
    const c1 = await page.locator('.cliente-item').count();
    expect(c1).toBeGreaterThan(0);
  });

  test('4. Filtro de Aniversariantes do Mês', async ({ page }) => {
    await irParaClientes(page);
    
    const hoje = new Date();
    const nomeAniv = `${H.PREFIXO} Aniversariante ${Date.now()}`;
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    
    await page.locator('#btnNovoCliente').click();
    await page.locator('#clienteNome').fill(nomeAniv);
    await page.locator('#clienteEmail').fill(`aniv${Date.now()}@teste.com`);
    await page.locator('#clienteTelefone').fill('1100000000');
    await page.locator('#clienteCpf').fill('00000000000');
    await page.locator('#clienteBirthDate').fill(`1990-${mesAtual}-15`);
    await page.locator('#btnSalvarCliente').click();
    
    await expect(page.locator('.cliente-item', { hasText: nomeAniv })).toBeVisible({ timeout: 5000 });
    
    // Ativa filtro
    await page.locator('#btnFiltroAniversariantes').click();
    await page.waitForTimeout(500);
    
    // O cliente criado deve estar visível
    const cards = page.locator('.cliente-item');
    const contagem = await cards.count();
    expect(contagem).toBeGreaterThan(0);
    
    // Todos os cards visíveis devem ter a badge de aniversário
    for(let i=0; i<contagem; i++) {
      await expect(cards.nth(i)).toContainText('Aniversário em');
    }
    
    // Desativa filtro
    await page.locator('#btnFiltroAniversariantes').click();
    await page.waitForTimeout(500);
  });

  test('5. Filtro por Tipo de Evento', async ({ page }) => {
    await irParaClientes(page);
    
    const eventoUnico = `EventoE2E-${Date.now()}`;
    const nome = `${H.PREFIXO} Evt ${Date.now()}`;
    
    await page.locator('#btnNovoCliente').click();
    await page.locator('#clienteNome').fill(nome);
    await page.locator('#clienteEmail').fill(`evt${Date.now()}@teste.com`);
    await page.locator('#clienteTelefone').fill('1100000000');
    await page.locator('#clienteCpf').fill('00000000000');
    await page.locator('#clienteLastEventType').selectOption('Corporativo');
    await page.locator('#btnSalvarCliente').click();
    
    await expect(page.locator('.cliente-item', { hasText: nome })).toBeVisible({ timeout: 5000 });
    
    // Seleciona no select
    await page.locator('#filtroTipoEvento').selectOption('Corporativo');
    await page.waitForTimeout(500);
    
    // Deve ter exatos 1 card
    await expect(page.locator('.cliente-item')).toHaveCount(1);
    await expect(page.locator('.cliente-item').first()).toContainText(nome);
    
    // Volta pra todos
    await page.locator('#filtroTipoEvento').selectOption('');
    await page.waitForTimeout(500);
    const c2 = await page.locator('.cliente-item').count();
    expect(c2).toBeGreaterThan(1);
  });

  test('6. Ver Timeline do Cliente', async ({ page }) => {
    await irParaClientes(page);
    
    const nome = `${H.PREFIXO} Timeline ${Date.now()}`;
    
    await page.locator('#btnNovoCliente').click();
    await page.locator('#clienteNome').fill(nome);
    await page.locator('#clienteEmail').fill(`time${Date.now()}@teste.com`);
    await page.locator('#clienteTelefone').fill('1100000000');
    await page.locator('#clienteCpf').fill('00000000000');
    await page.locator('#btnSalvarCliente').click();
    
    const card = page.locator('.cliente-item', { hasText: nome }).first();
    await expect(card).toBeVisible({ timeout: 5000 });
    
    await card.locator('button', { hasText: 'Ver Timeline' }).click();
    await expect(page.locator('#modalTimelineCliente')).toBeVisible({ timeout: 5000 });
    
    // Verifica se carregou timeline (no minimo "Cliente cadastrado no sistema")
    await expect(page.locator('#timelineClienteLista')).toContainText('Cliente cadastrado');
    
    await page.locator('#btnFecharTimeline').click();
    await expect(page.locator('#modalTimelineCliente')).not.toBeVisible({ timeout: 5000 });
  });

  test('7. Seleção, Select All e Exclusão em Massa', async ({ page }) => {
    await irParaClientes(page);
    
    // Cria 2 clientes
    const nome1 = `${H.PREFIXO} Bulk1 ${Date.now()}`;
    const nome2 = `${H.PREFIXO} Bulk2 ${Date.now()}`;
    
    for (const nome of [nome1, nome2]) {
      await page.locator('#btnNovoCliente').click();
      await page.locator('#clienteNome').fill(nome);
      await page.locator('#clienteEmail').fill(`bulk${Date.now()}@teste.com`);
      await page.locator('#clienteTelefone').fill('1100000000');
      await page.locator('#clienteCpf').fill('00000000000');
      await page.locator('#btnSalvarCliente').click();
      await expect(page.locator('.cliente-item', { hasText: nome })).toBeVisible({ timeout: 5000 });
    }
    
    // Filtra pra eles pra ficar mais facil
    await page.locator('#searchClientes').fill(`${H.PREFIXO} Bulk`);
    await page.waitForTimeout(500);
    await expect(page.locator('.cliente-item')).toHaveCount(2);
    
    // Check the first client to reveal the bulk actions bar
    await page.locator('.cliente-item', { hasText: nome1 }).locator('.check[data-select-cliente]').check({ force: true });
    await expect(page.locator('#bulkActionsBarClientes')).toBeVisible();

    // Select All
    await page.locator('#selectAllClientes').check({ force: true });
    await expect(page.locator('#selectedClientesCount')).toContainText('2 selecionados');
    
    // Deleta em massa
    await page.locator('#btnBulkDeleteClientes').click();
    await expect(page.locator('#confirm-modal')).toBeVisible();
    await page.locator('#confirmOk').click();
    
    // Espera sumir
    await expect(page.locator('.cliente-item')).toHaveCount(0);
    await expect(page.locator('#bulkActionsBarClientes')).not.toBeVisible();
    
    // Limpa a busca e confere se nao estao la
    await page.locator('#searchClientes').fill('');
    await page.waitForTimeout(500);
    await expect(page.locator('.cliente-item', { hasText: nome1 })).not.toBeVisible();
  });

  test('8. Disparo de Reativação', async ({ page }) => {
    await irParaClientes(page);
    
    // intercept API call para não disparar emails reais e só confirmar
    await page.route('**/api/sales/trigger-reactivation', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sent: 1, success: true }) });
    });
    
    await page.locator('#btnDispararReativacao').click();
    
    // Pergunta sobre incluir fotos
    await expect(page.locator('#confirm-modal')).toBeVisible();
    await page.locator('#confirmOk').click(); // Sim, incluir fotos
    
    // Verifica toast de sucesso
    await expect(page.locator('#toast-container')).toContainText('de reativação enviado');
    await page.unroute('**/api/sales/trigger-reactivation');
  });

  test('9. Exclusão Unitária', async ({ page }) => {
    await irParaClientes(page);
    
    const nome = `${H.PREFIXO} Del ${Date.now()}`;
    
    await page.locator('#btnNovoCliente').click();
    await page.locator('#clienteNome').fill(nome);
    await page.locator('#clienteEmail').fill(`del${Date.now()}@teste.com`);
    await page.locator('#clienteTelefone').fill('1100000000');
    await page.locator('#clienteCpf').fill('00000000000');
    await page.locator('#btnSalvarCliente').click();
    
    const card = page.locator('.cliente-item', { hasText: nome }).first();
    await expect(card).toBeVisible({ timeout: 5000 });
    
    await card.locator('button', { hasText: 'Excluir' }).click();
    await expect(page.locator('#confirm-modal')).toBeVisible();
    await page.locator('#confirmOk').click();
    
    await expect(card).not.toBeVisible({ timeout: 5000 });
  });

});
