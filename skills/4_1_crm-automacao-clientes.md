# Skill 4.1 — CRM e Automação do Módulo Clientes

> Evolução profissional do módulo Clientes: classificação por tipo de evento, trilha de scarcity para fotos não-vendidas, reativação anual de eventos recorrentes (aniversários/ensaios). Templates fornecidos pelo sistema, fotógrafo só liga/desliga.

## Contexto / Motivação

O módulo Clientes hoje é um CRUD simples (nome/email/phone/cpf/tags + lista de sessões). Funciona como cadastro, não como ferramenta de venda.

Problemas reais a resolver:
- Cliente compra 10 fotos mas deixa 15 na galeria — galeria expira sem nenhum gatilho de upsell.
- Eventos recorrentes (aniversário, ensaio anual) não disparam reativação no ano seguinte.
- Modo de sessão (`gallery`, `selection`, `multi_*`) é amplo demais para definir estratégia — falta uma camada de **categoria de evento**.

A base técnica para automação **já existe**:
- `src/utils/email.js` — SMTP + 10+ templates funcionais.
- `src/utils/deadlineChecker.js` — cron 6h/24h em `server.js`.
- `Session.extraRequest.upsellingSent` — predecessor de campanha.
- `skills/4_0_estrategia-vendas-crm.md` — visão estratégica (cadência 15d/7d/48h).

Resultado esperado: Cada sessão classificada por tipo de evento. Galerias com fotos não-vendidas disparam scarcity automática até o deadline. Clientes recorrentes recebem campanha 90 dias antes do próximo ano. Fotógrafo apenas liga/desliga trilhas.

## Decisões fechadas

1. **Escopo MVP:** Scarcity + Reativação anual (sem funil visual nesta fase).
2. **eventType vive na Session** (cliente pode ter múltiplos tipos de evento ao longo do tempo).
3. **Templates fornecidos pelo sistema**, fotógrafo só liga/desliga por trilha.
4. **Cupom = token manual** (sem checkout integrado nesta fase). E-mail cria urgência + entrega código que fotógrafo honra fora do app.

## Mudanças de modelo

### `src/models/Session.js`
```js
eventType: {
  type: String,
  enum: ['aniversario', 'casamento', 'formatura', 'corporativo', 'show', 'ensaio', 'gestante', 'newborn', 'debutante', 'batizado', 'outro'],
  default: 'outro',
  index: true
}
eventDate: { type: Date }            // data real do evento (≠ createdAt)
isRecurring: { type: Boolean }       // derivado de eventType, default true para aniversario/ensaio
salesAutomation: {
  enabled: { type: Boolean, default: true },
  sentTriggers: [{ trigger: String, sentAt: Date, couponCode: String }]
  // trigger ∈ ['scarcity_15d','scarcity_7d','scarcity_3d','scarcity_24h','reactivation_90d','reactivation_30d','reactivation_7d']
}
```

### `src/models/Client.js`
```js
birthDate: { type: Date }
lastEventType: { type: String }
lastEventDate: { type: Date }
lifetimeValue: { type: Number, default: 0 }   // placeholder até checkout existir
```

### `src/models/Organization.js`
```js
integrations.salesAutomator: {
  enabled: { type: Boolean, default: false },
  scarcity: { enabled: Boolean, daysSchedule: [Number] },        // default [15,7,3,1]
  reactivation: { enabled: Boolean, daysBeforeAnniversary: [Number] },  // default [90,30,7]
  couponPrefix: { type: String, default: 'CZ' },
  couponDiscountPercent: { type: Number, default: 10 }
}
```

## Mapeamento modo → eventTypes sugeridos (UI)

| Modo de sessão | eventTypes recomendados | Recorrente? |
|---|---|---|
| `selection` | aniversário, ensaio, gestante, newborn, debutante, batizado | sim (aniversário/ensaio) |
| `gallery` | corporativo, formatura, show, festas grandes | não (one-shot) |
| `multi_selection` | casamento, formatura, debutante (multi) | não |
| `multi_instant` | show, evento real-time, corporativo | não |

A UI **não** força — sugere e permite "outro".

## Novos arquivos backend

### `src/utils/salesAutomator.js` (novo)
- Roda a cada 6h (junto com `deadlineChecker`).
- Lê `org.integrations.salesAutomator.enabled` por tenant.
- Para cada sessão `delivered` ou `submitted` com fotos não-selecionadas e `selectionDeadline` futuro:
  - Calcula dias restantes; dispara trigger correspondente (15/7/3/1) se ainda não em `sentTriggers`.
  - Gera couponCode `CZ-{sessionId6}-{trigger}` único; persiste em `sentTriggers`.
  - Envia e-mail via novo `sendScarcityEmail(template, ctx)`.

### `src/utils/anniversaryAutomator.js` (novo)
- Roda diariamente (24h).
- Busca sessões com `eventType ∈ recurringTypes` AND `eventDate` cuja "data deste ano" cai em [hoje+90, hoje+89] / [hoje+30, hoje+29] / [hoje+7, hoje+6].
- Envia e-mail com **foto memória** (1ª thumb da sessão anterior) + CTA "vamos repetir?".
- Persiste trigger em `sentTriggers` com sufixo `reactivation_*` para idempotência por ano.

### `src/utils/email.js` (estender) — 7 funções novas
- `sendScarcity15dEmail` — escassez suave + reciprocidade (oferece 1 foto bônus)
- `sendScarcity7dEmail` — escassez crescente, contador de fotos
- `sendScarcity3dEmail` — desconto explícito (cupom)
- `sendScarcity24hEmail` — última chance (24h)
- `sendReactivation90dEmail` — "lembramos do seu aniversário" + foto do ano passado
- `sendReactivation30dEmail` — agenda
- `sendReactivation7dEmail` — última chance de reservar

Templates seguem padrão visual de `sendUpsellEmail` (linha 518–564 de `email.js`).

### `src/server.js`
```js
setInterval(salesAutomator.run, 6 * 60 * 60 * 1000);
setInterval(anniversaryAutomator.run, 24 * 60 * 60 * 1000);
```
Mais 1 chamada inicial no startup para não esperar o primeiro tick.

## Novas rotas

### `src/routes/sales.js` (novo)
- `GET /api/sales/dashboard` — galerias com fotos não vendidas, total pendente, recorrentes próximos.
- `GET /api/sales/coupons` — cupons emitidos (extraídos de `sentTriggers`).
- `POST /api/sales/coupons/:code/redeem` — marcar cupom como usado manualmente.
- `POST /api/sessions/:id/automation/toggle` — liga/desliga `salesAutomation.enabled` por sessão.

### `src/routes/clients.js` (estender)
- `GET /api/clients?segment=birthday_next_90d`
- `GET /api/clients?eventType=casamento`
- `GET /api/clients/:id/timeline` — sessões + e-mails enviados + cupons.

## Mudanças no Admin

### `admin/js/tabs/sessoes/modal-form.js`
- Campo **Tipo de evento** (select) após seleção do modo.
- Campo **Data do evento** (date picker) — opcional para gallery, recomendado para recorrentes.
- Toggle **Automação de vendas**.

### `admin/js/tabs/clientes.js` (estender, ainda < 600 linhas)
- Campo `birthDate` no modal.
- Filtros: `lastEventType`, proximidade de aniversário (próx 90d).
- Coluna "LTV" (placeholder = total de fotos selecionadas).
- Ação "Ver timeline".

### `admin/js/tabs/crm/` (nova pasta — estrutura grande)
- `index.js` — entry, abas internas: Scarcity / Reativação / Cupons.
- `state.js`
- `dashboard.js` — KPIs (fotos não vendidas, receita potencial, taxa upsell).
- `coupons.js` — lista com botão "marcar usado".
- `automacoes.js` — toggles globais por trilha + cadência.

Adicionar entrada no menu lateral entre "Sessões" e "Plano".

## Plano por fase

**Fase 1 — Modelos & migração (1 sessão)**
- Campos em Session, Client, Organization.
- `scripts/migrate-eventtype-default.js` populando `eventType='outro'`.
- Critério: `npm run check` passa, sessões antigas funcionam.

**Fase 2 — salesAutomator + scarcity (1 sessão)**
- `salesAutomator.js` + 4 templates.
- Wire em `server.js`.
- Toggle por org em `routes/organization.js`.
- Critério: sessão de teste com deadline 15d sem fotos selecionadas → trigger nos logs.

**Fase 3 — anniversaryAutomator + reativação (1 sessão)**
- 3 templates novos.
- Lógica "data deste ano" tratando 29/fev e timezone.
- Critério: sessão eventDate=hoje-365 → trigger 90d disparável.

**Fase 4 — Admin: eventType e clientes (1 sessão)**
- Forms estendidos, filtros, timeline.

**Fase 5 — Aba CRM (1 sessão)**
- Dashboard, cupons, toggles.

## Arquivos críticos

- [src/models/Session.js](../src/models/Session.js)
- [src/models/Client.js](../src/models/Client.js)
- [src/models/Organization.js](../src/models/Organization.js)
- [src/utils/email.js](../src/utils/email.js)
- [src/utils/salesAutomator.js](../src/utils/salesAutomator.js) — NOVO
- [src/utils/anniversaryAutomator.js](../src/utils/anniversaryAutomator.js) — NOVO
- [src/utils/deadlineChecker.js](../src/utils/deadlineChecker.js) — padrão de referência
- [src/routes/sales.js](../src/routes/sales.js) — NOVO
- [src/routes/clients.js](../src/routes/clients.js)
- [src/server.js](../src/server.js)
- [admin/js/tabs/sessoes/modal-form.js](../admin/js/tabs/sessoes/modal-form.js)
- [admin/js/tabs/clientes.js](../admin/js/tabs/clientes.js)
- [admin/js/tabs/crm/](../admin/js/tabs/crm/) — NOVA pasta
- [admin/index.html](../admin/index.html)

## Verificação end-to-end

1. `node -e "require('./src/models/Session')"` sem erro.
2. Após migration: `db.sessions.find({eventType:{$exists:false}}).count() === 0`.
3. **Scarcity manual:** sessão `selectionDeadline=now+15d`, `selectedPhotos.length < photos.length` → `salesAutomator.run()` → e-mail recebido.
4. **Reativação manual:** sessão `eventType='aniversario'`, `eventDate=hoje-275d` (=90d até próximo aniversário) → `anniversaryAutomator.run()` → e-mail com foto-memória.
5. **Idempotência:** 2 execuções consecutivas — segunda não reenvia (`sentTriggers`).
6. **Admin UI:** criar sessão `selection` → campo "Tipo de evento" aparece e salva.
7. **Playwright:** estender `tests/3_0_sessoes.spec.js` cobrindo eventType.
8. **Tema dark:** aba CRM em dark mode usando tokens CSS (regra do CLAUDE.md).

## Anti-escopo

- Funil visual / pipeline kanban — fase 2 do CRM.
- Payment gateway — `skills/3_0_payment-gateway.md`.
- Editor de templates de e-mail.
- Slideshow viral, métricas avançadas de marketing.
