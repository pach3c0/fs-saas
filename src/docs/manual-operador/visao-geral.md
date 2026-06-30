# Visão Geral & Mapa de Públicos

> **Público-alvo:** EMPRESA (superadmin) · *explica também o que é de cada público*
> **Onde no app:** toda a plataforma · **Código-fonte:** [src/server.js](src/server.js), [src/middleware/auth.js](src/middleware/auth.js), [src/middleware/tenant.js](src/middleware/tenant.js)
>
> Esta é a **seção-espinha** do Manual do Operador: dá o mapa geral da CliqueZoom e, principalmente, **quem é dono de cada coisa** — empresa (nós) × fotógrafo (tenant) × cliente final. Use-a para responder "isso é da empresa ou do fotógrafo?".

---

## O que é a CliqueZoom

Plataforma **SaaS multi-tenant** para fotógrafos. Cada fotógrafo é uma **organização (tenant)**; cria **sessões/galerias** e entrega/vende fotos para **seus clientes finais**. A CliqueZoom cobra **assinatura mensal do fotógrafo** (ver seção *Mercado Pago — Cobrança*). A plataforma **não** cobra do cliente final (V1) — a venda de foto extra é do fotógrafo, por fora.

**Stack:** Backend Express + MongoDB (CommonJS, `src/`). Front em Vanilla JS (3 painéis). Multi-tenant: quase tudo filtra por `organizationId`; os campos centrais do tenant moram no model `Organization`.

---

## Os 3 públicos e os painéis (quem usa o quê)

| Público | Painel / pasta | URL | Como autentica |
|---|---|---|---|
| **EMPRESA** (dono/superadmin) | `saas-admin/` | `/saas-admin/` | JWT com `role: 'superadmin'` |
| **FOTÓGRAFO** (tenant) | `admin/` | `/admin/` | JWT `{ userId, organizationId, role }` (não-superadmin) |
| **CLIENTE** (final) | `cliente/` (PWA galeria) + `site/templates/` (site público) | `/galeria/:id`, `/site` | **`accessCode`** da sessão (ou `participant.accessCode` no multi) — **sem login** |

Outros frontends servidos ([server.js:162-174](src/server.js#L162)): `home/` (landing pública — hoje serve "Em construção", landing real em `/?preview`), `album/` (visualizador de álbum de prova, V2 oculto), `triagem/` (PWA de separação facial — ferramenta do FOTÓGRAFO).

---

## 🗺️ Mapa de públicos — de quem é cada coisa

> Isto é o que a IA usa para **não vazar** o que é da empresa quando, no futuro, existir um agente para o cliente final.

| Área do app | É de quem | Observação |
|---|---|---|
| Cobrança / Mercado Pago / MRR / assinatura | **EMPRESA** | A CliqueZoom cobra o fotógrafo. **Nunca** exposto a fotógrafo/cliente. |
| Planos / storage / cortesia / carência / limites | **EMPRESA** controla → afeta o fotógrafo | Superadmin gerencia; fotógrafo só vê o próprio plano. |
| Jornada / `ActivityEvent` / `AuditLog` / `Presence` / erros | **EMPRESA** (corregedoria) | Superadmin-only. Base da seção *Jornada & Auditoria*. |
| Manual do Operador (este) | **EMPRESA** | Runbook interno. Nunca vai ao fotógrafo/cliente. |
| Sessões / galerias / seleção | **FOTÓGRAFO** cria · **CLIENTE** consome | Ver seção *Sessões*. |
| Clientes / CRM / Gestão (Rhyno) | **FOTÓGRAFO** | Os clientes são do fotógrafo, escopados por `organizationId`. |
| Venda de foto extra (cupons, `pricingTable`, extras) | **FOTÓGRAFO ↔ CLIENTE** | Venda do fotógrafo ao cliente dele. **Não** é receita da plataforma. |
| Site público / portfólio / depoimentos / domínio | **FOTÓGRAFO** publica · público consome | Domínio próprio é cerca por plano (Pro/Studio). |
| Suporte / Fala Conosco (`Ticket`) | **FOTÓGRAFO** abre ↔ **EMPRESA** responde | — |
| Manual / Ajuda / Tutoriais (`ManualModule`, `Tutorial`) | **FOTÓGRAFO** | É a base da tool `searchManual` (≠ este manual). |
| Triagem facial | **FOTÓGRAFO** (máquina dele) | Biometria fica local; só tags sobem. |

---

## Como funciona a autenticação (gating)

- **JWT** ([auth.js](src/middleware/auth.js)): `authenticateToken` valida o token (`JWT_SECRET`) e popula `req.user = { userId, organizationId, role }`. Contas com `Organization.isActive=false` são **bloqueadas** (403), exceto superadmin.
- **Superadmin:** `requireSuperadmin` ([auth.js:45](src/middleware/auth.js#L45)) — só `role==='superadmin'`. Protege **todo** `/api/admin/saas/*`, incluindo o agente e este manual.
- **Cliente final:** sem JWT. As rotas `/api/client/*` usam `resolveTenant` ([server.js:519-534](src/server.js#L519)) + `accessCode` da sessão. O cliente **nunca** tem conta na plataforma.
- **Impersonação (suporte):** o superadmin só entra no painel do fotógrafo se a org autorizar (`Organization.supportAccess.enabled`); o JWT marca `impersonatedBy` (rastreável nos logs).

---

## Roteamento (onde as APIs moram)

Todos os routers são montados sob `/api` ([server.js:539-567](src/server.js#L539)). Resumo do que é de cada público:

- **EMPRESA:** `saasAdmin`, `saasSystem`, `saasAgent` (todos `requireSuperadmin`), + `/api/admin/*` em `tickets`/`tutorials`/`manual`.
- **FOTÓGRAFO:** `sessions`, `clients`, `organization`, `billing`, `domains`, `sales`, `gestao`, `upload`, `albums`, `presence`, `tickets` (só os da própria org).
- **CLIENTE/público:** `/api/client/*`, `site`, `landing`, `/api/sessions/register` (auto-inscrição), `manual` (só publicados).

---

## Gotchas

- **Multi-tenant:** se uma query de leitura **não** filtra por `organizationId`, é forte candidata a vazamento entre tenants (foi a classe de bug do feed do Rhyno). Toda tool/rota que lê dados de org deve escopar.
- **Código genérico:** nunca hardcodar nome de org. Usa-se `OWNER_SLUG` / `BASE_DOMAIN` / `PROTECTED_ORG_SLUGS`.
- **`Organization` é o "deus-objeto":** perfil, site, watermark, integrações, preferências e onboarding moram nele. Assinatura/cobrança ficam em `Subscription` à parte.
- **Manutenção:** há uma "cortina" de manutenção ([server.js:150](src/server.js#L150)) que responde 503 a todos, **menos** superadmin e rotas isentas.
