# Integração Mercado Pago — Checkout por Fotógrafo

> **Status:** 📋 Documentação / Design (implementação para amanhã)  
> **Data:** 2026-06-25  
> **Modelo:** Marketplace descentralizado — cada fotógrafo vincula sua conta MP

---

## 🎯 Objetivo

Fotógrafos podem cobrar automaticamente dos seus clientes pelo acesso às fotos selecionadas, usando suas próprias contas Mercado Pago. CliqueZoom oferece a ferramenta (infraestrutura) e desconta uma taxa de comissão.

---

## 📊 Modelo de Negócio

### Fluxo de Pagamento
```
1. Cliente seleciona fotos na sessão
2. Clica "Pagar para receber fotos"
3. Mercado Pago (credenciais do fotógrafo)
   ├─ Cliente paga R$ 300,00
   ├─ MP desconta taxa (~2.99% + R$0.39)
   └─ Fotógrafo recebe ~R$ 291,00

4. CliqueZoom desconta comissão
   └─ Fotógrafo recebe R$ 288,00 (ex: 1% comissão)

5. Fotos liberadas → cliente baixa
```

### Contabilidade (Segura)
- **Fotógrafo:** Emite NF ao cliente dele (valor total)
- **CliqueZoom:** Emite NF ao fotógrafo (apenas comissão: 1% de R$ 300 = R$ 3)
- **Zero confusão fiscal:** Cada um é responsável pelo seu recebimento

---

## 🔧 Arquitetura Técnica

### 1. Cadastro de Credenciais (OAuth MP)

**Localização:** Painel do fotógrafo → Aba "Integrações"

**Campo no BD (Model Organization):**
```javascript
mpIntegration: {
  accessToken: String,      // Criptografado AES-GCM
  refreshToken: String,     // Criptografado AES-GCM
  connectedAt: Date,
  connectedBy: String,      // email do fotógrafo
}
```

**Fluxo OAuth:**
1. Botão: "Conectar Mercado Pago"
2. Redireciona: `https://auth.mercadopago.com/authorization?...`
   - `client_id`: variável de ambiente `MERCADOPAGO_CLIENT_ID`
   - `response_type`: `code`
   - `redirect_uri`: `https://{OWNER_SLUG}.{BASE_DOMAIN}/admin/auth-callback/mercadopago`
3. MP redireciona com `code`
4. Backend (`POST /api/integrations/mercadopago/callback`):
   - Troca `code` por `access_token` + `refresh_token`
   - Encripta ambos (AES-GCM)
   - Salva em `Organization.mpIntegration`
   - Redireciona pro admin com ✅ sucesso

### 2. Modelo de Preço

**Campo no BD (Model Session):**
```javascript
pricing: {
  amount: Number,           // R$ em centavos (ex: 30000 = R$ 300)
  currency: String,         // "BRL"
  description: String,      // "15 fotos selecionadas"
  setBy: String,            // "photographer" | "system"
  setAt: Date,
}

payment: {
  status: String,           // "pending" | "approved" | "rejected"
  mpPreferenceId: String,   // ID da preferência no MP
  mpPaymentId: String,      // ID do pagamento (após conclusão)
  approvedAt: Date,
  failureReason: String,    // motivo da rejeição (se houver)
}
```

**Quem define o valor:**
- V1 (atual): Fotógrafo define no wizard de criação da sessão (campo "Valor de venda" em R$)
- V2 (futuro): Por pacote / por foto extra / por tabela de preços

---

## 📍 Fluxo de Pagamento (Modo Seleção)

### Cliente — Ao terminar seleção

**Etapa atual (sem pagamento):**
```
Estado: Seleção completa
├─ Botão: "Enviar para fotógrafo"
└─ Redireciona: /download-all (ZIP das fotos)
```

**Novo (com pagamento):**
```
Estado: Seleção completa
├─ Card "Pagamento"
│  ├─ Foto: 15 fotos
│  ├─ Valor: R$ 300,00
│  └─ Botão: "Pagar para receber fotos"
│
└─ (Se já pagou)
   └─ Botão: "Baixar fotos" (ativo)
```

### Backend — Endpoint de Checkout

**POST `/api/sessions/:id/checkout`**

```javascript
// Validações
1. Sessão existe e é do modo "selection"
2. Cliente completou a seleção (selectedPhotos.length > 0)
3. Fotógrafo tem MP vinculado (Organization.mpIntegration.accessToken)
4. Sessão ainda não foi paga (Session.payment.status !== 'approved')

// Ações
1. Decrypt mpAccessToken (AES-GCM)
2. Criar MercadopagoClient(accessToken)
3. Montar preferência:
   {
     payer: { 
       email: client.email,
       name: client.name 
     },
     items: [{
       title: `${selectedPhotos.length} fotos selecionadas`,
       quantity: 1,
       unit_price: Session.pricing.amount / 100  // centavos → reais
     }],
     back_urls: {
       success: `https://{OWNER_SLUG}.{BASE_DOMAIN}/cliente/sessao/${sessionId}?payment=success`,
       failure: `https://{OWNER_SLUG}.{BASE_DOMAIN}/cliente/sessao/${sessionId}?payment=failure`,
       pending: `https://{OWNER_SLUG}.{BASE_DOMAIN}/cliente/sessao/${sessionId}?payment=pending`
     },
     external_reference: sessionId,
     metadata: {
       sessionId,
       organizationId,
       clientId
     }
   }
4. Criar preferência via MP SDK
5. Salvar: Session.payment.mpPreferenceId = response.id
6. Retornar: { redirect_url: response.init_point }

// Resposta
{
  "redirect_url": "https://www.mercadopago.com.br/checkout/v1/...",
  "status": "pending"
}
```

**Erros esperados:**
- 404: Sessão não existe
- 403: Cliente não tem permissão
- 402: Fotógrafo não tem MP vinculado
- 400: Seleção vazia
- 500: Erro na criação da preferência (MP indisponível)

---

## 🔔 Webhook Mercado Pago

**Evento:** `payment.notification`

**POST `/webhooks/mercadopago`**

```javascript
// 1. Validar assinatura
const signature = req.headers['x-signature']
const requestId = req.headers['x-request-id']
// Usar algoritmo oficial MP: HMAC(SHA256, signature_secret, request_id + request_body)

// 2. Extrair dados
const { data: { id: mpPaymentId }, action } = req.body
// action = "payment.created" | "payment.updated"

// 3. Se payment.created ou payment.updated
const mpPayment = await mpClient.payment.findById(mpPaymentId)
// mpPayment.status = "approved" | "rejected" | "pending" | "cancelled"
// mpPayment.external_reference = sessionId

// 4. Encontrar sessão
const session = await Session.findById(mpPayment.external_reference)

// 5. Atualizar Session.payment
if (mpPayment.status === 'approved') {
  Session.payment.status = 'approved'
  Session.payment.mpPaymentId = mpPaymentId
  Session.payment.approvedAt = new Date()
  
  // Email ao cliente: "✅ Pagamento confirmado"
  await emailService.sendPaymentApproved(session, client)
} else if (mpPayment.status === 'rejected') {
  Session.payment.status = 'rejected'
  Session.payment.failureReason = mpPayment.status_detail
}

// 6. Log
req.logger.info(`Payment ${mpPaymentId} → ${mpPayment.status} (Session ${sessionId})`)

// Retornar 200 (MP exige resposta rápida)
res.json({ ok: true })
```

**Configuração no Painel MP:**
- URL: `https://api.cliquezoom.com.br/webhooks/mercadopago`
- Eventos: `payment.created`, `payment.updated`

---

## 🎨 Frontend (Cliente)

### gallery.js — Seção de Pagamento

```javascript
// Após seleção estar completa

const renderPaymentCard = () => {
  const isPaid = session.payment?.status === 'approved'
  const isProcessing = session.payment?.status === 'pending'
  
  return `
    <div class="payment-card" style="...">
      <h3>💳 Pagamento</h3>
      
      <div class="amount">
        <span class="label">Valor:</span>
        <span class="value">R$ ${(session.pricing.amount / 100).toFixed(2)}</span>
      </div>
      
      <div class="photos-count">
        <span class="label">Fotos:</span>
        <span class="value">${selectedPhotos.length}</span>
      </div>
      
      ${isPaid ? `
        <div class="status-approved">
          ✅ Pagamento confirmado
        </div>
      ` : isProcessing ? `
        <div class="status-pending">
          ⏳ Processando...
        </div>
      ` : `
        <button class="btn-primary" onclick="checkoutMercadopago()">
          Pagar com Mercado Pago
        </button>
      `}
    </div>
  `
}

async function checkoutMercadopago() {
  try {
    const res = await fetch(`/api/sessions/${sessionId}/checkout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    
    if (!res.ok) throw new Error(await res.text())
    
    const { redirect_url } = await res.json()
    window.location.href = redirect_url  // Redireciona ao MP
  } catch (err) {
    showToast('❌ Erro ao processar pagamento', 'error')
    req.logger.error(err)
  }
}

// Após retorno do MP (query string ?payment=success|failure|pending)
function handleMercadopagoReturn() {
  const status = new URLSearchParams(location.search).get('payment')
  
  if (status === 'success') {
    showToast('✅ Pagamento confirmado! Fotos liberadas', 'success')
    setTimeout(() => location.reload(), 2000)
  } else if (status === 'failure') {
    showToast('❌ Pagamento não foi aprovado', 'error')
  } else if (status === 'pending') {
    showToast('⏳ Pagamento em análise', 'info')
  }
}
```

### Admin — Aba "Integrações"

```javascript
// admin/tabs/integracoes.js (novo)

const renderMercadopagoSection = () => {
  const isConnected = org.mpIntegration?.accessToken
  
  return `
    <div class="integration-card">
      <h3>🤖 Mercado Pago</h3>
      
      ${isConnected ? `
        <div class="status-connected">
          ✅ Conectado desde ${formatDate(org.mpIntegration.connectedAt)}
        </div>
        
        <button class="btn-secondary" onclick="disconnectMercadopago()">
          Desconectar
        </button>
      ` : `
        <div class="status-disconnected">
          Conecte sua conta para receber pagamentos
        </div>
        
        <button class="btn-primary" onclick="connectMercadopago()">
          Conectar Mercado Pago
        </button>
      `}
      
      <div class="info-box">
        <p>
          Seus clientes poderão pagar online ao selecionar as fotos.
          Taxa: ~2.99% (Mercado Pago) + ${COMMISSION_RATE}% (CliqueZoom)
        </p>
      </div>
    </div>
  `
}

function connectMercadopago() {
  const clientId = window.env.MERCADOPAGO_CLIENT_ID
  const redirectUri = `${window.location.origin}/admin/auth-callback/mercadopago`
  
  window.location.href = 
    `https://auth.mercadopago.com/authorization?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `redirect_uri=${redirectUri}`
}

async function disconnectMercadopago() {
  if (!confirm('Desconectar Mercado Pago?')) return
  
  try {
    await fetch(`/api/integrations/mercadopago`, { method: 'DELETE' })
    showToast('✅ Desconectado', 'success')
    location.reload()
  } catch (err) {
    showToast('❌ Erro ao desconectar', 'error')
  }
}
```

---

## 🔐 Segurança

### Criptografia de Tokens

```javascript
// utils/encryption.js (já existe para agente IA)

const crypto = require('crypto')

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY  // 32 bytes

function encrypt(plaintext) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  
  return `${iv.toString('hex')}.${encrypted.toString('hex')}.${authTag.toString('hex')}`
}

function decrypt(ciphertext) {
  const [iv, encrypted, authTag] = ciphertext.split('.').map(p => Buffer.from(p, 'hex'))
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  decipher.setAuthTag(authTag)
  
  return decipher.update(encrypted) + decipher.final('utf8')
}

module.exports = { encrypt, decrypt }
```

### Validações

```javascript
// Ao receber token do OAuth
if (!mpAccessToken || typeof mpAccessToken !== 'string') {
  throw new Error('Invalid MP token')
}

// Ao usar token
try {
  const decrypted = decrypt(org.mpIntegration.accessToken)
  const mpClient = new MercadoPago(decrypted)
} catch (err) {
  req.logger.error(`Failed to decrypt MP token: ${err.message}`)
  return res.status(500).json({ error: 'Payment service unavailable' })
}

// Ao validar webhook
function validateMpSignature(signature, requestId, body) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  const message = `${requestId}${JSON.stringify(body)}`
  const hmac = crypto.createHmac('sha256', secret).update(message).digest('hex')
  return hmac === signature
}
```

### Rate Limiting

```javascript
// middleware/rateLimits.js (novo limiter)
const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minuto
  max: 5,                   // 5 tentativas/min
  keyGenerator: (req) => `${req.organizationId}:${req.clientId}`,
  message: 'Muitas tentativas de pagamento. Aguarde.'
})

app.post('/api/sessions/:id/checkout', checkoutLimiter, ...)
```

### Validação de Propriedade

```javascript
// Antes de usar credenciais MP
const session = await Session.findById(req.params.id)
const org = await Organization.findById(session.organizationId)

// Garantir que quem está pedindo checkout é o cliente dessa sessão
if (session.clientId !== req.client.id) {
  return res.status(403).json({ error: 'Unauthorized' })
}

// Garantir que o fotógrafo tem MP
if (!org.mpIntegration?.accessToken) {
  return res.status(402).json({ error: 'Photographer has not configured payment' })
}
```

---

## 📋 Checklist de Implementação

- [ ] **Modelo:** Adicionar campos em `Session` e `Organization`
- [ ] **Criptografia:** Reusar utils existentes (agente IA)
- [ ] **OAuth:** Implementar callback `/admin/auth-callback/mercadopago`
- [ ] **Endpoint:** `POST /api/sessions/:id/checkout`
- [ ] **Webhook:** `POST /webhooks/mercadopago`
- [ ] **Frontend:** Componente de pagamento em `gallery.js`
- [ ] **Admin:** Tab "Integrações" com botão conectar/desconectar
- [ ] **Emails:** Templates de pagamento aprovado/rejeitado
- [ ] **Testes:** E2E ponta-a-ponta com conta test do MP
- [ ] **Deploy:** Variáveis de ambiente + webhook configurado na VPS

---

## 📌 Variáveis de Ambiente

```bash
# .env

# Mercado Pago
MERCADOPAGO_CLIENT_ID=YOUR_CLIENT_ID
MERCADOPAGO_CLIENT_SECRET=YOUR_CLIENT_SECRET
MERCADOPAGO_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET

# Comissão
CLIQUEZOOM_COMMISSION_RATE=0.01    # 1%

# Criptografia (já existe)
ENCRYPTION_KEY=your_32_byte_hex_key
```

---

## 🔗 Referências

- [Documentação MP — OAuth](https://www.mercadopago.com.br/developers/pt/docs/checkout/integrate-oauth)
- [Mercado Pago — Criar Preferência](https://www.mercadopago.com.br/developers/pt/docs/checkout/create-preference)
- [MP — Validar Webhook](https://www.mercadopago.com.br/developers/pt/docs/webhooks/oauth-integration)

---

## 💡 Notas Futuras

- **V2:** Permitir múltiplos valores por pacote / foto extra (tabela de preços)
- **V2:** Parcelamento via Mercado Pago (transparente ao cliente)
- **V2:** Dashboard de recebimentos (quanto cada fotógrafo ganhou)
- **V2:** Cupons de desconto / promoções
- **V2:** Integração com contabilidade (exportar movimentações)
