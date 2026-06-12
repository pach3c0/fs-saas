// Mensagens — cobertura exaustiva: contatos do site (lista, badge de não lidas, expandir+marcar
// lida, parse nome/email/assunto, XSS, excluir/cancelar, estado vazio) + depoimentos pendentes
// (submissão pública, aprovar → publica no site, rejeitar, rating clamp, singular/plural) +
// validações públicas (400 e honeypot). Semeia via endpoints públicos (?_tenant=teste).
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

const TENANT = 'teste';
const PFX = 'test-e2e-msg-';

async function seedContato(request, body) {
  const r = await request.post(`/api/site/contact?_tenant=${TENANT}`, { data: body });
  return r.status();
}
async function seedDepoimento(request, body) {
  const r = await request.post(`/api/site/depoimento?_tenant=${TENANT}`, { data: body });
  return r.status();
}

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

// Limpa TODO resíduo do módulo no DB dev: notificações de contato/depoimento (todas — deixa a
// contagem do badge determinística), depoimentos pendentes e depoimentos de teste já publicados.
async function limparMensagens(page) {
  const nd = await api(page, 'GET', '/api/notifications');
  for (const n of nd.json?.notifications || []) {
    if (n.type === 'contact' || n.type === 'depoimento_pendente') {
      await api(page, 'DELETE', `/api/notifications/${n._id}`);
    }
  }
  const pd = await api(page, 'GET', '/api/site/admin/depoimentos-pendentes');
  for (const p of pd.json?.pending || []) {
    await api(page, 'DELETE', `/api/site/admin/depoimentos-pendentes/${p.id}`);
  }
  const cfg = await api(page, 'GET', '/api/site/admin/config');
  const aprovados = cfg.json?.siteContent?.depoimentos || [];
  const semTeste = aprovados.filter((d) => !String(d.name || '').includes(PFX));
  if (semTeste.length !== aprovados.length) {
    await api(page, 'PUT', '/api/site/admin/config', { siteContent: { depoimentos: semTeste } });
  }
}

async function irParaMensagens(page) {
  await H.esconderPainelUpload(page);
  await page.evaluate(() => window.switchTab('mensagens'));
  await expect(page.locator('#msgLista')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#msgLista')).not.toContainText('Carregando', { timeout: 10000 });
}

const cardMsg = (page, texto) => page.locator('#msgLista > div', { hasText: texto }).first();
const badge = (page) => page.locator('#msgUnreadBadge');

// ── Contatos do site ───────────────────────────────────────────────────────

test('Estado vazio — sem contatos nem pendentes: empty state, badge oculto', async ({ page }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  // Mock (não-destrutivo) — simula org sem nenhuma mensagem
  await page.route('**/api/notifications', (r) => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ notifications: [] }) })
    : r.continue());
  await page.route('**/api/site/admin/depoimentos-pendentes', (r) => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pending: [] }) })
    : r.continue());

  await irParaMensagens(page);
  await expect(page.locator('#msgLista')).toContainText('Nenhuma mensagem recebida ainda');
  await expect(badge(page)).toBeHidden();
  await expect(page.locator('#pendentesSection')).toBeEmpty();

  await page.unroute('**/api/notifications');
  await page.unroute('**/api/site/admin/depoimentos-pendentes');
});

test('Contato completo na lista: título "nome — assunto", data pt-BR, não-lida com badge', async ({ page, request }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await limparMensagens(page);

  const nome = `${PFX}Maria Contato`;
  expect(await seedContato(request, { nome, email: 'maria@e2e.com', assunto: 'Orçamento casamento', mensagem: 'Quero fotos do meu casamento em outubro.' })).toBe(200);

  await irParaMensagens(page);
  const card = cardMsg(page, nome);
  await expect(card).toBeVisible();
  await expect(card).toContainText(`${nome} — Orçamento casamento`);
  await expect(card).toContainText(/\d{2}\/\d{2}\/\d{4}/); // data formatada pt-BR
  await expect(badge(page)).toHaveText('1 não lida');
  expect(await card.getAttribute('style')).toContain('border-left'); // destaque de não-lida

  await limparMensagens(page);
});

test('Expandir contato: corpo com e-mail (mailto), assunto e mensagem; marca lida e persiste', async ({ page, request }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await limparMensagens(page);

  const nome = `${PFX}Joana Leitura`;
  await seedContato(request, { nome, email: 'joana@e2e.com', assunto: 'Ensaio', mensagem: 'Gostaria de agendar um ensaio.' });

  await irParaMensagens(page);
  const lidaP = page.waitForResponse((r) => /\/api\/notifications\/[a-f0-9]+\/read$/.test(r.url()) && r.request().method() === 'PUT');
  await cardMsg(page, nome).locator('div[onclick^="window._msgToggle"]').click();
  await lidaP;

  const card = cardMsg(page, nome);
  await expect(card).toContainText('E-mail:');
  await expect(card.locator('a[href="mailto:joana@e2e.com"]')).toBeVisible();
  await expect(card).toContainText('Assunto: Ensaio');
  await expect(card).toContainText('Gostaria de agendar um ensaio.');
  await expect(badge(page)).toBeHidden(); // era a única não-lida

  // Persistência: sai e volta à aba — continua lida no servidor
  await page.evaluate(() => window.switchTab('dashboard'));
  await page.waitForTimeout(800);
  await irParaMensagens(page);
  await expect(badge(page)).toBeHidden();
  expect(await cardMsg(page, nome).getAttribute('style')).not.toContain('border-left:3px');

  await limparMensagens(page);
});

test('Contato sem e-mail e sem assunto: título só com o nome, corpo sem linhas extras', async ({ page, request }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await limparMensagens(page);

  const nome = `${PFX}Anonimo Simples`;
  await seedContato(request, { nome, mensagem: 'Mensagem direta sem extras.' });

  await irParaMensagens(page);
  const card = cardMsg(page, nome);
  await expect(card).toBeVisible();
  await expect(card).not.toContainText('—'); // sem assunto no título
  await card.locator('div[onclick^="window._msgToggle"]').click();
  await expect(card).toContainText('Mensagem direta sem extras.');
  await expect(card).not.toContainText('E-mail:');
  await expect(card).not.toContainText('Assunto:');

  await limparMensagens(page);
});

test('Mensagem contendo "—" e ":" não vira assunto falso (parse do corpo)', async ({ page, request }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await limparMensagens(page);

  const nome = `${PFX}Pedro Pontuacao`;
  const mensagem = 'Olá — gostaria de saber: vocês atendem em São Paulo? Valores: a combinar.';
  await seedContato(request, { nome, email: 'pedro@e2e.com', mensagem });

  await irParaMensagens(page);
  const card = cardMsg(page, nome);
  await expect(card).toBeVisible();
  // Sem assunto enviado, o título deve ser SÓ o nome (bug antigo: "gostaria de saber" virava assunto)
  await expect(card.locator('p').first()).toHaveText(nome);
  await card.locator('div[onclick^="window._msgToggle"]').click();
  await expect(card).toContainText(mensagem); // mensagem íntegra, sem corte
  await expect(card).not.toContainText('Assunto:');

  await limparMensagens(page);
});

test('XSS: nome e mensagem com HTML são escapados (nada é injetado no DOM)', async ({ page, request }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await limparMensagens(page);

  const nome = `${PFX}<b>negrito</b>`;
  await seedContato(request, { nome, mensagem: 'Teste <img src=x onerror="window.__xss=1"> de injeção.' });

  await irParaMensagens(page);
  const card = cardMsg(page, 'negrito');
  await expect(card).toBeVisible();
  await expect(card).toContainText('<b>negrito</b>'); // a tag aparece como TEXTO
  await card.locator('div[onclick^="window._msgToggle"]').click();
  await expect(card).toContainText('<img src=x');
  expect(await page.locator('#msgLista b').count()).toBe(0);
  expect(await page.locator('#msgLista img').count()).toBe(0);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();

  await limparMensagens(page);
});

test('Múltiplos contatos: badge plural "2 não lidas" → ler uma → "1 não lida"', async ({ page, request }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await limparMensagens(page);

  await seedContato(request, { nome: `${PFX}Plural Um`, mensagem: 'Primeira mensagem.' });
  await seedContato(request, { nome: `${PFX}Plural Dois`, mensagem: 'Segunda mensagem.' });

  await irParaMensagens(page);
  await expect(badge(page)).toHaveText('2 não lidas');

  const lidaP = page.waitForResponse((r) => /\/api\/notifications\/[a-f0-9]+\/read$/.test(r.url()));
  await cardMsg(page, 'Plural Um').locator('div[onclick^="window._msgToggle"]').click();
  await lidaP;
  await expect(badge(page)).toHaveText('1 não lida');

  await limparMensagens(page);
});

test('Excluir contato: cancelar mantém; confirmar remove; última excluída → empty state', async ({ page, request }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await limparMensagens(page);

  const nome = `${PFX}Para Excluir`;
  await seedContato(request, { nome, mensagem: 'Me apague.' });

  await irParaMensagens(page);
  await expect(cardMsg(page, nome)).toBeVisible();

  // Cancelar exclusão → mensagem permanece
  await cardMsg(page, nome).locator('button[title="Excluir"]').click();
  await page.locator('#confirmCancel').click();
  await expect(cardMsg(page, nome)).toBeVisible();

  // Confirmar exclusão → some + empty state (era a única) + badge oculto
  const delP = page.waitForResponse((r) => /\/api\/notifications\/[a-f0-9]+$/.test(r.url()) && r.request().method() === 'DELETE');
  await cardMsg(page, nome).locator('button[title="Excluir"]').click();
  await page.locator('#confirmOk').click();
  await delP;
  await expect(page.locator('#msgLista')).not.toContainText(nome);
  await expect(page.locator('#msgLista')).toContainText('Nenhuma mensagem recebida ainda');
  await expect(badge(page)).toBeHidden();
});

test('Validações públicas do contato: sem nome → 400; sem mensagem → 400; honeypot → 400 e não cria', async ({ page, request }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await limparMensagens(page);

  expect(await seedContato(request, { mensagem: 'sem nome' })).toBe(400);
  expect(await seedContato(request, { nome: `${PFX}Sem Mensagem` })).toBe(400);
  // Bot que preenche o campo oculto _hp_trap é bloqueado antes de criar a notificação
  expect(await seedContato(request, { nome: `${PFX}Robo`, mensagem: 'spam', _hp_trap: 'gotcha' })).toBe(400);

  await irParaMensagens(page);
  await expect(page.locator('#msgLista')).not.toContainText(`${PFX}Robo`);
  await expect(page.locator('#msgLista')).not.toContainText(`${PFX}Sem Mensagem`);
});

// ── Depoimentos pendentes ──────────────────────────────────────────────────

test('Depoimento público vai pros pendentes (nome, texto, estrelas, e-mail) e NÃO pros contatos', async ({ page, request }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await limparMensagens(page);

  const nome = `${PFX}Cliente Feliz`;
  expect(await seedDepoimento(request, { name: nome, text: 'Fotos maravilhosas, recomendo!', email: 'feliz@e2e.com', rating: 4 })).toBe(200);

  await irParaMensagens(page);
  const sec = page.locator('#pendentesSection');
  await expect(sec).toContainText('1 depoimento aguardando aprovação'); // singular
  await expect(sec).toContainText(nome);
  await expect(sec).toContainText('Fotos maravilhosas, recomendo!');
  await expect(sec).toContainText('⭐⭐⭐⭐ 4/5');
  await expect(sec).toContainText('feliz@e2e.com');
  // A notificação gerada é do tipo depoimento_pendente — não entra em "Contatos recebidos"
  await expect(page.locator('#msgLista')).not.toContainText(nome);

  await limparMensagens(page);
});

test('Aprovar depoimento: sai dos pendentes e é publicado em siteContent.depoimentos', async ({ page, request }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await limparMensagens(page);

  const nome = `${PFX}Aprovada`;
  await seedDepoimento(request, { name: nome, text: 'Experiência incrível do início ao fim.', rating: 5 });

  await irParaMensagens(page);
  await page.locator('#pendentesSection button', { hasText: 'Aprovar' }).click();
  await expect(page.locator('#pendentesSection')).toBeEmpty({ timeout: 10000 });

  // Verifica a publicação no site (mesma fonte que o builder usa)
  const cfg = await api(page, 'GET', '/api/site/admin/config');
  const publicado = (cfg.json?.siteContent?.depoimentos || []).find((d) => d.name === nome);
  expect(publicado).toBeTruthy();
  expect(publicado.text).toBe('Experiência incrível do início ao fim.');
  expect(publicado.rating).toBe(5);

  await limparMensagens(page);
});

test('Rejeitar depoimento: cancelar mantém; confirmar remove e NÃO publica', async ({ page, request }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await limparMensagens(page);

  const nome = `${PFX}Rejeitada`;
  await seedDepoimento(request, { name: nome, text: 'Depoimento que será rejeitado.', rating: 3 });

  await irParaMensagens(page);
  // Cancelar → permanece
  await page.locator('#pendentesSection button', { hasText: 'Rejeitar' }).click();
  await page.locator('#confirmCancel').click();
  await expect(page.locator('#pendentesSection')).toContainText(nome);

  // Confirmar → some e não publica
  await page.locator('#pendentesSection button', { hasText: 'Rejeitar' }).click();
  await page.locator('#confirmOk').click();
  await expect(page.locator('#pendentesSection')).toBeEmpty({ timeout: 10000 });

  const cfg = await api(page, 'GET', '/api/site/admin/config');
  expect((cfg.json?.siteContent?.depoimentos || []).find((d) => d.name === nome)).toBeFalsy();

  await limparMensagens(page);
});

test('Rating fora da faixa é clampado (7→5, -3→1) e a seção de pendentes não quebra', async ({ page, request }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await limparMensagens(page);

  await seedDepoimento(request, { name: `${PFX}Nota Sete`, text: 'Mandei nota 7.', rating: 7 });
  await seedDepoimento(request, { name: `${PFX}Nota Negativa`, text: 'Mandei nota -3.', rating: -3 });

  await irParaMensagens(page);
  const sec = page.locator('#pendentesSection');
  await expect(sec).toContainText('2 depoimentos aguardando aprovação'); // plural
  // Bug antigo: rating -3 fazia '⭐'.repeat(-3) lançar RangeError e a seção inteira sumia
  const cardSete = sec.locator('div', { hasText: 'Nota Sete' }).last();
  await expect(cardSete).toContainText('5/5');
  await expect(cardSete).not.toContainText('7/5');
  const cardNeg = sec.locator('div', { hasText: 'Nota Negativa' }).last();
  await expect(cardNeg).toContainText('1/5');

  await limparMensagens(page);
});

test('Validações públicas do depoimento: sem name → 400; sem text → 400; honeypot → 400', async ({ page, request }) => {
  test.setTimeout(60000);
  await H.loginAdmin(page);
  await limparMensagens(page);

  expect(await seedDepoimento(request, { text: 'sem nome' })).toBe(400);
  expect(await seedDepoimento(request, { name: `${PFX}Sem Texto` })).toBe(400);
  expect(await seedDepoimento(request, { name: `${PFX}Bot`, text: 'spam', _hp_trap: 'x' })).toBe(400);

  await irParaMensagens(page);
  await expect(page.locator('#pendentesSection')).toBeEmpty();
});
