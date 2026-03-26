# CliqueZoom - Instrucoes para o Assistente de IA

## O QUE E ESTE PROJETO

Plataforma SaaS de gestao fotografica (CliqueZoom) com varios frontends e 1 backend:
- **Home / cadastro** (`home/index.html`) - Landing page de cadastro da plataforma (conteudo editavel via saas-admin)
- **Painel admin** (`admin/`) - Painel do fotografo: gerencia site, sessoes, clientes, perfil
- **Galeria do cliente** (`cliente/index.html` + `cliente/js/gallery.js`) - Fotos privadas com codigo de acesso
- **Painel super-admin** (`saas-admin/`) - Gerencia toda a plataforma SaaS (orgs, landing page, metricas)
- **Site do fotografo** (`/site`) - Site publico gerado dinamicamente a partir de 5 templates
- **API backend** (`src/server.js` + `src/routes/`) - Express.js + MongoDB

Deploy: **VPS Contabo** (Ubuntu + Nginx + PM2 + MongoDB local). Dominio: `cliquezoom.com.br`
Path na VPS: `/var/www/cz-saas`

---

## REGRAS CRITICAS - NUNCA QUEBRE ESTAS

1. **Admin JS = ES Modules puros.** Nunca use `require()`, `module.exports`, ou `exports`. Sempre `import/export`. O Nginx serve esses arquivos como static com content-type `application/javascript`.

2. **Backend JS = CommonJS.** O `package.json` tem `"type": "commonjs"`. Use `require()` e `module.exports` em tudo dentro de `src/`.

3. **Admin tabs usam INLINE STYLES com CSS variables do tema.** O admin tem tema GitHub dark. Use as CSS variables: `var(--bg-surface)`, `var(--text-primary)`, etc. (ver paleta abaixo). Nunca use classes Tailwind como `bg-white`, `text-gray-600` — ficam invisiveis.

4. **Upload de imagens salva no disco local** em `/uploads/`. Retorna URL relativa `/uploads/filename.jpg`. NAO usar servicos externos (Cloudinary, S3, etc).

5. **Sempre rode `npm run build:css` antes de deploy** se alterar qualquer HTML que use classes Tailwind. O Tailwind v4 compila de `assets/css/tailwind-input.css` para `assets/css/tailwind.css`.

6. **Nunca use `alert()` ou `confirm()` no admin.** Use `window.showToast(msg, type)` e `window.showConfirm(msg, opts)` de `admin/js/utils/toast.js`.

---

## ARQUITETURA

```
FsSaaS/
  home/
    index.html              # Home / cadastro da plataforma CliqueZoom (rota /)
    js/
      home.js               # JS do formulario de cadastro
  saas-admin/
    index.html              # Painel super-admin (login + tabs: Organizacoes, Lixeira, Landing Page)
    js/
      app.js                # Toda a logica do painel super-admin
  admin/
    index.html              # Shell do painel (login + sidebar + builder mode)
    js/
      app.js                # Orquestrador: init, login, switchTab, logout, builder mode, toast
      state.js              # Estado global: appState, loadAppData, saveAppData
      tabs/                 # 1 arquivo por aba, carregado via dynamic import
        dashboard.js        # renderDashboard(container) - Stats, sessoes recentes, acoes rapidas
        perfil.js           # renderPerfil(container) - Perfil do estudio, logo, watermark
        meu-site.js         # renderMeuSite(container) - Builder mode com preview em tempo real
        sessoes.js          # renderSessoes(container) - CRUD de sessoes, upload de fotos
        clientes.js         # renderClientes(container) - CRM de clientes
        albuns.js           # renderAlbuns(container) - Gerencia albuns de fotos
        portfolio.js        # renderPortfolio(container) - Gerencia portfolio
        estudio.js          # renderEstudio(container) - Info do estudio, video
        faq.js              # renderFaq(container) - Perguntas frequentes
        newsletter.js       # renderNewsletter(container) - Inscritos na newsletter
        footer.js           # renderFooter(container) - Redes sociais, links rapidos
        manutencao.js       # renderManutencao(container) - Modo manutencao
        integracoes.js      # renderIntegracoes(container) - Integracoes externas
        dominio.js          # renderDominio(container) - Configuracao de dominio
        marketing.js        # renderMarketing(container) - Marketing
        plano.js            # renderPlano(container) - Plano atual
      utils/
        helpers.js          # resolveImagePath, formatDate, generateId, copyToClipboard, escapeHtml
        upload.js           # compressImage, uploadImage, uploadVideo, showUploadProgress
        api.js              # apiGet, apiPost, apiPut, apiDelete (wrapper com auth automatico)
        photoEditor.js      # photoEditorHtml, setupPhotoEditor (modal reutilizavel)
        notifications.js    # startNotificationPolling, stopNotificationPolling, toggleNotifications, markAllNotificationsRead, onNotifClick
        toast.js            # showToast(msg, type, duration), showConfirm(msg, opts) — substitui alert/confirm
  assets/
    css/
      tailwind-input.css   # Source do Tailwind (com @source paths)
      tailwind.css          # Compilado (nao editar manualmente)
      shared.css            # Fontes Inter/Playfair, animacoes
  site/                     # Sistema de templates do site do fotografo
    templates/
      elegante/             # Classico dourado/serif (Playfair Display)
        index.html
        css/style.css
      minimalista/          # Clean P&B, grid 2 colunas, muito espaco
        index.html
        css/style.css
      moderno/              # Azul/gradientes, assimetrico, floating cards
        index.html
        css/style.css
      escuro/               # Dark mode (#0a0a0a), laranja (#ff9500), fullscreen
        index.html
        css/style.css
      galeria/              # Masonry grid Pinterest-style, foco em fotos
        index.html
        css/style.css
      shared-site.js        # JS compartilhado entre todos os templates + listener postMessage
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
      Organization.js       # Dados da org: perfil, slug, plano, watermark, siteTheme, siteConfig
      User.js               # Usuario dono da organizacao
      SiteData.js           # Documento unico com todo o conteudo do site (legado)
      LandingData.js        # Documento unico com todo o conteudo da landing page do SaaS
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
      upload.js             # POST /admin/upload, POST /admin/upload-video
      notifications.js      # GET/PUT /notifications
      organization.js       # GET/PUT /organization/profile, GET /organization/public
      site.js               # GET /site/config, PUT /site/admin/config
      landing.js            # GET /landing/config, PUT /admin/landing/config
    utils/
      multerConfig.js       # createUploader(subdir, options)
      notifications.js      # notify(type, sessionId, sessionName, message)
      deadlineChecker.js    # checkDeadlines(orgId)
  package.json              # Node 22, CommonJS
```

---

## PAINEL ADMIN — DESIGN SYSTEM (atualizado)

O admin usa um tema GitHub dark moderno com CSS variables definidas no `:root` de `admin/index.html`.

### CSS Variables do tema:
```css
:root {
  --sidebar-w: 220px;
  --header-h: 56px;
  --bg-base: #0d1117;        /* fundo da pagina */
  --bg-surface: #161b22;     /* cards, sidebar, topbar */
  --bg-elevated: #1c2128;    /* inputs, modais */
  --bg-hover: #21262d;       /* hover states */
  --border: #30363d;         /* bordas */
  --text-primary: #e6edf3;   /* texto principal */
  --text-secondary: #8b949e; /* texto secundario */
  --text-muted: #484f58;     /* texto desabilitado */
  --accent: #2f81f7;         /* azul primario */
  --accent-hover: #1f6feb;
  --green: #3fb950;
  --red: #f85149;
  --yellow: #d29922;
  --purple: #bc8cff;
  --orange: #ffa657;
}
```

### Paleta para inline styles (compativel com tema antigo e novo):
| Elemento | CSS Variable | Fallback hex |
|----------|-------------|--------------|
| Fundo pagina | `var(--bg-base)` | `#0d1117` |
| Fundo cards | `var(--bg-surface)` | `#161b22` |
| Fundo inputs | `var(--bg-elevated)` | `#1c2128` |
| Borda | `var(--border)` | `#30363d` |
| Texto principal | `var(--text-primary)` | `#e6edf3` |
| Texto secundario | `var(--text-secondary)` | `#8b949e` |
| Botao primario | `var(--accent)` | `#2f81f7` |
| Botao sucesso | `var(--green)` | `#3fb950` |
| Botao perigo | `var(--red)` | `#f85149` |

**Sempre use CSS variables em novos tabs:** `style="background:var(--bg-surface); color:var(--text-primary); border:1px solid var(--border);"`.

### Layout do admin:
```
#adminPanel (display: flex; height: 100vh)
  ├── #sidebar (220px fixo)
  │     ├── #sidebar-header (logo + notificationBell)
  │     ├── #sidebar-nav (nav-group-label + .nav-item[data-tab])
  │     └── #sidebar-footer (links externos + logout)
  └── #main-area (flex: 1)
        ├── #topbar (56px — titulo + botao "Ver Previa")
        ├── #workspace (flex: 1 — visivel no modo normal)
        │     └── #content-panel → #tabContent (conteudo das abas)
        ├── #builder-props (360px — visivel so no builder mode)
        └── #builder-preview (flex:1 — visivel so no builder mode)
```

### Builder Mode (aba "Meu Site"):
Quando o usuario clica em "Meu Site", o `app.js` entra em builder mode:
- `#sidebar` fica `display: none` (tela cheia)
- `#topbar` fica `display: none`
- `#workspace` fica `display: none`
- `#builder-props` (360px) fica `display: flex` — painel de propriedades
- `#builder-preview` (flex:1) fica `display: flex` — iframe com o site

O builder mode suporta 3 dispositivos: Desktop (scroll vertical), Tablet (768x1024 escalado), Mobile (390x844 escalado).

**Preview em tempo real via postMessage:**
- `admin/js/app.js` expoe `window.builderPostPreview(data)` que envia `{ type: 'cz_preview', data }` ao iframe
- `site/templates/shared-site.js` escuta esse evento e chama `renderSite(data)` diretamente — sem reload
- Quando o iframe termina de carregar, envia `{ type: 'cz_preview_ready' }` de volta
- `meu-site.js` expoe `window._meuSitePostPreview()` que coleta todos os campos do form e chama `builderPostPreview`

**Deteccao de alteracoes nao salvas:**
- `meu-site.js` tem `markDirty(sectionId, label)` e `clearDirty()`
- Ao trocar de sub-aba dentro de "Meu Site", `checkDirtyBeforeSwitch()` pergunta se quer salvar
- Secoes que rastreiam dirty: Hero, Sobre, Contato, Personalizar

### Sistema de notificacoes toast:
Arquivo: `admin/js/utils/toast.js`

```javascript
// Exibir toast (nao bloqueia a UI)
window.showToast('Salvo com sucesso!', 'success');  // success | error | warning | info
window.showToast('Erro ao salvar', 'error', 5000);  // duracao customizavel em ms

// Dialogo de confirmacao (retorna Promise<boolean>)
const ok = await window.showConfirm('Remover este item?', {
  title: 'Confirmar',
  confirmText: 'Remover',
  cancelText: 'Cancelar',
  danger: true   // botao vermelho
});
if (ok) { /* executar acao */ }
```

**NUNCA use `alert()` ou `confirm()` — sempre use `showToast` e `showConfirm`.**

### Skeleton loading:
O `app.js` exibe skeleton animado enquanto a aba carrega. Nao precisa fazer nada — e automatico.

### Atalhos de teclado:
- `Ctrl+S` — clica no botao de salvar da aba ativa
- `Escape` — sai do builder mode (se aberto) ou fecha o modal de preview
- `P` — abre/fecha o modal de preview do site
- `R` — recarrega o preview (se aberto)

---

## COMO FUNCIONA O FLUXO DE DADOS

### Salvar dados do admin (abas que usam SiteData):
```
Tab chama saveAppData('secao', dados)
  → state.js monta payload: { ...appState.appData, [secao]: dados }
  → PUT /api/site-data com payload completo
  → Backend: SiteData.findOneAndUpdate({}, payload, { upsert: true })
  → MongoDB atualiza o documento unico
```

### Salvar dados do site (abas "Meu Site"):
```
Tab chama apiPut('/api/site/admin/config', { siteTheme, siteConfig, siteContent, siteStyle, etc })
  → Backend: Organization.findOneAndUpdate({ organizationId }, payload)
  → MongoDB atualiza o documento da organizacao
```

### Carregar dados no site publico (/site):
```
shared-site.js → fetch('/api/site/config?_tenant=slug')
  → Backend: busca Organization + SiteData e mescla
  → shared-site.js chama renderSite(data) que preenche os IDs do template
```

### Upload de imagens:
```
Tab chama uploadImage(file, token, onProgress)
  → utils/upload.js comprime imagem (1200px, 85% quality)
  → XHR POST /api/admin/upload com FormData
  → Backend: multer salva no disco em /uploads/{orgId}/
  → Retorna { url: '/uploads/orgId/filename.jpg', filename: '...' }
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
  deadlineWarningSent: Boolean,
  deadlineExpiredSent: Boolean,
  deliveredAt: Date,
  coverPhoto: String,               // URL da foto de capa da galeria
  highResDelivery: Boolean,         // Entrega em alta resolucao (serve urlOriginal no download)
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
| GET | `/api/client/download/:sessionId/:photoId?code=X` | Download individual |
| GET | `/api/client/download-all/:sessionId?code=X` | Download ZIP de todas as fotos entregues |

### Rotas do admin para sessoes (com autenticacao JWT):
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/sessions` | Lista todas as sessoes |
| POST | `/api/sessions` | Cria nova sessao |
| PUT | `/api/sessions/:id` | Edita sessao |
| DELETE | `/api/sessions/:id` | Deleta sessao |
| POST | `/api/sessions/:id/photos` | Upload de fotos (salva original + thumb) |
| DELETE | `/api/sessions/:id/photos/:photoId` | Deleta uma foto |
| PUT | `/api/sessions/:id/reopen` | Reabre selecao |
| PUT | `/api/sessions/:id/deliver` | Marca como entregue |
| POST | `/api/sessions/:id/photos/:photoId/comments` | Admin adiciona comentario |
| GET | `/api/sessions/:sessionId/export` | Exporta lista de fotos selecionadas (Lightroom TXT) |
| GET | `/api/site/config` | Config publica do site do fotografo |
| PUT | `/api/site/admin/config` | Atualiza config do site (admin) |

### Rotas de Clientes (CRM):
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/clients` | Lista clientes com contagem de sessoes |
| POST | `/api/clients` | Cria cliente |
| PUT | `/api/clients/:id` | Edita cliente |
| DELETE | `/api/clients/:id` | Deleta cliente |
| GET | `/api/clients/:id/sessions` | Sessoes vinculadas ao cliente |

---

## SISTEMA DE NOTIFICACOES

### Tipos:
| Tipo | Quando |
|------|--------|
| `session_accessed` | Cliente acessa a galeria |
| `selection_started` | Cliente comeca a selecionar |
| `selection_submitted` | Cliente finaliza a selecao |
| `reopen_requested` | Cliente pede reabertura |

### Como funciona no admin:
- Polling a cada 30 segundos (`admin/js/utils/notifications.js`)
- Badge no sininho mostra contagem de nao lidas
- Dropdown lista notificacoes com icone, mensagem e tempo relativo
- Clicar numa notificacao navega para a aba Sessoes

### Backend helper:
```javascript
const { notify } = require('../utils/notifications');
await notify('selection_submitted', session._id, session.name, `${session.name} finalizou a selecao`);
```

---

## GALERIA DO CLIENTE

A galeria (`cliente/index.html` + `cliente/js/gallery.js`) e uma SPA minimalista:

- **Login**: campo de codigo de acesso, validado via API
- **Grid de fotos**: 2 colunas mobile, 3 tablet, 4 desktop
- **Watermark**: overlay sobre cada foto (removido quando entregue)
- **Selecao**: coracao no canto de cada foto, contador no topo e barra inferior fixa
- **Lightbox**: visualizacao em tela cheia com navegacao por setas e swipe touch
- **Polling 15s**: detecta automaticamente quando admin reabre a selecao ou entrega
- **Anti-copia**: oncontextmenu, user-select:none, pointer-events:none nas imagens

---

## SISTEMA DE TEMPLATES DE SITE

O site profissional do fotografo (`/site`) suporta **5 templates** que o fotografo escolhe no admin. Cada template tem HTML+CSS proprios, mas todos compartilham `shared-site.js`.

### Rota dinamica (`/site`):
```javascript
// src/server.js — DEVE vir ANTES do express.static('/site')
app.get('/site', async (req, res) => {
  // 1. Resolve tenant (?_tenant=slug ou subdominio)
  // 2. Busca Organization.siteTheme no MongoDB
  // 3. Serve /site/templates/{theme}/index.html
  // 4. Fallback para 'elegante'
});
```

### JavaScript compartilhado (`shared-site.js`):
1. Detecta tenant
2. Chama `/api/site/config` para buscar dados
3. Preenche elementos do DOM (IDs padrao: `#heroTitle`, `#sobreTitle`, `#portfolioGrid`, etc.)
4. Oculta secoes nao ativadas (`siteSections`)
5. Reordena secoes conforme ordem do admin (insere antes do `#siteFooter`)
6. Escuta `postMessage { type: 'cz_preview', data }` do admin para atualizar em tempo real
7. Envia `{ type: 'cz_preview_ready' }` ao parent quando carregado (sinaliza que esta pronto)

### IDs padrao esperados pelos templates:
- `#heroTitle`, `#heroSubtitle`, `#heroBg`, `#heroOverlay` — Hero
- `#sobreTitle`, `#sobreText`, `#sobreImage` — Sobre
- `#portfolioGrid` — Grid de fotos do portfolio
- `#servicosGrid` — Lista de servicos
- `#depoimentosTrack` — Depoimentos
- `#contatoTitle`, `#contatoText`, `#contactForm` — Contato
- `#faqList` — FAQ
- `#navLogo`, `#navLinks` — Navegacao
- `#siteNav`, `#siteFooter` — Referencias de posicionamento

### Reordenacao de secoes (corrigido):
Os templates sem `<main>` usam `<body>` diretamente. A reordenacao insere as secoes antes do `#siteFooter`:
```javascript
const anchor = document.getElementById('siteFooter');
sectionElements.forEach(el => {
  el.style.display = '';
  document.body.insertBefore(el, anchor);
});
```

### Como adicionar novo template:
1. Criar `site/templates/novo-tema/index.html` com IDs padrao
2. Criar `site/templates/novo-tema/css/style.css`
3. Adicionar `<script src="/site/templates/shared-site.js"></script>` no HTML
4. Adicionar no array de templates em `admin/js/tabs/meu-site.js`
5. Adicionar como opcao valida em `Organization.siteTheme`

---

## ABA MEU SITE — BUILDER MODE

A aba "Meu Site" (`admin/js/tabs/meu-site.js`) funciona em "Builder Mode":
- A sidebar e o topbar sao ocultados — tela inteira para o editor
- Lado esquerdo (360px): painel de propriedades com sub-abas
- Lado direito (restante): iframe com o site em tempo real

### Sub-abas do Meu Site:
| Sub-aba | O que configura |
|---------|----------------|
| Geral | Tema (template), status site (ativo/inativo), link do site |
| Secoes | Quais secoes aparecem e em que ordem |
| Hero | Imagem de fundo, titulo, subtitulo, posicao, overlay |
| Sobre | Texto e imagem da secao "Sobre" |
| Portfolio | Fotos do portfolio (usa renderPortfolio de portfolio.js) |
| Servicos | Lista de servicos oferecidos |
| Depoimentos | Depoimentos de clientes |
| Albuns | Albuns de fotos (usa renderAlbuns de albuns.js) |
| Estudio | Info do estudio, video, fotos (usa renderEstudio) |
| Contato | Titulo, texto e endereco do contato |
| FAQ | Perguntas frequentes (usa renderFaq) |
| Newsletter | Config da newsletter (usa renderNewsletter) |
| Personalizar | Cores (accent, fundo, texto) e fonte |

### Preview em tempo real — como funciona:
```
Usuario edita campo (oninput/onchange)
  → markDirty(sectionId, label)     // marca que ha alteracoes nao salvas
  → postPreviewData()               // coleta todos os campos do form
  → window.builderPostPreview(snap) // envia via postMessage ao iframe
  → shared-site.js recebe e chama renderSite(snap)  // atualiza DOM sem reload
```

### Variaveis globais do builder (em app.js):
- `window.builderPostPreview(data)` — envia dados ao iframe via postMessage
- `window.enterBuilderMode()` — entra no modo builder (chamado por renderMeuSite)
- `window.exitBuilderMode(skipNav?)` — sai do modo (Escape ou botao "Sair")
- `window.builderRefreshPreview()` — recarga o iframe (botao "Recarregar")
- `window.builderSetDevice(device)` — muda entre desktop/tablet/mobile
- `window.builderScheduleRefresh()` — debounce de 1.2s para recarregar apos save

### Variaveis globais do meu-site.js:
- `window._meuSitePostPreview()` — dispara coleta e envio de dados atuais do form

---

## COMO CRIAR UMA NOVA ABA NO ADMIN

### 1. Criar o arquivo do tab

Criar `admin/js/tabs/novaaba.js`:

```javascript
/**
 * Tab: Nome da Aba
 */

import { appState, saveAppData } from '../state.js';
import { apiGet, apiPut } from '../utils/api.js';

export async function renderNovaaba(container) {
  const dados = appState.appData.novaaba || {};

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <h2 style="font-size:1.25rem; font-weight:600; color:var(--text-primary);">Nome da Aba</h2>

      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:1rem;">
        <label style="display:block; font-size:0.8125rem; font-weight:500; margin-bottom:0.375rem; color:var(--text-secondary);">Campo</label>
        <input type="text" id="campoX"
          style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:6px; background:var(--bg-elevated); color:var(--text-primary); font-size:0.875rem; outline:none;"
          value="${dados.campo || ''}">
      </div>

      <button id="saveBtn"
        style="background:var(--accent); color:white; padding:0.5rem 1.5rem; border-radius:6px; border:none; font-weight:600; cursor:pointer; font-size:0.875rem;">
        Salvar
      </button>
    </div>
  `;

  container.querySelector('#saveBtn').onclick = async () => {
    const novoDados = { campo: container.querySelector('#campoX').value };
    appState.appData.novaaba = novoDados;
    await saveAppData('novaaba', novoDados);
    window.showToast?.('Salvo!', 'success');
  };
}
```

### 2. Adicionar na sidebar do admin

Em `admin/index.html`, dentro da `<nav>`, no grupo correto:
```html
<button class="nav-item" data-tab="novaaba">
  <svg class="nav-icon" ...></svg>
  Nome da Aba
</button>
```

### 3. Adicionar no TAB_TITLES do app.js

Em `admin/js/app.js`:
```javascript
const TAB_TITLES = {
  ...
  novaaba: 'Nome da Aba',
};
```

O `app.js` carrega automaticamente via `import('./tabs/novaaba.js')` e chama `renderNovaaba(container)`.

---

## COMO CRIAR UMA NOVA ROTA NO BACKEND

```javascript
// src/routes/novarota.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

router.get('/novarota', async (req, res) => {
  try {
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/novarota', authenticateToken, async (req, res) => {
  try {
    const { campo1, campo2 } = req.body;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

Registrar em `src/server.js`:
```javascript
app.use('/api', require('./routes/novarota'));
```

---

## COMO CRIAR UM NOVO MODELO MONGOOSE

```javascript
const mongoose = require('mongoose');

const NovoModelSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  campo: { type: String, required: true },
  numero: { type: Number, default: 0 },
  ativo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('NovoModel', NovoModelSchema);
```

**Sempre incluir `organizationId` em novos modelos** (multi-tenancy).

---

## PADRAO DO PHOTO EDITOR MODAL

O componente `admin/js/utils/photoEditor.js` permite ajustar enquadramento de fotos:

```javascript
import { photoEditorHtml, setupPhotoEditor } from '../utils/photoEditor.js';

container.innerHTML = `
  ... conteudo ...
  ${photoEditorHtml('meuEditorModal', '3/4')}
`;

window.openMeuEditor = (idx) => {
  const photo = fotos[idx];
  setupPhotoEditor(container, 'meuEditorModal', resolveImagePath(photo.image),
    { scale: photo.scale, posX: photo.posX, posY: photo.posY },
    async (pos) => {
      fotos[idx] = { ...fotos[idx], ...pos };
      await saveAppData('secao', dados);
      renderMinhaAba(container);
    }
  );
};
```

---

## PADRAO DE UPLOAD DE IMAGENS NO TAB

```javascript
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { resolveImagePath } from '../utils/helpers.js';

// HTML:
`<label style="background:var(--accent); color:white; padding:0.5rem 1rem; border-radius:6px; cursor:pointer;">
  Upload
  <input type="file" accept=".jpg,.jpeg,.png" id="uploadInput" style="display:none;">
</label>
<div id="uploadProgress"></div>`

// JS:
container.querySelector('#uploadInput').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const result = await uploadImage(file, appState.authToken, (percent) => {
      showUploadProgress('uploadProgress', percent);
    });
    dados.image = result.url;
    e.target.value = '';
  } catch (error) {
    window.showToast?.('Erro: ' + error.message, 'error');
  }
};
```

---

## MODELO DE DADOS: Organization

```javascript
{
  name: String,                   // Nome do estudio (obrigatorio)
  slug: String,                   // Slug unico para subdomain
  ownerId: ObjectId,              // Referencia ao User dono
  plan: 'free' | 'basic' | 'pro',
  isActive: Boolean,
  // Perfil
  logo: String,                   // URL do logotipo
  phone: String,
  whatsapp: String,               // Formato 5511999999999
  email: String,
  website: String,
  bio: String,
  address: String,
  city: String,
  state: String,
  primaryColor: String,           // Cor primaria hex
  // Watermark
  watermarkType: 'text' | 'logo',
  watermarkText: String,
  watermarkOpacity: Number,       // 5-50 (default 15)
  // Site do fotografo
  siteEnabled: Boolean,           // Site ativo ou nao
  siteTheme: String,              // 'elegante' | 'minimalista' | 'moderno' | 'escuro' | 'galeria'
  siteConfig: {                   // Configuracoes do hero e pagina
    heroTitle: String,
    heroSubtitle: String,
    heroImage: String,
    heroScale: Number,
    heroPosX: Number,
    heroPosY: Number,
    overlayOpacity: Number,
    topBarHeight: Number,
    bottomBarHeight: Number,
    titleFontSize: Number,
    subtitleFontSize: Number,
    titlePosX: Number,
    titlePosY: Number,
    subtitlePosX: Number,
    subtitlePosY: Number,
  },
  siteStyle: {                    // Personalizacao visual
    accentColor: String,
    bgColor: String,
    textColor: String,
    fontFamily: String,
  },
  siteSections: [String],         // Ordem das secoes ativas
  siteContent: {                  // Conteudo das secoes
    sobre: { title, text, image },
    servicos: [{ id, title, description, price, icon }],
    depoimentos: [{ id, name, text, rating, approved }],
    portfolio: { photos: [...] },
    contato: { title, text, address },
    faq: [{ id, question, answer }],
    customSections: [{ id, type, title, content, imageUrl, items, bgColor, textColor }],
  },
  integrations: {                 // Integracoes externas
    whatsappMessage: String,
    googleAnalytics: String,
    facebookPixel: String,
    instagramUrl: String,
    instagramToken: String,
  },
}
```

### Rotas da Organization:
| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/organization/profile` | JWT | Dados completos do perfil |
| PUT | `/api/organization/profile` | JWT | Atualizar perfil |
| GET | `/api/organization/public` | Tenant | Dados publicos para galeria |
| GET | `/api/site/config` | Tenant | Config completa do site |
| PUT | `/api/site/admin/config` | JWT | Atualizar config do site |

---

## VARIAVEIS DE AMBIENTE

### VPS (producao):
```
NODE_ENV=production
PORT=3051
JWT_SECRET=...
ADMIN_PASSWORD_HASH=...
OWNER_EMAIL=...
BASE_DOMAIN=cliquezoom.com.br
OWNER_SLUG=fs
SMTP_HOST=smtp.titan.email
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...
```

### Local (desenvolvimento):
```
PORT=3051
NODE_ENV=development
MONGODB_URI=mongodb+srv://...   # MongoDB Atlas (dev)
JWT_SECRET=...
BASE_DOMAIN=cliquezoom.com.br
OWNER_SLUG=fs
```

**Na VPS o MongoDB e local** (`mongodb://localhost:27017/fsfotografias`), configurado como fallback no `src/server.js`.

---

## COMANDOS

```bash
npm run dev          # Servidor local com nodemon
npm run build:css    # Compilar Tailwind CSS
npm start            # Iniciar servidor (producao)
```

---

## DEPLOY NA VPS

```bash
# Do computador local:
git add . && git commit -m "descricao" && git push

# Na VPS (via SSH):
cd /var/www/cz-saas && git pull && npm install && pm2 restart cliquezoom-saas
```

### Estrutura do servidor:
```
Nginx (porta 80/443)
  ├── /uploads/     → /var/www/cz-saas/uploads/ (static)
  ├── /assets/      → /var/www/cz-saas/assets/ (static)
  ├── /admin/js/    → /var/www/cz-saas/admin/js/ (static, ESM)
  └── /*            → localhost:3051 (proxy Node.js)

PM2 processos (NAO mexer nos outros):
  - cliquezoom-saas (id 7) → porta 3051  ← ESTE E O NOSSO
  - fsfotografias   (id 2) → porta 3002  ← NAO MEXER
  - crm-backend     (id 1) → outro app   ← NAO MEXER
  - vps-hub         (id 3) → outro app   ← NAO MEXER
```

### URLs:
| URL | Destino |
|-----|---------|
| `cliquezoom.com.br` | Home / cadastro da plataforma |
| `cliquezoom.com.br/admin/` | Painel admin do fotografo |
| `cliquezoom.com.br/saas-admin/` | Painel super-admin |
| `cliquezoom.com.br/cliente/` | Galeria do cliente |
| `cliquezoom.com.br/site?_tenant=slug` | Site do fotografo (dev) |

---

## CHECKLIST ANTES DE DEPLOY

- [ ] Se alterou HTML com classes Tailwind: rodar `npm run build:css`
- [ ] Se criou novo tab: adicionar `<button class="nav-item" data-tab="nome">` no `admin/index.html`
- [ ] Se criou novo tab: adicionar entrada em `TAB_TITLES` no `app.js`
- [ ] Se criou nova rota: registrar com `app.use('/api', require('./routes/arquivo'))` no `server.js`
- [ ] Se criou novo modelo: verificar `organizationId` + `timestamps: true`
- [ ] Testar localmente com `npm run dev`
- [ ] Commit + push GitHub
- [ ] Na VPS: `cd /var/www/cz-saas && git pull && npm install && pm2 restart cliquezoom-saas`

---

## ERROS COMUNS E SOLUCOES

| Erro | Causa | Solucao |
|------|-------|---------|
| Conteudo aparece e some no admin | CSS invisivel no tema escuro | Usar CSS variables, nao classes Tailwind |
| `@apply` nao funciona | So funciona durante build | Substituir por CSS puro ou inline styles |
| Portfolio nao aparece no site | Classe arbitraria nao compilada | Usar `style="aspect-ratio:3/4;"` em vez de `aspect-[3/4]` |
| Upload falha com 413 | Payload muito grande | Verificar `client_max_body_size` no Nginx |
| Preview em branco ao abrir Meu Site | Race condition no postMessage | Aguardar `cz_preview_ready` — ja implementado no app.js |
| Secoes do site fora de ordem | Reordenacao com `appendChild` no body | Usar `insertBefore(el, siteFooter)` — ja corrigido no shared-site.js |
| App nao inicia | MongoDB desligado | `sudo systemctl start mongod` |
| 502 Bad Gateway | Node.js caiu | `pm2 restart cliquezoom-saas && pm2 logs cliquezoom-saas` |

---

## INSTRUCOES CRITICAS PARA IAs — INFRAESTRUTURA VPS

1. **NUNCA confunda os apps:** O nosso e `cliquezoom-saas` (id 7, porta 3051, path `/var/www/cz-saas`)
2. **NUNCA altere a porta** — e 3051, definida no `.env` da VPS
3. **NUNCA modifique configs do Nginx** sem autorizacao explicita
4. **NUNCA faca `pm2 restart all`** — reinicia todos os processos. Use `pm2 restart cliquezoom-saas`
5. **NUNCA mexer no site original** (`/var/www/fs-fotografias`, `fsfotografias`)

---

## ATUALIZACAO DE DOCUMENTACAO (OBRIGATORIO)

Apos implementar qualquer feature, SEMPRE atualize:

| Documento | Quando | O que fazer |
|-----------|--------|-------------|
| **CLAUDE.md** | SEMPRE | Adicionar novos arquivos na estrutura, novas rotas, novos modelos, novos padroes |
| **ARCHITECTURE.md** | Se mudar modelo/relacao | Atualizar diagrama de dados |

---

## FALE EM PORTUGUES

O usuario fala portugues brasileiro. Todas as mensagens, alerts, labels, placeholders e comentarios devem ser em portugues.
