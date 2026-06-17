# Handoff — Programa de Testes Exaustivos + Manuais + Roteiros (2026-06-10)

> ## ⚠️ ATUALIZAÇÃO 2026-06-10 (fim do dia) — RESTART pós-Rhyno
> A integração Rhyno (local/uncommitada) mudou o menu: **Clientes** ocultou, **CRM** virou toggle
> "Vendas Automáticas" dentro de **Marketing**, surgiu a aba **Gestão** (iframe do ERP). O usuário
> pediu **recomeçar do zero**. **Roadmap de execução atual:**
> `~/.claude/plans/ja-fiz-a-integracao-steady-hammock.md` (matriz na ordem do menu atual, riscos de
> regressão, plano de cobertura cheia da Gestão). **Nada foi executado hoje (sem créditos).** Ao
> retomar: comece re-verificando Dashboard + Sessões, depois siga o menu (§7 reescrita abaixo).
> As seções §1–§4 e §6 abaixo seguem **válidas** (método/ambiente/helpers). §5 e §7 foram atualizadas.

> Para a próxima IA continuar **sem perder contexto**. Leia também:
> - **Roadmap atual (restart):** `~/.claude/plans/ja-fiz-a-integracao-steady-hammock.md`
> - **Plano-mãe (método):** `~/.claude/plans/composed-purring-hare.md`
> - **Índice/tracking vivo:** `skills/00_programa-testes.md` (matriz de progresso + log de correções)
> - **Memórias:** `reference_local_e2e_setup`, `project_e2e_sessao_suite`, `project_redesign_sessao_config_panel`, `project_sem_pagamentos`, `project_cleanup_storage_unsafe`, `project_rhyno_integration`, `reference_rhyno_local_poc`.

---

## 1. O que é este programa (objetivo do usuário)
Antes do lançamento comercial pesado (já há uma fotógrafa real usando), percorrer **módulo a módulo,
na ordem do menu do app**, produzindo 3 artefatos por módulo:
1. **Testes E2E exaustivos** (Playwright local) — TODO botão, decisão e estado; lados fotógrafo **e**
   cliente. O propósito é **achar bugs**.
2. **Manual do usuário** in-app (aba Ajuda) refeito p/ UI atual, no **padrão de Sessões**
   (reproduções fiéis em HTML/CSS dos componentes reais — NÃO screenshots), redigido a partir do
   fluxo testado.
3. **Roteiro de vídeo** curto (~60–120s) por fluxo principal.
Tudo arquivado em `skills/`.

## 2. Regras de operação (decididas com o usuário — NÃO renegociar)
- **Exaustivo, sem exceção.** Nada de suíte "enxuta", nem nos módulos de exibição.
- **Teste acha bug → conserto inline na hora (silencioso).** NÃO acumular p/ depois (abre margem p/
  mais bug). Entregar a suíte verde. Registrar o que consertou no log do `00_programa-testes.md`.
  Se a falha for do teste, consertar o teste.
- **Sem escopo novo.** O usuário não prevê pedir features novas. Mudança = correção de bug.
- **Sem commit/push sem pedido explícito.** (CLAUDE.md). Tudo segue local/uncommitado.
- **Idioma:** PT-BR no código, comentários, testes e manuais.

## 3. Ambiente de teste (CRÍTICO — como rodar)
- 🆕 ⚠️ **DEPENDÊNCIA RHYNO (pós-integração):** criar sessão em modo ≠ `multi_selection` cadastra o
  cliente no **Rhyno** (`POST /api/gestao/customers`), que **exige CPF válido**. Logo, **o stack Rhyno
  precisa estar UP** (rhyno-pg + rhyno-api :8000) p/ rodar qualquer teste que use `criarSessao`. O
  helper já gera CPF válido (`gerarCPF()` em `helpers.js`). Confirmado funcionando local em 2026-06-10.
- ⚠️ **O servidor local foi DESLIGADO no fim da sessão de 2026-06-10. Reinicie antes de testar:**
  rodar `npm start` na raiz (de preferência em background). Conferir:
  `curl -s -o /dev/null -w "%{http_code}" http://localhost:3051/admin` → deve dar 301.
- DB dev `cliquezoom-dev`. Login admin: **`teste@teste.com.br` / `055360`**. Org slug: **`teste`**.
  Cliente (galeria): `http://localhost:3051/cliente/?_tenant=teste`.
- Config Playwright local: **`playwright.local.config.js`** (headless, baseURL localhost). Rodar
  SEMPRE com `--workers=1` e **sem `tee`** (tee mascara exit code):
  ```bash
  npx playwright test --config=playwright.local.config.js --workers=1 tests/local/<spec>
  # suíte inteira:
  npx playwright test --config=playwright.local.config.js --workers=1
  ```
- **Pré-requisitos já aplicados no ambiente dev (uncommitados):**
  - `src/server.js` — rate-limiter pula localhost só em dev (`NODE_ENV !== 'production'`). Sem isso,
    logins repetidos dão 429 ao rodar a suíte toda.
  - Org dev `teste`: limites do plano = -1 (maxSessions/maxPhotos) p/ não esbarrar em 403.
  - Redesign de Sessões (modal enxuto + painel de config no wizard) — a suíte local depende dele.
- **Caveats que SEMPRE pegam:**
  - `#upload-panel-root` (painel de upload global) intercepta cliques → chamar
    `H.esconderPainelUpload(page)` antes de clicar em lista/modais.
  - Após navegar para o dashboard, esperar o **card de métrica real** renderizar (sinal de que
    `loadDashboardData` terminou) antes de clicar — senão dá detach race. (ver `irParaDashboard` no
    spec 10.)
  - Não fazer dashboard→aba→dashboard em sequência rápida no mesmo teste (race de re-render):
    1 navegação limpa por teste.

## 4. Helpers reutilizáveis (`tests/local/helpers.js`)
`loginAdmin`, `esconderPainelUpload`, `limparSessoesDeTeste`, `criarSessao` (modal enxuto → deixa o
wizard aberto, retorna `{accessCode, sessionId, name}`), `aplicarConfig`/`setConfig*`
(painel de config tem `data-cfg="<campo>"` em cada controle), `subirFotosWizard`,
`subirFotosSequencial` (ordem determinística), `concluirUpload`, `irParaPasso`, `compartilharCopiarCodigo`,
`subirEditada`, `fecharWizard`, `abrirWizard`, `voltarParaSessoes`, `deletarSessao`,
`configurarMarcaDagua`/`limparMarcaDagua` (PUT `/api/organization/profile`),
`clienteAbrir`/`clienteSelecionar`. Fixtures reais: `FOTO`, `FOTO_1/2/3` (JPEGs 2400×1600 em
`tests/fixtures/`, gerados por `tests/fixtures/gerar-fixtures.js`).
**Reutilizar/expandir esses helpers** em cada novo módulo. Padrão de auth via API dentro de teste:
ler `localStorage.getItem('authToken')` e `fetch` com `Authorization: Bearer`.

## 5. Estado ATUAL (o que está feito)
- **Sessões** ✅ **COMPLETO (3/3)** — 19 testes E2E (`tests/local/0..9_*.spec.js`) **re-verificados 2026-06-10
  (19/19 verdes)** + manual atual + roteiro em `skills/02 §12` (validado). O roteiro JÁ EXISTIA (a matriz
  antiga marcava ❌ por engano).
- **Dashboard** ✅ — **7 testes E2E verdes** (`tests/local/10_dashboard.spec.js`).
  **RE-VERIFICADO no restart pós-Rhyno (2026-06-10):** 2 correções — (a) regressão Rhyno no helper
  `criarSessao` (CPF válido via `gerarCPF()`); (b) spec do onboarding 25%→33% (checklist 4→3 passos).
  **Falta: manual (refazer `MANUAL_MODULES[0]`) + validar roteiro (`skills/01_dashboard.md`)** — deferidos
  por orçamento de crédito.
- **Mensagens** ✅ **COMPLETO (3/3) — 2026-06-11** — 14 testes E2E (`tests/local/11_mensagens.spec.js`),
  manual validado por screenshot, roteiro + doc em `skills/04_mensagens.md`. 2 bugs consertados
  (rating de depoimento sem clamp derrubava a aba com RangeError; `parseMessage` inventava assunto) +
  1 fix de helper (`setConfigCheck` pendurava quando o checkbox já nascia no estado desejado — efeito
  dos `sessionDefaults` da nova aba Configurações).
- **Gestão** ✅ **COMPLETO (3/3) — 2026-06-11** — 7 testes cross-app (`tests/local/12_gestao.spec.js`),
  manual criado+validado, doc+roteiro `skills/05_gestao.md`. Sem bugs de app.
- **Meu Site** ✅ **COMPLETO (3/3) — 2026-06-11** — 21 testes em 5 blocos (`13_meusite-1..5`),
  3 bugs consertados, manual criado+validado, doc+roteiro `skills/06_meu-site.md`.
- **Domínio** ✅ **COMPLETO (3/3) — 2026-06-11** — 16 testes (`tests/local/14_dominio.spec.js`),
  manual criado+validado por screenshot, doc+roteiro `skills/07_dominio.md`. **1 bug crítico**
  (remover domínio via UI nunca funcionou — `showConfirm` não aceita callback `onConfirm`) + 4 fixes
  backend em `src/routes/domains.js` ($unset no DELETE p/ índice unique sparse, normalização,
  dup excluindo a própria org, SSL só em produção). Verify "propagado" usa `cliquezoom.com.br`
  como fixture de DNS real.
- **Integrações** ✅ **COMPLETO (3/3) — 2026-06-11** — 11 testes (`tests/local/15_integracoes.spec.js`),
  manual criado+validado por screenshot, doc+roteiro `skills/08_integracoes.md`. **1 bug de
  SEGURANÇA consertado**: `/api/site/config` (público) vazava `integrations` inteiro
  (accessToken do Pixel + automações/cupons) — agora whitelist em `src/routes/site.js`.
- **Marketing** ✅ **COMPLETO (3/3) — 2026-06-11** — 12 testes (`tests/local/16_marketing.spec.js`)
  cobrindo as 2 views do toggle (Visão Geral + Vendas Automáticas), manual criado+validado
  (light+dark), doc+roteiro `skills/09_marketing.md`. **Sem bugs de app.** 1 fix de **ambiente**:
  tenant `teste` do Rhyno bateu o limite de 200 clientes do plano free → tenant 2 = plano `pro`
  no Postgres (`docker exec rhyno-pg psql -U erp_user -d erp_db`). ⚠️ Se a suíte voltar a falhar
  em `criarSessao` com "Limite do plano", é isso de novo. Pendência registrada: KPI "Clientes
  (30d)" congela pós-Rhyno (conta `Client` do Mongo).
- **Índice** `skills/00_programa-testes.md` criado com a matriz dos 13 módulos + log de correções.
- Suíte do programa: specs `0` a `16` em `tests/local/` — **108/108 verdes em 2026-06-11**
  (Sessões 20 + Dashboard 7 + Mensagens 14 + Gestão 7 + Meu Site 21 + Domínio 16 + Integrações 11
  + Marketing 12). O runner mostra mais 9 de `30_clientes.spec.js` (fora de escopo, mas verdes).
  1 flake conhecido (Estúdio/Salvar Tudo — ver log do 00).

## 6. Bug consertado no Dashboard (exemplo do padrão "acha→conserta")
`admin/js/tabs/dashboard.js:101` — clicar numa "sessão recente" chamava `window.viewSessionPhotos(id)`,
**função inexistente** (o redesign migrou p/ `window.openSessionWizard`). Clique não abria nada.
**Fix:** `window.openSessionWizard?.(id)`. Coberto pelo teste.
**Latente (código morto, NÃO consertado):** `viewSessionPhotos` também é chamada em
`sessoes/actions.js:222,251` e `sessoes/upload.js:90,125` — sem chamadores no novo wizard. Limpar ao
revisitar Sessões.

## 7. PRÓXIMOS PASSOS (ordem exata — REESCRITO p/ o restart pós-Rhyno)
> Clientes e CRM **saíram** da fila (ocultos no menu; CRM agora é toggle dentro de Marketing). A
> ordem abaixo segue o **menu atual**. Detalhes completos no roadmap
> `~/.claude/plans/ja-fiz-a-integracao-steady-hammock.md`.

**Passo 0.** Subir ambiente. CliqueZoom: `npm start` (:3051). Rhyno (necessário p/ criar sessão e p/
Gestão): `open -a Docker` → `docker start rhyno-pg rhyno-api` → `docker exec -d rhyno-api sh -c "uvicorn
main:app --host 0.0.0.0 --port 8000 > /tmp/uvicorn.log 2>&1"`. Docs de tracking já reconciliados.

1. ✅ **Dashboard — CONCLUÍDO (2026-06-10).** 7/7 testes; manual `MANUAL_MODULES[0]` refeito + validado por
   screenshot; roteiro `skills/01` ok. Melhorias: "Espaço Usado" em GB (`formatStorage`), copy
   "estúdio"→"negócio".
2. ✅ **Sessões — CONCLUÍDO (2026-06-10).** 19/19 testes re-verificados; manual atual; roteiro `skills/02 §12`
   validado. A regressão do `criarSessao` (CPF) já estava corrigida e destravou toda a suíte.
3. ✅ **Mensagens — CONCLUÍDO (2026-06-11).** 14/14 testes; manual validado; roteiro `skills/04_mensagens.md`.
4. ✅ **Gestão — CONCLUÍDO (2026-06-11).** 7/7 testes cross-app (SSO/embed/sub-menu + regra OS-catálogo
   API e iframe); manual criado+validado; roteiro+doc `skills/05_gestao.md`. Sem bugs de app.
5. ✅ **Meu Site — CONCLUÍDO (2026-06-11).** 21 testes em 5 blocos (`13_meusite-1..5`); 3 bugs
   consertados (Serviços salvar-vazio, Rodapé e FAQ perdiam estado em re-render); manual criado+validado;
   doc+roteiro `skills/06_meu-site.md`.
6. ✅ **Domínio — CONCLUÍDO (2026-06-11).** 16/16 testes; manual criado+validado; doc+roteiro
   `skills/07_dominio.md`. 1 bug crítico (remover via UI) + 4 fixes backend.
7. ✅ **Integrações — CONCLUÍDO (2026-06-11).** 11/11 testes; manual criado+validado; doc+roteiro
   `skills/08_integracoes.md`. Bug de segurança no `/api/site/config` consertado (vazamento de
   accessToken/automações — whitelist).
8. ✅ **Marketing — CONCLUÍDO (2026-06-11).** 12/12 testes (2 views do toggle); manual validado;
   doc+roteiro `skills/09_marketing.md`. Sem bugs de app (fix de ambiente: plano Rhyno → pro).
9. ✅ **Perfil — CONCLUÍDO (3/3, 2026-06-12).** 15/15 testes (`tests/local/17_perfil.spec.js`);
   manual id `perfil` validado light+dark; doc+roteiro `skills/10_perfil.md`. 5 fixes de app +
   fix do helper `limparMarcaDagua` (ver log do 00).
10. ✅ **Plano — CONCLUÍDO (3/3, 2026-06-12).** 11/11 testes (`18_plano.spec.js`); manual validado;
   doc+roteiro `skills/11_plano.md`. Sem bugs de app; fix sistêmico: círculos do "Passo a passo"
   ilegíveis no dark (12 templates).
11. ✅ **Ajuda — CONCLUÍDO (3/3, 2026-06-12).** 8/8 testes (`19_ajuda.spec.js`); manual n/a;
   doc+roteiro `skills/12_ajuda.md`. **1 bug consertado** (player da Academy nunca renderizava
   no load — updatePlayer antes do root no DOM). Cobre Academy + manual banco×estático (4 blocos).
12. ✅ **Configurações — CONCLUÍDO (3/3, 2026-06-12).** 10/10 testes (`20_configuracoes.spec.js`);
   manual validado; doc+roteiro `skills/13_configuracoes.md`. Sem bugs de app.

> 🏁 **PROGRAMA CONCLUÍDO em 2026-06-12 — 12/12 módulos com os 3 artefatos.** Suíte local
> specs 0–20. O que sobra (fora do programa): pendências do `00_programa-testes.md`
> (notificação de download, KPI Clientes 30d pós-Rhyno, cache Safari), decisão de
> commit/deploy de tudo que está local, e os vídeos em si (roteiros prontos).
>
> **PRÓXIMO PROJETO (registrado 2026-06-12, a estudar com o usuário antes de codar):**
> Fala Conosco/Abrir Chamado + reestruturação exaustiva e modernização do SaaS Admin
> (telemetria por módulo, jornada do cliente passo a passo, controles por org).
> **Plano completo: `skills/14_0_plano-suporte-e-saas-admin.md`** · memória `project_saas_admin_v2`.

> ⚠️ **MUDANÇA NO SISTEMA DE MANUAL (2026-06-11, feita fora do programa — ver CLAUDE.md):**
> o Superadmin agora tem um **Criador de Manual** no `saas-admin` — blocos `intro|callout|steps`
> salvos no model **`ManualModule`** (CRUD `/api/admin/manual*`, superadmin). O `ajuda.js` busca
> `GET /api/manual` (público, só `isPublished:true`, ordenado por `order`) e **só usa o estático
> (`MANUAL_MODULES_STATIC`, ex-`MANUAL_MODULES`) como fallback se o banco estiver vazio**.
> Termologia: "Walkthrough" virou **"Passo a passo"** nas 7 seções estáticas.
> Implicações p/ o programa: (1) manuais novos (Perfil etc.) entram no ESTÁTICO (fallback de
> fábrica) — o banco dev está vazio, então é o que renderiza; (2) o módulo **Ajuda** (fila)
> ganhou superfície de teste nova: consumo do `/api/manual`, fallback, render dos 3 blocos;
> (3) o Criador em si (saas-admin) é superfície EXTRA fora do menu do fotógrafo — decidir com o
> usuário se entra no escopo; (4) superadmin local p/ testar: `admin@cliquezoom.com.br`/`055360`
> (criado 2026-06-11, ver memória `reference_local_e2e_setup`).
   Para cada: pipeline §1 (recon → E2E exaustivo verde, consertando bugs inline → manual → roteiro →
   arquivar e atualizar a matriz).
   - **Superfície já levantada** por módulo está na matriz do `00_programa-testes.md` (botões, rotas,
     pontos de atenção). Use como ponto de partida do recon.

## 8. Pendências de fundo (não bloqueiam, mas registrar)
- Redesign de Sessões + skip de rate-limit dev + specs `tests/local/` seguem **uncommitados**. Decidir
  commit/deploy é conversa à parte (fora deste programa). NÃO commitar sem o usuário pedir.
- Specs antigas `tests/*.spec.js` (prod, UI antiga) seguem como smoke até deploy do redesign; a fonte
  de verdade é `tests/local/`.
- Manuais existentes (dashboard/sessões/clientes) foram feitos no layout antigo → o usuário considera
  ~2% prontos; refração é esperada e inevitável.
