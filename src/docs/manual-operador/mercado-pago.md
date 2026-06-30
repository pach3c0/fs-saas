# Manual do Operador — Cobrança com Mercado Pago

> Documento interno do **dono/superadmin**. Descreve como a cobrança da CliqueZoom
> funciona sobre o Mercado Pago (MP): arquitetura, flags, máquina de estados,
> webhooks, cancelamento/estorno, cortesia, carência, conciliação e os
> procedimentos do dia a dia. **Não** é material para o fotógrafo.
>
> ⚠️ **Segredos nunca aparecem aqui.** Este manual cita o **nome** das variáveis de
> ambiente e o efeito delas — jamais o valor de `MERCADOPAGO_ACCESS_TOKEN` ou
> `MP_WEBHOOK_SECRET`. Para ver/alterar valores, vá ao `.env` do servidor.
>
> A cobrança é **real e está ligada em produção** (Flávia e Davi ativos). Qualquer
> ação que mexe em dinheiro exige máxima cautela.

---

## 1. Visão geral & arquitetura

A CliqueZoom cobra assinaturas mensais recorrentes via **Mercado Pago**. Há dois
caminhos no código; só o moderno está ativo:

- **Moderno (ativo): `PreApproval` avulsa.** Cada org tem uma assinatura própria com
  valor flexível (permite preço personalizado por org e adicional de storage). É o
  caminho usado quando `MP_USE_PREAPPROVAL=true`.
- **Legado (inativo): `PreApprovalPlan`.** Valor fixo atrelado a um "plano" no MP.
  Fica no código por compatibilidade, mas não é usado em produção.

O **cartão é tokenizado no navegador** (CardForm do MP, SDK v2) — a CliqueZoom nunca
toca no número do cartão (PCI fica com o MP). Dois desfechos no checkout:

- **`authorized`** → a assinatura **nasce ativa** na hora (sem redirecionamento).
- **`pending`** → cartão em análise no MP (pode levar minutos/horas).

Depois do checkout, **quem comanda o estado é o webhook do MP**: ele avisa quando uma
fatura é aprovada/recusada/estornada, e o backend ajusta a assinatura.

**Arquivos-chave:**

| Camada | Arquivo |
|---|---|
| Integração MP (SDK, checkout, webhook, refund, revert) | `src/middleware/mercadopago.js` |
| Rotas de billing (subscription, checkout, cancel, refund, webhook) | `src/routes/billing.js` |
| Modelo da assinatura | `src/models/Subscription.js` |
| Catálogo de planos (fonte única) | `src/models/plans.js` |
| Preço/limite/capability efetivos | `src/services/subscriptionPricing.js` |
| Carência + retry de cancelamento | `src/utils/graceChecker.js` |
| Fim de ciclo (cancelamento agendado) | `src/utils/subscriptionPeriodChecker.js` |
| Conciliação MRR × MP (read-only) | `src/services/mpReconciliation.js` |
| Contas protegidas | `src/utils/protectedOrgs.js` |

---

## 2. Ligar / desligar a cobrança

A cobrança inteira gira em torno de quatro variáveis. Sem `MERCADOPAGO_ACCESS_TOKEN`
o SDK nem inicializa (`mercadopago.js`) — o billing fica inerte.

| Variável | Papel | Sem ela |
|---|---|---|
| `MP_USE_PREAPPROVAL` | Liga o billing moderno (PreApproval avulsa + CardForm). | `false`/ausente → checkout legado; webhooks novos não disparam. **Nada muda para quem já usa.** |
| `MERCADOPAGO_ACCESS_TOKEN` | Token secreto do servidor; sem ele o SDK não sobe. Em produção começa com `APP_USR-`. | MP desligado por completo. |
| `MERCADOPAGO_PUBLIC_KEY` | Chave pública usada no navegador (CardForm tokeniza o cartão). | Cai no checkout hospedado. |
| `MP_WEBHOOK_SECRET` | Valida a assinatura HMAC dos webhooks. | Webhooks são **aceitos sem verificação** (modo dev). Em produção, **sempre setar**. |

**Para LIGAR a cobrança de verdade** (estado atual: ligada): além do flag, é preciso
ter token de produção (`APP_USR-`), a `MP_WEBHOOK_SECRET` configurada no painel do MP e
no `.env`, e **as contas protegidas listadas** (seção 3). Veja o runbook 13.1.

**Para DESLIGAR sem quebrar:** setar `MP_USE_PREAPPROVAL` para algo diferente de `true`
e recarregar. O código volta ao caminho legado; ninguém é cobrado por engano.

---

## 3. Variáveis de ambiente & proteções

Estas variáveis blindam contas reais contra qualquer rebaixamento/suspensão automático.
São a rede de segurança do billing.

| Variável | Efeito | Risco se vazia/errada |
|---|---|---|
| `PROTECTED_ORG_SLUGS` | Lista (separada por vírgula) de orgs que **nunca** são revertidas/suspensas automaticamente (Flávia, Davi, fixtures). | **OBRIGATÓRIA com `MP_USE_PREAPPROVAL=true`.** Vazia → um estorno/chargeback pode rebaixar uma conta real. |
| `OWNER_SLUG` | Slug do dono; é adicionado automaticamente à lista de protegidos. | Conta do dono desprotegida. |
| `STORAGE_GATE_ENFORCE` | `true` → o gate de storage **bloqueia** upload acima do limite. Ausente → só mede e avisa nos logs. | Sem enforcement, ninguém é barrado por storage (decisão do dono manda). |
| `MP_TEST_PAYER_EMAIL` | Override de sandbox: força o e-mail do pagador. **Presente = ambiente NÃO é live** → o refund automático cai no modo manual. | Em produção deve estar **ausente**. |
| `GRACE_WARN_DAYS` | Dias de antecedência do aviso de carência (padrão 7). | Usa o padrão. |

O guard lê os slugs em `src/utils/protectedOrgs.js` (`isProtectedSlug(slug)`), sempre em
minúsculas. O `OWNER_SLUG` entra na lista mesmo que não esteja em `PROTECTED_ORG_SLUGS`.

---

## 4. Planos, preços e medidor de storage

A **fonte única** dos planos é `src/models/plans.js` — todas as outras camadas derivam
dela (saasAdmin, signup, webhook, pricing). O **único medidor é storage**; sessões,
fotos e álbuns são ilimitados (`-1`) em todos os tiers.

| Plano | Preço/mês | Storage | Seats | Domínio próprio | Selo na galeria |
|---|---|---|---|---|---|
| Free | R$ 0 | 3 GB (3072 MB) | 1 | não | **sim (selo CZ)** |
| Basic | R$ 39 (3900¢) | 20 GB (20480 MB) | 1 | não | não |
| Pro | R$ 119 (11900¢) | 150 GB (153600 MB) | 2 | sim | não |
| Studio | R$ 249 (24900¢) | 600 GB (614400 MB) | 3 | sim | não |

- **Add-on de storage recorrente:** `storageAddonGB` + `storageAddonPriceCents` na
  assinatura. O limite efetivo soma `plano + addon` e o valor mensal soma
  `preço base + addon` — ver `effectiveMonthlyCents()`/`effectiveStorageMB()` em
  `src/services/subscriptionPricing.js`.
- **Preço personalizado por org:** `customPriceCents` (quando `> 0`) substitui o preço
  do catálogo no cálculo do valor que vai ao MP.
- **Gate de storage:** `src/middleware/planLimits.js` (`checkStorageGate`) compara
  `usage.storageQuotaBytes + entrada` com o limite efetivo. Bloqueia com HTTP 403
  `STORAGE_FULL` quando `STORAGE_GATE_ENFORCE=true`. Contas com override/protegidas/
  cortesia não são barradas; em erro interno, **falha aberta** (deixa subir).

> Regra de ouro de preço/limite: **sem override, o limite vale SEMPRE o do plano atual
> em `plans.js`** (o `sub.limits` gravado pode estar defasado e é ignorado). Com
> override, valem os limites customizados pelo superadmin.

---

## 5. Máquina de estados da assinatura

Campo `status` em `src/models/Subscription.js`. Estados:

| Status | Significado |
|---|---|
| `free` (plano) | Sem assinatura paga. |
| `pending` | Aguardando 1ª liquidação (cartão em análise ou cobrança iniciada pelo admin). |
| `active` | Assinatura paga e em dia. |
| `past_due` | Fatura recorrente recusada; o MP reagenda/retenta. |
| `canceled` | Cancelada (sem novas cobranças). |
| `trialing` | Reservado; não usado no fluxo atual. |

**Campos críticos para a cobrança:**

- `mpPreapprovalId` — id da assinatura no MP (índice **parcial** único: só indexa quando
  é string, então várias contas Free com `null` convivem sem colisão).
- `subscribedAt` — quando a assinatura paga ativou. **Base dos 7 dias do CDC.**
- `firstPaymentId` — `payment.id` da **1ª fatura** (alvo do estorno integral).
- `currentPeriodEnd` — fim do ciclo já pago (vem do `next_payment_date` do MP).
- `cancelAtPeriodEnd` — marcado no cancelamento simples; acesso até o fim do ciclo.
- `previousPlan` — plano antes da troca (distingue 1ª compra de upgrade no refund).
- `revertedAt` — carimbo terminal de reversão por estorno/chargeback (anti-ressurreição).
- `refundInFlight` — trava atômica durante um refund (evita duplo-clique).
- `storageFrozen` — pós-refund: bloqueia uploads novos e venda automática de extras.
- `graceUntil` / `graceWarnedAt` — prazo de regularização e aviso enviado.
- `isCourtesy` / `courtesyNote` — conta cortesia (sem cobrança).
- `overrideEnabled` / `limits` — limites customizados pelo superadmin.

**Desenho "a 1ª fatura precisa liquidar":** o que prova que a assinatura está paga é a
**1ª fatura aprovada** (webhook), não o checkout em si. Por isso o `firstPaymentId` só é
gravado quando a 1ª fatura é aprovada. Enquanto isso, o front deve mostrar estado
"confirmando pagamento" assíncrono — a 1ª fatura pode cair de minutos a **horas** depois
do checkout (variação real observada: ~13 min num caso, ~55 min em outro).

---

## 6. Webhooks

Endpoint: `POST /billing/webhook` (`src/routes/billing.js` → `handleWebhook` em
`mercadopago.js`). Tópicos tratados:

| Tópico | Para quê |
|---|---|
| `subscription_preapproval` | Ciclo de vida da assinatura (authorized/paused/cancelled). |
| `subscription_authorized_payment` | Cada **fatura recorrente** (approved/rejected/refunded/charged_back). |
| `topic_chargebacks_wh` / `chargebacks` | Contestação no cartão. |
| `payment` | Rede de segurança: pagamento avulso (ex.: foto extra) ou fatura que escapou. |

**Validação HMAC** (`verifyWebhookSignature`): header `x-signature` no formato
`ts=<unix>,v1=<hash>`; o manifesto é `id:<dataId>;request-id:<x-request-id>;ts:<ts>;`,
validado por HMAC-SHA256 com `MP_WEBHOOK_SECRET` e comparação *timing-safe*. Sem o
segredo, o webhook é aceito sem bloquear (modo dev) — em produção, **sempre com segredo**.

**Idempotência em camadas** (reentrega do MP não duplica efeito):

- `lastEventId` — eventos de `subscription_preapproval`.
- `lastPaymentEventId` — faturas de `subscription_authorized_payment`.
- `refundedPaymentIds[]` — dedup de estorno por `payment.id` (cross-tópico: o mesmo
  estorno chega por tópicos diferentes com ids de notificação distintos).

**Normalização de status MP → interno:** `authorized→active`, `paused→past_due`,
`cancelled→canceled`, `pending→pending`; desconhecido → `past_due` (seguro).

---

## 7. Trocar de plano (sem pró-rata)

Quando um assinante ativo troca de plano (`createCheckoutSession`, caminho de update em
`mercadopago.js`):

1. Atualiza o valor da `PreApproval` no MP **antes** de mudar o local (se o save falhar,
   reverte o valor no MP).
2. Libera as features do novo plano **na hora**.
3. O **valor cheio novo só entra na próxima fatura** — não há cobrança avulsa do delta
   agora, nem reembolso de diferença no downgrade.

O que o cliente vê: as features mudam imediatamente; a fatura no novo valor chega no
próximo ciclo. Decisão registrada: pró-rata na hora foi avaliada e **adiada** (o MRR de
longo prazo é idêntico; o único ganho seria o caixa de uma fração de mês).

> Pendência conhecida: o ramo "reverter upgrade / estornar delta" depende de o upgrade
> passar a cobrar o delta — hoje, como não cobra delta, não há o que estornar nesse caso.

---

## 8. Cancelamento (revelação progressiva) + reembolso CDC 7 dias

A tela do Plano mostra **um único botão "Cancelar Plano"** (o "pedir reembolso" saiu da
vitrine de propósito — não induzir o cliente). O fluxo:

1. **Etapa 1 (neutra):** "Tem certeza?" — não menciona reembolso.
2. **Etapa 2:** se elegível (`refund.canRefund`), revela o arrependimento + **estorno
   automático integral** via `POST /api/billing/refund`. Senão, **cancelamento simples**
   via `POST /api/billing/cancel` (acesso até o fim do período já pago).

**Elegibilidade de reembolso** (`refundEligibility` em `billing.js`): 1ª compra
(`previousPlan` vazio/`free`), plano pago, dentro de **7 dias** de `subscribedAt`, status
`active`, **não** cortesia, **não** override. A janela é contada por **dia cheio** em
fuso Brasil (UTC-3): termina às 23:59:59 do 7º dia (pró-consumidor).

**Cancelamento simples** (`POST /billing/cancel`): lê `next_payment_date` do MP → grava
`currentPeriodEnd`; cancela a recorrência no MP; marca `cancelAtPeriodEnd=true`. O
rebaixamento para Free só ocorre quando o ciclo vence (scheduler, seção 11). Se o cancel
no MP der erro transiente, marca `mpCancelPending=true` (o `graceChecker` retenta).

**Reembolso automático** (`POST /billing/refund`):

1. Guards (cortesia/override/protegida → 403; fora da janela/upgrade → 422).
2. Trava atômica `refundInFlight` (duplo-clique → 409).
3. Acha o `payment.id`: usa `firstPaymentId`; se faltar e o ambiente for **live**, busca
   no MP por `external_reference=orgId` + valor exato + status `approved`
   (`findRefundablePreapprovalPayment`, confirma com `Payment.get`, aborta se houver mais
   de um candidato).
4. **Ambiente live** (token `APP_USR-` + flag on + sem `MP_TEST_PAYER_EMAIL`): dispara
   `refundPayment(payId, idemKey)` com idempotência determinística.
5. Reverte para Free com **congelamento** (`storageFrozen=true`).

Se **não for live** ou faltar `payment.id`: cancela a recorrência, reverte localmente e
marca para **estorno manual** no painel do MP (resposta avisa "em até alguns dias úteis").
Ver runbook 13.3.

> Provado ao vivo (qa-cobranca): estorno de **R$5 real** → `plan=free`, `status=canceled`,
> `mpPreapprovalId` removido, pagamento `refunded`.

---

## 9. Estorno / chargeback (webhook)

Quando uma fatura chega como `refunded`, `charged_back`, ou estorno parcial que acumula
100%, o webhook chama `handleRefundRevert` → `revertSubscriptionToFree`:

- Dedup por `payment.id` (`refundedPaymentIds`).
- Reverte: `plan='free'`, `status='canceled'`, zera `customPriceCents`/addons/grace,
  carimba `revertedAt`, e reseta `limits` do plano (se não houver override).
- **Chargeback** (`suspend:true`): além do revert, **suspende a org**
  (`isActive=false`, `suspendedReason='chargeback'`) — os dados ficam (são evidência da
  disputa); nunca apaga.
- **Anti-ressurreição (CDC Art. 42):** com `revertedAt` setado, um webhook `authorized`
  que chegue atrasado **é ignorado** (não recobra pós-estorno). Só um **novo checkout**
  limpa `revertedAt`.
- **Guards:** contas protegidas / override / cortesia são **puladas** (retorna `skipped`).

---

## 10. Cortesia & exit-cortesia

- **Cortesia** (`isCourtesy=true`): conta sem cobrança (esposa, sócio, fixture). Fica
  **fora do MRR**, **proibida no Free**, e "enxerga tudo". Nunca é cobrada nem suspensa;
  o webhook de fatura tem filtro `isCourtesy: { $ne: true }` para nunca mudar o status dela.
- **Exit-cortesia** (sair da cortesia e começar a pagar): o superadmin define um prazo
  (`graceUntil`). Fluxo provado: **Iniciar cobrança → `pending` → cliente Paga → `active`**;
  se não pagar até o prazo, o `graceChecker` suspende. O botão "Iniciar cobrança" encerra
  a cortesia e coloca `status=pending` **sem cortar o acesso**; o cliente vê "Pagar agora".

---

## 11. Carência (`graceUntil`) & schedulers

Dois robôs diários cuidam do billing (rodam só no worker 0 do PM2; desligados em
beta/staging). Telemetria em `SchedulerRun`.

**`graceChecker`** (`src/utils/graceChecker.js`):

1. **Retry de cancelamento pendente:** orgs com `mpCancelPending=true` → re-tenta cancelar
   no MP; erro definitivo solta o id, transiente fica para a próxima rodada.
2. **Aviso de carência:** faltando ≤ `GRACE_WARN_DAYS` (7) e sem `graceWarnedAt` → manda
   e-mail e carimba `graceWarnedAt`.
3. **Suspensão:** prazo vencido → `isActive=false`, `suspendedReason='billing'`, e-mail de
   suspensão, zera o grace. **Protegidas nunca são suspensas.** Reativação é manual
   (endpoint `/approve`). O `offboardingChecker` **ignora** suspensão por billing/chargeback
   → conta suspensa por cobrança **não é excluída** automaticamente.

**`subscriptionPeriodChecker`** (`src/utils/subscriptionPeriodChecker.js`): para
`cancelAtPeriodEnd=true` + plano pago + `currentPeriodEnd` vencido → reverte para Free
(`reason='cancel_period_end'`, sem suspender, sem congelar). O filtro exige
`currentPeriodEnd: { $ne: null }` — `null` ordena abaixo de qualquer data no BSON e
rebaixaria cedo demais sem esse guard.

---

## 12. Conciliação MRR projetado × recorrente no MP

No Super Admin (Dashboard), o card **"Conciliação Mercado Pago"** mostra, ao vivo e
read-only, dois números lado a lado por assinatura:

- **Projeção (nossos registros):** soma de `effectiveMonthlyCents` das subs `active`/
  `past_due` não-cortesia — é o MRR do topo. É instantâneo: muda no webhook.
- **Recorrente no MP:** valor/status lidos da ficha da `PreApproval` no MP
  (`getPreapproval`). Reflete o dinheiro real com atraso de minutos/horas/dias.

Flags de divergência por linha: `status_mismatch` (nós contamos, MP não está
`authorized`), `amount_mismatch` (valor do MP ≠ projeção — ex.: preço custom mudado sem
sync), `outside_mp` (sem `mpPreapprovalId`: legado/override/pago por fora — não é erro),
`mp_error` (degrada a linha, não derruba o lote). Serviço: `src/services/mpReconciliation.js`
(concorrência 4, timeout 4s/chamada, micro-cache 30s).

A 3ª coluna ("Caixa recebido de fato") é a **Fase 2** (livro-caixa `BillingTransaction`
append-only gravado a cada webhook de dinheiro) — ainda pendente.

---

## 13. Runbooks (passo a passo)

### 13.1 Ligar a 1ª cobrança real
1. Confirme no `.env` de produção: `MERCADOPAGO_ACCESS_TOKEN` começa com `APP_USR-`,
   `MERCADOPAGO_PUBLIC_KEY` setada, `MP_WEBHOOK_SECRET` setada (e igual ao painel do MP).
2. Confirme `PROTECTED_ORG_SLUGS` (Flávia, Davi, fixtures) e `OWNER_SLUG`.
3. Confirme a URL de webhook no painel do MP apontando para `/billing/webhook`.
4. Set `MP_USE_PREAPPROVAL=true` e recarregue o app (PM2 reload).
5. Faça uma assinatura real de teste numa fixture **não protegida** (ex.: qa-cobranca);
   para cobrar pouco, ajuste `customPriceCents` antes do checkout.
6. Acompanhe o webhook: a 1ª fatura pode demorar de minutos a horas.

### 13.2 Conferir o MRR ao vivo
- Super Admin → Dashboard → card **Conciliação Mercado Pago**. Compare Projeção × MP;
  investigue qualquer `amount_mismatch`/`status_mismatch`. `outside_mp` é esperado para
  legado/override/pago-por-fora.

### 13.3 Estornar manualmente no painel do MP
Use quando o auto-refund caiu no modo manual (ambiente não-live ou sem `payment.id`):
1. No painel do MP, localize o pagamento da org (busca por `external_reference` = id da
   org) e faça o estorno integral lá, **dentro dos 7 dias do CDC**.
2. O webhook `refunded` chega e reverte a assinatura sozinho (ou já foi revertida
   localmente no fluxo manual). Confirme `plan=free` / `status=canceled`.

### 13.4 Diagnosticar "1ª cobrança recusada"
- O motivo está em `payment.status_detail` (autoritativo): `cc_rejected_high_risk` =
  recusa **dura** (cancela); `accredited` = aprovada. **Não** confie em `summarized`
  (`last_charged_date` vem `null` mesmo com fatura existente).
- Leitura read-only em produção: rode o script Node **dentro de `/var/www/cz-saas`**
  (o `require` resolve relativo ao diretório do script). Use `getPreapproval(id)`,
  `GET /v1/payments/search?external_reference=<orgId>`, `Payment.get({id})`. **Nunca**
  escrever em assinatura real.

### 13.5 Suspender / reativar uma org
- Suspensão por billing é automática (carência vencida) ou manual no painel. Reativar:
  endpoint `/approve` (Super Admin → Organizações). Conta suspensa por billing/chargeback
  **não** é excluída pelo offboarding.

---

## 14. Troubleshooting & gotchas

- **Timing assíncrono:** a 1ª fatura cai depois do checkout (min→h). Poll síncrono curto
  é inútil; o estado correto é "confirmando pagamento" assíncrono.
- **`status_detail` é a verdade**, não `summarized`.
- **Índice de `mpPreapprovalId`:** é único **parcial** (só quando string) — resolve o
  E11000 do 2º cadastro com `null`. Não recriar como `unique+sparse`.
- **Cortesia × cobrança:** todo handler de fatura filtra `isCourtesy: { $ne: true }`.
  Cortesia jamais deve ser cobrada/suspensa.
- **Protegidas:** se `PROTECTED_ORG_SLUGS` esvaziar com a cobrança ligada, um estorno pode
  rebaixar conta real. Tratar como incidente.
- **Refund manual silencioso:** com `MP_TEST_PAYER_EMAIL` setado, o refund nunca toca o MP
  (modo manual) — em produção essa var deve estar ausente.
- **Erro antigo nos logs:** agente do SaaS Admin já registrou modelo inexistente
  (`'GPT-5.4 mini'`); é ruído conhecido, não billing.

---

## 15. Glossário & mapa de arquivos

- **PreApproval (avulsa):** assinatura recorrente no MP com valor flexível — o modelo
  ativo. `getPreapproval`/`updatePreapprovalAmount`/`cancelPreapproval` em
  `mercadopago.js`.
- **CardForm:** formulário do MP que tokeniza o cartão no navegador.
- **`external_reference`:** carimbo que liga um pagamento à org (id puro) ou à sessão
  (`orgId:sessionId`, foto extra).
- **MRR projetado:** `effectiveMonthlyCents` somado das subs pagas ativas — potencial, não
  caixa.
- **Reembolso CDC (Art. 49):** arrependimento em 7 dias da 1ª compra → integral + Free.
- **Anti-ressurreição (Art. 42):** `revertedAt` impede recobrar após estorno.

| Assunto | Arquivo |
|---|---|
| Checkout / update / webhook / refund / revert | `src/middleware/mercadopago.js` |
| Rotas subscription/checkout/cancel/refund/webhook | `src/routes/billing.js` |
| Pagamento de foto extra | `src/routes/payments.js` |
| Modelo da assinatura | `src/models/Subscription.js` |
| Catálogo de planos | `src/models/plans.js` |
| Preço/limite efetivos | `src/services/subscriptionPricing.js` |
| Carência + retry cancel | `src/utils/graceChecker.js` |
| Fim de ciclo | `src/utils/subscriptionPeriodChecker.js` |
| Conciliação MRR × MP | `src/services/mpReconciliation.js` |
| Contas protegidas | `src/utils/protectedOrgs.js` |

---

## 16. Pendências conhecidas

- **Furo "1ª cobrança recusada":** a sub pode ficar em limbo (`past_due` com acesso pago).
  Desenho do MVP já calibrado (a 1ª fatura — recusada e aprovada — chega no tópico
  `subscription_authorized_payment`); falta implementar o "born-pending que ativa só na
  liquidação" + capturar `status_detail` + estado assíncrono no front. **Não implementado.**
- **Ramo upgrade/delta no cancelamento:** depende de o upgrade cobrar o delta pró-rata
  (decisão aberta a/b). Hoje upgrade é sem pró-rata → não há delta a estornar.
- **Plano ANUAL + multa/fidelidade:** aprovado em princípio, **não mexer ainda**. Dentro
  de 7 dias = reembolso integral sempre (CDC); pós-7d mensal = só não renova; anual =
  fidelidade só se estiver no contrato (exige ToS/Termos).
- **Conciliação Fase 2 (caixa recebido):** livro-caixa `BillingTransaction` append-only
  gravado nos webhooks de dinheiro — pendente.
- **Auto-serviço de storage add-on + migração `/uploads`→Object Storage:** pendente para
  vender o adicional de storage.
