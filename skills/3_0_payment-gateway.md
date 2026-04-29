# Gateway de Pagamento — Guia e Referência (CliqueZoom)

> Leia esta skill quando o assunto for pagamento, checkout, assinatura, planos, pix, boleto, apple pay, google pay ou qualquer gateway de pagamento.

---

## O QUE É UM GATEWAY?

É o intermediário entre o seu app e os bancos/bandeiras. Ele processa o pagamento com segurança (PCI-DSS) e repassa o dinheiro para você. Você nunca toca nos dados do cartão diretamente.

**Fluxo básico:**
```
Cliente → Seu App → Gateway → Banco/Bandeira → Confirmação → Webhook → Seu App
```

O **webhook** é crítico: é a notificação que o gateway envia ao servidor quando o pagamento é confirmado (ou falha). Sem ele, o sistema nunca sabe se o pagamento foi realmente aprovado.

---

## MODELOS DE COBRANÇA

| Modelo | Descrição | Uso no CliqueZoom |
|---|---|---|
| **Assinatura/Recorrência** | Cobrança automática mensal/anual | Planos Basic/Pro dos fotógrafos |
| **One-time** | Cobrança única | Fotos extras para clientes finais |
| **Upsell pós-evento** | Cliente paga para liberar download | Backlog: Monetização Direta |

---

## PANORAMA DOS GATEWAYS

### 🇧🇷 Brasil

| Gateway | Pix | Boleto | Cartão BR | Recorrência | Taxa aprox. | Melhor para |
|---|---|---|---|---|---|---|
| **Mercado Pago** | ✅ | ✅ | ✅ | ✅ | ~3,49% | Início rápido, já configurado |
| **Pagar.me** | ✅ | ✅ | ✅ | ✅ | ~2,5% | APIs modernas, foco dev |
| **Iugu** | ✅ | ✅ | ✅ | ✅ | ~2,1% | SaaS/recorrência especializado |
| **Asaas** | ✅ | ✅ | ✅ | ✅ | ~1,99% | PMEs, NF integrada |
| **PagSeguro/UOL** | ✅ | ✅ | ✅ | ✅ | ~3,5% | Mercado BR consolidado |
| **Stripe** | ❌ | ❌ | ⚠️ intl | ✅ | 2,9%+R$0,50 | Clientes internacionais |

### 📱 Carteiras Digitais (Mobile)

| Carteira | Como funciona | Integração |
|---|---|---|
| **Apple Pay** | iPhone/Safari | Via gateway (Stripe, MP) + Apple Pay JS |
| **Google Pay** | Android/Chrome | Via gateway (Stripe, Braintree) + Google Pay API |
| **Mercado Pago app** | Carteira BR | SDK mobile do MP |

> Apple Pay e Google Pay **não são gateways** — são métodos de pagamento que se conectam a um gateway por baixo. Você configura o gateway e habilita esses métodos nele.

---

## ESTADO ATUAL DO CLIQUEZOOM

### Arquivos existentes

| Arquivo | Função |
|---|---|
| `src/routes/billing.js` | Rotas: GET /plans, GET /subscription, POST /checkout, POST /webhook, POST /cancel |
| `src/routes/payments.js` | Fotos extras: cria preferência Mercado Pago para cliente final |
| `src/middleware/stripe.js` | Cria checkout session e processa webhook (Stripe) |
| `src/middleware/mercadopago.js` | Cria preferência de fotos extras e tem webhook (MP) |
| `src/middleware/planLimits.js` | Bloqueia criação de sessões/fotos/álbuns por limite de plano |
| `src/models/Subscription.js` | Schema: plan, status, stripeCustomerId, limits, usage |
| `src/models/plans.js` | Definição estática: free (R$0), basic (R$49), pro (R$99) |
| `admin/js/tabs/plano.js` | Frontend: exibe plano atual, uso, botão de upgrade |

### O que já funciona
- Modelo `Subscription` completo com limites e contadores de uso
- Middleware `planLimits` aplicado nas rotas protegidas
- Frontend exibe plano e uso corretamente
- Mercado Pago tem token real configurado no `.env`
- Fotos extras via MP parcialmente funcional

### O que está quebrado / incompleto

**🔴 Crítico — Stripe não funciona:**
1. `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` ausentes do `.env`
2. Price IDs são placeholders (`price_1Qk...`) em `src/models/plans.js` linhas 25 e 45
3. `BASE_URL` ausente do `.env` — URLs de retorno do Stripe quebradas

**🟠 Webhook incompleto:**
4. Bug em `src/middleware/stripe.js:50` — `session.subscription` é string, não objeto. `currentPeriodEnd` nunca salvo
5. Eventos `invoice.payment_failed`, `invoice.payment_succeeded`, `customer.subscription.deleted` sem implementação
6. Renovações, falhas e cancelamentos não atualizam o plano automaticamente

**🟡 Mercado Pago para planos:**
7. Webhook do MP não tem rota registrada para planos — MP nunca confirma pagamento de plano
8. `createCheckoutSession` do MP existe em `mercadopago.js` mas não está roteado em `billing.js`

**🟢 UX:**
9. `plano.js` não lê `?payment=success` — usuário não vê confirmação pós-checkout

---

## RECOMENDAÇÃO DE CAMINHO

**Fase 1 — Rápido e funcional (prioridade)**
Usar **Mercado Pago para tudo** (token já configurado):
- Assinaturas dos fotógrafos via MP Subscriptions
- Fotos extras para clientes finais via MP Preferences
- Pix, cartão e boleto nativos

**Fase 2 — Mobile wallet**
Apple Pay / Google Pay via Mercado Pago SDK mobile (suporte nativo)

**Fase 3 — Internacionalização**
Avaliar Stripe se houver fotógrafos fora do Brasil

---

## CHECKLIST DE IMPLEMENTAÇÃO

### Backend
- [ ] Token/Key do gateway no `.env`
- [ ] Rota `POST /checkout` → cria sessão/preferência → retorna URL
- [ ] Rota `POST /webhook` → valida assinatura → atualiza banco
- [ ] Webhook atualiza: `plan`, `status`, `currentPeriodEnd`
- [ ] Webhook trata: aprovado, falha, cancelamento, renovação
- [ ] Limites de plano aplicados via middleware

### Frontend
- [ ] Tab de plano exibe plano atual + barras de uso
- [ ] Botão de upgrade chama rota de checkout
- [ ] Redirect pós-pagamento lido (`?payment=success`)
- [ ] Toast de confirmação exibido

### Testes
- [ ] Cartão de teste do gateway
- [ ] Webhook simulado localmente (Stripe CLI / MP ngrok)
- [ ] Fluxo completo: checkout → pagamento → webhook → plano atualizado

---

## VOCABULÁRIO

| Termo | Significado |
|---|---|
| **Webhook** | Notificação HTTP que o gateway envia quando algo muda |
| **Checkout session** | Sessão criada no gateway que gera URL para o cliente pagar |
| **Price ID** | ID de produto/preço no Stripe (ex: `price_1Abc...`) |
| **Preference ID** | Equivalente do Price ID no Mercado Pago |
| **PCI-DSS** | Norma de segurança de cartões — o gateway lida, não você |
| **Recorrência** | Cobrança automática periódica sem ação do cliente |
| **Chargeback** | Contestação de cobrança pelo cliente junto ao banco |
