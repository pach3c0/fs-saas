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

4. **Upload de imagens salva SOMENTE no disco local** em `/uploads/`. Retorna URL relativa `/uploads/filename.jpg`. Sem servicos externos (Cloudinary, S3, Atlas, etc — sempre local no servidor VPS).

5. **Sempre rode `npm run build:css` antes de deploy** se alterar qualquer HTML que use classes Tailwind. O Tailwind v4 compila de `assets/css/tailwind-input.css` para `assets/css/tailwind.css`.

6. **Nunca use `alert()` ou `confirm()` no admin.** Use `window.showToast(msg, type)` e `window.showConfirm(msg, opts)` de `admin/js/utils/toast.js`.

7. **Nunca use `alert()` ou `confirm()` no saas-admin.** Use `saasToast(msg, type)` e `saasConfirm(msg, opts)` definidos em `saas-admin/js/app.js`.

---

## ARQUITETURA

```
FsSaaS/
  home/
    index.html              # Home / cadastro da plataforma CliqueZoom (rota /)
    js/home.js
  saas-admin/
    index.html              # Painel super-admin (login + tabs: Organizacoes, Lixeira, Landing Page)
    js/app.js
  admin/
    index.html              # Shell do painel (login + sidebar + builder mode)
    js/
      app.js                # Orquestrador: init, login, switchTab, logout, builder mode, toast
      state.js              # Estado global: appState, loadAppData, saveAppData
      tabs/                 # 1 arquivo por aba, carregado via dynamic import
        dashboard.js, perfil.js, meu-site.js, sessoes.js, clientes.js
        albuns-prova.js, albuns.js, portfolio.js, estudio.js, faq.js
        hero.js, sobre.js, logo.js, footer.js, integracoes.js
        marketing.js, dominio.js, plano.js
      utils/
        helpers.js          # resolveImagePath, formatDate, generateId, copyToClipboard, escapeHtml
        upload.js           # compressImage, uploadImage, uploadVideo, showUploadProgress
        api.js              # apiGet, apiPost, apiPut, apiDelete (wrapper com auth automatico)
        photoEditor.js      # photoEditorHtml, setupPhotoEditor (modal reutilizavel)
        notifications.js    # polling de notificacoes, badge, dropdown
        toast.js            # showToast(msg, type, duration), showConfirm(msg, opts)
  assets/
    css/
      tailwind-input.css    # Source do Tailwind (com @source paths)
      tailwind.css          # Compilado (nao editar manualmente)
      shared.css            # Fontes Inter/Playfair, animacoes
  site/
    templates/
      elegante/ minimalista/ moderno/ escuro/ galeria/   # cada um: index.html + css/style.css
      shared-site.js        # JS compartilhado + listener postMessage
  cliente/
    index.html              # Galeria privada do cliente
    sw.js                   # Service Worker PWA
    js/gallery.js
  album/                    # Visualizador de album de prova
  uploads/                  # Imagens (servidas pelo Nginx)
  uploads/sessions/         # Fotos de sessoes
  uploads/videos/           # Videos do estudio (ate 300MB)
  ecosystem.config.js       # PM2 cluster config (2 instancias)
  src/
    server.js               # Entry point Express
    middleware/
      auth.js               # authenticateToken (JWT)
      tenant.js             # resolveTenant: slug/subdominio/_preview=1
      planLimits.js         # checkPlanLimits: valida limites do plano
      stripe.js             # Webhook handler do Stripe
    models/
      Organization.js       # Org: perfil, slug, plano, watermark, siteTheme, siteConfig
      User.js, Session.js, Client.js, Album.js
      Subscription.js, Notification.js, SiteData.js, LandingData.js
      plans.js              # Definicoes estaticas dos planos (free/basic/pro)
    routes/
      auth.js               # Login, registro, gerenciamento de orgs, metricas SaaS
      sessions.js           # CRUD sessoes, upload/delete fotos, endpoints do cliente
      clients.js            # CRUD clientes
      albums.js             # CRUD albuns de prova, aprovacao, revisao
      organization.js       # GET/PUT perfil da org
      site.js               # Config do site, portfolio, depoimentos
      siteData.js           # GET/PUT /site-data (dados legados: hero, faq)
      upload.js             # POST /admin/upload, POST /admin/upload-video
      notifications.js      # GET notificacoes, marcar como lidas
      domains.js            # Status dominio, DNS, SSL
      billing.js            # Planos, assinatura, checkout Stripe, webhook
      landing.js            # Config da landing page (superadmin)
    utils/
      multerConfig.js, notifications.js, deadlineChecker.js
  package.json              # Node 22, CommonJS
  skills/                   # Contextos detalhados por area (ver secao SKILLS abaixo)
```

---

## PAINEL ADMIN — DESIGN SYSTEM

CSS variables definidas no `:root` de `admin/index.html`:

```css
--bg-base: #0d1117;        /* fundo da pagina */
--bg-surface: #161b22;     /* cards, sidebar, topbar */
--bg-elevated: #1c2128;    /* inputs, modais */
--bg-hover: #21262d;
--border: #30363d;
--text-primary: #e6edf3;
--text-secondary: #8b949e;
--text-muted: #484f58;
--accent: #2f81f7;
--accent-hover: #1f6feb;
--green: #3fb950;  --red: #f85149;  --yellow: #d29922;  --purple: #bc8cff;  --orange: #ffa657;
```

**Sempre use CSS variables em novos tabs** — nunca classes Tailwind:
`style="background:var(--bg-surface); color:var(--text-primary); border:1px solid var(--border);"`

### Layout do admin:
```
#adminPanel
  ├── #sidebar (220px) — header, nav (.nav-item[data-tab]), footer
  └── #main-area
        ├── #topbar (56px)
        ├── #workspace → #content-panel → #tabContent
        ├── #builder-props (360px — so no builder mode)
        └── #builder-preview (flex:1 — so no builder mode)
```

### TAB_TITLES em app.js:
`dashboard, sessoes, clientes, albuns-prova, meu-site, dominio, integracoes, marketing, perfil, plano, footer`

### Toast e confirmacao:
```javascript
window.showToast('Salvo!', 'success');          // success | error | warning | info
window.showToast('Erro', 'error', 5000);
const ok = await window.showConfirm('Remover?', { title: 'Confirmar', confirmText: 'Remover', danger: true });
```

---

## FLUXO DE DADOS

- **Admin (Modo Builder):** Abas como Hero, Sobre e Portfólio usam `saveAppData('secao', dados)` → `PUT /api/site-data` → MongoDB `SiteData`. O preview é atualizado via `postMessage` para o iframe com os dados do `SiteData` injetados.
- **Meu Site:** `apiPut('/api/site/admin/config', payload)` → `Organization.findOneAndUpdate` → `liveRefresh(patch)` envia postMessage ao iframe
- **Site publico:** `shared-site.js` → `GET /api/site/config` → `renderSite(data)` preenche IDs do template
- **Upload:** `uploadImage(file, token, onProgress)` → comprime (1200px, 85%) → `POST /api/admin/upload` → `/uploads/{orgId}/filename.jpg`

---

## MODELO DE DADOS: Organization (campos principais)

```javascript
{
  name, slug, ownerId, plan, isActive,
  logo, phone, whatsapp, email, website, bio, address, city, state, primaryColor,
  watermarkType, watermarkText, watermarkOpacity,
  siteEnabled, siteTheme,   // default 'elegante'
  siteConfig: { heroTitle, heroSubtitle, heroImage, heroScale, heroPosX, heroPosY,
                overlayOpacity, topBarHeight, bottomBarHeight, ... },
  siteStyle: { accentColor, bgColor, textColor, fontFamily },
  siteSections: [String],   // default: ['hero','portfolio','albuns','servicos','estudio','depoimentos','contato','sobre','faq']
  siteContent: { sobre, servicos, depoimentos, portfolio, contato, faq, customSections },
  integrations: { whatsappMessage, googleAnalytics, facebookPixel, metaPixel, seo }
}
```

### Rotas principais da Organization:
| Metodo | Rota | Auth |
|--------|------|------|
| GET/PUT | `/api/organization/profile` | JWT |
| GET | `/api/organization/public` | Tenant |
| GET | `/api/site/config` | Tenant |
| PUT | `/api/site/admin/config` | JWT |
| GET/POST/PUT/DELETE | `/api/clients` | JWT |

---

## VARIAVEIS DE AMBIENTE

**VPS:** `NODE_ENV=production`, `PORT=3051`, `JWT_SECRET`, `BASE_DOMAIN=cliquezoom.com.br`, `OWNER_SLUG=fs`, SMTP Titan, Stripe keys.

**Local:** `PORT=3051`, `NODE_ENV=development`, `MONGODB_URI` (Atlas), `JWT_SECRET`, `BASE_DOMAIN`, `OWNER_SLUG=fs`.

MongoDB na VPS e local: `mongodb://localhost:27017/fsfotografias`.

---

## COMANDOS

```bash
npm run dev          # Servidor local com nodemon
npm run build:css    # Compilar Tailwind CSS
npm start            # Iniciar servidor (producao)
```

---

## DEPLOY NA VPS

### Checklist PRE-DEPLOY (executar ANTES de instruir o usuario)

1. `git status` — sem mudancas nao commitadas relevantes
2. `git log origin/main..HEAD --oneline` — sem commits sem push
3. Se tiver commits sem push: `git push origin main` ANTES de mandar o usuario rodar `git pull`
4. So depois confirmar que o remote esta atualizado, passar as instrucoes

**A VPS puxa do GitHub — se o codigo nao esta no GitHub, vai rodar a versao antiga.**

### O que rodar na VPS ao finalizar uma implementacao

| O que mudou | Comandos na VPS |
|-------------|-----------------|
| So backend (`src/`) | `git pull` → `npm install` → `pm2 reload ecosystem.config.js --env production` |
| So frontend sem Tailwind | `git pull` (Nginx serve static — sem restart) |
| Frontend com novas classes Tailwind | `npm run build:css` local → commit → `git pull` na VPS |
| Backend + frontend | Tudo acima na ordem |

### Comandos na VPS (sempre em linhas separadas):

```bash
cd /var/www/cz-saas
git pull
npm install
pm2 reload ecosystem.config.js --env production
```

Verificar logs: `pm2 logs cliquezoom-saas --lines 30 --nostream`

**ATENCAO:** VPS em modo cluster (2 instancias, ids 8 e 9). `pm2 reload` reinicia uma por uma — sem downtime.

### Estrutura do servidor:

```
Nginx (porta 80/443)
  ├── /uploads/, /assets/, /admin/js/  → static
  └── /*  → localhost:3051 (proxy Node.js)

PM2 (NAO mexer nos outros processos):
  cliquezoom-saas (ids 8/9) → porta 3051  ← NOSSO
  fsfotografias (id 2), crm-backend (id 1), vps-hub (id 3)  ← NAO MEXER
```

### URLs:
| URL | Destino |
|-----|---------|
| `cliquezoom.com.br` | Home / cadastro |
| `cliquezoom.com.br/admin/` | Painel admin |
| `cliquezoom.com.br/saas-admin/` | Painel super-admin |
| `cliquezoom.com.br/cliente/` | Galeria do cliente |
| `cliquezoom.com.br/album/` | Album de prova |
| `cliquezoom.com.br/site?_tenant=slug` | Site do fotografo |
| `cliquezoom.com.br/site?_tenant=slug&_preview=1` | Site em modo preview |

---

## CHECKLIST ANTES DE DEPLOY

- [ ] HTML com classes Tailwind novas: rodar `npm run build:css`
- [ ] Novo tab: botao em `admin/index.html` + entrada em `TAB_TITLES` no `app.js`
- [ ] Nova rota: registrar com `app.use('/api', require('./routes/arquivo'))` no `server.js`
- [ ] Novo modelo: verificar `organizationId` + `timestamps: true`
- [ ] Testar localmente com `npm run dev`
- [ ] Commit + push GitHub
- [ ] Executar checklist PRE-DEPLOY acima antes de passar comandos ao usuario

---

## PADROES DE CODIGO

### Novo tab no admin (resumo):
1. Criar `admin/js/tabs/novaaba.js` com `export async function renderNovaaba(container)`
2. Usar CSS variables, nunca Tailwind: `style="background:var(--bg-surface); color:var(--text-primary)"`
3. Toast: `window.showToast?.('Salvo!', 'success')` — nunca `alert()`
4. Adicionar botao `.nav-item[data-tab="novaaba"]` no `admin/index.html`
5. Adicionar `novaaba: 'Nome'` no `TAB_TITLES` do `app.js`

### Nova rota no backend (resumo):
- Arquivo em `src/routes/`, CommonJS (`require`/`module.exports`)
- Sempre filtrar por `organizationId` (multi-tenancy)
- Registrar: `app.use('/api', require('./routes/novarota'))` no `server.js`

### Novo modelo Mongoose (resumo):
- Sempre incluir `organizationId: { type: ObjectId, ref: 'Organization', required: true }`
- Sempre `{ timestamps: true }` no schema

### Upload de imagens no tab:
```javascript
import { uploadImage, showUploadProgress } from '../utils/upload.js';
// uploadImage(file, appState.authToken, (percent) => showUploadProgress('divId', percent))
// Retorna { url: '/uploads/orgId/filename.jpg' }
```

### Photo Editor Modal:
```javascript
import { photoEditorHtml, setupPhotoEditor } from '../utils/photoEditor.js';
// photoEditorHtml('modalId', '3/4') — gera HTML do modal
// setupPhotoEditor(container, 'modalId', imageUrl, { scale, posX, posY }, onSave)
```

---

## ERROS COMUNS — NAO REINTRODUZIR

| Erro | Causa | Como nao reintroduzir |
|------|-------|-----------------------|
| Conteudo aparece e some no admin | CSS invisivel no tema escuro | Nunca usar classes Tailwind em tabs do admin |
| `@apply` nao funciona em runtime | So funciona durante build | Nao usar `@apply` fora do `tailwind-input.css` |
| Portfolio nao aparece no site | Classe arbitraria nao compilada | Nao usar `aspect-[3/4]` — usar `style="aspect-ratio:3/4;"` |
| Upload falha com 413 | Payload muito grande | Verificar `client_max_body_size` no Nginx |
| Preview em branco ao abrir Meu Site | Race condition no slug | Nunca chamar `builderLoadPreview` sem `await loadOrgSlug()` |
| Preview mostra "Site em construcao" | `siteEnabled=false` bloqueia em producao | Sempre usar `_preview=1` no iframe do builder |
| Secoes do site fora de ordem | `appendChild` em vez de antes do footer | Reordenacao sempre com `insertBefore(el, siteFooter)` |
| Rota admin retorna 404 em producao | Falta `authenticateToken` | Todas as rotas admin precisam de `authenticateToken` |
| Erro 500 no cadastro | `ownerId` required | Nao tornar `ownerId` obrigatorio no schema |
| App nao inicia | MongoDB desligado | `sudo systemctl start mongod` |
| 502 Bad Gateway | Node.js caiu | `pm2 reload ecosystem.config.js --env production` + ver logs |

---

## INSTRUCOES CRITICAS — INFRAESTRUTURA VPS

1. **NUNCA confunda os apps:** O nosso e `cliquezoom-saas` (ids 8/9, porta 3051, `/var/www/cz-saas`)
2. **NUNCA altere a porta** — e 3051, definida no `.env` da VPS
3. **NUNCA modifique configs do Nginx** sem autorizacao explicita
4. **NUNCA faca `pm2 restart all`** — use `pm2 reload ecosystem.config.js --env production`
5. **NUNCA mexer no site original** (`/var/www/fs-fotografias`, processo `fsfotografias`)

---

## SISTEMA DE SKILLS (contextos sob demanda)

Leia o arquivo da skill APENAS ao trabalhar na area correspondente:

| Skill | Quando usar |
|-------|-------------|
| `skills/obsidian_master_sync.md` | Visao geral do projeto — primeira leitura de qualquer sessao |
| `skills/geral-site.md` | Builder mode, sub-abas do Meu Site, postMessage, dirty tracking |
| `skills/design-system.md` | Tokens de design, CSS variables, paleta GitHub Dark |
| `skills/builder-templates.md` | Templates do site (elegante, minimalista, moderno, escuro, galeria), shared-site.js |
| `skills/builder-personalizar.md` | Customizacao de cores, fontes, layout do site |
| `skills/builder-hero.md` | Secao Hero (Capa) do site |
| `skills/builder-portfolio.md` | Portfolio de fotos no site |
| `skills/builder-estudio.md` | Secao Estudio (sobre o estudio) |
| `skills/builder-sobre.md` | Secao Sobre |
| `skills/builder-forms.md` | Formularios e contato |
| `skills/builder-sessoes.md` | Sessoes de clientes, selecao de fotos, galeria do cliente |
| `skills/albums-prova.md` | Albums de prova, aprovacao, revisao pelo cliente |
| `skills/billing.md` | Planos, limites, Stripe, assinatura |

**Regra:** Ao finalizar qualquer implementacao que afete uma area coberta por uma skill, atualizar o arquivo correspondente.

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
