# Banco de Dados — Padrões e Referências (CliqueZoom)

> Leia esta skill quando for criar modelos, queries, migrações ou depurar erros de persistência.

---

## STACK

- **Banco:** MongoDB (local, porta 27017, db `cliquezoom`)
- **ODM:** Mongoose
- **Conexão:** `mongoose.connect(process.env.MONGODB_URI)` em `src/server.js`
- **IMPORTANTE:** `MONGODB_URI` deve estar explícito no `.env` da VPS (`mongodb://localhost:27017/cliquezoom`). O fallback no código também aponta para `cliquezoom`. 
- **AVISO:** O banco `fsfotografias` NÃO pertence a este projeto (é de outro sistema no mesmo servidor). Nunca aponte o `.env` para ele, sob risco de perder acesso aos dados do CliqueZoom.

---

## MODELOS PRINCIPAIS

### Organization (fotógrafo/estúdio)
```js
{
  name, slug,           // slug = subdomínio único
  ownerId: ObjectId,    // ref User
  plan: enum['free','basic','pro'],
  isActive: Boolean,
  logo, phone, whatsapp, email, website, bio, address, city, state,
  primaryColor,
  watermarkType, watermarkText, watermarkOpacity,
  siteEnabled, siteTheme: enum['elegante','minimalista','moderno','escuro','colorido'],
  siteConfig: {         // configurações hero e layout
    heroTitle, heroSubtitle, heroImage,
    heroScale, heroPosX, heroPosY,
    titlePosX, titlePosY, titleFontSize,
    overlayOpacity, topBarHeight, bottomBarHeight,
    heroLayers: Mixed   // ⚠️ array de layers — usar $set no pai
  },
  siteSections: Array,  // ordem das seções ativas
  siteContent: {        // ⚠️ FONTE DE VERDADE para o site público
    sobre: { title, text, image },
    servicos: [{ id, title, description, price, icon }],
    depoimentos: [{ name, text, rating, photo, socialLink }],
    portfolio: { title, subtitle, photos, canvasLayers: Mixed, canvasBg: Mixed },
    contato: { title, text, address, mapEmbed },
    albums: [{ id, title, subtitle, cover, photos }],
    studio: { description, address, hours, whatsapp, videoUrl, photos, whatsappMessages },
    faq: [{ id, question, answer }],
    customSections: Mixed  // ⚠️ estrutura dinâmica
  },
  siteStyle: { accentColor, bgColor, textColor, fontFamily, borderRadius },
  integrations: { googleAnalytics, metaPixel, whatsapp, seo },
  timestamps: true
}
```

### SiteData (legado — dados avançados do canvas)
```js
// strict: false — aceita campos adicionais sem schema
{
  organizationId: ObjectId,  // indexed
  logo: Mixed,               // { type: 'text'|'image', text, image }
  hero: Mixed,               // ⚠️ transform, titleTransform (pixel-precise)
  about: Mixed,
  portfolio: Array,
  studio: Mixed,
  albums: Array,
  footer: Mixed,
  faq: Mixed,                // { faqs: Array }
  maintenance: Mixed,        // { enabled: Boolean }
  timestamps: true
}
```

### Outros modelos
- **User** — autenticação (`email`, `passwordHash`, `organizationId`, `role`)
- **Session** — sessões de fotos (`organizationId`, `clientId`, `photos[]`)
- **Client** — clientes (`organizationId`, `name`, `email`, `phone`)
- **Album** — álbuns de prova (`organizationId`, `sessionId`, `photos[]`)
- **Subscription** — planos (`organizationId`, `plan`, `limits{}`, `usage{}`)
- **Notification** — notificações (`organizationId`, `type`, `read`)

---

## PADRÃO DE MODELO

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
const data = await Organization.findOne({ organizationId: orgId }).lean();
const lista = await Session.find({ organizationId: orgId }).lean();
```

### Update sem sobrescrever (siteContent)
```js
// Merge de campos — não apaga o que não foi enviado
const updateData = {};
updateData['siteContent.portfolio'] = portfolioObject; // objeto PAI inteiro
await Organization.findOneAndUpdate(
  { organizationId: orgId },
  { $set: updateData },
  { upsert: true, new: true }
);
```

### Push em array
```js
await Session.findByIdAndUpdate(id, { $push: { photos: novaFoto } });
```

---

## ARMADILHAS CONHECIDAS

### ❌ Dot notation em campo Mixed
```js
// ERRADO — causa "Cannot create field 'photos' in element {portfolio: ...}"
{ $set: { 'siteContent.portfolio.photos': photos } }

// CERTO — substituir o objeto pai inteiro
{ $set: { 'siteContent.portfolio': { photos, title, subtitle } } }
```
**Regra:** nunca usar dot notation aninhada em campos Mixed. Sempre `$set` no objeto pai.

### ❌ markModified esquecido
```js
// Campos Mixed precisam de markModified para o Mongoose detectar mudança
doc.siteContent.customSections = novoValor;
doc.markModified('siteContent.customSections');
await doc.save();
```

### ❌ Duas fontes de verdade
```
saveAppData() → SiteData (/api/site-data)         ← legado
apiPut('/api/site/admin/config') → Organization.siteContent  ← fonte de verdade

O site público lê Organization.siteContent via /api/site/config.
Se salvar em SiteData, os dados não aparecem no site público.
```

---

## FONTES DE VERDADE (mapa de dados)

| Dado | Salvo em | Lido pelo site em |
|---|---|---|
| Portfolio fotos | `Organization.siteContent.portfolio` | `siteContent.portfolio` via `/api/site/config` |
| FAQ | `Organization.siteContent.faq` | `siteContent.faq` via `/api/site/config` |
| Álbuns | `Organization.siteContent.albums` | `siteContent.albums` via `/api/site/config` |
| Sobre | `Organization.siteContent.sobre` | `siteContent.sobre` via `/api/site/config` |
| Estúdio | `Organization.siteContent.studio` | `siteContent.studio` via `/api/site/config` |
| Hero canvas layers | `SiteData.hero` (transform/layers) | `SiteData` via `/api/site-data` |
| Perfil/logo | `Organization` (campos raiz) | `Organization` via `/api/site/config` |
| Siteconfig (topbar, overlay) | `Organization.siteConfig` | `Organization.siteConfig` via `/api/site/config` |

---

## DEPLOY / MANUTENÇÃO

```bash
# Verificar conexão
mongo --eval "db.adminCommand('ping')"

# Restart MongoDB se necessário
sudo systemctl start mongod
sudo systemctl status mongod

# Logs do app
pm2 logs cliquezoom-saas --lines 30 --nostream
```

---

## ERROS COMUNS

| Sintoma | Causa | Evitar |
|---|---|---|
| Dado salvo mas não aparece no site | Duas fontes de verdade | Mapear no quadro acima; usar `apiPut('/api/site/admin/config')` |
| Erro 500 "Cannot create field X in element" | Dot notation em campo Mixed | Substituir objeto pai inteiro no `$set` |
| Campo não atualiza após `doc.save()` | `markModified` esquecido em campo Mixed | Sempre chamar antes do `.save()` |
| Queries lentas | Falta de índice | `organizationId` já indexado — adicionar índice em outros campos de busca frequente |
| App não inicia | MongoDB offline | `sudo systemctl start mongod` |
