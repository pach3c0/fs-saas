# FASE 8 - Prova de Álbum Folheável

## Objetivo
Permitir que o fotógrafo envie o layout do álbum para o cliente revisar lâmina por lâmina, aprovar ou pedir revisão, com histórico de versões.

## Contexto do Projeto

- **Stack**: Node.js + Express (CommonJS backend), Vanilla JS frontend
- **Backend** (`src/`): SEMPRE CommonJS — `require()` e `module.exports`. NUNCA `import/export`.
- **Admin** (`admin/js/`): SEMPRE ES Modules — `import/export`. Inline styles dark mode obrigatório. NUNCA classes Tailwind.
- **Multi-tenancy**: TODA query MongoDB DEVE filtrar por `organizationId`.
- **Atenção**: já existe uma aba `albuns` no admin — é para o portfólio público do site. A nova aba se chama `albuns-prova` e é completamente separada.
- **Após implementar**: atualizar `ROADMAP.md` e `CLAUDE.md`.

---

## Paleta de Cores do Admin (inline styles obrigatório)

| Elemento | Cor |
|----------|-----|
| Fundo da página | `#111827` |
| Fundo cards | `#1f2937` |
| Fundo inputs | `#111827` |
| Borda | `#374151` |
| Texto principal | `#f3f4f6` |
| Texto secundário | `#d1d5db` |
| Botão salvar/primário | `background:#2563eb` |
| Botão adicionar | `background:#16a34a` |
| Botão deletar | `color:#ef4444` |
| Texto sucesso | `color:#34d399` |
| Texto erro | `color:#f87171` |

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/models/Album.js` | Modelo Mongoose do álbum |
| `src/routes/albums.js` | Rotas CRUD + rotas do cliente |
| `admin/js/tabs/albuns-prova.js` | Aba admin de prova de álbuns |
| `album/index.html` | Visualizador do cliente |
| `album/js/viewer.js` | JS do visualizador |

## Arquivos a Modificar

| Arquivo | O que muda |
|---------|-----------|
| `src/server.js` | Registrar rota + servir static `/album` |
| `admin/index.html` | Adicionar nav item `albuns-prova` |
| `ROADMAP.md` | Marcar fase 8 concluída |
| `CLAUDE.md` | Documentar novos arquivos e rotas |

---

## PARTE 1 — Modelo `src/models/Album.js`

```javascript
const mongoose = require('mongoose');

const sheetSchema = new mongoose.Schema({
  filename: String,
  url: String,                          // URL da imagem da lâmina
  order: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['awaiting_review', 'approved', 'revision_requested'],
    default: 'awaiting_review'
  },
  comments: [{
    text: String,
    author: { type: String, enum: ['client', 'admin'], default: 'client' },
    createdAt: { type: Date, default: Date.now }
  }]
});

const AlbumSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null
  },
  name: { type: String, required: true },         // Nome do cliente/álbum
  welcomeText: { type: String, default: '' },     // Mensagem de boas-vindas
  sheets: [sheetSchema],                          // Lâminas do álbum
  accessCode: { type: String, required: true },   // Código de acesso do cliente
  status: {
    type: String,
    enum: ['draft', 'sent', 'in_review', 'approved', 'revision_requested'],
    default: 'draft'
  },
  version: { type: Number, default: 1 },          // Versão atual
  sentAt: Date,
  approvedAt: Date
}, { timestamps: true });

AlbumSchema.index({ organizationId: 1, accessCode: 1 });

module.exports = mongoose.model('Album', AlbumSchema);
```

---

## PARTE 2 — Rotas `src/routes/albums.js`

Arquivo CommonJS completo. Estrutura:

### Rotas admin (todas com `authenticateToken`):

```
GET    /api/albums                          — listar álbuns da organização
POST   /api/albums                          — criar álbum (gera accessCode automático)
PUT    /api/albums/:id                      — editar álbum (name, welcomeText, status)
DELETE /api/albums/:id                      — deletar álbum + arquivos do disco
POST   /api/albums/:id/sheets               — upload de lâminas (multipart, múltiplos arquivos)
DELETE /api/albums/:id/sheets/:sheetId      — deletar lâmina
PUT    /api/albums/:id/sheets/reorder       — reordenar lâminas (body: { order: [id1, id2, ...] })
POST   /api/albums/:id/send                 — marcar como enviado (status: 'sent', registra sentAt)
POST   /api/albums/:id/sheets/:sheetId/comments — admin adiciona comentário em lâmina
```

**Upload de lâminas**: usar `multer` com destino `/uploads/{orgId}/albums/`. Comprimir com `sharp` para 2000px largura, qualidade 90. Salvar URL como `/uploads/{orgId}/albums/filename.jpg`.

**Criar álbum**: gerar `accessCode` com `crypto.randomBytes(4).toString('hex').toUpperCase()`.

### Rotas do cliente (sem autenticação, usar `resolveTenant`):

```
POST   /api/client/album/verify             — verificar código de acesso
GET    /api/client/album/:id?code=X         — carregar dados do álbum (lâminas, status)
PUT    /api/client/album/:id/sheets/:sid/approve    — aprovar lâmina
PUT    /api/client/album/:id/sheets/:sid/request-revision — pedir revisão + comentário
POST   /api/client/album/:id/approve-all    — aprovar álbum completo
POST   /api/client/album/:id/sheets/:sid/comments  — adicionar comentário em lâmina
```

**verify**: busca Album por `{ accessCode, organizationId }`. Retorna `albumId`, nome do cliente, total de lâminas, status.

**GET /api/client/album/:id**: retorna álbum completo com lâminas ordenadas por `sheet.order`. Verificar `album.accessCode === code`.

**approve-all**: muda todas as lâminas para `approved`, muda `album.status` para `approved`, registra `album.approvedAt`.

### Registrar no `src/server.js`:

Adicionar ANTES do `app.listen()`:
```javascript
app.use('/api', require('./routes/albums'));
```

Adicionar ANTES das rotas (junto com os outros static):
```javascript
app.use('/album', express.static(path.join(__dirname, '../album')));
```

Também adicionar rota para o tenant resolver no album viewer:
```javascript
app.use('/api/client/album', resolveTenant);
```

---

## PARTE 3 — Aba Admin `admin/js/tabs/albuns-prova.js`

ES Module. Importar: `appState` (não usado para save), `apiGet`, `apiPost`, `apiPut`, `apiDelete` de `../utils/api.js`.

### Estrutura da aba:

**Header:**
- Título "Prova de Álbuns"
- Botão "+ Novo Álbum" (verde)

**Listagem de álbuns:**
- Card por álbum com: nome do cliente, versão, status badge, total de lâminas, lâminas aprovadas
- Botões: "Ver Lâminas", "Editar", "Enviar para Cliente", "Excluir"

**Badges de status:**

| Status | Cor | Label |
|--------|-----|-------|
| `draft` | `#6b7280` | Rascunho |
| `sent` | `#2563eb` | Enviado |
| `in_review` | `#d97706` | Em revisão |
| `revision_requested` | `#dc2626` | Revisão solicitada |
| `approved` | `#16a34a` | Aprovado ✓ |

**Modal "Novo Álbum":** campos nome (obrigatório), welcomeText (textarea), clientId (select opcional de `/api/clients`). Ao criar, mostrar o código de acesso gerado em destaque.

**Modal "Lâminas":**
- Grid de lâminas (2 colunas), cada uma com:
  - Imagem da lâmina
  - Badge de status (aguardando / aprovada / revisão)
  - Número da lâmina
  - Botão deletar
- Upload múltiplo de lâminas (botão "+ Upload Lâminas")
- Botão "Copiar Link do Cliente" → copia `/album/?code=XXXX`
- Botão "Enviar para Cliente" → chama `POST /api/albums/:id/send`

**Copiar link:** usar `navigator.clipboard.writeText()` com fallback para `copyToClipboard` de `../utils/helpers.js`.

---

## PARTE 4 — Visualizador do Cliente `album/index.html` + `album/js/viewer.js`

### `album/index.html`

Página standalone com CSS inline (sem Tailwind). Fundo claro (#fafafa), fontes Inter + Playfair Display. Estrutura:

```
NAV: logo do fotografo + nome do album
TELA LOGIN: campo de código de acesso
TELA ALBUM:
  - Header com nome do cliente + progresso (X/Y lâminas aprovadas)
  - Visualizador de lâminas (carrossel simples, uma por vez)
  - Controles: seta anterior / próxima / contador
  - Área de ação por lâmina:
      [ ✓ Aprovar esta lâmina ] [ ✎ Pedir revisão ]
  - Campo de comentário (aparece ao clicar "Pedir revisão")
  - Botão "Aprovar Álbum Completo" (aparece quando todas aprovadas)
TELA STATUS: "Álbum Aprovado! Aguarde o fotógrafo." ou "Revisão solicitada."
```

Anti-cópia: `oncontextmenu="return false"`, `-webkit-user-select:none`, `pointer-events:none` nas imagens.

### `album/js/viewer.js`

Vanilla JS puro (sem ES Modules — `<script src="...">` normal).

**State:**
```javascript
const state = {
  accessCode: null,
  albumId: null,
  album: null,        // dados completos do album
  sheets: [],         // laminas ordenadas
  currentIndex: 0,    // lamina atual no visualizador
  pollingInterval: null
};
```

**Fluxo:**
1. Login → `POST /api/client/album/verify` com `{ accessCode }`
2. Carregar → `GET /api/client/album/:id?code=X`
3. Renderizar lâminas com navegação por setas + swipe touch
4. Aprovar lâmina → `PUT /api/client/album/:id/sheets/:sid/approve`
5. Pedir revisão → `PUT /api/client/album/:id/sheets/:sid/request-revision` com `{ comment }`
6. Aprovar tudo → `POST /api/client/album/:id/approve-all`
7. Polling 15s para detectar nova versão enviada pelo admin

**Navegação com swipe (mobile):**
```javascript
let touchStartX = 0;
viewer.addEventListener('touchstart', e => touchStartX = e.touches[0].clientX);
viewer.addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) diff > 0 ? nextSheet() : prevSheet();
});
```

**Barra de progresso:**
- Contar lâminas com `status === 'approved'`
- Exibir: `X de Y lâminas aprovadas`
- Barra visual preenchida proporcionalmente

---

## PARTE 5 — `admin/index.html` — Nav Item

Adicionar após `<div data-tab="clientes">`, antes de `<div data-tab="footer">`:

```html
<div data-tab="albuns-prova" class="nav-item">📖 Prova de Álbuns</div>
```

---

## Ordem de Implementação

1. `src/models/Album.js`
2. `src/routes/albums.js` (rotas admin + cliente)
3. `src/server.js` (registrar rota + static `/album` + resolveTenant)
4. `admin/js/tabs/albuns-prova.js`
5. `admin/index.html` (nav item)
6. `album/index.html` + `album/js/viewer.js`
7. `ROADMAP.md` + `CLAUDE.md`

---

## Como Testar

1. `npm run dev`
2. Admin → aba **Prova de Álbuns** → criar álbum "Casamento Silva"
3. Fazer upload de 5 imagens como lâminas
4. Clicar "Enviar para Cliente" → anotar o código gerado
5. Abrir `http://localhost:3051/album/` → digitar o código
6. Navegar pelas lâminas com setas e swipe
7. Aprovar 3 lâminas, pedir revisão em 1 (com comentário)
8. No admin → ver badges de status por lâmina
9. Aprovar álbum completo → tela de status aparece
10. Admin recebe notificação de álbum aprovado

---

## Observações

- **Não confundir** com a aba `albuns` existente (portfólio público do site). São conceitos diferentes.
- Upload de lâminas: usar o mesmo `multerConfig.js` existente em `src/utils/multerConfig.js` com subdir `albums`.
- O viewer do cliente **não usa ES Modules** — é `<script src="...">` normal como o `gallery.js`.
- Lâminas são imagens do layout do álbum (normalmente formato panorâmico 2:1 ou quadrado).
- Versioning simplificado: por ora, apenas `version: Number` incremental. Upload de nova versão substitui as lâminas existentes.
