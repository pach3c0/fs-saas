# Grupo 2.1: Galeria do Cliente (cliente/)

> Documentação do módulo público de galeria — `cliente/index.html` + `cliente/js/gallery.js`.
> Diferente de `clientes.js` (CRM do admin). Este módulo é acessado pelo cliente final via link/código.

---

## Visão Geral

PWA acessível em `[slug].cliquezoom.com.br/cliente/?code=XXXX`.

- Exibe **somente a logo e identidade do fotógrafo do tenant atual** (sem branding do CliqueZoom)
- Login por código de acesso (digitado ou via query string `?code=`)
- Modos: seleção de fotos, galeria (visualização/download), multi-seleção
- Funciona offline como PWA após primeiro acesso

---

## Resolução de Tenant

O middleware `src/middleware/tenant.js` extrai o slug do subdomínio:

```
joao.cliquezoom.com.br → slug = 'joao' → req.organizationId = ObjectId da org
```

Em desenvolvimento: usar `?_tenant=slug` ou header `X-Tenant`.

O `req.organizationId` é injetado automaticamente em todas as rotas `/api/client/*`.

---

## Fluxo de Login

```
Cliente recebe link: https://joao.cliquezoom.com.br/cliente/?code=ABCD1234

1. gallery.js lê ?code= da URL
2. Preenche o input automaticamente
3. Dispara POST /api/client/verify-code com { accessCode }
4. history.replaceState() limpa o ?code= da barra de endereço
5. Session + dados da org são armazenados em state.session
6. renderHeader() exibe logo do fotógrafo
7. renderPhotos() carrega a galeria
```

Sessão é salva em `sessionStorage` para re-login sem digitar o código.

---

## Dados da Organização Retornados ao Cliente

`POST /api/client/verify-code` e `GET /api/client/photos/:sessionId` retornam:

```json
{
  "organization": {
    "id": "...",
    "name": "Nome do Fotógrafo",
    "logo": "/uploads/{orgId}/logo.jpg",
    "watermark": {
      "watermarkType": "text|logo",
      "watermarkText": "Texto",
      "watermarkOpacity": 15,
      "watermarkPosition": "center|tiled|bottom-right|...",
      "watermarkSize": "small|medium|large"
    }
  }
}
```

Esses campos vêm de `Organization` via `.populate('organizationId')` na rota.

---

## Branding: Regra Crítica

> **Somente a logo/nome do fotógrafo do tenant deve aparecer.** Nenhum texto hardcoded de outra marca.

### Renderização na Nav (`renderHeader`)

```js
const orgName = (state.session.organization?.name) || '';
const orgLogo = (state.session.organization?.logo) || null;

// Nav bar (div#navLogo):
if (orgLogo)      → <img src="{orgLogo}" alt="{orgName}">
else if (orgName) → <span class="nav-logo">{orgName}</span>
else              → vazio (sem branding)

// Cabeçalho da galeria (galleryHeader):
if (orgLogo)      → <img src="{orgLogo}">
else if (orgName) → <h1>{orgName}</h1>
else              → vazio
```

**Fallback nunca deve ser string hardcoded** — se org não vier, omitir silenciosamente.

---

## Watermark

Configurado em `Organization.watermarkType/Text/Opacity/Position/Size`.

| Tipo | Comportamento |
|---|---|
| `text` | Exibe `watermarkText` (ou `orgName` se vazio) sobre as fotos |
| `logo` | Exibe `organization.logo` como imagem sobre as fotos |
| `tiled` (posição) | Repete o watermark em grid sobre toda a foto |

**Quando ocultar:** `selectionStatus === 'delivered'` → watermark removido automaticamente.

### `getWatermarkOverlay(watermark)`

```js
// Fallback correto — nunca hardcode de outra marca:
const orgName = (state.session.organization?.name) || '';
const logoUrl  = (state.session.organization?.logo) || '';
```

---

## PWA

- **Manifest dinâmico:** `GET /api/client/manifest/:sessionId` retorna JSON com `name` = org.name e `theme_color` = org.primaryColor
- **Meta theme-color:** atualizado em JS após login via `document.getElementById('themeColorMeta')`
- **Service Worker:** `cliente/sw.js` — cacheia assets estáticos, estratégia network-first para API
- **Ícones PWA:** `cliente/icons/icon-192.png` e `icon-512.png` (genéricos do app)

---

## Rotas Usadas pelo Frontend

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/client/verify-code` | Login com código → retorna session + org |
| GET | `/api/client/manifest/:sessionId` | PWA manifest dinâmico |
| GET | `/api/client/photos/:sessionId` | Fotos + seleção atual |
| PUT | `/api/client/select/:sessionId` | Toggle de foto selecionada |
| POST | `/api/client/submit-selection/:sessionId` | Finalizar seleção |
| POST | `/api/client/request-reopen/:sessionId` | Pedir reabertura |
| POST | `/api/client/comments/:sessionId` | Comentar foto |
| GET | `/api/client/download/:sessionId/:photoId` | Download individual |
| GET | `/api/client/download-all/:sessionId` | Download ZIP |

Todas filtradas por `req.organizationId` (tenant middleware).

---

## Correções de Branding Aplicadas (2026-04-21)

| Arquivo | Problema | Correção |
|---|---|---|
| `cliente/index.html` linha 6 | `<title>Sua Galeria \| FS FOTOGRAFIAS</title>` | `<title>Sua Galeria</title>` |
| `cliente/index.html` linha ~143 | `<a>FS<span>.</span>FOTOGRAFIAS</a>` hardcoded na nav | `<div id="navLogo"></div>` preenchido dinamicamente pelo JS |
| `gallery.js` `renderHeader()` | Fallback `'FS FOTOGRAFIAS'` | Fallback `''` (omite silenciosamente) |
| `gallery.js` `getWatermarkOverlay()` | Fallback `'FS FOTOGRAFIAS'` | Fallback `''` (sem texto se org ausente) |

**`renderHeader()` agora também preenche `#navLogo` na nav bar** com logo ou nome do fotógrafo após o login.

---

## Checklist para Novos Recursos neste Módulo

- [ ] Nunca hardcodar nome/logo de marca — sempre usar `state.session.organization`
- [ ] Fallback quando `organization` ausente: omitir elemento, não exibir string de outra marca
- [ ] Toda chamada de API usa `fetch` com header `{ 'Content-Type': 'application/json' }` e o código/sessionId no body ou URL
- [ ] `organizationId` vem do middleware tenant — nunca do frontend
- [ ] Novos campos da org necessários no cliente: adicionar no retorno de `verify-code` e `photos` em `src/routes/sessions.js`
- [ ] Testar sempre em `[slug].cliquezoom.com.br` (não em localhost sem `?_tenant=slug`)

---

## Features Implementadas (2026-04-21)

### Ícones empilhados verticalmente
- Container mudou de `display:flex; gap:0.5rem` (horizontal) para `flex-direction:column; gap:0.375rem`
- Coração (selecionar) fica acima, chat (comentar) abaixo — sem sobreposição

### Comentários por foto — toggle no admin
- Novo campo `Session.commentsEnabled` (Boolean, default `true`)
- Admin configura via modal Config → "Comentários por foto habilitados"
- `verify-code` e `photos` retornam `commentsEnabled`
- Botão chat só aparece na galeria se `state.session.commentsEnabled !== false`

### Botão Salvar na seleção
- Seleções já são persistidas no servidor a cada toggle (PUT `/api/client/select`)
- Botão "💾 Salvo" no bottom bar dá feedback visual ao cliente (toast inline por 2s)
- Nenhuma nova rota necessária

### Dados do cliente no header
- `verify-code` busca `Client` via `session.clientId` e retorna `clientData: { name, email, phone }`
- `loadSessionData` preserva `clientData` entre polls (campo não vem em `/photos`)
- `renderHeader()` exibe "Olá, {nome}!" ao lado da logo quando `clientData.name` disponível

### Fotos extras após envio da seleção
**Schema Session:**
```js
extraRequest: {
  status: 'none' | 'pending' | 'accepted' | 'rejected',
  photos: [String],   // IDs das fotos extras solicitadas
  requestedAt: Date,
  respondedAt: Date
}
```

**Rotas novas:**
- `POST /api/client/request-extra-photos/:sessionId` — cliente solicita; requer `{ accessCode, photos[] }`
- `PUT /api/sessions/:id/extra-request/accept` (admin) — aceita; mescla fotos extras em `selectedPhotos`
- `PUT /api/sessions/:id/extra-request/reject` (admin) — recusa; status volta para `rejected`

**Tela submitted (`renderSubmittedScreen`):**
- Mensagem de confirmação + banner de status da solicitação (pending/accepted/rejected)
- Grid de fotos NÃO selecionadas para o cliente marcar e solicitar extras
- Fotos já selecionadas: não aparecem no grid (imutáveis)
- Botão "Solicitar" aparece quando ≥1 foto extra marcada, exibe contagem e valor total
- Botão "Preciso alterar minha seleção" mantido, porém visualmente discreto; oculto se extraRequest.status === 'pending'

**Admin (`sessoes.js`):**
- Badge laranja "📸 N extra(s)" no card quando `extraRequest.status === 'pending'`
- Botões "✅ Aceitar extras" e "✗ Recusar" visíveis no card
- Entrega possível mesmo com extras pendentes (fotógrafo pode ignorar)
- Notificação `extra_photos_requested` com ícone 📸 no sino
- Email `sendExtraPhotosRequestedEmail` disparado fire-and-forget

**Relação com reabertura:**
- Reabertura e extras são fluxos independentes — não se bloqueiam mutuamente
- Botão "Preciso alterar" ocultado enquanto extra estiver pending (evita confusão)




---

## Ajustes Aplicados (2026-04-21) — Lote 2

### Upload: apenas JPEG e PNG
- `src/utils/multerConfig.js`: `fileFilter` rejeita qualquer MIME que não seja `image/jpeg` ou `image/png`

### Ícones coração/chat empilhados (correção CSS)
- Causa: `.photo-heart` tinha `position:absolute` próprio — conflitava com container flex do JS
- Correção: `.photo-heart` → `position:relative` em `cliente/index.html`

### Watermark: `watermarkPosition` e `watermarkSize` não eram persistidos
- Causa: `allowedFields` em `PUT /api/organization/profile` não incluía esses campos
- Correção: adicionados em `src/routes/organization.js` (GET e PUT)

### Click em notificação de comentário → abre modal na foto correta
- `src/models/Notification.js`: + campo `photoId: String`
- `src/routes/sessions.js`: Notification de `comment_added` inclui `photoId`
- `admin/js/utils/notifications.js`: `onNotifClick(sessionId, type, photoId)` → se `comment_added`, faz `switchTab('sessoes')` + delay 300ms + `openComments(sessionId, photoId)`

### Respostas do fotógrafo → badge de notificação para o cliente
- `cliente/js/gallery.js`: polling compara comentários `author:'admin'` entre polls via `knownAdminCommentKeys`
- Badge azul fixo aparece com contagem de respostas; ao clicar abre modal de comentários da foto

### Download: removido botão individual por foto
- Ícone ⬇ por foto removido de `renderPhotos()` — cliente usa apenas "⬇ Baixar Todas" no header
- ZIP já filtra: modo `selection` → só selecionadas; modo `gallery` → todas

---

## Ajustes Aplicados (2026-04-21) — Lote 3

### Download removido do lightbox
- Elemento `#lightboxDownload` removido de `cliente/index.html` e toda lógica correspondente removida de `renderLightbox()` em `gallery.js`
- Download disponível apenas via botão "⬇ Baixar Todas" no header (somente quando `delivered`)

### Botão "Trocar de galeria" em todas as telas
- Tela `statusScreen` (delivered/expired): botão "Trocar de galeria" adicionado com listener que chama `clearSessionFromStorage()` e retorna ao login
- Tela `submitted` (`renderSubmittedScreen`): botão discreto "Trocar de galeria" adicionado abaixo do botão de reabertura

### Sininho de notificação para respostas do fotógrafo
- Substituiu o badge flutuante por um sino 🔔 no header da galeria (`#clientBellBtn`)
- Badge vermelho com contagem aparece so

---

## Features Implementadas (2026-04-21) — Lote 4

### Resolução Dinâmica de Seleção
- `Session.photoResolution` (enum 960/1200/1400/1600, default 1200)
- Upload: `sharp.resize(session.photoResolution, ...)` — fim do 1200px hardcoded
- Select "Resolução das fotos de seleção" no modal Nova Sessão com hint de impacto
- Campo enviado no payload de criação; não pode ser alterado após criação

### Fluxos de Trabalho: ready vs. post_edit
- `Session.workflowType` (enum `ready` | `post_edit`, default `ready`)
- **`ready`:** thumb + original mantida; entrega via `urlOriginal` ou `highResDelivery`
- **`post_edit`:** original deletada do disco após gerar thumb (`fs.promises.unlink`); `urlOriginal` fica vazio
  - `POST /api/sessions/:id/photos/upload-edited` — re-upload das editadas, casa por `photo.filename`
  - Botão "✏️ Upload Editadas" (roxo) no modal de fotos; visível só para `post_edit`
  - Toast informa quantas casaram e lista nomes não encontrados
- Select "Fluxo de trabalho" no modal Nova Sessão
- Badge "✏️ Pós-Edição" no card; botão "📋 Lightroom" destacado quando `submitted` + `post_edit`
- Download: `post_edit` sempre serve `urlOriginal`; `ready` respeita `highResDelivery`

### Automação de Prazos
- `Organization.integrations.deadlineAutomation: { enabled, daysWarning, sendEmail }`
- `deadlineChecker.js` reescrito: carrega orgs em query única (`.lean()`), respeita `daysWarning` por org
- `email.js`: `sendDeadlineWarningEmail(clientEmail, sessionName, daysLeft, orgName)` e `sendDeadlineExpiredEmail`
- `server.js`: `startDeadlineScheduler()` — chamado após conexão MongoDB; `setInterval` 6h; flag `deadlineSchedulerStarted` evita duplicação no cluster PM2
- Admin → Integrações: seção "Automação de Prazos" com toggle ativar, campo dias, checkbox e-mail

---

## Rotas Admin de Sessões (atualizado 2026-04-21)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/sessions` | Criar sessão (aceita `photoResolution`, `workflowType`) |
| POST | `/api/sessions/:id/photos` | Upload de fotos (comportamento varia por `workflowType`) |
| POST | `/api/sessions/:id/photos/upload-edited` | Re-upload das editadas — só `post_edit`, casa por filename |
| GET | `/api/sessions/:id/export` | Exportar lista de seleção (.txt para Lightroom) |
| PUT | `/api/sessions/:id/deliver` | Marcar como entregue |

---

## Roadmap e Ideias Futuras (Documentação de Intenção)

As diretrizes abaixo visam transformar o sistema em uma ferramenta de vendas e fidelização. Itens marcados com ✅ já foram implementados.

### 1. ✅ Resolução Dinâmica de Seleção — IMPLEMENTADO (2026-04-21)
- `Session.photoResolution` (enum: 960 | 1200 | 1400 | 1600, default 1200)
- Select no modal "Nova Sessão"; thumb gerada na resolução escolhida via `sharp`
- **Regra crítica:** não pode ser alterado após a criação (thumbs já processadas)
- Fluxo `post_edit`: original deletada do disco após gerar thumb (economia de armazenamento)

### 2. ✅ Fluxos de Trabalho (ready vs. post_edit) — IMPLEMENTADO (2026-04-21)
- `Session.workflowType` (enum: `ready` | `post_edit`, default `ready`)
- **`ready`:** upload salva thumb + original; entrega serve original direto
- **`post_edit`:** upload salva apenas thumb (original descartada); após seleção do cliente, fotógrafo faz re-upload das editadas → sistema casa por `photo.filename`
  - Endpoint: `POST /api/sessions/:id/photos/upload-edited`
  - Matching por nome: exportar `.txt` do Lightroom, exportar editadas com mesmo nome
  - Botão "✏️ Upload Editadas" aparece no modal de fotos somente para sessões `post_edit`
- Badge "✏️ Pós-Edição" no card admin; botão "📋 Lightroom" destacado quando `submitted`
- Download/ZIP: `post_edit` serve `urlOriginal` (editada); `ready` respeita `highResDelivery`

### 3. ✅ Automação de Prazos (Escassez) — IMPLEMENTADO (2026-04-21)
- `Organization.integrations.deadlineAutomation` com `enabled`, `daysWarning` (padrão 3), `sendEmail`
- `deadlineChecker.js`: respeita `daysWarning` por org; dispara e-mail fire-and-forget ao `clientEmail`
- `email.js`: `sendDeadlineWarningEmail` (N dias antes) e `sendDeadlineExpiredEmail` (expirou)
- `server.js`: `startDeadlineScheduler()` — roda na conexão MongoDB + `setInterval` a cada 6h
- Admin → Integrações: seção "Automação de Prazos" com toggle, campo de dias e opção e-mail
- **Próximo passo:** upselling — e-mail após submissão oferecendo fotos extras com desconto

### 4. Ciclo de Vida e Backup Democrático — PENDENTE
- Prazos distintos para download das selecionadas e disponibilidade das fotos extras
- Ferramenta para mover sessões vencidas para Google Drive/Dropbox do fotógrafo
- Estado de backup: fotos extras saem da visualização do cliente após o prazo

### 5. Gerador de Slideshow (Vídeo) — PENDENTE
- Vídeo automático com fotos selecionadas, trilha sonora e transições
- Marca discreta do sistema (marketing viral via compartilhamento)
- Requer: `fluent-ffmpeg`, fila de jobs assíncrona (Bull/BeeQueue), armazenamento de vídeos gerados
