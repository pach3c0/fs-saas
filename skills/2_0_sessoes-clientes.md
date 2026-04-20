# Grupo 2: Sessões de Clientes e CRM

> Documentação gerada em 2026-04-19 com base em análise completa do código.
> Cobre: `admin/js/tabs/sessoes.js`, `admin/js/tabs/clientes.js`, `src/routes/sessions.js`, `src/routes/clients.js`, `src/models/Session.js`, `src/models/Client.js`.

---

## Visão Geral

São dois módulos distintos com frontends separados, mas com relação via `clientId`:

| Módulo | Arquivo frontend | Rota backend | Modelo |
|---|---|---|---|
| Sessões | `admin/js/tabs/sessoes.js` | `src/routes/sessions.js` | `src/models/Session.js` |
| Clientes (CRM) | `admin/js/tabs/clientes.js` | `src/routes/clients.js` | `src/models/Client.js` |

A **vinculação** entre eles é opcional: uma sessão pode ter `clientId` apontando para um `Client`, mas pode existir sem vínculo.

---

## Modelos de Dados

### Session (`src/models/Session.js`)

```js
{
  name: String,
  clientEmail: String,         // para envio de e-mail (independente do CRM)
  type: String,                // Família | Casamento | Evento | Ensaio | Corporativo
  date: Date,
  accessCode: String,          // código de acesso público (gerado automaticamente)
  mode: 'selection' | 'gallery' | 'multi_selection',
  packageLimit: Number,        // padrão 30 fotos no pacote
  extraPhotoPrice: Number,     // padrão R$ 25 por foto extra
  selectionStatus: 'pending' | 'in_progress' | 'submitted' | 'delivered',
  selectedPhotos: [String],    // array de photo.id selecionados
  selectionDeadline: Date,
  deadlineWarningSent: Boolean,
  deadlineExpiredSent: Boolean,
  deliveredAt: Date,
  coverPhoto: String,
  highResDelivery: Boolean,    // se true: cliente baixa urlOriginal (sem compressão)
  watermark: Boolean,          // false após deliver
  canShare: Boolean,
  isActive: Boolean,
  organizationId: ObjectId,    // OBRIGATÓRIO — multi-tenancy
  clientId: ObjectId,          // referência ao CRM (opcional)
  photos: [{
    id: String,                // ID único gerado no upload
    filename: String,
    url: String,               // thumb comprimida (1200px, 85%) — usada na galeria
    urlOriginal: String,       // original — usada no download em alta resolução
    uploadedAt: Date,
    comments: [{ text, createdAt, author: 'client' | 'admin' }]
  }],
  participants: [{             // SOMENTE no modo multi_selection
    name: String,
    email: String,
    phone: String,
    accessCode: String,        // código único por participante
    selectedPhotos: [String],
    selectionStatus: 'pending' | 'in_progress' | 'submitted' | 'delivered',
    packageLimit: Number,
    submittedAt: Date,
    deliveredAt: Date
  }]
}
```

**Índices criados:**
- `{ organizationId: 1 }` (index simples)
- `{ organizationId: 1, accessCode: 1 }` (composto — busca pública de sessão)

### Client (`src/models/Client.js`)

```js
{
  organizationId: ObjectId,    // OBRIGATÓRIO
  name: String,                // OBRIGATÓRIO
  email: String,
  phone: String,
  notes: String,
  tags: [String]
}
```

**Índice único:** `{ organizationId: 1, email: 1 }` com `sparse: true` (permite email vazio).

---

## Modos de Sessão

| Modo | Descrição | Quem seleciona | Participantes |
|---|---|---|---|
| `selection` | Cliente escolhe N fotos do pacote | Sessão inteira (1 código) | Não se aplica |
| `gallery` | Cliente só visualiza e baixa (após entrega) | Não há seleção | Não se aplica |
| `multi_selection` | Múltiplos participantes, cada um com seu limite | Cada participante (código individual) | `session.participants[]` |

> **Multi-seleção:** criada para formaturas e shows. Cada participante recebe seu próprio `accessCode` e pode selecionar até `packageLimit` fotos de forma independente do restante do grupo.

---

## Fluxo Completo de uma Sessão

```
Admin cria sessão
  → accessCode gerado (crypto.randomBytes 4 bytes → HEX)
  → Subscription.usage.sessions++
  → E-mail enviado ao cliente (se clientEmail preenchido)

Admin faz upload de fotos
  → multer salva original em /uploads/{orgId}/sessions/
  → sharp gera thumb (1200px, 85%) com prefixo "thumb-"
  → Cada foto tem: id, filename, url (thumb), urlOriginal
  → Subscription.usage.photos += count

Cliente acessa galeria (cliquezoom.com.br/cliente/?code=XXXX)
  → POST /api/client/verify-code → retorna sessionId + dados
  → GET /api/client/photos/:sessionId → lista fotos
  → Notificação criada: "acessou a galeria"

Cliente seleciona fotos
  → PUT /api/client/select/:sessionId → toggle de foto
  → Status muda: pending → in_progress (primeira seleção)
  → Notificação: "iniciou a seleção"

Cliente finaliza seleção
  → POST /api/client/submit-selection/:sessionId
  → Status muda: in_progress → submitted
  → Notificação + e-mail ao fotógrafo

Admin revisa seleção
  → Pode "Reabrir": submitted → in_progress
  → Pode "Entregar": PUT /api/sessions/:id/deliver
    → selectionStatus = 'delivered'
    → watermark = false
    → E-mail ao cliente

Cliente baixa fotos entregues
  → GET /api/client/download/:sessionId/:photoId?code=XXX (individual)
  → GET /api/client/download-all/:sessionId?code=XXX (ZIP)
  → Se highResDelivery=true: serve urlOriginal; senão: thumb
  → Modo 'selection' no ZIP: só as selecionadas
  → Modo 'gallery' no ZIP: todas
```

---

## Rotas Backend

### Rotas Públicas do Cliente (sem autenticação JWT, mas com `req.organizationId` via middleware de subdomínio)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/client/verify-code` | Validar código de acesso + retornar dados da sessão |
| GET | `/api/client/manifest/:sessionId` | PWA manifest dinâmico |
| GET | `/api/client/photos/:sessionId` | Listar fotos + seleção atual |
| PUT | `/api/client/select/:sessionId` | Toggle de foto selecionada |
| POST | `/api/client/submit-selection/:sessionId` | Finalizar seleção |
| POST | `/api/client/request-reopen/:sessionId` | Solicitar reabertura |
| POST | `/api/client/comments/:sessionId` | Adicionar comentário em foto |
| GET | `/api/client/download/:sessionId/:photoId` | Download individual |
| GET | `/api/client/download-all/:sessionId` | Download ZIP |

### Rotas Admin (requerem `authenticateToken`)

| Método | Rota | Middleware extra | Descrição |
|---|---|---|---|
| GET | `/api/sessions` | — | Listar todas as sessões da org |
| GET | `/api/sessions/:id` | — | Buscar sessão por ID |
| POST | `/api/sessions` | `checkLimit, checkSessionLimit` | Criar sessão |
| PUT | `/api/sessions/:id` | — | Editar sessão |
| DELETE | `/api/sessions/:id` | — | Deletar sessão + arquivos |
| POST | `/api/sessions/:id/photos` | `checkLimit, checkPhotoLimit` | Upload de fotos |
| DELETE | `/api/sessions/:id/photos/:photoId` | — | Deletar foto |
| PUT | `/api/sessions/:id/reopen` | — | Reabrir seleção |
| PUT | `/api/sessions/:id/deliver` | — | Marcar como entregue |
| POST | `/api/sessions/:id/photos/:photoId/comments` | — | Admin comentar foto |
| GET | `/api/sessions/:id/export` | JWT via query `?token=` | Exportar lista Lightroom |
| POST | `/api/sessions/:id/participants` | — | Adicionar participante |
| PUT | `/api/sessions/:id/participants/:pid` | — | Editar participante |
| DELETE | `/api/sessions/:id/participants/:pid` | — | Remover participante |
| PUT | `/api/sessions/:id/participants/:pid/deliver` | — | Entregar para participante |
| GET | `/api/sessions/:id/participants/export` | — | Exportar seleções multi |
| POST | `/api/sessions/check-deadlines` | — | Verificar prazos manualmente |

### Rotas de Clientes (CRM)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/clients` | Listar clientes + `sessionCount` via aggregation |
| POST | `/api/clients` | Criar cliente |
| PUT | `/api/clients/:id` | Editar cliente |
| DELETE | `/api/clients/:id` | Deletar cliente (desvincula sessões) |
| GET | `/api/clients/:id/sessions` | Listar sessões do cliente |

---

## Frontend: `sessoes.js`

### Padrão de estado

```js
let sessionsData = [];          // array local, carregado no mount
let currentSessionId = null;    // sessão aberta no modal de fotos
let editingSessionId = null;    // sessão no modal de edição
let currentParticipantsSessionId = null;
let currentCommentSessionId = null;
let currentCommentPhotoId = null;
```

> **Atenção:** sessoes.js **NÃO usa `apiGet/apiPut` das utils** — usa `fetch` direto com header manual. Isso é uma **inconsistência** em relação ao padrão canônico (ver `clientes.js` que usa `apiGet/apiPost/apiPut/apiDelete`). Não reproduzir esse padrão em módulos novos.

### Renderização após ações

Toda ação destrutiva (criar, deletar sessão, deletar foto, upload) chama `await renderSessoes(container)` — **re-renderiza toda a tab**. Isso é correto mas custoso. Comentários são a exceção: atualizam apenas o array local + `renderCommentsList()`.

### Status computado "expired"

O status `expired` **não existe no banco** — é calculado no frontend:

```js
const isExpired = deadline && now > deadline
  && session.selectionStatus !== 'submitted'
  && session.selectionStatus !== 'delivered';
const effectiveStatus = isExpired ? 'expired' : session.selectionStatus;
```

Se o status for `submitted` ou `delivered`, o prazo é ignorado (sessão já finalizada).

### CSS: inconsistência com o padrão

`sessoes.js` usa **hexcodes hardcoded** (`#1f2937`, `#374151`, `#f3f4f6`) em vez de CSS variables (`var(--bg-surface)`, `var(--border)`, `var(--text-primary)`). `clientes.js` já usa CSS variables corretamente.

> **Quando refatorar:** substituir todos os hex hardcoded de `sessoes.js` por CSS variables do design system.

---

## Frontend: `clientes.js`

### Padrão de estado

```js
let clientesData = [];   // array local, recarregado no mount
let searchTerm = '';     // filtro de busca — persiste entre re-renders
```

> **Diferença importante:** `searchTerm` é uma variável de módulo. Se o usuário digitar na busca e a tab for re-renderizada (ex: navegação), o filtro é preservado porque a variável persiste enquanto o módulo estiver em memória.

### `escapeHtml` duplicado

`clientes.js` define sua própria função `escapeHtml` localmente (linha 356-363). A mesma função existe em `admin/js/utils/helpers.js`. **Não importou do helpers** — redundância.

> Quando refatorar: `import { escapeHtml } from '../utils/helpers.js'` e remover a função local.

### sessionCount via aggregation

`GET /api/clients` faz uma `aggregate` para contar sessões por cliente. O contador **não é denormalizado** no modelo — é calculado on-the-fly. Para grandes volumes pode ser lento. Não há índice em `Session.clientId`.

---

## Limites de Plano

O middleware `checkLimit` + `checkSessionLimit` bloqueia criação de sessão se:
- `subscription.usage.sessions >= subscription.limits.maxSessions` (e `maxSessions !== -1`)

O middleware `checkPhotoLimit` bloqueia upload se:
- `subscription.usage.photos >= subscription.limits.maxPhotos`

Os contadores são incrementados/decrementados manualmente via `Subscription.findOneAndUpdate({ $inc: ... })` a cada operação.

> **Armadilha:** se uma operação falha após incrementar o contador mas antes de salvar a sessão/foto, o contador fica dessincronizado. Não há rollback atômico.

---

## Upload de Fotos: como funciona

```
Admin seleciona arquivos → input#sessionUploadInput (multiple)
  → loop sequencial (for...of) em sessoes.js
  → POST /api/sessions/:id/photos (multipart, campo 'photos')
  → multer salva o original em /uploads/{orgId}/sessions/
  → sharp gera thumb (1200px, 85%) com prefixo "thumb-"
  → Session.photos.push({ id, filename, url (thumb), urlOriginal })
  → Subscription.usage.photos++
  → Re-render total da tab + reabre modal de fotos
```

**Foto de capa:** upload separado via `/api/admin/upload` (rota genérica de upload), não via rota de sessão. A URL é salva em `session.coverPhoto`.

---

## Exportação Lightroom

`GET /api/sessions/:id/export?token=JWT`

- Autenticação via query string (`?token=`) — necessário porque é aberto em nova aba `window.open()`
- Retorna `.txt` com os `filename` de cada foto selecionada (um por linha)
- Para Multi-Seleção: usar `/api/sessions/:id/participants/export` — retorna TXT com todos os participantes e suas seleções

---

## Notificações Geradas

As ações de sessão criam registros no modelo `Notification` que alimentam o sino do admin:

| Evento | `type` |
|---|---|
| Cliente acessou galeria | `session_accessed` |
| Cliente iniciou seleção | `selection_started` |
| Cliente finalizou seleção | `selection_submitted` |
| Cliente pediu reabertura | `reopen_requested` |
| Cliente comentou em foto | `comment_added` |

---

## E-mails Disparados

| Evento | Função | Destinatário |
|---|---|---|
| Sessão criada (com `clientEmail`) | `sendGalleryAvailableEmail` | Cliente |
| Seleção enviada | `sendSelectionSubmittedEmail` | Fotógrafo (org.email) |
| Sessão entregue | `sendPhotosDeliveredEmail` | Cliente |

Todos os envios são `fire-and-forget` (`.catch(() => {})`), não bloqueiam a resposta.

---

## Vinculação Sessão ↔ Cliente (CRM)

1. Ao criar uma sessão, o admin pode selecionar um cliente do dropdown
2. O dropdown busca `GET /api/clients` ao abrir o modal
3. Ao selecionar, o campo `sessionName` é preenchido automaticamente com `client.name`
4. O `clientId` é enviado no corpo do `POST /api/sessions`
5. Na tab Clientes, clicar em "📁 N sessões" abre modal com `GET /api/clients/:id/sessions`
6. Deletar um cliente **não exclui** suas sessões — apenas faz `$unset: { clientId: '' }` em todas

---

## Armadilhas Conhecidas

| Sintoma | Causa | Solução |
|---|---|---|
| Upload de foto sem progresso visual | `sessoes.js` usa `fetch` sem `XMLHttpRequest` — não há `upload.progress` | Refatorar para usar `uploadImage()` das utils com XHR para uploads de sessão |
| Foto aparece na galeria mas não baixa em alta resolução | `highResDelivery=false` (padrão) ou `urlOriginal` ausente | Checar campo no modal "Config" → "Entrega em alta resolução" |
| Status "expirado" mostra mas banco ainda diz "pending" | `expired` é calculado só no frontend | Não filtrar por status no backend usando esse valor — ele não existe como enum |
| Modal de participantes não atualiza sem refresh | `deliverParticipant` re-fetcha `GET /api/sessions` completo (todos as sessões da org) para atualizar a lista | Comportamento correto mas custoso — evitar disparar com frequência |
| Erro 11000 ao criar cliente | E-mail duplicado na mesma organização | Índice unique sparse em `{ organizationId, email }` — e-mail deve ser único por org |
| `sessionCount` incorreto após vincular sessão | Contador é calculado via aggregation no `GET /api/clients` — não é denormalizado | Re-carregar a tab Clientes para obter contagem atualizada |
| Erro 403 ao criar sessão | Limite de plano atingido | Verificar `subscription.usage.sessions` vs `limits.maxSessions` |
| Upload 413 | Arquivo muito grande | `client_max_body_size` no Nginx — padrão configurado para aceitar imagens grandes |
| Seleção bloqueada após prazo | `selectionDeadline` ultrapassado | Fotógrafo deve reabrir no admin |
| Download ZIP vazio | Sessão em modo `selection` com nenhuma foto em `selectedPhotos` | Verificar se cliente finalizou a seleção |
| Download individual retorna 404 | Arquivo físico deletado do servidor ou `urlOriginal` não gerado em uploads antigos | Fotos enviadas antes da implementação de `urlOriginal` não têm esse campo |
| `confirm()` nativo usado em sessoes.js | Viola a regra do `CLAUDE.md` (usar `window.showConfirm`) | Substituir por `window.showConfirm()` ao refatorar |

---

## Redundâncias e Débitos Técnicos

| Problema | Localização | Ação recomendada |
|---|---|---|
| `fetch` direto com header manual | `sessoes.js` (todo o arquivo) | Substituir por `apiGet/apiPost/apiPut/apiDelete` das utils |
| `confirm()` nativo | `sessoes.js` (múltiplos locais) | Substituir por `window.showConfirm()` |
| Hexcodes hardcoded no CSS | `sessoes.js` (todo o arquivo) | Substituir por CSS variables (`var(--bg-surface)` etc.) |
| `escapeHtml` duplicada | `clientes.js` linha 356 | Importar de `../utils/helpers.js` |
| Não usa `apiGet` no mount | `sessoes.js` linha 293 | Usar `apiGet('/api/sessions')` |
| `deliverParticipant` re-fetcha todas as sessões | `sessoes.js` linha 927 | Buscar apenas `GET /api/sessions/:id` em vez de todas |

---

## Checklist para novos recursos neste módulo

- [ ] Usar `apiGet/apiPost/apiPut/apiDelete` — nunca `fetch` manual
- [ ] Usar `window.showConfirm()` — nunca `confirm()`
- [ ] Usar CSS variables — nunca hexcodes hardcoded
- [ ] Todo `organizationId` vem do middleware — nunca do body do request
- [ ] Novos campos no schema: verificar impacto em `verify-code` (retorno para o cliente)
- [ ] Novos e-mails: sempre `.catch(() => {})` — nunca bloquear a resposta aguardando e-mail
- [ ] Novos uploads de foto: sempre gerar thumb com sharp + salvar `urlOriginal`
- [ ] Notificações: sempre em `try/catch` separado — nunca deixar falhar a operação principal





## Atualizações Recentes (2026-04-20)

- **Modal Nova Sessão:** Corrigido problema de alinhamento. Todos os modais (`newSessionModal`, `editSessionModal`, `commentsModal`) agora usam `overflow-y: auto`, `align-items: flex-start` e `margin: 2rem auto` no contêiner interno para garantir que fiquem centralizados se houver espaço e scrolláveis corretamente (sem cortar o topo) caso a tela seja menor que o conteúdo.
- **Dúvidas - Tipo de Sessão:** O campo "tipo de sessão" serve **exclusivamente como rótulo visual** para ajudar o administrador a identificar e categorizar as sessões na lista (ex: Casamento, Evento). Não possui lógica sistêmica atrelada ao seu valor.
- **Foto da Capa:** Implementada a exibição do thumbnail de `coverPhoto` no card principal de cada sessão na listagem (`sessoes.js`).
- **Barra de Progresso (Uploads de Sessão):** Refatorado o envio de fotos múltiplas usando XHR e suporte nativo a progresso. O componente visual `showUploadProgress` agora funciona perfeitamente rastreando o progresso global de múltiplos envios.
- **Modais de Galeria "Esmagados":** Corrigido o bug onde modais com `inset: 0` (como o de ver fotos) ficavam curtos caso o usuário não tivesse muitas sessões cadastradas. Aplicado `min-height: calc(100vh - 120px)` no container pai para garantir que o painel sempre preencha toda a tela.
- **Aspect Ratio e Scroll Horizontal:** Aplicado `overflow-x: hidden` para evitar scroll lateral indesejado nos grids. As imagens da galeria de sessão e seleção foram atualizadas para o padrão fotográfico paisagem `aspect-ratio: 3/2` com `position: absolute`, consertando distorções visuais provocadas pelo comportamento padrão do Chrome/Safari.