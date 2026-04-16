# CliqueZoom — Instrucoes para o Assistente

## PROJETO

SaaS de gestao fotografica. Frontends: `home/` (cadastro), `admin/` (painel fotografo), `cliente/` (galeria), `album/` (prova), `saas-admin/` (super-admin), `site/templates/` (5 templates publicos). Backend: `src/` (Express + MongoDB local).

Deploy: VPS Contabo, dominio `cliquezoom.com.br`, path `/var/www/cz-saas`, processo PM2 `cliquezoom-saas` (ids 8/9, porta 3051, cluster).

---

## REGRAS CRITICAS

1. **Admin JS = ES Modules** (`import/export`). Nunca `require()` em `admin/`.
2. **Backend JS = CommonJS** (`require/module.exports`) em `src/`. `package.json` tem `"type":"commonjs"`.
3. **Tabs do admin: INLINE STYLES com CSS variables.** Nunca classes Tailwind (ficam invisiveis no tema dark).
4. **Upload SO local** em `/uploads/`. Sem Cloudinary/S3/Atlas.
5. **`npm run build:css` antes de deploy** se mudou HTML com classes Tailwind novas.
6. **Admin:** `window.showToast(msg, type)` e `window.showConfirm(msg, opts)`. Nunca `alert/confirm`.
7. **Saas-admin:** `saasToast()` e `saasConfirm()`. Nunca `alert/confirm`.
8. **Multi-tenancy:** toda rota e modelo filtra/inclui `organizationId`.
9. **Fale em portugues** em tudo (mensagens, labels, comentarios).

---

## ARQUITETURA

```
admin/          # Painel fotografo (ES Modules)
  index.html    # Shell + login + sidebar + builder mode
  js/
    app.js      # Orquestrador, switchTab, builder mode
    state.js    # appState, loadAppData, saveAppData
    tabs/       # 1 arquivo por aba (dashboard, perfil, meu-site, sessoes, clientes, albuns-prova, albuns, portfolio, estudio, faq, hero, sobre, logo, footer, integracoes, marketing, dominio, plano)
    utils/      # helpers, upload, api, photoEditor, notifications, toast
saas-admin/     # Super-admin (orgs, lixeira, landing)
home/           # Landing /cadastro
cliente/        # Galeria privada (PWA)
album/          # Album de prova
site/templates/ # elegante, minimalista, moderno, escuro, galeria + shared-site.js
  shared.css    # CSS ESTRUTURAL compartilhado (layout, aspect-ratio, breakpoints base)
                # Cada modulo novo: estrutura em shared.css, visual em style.css individual
assets/css/     # tailwind-input.css (source), tailwind.css (build), shared.css
uploads/        # Imagens (Nginx static); /sessions/, /videos/
src/
  server.js
  middleware/   # auth (JWT), tenant, planLimits, stripe
  models/       # Organization, User, Session, Client, Album, Subscription, Notification, SiteData, LandingData, plans
  routes/       # auth, sessions, clients, albums, organization, site, siteData, upload, notifications, domains, billing, landing
  utils/        # multerConfig, notifications, deadlineChecker
ecosystem.config.js  # PM2 cluster
```

---

## DESIGN SYSTEM (admin) — CSS variables em `admin/index.html`

```css
--bg-base:#0d1117; --bg-surface:#161b22; --bg-elevated:#1c2128; --bg-hover:#21262d;
--border:#30363d; --text-primary:#e6edf3; --text-secondary:#8b949e; --text-muted:#484f58;
--accent:#2f81f7; --accent-hover:#1f6feb;
--green:#3fb950; --red:#f85149; --yellow:#d29922; --purple:#bc8cff; --orange:#ffa657;
```

Uso: `style="background:var(--bg-surface); color:var(--text-primary); border:1px solid var(--border);"`

Layout: `#sidebar (220px)` + `#main-area (#topbar 56px + #workspace + #builder-props 360px + #builder-preview)`.

---

## MODELO Organization (campos chave)

`name, slug, ownerId, plan, isActive, logo, phone, whatsapp, email, website, bio, address, city, state, primaryColor, watermarkType, watermarkText, watermarkOpacity, siteEnabled, siteTheme, siteConfig{hero*,overlayOpacity,topBarHeight,bottomBarHeight}, siteStyle{accentColor,bgColor,textColor,fontFamily}, siteSections[], siteContent{sobre,servicos,depoimentos,portfolio,contato,faq,customSections}, integrations{whatsappMessage,googleAnalytics,facebookPixel,metaPixel,seo}`

`SiteData` (legado): hero, faq, portfolio.photos[]. Acessado via `GET/PUT /api/site-data`.

---

## DEPLOY

**Pre-deploy local:** `git status` limpo → `git log origin/main..HEAD` vazio (se nao, `git push` ANTES de instruir VPS).

**Comandos VPS:**
```bash
cd /var/www/cz-saas
git pull
npm install                # so se mudou package.json
pm2 reload ecosystem.config.js --env production
```

| O que mudou | Acao |
|---|---|
| Backend (`src/`) | `git pull` + `npm install` + `pm2 reload` |
| Frontend (sem Tailwind novo) | `git pull` (Nginx serve static) |
| Tailwind classes novas | `npm run build:css` local + commit + `git pull` na VPS |

Logs: `pm2 logs cliquezoom-saas --lines 30 --nostream`. **Nunca** `pm2 restart all`. **Nunca** mexer em `fsfotografias`, `crm-backend`, `vps-hub`. **Nunca** alterar Nginx/porta sem autorizacao.

---

## PADROES DE CODIGO

| Tarefa | Como |
|---|---|
| Novo tab admin | `admin/js/tabs/X.js` exportando `renderX(container)` + botao `.nav-item[data-tab="x"]` em `admin/index.html` + entrada em `TAB_TITLES` em `app.js` |
| Nova rota backend | `src/routes/X.js` (CommonJS) + filtrar `organizationId` + `app.use('/api', require('./routes/X'))` em `server.js` |
| Novo modelo | Incluir `organizationId: { type: ObjectId, ref: 'Organization', required: true }` + `{ timestamps: true }` |
| Upload imagem | `import { uploadImage, showUploadProgress } from '../utils/upload.js'` → comprime 1200px/85% → `POST /api/admin/upload` → `{ url: '/uploads/orgId/file.jpg' }` |
| Dados que aparecem no site publico | Salvar com `apiPut('/api/site/admin/config', { siteContent: { chave: valor } })`. Carregar com `apiGet('/api/site/admin/config')` → `.siteContent.chave`. NUNCA usar `saveAppData` para dados do site publico — ela salva em SiteData (legado) que o site nao le. |
| Dados internos do admin (hero, faq, etc) | Usar `saveAppData(section, data)` → `/api/site-data` (SiteData). So para dados que o site publico le via SiteData (hero canvas, faq). Verificar qual modelo o `shared-site.js` consome antes de escolher qual rota usar. |
| Alterar layout de secao nos templates | Editar `site/templates/shared.css` (estrutura: grid, aspect-ratio, breakpoints). Regras visuais (cores, bordas, sombras, animacoes) em cada `style.css` individual |
| Editor visual de imagem com drag/resize/borda/sombra | Usar `HeroCanvasEditor` de `admin/js/utils/heroCanvas.js` (apelido interno: CanvasLayerEditor). Ja usado em Hero e Sobre. Aplicar em qualquer secao que precise compor imagem livremente (posicionar, escalar, arredondar, adicionar sombra). NAO aplicar em grades de fotos simples (ex: Portfolio). |

Comandos: `npm run dev` (nodemon), `npm run build:css`, `npm start`.

---

## ERROS COMUNS — NAO REINTRODUZIR

| Sintoma | Causa | Evitar |
|---|---|---|
| Conteudo invisivel no admin | Classes Tailwind no tema dark | Sempre CSS variables |
| `@apply` nao funciona em runtime | So funciona no build | Nao usar fora de `tailwind-input.css` |
| Portfolio sumido no site | Classe arbitraria nao compilada | Use `style="aspect-ratio:3/4;"`, nao `aspect-[3/4]` |
| Secao salva no admin mas nao aparece no site publico | `saveAppData` salva em `SiteData` (legado); site publico le de `Organization.siteContent` | Usar `apiPut('/api/site/admin/config', { siteContent: { ... } })` para qualquer dado que o site precisa exibir |
| Upload 413 | Payload grande | Verificar `client_max_body_size` Nginx |
| Preview branco no Meu Site | Race condition slug | `await loadOrgSlug()` antes de `builderLoadPreview` |
| Preview "Site em construcao" | `siteEnabled=false` | Sempre `_preview=1` no iframe builder |
| Secoes fora de ordem | `appendChild` em vez de antes do footer | `insertBefore(el, siteFooter)` |
| Rota admin 404 producao | Falta `authenticateToken` | Toda rota admin com middleware |
| Erro 500 cadastro | `ownerId` required | Nao tornar `ownerId` obrigatorio no schema |
| App nao inicia | MongoDB off | `sudo systemctl start mongod` |
| 502 Bad Gateway | Node caiu | `pm2 reload ecosystem.config.js --env production` + logs |

---

## SKILLS (ler sob demanda)

`skills/obsidian_master_sync.md` (visao geral) · `geral-site.md` (builder, postMessage, dirty) · `design-system.md` · `builder-templates.md` · `builder-personalizar.md` · `builder-hero.md` · `builder-portfolio.md` · `builder-estudio.md` · `builder-sobre.md` · `builder-forms.md` · `builder-sessoes.md` · `albums-prova.md` · `billing.md`

**Regra:** ao alterar area coberta por skill, atualizar a skill correspondente. Apos features que adicionam pasta/rota/modelo/padrao, atualizar este `CLAUDE.md`.

---

## DELETAR CODIGO ANTIGO

Antes de implementar feature, verificar se existe codigo legado a remover.

---

## REGRA DE EXPERIENCIA

Antes de alterar codigo, leia o modulo correspondente e valide a alteracao contra o Roadmap e a UX. Se a alteracao afetar o fluxo de dados entre componentes, explicar o impacto antes de gerar codigo. Tres passos antes de subir/rodar:

1. **Analise:** o que este botao/funcao faz hoje?
2. **Impacto:** o que muda no estado global?
3. **Rastreabilidade:** para onde esse comando vai e quem consome?
