# Clientes & CRM

> **Público-alvo:** FOTÓGRAFO · *(os clientes são do fotógrafo, nunca da empresa)*
> **Onde no app:** painel do FOTÓGRAFO (aba Clientes / CRM / Gestão)
> **Código-fonte:** [src/models/Client.js](src/models/Client.js), [src/routes/clients.js](src/routes/clients.js), [src/routes/sales.js](src/routes/sales.js), [src/routes/gestao.js](src/routes/gestao.js)
>
> "Cliente" aqui = o **cliente final do fotógrafo** (a pessoa fotografada), **não** o fotógrafo. Cada `Client` é escopado por `organizationId`.

---

## O que é

O `Client` é o cadastro do cliente final dentro da org do fotógrafo. Campos: `name`, `email`, `phone`, `cpf`, `notes`, `tags[]`, `birthDate`. Vínculo opcional com sessões via `Session.clientId`.

**Unicidade:** `{ organizationId, email }` único e **sparse** (permite e-mail vazio). Dois fotógrafos diferentes podem ter o mesmo e-mail de cliente — o escopo é por org.

---

## Inteligência de negócio (CRM Fase 1)

Campos no `Client` que alimentam o CRM:
- `lastEventType` / `lastEventDate` — último evento do cliente (uso comercial). **Atenção:** é mantido pela automação de vendas, **não** é atualizado automaticamente quando o cliente abre uma galeria (para "último acesso" use `ActivityEvent` do tipo `client_entered` ou `Session.firstAccessAt` — ver seção *Jornada & Auditoria*).
- `lifetimeValue` — valor acumulado (informativo).
- `nextContactDate` + `contactHistory[]` (`{ sentAt, note }`) — reativação/follow-up.

---

## Integração com o Rhyno (ERP/CRM "Gestão")

- O **Rhyno** é o ERP/CRM oficial (React+FastAPI+Postgres), embutido como **aba Gestão** via **iframe + SSO** ([gestao.js](src/routes/gestao.js)).
- `Client.rhynoCustomerId` mapeia o cliente da CliqueZoom ao `Customer` no Rhyno (preenchido na migração; serve de idempotência).
- `Session.rhynoCustomerId` + snapshot `clientName`/`clientPhone` evitam ir ao Rhyno a toda hora.
- `Organization.rhynoUserEmail` mapeia a org ao seu tenant no Rhyno. **Se `null`, a Gestão é fail-CLOSED** (não cai num tenant compartilhado — proteção contra vazamento entre tenants).
- O acesso à Gestão é **cercado por plano** (capabilities em `plans.js`) — ver seção *Planos & Storage*.

---

## Automação de vendas (motor de foto extra do fotógrafo)

> Isto é **venda do fotógrafo ao cliente dele** — **não** é receita da plataforma.

- **Config por org:** `Organization.integrations.salesAutomator`:
  - `reactivation` — e-mail perto do aniversário do evento (`daysBeforeAnniversary`, default `[90,30,7]`).
  - `postDelivery` — upsell pós-entrega, na janela até a exclusão do storage (`daysSchedule`, `discountByDay`).
  - `couponPrefix` (default `'CZ'`) + `couponDiscountPercent`.
- **Por sessão:** `Session.salesAutomation.sentTriggers[]` registra cada gatilho disparado (`trigger`, `couponCode`, `sentAt`, `redeemedAt`). O resgate (`redeemedAt`) é **marcação manual** do fotógrafo.
- **Lembrete de seleção (pré-entrega):** `Organization.integrations.deadlineAutomation` — avisa o cliente para selecionar antes do prazo (sem desconto).

---

## O que o SUPERADMIN pode ver/fazer

- **Tool `getSalesOverview`** — visão do motor de vendas (cupons emitidos/resgatados, pedidos de extra pendentes), por org ou geral. Deixa claro: **não** é MRR da plataforma.
- O superadmin **não** gerencia clientes de fotógrafo pela IA. Para detalhe individual, abre o painel da org (com `supportAccess`).

---

## Gotchas

- **Não confundir os dois "clientes":** `Client`/`organizationId` = cliente do fotógrafo; o "cliente" da CliqueZoom é o **fotógrafo** (org). Ao responder, deixe claro de quem se fala.
- **"Último acesso" do cliente:** não está em `Client.lastEventDate` — está na jornada (`ActivityEvent.client_entered`) ou em `Session.firstAccessAt`.
- **Cupom/desconto:** mexe só na venda do fotógrafo; nenhum efeito na cobrança da plataforma (Mercado Pago).
