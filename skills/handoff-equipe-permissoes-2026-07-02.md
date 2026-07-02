# Handoff — Equipe (assentos) + Permissões por membro + Foto de perfil + App mobile

> **Status: ✅ TUDO EM PRODUÇÃO (merge `dc55add`, 2026-07-02).** Promovido do beta com merge livre de conflito (interseção de arquivos com o commit de outra lane no main = vazia). Dono (`role:admin`) faz **bypass total** → zero regressão pra Flávia/Davi.

Este doc cobre a lane **Equipe/Permissões** (Slice 1 + Slice 2) e os ajustes de UI/app que subiram junto. Fonte de detalhe fino: memórias `project_equipe_assentos_cz`, `project_equipe_permissoes_slice2`, `project_ajuste_mobile_app_radar`.

---

## 1. Equipe / Assentos (Slice 1) — quem entra na conta

- **CZ é a FONTE DA VERDADE dos assentos** (Free 1 · Basic 1 · Pro 2 · Studio 3, `seatsOf(sub)`). Aba **Equipe** (`admin/js/tabs/equipe.js`, dropdown do usuário) + `src/routes/team.js`.
- Adicionar membro grava `User` (`role:'member'`, `approved`) no Mongo **e espelha no Rhyno** via SSO do dono (`src/utils/rhynoClient.js`). Cerca de assento = server-side (403 `upgrade`); UI = vitrine.
- **Guard `rhynoManaged`** (User.js): desativar/reativar só propagam ao Rhyno se `rhynoManaged===true` → protege co-dono pré-existente do kill-switch.
- **Fase 2 Slice 1 (login de membro):** convite `POST /api/team/:id/invite` → link `/admin/?reset=<token>` (token single-use, TTL 48h, valida fingerprint da senha atual). Login de membro funciona; **SSO-por-usuário** (`resolveRhynoEmail` usa o `rhynoUserEmail` do membro logado). ✅ E2E validado pelo dono.
- **Selo "🔗 Vínculo Gestão"** só no Super Admin (`saasAdmin.js` computa `rhynoLinkedExisting`, `saas-admin/js/tabs/organizacoes.js` pinta o badge). Aditivo, não afeta a UI do fotógrafo.

## 2. Permissões por membro (Slice 2) — o que cada um pode fazer

Modelo espelhado do **Controle de Acesso do Rhyno/ERP1** (`Settings.tsx` → toggles salvos como objeto), adaptado:
- **Por-MEMBRO** (mora no `User`, não por cargo — time é 1–3) e **por-MÓDULO** (~13 checkboxes, liga/desliga a área inteira).
- `User.permissions` = `Map<String,Boolean>` (aditivo, **sem migração/backfill**).
- **Fonte única:** `src/services/memberPermissions.js` — `MODULES` (13 chaves em 3 grupos), `effectivePerms`, `can`, `sanitizePerms`, `isOwnerRole`.
- **Resolução:** chave ausente cai no `DEFAULTS` (baseline **Operador**: operacionais ON, sensíveis OFF) → membro sem campo não trava. **Dono `admin`/`superadmin` = bypass → tudo `true`.**

**13 módulos:** operacionais default-ON `sessoes`/`clientes`/`mensagens`/`crm`; default-OFF `meu_site`/`marketing`/`integracoes`/`marca_dagua`/`plano`/`dominio`/`equipe`/`configuracoes`/`perfil`. Fora da matriz (sempre liberado): `dashboard`, `ajuda`, `minha-conta`.

**Gate (`src/middleware/auth.js`):**
- `requireOwner` — admin/superadmin passam; membro 403.
- `requirePermission(...keys)` — lê o `User` do DB **por-request** (mudança de permissão vale NA HORA, sem re-login); nega `403 {forbidden:true}` (a flag faz `admin/js/utils/api.js` mostrar toast em vez de **deslogar**); rejeita membro desativado (`approved:false`).
- Endpoint compartilhado por 2 módulos → `req._permUser` deixa o handler **segregar por campo** (ex.: `PUT /organization/profile`: identidade exige `perfil`, marca d'água exige `marca_dagua`).

**Rotas cercadas (writes):** billing(`plano`), domains(`dominio`), organization(`perfil`×`marca_dagua`, `integracoes`, `configuracoes`), site+siteData(`meu_site`/`marketing`), clients(`clientes`, 8 rotas), gestao(`crm`, 3), sessions(`sessoes`, 45 rotas admin — **públicas `/client|/register` intactas**), sales-trigger(`marketing`), site/default-template/apply(`meu_site`). team.js: `PUT /team/:id/permissions` (dono-only, `sanitizePerms`, bloqueia dono/self); GET devolve `effectivePerms`.

**Front:** `state.js` `role/isOwner/permissions`; `app.js` `loadMe()` no boot + esconde abas sem permissão (**`display:none !important` + `data-role-hidden`** — o atributo `hidden` NÃO vence `display` de classe/inline) + guard no `switchTab` + filtro na busca + drawer mobile pula `[data-role-hidden]`. `equipe.js` botão "Permissões" por membro → modal de checkboxes por grupo. Aba **`minha-conta.js`** (universal, dono+membro): foto + nome/e-mail + trocar senha.

**⚠️ Revisão adversarial (17 agentes, 9 achados, TODOS corrigidos antes do deploy):** default-template ungated; OR-gate em /profile → segregação por campo; operacionais só cosméticos → cercados server-side; membro desativado com token vivo → `approved:false`.

**⚠️ Limitações conscientes:**
- `mensagens` é **só-front** (`notifications.js` NÃO cercado, pra não dar spam de toast no sino que faz polling). Esconde a aba mas o backend das notificações não bloqueia. Revisável.
- **Em prod, o co-dono Pacheco é `member` de FsFotografias** → agora sujeito à matriz (baseline Operador). Flávia (owner) libera mais em Equipe→Permissões.

**Fronteira Rhyno:** a matriz do CZ governa **as abas do CZ**. Dentro da Gestão (iframe) manda o Controle de Acesso do próprio Rhyno; o checkbox `crm` só decide se o membro vê a ENTRADA CRM/Gestão. Unificar CZ→cargo Rhyno + por-ação (ver/criar/excluir) = evolução futura.

## 3. Ajustes de UI / topbar (subiram junto)

- **Nome do usuário no perfil:** avatar+menu mostram o **nome da PESSOA** (via `/auth/me`), não iniciais do negócio ("FS"). `refreshIdentityUI()` idempotente (loadMe × fetchProfile).
- **Barra de busca de volta** (`#topbar-search`, input que encolhe antes das pílulas).
- **App** saiu do header → Ação Rápida no Dashboard (`qa-app` → `openAppInstall()`).
- **Encavalamento de ícones corrigido:** grupos esq/dir da topbar com fundo opaco `var(--bg-surface)` + `position:relative; z-index:2` → nav que transborda some ATRÁS deles (dropdowns Site/Gestão z-index 60 seguem por cima).

## 4. Foto de perfil por usuário

- `User.avatarUrl` (aditivo). `GET /auth/me` devolve; `PUT /auth/me/avatar` salva (só aceita `/uploads/…` ou vazio → bloqueia data:/javascript:/URL externa).
- Upload em **Minha conta** via `POST /admin/upload` (compressão) → `PUT avatar` → `window.refreshIdentityUI` repinta o avatar da topbar (background cover). Remover volta às iniciais.

## 5. App mobile

- **Home do app = DASHBOARD** (antes Radar). `app.js` boot: removido auto-boot no radar; em modo app (`?app=1`/standalone) força `switchTab('dashboard')` (deep-link de push tem prioridade). Radar segue no botão "Voltar ao Radar" (`#topbarRadarBtn`).
- **Splash "CliqueZoom"** ao abrir o app: overlay `#cz-splash` em `index.html`, só em `html.cz-app-mode` (standalone/?app=1), fade ~1s + rede de segurança 4s, cosmético (nunca bloqueia boot). Android já tinha splash nativo via manifest; este cobre iOS.

---

## Deploy / rollback

- **Prod:** `origin/main` = `dc55add` (merge). VPS `cd /var/www/cz-saas && git pull --ff-only origin main && pm2 reload ecosystem.config.js --env production --update-env`. Cluster ids 2/3.
- **Rollback:** `git revert -m 1 dc55add` + push + VPS pull + reload. (Reversível; docs/código, sem migração de dados.)
- **Beta:** `origin/beta` = `dd9fa74` (ancestral do merge de prod).

## Pendências

- E2E navegador em PROD (owner): criar membro → togglar módulo → aba some + `curl` token de membro → 403; foto de perfil; app/splash no celular.
- `mensagens` cerca real (opcional).
- Evolução: por-ação (ver/criar/excluir) + unificação CZ→cargo Rhyno.
