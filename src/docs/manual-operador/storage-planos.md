# Planos, Preços e Medidor de Storage

> **Público-alvo:** EMPRESA define/controla · afeta o FOTÓGRAFO (que vê o próprio plano)
> **Onde no app:** catálogo no back; aba "Plano" do fotógrafo; controles no Super Admin
> **Código-fonte:** [src/models/plans.js](src/models/plans.js) (fonte única), [src/middleware/planLimits.js](src/middleware/planLimits.js), [src/models/Subscription.js](src/models/Subscription.js)
>
> *A cobrança em si (Mercado Pago, webhooks, reembolso) está na seção **Mercado Pago — Cobrança**. Aqui é o catálogo, o medidor e as cercas.*

---

## Os 4 tiers (fonte única: `plans.js`)

| Plano | Preço | Storage | Seats | Domínio próprio | Selo |
|---|---|---|---|---|---|
| **Free** | R$ 0 | **3 GB** (3072 MB) | 1 | ❌ | ✅ (marca CliqueZoom) |
| **Basic** | R$ 39 (`3900¢`) | **20 GB** (20480 MB) | 1 | ❌ | ❌ |
| **Pro** | R$ 119 (`11900¢`) | **150 GB** (153600 MB) | 2 | ✅ | ❌ |
| **Studio** | R$ 249 (`24900¢`) | **600 GB** (614400 MB) | 3 | ✅ | ❌ |

`price` em **centavos**; `limits.maxStorage` em **MB**; `seats` = usuários inclusos.

**Medidor ÚNICO = storage.** Sessões, fotos e álbuns são **ILIMITADOS** (`-1`) em todos os tiers. `plans.js` é a **fonte da verdade**: signup, webhook do MP, saasAdmin e o cálculo de preço/storage derivam daqui — nunca duplicar números.

---

## Capabilities (gating de feature por plano)

Cada plano tem um bloco `capabilities` (consumido no gating da Gestão/Rhyno). Destaques:
- `crm`: `'taste'` (Free, "gostinho") → `'full'` (Basic+).
- `importacaoMassa`: Basic+ (importar base de outro ERP).
- `iaGestao` + `integracaoAgenda`: Pro+ (IA da Gestão tem custo de token; integração Google Agenda).
- `financasEmpresa`/`tarefasMetas`: Pro+. `financasPessoal`/`gestaoMista`: Studio.
- `dominioProprio`: Pro+. `selo`: só Free.

> O **mapa autoritativo** módulo→capability da Gestão é tratado à parte (cerca da Gestão). Algumas cercas ainda não estão codadas no enforcement.

---

## Assinatura e medidor (`Subscription`)

Uma `Subscription` por org (`organizationId` único). Campos-chave:
- `plan` + `status` (`active`/`past_due`/`canceled`/`trialing`/`pending`).
- **Medidor (bytes), gravado pelo reconciliador diário** (varre o disco real):
  - `usage.storageQuotaBytes` — o que o plano LIMITA (só fotos de sessão; espelha a barra do painel do fotógrafo) → base do **gate**.
  - `usage.storageBytes` — disco total da org (sessions+site+vídeos); informativo para a operação.
  - `usage.storageReconciledAt` — quando reconciliou.
- **Add-on de storage recorrente:** `storageAddonGB` + `storageAddonPriceCents` (somados por cima do plano; sobrevivem à troca de plano).
- **Preço custom por org:** `customPriceCents` (> 0 sobrescreve o catálogo; vale só na próxima assinatura).
- **Override de limites:** `overrideEnabled` + `limits.*` (não são sobrescritos ao trocar de plano).

> A **verdade de exibição/enforcement** vem de `effectiveLimits(sub)`/`effectiveStorageMB(sub)` (derivam de `plans.js` + add-on + override), **não** do snapshot `sub.limits` (que pode estar defasado).

---

## Gate de storage (`checkStorageGate`)

[planLimits.js:82](src/middleware/planLimits.js#L82) — recusa **novo upload** quando `usado + chegando > limite`. Desenho de segurança:
- **Só bloqueia com `STORAGE_GATE_ENFORCE=true`.** Sem a flag = modo "medir e avisar" (loga o que bloquearia, deixa passar). A flag é o **rollback instantâneo** (sem redeploy).
- `limitBytes <= 0` (ex.: override `maxStorage=-1`) = **ILIMITADO** → nunca barra (isenção de contas grandes existentes).
- **Falha aberta:** qualquer erro interno deixa o upload passar (o gate nunca derruba upload legítimo por bug próprio).
- **`storageFrozen`** (congelamento comercial pós-reembolso) bloqueia novos uploads **independente** da quota e **sem** depender da flag.

> **Em produção:** `STORAGE_GATE_ENFORCE=true` desde 2026-06-26 (decisão do dono). Contas reais estão blindadas por override/isenção; só a fixture `rhynoproject` barra de fato.

---

## Cortesia & carência

- **Cortesia** (`Subscription.isCourtesy` + `courtesyNote`): conta sem cobrança (esposa, sócio, conta de admin). É rótulo/controle — some os CTAs de upgrade e exibe selo; os limites seguem o plano + override. **Fica FORA do MRR.** Contas cortesia/protegidas/override **nunca** são congeladas no revert por estorno.
- **Carência (`graceUntil`)**: prazo por org (definido pelo superadmin). Vencido sem regularizar, o `graceChecker` **suspende** a org (`Organization.isActive=false`, `suspendedReason='billing'`) — **nunca deleta** (offboarding ignora suspensão por billing).

---

## O que o SUPERADMIN pode ver/fazer

- **Tool `getBusinessMetrics`** — distribuição por plano, status de assinatura e **MRR POTENCIAL** (preço × assinaturas pagas ativas, **excluindo cortesia**). É teto teórico, não receita real.
- **Trocar plano:** via `proposeChangePlan` (proposta → superadmin confirma); ajusta `Organization.plan` + `Subscription` e tenta sincronizar o preço no MP.

---

## Gotchas

- **MRR ≠ receita real ≠ motor de vendas do fotógrafo.** São três coisas distintas — não misture.
- **Não duplicar números de plano:** sempre derive de `plans.js`.
- **`usage.storage` (MB)** é legado/morto; o medidor vivo é o de **bytes** (`storageQuotaBytes`/`storageBytes`).
