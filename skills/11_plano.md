# Plano — Assinatura, Uso e Billing (CliqueZoom Admin)

> Documentação gerada em 2026-06-12 (programa de testes — módulo 10 de 12).
> Referência frontend: `admin/js/tabs/plano.js` (178 linhas)
> Referência backend: `src/routes/billing.js` (plans/subscription/checkout/webhook/cancel),
> `src/models/Subscription.js`, `src/models/plans.js` (tabela estática free/basic/pro)
> **Manual do usuário:** `admin/js/tabs/ajuda.js` → `MANUAL_MODULES_STATIC` (id: `plano`) — validado por screenshot (light+dark) em 2026-06-12.
> **Testes E2E:** `tests/local/18_plano.spec.js` — 11 testes, 11/11 verdes em 2026-06-12.

---

## 1. Visão Geral
Aba de leitura + 2 ações (upgrade quando Stripe ativo; cancelar). Mostra o plano atual com
**3 barras de uso** (sessões, fotos, armazenamento — cor por faixa: padrão → amarelo ≥70% →
vermelho ≥90% com aviso "⚠ Limite quase atingido"), breakdown do disco (Sessões/Site/Vídeos MB)
e os cards dos 3 planos (badge ATUAL; pagos com "Selecionar" se Stripe ativo, senão **"Em Breve"
desabilitado** + "Pagamentos online em breve"). Limite `-1` exibe **∞** e barra zerada.

## 2. Endpoints
| Rota | Comportamento |
|---|---|
| `GET /api/billing/plans` | **Pública** (tabela de preços, sem dado sensível). `{plans: {free,basic,pro}}` com price em centavos, limits e features |
| `GET /api/billing/subscription` | Autenticada. **Lazy-create**: cria sub `free/active` se não existir. Retorna `subscription` (plan/status/limits/usage/cancelAtPeriodEnd), `planDetails` (= plans[plan]), `stripeConfigured` (= env STRIPE_SECRET_KEY) e `usage{storageMB, breakdown{sessionsMB,siteMB,videosMB}}` — storage **calculado em disco** (getDirSize de `/uploads/<org>/{sessions,site,videos}`); respondeu em ~11ms no dev |
| `POST /api/billing/checkout` | Autenticada. Sem Stripe → 500 (sem checkoutUrl); o front nem mostra o botão nesse caso |
| `POST /api/billing/cancel` | Autenticada. Sem `stripeSubscriptionId` → **400 "Nenhuma assinatura ativa"**; com → `cancel_at_period_end` no Stripe + flag local |
| `POST /api/billing/webhook` | Stripe raw body + assinatura |

## 3. Detalhes que pegam
- **Limites vivem na Subscription** (copiados do plano; podem ser customizados por org — a org
  `teste` tem `-1` em maxSessions/maxPhotos para a suíte). A UI lê `subscription.limits`,
  não `plans[plan].limits`.
- `usage.sessions/photos` são contadores incrementais do model; `storageMB` é real (disco).
- Cancelamento: plano `free` não mostra o card; `pro` não mostra "Ver planos ↓".
- Sem bugs de app neste módulo. 2 correções foram de teste: (a) `getByText('Seu Plano')`
  colide com "Seu plano permanece ativo…" (match substring case-insensitive → strict mode);
  (b) "Sessões" colide com o item do menu — escopar em `#tabContent`.
- **Fix sistêmico achado na validação do manual:** círculos numerados do "Passo a passo" usavam
  `color:white` sobre `var(--accent)` — no dark o accent é #f2f2f2 e o número sumia. Trocado por
  `color:var(--bg-base)` nos 12 templates de `MANUAL_MODULES_STATIC`.

## 4. Caveats de teste
- Forçar faixas de cor: semear `limits.maxStorage`/`maxPhotos` na subscription via Mongo
  (snapshot + `replaceOne` de volta no finally) — uso real do dev é baixo.
- `test.skip(stripeConfigured)` no teste de checkout: ambiente com Stripe real sai do escopo.

---

## 5. Roteiro de Vídeo: Seu Plano Sem Surpresa

**Duração estimada:** 50 a 65 segundos
**Objetivo:** Mostrar que o fotógrafo controla uso e custo numa tela só.

### Cena 1: Abertura (0s - 8s)
- **Visual:** Painel admin; clique em "Plano" (grupo Conta).
- **Áudio (Locução):** "Quanto do seu plano você já usou? Essa resposta mora aqui."
- **Ação em Tela:** Card do plano atual abre com as 3 barras.

### Cena 2: Barras de Uso (8s - 28s)
- **Visual:** Zoom nas barras; uma amarela e uma vermelha com o aviso "⚠ Limite quase atingido".
- **Áudio (Locução):** "Sessões, fotos e espaço em disco — as barras mudam de cor sozinhas: amarelo passou de setenta por cento, vermelho é hora de agir. E o armazenamento aparece dividido: sessões, site e vídeos."
- **Ação em Tela:** Destaque no breakdown de MB.

### Cena 3: Planos (28s - 45s)
- **Visual:** Scroll até "Planos Disponíveis"; o card atual com etiqueta ATUAL.
- **Áudio (Locução):** "Aqui você compara os planos lado a lado. O upgrade online está chegando — enquanto isso, fale com o suporte que a gente resolve."
- **Ação em Tela:** Botões "Em Breve" nos planos pagos.

### Cena 4: Encerramento (45s - 55s)
- **Visual:** Relance do card de cancelamento.
- **Áudio (Locução):** "E se um dia precisar cancelar, sem pegadinha: você usa até o fim do período pago e volta ao gratuito. Simples assim."
- **Ação em Tela:** Fade out para o logo da CliqueZoom Academy.
