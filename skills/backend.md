# Backend — Padrões e Referências (CliqueZoom)

> Leia esta skill quando for criar rotas, middlewares, serviços ou alterar lógica de negócio.

---

## STACK

- **Runtime:** Node.js
- **Framework:** Express
- **Módulos:** CommonJS (`require/module.exports`) — `package.json` sem `"type":"module"`
- **Auth:** JWT (Bearer token, 7 dias)
- **ODM:** Mongoose
- **Entry point:** `src/server.js`, porta `3051`, processo PM2 cluster

---

## ESTRUTURA DE ARQUIVOS

```
src/
  server.js           # Entry point — registra rotas e middlewares
  middleware/
    auth.js           # authenticateToken, requireSuperadmin
    tenant.js         # resolveTenant — resolve org pelo subdomínio/slug
    planLimits.js     # checkLimit, checkSessionLimit, checkPhotoLimit, checkAlbumLimit
    stripe.js         # createCheckoutSession, handleWebhook
  routes/
    auth.js           # POST /login
    organization.js   # GET/PUT /organization/profile
    site.js           # GET /site/config (público), PUT /site/admin/config (autenticado)
    siteData.js       # GET/PUT /site-data, /hero, /faq (legado — SiteData model)
    upload.js         # POST /admin/upload, /admin/upload-video
    sessions.js       # CRUD de sessões de fotos
    clients.js        # CRUD de clientes
    albums.js         # CRUD de álbuns de prova
    notifications.js  # Notificações
    domains.js        # Domínios customizados
    landing.js        # Landing page pública
    billing.js        # Planos e pagamento Stripe
  models/             # 1 arquivo por modelo
  utils/
    multerConfig.js   # uploadMiddleware
    notifications.js  # helpers de notificação
    deadlineChecker.js # job de verificação de prazos
```

---

## PADRÃO DE ROTA

```js
// src/routes/X.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Modelo = require('../models/Modelo');

// Rota pública (usa resolveTenant para obter orgId)
router.get('/x/:slug', async (req, res) => {
  try {
    const data = await Modelo.findOne({ organizationId: req.organizationId }).lean();
    if (!data) return res.status(404).json({ error: 'Não encontrado' });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota autenticada
router.put('/x/admin/config', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    await Modelo.findOneAndUpdate({ organizationId: orgId }, { $set: updateData }, { upsert: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

Registrar em `server.js`:
```js
app.use('/api', require('./routes/X'));
```

---

## AUTH E MULTI-TENANCY

### JWT Payload
```js
{ userId, organizationId, role }  // expiresIn: '7d'
// Secret: process.env.JWT_SECRET
```

### Middlewares de identidade
- `req.user.organizationId` — org do usuário logado (rotas autenticadas via `authenticateToken`)
- `req.organizationId` — org resolvida pelo subdomínio/slug (rotas públicas via `resolveTenant`)
- `requireSuperadmin` — valida `req.user.role === 'superadmin'`

### Tenant resolution (`tenant.js`)
- Resolve pelo subdomínio da requisição
- Suporta `?_preview=1` para preview sem `siteEnabled`
- Cache com TTL de 5 minutos
- Fallback para `OWNER_SLUG` se não encontrar

### Regra absoluta
- **Nunca** retornar dados de outra org — sempre filtrar por `organizationId`

---

## UPLOAD DE ARQUIVOS

```js
const { uploadMiddleware } = require('../utils/multerConfig');

router.post('/admin/upload', authenticateToken, uploadMiddleware.single('file'), async (req, res) => {
  const url = `/uploads/${req.user.organizationId}/${req.file.filename}`;
  res.json({ url });
});
```

Arquivos em `/uploads/{orgId}/` — servidos pelo Nginx como estático.

---

## PLAN LIMITS

```js
const { checkSessionLimit } = require('../middleware/planLimits');

router.post('/sessions', authenticateToken, checkSessionLimit, async (req, res) => { ... });
```

Campos em `Subscription`: `limits.maxSessions`, `usage.sessions`, etc. Free plan criado automaticamente.

---

## VARIÁVEIS DE AMBIENTE (.env)

```
PORT=3051
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/fssaas
JWT_SECRET=your-secret-here
BASE_DOMAIN=app.cliquezoom.com.br
OWNER_SLUG=cz
OWNER_EMAIL=admin@cliquezoom.com.br
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
STRIPE_SECRET_KEY (opcional)
STRIPE_WEBHOOK_SECRET (opcional)
BASE_URL (para redirects Stripe)
```

---

## PADRÕES DE RESPOSTA

```js
res.json({ success: true, data: result });          // Sucesso
res.status(400).json({ error: 'Mensagem clara' });  // Validação
res.status(404).json({ error: 'Não encontrado' });  // Not found
res.status(500).json({ error: error.message });     // Erro interno
```

---

## ERROS COMUNS

| Sintoma | Causa | Evitar |
|---|---|---|
| Rota admin 404 produção | Falta `authenticateToken` | Toda rota admin com middleware |
| 401 em toda requisição | Token expirado ou header errado | Verificar `Authorization: Bearer <token>` |
| Dados de outra org retornados | Falta filtro `organizationId` | Sempre incluir em `.findOne()` / `.find()` |
| 500 no startup | Variável de ambiente ausente | Checar `.env` e `process.env.X` |
| App não inicia | MongoDB off | `sudo systemctl start mongod` |
| 502 Bad Gateway | Node caiu | `pm2 reload ecosystem.config.js --env production` |
| Upload 413 | Payload grande | Verificar `client_max_body_size` no Nginx |
