# CliqueZoom - Instrucoes para o Assistente de IA

## O QUE E ESTE PROJETO

Plataforma SaaS de gestao fotografica (CliqueZoom) com varios frontends e 1 backend:
- **Home / cadastro** (`home/index.html`) - Landing page de cadastro da plataforma (conteudo editavel via saas-admin)
- **Painel admin** (`admin/`) - Painel do fotografo: gerencia site, sessoes, clientes, albuns, perfil
- **Galeria do cliente** (`cliente/index.html` + `cliente/js/gallery.js`) - Fotos privadas com codigo de acesso
- **Album de prova** (`album/`) - Visualizador de album de prova para aprovacao do cliente
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

7. **Nunca use `alert()` ou `confirm()` no saas-admin.** Use `saasToast(msg, type)` e `saasConfirm(msg, opts)` definidos em `saas-admin/js/app.js`.

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
        albuns-prova.js     # renderAlbunsProva(container) - Albuns de prova para aprovacao
        albuns.js           # renderAlbuns(container) - Gerencia albuns de fotos (sub-aba Meu Site)
        portfolio.js        # renderPortfolio(container) - Gerencia portfolio (sub-aba Meu Site)
        estudio.js          # renderEstudio(container) - Info do estudio, video (sub-aba Meu Site)
        faq.js              # renderFaq(container) - Perguntas frequentes (sub-aba Meu Site)
        hero.js             # renderHero(container) - Editor hero legado
        sobre.js            # renderSobre(container) - Secao sobre legado
        logo.js             # renderLogo(container) - Upload e config do logo
        footer.js           # renderFooter(container) - Rodape (redes sociais, links)
        integracoes.js      # renderIntegracoes(container) - Google Analytics, Meta Pixel, WhatsApp
        marketing.js        # renderMarketing(container) - Analytics e metricas
        dominio.js          # renderDominio(container) - Configuracao de dominio customizado
        plano.js            # renderPlano(container) - Plano atual e assinatura
      utils/
        helpers.js          # resolveImagePath, formatDate, generateId, copyToClipboard, escapeHtml
        upload.js           # compressImage, uploadImage, uploadVideo, showUploadProgress
        api.js              # apiGet, apiPost, apiPut, apiDelete (wrapper com auth automatico)
        photoEditor.js      # photoEditorHtml, setupPhotoEditor (modal reutilizavel)
        notifications.js    # startNotificationPolling, stopNotificationPolling, toggleNotifications, markAllNotificationsRead, onNotifClick
        toast.js            # showToast(msg, type, duration), showConfirm(msg, opts) — substitui alert/confirm
  assets/
    css/
      tailwind-input.css    # Source do Tailwind (com @source paths)
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
  album/                    # Visualizador de album de prova
  uploads/                  # Imagens do admin (servidas pelo Nginx)
  uploads/sessions/         # Fotos de sessoes de clientes
  uploads/videos/           # Videos do estudio (ate 300MB)
  ecosystem.config.js       # PM2 cluster config (2 instancias, zero-downtime — NAO ativo ainda na VPS)
  src/
    server.js               # Entry point Express
    middleware/
      auth.js               # authenticateToken (JWT)
      tenant.js             # resolveTenant: extrai organizationId por slug/subdominio/_preview=1
      planLimits.js         # checkPlanLimits: valida limites do plano antes de criar recursos
      stripe.js             # Webhook handler do Stripe
    models/
      Organization.js       # Dados da org: perfil, slug, plano, watermark, siteTheme, siteConfig
                            #   siteTheme default: 'elegante' (opcoes: elegante/minimalista/moderno/escuro/galeria)
                            #   siteSections default: ['hero','portfolio','albuns','servicos','estudio','depoimentos','contato','sobre','faq']
      User.js               # Usuario dono da organizacao
      Session.js            # Sessoes de clientes (fotos privadas, selecao, multi-selecao)
      Client.js             # Clientes do fotografo (CRM)
      Album.js              # Albuns de prova (paginas, aprovacao, revisao)
      Subscription.js       # Assinatura: plano, status, limites, uso, Stripe IDs
      Notification.js       # Notificacoes do admin (acessos, selecoes, etc)
      SiteData.js           # Documento legado com conteudo do site (hero, faq, etc)
      LandingData.js        # Documento unico com conteudo da landing page do SaaS
      plans.js              # Definicoes estaticas dos planos (free/basic/pro) com limites
    routes/
      auth.js               # Login, registro, verify token, gerenciamento de orgs (superadmin),
                            #   metricas SaaS, reset de secoes do site por org
      sessions.js           # CRUD sessoes, upload/delete fotos, endpoints do cliente (verify-code,
                            #   select, submit, reopen, download, download-all, export Lightroom)
      clients.js            # CRUD clientes, sessoes vinculadas ao cliente
      albums.js             # CRUD albuns de prova, enviar para cliente, aprovacao, revisao, download
      organization.js       # GET/PUT perfil da org, GET dados publicos para galeria
      site.js               # GET config publica, GET/PUT config admin, upload/delete portfolio,
                            #   depoimentos (submit publico, listar pendentes, aprovar/rejeitar)
      siteData.js           # GET/PUT /site-data (dados legados: hero, faq, maintenance)
      upload.js             # POST /admin/upload (imagens), POST /admin/upload-video (ate 300MB)
      notifications.js      # GET notificacoes, contagem nao lidas, marcar todas como lidas
      domains.js            # Status dominio, adicionar, verificar DNS, gerar SSL, remover
      billing.js            # Listar planos, assinatura, criar checkout Stripe, webhook, cancelar
      landing.js            # GET config landing (publico), PUT config landing (superadmin)
    utils/
      multerConfig.js       # createUploader(subdir, options)
      notifications.js      # notify(type, sessionId, sessionName, message)
      deadlineChecker.js    # checkDeadlines(orgId)
  package.json              # Node 22, CommonJS
```

---

## PAINEL ADMIN — DESIGN SYSTEM

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

### Paleta para inline styles:
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

### TAB_TITLES registrados em app.js:
```javascript
const TAB_TITLES = {
  dashboard:    'Dashboard',
  sessoes:      'Sessoes',
  clientes:     'Clientes',
  'albuns-prova': 'Prova de Albums',
  'meu-site':   'Meu Site',
  dominio:      'Dominio',
  integracoes:  'Integracoes',
  marketing:    'Marketing',
  perfil:       'Perfil',
  plano:        'Plano',
  footer:       'Rodape',
};
```

### Builder Mode (aba "Meu Site"):
Quando o usuario clica em "Meu Site", o `app.js` entra em builder mode:
- `#sidebar` fica `display: none` (tela cheia)
- `#topbar` fica `display: none`
- `#workspace` fica `display: none`
- `#builder-props` (360px) fica `display: flex` — painel de propriedades com nav vertical
- `#builder-preview` (flex:1) fica `display: flex` — iframe com o site

O builder mode suporta 3 dispositivos: Desktop (1280x900), Tablet (768x1024 escalado), Mobile (390x844 escalado).

**Preview em tempo real via postMessage (sem reload):**
- Ao salvar, `liveRefresh(patch)` atualiza `configData` localmente e envia via postMessage — sem recarregar o iframe
- Excecao: troca de tema (siteTheme) usa `builderScheduleRefresh` pois o HTML do template muda
- `admin/js/app.js` expoe `window.builderPostPreview(data)` que envia `{ type: 'cz_preview', data }` ao iframe
- `site/templates/shared-site.js` escuta esse evento e chama `renderSite(data)` diretamente
- Quando o iframe termina de carregar, envia `{ type: 'cz_preview_ready' }` de volta
- `meu-site.js` expoe `window._meuSitePostPreview()` que coleta todos os campos do form

**Preview usa `_preview=1` na URL:**
- O middleware `tenant.js` detecta `_preview=1` e ignora `isActive` da org (mostra site mesmo desativado)
- Permite passar `_tenant=slug` em producao (normalmente bloqueado)

**Deteccao de alteracoes nao salvas:**
- `meu-site.js` tem `markDirty(sectionId, label)` e `clearDirty()`
- Ao trocar de sub-aba dentro de "Meu Site", `checkDirtyBeforeSwitch()` pergunta se quer salvar
- Secoes com dirty tracking: Hero, Sobre, Contato, Personalizar, Servicos, Depoimentos

### Sub-abas do Meu Site (nav vertical, 360px):
| Sub-aba | O que configura |
|---------|----------------|
| Geral | Tema (template), status site (ativo/inativo), link do site |
| Secoes | Quais secoes aparecem e em que ordem (drag para reordenar) |
| Hero | Imagem de fundo, titulo, subtitulo, posicao, overlay, barras |
| Sobre | Texto e imagem da secao "Sobre" |
| Portfolio | Fotos do portfolio |
| Servicos | Lista de servicos (titulo, descricao, icone, preco) |
| Depoimentos | Depoimentos (inclui aprovacao de pendentes publicos) |
| Albums | Albums de fotos |
| Estudio | Info do estudio, video, fotos |
| Contato | Titulo, texto e endereco do contato |
| FAQ | Perguntas frequentes (vem com FAQs padrao para novos usuarios) |
| Personalizar | Cores (accent, fundo, texto), fonte, secoes customizadas |

### Variaveis globais do builder (em app.js):
- `window.builderPostPreview(data)` — envia dados ao iframe via postMessage
- `window.enterBuilderMode()` — entra no modo builder (chamado por renderMeuSite)
- `window.exitBuilderMode(skipNav?)` — sai do modo (Escape ou botao "Sair")
- `window.builderRefreshPreview()` — recarga o iframe (botao "Recarregar")
- `window.builderSetDevice(device)` — muda entre desktop/tablet/mobile
- `window.builderScheduleRefresh()` — debounce reload do iframe (so usado na troca de tema)

### Variaveis globais do meu-site.js:
- `window._meuSitePostPreview()` — dispara coleta e envio de dados atuais do form

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

### Salvar dados do admin (abas que usam SiteData legado):
```
Tab chama saveAppData('secao', dados)
  → state.js monta payload: { ...appState.appData, [secao]: dados }
  → PUT /api/site-data com payload completo
  → Backend: SiteData.findOneAndUpdate({}, payload, { upsert: true })
  → MongoDB atualiza o documento unico
```

### Salvar dados do site (aba "Meu Site"):
```
Tab chama apiPut('/api/site/admin/config', { siteTheme, siteConfig, siteContent, siteStyle, siteSections })
  → Backend: Organization.findOneAndUpdate({ organizationId }, payload)
  → MongoDB atualiza o documento da organizacao
  → liveRefresh(patch) atualiza configData local e envia postMessage ao iframe
```

### Carregar dados no site publico (/site):
```
shared-site.js → fetch('/api/site/config?_tenant=slug')
  → Backend: busca Organization + SiteData e mescla
  → shared-site.js chama renderSite(data) que preenche os IDs do template
  → siteSections define ordem e visibilidade (default: ['hero','portfolio','albuns','servicos','estudio','depoimentos','contato','sobre','faq'])
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

### Modos de sessao:
- `selection` — cliente seleciona fotos (padrao)
- `gallery` — cliente so visualiza/baixa
- `multi_selection` — multiplos clientes selecionam (ex: casamento, cada um tem sua lista)

### Fluxo completo (modo selection):
```
1. Admin cria sessao (nome, tipo, data, codigo de acesso, modo, limite, preco extra)
2. Admin faz upload de fotos na sessao
3. Cliente acessa /cliente com codigo → ve galeria
4. Cliente seleciona fotos (coracao) → optimistic UI + salva no servidor
5. Cliente clica "Finalizar Selecao" → status muda para 'submitted'
6. Admin ve notificacao, revisa, pode reabrir ou marcar como entregue
7. Se entregue: cliente ve fotos para download (sem watermark)
```

### Status da selecao (selectionStatus):
| Status | Descricao |
|--------|-----------|
| `pending` | Sessao criada, cliente ainda nao selecionou |
| `in_progress` | Cliente comecou a selecionar (ou admin reabriu) |
| `submitted` | Cliente finalizou selecao |
| `delivered` | Admin marcou como entregue (cliente pode baixar) |
| `expired` | Prazo expirado |

### Modelo Session (campos principais):
```javascript
{
  name, type, date, accessCode,
  photos: [{ id, filename, url, urlOriginal, uploadedAt, comments }],
  mode: 'selection' | 'gallery' | 'multi_selection',
  packageLimit,           // default 30
  extraPhotoPrice,        // default R$25
  selectionStatus,        // pending → in_progress → submitted → delivered | expired
  selectedPhotos: [String],
  selectionDeadline, deliveredAt,
  participants: [...],    // para multi_selection
  coverPhoto, highResDelivery, watermark, canShare, isActive
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

---

## SISTEMA DE ALBUMS DE PROVA

Albums de prova (`admin/js/tabs/albuns-prova.js` + `src/routes/albums.js`) permitem ao fotografo montar layouts de paginas para aprovacao do cliente.

### Fluxo:
```
1. Admin cria album vinculado a uma sessao/cliente
2. Admin monta paginas (layouts, fotos posicionadas)
3. Admin envia para o cliente (gera accessCode)
4. Cliente acessa /album com codigo → visualiza e aprova/solicita revisao
5. Admin ve feedback e pode ajustar
```

### Status do album:
| Status | Descricao |
|--------|-----------|
| `draft` | Em montagem pelo admin |
| `sent` | Enviado para o cliente |
| `approved` | Cliente aprovou |
| `rejected` | Cliente rejeitou (com comentarios) |
| `revision_requested` | Cliente pediu revisao de paginas especificas |

### Rotas do album (admin + cliente):
| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/albums` | JWT | Lista albums |
| POST | `/api/albums` | JWT | Cria album |
| PUT | `/api/albums/:id` | JWT | Edita album |
| DELETE | `/api/albums/:id` | JWT | Deleta album |
| POST | `/api/albums/:id/send` | JWT | Envia para cliente |
| POST | `/api/client/albums/verify` | Publico | Verifica codigo de acesso |
| GET | `/api/client/albums/:id` | Publico+code | Visualiza album |
| PUT | `/api/client/albums/:id/approve` | Publico+code | Aprova album |
| PUT | `/api/client/albums/:id/revision` | Publico+code | Solicita revisao |
| GET | `/api/client/albums/:id/download` | Publico+code | Download do album |

---

## SISTEMA DE PLANOS E ASSINATURA

### Planos (src/models/plans.js):
| Plano | Sessoes | Fotos | Albums | Storage | Dominio Custom |
|-------|---------|-------|--------|---------|----------------|
| free | 3 | 100 | 1 | 500MB | nao |
| basic | 20 | 1000 | 10 | 5GB | nao |
| pro | ilimitado | ilimitado | ilimitado | 50GB | sim |

### Middleware planLimits.js:
Valida limites antes de criar sessoes, fotos, albums. Retorna 403 se limite atingido.

### Rotas de billing (src/routes/billing.js):
| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/billing/plans` | Publico | Lista planos disponiveis |
| GET | `/api/billing/subscription` | JWT | Assinatura atual |
| POST | `/api/billing/checkout` | JWT | Cria checkout Stripe |
| POST | `/api/billing/webhook` | Stripe | Webhook de eventos |
| POST | `/api/billing/cancel` | JWT | Cancela assinatura |

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

## PAINEL SUPER-ADMIN (saas-admin)

O painel super-admin (`saas-admin/index.html` + `saas-admin/js/app.js`) gerencia toda a plataforma.

### Funcionalidades:
- **Dashboard**: metricas gerais — total orgs, MRR estimado, distribuicao por plano, total usuarios/sessoes/fotos
- **Organizacoes**: listar, aprovar, editar plano, desativar, mover para lixeira, deletar definitivo
- **Painel lateral por org** (`#orgPanel`): visao geral com stats, troca de plano, resets de secoes do Meu Site
- **Lixeira**: orgs deletadas, restaurar ou deletar definitivamente
- **Landing Page**: editar config global da home/landing

### Resets de secoes do Meu Site (via painel lateral):
Rota: `POST /api/admin/organizations/:id/reset/site`
Body: `{ section: 'hero' | 'portfolio' | 'albuns' | 'servicos' | 'depoimentos' | 'contato' | 'sobre' | 'faq' | 'estudio' | 'personalizar' | 'secoes' | 'all' }`

### Notacoes importantes:
- `saasToast(msg, type)` e `saasConfirm(msg, opts)` — substitutos de alert/confirm no saas-admin
- O painel lateral usa `orgId` passado diretamente nos botoes HTML (nao variavel global)

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
1. Detecta tenant (com suporte a `_preview=1`)
2. Chama `/api/site/config` para buscar dados
3. Preenche elementos do DOM (IDs padrao)
4. Oculta secoes nao ativadas (`siteSections`)
5. Reordena secoes antes do `#siteFooter` (nao usa appendChild — usa insertBefore)
6. Escuta `postMessage { type: 'cz_preview', data }` do admin para atualizar em tempo real
7. Envia `{ type: 'cz_preview_ready' }` ao parent quando carregado

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

### Como adicionar novo template:
1. Criar `site/templates/novo-tema/index.html` com IDs padrao
2. Criar `site/templates/novo-tema/css/style.css`
3. Adicionar `<script src="/site/templates/shared-site.js"></script>` no HTML
4. Adicionar no array de templates em `admin/js/tabs/meu-site.js`
5. Adicionar como opcao valida em `Organization.siteTheme` (enum)

---

## MIDDLEWARE TENANT

O middleware `src/middleware/tenant.js` resolve o `organizationId` para rotas publicas:

```javascript
// Comportamento por contexto:
// - _preview=1: aceita _tenant em producao, ignora isActive (para preview do builder)
// - dev/localhost: aceita _tenant livremente
// - producao: usa subdominio do hostname
// - fallback: OWNER_SLUG do .env
```

Aplicado em `server.js` nas rotas:
- `/api/hero`, `/api/site-config`, `/api/faq` — dados legados
- `/api/client` — galeria do cliente
- `/api/organization/public` — dados publicos
- `/api/site/config` — config do site
- `/api/site/depoimento` — submit de depoimentos publicos

---

## MODELO DE DADOS: Organization

```javascript
{
  name: String,                   // Nome do estudio (obrigatorio)
  slug: String,                   // Slug unico para subdomain
  ownerId: ObjectId,              // Referencia ao User dono (nao obrigatorio no cadastro)
  plan: 'free' | 'basic' | 'pro',
  isActive: Boolean,
  // Perfil
  logo, phone, whatsapp, email, website, bio, address, city, state, primaryColor,
  // Watermark
  watermarkType: 'text' | 'logo',
  watermarkText: String,
  watermarkOpacity: Number,       // 5-50 (default 15)
  // Site
  siteEnabled: Boolean,           // default true
  siteTheme: String,              // default 'elegante' | 'minimalista' | 'moderno' | 'escuro' | 'galeria'
  siteConfig: {                   // Hero e layout
    heroTitle, heroSubtitle, heroImage, heroScale, heroPosX, heroPosY,
    overlayOpacity, topBarHeight, bottomBarHeight,
    titleFontSize, subtitleFontSize, titlePosX, titlePosY, subtitlePosX, subtitlePosY
  },
  siteStyle: { accentColor, bgColor, textColor, fontFamily },
  siteSections: [String],         // default: ['hero','portfolio','albuns','servicos','estudio','depoimentos','contato','sobre','faq']
  siteContent: {
    sobre: { title, text, image },
    servicos: [{ id, title, description, price, icon }],
    depoimentos: [{ id, name, text, rating, photo, socialLink, approved }],
    portfolio: { photos: [...] },
    contato: { title, text, address },
    faq: [{ id, question, answer }],
    customSections: [{ id, type, title, content, imageUrl, items, bgColor, textColor }]
  },
  integrations: {
    whatsappMessage, googleAnalytics, facebookPixel, instagramUrl, instagramToken,
    metaPixel, seo: { title, description, keywords }
  }
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

### Rotas de Clientes (CRM):
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/clients` | Lista clientes com contagem de sessoes |
| POST | `/api/clients` | Cria cliente |
| PUT | `/api/clients/:id` | Edita cliente |
| DELETE | `/api/clients/:id` | Deleta cliente |
| GET | `/api/clients/:id/sessions` | Sessoes vinculadas ao cliente |

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
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
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

**ATENCAO:** O `ecosystem.config.js` com modo cluster (zero-downtime) ja existe no repositorio
mas ainda NAO esta ativo na VPS. A migracao para cluster deve ser feita manualmente em momento
oportuno (sem usuarios online), com os comandos:
```bash
pm2 delete cliquezoom-saas
pm2 start ecosystem.config.js --env production
pm2 save
# Deploys futuros com zero downtime:
pm2 reload ecosystem.config.js --env production
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
| `cliquezoom.com.br/album/` | Visualizador de album de prova |
| `cliquezoom.com.br/site?_tenant=slug` | Site do fotografo (dev) |
| `cliquezoom.com.br/site?_tenant=slug&_preview=1` | Site em modo preview (ignora isActive) |

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

## COMO CRIAR UMA NOVA ABA NO ADMIN

### 1. Criar o arquivo do tab

Criar `admin/js/tabs/novaaba.js`:

```javascript
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

## ERROS COMUNS E SOLUCOES

| Erro | Causa | Solucao |
|------|-------|---------|
| Conteudo aparece e some no admin | CSS invisivel no tema escuro | Usar CSS variables, nao classes Tailwind |
| `@apply` nao funciona | So funciona durante build | Substituir por CSS puro ou inline styles |
| Portfolio nao aparece no site | Classe arbitraria nao compilada | Usar `style="aspect-ratio:3/4;"` em vez de `aspect-[3/4]` |
| Upload falha com 413 | Payload muito grande | Verificar `client_max_body_size` no Nginx |
| Preview em branco ao abrir Meu Site | orgSlug vazio ou race condition | builderLoadPreview faz await loadOrgSlug() — ja corrigido |
| Preview mostra "Site em construcao" | siteEnabled=false + producao bloqueia | Usar `_preview=1` na URL do builder — ja implementado |
| Secoes do site fora de ordem | Reordenacao com `appendChild` no body | Usar `insertBefore(el, siteFooter)` — ja corrigido |
| GET /site-data retorna 404 | Rota sem auth em producao | Rota usa authenticateToken — ja corrigido |
| Erro 500 no cadastro | ownerId required no Organization | ownerId nao e required — ja corrigido |
| App nao inicia | MongoDB desligado | `sudo systemctl start mongod` |
| 502 Bad Gateway | Node.js caiu | `pm2 restart cliquezoom-saas && pm2 logs cliquezoom-saas` |

---

## INSTRUCOES CRITICAS PARA IAs — INFRAESTRUTURA VPS

1. **NUNCA confunda os apps:** O nosso e `cliquezoom-saas` (id 7, porta 3051, path `/var/www/cz-saas`)
2. **NUNCA altere a porta** — e 3051, definida no `.env` da VPS
3. **NUNCA modifique configs do Nginx** sem autorizacao explicita
4. **NUNCA faca `pm2 restart all`** — reinicia todos os processos. Use `pm2 restart cliquezoom-saas`
5. **NUNCA mexer no site original** (`/var/www/fs-fotografias`, `fsfotografias`)
6. **NAO ativar o ecosystem.config.js** sem autorizacao explicita — migracao para cluster tem risco

---

## ATUALIZACAO DE DOCUMENTACAO (OBRIGATORIO)

Apos implementar qualquer feature, SEMPRE atualize este CLAUDE.md:
- Novos arquivos na estrutura de pastas
- Novas rotas de API
- Novos modelos ou campos de modelos
- Novos padroes de codigo ou comportamentos

---

## FALE EM PORTUGUES

O usuario fala portugues brasileiro. Todas as mensagens, alerts, labels, placeholders e comentarios devem ser em portugues.
