# Banco de Dados — Padrões e Referências

> Leia esta skill quando for criar modelos, queries, migrações ou depurar erros de persistência.

---

## STACK

- **Banco:** [MongoDB / PostgreSQL / MySQL / SQLite]
- **ODM/ORM:** [Mongoose / Prisma / Sequelize / etc]
- **Conexão:** [mongoose.connect() / pool / etc]

---

## MODELOS PRINCIPAIS

### [NomeDoModelo]
```js
// Campos-chave — não precisa copiar tudo, só o que importa para fluxo de dados
{
  organizationId: ObjectId,  // sempre presente em multi-tenant
  campo1: String,
  campo2: { type: Mixed, default: {} },  // atenção: Mixed tem armadilhas
  timestamps: true
}
```

### [OutroModelo]
```js
{
  organizationId: ObjectId,
  // ...
}
```

---

## PADRÃO DE MODELO (Mongoose)

```js
const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  // campos do domínio
}, { timestamps: true });

module.exports = mongoose.model('NomeDoModelo', Schema);
```

---

## PADRÕES DE QUERY

### Busca segura (multi-tenant)
```js
// Sempre filtrar por organizationId
const data = await Modelo.findOne({ organizationId: orgId }).lean();
const lista = await Modelo.find({ organizationId: orgId }).lean();
```

### Update sem sobrescrever
```js
// Merge de campos — não apaga o que não foi enviado
await Modelo.findByIdAndUpdate(id, { $set: updateData }, { new: true });
```

### Push em array
```js
await Modelo.findByIdAndUpdate(id, { $push: { 'array.field': novoItem } });
```

---

## ARMADILHAS CONHECIDAS

### ❌ Dot notation em campo Mixed
```js
// ERRADO — causa "Cannot create field X in element"
{ $set: { 'siteContent.portfolio.photos': photos } }

// CERTO — substituir o objeto pai inteiro
{ $set: { 'siteContent.portfolio': { photos, title, subtitle } } }
```
**Regra:** nunca usar dot notation aninhada em campos do tipo `Mixed`. Sempre fazer `$set` no objeto pai.

### ❌ markModified esquecido
```js
// Campos Mixed precisam de markModified para o Mongoose detectar mudança
doc.campoMixed.subCampo = novoValor;
doc.markModified('campoMixed'); // obrigatório
await doc.save();
```

### ❌ Duas fontes de verdade
```
// Se o frontend salva em ModeloA mas o site lê de ModeloB — dados nunca aparecem
// Regra: definir UMA fonte de verdade por dado e documentar aqui
```

---

## FONTES DE VERDADE (mapa de dados)

| Dado | Salvo em | Lido pelo site em |
|---|---|---|
| [Ex: Portfolio fotos] | [Organization.siteContent.portfolio] | [siteContent.portfolio via /api/site/config] |
| [Ex: Hero canvas] | [SiteData.hero] | [SiteData via /api/hero] |

---

## DEPLOY / MANUTENÇÃO

```bash
# Verificar conexão
[mongo / psql / etc] --eval "db.adminCommand('ping')"

# Restart se necessário
sudo systemctl start mongod
```

---

## ERROS COMUNS

| Sintoma | Causa | Evitar |
|---|---|---|
| Dado salvo mas não aparece | Duas fontes de verdade | Mapear no quadro acima |
| Erro 500 "Cannot create field" | Dot notation em Mixed | Substituir objeto pai inteiro |
| Campo não atualiza | `markModified` esquecido | Sempre chamar em campos Mixed |
| Queries lentas | Falta de índice | Adicionar índice em campos de busca frequente |
