# FS FOTOGRAFIAS - Instrucoes para o Assistente de IA

## O QUE E ESTE PROJETO

Plataforma de portfolio fotografico com 3 frontends e 1 backend:
- **Site publico** (`public/index.html` + `public/js/main.js`) - Portfolio, galeria, FAQ, contato
- **Painel admin** (`admin/`) - Gerencia todo o conteudo do site
- **Galeria do cliente** (`cliente/index.html` + `cliente/js/gallery.js`) - Fotos privadas com codigo de acesso
- **API backend** (`src/server.js` + `src/routes/`) - Express.js + MongoDB

Deploy: **VPS Contabo** (Ubuntu + Nginx + PM2 + MongoDB local). Dominio: `app.fsfotografias.com.br`
Path na VPS: `/var/www/fs-saas`

---

## REGRAS CRITICAS - NUNCA QUEBRE ESTAS

1. **Admin JS = ES Modules puros.** Nunca use `require()`, `module.exports`, ou `exports`. Sempre `import/export`. O Nginx serve esses arquivos como static com content-type `application/javascript`.

2. **Backend JS = CommonJS.** O `package.json` tem `"type": "commonjs"`. Use `require()` e `module.exports` em tudo dentro de `src/`.

3. **Admin tabs usam INLINE STYLES, nao classes Tailwind.** O admin tem tema escuro (fundo `#111827`). Classes Tailwind como `bg-white`, `text-gray-600` ficam invisiveis. Use sempre `style="background:#1f2937; color:#f3f4f6;"` etc.

4. **Upload de imagens salva no disco local** em `/uploads/`. Retorna URL relativa `/uploads/filename.jpg`. NAO usar servicos externos (Cloudinary, S3, etc).

5. **Sempre rode `npm run build:css` antes de deploy** se alterar qualquer HTML que use classes Tailwind. O Tailwind v4 compila de `assets/css/tailwind-input.css` para `assets/css/tailwind.css`.

---

## ARQUITETURA

```
Site/
  admin/
    index.html              # Shell do painel (login + sidebar + container)
    js/
      app.js                # Orquestrador: init, login, switchTab, logout
      state.js              # Estado global: appState, loadAppData, saveAppData
      tabs/                 # 1 arquivo por aba, carregado via dynamic import
        perfil.js           # renderPerfil(container) - Perfil do estudio, logo, watermark
        hero.js             # renderHero(container)
        sobre.js            # renderSobre(container)
        portfolio.js        # renderPortfolio(container)
        albuns.js           # renderAlbuns(container)
        estudio.js          # renderEstudio(container)
        faq.js              # renderFaq(container)
        newsletter.js       # renderNewsletter(container)
        sessoes.js          # renderSessoes(container)
        clientes.js         # renderClientes(container) - CRM de clientes
        footer.js           # renderFooter(container)
        manutencao.js       # renderManutencao(container)
      utils/
        helpers.js          # resolveImagePath, formatDate, generateId, copyToClipboard, escapeHtml
        upload.js           # compressImage, uploadImage, uploadVideo, showUploadProgress
        api.js              # apiGet, apiPost, apiPut, apiDelete (wrapper com auth automatico)
        photoEditor.js      # photoEditorHtml, setupPhotoEditor (modal reutilizavel)
        notifications.js    # startNotificationPolling, stopNotificationPolling, toggleNotifications, markAllNotificationsRead, onNotifClick
  assets/
    css/
      tailwind-input.css   # Source do Tailwind (com @source paths)
      tailwind.css          # Compilado (nao editar manualmente)
      shared.css            # Fontes Inter/Playfair, animacoes
  public/
    index.html              # Site publico (HTML apenas, sem JS inline)
    albums.html             # Pagina de albuns
    js/
      main.js               # JS do site publico (~730 linhas)
  site/                     # Template do site do fotografo (Fase 9)
    index.html
    js/site.js
    css/site.css
  cliente/
    index.html              # Galeria privada do cliente (HTML apenas, sem JS inline)
    sw.js                   # Service Worker PWA (cache offline de fotos)
    icons/
      icon-192.png          # Icone PWA 192x192
      icon-512.png          # Icone PWA 512x512
    js/
      gallery.js            # JS da galeria do cliente
  uploads/                  # Imagens do admin (servidas pelo Nginx)
  uploads/sessions/         # Fotos de sessoes de clientes
  uploads/videos/           # Videos do estudio (ate 300MB)
  src/
    server.js               # Entry point Express
    middleware/
      auth.js               # authenticateToken (JWT)
    models/
      SiteData.js           # Documento unico com todo o conteudo do site
      Session.js            # Sessoes de clientes (fotos privadas)
      Client.js             # Clientes do fotografo (CRM)
      Notification.js       # Notificacoes do admin (acessos, selecoes, etc)
      Newsletter.js         # Inscritos na newsletter
    routes/
      auth.js               # POST /login, POST /auth/verify
      hero.js               # GET/PUT /hero
      faq.js                # CRUD /faq
      site-data.js          # GET/PUT /site-data, GET /site-config
      newsletter.js         # POST /newsletter/subscribe, GET/DELETE /newsletter
      sessions.js           # CRUD /sessions, upload/delete fotos, client endpoints
      clients.js            # CRUD /clients, GET /clients/:id/sessions
      upload.js             # POST /admin/upload (imagens em /uploads/), POST /admin/upload-video (videos em /uploads/videos/)
      notifications.js      # GET /notifications, GET /notifications/unread-count, PUT /notifications/read-all
      organization.js       # GET/PUT /organization/profile, GET /organization/public
      site.js               # GET /site/config, PUT /site/admin/config (Fase 9)
    utils/
      multerConfig.js       # createUploader(subdir, options) - config compartilhada do multer
      notifications.js      # notify(type, sessionId, sessionName, message) - helper de criacao
      deadlineChecker.js    # checkDeadlines(orgId) - verifica prazos e gera notificacoes
  package.json              # Node 22, CommonJS
```

---

## COMO FUNCIONA O FLUXO DE DADOS

### Salvar dados do admin:
```
Tab chama saveAppData('secao', dados)
  → state.js monta payload completo: { ...appState.appData, [secao]: dados }
  → PUT /api/site-data com payload completo
  → Backend: SiteData.findOneAndUpdate({}, payload, { upsert: true })
  → MongoDB atualiza o documento unico
```

### Carregar dados no site publico:
```
public/js/main.js → loadRemoteData()
  → Promise.all([fetch('/api/site-data'), fetch('/api/hero')])
  → Combina: { ...siteData, hero: heroData }
  → Renderiza cada secao com os dados
```

### Upload de imagens:
```
Tab chama uploadImage(file, token, onProgress)
  → utils/upload.js comprime imagem (1200px, 85% quality)
  → XHR POST /api/admin/upload com FormData
  → Backend: multer salva no disco em /uploads/
  → Retorna { url: '/uploads/filename.jpg', filename: '...' }
  → Tab salva a URL no campo correspondente do appState.appData
  → Chama saveAppData() para persistir no MongoDB
```

### Upload de videos:
```
Tab chama uploadVideo(file, token, onProgress)
  → utils/upload.js envia arquivo direto (sem compressao)
  → XHR POST /api/admin/upload-video com FormData
  → Backend: multer salva no disco em /uploads/videos/ (limite 300MB)
  → Retorna { url: '/uploads/videos/filename.mp4', filename: '...' }
  → Tab salva a URL no campo videoUrl do appState.appData.studio
  → Chama saveAppData() para persistir no MongoDB
```

---

## SISTEMA DE SESSOES E SELECAO DE FOTOS

### Fluxo completo:
```
1. Admin cria sessao (nome, tipo, data, codigo de acesso, modo, limite, preco extra)
2. Admin faz upload de fotos na sessao
3. Cliente acessa /cliente com codigo → ve galeria
4. Se modo = 'selection':
   a. Cliente seleciona fotos (coracao) → optimistic UI + salva no servidor
   b. Cliente clica "Finalizar Selecao" → status muda para 'submitted'
   c. Admin ve notificacao, revisa, pode reabrir ou marcar como entregue
   d. Se entregue: cliente ve fotos para download (sem watermark)
5. Se modo = 'gallery': cliente so visualiza/baixa fotos
```

### Status da selecao (selectionStatus):
| Status | Descricao |
|--------|-----------|
| `pending` | Sessao criada, cliente ainda nao selecionou |
| `in_progress` | Cliente comecou a selecionar (ou admin reabriu) |
| `submitted` | Cliente finalizou selecao |
| `delivered` | Admin marcou como entregue (cliente pode baixar) |

### Modelo Session:
```javascript
{
  name: String,                     // Nome do cliente
  type: String,                     // Tipo: Familia, Casamento, Evento, etc
  date: Date,                       // Data da sessao
  accessCode: String,               // Codigo de acesso do cliente
  photos: [{                        // Fotos da sessao
    id: String,
    filename: String,
    url: String,                    // thumb 1200px (para galeria com watermark)
    urlOriginal: String,            // original sem compressao (para entrega em alta)
    uploadedAt: Date,
    comments: [{ text, createdAt, author: 'client'|'admin' }]
  }],
  mode: 'selection' | 'gallery',    // Modo da sessao
  packageLimit: Number,             // Limite de fotos do pacote (default 30)
  extraPhotoPrice: Number,          // Preco por foto extra (default R$25)
  selectionStatus: String,          // pending → in_progress → submitted → delivered | expired
  selectedPhotos: [String],         // IDs das fotos selecionadas pelo cliente
  selectionSubmittedAt: Date,       // Data do envio da selecao
  selectionDeadline: Date,          // Data limite para selecao
  deadlineWarningSent: Boolean,     // Aviso de 3 dias enviado
  deadlineExpiredSent: Boolean,     // Aviso de expiracao enviado
  deliveredAt: Date,                // Data da entrega
  coverPhoto: String,               // URL da foto de capa da galeria
  highResDelivery: Boolean,         // Entrega em alta resolucao (default false) — serve urlOriginal no download
  watermark: Boolean,               // Mostrar watermark (default true)
  canShare: Boolean,                // Cliente pode compartilhar (default false)
  isActive: Boolean                 // Sessao ativa (default true)
}
```

### Rotas do cliente (sem autenticacao):
| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/client/verify-code` | Verifica codigo de acesso |
| GET | `/api/client/photos/:id?code=X` | Carrega fotos da sessao |
| PUT | `/api/client/select/:id` | Seleciona/deseleciona uma foto |
| POST | `/api/client/submit-selection/:id` | Finaliza a selecao |
| POST | `/api/client/request-reopen/:id` | Pede reabertura da selecao |
| POST | `/api/client/comments/:sessionId` | Adiciona comentario em foto |
| GET | `/api/client/download/:sessionId/:photoId?code=X` | Download individual (original se highResDelivery) |
| GET | `/api/client/download-all/:sessionId?code=X` | Download ZIP de todas as fotos entregues |

### Rotas do admin (com autenticacao):
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/sessions` | Lista todas as sessoes |
| POST | `/api/sessions` | Cria nova sessao |
| PUT | `/api/sessions/:id` | Edita sessao (inclui highResDelivery) |
| DELETE | `/api/sessions/:id` | Deleta sessao |
| POST | `/api/sessions/:id/photos` | Upload de fotos (salva original + thumb 1200px) |
| DELETE | `/api/sessions/:id/photos/:photoId` | Deleta uma foto (remove thumb e original do disco) |
| PUT | `/api/sessions/:id/reopen` | Reabre selecao (submitted → in_progress) |
| PUT | `/api/sessions/:id/deliver` | Marca como entregue |
| POST | `/api/sessions/:id/photos/:photoId/comments` | Admin adiciona comentario em foto |
| POST | `/api/sessions/:id/participants` | Adiciona participante (multi-seleção) |
| PUT | `/api/sessions/:id/participants/:pid` | Edita participante |
| DELETE | `/api/sessions/:id/participants/:pid` | Remove participante |
| PUT | `/api/sessions/:id/participants/:pid/deliver` | Entrega individual |
| GET | `/api/sessions/:id/participants/export` | Exporta seleções dos participantes |
| GET | `/api/sessions/:sessionId/export` | Exporta lista de fotos selecionadas (Lightroom TXT) |
| GET | `/api/site/config` | Config pública do site do fotógrafo |
| PUT | `/api/site/admin/config` | Atualiza config do site (admin) |
| POST | `/api/sessions/check-deadlines` | Verifica prazos e gera notificacoes (Cron) |

### Rotas de Clientes (CRM - com autenticacao):
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/clients` | Lista clientes com contagem de sessoes |
| POST | `/api/clients` | Cria cliente |
| PUT | `/api/clients/:id` | Edita cliente |
| DELETE | `/api/clients/:id` | Deleta cliente (desvincula sessoes) |
| GET | `/api/clients/:id/sessions` | Sessoes vinculadas ao cliente |

---

## SISTEMA DE NOTIFICACOES

### Tipos de notificacao:
| Tipo | Icone | Quando |
|------|-------|--------|
| `session_accessed` | 👁️ | Cliente acessa a galeria |
| `selection_started` | 🎯 | Cliente comeca a selecionar |
| `selection_submitted` | ✅ | Cliente finaliza a selecao |
| `reopen_requested` | 🔄 | Cliente pede reabertura |

### Modelo Notification:
```javascript
{
  type: String,          // Tipo da notificacao
  sessionId: String,     // ID da sessao relacionada
  sessionName: String,   // Nome do cliente
  message: String,       // Mensagem para exibir
  read: Boolean          // Se foi lida (default false)
}
```

### Rotas da API:
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/notifications` | Lista notificacoes recentes |
| GET | `/api/notifications/unread-count` | Contagem de nao lidas |
| PUT | `/api/notifications/read-all` | Marca todas como lidas |

### Como funciona no admin:
- Polling a cada 30 segundos (`admin/js/utils/notifications.js`)
- Badge no sininho mostra contagem de nao lidas
- Dropdown lista notificacoes com icone, mensagem e tempo relativo
- Clicar numa notificacao navega para a aba Sessoes
- Botao "Marcar todas como lidas" zera o badge

### Backend: helper de criacao (`src/utils/notifications.js`):
```javascript
const { notify } = require('../utils/notifications');
await notify('selection_submitted', session._id, session.name, `${session.name} finalizou a selecao`);
```

---

## GALERIA DO CLIENTE

A galeria do cliente (`cliente/index.html` + `cliente/js/gallery.js`) e uma SPA minimalista:

### Funcionalidades:
- **Login**: campo de codigo de acesso, validado via API
- **Grid de fotos**: 2 colunas mobile, 3 tablet, 4 desktop
- **Watermark**: overlay "FS FOTOGRAFIAS" sobre cada foto (removido quando entregue)
- **Selecao**: coracao no canto de cada foto, contador no topo e barra inferior fixa
- **Fotos extras**: acima do limite do pacote mostra valor adicional (R$ X,XX)
- **Lightbox**: visualizacao em tela cheia com navegacao por setas e swipe touch
- **Status screens**: "Selecao Enviada" (com grid das fotos selecionadas) ou "Aguardando Processamento"
- **Pedir reabertura**: botao "Preciso alterar minha selecao" na tela de status
- **Polling 15s**: detecta automaticamente quando admin reabre a selecao ou entrega
- **Modo gallery**: so visualizacao/download (sem selecao)
- **Modo delivered**: fotos sem watermark, com botao de download

### Anti-copia:
- `oncontextmenu="return false"` no body
- `-webkit-user-select: none` no body
- `pointer-events: none` nas imagens
- Watermark overlay sobre cada foto

---

## PADRAO DO PHOTO EDITOR MODAL

O componente reutilizavel `admin/js/utils/photoEditor.js` permite ajustar enquadramento de fotos em qualquer tab. Ele foi extraido de 3 tabs que tinham codigo duplicado.

### Como usar em um novo tab:

```javascript
import { photoEditorHtml, setupPhotoEditor } from '../utils/photoEditor.js';

// 1. No HTML template, adicionar o modal:
container.innerHTML = `
  ... seu conteudo ...
  ${photoEditorHtml('meuEditorModal', '3/4')}
`;
// Aspect ratios disponiveis: '3/4' (portfolio), '1/1' (sobre), '16/9' (estudio), ou qualquer valor CSS

// 2. Abrir o editor para uma foto:
window.openMeuEditor = (idx) => {
  const photo = fotos[idx];
  setupPhotoEditor(container, 'meuEditorModal', resolveImagePath(photo.image),
    { scale: photo.scale, posX: photo.posX, posY: photo.posY },
    async (pos) => {
      // pos = { scale, posX, posY }
      fotos[idx] = { ...fotos[idx], ...pos };
      appState.appData.secao = dados;
      await saveAppData('secao', dados);
      renderMinhaAba(container);
    }
  );
};
```

### API do componente:
- `photoEditorHtml(modalId, aspectRatio)` - retorna string HTML do modal
- `setupPhotoEditor(container, modalId, imageUrl, currentPos, onSave)` - configura sliders, preview, callbacks
  - `currentPos`: `{ scale: Number, posX: Number, posY: Number }`
  - `onSave`: callback que recebe `{ scale, posX, posY }` quando usuario clica "Salvar"

---

## COMO CRIAR UMA NOVA ABA NO ADMIN

### 1. Criar o arquivo do tab

Criar `admin/js/tabs/novaaba.js`:

```javascript
/**
 * Tab: Nome da Aba
 */

import { appState, saveAppData } from '../state.js';
// Se precisar de upload:
import { uploadImage, showUploadProgress } from '../utils/upload.js';
// Se precisar de helpers:
import { resolveImagePath, generateId } from '../utils/helpers.js';
// Se precisar de editor de enquadramento:
import { photoEditorHtml, setupPhotoEditor } from '../utils/photoEditor.js';

export async function renderNovaaba(container) {
  const dados = appState.appData.novaaba || {};

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Nome da Aba</h2>

      <!-- CAMPOS - sempre com inline styles dark mode -->
      <div>
        <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.5rem; color:#d1d5db;">Campo</label>
        <input type="text" id="campoX" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#1f2937; color:#f3f4f6;"
          value="${dados.campo || ''}">
      </div>

      <!-- BOTAO SALVAR - sempre azul -->
      <button id="saveBtn" style="background:#2563eb; color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
        Salvar
      </button>
    </div>
  `;

  // Event listeners
  container.querySelector('#saveBtn').onclick = async () => {
    const novoDados = {
      campo: container.querySelector('#campoX').value
    };
    appState.appData.novaaba = novoDados;
    await saveAppData('novaaba', novoDados);
  };
}
```

### 2. Adicionar na sidebar do admin

Em `admin/index.html`, dentro da `<nav>`:
```html
<div data-tab="novaaba" class="nav-item">Nome da Aba</div>
```

### 3. Pronto

O `app.js` carrega automaticamente via `import(\`./tabs/${tabName}.js\`)` e chama `renderNovaaba(container)`. Nao precisa editar `app.js`.

---

## PALETA DE CORES DO ADMIN (inline styles)

| Elemento | Cor |
|----------|-----|
| Fundo da pagina | `#111827` |
| Fundo de cards/containers | `#1f2937` |
| Fundo de inputs | `#111827` |
| Borda | `#374151` |
| Texto principal | `#f3f4f6` |
| Texto secundario/labels | `#d1d5db` |
| Texto desabilitado | `#9ca3af` |
| Botao primario (salvar) | `background:#2563eb` |
| Botao adicionar | `background:#16a34a` |
| Botao deletar/texto | `color:#ef4444` |
| Botao editar/texto | `color:#60a5fa` |
| Texto de sucesso | `color:#34d399` |
| Texto de erro | `color:#f87171` |

---

## COMO CRIAR UMA NOVA ROTA NO BACKEND

### 1. Criar o arquivo de rota

Criar `src/routes/novarota.js`:

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// GET publico (sem auth)
router.get('/novarota', async (req, res) => {
  try {
    // buscar dados...
    res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST protegido (com auth)
router.post('/novarota', authenticateToken, async (req, res) => {
  try {
    const { campo1, campo2 } = req.body;
    // salvar dados...
    res.json({ success: true });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

### 2. Registrar no server.js

```javascript
const novarotaRoutes = require('./routes/novarota');
app.use('/api', novarotaRoutes);
```

---

## COMO CRIAR UM NOVO MODELO MONGOOSE

```javascript
const mongoose = require('mongoose');

const NovoModelSchema = new mongoose.Schema({
  campo: { type: String, required: true },
  numero: { type: Number, default: 0 },
  ativo: { type: Boolean, default: true }
}, {
  timestamps: true  // sempre incluir
});

module.exports = mongoose.model('NovoModel', NovoModelSchema);
```

**Padrao do SiteData (documento unico com upsert):**
```javascript
// Buscar
const data = await SiteData.findOne({});

// Salvar (upsert)
const result = await SiteData.findOneAndUpdate(
  {},
  { $set: payload },
  { upsert: true, new: true, runValidators: true }
);
```

---

## PADRAO DE UPLOAD DE IMAGENS NO TAB

Se um tab precisa de upload de imagem, siga este padrao:

```javascript
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { resolveImagePath } from '../utils/helpers.js';

// No HTML template:
`
<label style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; font-weight:600; cursor:pointer;">
  Upload
  <input type="file" accept=".jpg,.jpeg,.png" id="uploadInput" style="display:none;">
</label>
<div id="uploadProgress"></div>
`

// No event listener:
container.querySelector('#uploadInput').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const result = await uploadImage(file, appState.authToken, (percent) => {
      showUploadProgress('uploadProgress', percent);
    });
    // result.url = URL local (/uploads/filename.jpg)
    dados.image = result.url;
    e.target.value = '';
  } catch (error) {
    alert('Erro: ' + error.message);
  }
};

// Para exibir a imagem:
`<img src="${resolveImagePath(dados.image)}" style="...">`
```

**Para upload multiplo:**
```javascript
`<input type="file" accept=".jpg,.jpeg,.png" multiple id="uploadInput" style="display:none;">`

container.querySelector('#uploadInput').onchange = async (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  for (const file of files) {
    try {
      const result = await uploadImage(file, appState.authToken);
      lista.push(result.url);  // ou { image: result.url, posX: 50, posY: 50, scale: 1 }
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  }

  appState.appData.secao = dados;
  await saveAppData('secao', dados);
  renderMinhaAba(container);  // re-renderizar
};
```

---

## PADRAO DE LISTA COM CRUD NO TAB

Para tabs que gerenciam uma lista de itens (FAQ, portfolio, albuns):

```javascript
// Dados: array no appState.appData
const items = appState.appData.minhaLista || [];

// Renderizar cada item
items.forEach((item, index) => {
  html += `
    <div style="border:1px solid #374151; border-radius:0.375rem; padding:1rem; background:#1f2937;">
      <input type="text" value="${item.titulo}" data-item-titulo="${index}"
        style="width:100%; ... background:#111827; color:#f3f4f6;">
      <button onclick="deleteItem(${index})" style="color:#ef4444; background:none; border:none; cursor:pointer;">Delete</button>
    </div>
  `;
});

// Adicionar
container.querySelector('#addBtn').onclick = () => {
  items.push({ id: generateId(), titulo: 'Novo' });
  renderMinhaAba(container);  // re-renderiza tudo
};

// Deletar (expor no window para onclick inline)
window.deleteItem = async (index) => {
  if (!confirm('Remover?')) return;
  items.splice(index, 1);
  appState.appData.minhaLista = items;
  await saveAppData('minhaLista', items);
  renderMinhaAba(container);
};

// Salvar
container.querySelector('#saveBtn').onclick = async () => {
  const updated = [];
  container.querySelectorAll('[data-item-titulo]').forEach((input, idx) => {
    updated.push({
      id: items[idx]?.id || generateId(),
      titulo: input.value
    });
  });
  appState.appData.minhaLista = updated;
  await saveAppData('minhaLista', updated);
};
```

---

## PADRAO DE TAB QUE CHAMA API DIRETAMENTE

Newsletter e Sessoes nao usam `saveAppData()` porque tem seus proprios modelos MongoDB. Padrao:

```javascript
// Usando o wrapper api.js (recomendado):
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api.js';

const data = await apiGet('/api/endpoint');
const result = await apiPost('/api/endpoint', { campo1, campo2 });
await apiPut(`/api/endpoint/${id}`, { campo: 'valor' });
await apiDelete(`/api/endpoint/${id}`);

// Ou com fetch manual (se precisar de controle extra):
const response = await fetch('/api/endpoint', {
  headers: { 'Authorization': `Bearer ${appState.authToken}` }
});
if (!response.ok) throw new Error('Erro ao carregar');
const result = await response.json();
```

---

## PADRAO DE HOVER OVERLAY EM IMAGENS

Para botoes que aparecem ao passar o mouse sobre imagens:

```javascript
// No HTML:
`
<div class="meu-item" style="position:relative; ...">
  <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
  <div class="meu-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.5); opacity:0; transition:opacity 0.2s; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
    <button onclick="editar(${idx})" style="background:#3b82f6; color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer;">Editar</button>
    <button onclick="deletar(${idx})" style="background:#ef4444; color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer;">Deletar</button>
  </div>
</div>
`

// No JS apos innerHTML:
container.querySelectorAll('.meu-item').forEach(item => {
  const overlay = item.querySelector('.meu-overlay');
  item.onmouseenter = () => { overlay.style.opacity = '1'; };
  item.onmouseleave = () => { overlay.style.opacity = '0'; };
});
```

---

## VARIAVEIS DE AMBIENTE

### VPS (producao - `/var/www/fs-saas/.env`):
```
NODE_ENV=production
PORT=3051                                         # Porta do Express (Nginx faz proxy)
JWT_SECRET=...                                    # Secret para assinar tokens
ADMIN_PASSWORD_HASH=...                           # Hash bcrypt da senha
OWNER_EMAIL=...                                   # Email do dono da plataforma
BASE_DOMAIN=app.fsfotografias.com.br              # Dominio base do SaaS
OWNER_SLUG=fs                                     # Slug da organizacao principal
SMTP_HOST=smtp.titan.email                        # Servidor SMTP
SMTP_PORT=465                                     # Porta SMTP
SMTP_USER=...                                     # Email SMTP
SMTP_PASS=...                                     # Senha SMTP
```

### Local (desenvolvimento - `.env` na raiz):
```
PORT=3051
NODE_ENV=development
MONGODB_URI=mongodb+srv://...                     # MongoDB Atlas (dev)
JWT_SECRET=...
BASE_DOMAIN=fsfotografias.com.br
OWNER_SLUG=fs
OWNER_EMAIL=...
```

**IMPORTANTE**: Na VPS o MongoDB e local (`mongodb://localhost:27017/fsfotografias`), configurado diretamente no `src/server.js` como fallback quando `MONGODB_URI` nao esta definido.

---

## COMANDOS

```bash
npm run dev          # Servidor local com nodemon (desenvolvimento)
npm run build:css    # Compilar Tailwind CSS
npm start            # Iniciar servidor (producao)
```

---

## DEPLOY NA VPS

O app SaaS roda na VPS Contabo com Nginx como reverse proxy e PM2 como process manager.
Path: `/var/www/fs-saas`

**ATENCAO**: Na VPS existem DOIS apps separados:
- `/var/www/fs-fotografias` → Site original (single-tenant) em `fsfotografias.com.br` (porta 3002)
- `/var/www/fs-saas` → App SaaS (multi-tenant) em `app.fsfotografias.com.br` (porta 3051)

### Deploy de atualizacoes:
```bash
# Do seu computador local:
git add . && git commit -m "descricao" && git push

# Na VPS (via SSH):
cd /var/www/fs-saas && git pull && npm install && pm2 restart fsfotografias-saas
```

### Estrutura do servidor:
```
Nginx (porta 80/443)

  Config: /etc/nginx/sites-enabled/fs-saas
  Server name: app.fsfotografias.com.br
  ├── /uploads/     → /var/www/fs-saas/uploads/ (static)
  ├── /assets/      → /var/www/fs-saas/assets/ (static)
  ├── /admin/js/    → /var/www/fs-saas/admin/js/ (static, ESM)
  ├── /saas-admin/  → /var/www/fs-saas/saas-admin/ (static)
  └── /*            → localhost:3051 (proxy para Node.js)

PM2 processos:
  - fsfotografias      (id 2) → porta 3002 (site original, NAO MEXER)
  - fsfotografias-saas (id 4) → porta 3051 (app SaaS)

MongoDB: localhost:27017 (sempre conectado)
SSL: Let's Encrypt via Certbot (auto-renovacao)
```

### URLs atuais (temporario ate dominio proprio):
| URL | Destino |
|-----|---------|
| `fsfotografias.com.br` | Site original do fotografo |
| `app.fsfotografias.com.br` | App SaaS (redireciona para o site pois o Nginx do site original tambem responde) |
| `app.fsfotografias.com.br/cadastro` | Landing page do SaaS (cadastro de fotografos) |
| `app.fsfotografias.com.br/admin/` | Painel admin do fotografo |
| `app.fsfotografias.com.br/saas-admin/` | Painel super-admin do SaaS |
| `app.fsfotografias.com.br/cliente/` | Galeria do cliente |

---

## CHECKLIST ANTES DE DEPLOY

- [ ] Se alterou HTML do site publico/cliente: rodar `npm run build:css`
- [ ] Se criou novo tab no admin: adicionar `<div data-tab="nome">` no `admin/index.html`
- [ ] Se criou nova rota: registrar com `app.use('/api', require('./routes/arquivo'))` no `server.js`
- [ ] Se criou novo modelo: verificar se tem `timestamps: true`
- [ ] Testar localmente com `npm run dev`
- [ ] Commitar e push para GitHub
- [ ] Na VPS: `cd /var/www/fs-saas && git pull && npm install && pm2 restart fsfotografias-saas`

---

## CUIDADO COM CLASSES TAILWIND ARBITRARIAS NO SITE PUBLICO

**BUG JA CORRIGIDO - NAO REINTRODUZIR:**

Classes Tailwind com valores arbitrarios como `aspect-[3/4]`, `w-[200px]`, `bg-[#123456]` so sao incluidas no CSS compilado se o Tailwind encontra o texto exato durante o build scan. Classes geradas **dinamicamente em JavaScript** (dentro de strings template, concatenacao, etc.) NAO sao detectadas pelo scanner.

**Regra: No site publico (`public/js/main.js`), sempre use inline styles para valores dinamicos em vez de classes Tailwind arbitrarias.**

Exemplo ERRADO:
```javascript
const aspectMap = { '3/4': 'aspect-[3/4]', '1/1': 'aspect-square' };
const cls = aspectMap[ratio];
return `<div class="${cls}">`;  // aspect-[3/4] NAO vai existir no CSS!
```

Exemplo CORRETO:
```javascript
return `<div style="aspect-ratio:${ratio};">`;  // inline style sempre funciona
```

Classes Tailwind padrao (nao arbitrarias) como `aspect-video`, `aspect-square`, `w-full`, `h-full` podem ser usadas normalmente, pois existem no CSS compilado.

---

## ERROS COMUNS E SOLUCOES

| Erro | Causa | Solucao |
|------|-------|---------|
| Conteudo aparece e some no admin | CSS invisivel no tema escuro | Usar inline styles, nao classes Tailwind |
| `@apply` nao funciona | `@apply` so funciona durante build | Substituir por CSS puro ou inline styles |
| Portfolio nao aparece no site | Classe `aspect-[3/4]` nao existe no CSS compilado | Usar inline style `style="aspect-ratio:3/4;"` em vez de classe arbitraria |
| Upload falha com 413 | Payload muito grande | Imagem e comprimida no client (1200px). Se persistir, verificar `client_max_body_size` no Nginx |
| Portfolio mostra imagem quebrada | Item antigo sem campo `image` no MongoDB | `processRemoteData` ja filtra itens sem `image`; nao salvar itens sem URL |
| App nao inicia | MongoDB desligado | `sudo systemctl start mongod` |
| 502 Bad Gateway | Node.js caiu | `pm2 restart fsfotografias` e verificar logs: `pm2 logs fsfotografias` |

---

## MODELO DE DADOS COMPLETO (SiteData)

Documento unico no MongoDB que armazena todo o conteudo do site:

```javascript
{
  hero: {
    title: String,
    subtitle: String,
    image: String,              // URL da imagem (/uploads/xxx ou URL externa)
    imageScale: Number,         // 0.5 a 2
    imagePosX: Number,          // 0 a 100
    imagePosY: Number,          // 0 a 100
    titleFontSize: Number,
    subtitleFontSize: Number,
    topBarHeight: Number,
    bottomBarHeight: Number,
    overlayOpacity: Number
  },
  about: {
    title: String,
    text: String,
    image: String,              // URL da imagem (legado, single)
    images: [{                  // Array de imagens (novo, multiplas)
      image: String,
      posX: Number,
      posY: Number,
      scale: Number
    }]
  },
  portfolio: [                  // Array de fotos
    {
      image: String,            // URL da imagem
      posX: Number,             // 0 a 100 (default 50)
      posY: Number,             // 0 a 100 (default 50)
      scale: Number,            // 1 a 2 (default 1)
      ratio: String             // Aspect ratio: '3/4', '1/1', '16/9' (default '3/4')
    }
  ],
  albums: [                     // Array de albuns
    {
      id: String,
      title: String,
      subtitle: String,
      cover: String,            // URL da foto de capa
      photos: [String],         // Array de URLs
      createdAt: String
    }
  ],
  studio: {
    title: String,
    description: String,
    address: String,
    hours: String,
    whatsapp: String,
    videoUrl: String,           // URL do video do estudio (/uploads/videos/xxx.mp4)
    photos: [                   // Fotos do estudio
      { image: String, posX: Number, posY: Number, scale: Number }
    ],
    whatsappMessages: [         // Mensagens da bolha flutuante
      { text: String, delay: Number }
    ]
  },
  faq: {
    faqs: [
      { id: String, question: String, answer: String }
    ]
  },
  footer: {
    socialMedia: {
      instagram: String,
      facebook: String,
      linkedin: String,
      tiktok: String,
      youtube: String,
      email: String
    },
    quickLinks: [
      { label: String, url: String }
    ],
    newsletter: {
      enabled: Boolean,
      title: String,
      description: String
    },
    copyright: String
  },
  maintenance: {
    enabled: Boolean,
    title: String,
    message: String
  }
}
```

---

## CONTEXTO SAAS E EVOLUCAO DO PROJETO

### Objetivo do Projeto
Este app e um **concorrente direto do PicSize** (picsize.com.br). Referencia competitiva com 30k+ fotografos. Nosso objetivo e oferecer as mesmas funcionalidades com preco menor e arquitetura mais leve.

### Produtos Planejados (equivalentes ao PicSize)
1. **Gallery PRO** (selecao + entrega + prova de albuns) - parcialmente implementado
2. **Site PRO** (site profissional customizavel) - futuro
3. **Entrega Online** (download em alta resolucao) - planejado FASE 4
4. **Prova de Album Folheavel** - planejado FASE 8

### Multi-Tenancy (implementado em 14/02/2026)
- Cada fotografo e uma `Organization` com `slug` unico
- Producao: `slug.dominio.com.br` (subdomain)
- Desenvolvimento: `?_tenant=slug` (query parameter)
- Modelos: `User`, `Organization` (novos), todos os outros com `organizationId`
- Uploads isolados: `/uploads/{orgId}/`
- Login: email + senha (JWT com userId, organizationId, role)
- Script de migracao: `node src/scripts/migrate-to-multitenancy.js`

### Documentacao Complementar
- **ROADMAP.md** - Fases de implementacao detalhadas (12 fases)
- **ARCHITECTURE.md** - Decisoes tecnicas, padroes, escalabilidade
- **MULTITENANCY-README.md** - Detalhes da implementacao multi-tenant
- **MULTITENANCY-CHECKLIST.md** - Checklist de verificacao
- **VPS-GUIDE.md** - Guia da infra na VPS Contabo
- **METODOLOGIA_CLAUDE.md** - Filosofia e padroes de desenvolvimento

### Regras para Novas Features
1. **Sempre filtrar por `organizationId`** em queries e uploads
2. **Novos modelos**: sempre incluir `organizationId` + `timestamps: true`
3. **Novas abas admin**: seguir padrao ES Modules + inline styles dark mode
4. **Novas rotas**: registrar no `server.js` com `app.use('/api', require(...))`
5. **Upload**: salvar em `/uploads/{orgId}/subdir/`
6. **Consultar ROADMAP.md** para saber o que implementar e em que ordem

---

## ATUALIZACAO DE DOCUMENTACAO (OBRIGATORIO)

**Apos implementar qualquer feature do ROADMAP, SEMPRE atualize a documentacao:**

### O que atualizar:

| Documento | Quando atualizar | O que fazer |
|-----------|-----------------|-------------|
| **ROADMAP.md** | SEMPRE | Marcar itens como `[x]`, adicionar data de conclusao |
| **CLAUDE.md** | SEMPRE | Adicionar novos arquivos na estrutura, novas rotas nas tabelas, novos modelos |
| **ARCHITECTURE.md** | Se mudar modelo/relacao | Atualizar diagrama de dados, relacoes, decisoes tecnicas |

### Como atualizar:

1. **ROADMAP.md**: Marcar checkboxes `[x]` dos itens concluidos. Adicionar `(Concluido em DD/MM/AAAA)` no titulo da fase se todas as subtarefas estiverem prontas.
2. **CLAUDE.md**:
   - Se criou nova aba admin → adicionar na arvore de arquivos em "ARQUITETURA"
   - Se criou nova rota → adicionar na arvore de arquivos e nas tabelas de rotas
   - Se criou novo modelo → adicionar na arvore e documentar campos
   - Se mudou padrao/convencao → documentar na secao relevante
3. **ARCHITECTURE.md**: Atualizar apenas se mudar decisao arquitetural, adicionar novo modelo ou nova relacao entre modelos.

**NAO atualizar**: MULTITENANCY-README, REVISAO-FINAL, METODOLOGIA_CLAUDE (sao documentos historicos).

**Quando o usuario pedir "atualize a documentacao"**: seguir as regras acima.

---

## MODELO DE DADOS: Organization (Perfil do Fotografo)

Armazena dados do estudio/fotografo, identidade visual e configuracoes de watermark:

```javascript
{
  name: String,                   // Nome do estudio (obrigatorio)
  slug: String,                   // Slug unico para subdomain (obrigatorio, lowercase)
  ownerId: ObjectId,              // Referencia ao User dono
  plan: 'free' | 'basic' | 'pro', // Plano atual
  isActive: Boolean,
  // Perfil
  logo: String,                   // URL do logotipo (/uploads/{orgId}/xxx)
  phone: String,                  // Telefone
  whatsapp: String,               // Numero WhatsApp (formato 5511999999999)
  email: String,                  // Email de contato publico
  website: String,                // URL do site pessoal
  bio: String,                    // Biografia/descricao
  address: String,                // Endereco
  city: String,                   // Cidade
  state: String,                  // Estado (UF)
  // Identidade visual
  primaryColor: String,           // Cor primaria hex (default #1a1a1a)
  // Watermark
  watermarkType: 'text' | 'logo', // Tipo de watermark
  watermarkText: String,          // Texto customizado do watermark
  watermarkOpacity: Number        // Opacidade 5-50 (default 15)
}
```

### Rotas da Organization:

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/organization/profile` | JWT | Dados completos do perfil (admin) |
| PUT | `/api/organization/profile` | JWT | Atualizar perfil |
| GET | `/api/organization/public` | Tenant | Dados publicos (logo, watermark) para galeria |

### Aba Perfil (`admin/js/tabs/perfil.js`):
- Usa API direta (`apiGet/apiPut`) em vez de `saveAppData()`
- Upload de logo com preview
- Campos: nome, telefone, whatsapp, email, website, endereco, cidade, estado, bio
- Identidade visual: cor primaria (color picker)
- Watermark: tipo (texto/logo), texto, opacidade (slider com preview ao vivo)
- Link do painel (slug.fsfotografias.com.br) com botao copiar

---

## INSTRUCOES PARA IAs - CENARIO ATUAL DA INFRAESTRUTURA

**LEIA ESTA SECAO COM ATENCAO antes de sugerir qualquer alteracao de deploy, infra ou configuracao.**

### Contexto
Este projeto e um SaaS multi-tenant para fotografos. Ele coexiste na mesma VPS com o site original single-tenant do fotografo. Sao dois apps COMPLETAMENTE SEPARADOS com repositorios, bancos, portas e processos PM2 diferentes.

### Regras criticas para IAs:

1. **NUNCA confunda os dois apps:**
   - Site original: `/var/www/fs-fotografias`, PM2 `fsfotografias`, porta `3002`, Nginx `fsfotografias`
   - App SaaS: `/var/www/fs-saas`, PM2 `fsfotografias-saas`, porta `3051`, Nginx `fs-saas`

2. **NUNCA altere a porta do SaaS.** A porta e `3051` (definida no `.env` da VPS). Se mudar, o Nginx retorna 502.

3. **NUNCA mexer no site original** (`/var/www/fs-fotografias`). Ele funciona independentemente e nao faz parte deste repositorio.

4. **NUNCA modificar configs do Nginx** sem autorizacao explicita do usuario. Erros de Nginx derrubam ambos os sites.

5. **NUNCA fazer `pm2 restart all`** - isso reinicia TODOS os processos. Use sempre `pm2 restart fsfotografias-saas`.

6. **Deploy correto:**
   ```bash
   cd /var/www/fs-saas && git pull && npm install && pm2 restart fsfotografias-saas
   ```

7. **Logs do SaaS:**
   ```bash
   pm2 logs fsfotografias-saas --lines 50
   ```

8. **Se o usuario reportar 502 Bad Gateway:**
   - Verificar se PM2 esta rodando: `pm2 list`
   - Verificar logs: `pm2 logs fsfotografias-saas --lines 50`
   - Verificar se a porta 3051 esta no `.env`: `grep PORT /var/www/fs-saas/.env`
   - Reiniciar: `pm2 restart fsfotografias-saas`

9. **DNS e SSL:**
   - DNS gerenciado na Hostinger (nao no Contabo)
   - `app.fsfotografias.com.br` → A record para `5.189.174.18`
   - SSL via Let's Encrypt/Certbot (auto-renovacao)
   - Certificados em `/etc/letsencrypt/live/`

10. **Desenvolvimento local:**
    - Porta: `3051` (mesma da producao)
    - MongoDB: Atlas (cloud) no dev, local na VPS
    - Tenant em dev: `?_tenant=slug` (query parameter)
    - Tenant em prod: subdomain (`slug.app.fsfotografias.com.br` - futuro)

### Arquivos de configuracao na VPS (referencia, NAO editar sem pedir):
| Arquivo | Funcao |
|---------|--------|
| `/var/www/fs-saas/.env` | Variaveis de ambiente do SaaS |
| `/etc/nginx/sites-enabled/fs-saas` | Config Nginx do SaaS |
| `/etc/nginx/sites-enabled/fsfotografias` | Config Nginx do site original (NAO MEXER) |
| PM2 ecosystem | Gerenciado via CLI, sem arquivo ecosystem.config.js |

---

## FALE EM PORTUGUES

O usuario fala portugues brasileiro. Todas as mensagens, alerts, labels, placeholders e comentarios devem ser em portugues.
