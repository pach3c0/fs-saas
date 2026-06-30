# Jornada, Presença & Auditoria (a espinha da "corregedoria")

> **Público-alvo:** EMPRESA (superadmin) — **superadmin-only** · *(nunca exposto a fotógrafo/cliente)*
> **Onde no app:** Super Admin (dashboard, jornada da org) + a IA do Super Admin
> **Código-fonte:** [src/models/ActivityEvent.js](src/models/ActivityEvent.js), [src/models/Presence.js](src/models/Presence.js), [src/models/AuditLog.js](src/models/AuditLog.js), [src/services/presence.js](src/services/presence.js), [src/routes/saasAdmin.js](src/routes/saasAdmin.js)
>
> Esta seção mapeia **onde cada fato mora** — é a base para a IA responder coisas como "qual a última sessão da org X?" ou "quem acessou por último?" e **dizer de onde tirou** a informação.

---

## As fontes de verdade (e por quanto tempo vivem)

| Fonte | O que registra | Escopo | Retenção |
|---|---|---|---|
| **`ActivityEvent`** | Jornada (fotógrafo + cliente): login, sessão criada, cliente entrou, baixou, selecionou, entregue, plano, domínio, chamado | por org (`organizationId`) | **PERMANENTE** (sem TTL) |
| **`AuditLog`** | Ações do **superadmin** sobre orgs (aprovar, desativar, plano, impersonar) + reversões automáticas | por org (`targetOrgId`) | **PERMANENTE** |
| **`Presence`** | Quem está **online agora** (fotógrafo/cliente) | por org | **efêmero ~150s** (TTL) |
| **`PlatformLog`** | Erros/avisos (backend + frontend) | platform / org | **30 dias** (TTL) |
| **`EmailLog`** | Tentativas de envio de e-mail (falhas primeiro) | por e-mail/org | **90 dias** (TTL) |
| **`SchedulerRun`** | Estado de cada robô (última execução, status, erro) | platform | 1 doc por robô |

---

## `ActivityEvent` — a jornada (o coração da corregedoria)

Cada evento: `{ organizationId, userId?, type, meta, at }`. Índice composto **`{ organizationId: 1, at: -1 }`** → drill rápido "jornada de UMA org por data".

**Tipos (`type`):**
- **Do fotógrafo:** `login`, `session_created`, `photos_uploaded`, `code_sent`, `feature_configured`, `plan_upgraded`, `domain_verified`.
- **Do cliente final:** `code_viewed_by_client`, `client_entered` (entrou na galeria), `selection_submitted`, `extra_requested`, `extra_responded`, `photos_downloaded`.
- **Suporte:** `support_ticket_created`, `support_ticket_resolved`.

`meta` (Mixed) carrega o contexto: `sessionId`, `sessionName`, `clientName`, `participantId`, `photoCount`, `newPlan`, `domain`, `ticketId`, etc.

> **"Último cliente que acessou a org X":** `ActivityEvent` mais recente com `type:'client_entered'` daquela org (ou `Session.firstAccessAt`, que guarda só o **primeiro** acesso de cada sessão). O `client_entered` é **debounced ~30min** por sessão+participante (refresh não duplica).

---

## `Presence` — quem está online agora

- Chave `key`: `user:<userId>` (fotógrafo) ou `client:<sessionId>:<participantId|anon>` (cliente). Campos: `role`, `name`, `sessionName`, `module`, `lastSeen`.
- Backing em Mongo (não Map em memória) porque o PM2 roda em **cluster com 2 workers** — Map por worker daria presença furada. TTL ~150s (front bate heartbeat a cada 60s).
- Leitura: [src/services/presence.js](src/services/presence.js) (`getOnline()`, `getClientsOnline(organizationId)`).

---

## `AuditLog` — ações do superadmin

`{ adminUserId?, action, targetOrgId, meta, ip, at }`. `adminUserId` **null** = ação automática do sistema (ex.: reversão por estorno no webhook do MP, com `meta.system=true`). Ações: `org_approve`, `org_deactivate`, `org_trash`, `plan_change`, `limits_change`, `impersonate`, `recurring_consent`, etc.

---

## O que a IA do Super Admin já consegue (tools de leitura)

- `getPlatformOverview` — totais + saúde (orgs em risco por dias sem atividade).
- `getOrgJourney` — a timeline de `ActivityEvent` de uma org.
- `getOrgDiagnostics` — raio-X (últimos erros/e-mails, último login, auditoria, contadores 7d).
- `getAuditLog` — ações do superadmin. `getSystemStatus` — Mongo, schedulers, processo.
- `listErrors` / `listEmails` — `PlatformLog` / `EmailLog`.

---

## ⏳ Fase 2 — tools de consulta ao vivo (ainda NÃO existem)

Para responder direto perguntas como *"a última sessão criada pela org David"* ou *"o último cliente da org David a acessar"*, faltam tools dedicadas (os **dados e índices já existem**):
- `listSessions(org)` / `getSession(org|code)` — sobre `Session` (`createdAt`, `firstAccessAt`, `deliveredAt`, `selectionStatus`).
- `findClients(org)` — sobre `Client`.
- `searchActivity(org?, type?, janela)` — generaliza `getOrgJourney` (filtro por tipo/texto, platform-wide).
- `getOnlineNow()` — sobre `Presence`.

Cada uma deve devolver um campo de **fonte** (`_fonte: { colecao, id, at }`) para a IA **citar de onde tirou**. Até lá, a IA usa `getOrgJourney`/`getOrgDiagnostics` e **diz** quando algo só é obtenível abrindo o painel.

---

## Como a IA deve CITAR a fonte

Ao afirmar um fato operacional, dizer **de onde veio**: a tool usada e a coleção/registro (ex.: *"segundo a jornada (`ActivityEvent`, evento `client_entered` de 28/06 14:10)…"*). Nunca inventar número/nome — se a tool não cobre, dizer isso.

---

## Gotchas

- **Permanente × efêmero × TTL:** jornada e auditoria não expiram; erros somem em 30d, e-mails em 90d, presença em segundos. Para auditoria histórica, confie em `ActivityEvent`/`AuditLog`, não em `PlatformLog`.
- **`client_entered` é debounced** (~30min) — conta visitas, não cada refresh.
- **`Client.lastEventDate` não é acesso de galeria** (é campo de CRM/vendas).
- **TTL em prod não muda só pelo código:** alterar/retirar TTL de um índice já criado exige migração manual (dropar/recriar índice).
- **Tudo aqui é superadmin-only:** um futuro agente do cliente final **jamais** pode tocar nestas fontes.
