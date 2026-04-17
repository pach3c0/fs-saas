# Backend — Padrões e Referências

> Leia esta skill quando for criar rotas, middlewares, serviços ou alterar lógica de negócio.

---

## STACK

- **Runtime:** Node.js
- **Framework:** [Express / Fastify / etc]
- **Módulos:** CommonJS (`require/module.exports`)
- **Auth:** [JWT / Session / etc]
- **ORM/ODM:** [Mongoose / Prisma / Sequelize / etc]

---

## ESTRUTURA DE ARQUIVOS

```
src/
  server.js         # Entry point, registra rotas e middlewares
  middleware/
    auth.js         # authenticateToken — JWT middleware
    tenant.js       # Resolve organizationId pelo slug
  routes/           # 1 arquivo por domínio
  models/           # 1 arquivo por modelo
  utils/            # helpers, email, jobs
```

---

## PADRÃO DE ROTA

```js
// src/routes/X.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Modelo = require('../models/Modelo');

// Rota pública
router.get('/x/:slug', async (req, res) => {
  try {
    const data = await Modelo.findOne({ slug: req.params.slug }).lean();
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
    // ... lógica
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

- Toda rota admin usa `authenticateToken` middleware
- `req.user.organizationId` — ID da org do usuário logado
- `req.organizationId` — ID resolvido pelo slug (rotas públicas via `tenantMiddleware`)
- **Nunca** retornar dados de outra org — sempre filtrar por `organizationId`

---

## UPLOAD DE ARQUIVOS

```js
const { uploadMiddleware } = require('../utils/multerConfig');

router.post('/upload', authenticateToken, uploadMiddleware.single('file'), async (req, res) => {
  const url = `/uploads/${req.user.organizationId}/${req.file.filename}`;
  res.json({ url });
});
```

---

## PADRÕES DE RESPOSTA

```js
// Sucesso
res.json({ success: true, data: result });

// Erro de validação
res.status(400).json({ error: 'Mensagem clara para o usuário' });

// Não encontrado
res.status(404).json({ error: 'Recurso não encontrado' });

// Erro interno
res.status(500).json({ error: error.message });
```

---

## ERROS COMUNS

| Sintoma | Causa | Evitar |
|---|---|---|
| 404 em produção | Falta `authenticateToken` na rota | Toda rota admin com middleware |
| 401 em toda requisição | Token expirado ou formato errado | Verificar header `Authorization: Bearer <token>` |
| Dados de outra org retornados | Falta filtro `organizationId` | Sempre incluir no `.findOne()` / `.find()` |
| 500 no startup | Variável de ambiente ausente | Checar `.env` e `process.env.X` |
