# Programa de Testes Exaustivos + Manuais + Roteiros

Índice/tracking vivo do programa. Plano completo: `~/.claude/plans/composed-purring-hare.md`.
**Restart pós-Rhyno (roadmap atual):** `~/.claude/plans/ja-fiz-a-integracao-steady-hammock.md`.

> ## ⚠️ RESTART pós-Rhyno (2026-06-10)
> A integração Rhyno (local/uncommitada) mudou o menu: **Clientes** ocultou, **CRM** virou toggle
> "Vendas Automáticas" dentro de **Marketing**, e surgiu a aba nova **Gestão** (iframe do ERP).
> O usuário pediu **recomeçar do zero** re-verificando tudo. Decisões: (1) re-rodar Dashboard+Sessões
> p/ pegar regressões e completar manual/roteiros; (2) seguir o **menu atual** — Clientes e CRM-aba
> ficam **fora do escopo** (CRM testado dentro de Marketing); (3) **Gestão = cobertura cheia** cross-app.
> Matriz abaixo já reflete a ordem do menu atual. **Executar só na próxima recarga de crédito.**

## Princípios (resumo)
- **Exaustivo** — todo botão, decisão e estado; lados fotógrafo e cliente. Sem suíte enxuta.
- **Teste acha bug → conserto inline na hora** (silencioso). Suíte entregue verde. Log de correções abaixo.
- **Sem escopo novo.** Mudança = correção de bug.
- **Ambiente:** local `http://localhost:3051`, DB `cliquezoom-dev`, `teste@teste.com.br`/`055360`, org `teste`, `playwright.local.config.js`, `--workers=1`. Helpers: `tests/local/helpers.js`.
- **Manual:** padrão Sessões (mini-previews fiéis em HTML/CSS + walkthrough numerado), redigido a partir do fluxo testado, na aba Ajuda (`MANUAL_MODULES` em `admin/js/tabs/ajuda.js`).

## Matriz de progresso (ORDEM DO MENU ATUAL — pós-Rhyno)

| # | Módulo (menu) | Front (linhas) | Teste E2E | Manual | Roteiro | Superfície / notas |
|---|--------|----------------|-----------|--------|---------|--------------------|
| 1 | **Dashboard** | dashboard.js (247) | ✅ 7 (re-verificado 2026-06-10) | ✅ refeito 2026-06-10 | ✅ validado 2026-06-10 | KPIs `#metrics-grid` (Espaço Usado em GB), sessões recentes clicáveis, ações rápidas (Nova Sessão, Meu Site), "Ver todas", onboarding 3 passos. **MÓDULO COMPLETO (3/3 artefatos)** |
| 2 | **Sessões** | sessoes/ | ✅ 20 (re-verificado 2026-06-10) | ✅ atual (+ painel de config) | ✅ skills/02 §12 | Riscos Rhyno OK. ⚙️ aposentada, capa no painel (config-panel.js). **MÓDULO COMPLETO (3/3 artefatos)** |
| 3 | **Mensagens** | mensagens.js (~270) | ✅ 14 (2026-06-11) | ✅ validado por screenshot 2026-06-11 | ✅ skills/04_mensagens.md | 2 bugs consertados (rating clamp + parseMessage — ver log). Doc completa em `skills/04_mensagens.md`. **MÓDULO COMPLETO (3/3 artefatos)** |
| 4 | **Gestão** (NOVO) | gestao.js + iframe Rhyno | ✅ 7 (2026-06-11) | ✅ criado+validado 2026-06-11 | ✅ skills/05_gestao.md | Cobertura cheia cross-app feita: SSO sem login, embed sem sidebar, sub-menu, regra OS-catálogo (API + iframe). Sem bugs de app. Exige stack Rhyno up. **MÓDULO COMPLETO (3/3 artefatos)** |
| 5 | **Meu Site** | meu-site.js (~2090) + builders (~2686) | ✅ 21 em 5 blocos (2026-06-11) | ✅ criado+validado 2026-06-11 | ✅ skills/06_meu-site.md | Blocos: 1-Geral/Status/Tema/Seções (5), 2-Hero (5), 3-Serviços/Depoimentos/Contato/Rodapé (4), 4-FAQ/Personalizar/ÁreaCliente (3), 5-Sobre/Portfólio/Álbuns/Estúdio (4). **3 bugs consertados** (ver log). Superfície fina não-E2E (transforms de modal, drag real, vídeo, aba Padrão) documentada em `skills/06 §5`. **MÓDULO COMPLETO (3/3 artefatos)** |
| 6 | **Domínio** | dominio.js (~160) | ✅ 16 (2026-06-11) | ✅ criado+validado 2026-06-11 | ✅ skills/07_dominio.md | API (formato/normalização/dup outra org/verify propagado e não/DELETE $unset/401) + UI (estados, instruções DNS, verificar, remover). **1 bug crítico consertado** (remover via UI nunca funcionou) + 4 fixes backend (ver log). Usa `cliquezoom.com.br` como fixture de DNS propagado. **MÓDULO COMPLETO (3/3 artefatos)** |
| 7 | **Integrações** | integracoes.js (91) | ✅ 11 (2026-06-11) | ✅ criado+validado 2026-06-11 | ✅ skills/08_integracoes.md | UI atual é só GA4 + Meta Pixel + aviso de que o lembrete de prazo migrou p/ Configurações (Zapier/Make/webhook saíram da tela). **1 bug de SEGURANÇA consertado** (rota pública vazava accessToken + automações — ver log). **MÓDULO COMPLETO (3/3 artefatos)** |
| 8 | **Marketing** | marketing.js (~350) + crm.js (~180) | ✅ 12 (2026-06-11) | ✅ criado+validado 2026-06-11 | ✅ skills/09_marketing.md | 2 views do toggle cobertas (Visão Geral + Vendas Automáticas). Sem bugs de app; fix de **ambiente** (limite de clientes do plano free no Rhyno — tenant 2 → `pro`). ⚠️ "Clientes (30d)" congela pós-Rhyno (pendência). **MÓDULO COMPLETO (3/3 artefatos)** |
| 9 | **Perfil** | perfil.js (~800) | ✅ 15 (2026-06-11) | ✅ criado+validado 2026-06-12 | ✅ skills/10_perfil.md | **5 fixes de app** (copy "estúdio"→"negócio", 3 botões ilegíveis no light, hexcodes→tokens, PUT name vazio 500→400, lista de camadas não sincronizava) + **1 fix de helper crítico** (`limparMarcaDagua` falhava silencioso — enum). **MÓDULO COMPLETO (3/3 artefatos)** |
| 10 | **Plano** | plano.js (178) | ✅ 11 (2026-06-12) | ✅ criado+validado 2026-06-12 | ✅ skills/11_plano.md | Sem bugs de app (2 fixes de teste). **Fix sistêmico no manual:** círculos do "Passo a passo" ilegíveis no dark (`color:white` sobre accent claro) → `var(--bg-base)` nos 12 templates. **MÓDULO COMPLETO (3/3)** |
| 11 | **Ajuda & Tutoriais** | ajuda.js (~2100) | ✅ 8 (2026-06-12) | n/a | ✅ skills/12_ajuda.md | **1 bug consertado** (player da Academy nunca renderizava no load — `updatePlayer` antes do root entrar no DOM). Cobre Academy (player/busca/pills/grid) + manual banco×estático (4 blocos) + CRUD superadmin. **MÓDULO COMPLETO (3/3)** |
| 12 | **Configurações** | configuracoes.js (~655) | ✅ 10 (2026-06-12) | ✅ criado+validado 2026-06-12 | ✅ skills/13_configuracoes.md | 5 seções + clamps/merge do preferences + clamps de /integrations (vendas). Sem bugs de app (3 fixes de teste — strict mode). **MÓDULO COMPLETO (3/3)** |

> 🏁 **PROGRAMA CONCLUÍDO em 2026-06-12 — 12 de 12 módulos com 3/3 artefatos** (testes E2E +
> manual + roteiro). Suíte local: specs 0–20 em `tests/local/`. Ver §Histórico para o placar final.

Legenda: ✅ feito · 🔄 em andamento · ⬜ a fazer · ⚠️ existe mas precisa refazer/revisar · ❌ não existe · n/a não aplicável.

**Fora do escopo (ocultos no menu):** Clientes (`clientes.js`), CRM-aba (`crm.js` — só via Marketing agora), Prova de Álbuns (V2). `skills/03_clientes.md` (roteiro pronto) fica arquivado até decisão do usuário.

## Pendências abertas (voltar depois)
- **[Rhyno · 2026-06-11] KPI "Clientes (30d)" do Marketing congela pós-Rhyno** — o
  `/api/marketing/overview` conta a collection `Client` do Mongo, mas clientes novos agora nascem
  no Rhyno (`/api/gestao/customers`). O número para de crescer. Resolver quando a integração
  definir a fonte canônica de clientes (handoff `skills/9_0` §7) — não é bug do módulo Marketing.
- **[Feature · 2026-06-11] Notificação de download para o fotógrafo** — pedido do usuário: notificar
  (sininho) quando o cliente baixa fotos individuais OU o ZIP completo. Implementar fora do programa
  de testes (é escopo novo). Rotas de download em `src/routes/sessions.js` + `Notification` (tipo novo)
  + sininho. Avaliar agrupamento p/ não spammar foto a foto. Também registrado em `project_pendencias`.
- **[Sessões/manual · 2026-06-10] Atualizações do admin não aparecem no navegador do usuário.** O servidor
  entrega a versão nova (hash em disco == servido; sem service worker; 1 instância na :3051), mas o
  usuário (em **Safari**) não via o manual atualizado nem a remoção da ⚙️ dos previews mesmo após Cmd+R
  e "Cmd+Shift+R". **Causa provável:** no Safari o recarregar-ignorando-cache é **`Cmd+Option+R`**
  (Recarregar a Partir da Origem), não Cmd+Shift+R; + o admin guarda cada tab em memória
  (`tabModules` em `app.js:807`, importa 1×/sessão). **A confirmar/fechar depois:** validar com o usuário
  via `Cmd+Option+R` / janela anônima / Develop ▸ Esvaziar Caches; avaliar cache-bust nos `<script>` do
  `admin/index.html` ou um modo dev. (O conteúdo em si está correto e testado — é só entrega no cliente.)

## Log de correções aplicadas (bugs achados pelos testes)
- **2026-06-12 · Ajuda · player da Academy nunca renderizava no load** — `ajuda.js` chamava
  `updatePlayer()` ANTES de `container.appendChild(root)`; o `getElementById` do player voltava
  null e a função retornava em silêncio. Nem o vídeo em destaque nem o estado vazio apareciam ao
  abrir a aba — só após clicar num card. **Fix:** chamada movida para depois do append.
- **2026-06-12 · Plano/manual · círculos do "Passo a passo" ilegíveis no dark** — os 12 templates
  de `MANUAL_MODULES_STATIC` usavam `color:white` sobre `background:var(--accent)` (#f2f2f2 no
  dark) → número invisível. **Fix:** `color:var(--bg-base)` (replace_all nos 12).
- **2026-06-11 · Perfil · 5 fixes de app:** (1) copy "estúdio"→"negócio" em `perfil.js` (3 lugares:
  "Dados do Estúdio", "Nome do Estúdio", toast "O nome do estúdio é obrigatório" + placeholder
  'Seu Estúdio' do layer padrão) — viola o feedback registrado do usuário; (2) **tema light:
  "Enviar Logo", "Trocar Imagem" e "+ Imagem" ilegíveis** — `background:var(--bg-hover)` (#dcdce0
  no light) com `color:white` → trocado p/ `color:var(--text-primary)` + borda; (3) hexcodes
  `#f85149`/`#f87171` → `var(--red)`; (4) `PUT /api/organization/profile` com `name:''` devolvia
  **500** (ValidationError caía no catch genérico) → agora 400 (`organization.js` trata
  ValidationError/CastError como erro de cliente); (5) editar o texto da camada no painel não
  atualizava o label na lista de camadas (`update` não chamava `renderLayerList`).
- **2026-06-11 · Perfil · fix de HELPER crítico (`tests/local/helpers.js`):** `limparMarcaDagua`
  enviava `watermarkType:''`, rejeitado pelo enum `['text','logo','both']` — o PUT falhava
  **desde sempre** e o `.catch(()=>{})` dos specs engolia: a limpeza nunca aconteceu e o org
  `teste` acumulava marca de teste ("CliqueZoom PROVA" do spec 9). Fix: limpar com
  `watermarkType:'text'`. O lixo do org foi limpo manualmente.
- **2026-06-11 · Integrações · SEGURANÇA: `/api/site/config` (público) vazava `integrations` inteiro** —
  qualquer visitante do site via `metaPixel.accessToken` (credencial da Conversions API),
  `deadlineAutomation.messageTemplate` e todo o `salesAutomator` (prefixo de cupom, percentuais de
  desconto, agenda de disparos). **Fix:** whitelist no handler (`src/routes/site.js`) — só
  `googleAnalytics{enabled,measurementId}`, `metaPixel{enabled,pixelId}`, `whatsapp`, `seo`.
  Coberto por teste que asserta a ausência de cada campo interno. Regressão re-rodada nos specs
  que dependem do site público (11 + 13_1..5): verdes.
- **2026-06-11 · Integrações · assert de `<noscript>` (falha do TESTE)** — `<noscript>` criado via
  JS guarda o conteúdo como **texto** (não vira `<img>` no DOM com JS ativo); o seletor
  `noscript img` nunca casa. Assert trocada p/ conteúdo do noscript. O fallback do Pixel em si é
  inofensivo (só teria efeito em HTML server-rendered).
- **2026-06-11 · Domínio · remover domínio pela UI nunca funcionou (CRÍTICO)** — `dominio.js`
  chamava `showConfirm(msg, {onConfirm})`, mas `showConfirm` retorna **Promise\<boolean\>** e não
  aceita callback: o confirm fechava e nada acontecia. **Fix:** `const ok = await showConfirm(...)`
  + `danger:true` + try/catch com toast. Coberto por teste (cancelar mantém / confirmar remove).
- **2026-06-11 · Domínio · 4 fixes backend (`src/routes/domains.js`)** — (1) DELETE gravava
  `customDomain: null` — com índice `unique sparse`, a 2ª org a remover domínio tomaria duplicate
  key; agora `$unset` (teste confere no Mongo que o campo some); (2) entrada não era normalizada
  (maiúsculas/espaços → 400 confuso); agora `trim().toLowerCase()`; (3) re-salvar o próprio domínio
  dava "já cadastrado em outra conta" (checagem sem `$ne` da própria org); (4) script SSL
  (sudo/certbot) disparava também em dev — agora só `NODE_ENV === 'production'`, com `req.logger`
  no lugar de `console.error` e `.lean()` no GET.
- **2026-06-11 · Flake conhecido (teste, não app):** `13_meusite-5-midia` › "Estúdio: campos +
  toggle do mapa" leu string vazia 1× na suíte completa (race de re-render) e passou isolado e nas
  execuções seguintes. Se repetir, endurecer o wait do teste.
- **2026-06-11 · Meu Site/Serviços · remover o último serviço não podia ser salvo** — o botão
  "Salvar Serviços" só renderizava com `servicos.length > 0`; ao excluir o último item o botão sumia
  e a remoção nunca persistia. **Fix:** botão renderiza sempre (`meu-site.js`). Coberto por teste
  (esvazia a lista e salva).
- **2026-06-11 · Meu Site/Rodapé · "+ Adicionar link" descartava o estado** — o handler re-chamava
  `renderRodape()`, que re-inicializava `_rodape` a partir do salvo: com rodapé nunca salvo, o link
  novo era descartado (nunca aparecia) e copyright/redes digitados e não salvos eram apagados.
  **Fix:** cópia local profunda + `lerInputs()` antes de cada re-render + `renderList()` interno
  (`meu-site.js`). Coberto por teste.
- **2026-06-11 · Meu Site/FAQ · "+ Adicionar"/remover descartavam edições não salvas** — os handlers
  re-renderizavam a partir de `_faqItems` sem capturar o que estava digitado nos editores ricos; o
  remover ainda persistia (silencioso) valores velhos. **Fix:** `lerEditores()` captura os valores
  dos RTEs antes de qualquer re-render (`faq.js`). Coberto por teste (edição sobrevive ao Adicionar).
- **2026-06-11 · Mensagens · rating de depoimento sem clamp DERRUBAVA A ABA INTEIRA** — `POST
  /site/depoimento` gravava qualquer inteiro (`rating: -3` ia cru pro banco). No admin,
  `'⭐'.repeat(-3)` lançava `RangeError` dentro do `renderPendentes` → a exceção subia pelo
  `Promise.all` do `renderMensagens` e **nada da aba renderizava** (nem contatos). Rating 7 exibia
  "7/5". **Fix:** clamp 1–5 no backend (`src/routes/site.js`) + `clampNota()` defensivo no front
  (`mensagens.js`) p/ dados antigos já persistidos fora da faixa. Coberto por teste.
- **2026-06-11 · Mensagens · `parseMessage` inventava assunto falso** — contato cuja mensagem
  continha "—" e ":" (ex.: "Olá — gostaria de saber: vocês atendem?") fazia o trecho virar assunto
  no título do card e cortava a mensagem exibida. **Fix:** o parser corta o cabeçalho no PRIMEIRO
  ":" e extrai nome/email/assunto só dele (`mensagens.js`). Coberto por teste.
- **2026-06-11 · Helpers · `setConfigCheck` travava com os padrões do fotógrafo (falha do TESTE)** —
  a aba Configurações › Sessões pré-preenche a criação com `sessionDefaults` da org; se o checkbox
  já nasce no estado desejado (ex.: `commentsEnabled: true` na org `teste`), `setChecked` é no-op e
  o `waitForResponse(PUT)` pendurava até o timeout (reproduzia no spec 6/comentários). **Fix no
  helper:** retorna cedo se `isChecked() === marcado` (`tests/local/helpers.js`).
- **2026-06-11 · Manual · "Clientes" removido do `MANUAL_MODULES` (pedido do usuário)** — o Manual do
  Usuário (Ajuda) ainda listava o módulo **Clientes**, inconsistente com o menu atual (Clientes ocultou,
  migrou p/ Rhyno, fora do escopo). Removida a entrada `id:'clientes'` em `admin/js/tabs/ajuda.js`
  (bloco ~100 linhas; preservado no git, roteiro em `skills/03_clientes.md`). Manual agora reflete só os
  4 módulos visíveis: Dashboard, Sessões, Mensagens, Meu Site (Em breve). Sintaxe validada; hash servido
  == disco. (Entrega ainda sujeita à pendência de cache do Safari — `Cmd+Option+R`.)
- **2026-06-10 (restart) · Sessões · manual incompleto + ⚙️ redundante (pedido do usuário)** — o manual
  não documentava o **painel de Configurações** (barra lateral direita do wizard, autosave + travas por
  estágio). Adicionada a seção com reprodução fiel (validada por screenshot) + correção dos passos de
  criação (modal enxuto). Ao revisar, decidiu-se **aposentar a ⚙️**: removidos os dois botões (card +
  header), o `editSessionModal` (markup), `_setupEditSessionModal`/`window.editSession` — eram ~95%
  redundantes com o painel. A **capa** (única exclusiva do modal) migrou para o painel (`config-panel.js`)
  e segue na criação. Novo E2E "Painel — capa: subir/remover" (spec 4). Copy do passo 6 que citava ⚙️
  corrigida. Suíte: 20/20 verdes.
- **2026-06-10 (restart) · Dashboard · UX "Espaço Usado" em GB** — a pedido do usuário, o KPI deixou de
  mostrar "1240 MB" (forçava conversão mental). Novo `formatStorage(mb)` em `dashboard.js`: **GB a partir
  de 1 GB** (1240 MB → "1.2 GB"), MB abaixo disso (novo usuário não vê "0.05 GB"). Manual e teste
  (`10_dashboard.spec.js`, assertiva de storage) ajustados. Também copy "estúdio"→"negócio" no greeting
  (`dashboard.js`) e no manual (regra [[feedback_linguagem_estudio]]).
- **2026-06-10 (restart) · Dashboard · regressão Rhyno no helper `criarSessao`** — o cadastro de
  cliente da sessão migrou p/ o Rhyno, que **rejeita CPF inválido**. O helper preenchia `#clienteCpf`
  com `00000000000` → `#modalCliente` não fechava → 2 testes do Dashboard (métricas + sessão recente)
  falhavam. **Fix:** novo `gerarCPF()` em `tests/local/helpers.js` (CPF com dígitos válidos) usado no
  `criarSessao`. ⚠️ **Implicação p/ toda a suíte de Sessões:** criar sessão (modo ≠ multi) agora exige
  o **stack Rhyno up** + CPF válido. Confirmado que `POST /api/gestao/customers` cria customer no Rhyno
  local (campo `cpf`).
- **2026-06-10 (restart) · Dashboard · onboarding 4→3 passos** — o checklist perdeu "Vincular cliente"
  (tutorial apontava p/ a aba Clientes, hoje oculta). A spec assertava `25%` (1 de 4); o correto agora
  é `33%` (1 de 3). **Fix no teste** (não no código — a mudança do checklist é coerente com o app atual).
- **2026-06-10 · Dashboard · `dashboard.js:101`** — clique numa "sessão recente" chamava
  `window.viewSessionPhotos(id)`, função **inexistente** (removida no redesign; substituída por
  `openSessionWizard`). O clique não abria nada. **Fix:** trocado para
  `window.openSessionWizard?.(id)`. Coberto pelo teste "Sessão recente clicável abre o wizard".
  - **Relacionado (NÃO consertado — código morto):** `viewSessionPhotos` também é chamada em
    `sessoes/actions.js:222,251` (`setSessionCover`/`togglePhotoHidden`) e `sessoes/upload.js:90,125`.
    Esses globais não têm chamadores no novo wizard (era do `modal-detail` antigo) → nunca executam.
    Limpar quando revisitar Sessões (CLAUDE.md já lista "modal-detail.js standalone pode ser removido").

## Histórico
- 2026-06-12 — 🏁 **Configurações CONCLUÍDO (3/3) — PROGRAMA DE 12 MÓDULOS COMPLETO.** 10 testes
  verdes (`tests/local/20_configuracoes.spec.js`): API (401; PUT vazio/tipos errados → 400;
  **merge granular com clamps** — packageLimit 1–1000, extraPhotoPrice ≥0, deadlineDays ≤365,
  resolução fora do enum ignorada; clamps de /integrations — daysWarning ≤30, couponPrefix ≤8,
  desconto ≤100, discountByDay sanitizado) + UI (sub-nav 5 seções; Mensagens com autosave
  "✓ Salvo"/persistência/chips/exemplo/preview interpolado/restaurar; Sessões persiste padrões;
  Entrega radio persiste; Notificações toggle; Vendas — painel 3 prazos, toggles, prefixo,
  desconto por etapa, editor com preview; route-abort → toast e layout monta). Sem bugs de app
  (3 fixes de teste: escopo #tabContent vs menu lateral; radio pela descrição única; wrap do
  numberField). Manual id `configuracoes` validado light+dark; doc+roteiro
  `skills/13_configuracoes.md`. **12 de 12 módulos completos.**
- 2026-06-12 — **Ajuda & Tutoriais CONCLUÍDO (3/3): 8 testes verdes** (`tests/local/19_ajuda.spec.js`).
  API (401/403 — CRUD de tutoriais e manual exigem superadmin; /api/manual é público; CRUD completo
  de tutoriais com validação de URL do YouTube e extração do youtubeId; /api/manual só publicados
  ordenados + 409 em id duplicado) + UI (estado vazio do player; player destaque + grid + pills de
  categoria + busca + troca de destaque por card, com YouTube bloqueado por route-abort; manual
  estático fallback com accordion/toggle; **módulo publicado no banco substitui o estático e
  renderiza os 4 blocos** intro/callout/steps/image; despublicar → fallback volta). **1 bug de app
  consertado** (ver log). Manual n/a (a aba é o manual); doc+roteiro `skills/12_ajuda.md`.
  11 de 12. Próximo: **Configurações** (último módulo).
- 2026-06-12 — **Plano CONCLUÍDO (3/3): 11 testes verdes** (`tests/local/18_plano.spec.js`).
  API (401 nas 3 autenticadas + /plans público por design; formato dos 3 planos; subscription com
  lazy-create + storage de disco + breakdown; cancel sem Stripe → 400; checkout sem Stripe → 500
  limpo, com `test.skip` se Stripe ativo) + UI (card atual, ∞ p/ limites -1, breakdown, cards
  ATUAL/Em Breve/Pagamentos em breve, **faixas de cor 70%/90% semeando limites na subscription via
  Mongo** com restore, free sem cancelamento + "Ver planos ↓" com scroll, cancelar com confirm →
  toast de erro sem Stripe, route-abort → erro limpo). Sem bugs de app; 2 fixes de teste
  (strict-mode: "Seu Plano" × "Seu plano permanece…", "Sessões" × menu). **Fix sistêmico de
  manual:** círculos numerados ilegíveis no dark → `color:var(--bg-base)` (12 templates).
  Manual id `plano` validado light+dark; doc+roteiro `skills/11_plano.md`. 10 de 12. Próximo: **Ajuda**.
- 2026-06-12 — **Perfil CONCLUÍDO (3/3): manual criado em `MANUAL_MODULES_STATIC` id `perfil`**
  (preview dados+editor de camadas, "Passo a passo" — terminologia nova) **validado por screenshot
  light+dark; doc+roteiro `skills/10_perfil.md`.** Nota: o módulo `dashboard` do banco (Criador)
  está despublicado → o estático renderiza; para screenshots de validação futuros, conferir que
  não há módulo publicado no banco (senão o banco substitui TODO o estático). 9 de 12 módulos.
  Próximo: **Plano**.
- 2026-06-11 — **Perfil: testes CONCLUÍDOS (1/3 artefatos — manual e roteiro PENDENTES por crédito).**
  15 testes verdes (`tests/local/17_perfil.spec.js`): API (401; GET formato; PUT salva campos e
  ignora fora-da-whitelist tipo `slug`; **name vazio → 400**; watermarkLayers persiste estrutura
  completa) + UI (3 seções com valores salvos e copy sem "estúdio"; Salvar Perfil persiste;
  nome vazio → aviso sem PUT; editor abre com template padrão; + Texto/painel/opacidade/rotação
  com autosave; toolbar duplicar/mover/deletar; drag no canvas; ↺ Padrão com confirm;
  upload de logo persiste) + cliente (galeria renderiza watermarkLayers sobre cada foto).
  **5 fixes de app em `perfil.js`/`organization.js`** (ver log) + **fix de helper crítico**:
  `limparMarcaDagua` enviava `watermarkType:''` que o enum rejeita — falhava silencioso desde
  sempre (o catch engolia) e a marca de teste **nunca era limpa** (org tinha lixo "CliqueZoom
  PROVA" vazado). Caveat novo: o canvas do editor fica abaixo da dobra — `scrollIntoViewIfNeeded`
  antes de drag com mouse. Flake conhecido: o teste "Cliente" pode falhar logo após a correção
  do helper se o run anterior deixou lixo (re-rodar passa). **Próximo: manual+roteiro do Perfil,
  depois Plano → Ajuda → Configurações.**
- 2026-06-11 — **Marketing CONCLUÍDO (3/3 artefatos): 12 testes verdes**
  (`tests/local/16_marketing.spec.js`). Cobertura: API (401 nas 3 rotas; formato completo do
  `/api/marketing/overview` e do `/api/sales/dashboard`; GA do overview reflete Integrações;
  **deltas determinísticos** — sessão real com 3 fotos + preço extra + código compartilhado move
  totalSessions/sessions30d/funnel.codeSent/byMode/statusCount.pending/totalPhotosUploaded e os
  KPIs do robô fotosPendentes+3 / receitaPotencial+R$30; redeem/unredeem seta/limpa `redeemedAt`;
  cupom inexistente → 404) + UI (Visão Geral com números batendo com a API; card GA alterna
  não-configurado ↔ conectado com ID+link; falha do overview → mensagem de erro; toggle alterna
  as 2 views; pills Ativado/Desativado refletem `deadlineAutomation`/`postDelivery`; Configurar
  navega p/ Configurações; estado vazio de cupons; ciclo completo do cupom na UI com toasts —
  semeado direto no Mongo pois só o `postDeliveryAutomator` cria triggers). **Sem bugs de app**
  (3 correções foram do teste). **Fix de AMBIENTE:** tenant `teste` do Rhyno bateu o limite de
  200 clientes do plano free (cada `criarSessao` cadastra 1 cliente no Rhyno) → `tenant.plan` e
  `subscription.plan_code` = `'pro'` no Postgres local. Manual `MANUAL_MODULES` id `marketing`
  criado e validado por screenshot (light+dark). Doc+roteiro `skills/09_marketing.md`.
  8 de 12 módulos completos. Próximo: **Perfil**.
- 2026-06-11 — **Integrações CONCLUÍDO (3/3 artefatos): 11 testes verdes**
  (`tests/local/15_integracoes.spec.js`). Cobertura: API (401 sem token GET/PUT; GET formato;
  PUT salva GA+Pixel com trim nos IDs; PUT parcial não apaga o resto; PUT vazio/tipos errados →
  400) + segurança (público `/api/site/config` expõe SÓ campos seguros — **bug de vazamento
  consertado**, ver log) + UI (cards refletem estado salvo, salvar→toast→persiste ao reabrir,
  link p/ Configurações navega) + site público (GA habilitado injeta gtag com o ID + config
  inline; Pixel injeta fbq + noscript; desabilitados → nada injetado; rede externa bloqueada por
  route abort). Manual `MANUAL_MODULES` id `integracoes` criado e validado por screenshot.
  Doc+roteiro `skills/08_integracoes.md`. **Suíte do programa: 96/96 verdes** (Sessões 20 +
  Dashboard 7 + Mensagens 14 + Gestão 7 + Meu Site 21 + Domínio 16 + Integrações 11; flake
  conhecido do Estúdio ocorreu 1× e passou isolado). 7 de 12 módulos completos. Próximo:
  **Marketing** (toggle Vendas Automáticas — 2 views).
- 2026-06-11 — **Domínio CONCLUÍDO (3/3 artefatos): 16 testes verdes** (`tests/local/14_dominio.spec.js`).
  Cobertura cheia: API (401 sem token; formato da resposta de status; 7 formatos inválidos → 400;
  adicionar válido → pending + instructions A Record/IP/TTL; normalização maiúsculas/espaços;
  re-salvar o próprio OK; domínio de outra org → 400, semeado direto no Mongo; verify sem domínio →
  400; verify não propagado → success:false; **verify propagado de verdade** usando
  `cliquezoom.com.br` como fixture de DNS → verified + `domainVerifiedAt`; DELETE com `$unset`
  conferido no documento + idempotente) + UI (estado vazio, vazio é no-op, inválido → toast,
  válido → card pending + tabela de instruções, verificar não propagado reabilita botão, fluxo
  verificado → badge verde sem instruções, remover com cancelar/confirmar). **1 bug crítico de app**
  (remover via UI nunca funcionou — `showConfirm` com callback inexistente) **+ 4 fixes backend**
  (ver log). Manual `MANUAL_MODULES` id `dominio` criado e validado por screenshot. Doc+roteiro
  `skills/07_dominio.md`. **Suíte do programa: 85/85 verdes** (94 no runner contando os 9 de
  `30_clientes.spec.js`, fora de escopo mas verdes; 1 flake do Estúdio re-rodado verde — ver log).
  6 de 12 módulos completos. Próximo: **Integrações**.
- 2026-06-11 — **Meu Site CONCLUÍDO (3/3 artefatos): 21 testes verdes em 5 blocos**
  (`tests/local/13_meusite-1..5`). Bloco 5 fechou os builders de mídia: Sobre (RTEs + foto-camada +
  público), Portfólio (upload múltiplo `.p-item`, grid Misto, limpar tudo), Álbuns (criar/titular —
  salva no blur e no botão), Estúdio (campos/RTE/toggle mapa + Salvar Tudo). Manual `MANUAL_MODULES`
  id `meu-site` criado (preview do builder + walkthrough 6 passos) e validado por screenshot.
  Doc+roteiro `skills/06_meu-site.md` (com §5 de superfície não-E2E p/ validação manual).
  **Suíte local completa: 69/69 verdes.** 5 de 12 módulos completos. Próximo: **Domínio**.
- 2026-06-11 — **Meu Site (parcial): 17 testes verdes em 4 blocos** (`tests/local/13_meusite-1..4`).
  Bloco 1: casca do builder (props+preview, iframe, Padrão oculta p/ não-superadmin, devices, sair),
  status do site (cortina "Em breve" client-side validada no público), tema (galeria 5, selecionar≠salvar,
  preview `_preview_theme` sem tocar o banco, salvar aplica no público), Aplicar Exemplo (cancelar),
  Seções (10 itens, desativar some do público, reordenar, Restaurar). Bloco 2: Hero Studio (camada de
  texto add/edit/del + público, sliders de fundo, upload bg, Restaurar Padrão, dirty-confirm com
  Descartar). Bloco 3: Serviços/Depoimentos/Contato/Rodapé (CRUD + público). Bloco 4: FAQ (RTEs,
  edições sobrevivem a re-render)/Personalizar (siteStyle + reset)/Área do Cliente (autosave).
  **3 bugs consertados** (ver log: Serviços salvar-vazio, Rodapé estado, FAQ estado). **Suíte local
  completa: 65/65 verdes.** Falta: Sobre, Portfólio, Álbuns, Estúdio + manual + roteiro.
- 2026-06-11 — **Gestão CONCLUÍDO (3/3 artefatos): 7/7 testes verdes** (`tests/local/12_gestao.spec.js`).
  Cobertura cheia cross-app: (A) rotas `/api/gestao/*` do CliqueZoom (sso-url formato/redirect;
  customers GET formato `rhyno:`/search; POST validações nome/CPF/duplicado); (B) UI da aba (SSO entra
  sem tela de login, embed esconde `aside` do Rhyno, sub-menu 4 grupos/11 seções navega com sessão
  mantida, sem "Abrir em nova aba"); (C) regra **OS só aceita item do catálogo** — API Rhyno direta
  (texto livre/part sem id/id fantasma → 400; catálogo salva; PUT idem) E via iframe (badge ⚠ +
  submit bloqueado; seleção do catálogo → ✓ + OS criada). Suíte semeia catálogo idempotente
  (`TEST-E2E SERVICO/PRODUTO GESTAO`). **Sem bugs de app** (1 fix de seletor no teste). Manual
  `MANUAL_MODULES` id `gestao` criado e validado por screenshot. Roteiro+doc `skills/05_gestao.md`.
  **Suíte local completa: 48/48 verdes.** Próximo: **Meu Site** (sub-split por builder).
- 2026-06-11 — **Mensagens CONCLUÍDO (3/3 artefatos): 14/14 testes verdes** (`tests/local/11_mensagens.spec.js`).
  Cobertura: contatos (lista, badge não-lidas singular/plural, expandir→marca lida+persiste, parse
  nome/email/assunto, XSS escapado, excluir/cancelar, empty state) + depoimentos (submissão pública,
  pendentes, aprovar→publica em `siteContent.depoimentos`, rejeitar, rating clamp, singular/plural) +
  validações públicas (400 sem obrigatórios, honeypot `_hp_trap`). 2 bugs de código + 1 de helper
  consertados (ver log). Manual já refletia a UI atual — validado por screenshot. Roteiro + doc do
  módulo em `skills/04_mensagens.md`. **Suíte local completa: 41/41 verdes** (Sessões 20 + Dashboard 7 +
  Mensagens 14). Próximo: **Gestão** (exige stack Rhyno up).
- 2026-06-10 — Programa iniciado. Triagem dos 13 módulos concluída + índice criado. Sessões já tinha
  19 testes E2E + manual atual. **Dashboard: 7 testes E2E verdes + 1 bug consertado.** Próximo no
  Dashboard: manual (refazer `MANUAL_MODULES[0]`) + roteiro. Depois: Clientes.
- 2026-06-10 (fim do dia) — **RESTART pós-Rhyno** decidido. A integração Rhyno mudou o menu (Clientes
  oculto, CRM→Marketing, Gestão nova). Matriz refeita p/ a ordem do menu atual (13→12 módulos visíveis).
  Roadmap de execução em `~/.claude/plans/ja-fiz-a-integracao-steady-hammock.md`.
- 2026-06-10 (restart, execução) — **Dashboard re-verificado: 7/7 testes verdes.** 2 correções (ver
  log acima): helper `criarSessao` com CPF válido (regressão Rhyno) + spec do onboarding 25%→33%.
- 2026-06-10 (restart, execução — sessão 2) — **Dashboard CONCLUÍDO (3/3 artefatos).** Manual
  `MANUAL_MODULES[0]` refeito p/ a UI atual (onboarding 3 passos, 4 KPIs, Ações com "Ver meu Site") e
  validado por screenshot; roteiro `skills/01_dashboard.md` revalidado/atualizado. Melhorias: "Espaço
  Usado" em GB (`formatStorage`) + copy "estúdio"→"negócio".
- 2026-06-10 (restart, execução — sessão 2) — **Sessões CONCLUÍDO (3/3 artefatos): 19/19 testes verdes**
  (`tests/local/0–9`, ~2.6min). Sem regressões além do CPF já corrigido. Manual revisado (current — "10 MB"
  confere com multer) e roteiro `skills/02 §12` validado (5 passos / galeria 3 / multi com códigos). Fix de
  copy: "saúde do estúdio"→"negócio" no walkthrough do Dashboard (resquício). **Próximo: Mensagens**
  (`mensagens.js` — contatos do site + depoimentos pendentes; pipeline completo: E2E + manual + roteiro).
