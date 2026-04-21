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
| Editor visual de imagem | Agora integrado diretamente no preview real do site via `shared-site.js` e sliders na barra lateral. |

Comandos: `npm run dev` (nodemon), `npm run build:css`, `npm start`.

---

## ERROS COMUNS — NAO REINTRODUZIR

| Sintoma | Causa | Evitar |
|---|---|---|
| Conteudo invisivel no admin | Classes Tailwind no tema dark | Sempre CSS variables |
| `@apply` nao funciona em runtime | So funciona no build | Nao usar fora de `tailwind-input.css` |
| Portfolio sumido no site | Classe arbitraria nao compilada | Use `style="aspect-ratio:3/4;"`, nao `aspect-[3/4]` |
| Secao salva no admin mas nao aparece no site publico | `saveAppData` salva em `SiteData` (legado); site publico le de `Organization.siteContent` | Usar `apiPut('/api/site/admin/config', { siteContent: { ... } })` para qualquer dado que o site precisa exibir |
| Erro 500 "Cannot create field X in element" no MongoDB | Dot notation aninhada no `$set` (`siteContent.portfolio.photos`) conflita com campo pai ja existente como `Mixed` | Sempre fazer `$set` no objeto pai inteiro: `updateData['siteContent.portfolio'] = value` em vez de `updateData['siteContent.portfolio.photos'] = value.photos` |
| Formulário de depoimento "enviado" mas nunca aparece no admin | Testes feitos no preview do builder (`?_preview=1`) — fluxo real (visitante em `slug.cliquezoom.com.br`) ainda não validado | Testar sempre numa aba separada sem `_preview`; considerar ocultar o formulário no modo preview |
| Upload 413 | Payload grande | Verificar `client_max_body_size` Nginx |
| `slug.cliquezoom.com.br` vai para landing page | Nginx sem SSL wildcard ou `server.js` sem redirect de subdomínio | Ver `skills/6_0_dominio.md` — bloco `cliquezoom-slugs` + cert `cliquezoom.com.br-0001` |
| Preview branco no Meu Site | Race condition slug | `await loadOrgSlug()` antes de `builderLoadPreview` |
| Preview "Site em construcao" | `siteEnabled=false` | Sempre `_preview=1` no iframe builder |
| Secoes fora de ordem | `appendChild` em vez de antes do footer | `insertBefore(el, siteFooter)` |
| Rota admin 404 producao | Falta `authenticateToken` | Toda rota admin com middleware |
| Erro 500 cadastro | `ownerId` required | Nao tornar `ownerId` obrigatorio no schema |
| App nao inicia | MongoDB off | `sudo systemctl start mongod` |
| 502 Bad Gateway | Node caiu | `pm2 reload ecosystem.config.js --env production` + logs |
| Admin demora para carregar no login | Chamadas de API sequenciais em `postLoginSetup` | Usar `Promise.all([loadOrgSlug(), loadSidebarStorage()])` — nunca `await` em serie para chamadas independentes |
| Site publico lento (TTFB alto) | Query dupla MongoDB na rota `GET /site` | Incluir `siteTheme` no `.select()` da query de resolucao do tenant — nao fazer `findById` separado depois |
| I/O sincrono trava todo o servidor | `fs.readdirSync`/`fs.statSync` no event loop | Sempre `fs.promises.readdir`/`fs.promises.stat` em rotas async |


---

## SKILLS (ler sob demanda)

### Core — Arquitetura e Infraestrutura
`skills/1_1_backend.md` — rotas Express, middlewares, auth JWT, variáveis de ambiente, planLimits
`skills/1_2_frontend.md` — admin UI, CSS variables, utilitários, tabs, padrões ES Modules
`skills/1_3_banco-de-dados.md` — modelos Mongoose, Mixed, fontes de verdade (SiteData vs Organization)
`skills/1_4_builder-componentes.md` — biblioteca de componentes reutilizáveis do admin, showcase, padrões de canvas/layer
`skills/6_0_dominio.md` — DNS, Nginx, SSL wildcard, subdomínios de fotógrafos, domínio customizado

### CRM e Sessões
`skills/2_0_sessoes-clientes.md` — módulo Sessões + Clientes: arquitetura, fluxo de seleção, multi-seleção, busca dinâmica de clientes, 3 campos de data, envio manual de e-mail, filtros, link email→galeria com slug+código, rota `/send-code`, rota `/clients/search`

### Site Builder — Índice e Geral
`skills/5_0_meu-site.md` — índice do builder, estrutura geral, navegação entre módulos
`skills/5_1_builder-geral-site.md` — builder, postMessage, dirty state, iframe preview
`skills/5_15_default-meusite.md` — configurações padrão e reset do builder

### Site Builder — Módulos de Seção
`skills/5_2_builder-sessoes.md` — seção Sessões no site público
`skills/5_3_builder-hero.md` — hero, siteConfig (não siteContent), canvas, sliders de transformação
`skills/5_4_builder-sobre.md` — sobre, layers, drag-and-drop de camadas, preview integrado
`skills/5_5_builder-portfolio.md` — portfolio, upload, compressão, grid
`skills/5_6_builder-servicos.md` — serviços, cards
`skills/5_7_builder-depoiments.md` — depoimentos, aprovação, formulário público
`skills/5_8_builder-albuns.md` — álbuns de prova, editor avançado, drag-and-drop, dual-mode grid
`skills/5_9_builder-estudio.md` — estúdio, informações da empresa
`skills/5_10_builder-contato.md` — contato, formulário, mapa
`skills/5_11_builder-faq.md` — FAQ, accordion
`skills/5_12_builder_personalizar.md` — personalização: cores, fontes, tema
`skills/5_13_builder-rodape.md` — rodapé: redes sociais, copyright, quickLinks

**Regra:** ao alterar área coberta por skill, atualizar a skill correspondente. Após features que adicionam pasta/rota/modelo/padrão novo, atualizar este `CLAUDE.md` e a skill relevante.

---

## FUNCIONALIDADES REMOVIDAS — NAO RECRIAR

| Funcionalidade | Removida de | Motivo |
|---|---|---|
| Newsletter | `footer.js`, `shared-site.js` (labels, allSections, bloco de codigo) | Nao existe mais no app |
| Tab Logo (`logo.js`) | `admin/js/tabs/logo.js` deletado | Codigo morto; logo gerenciado via Perfil → `Organization.logo` |
| Secoes Extras (customSections) | `meu-site.js`, `shared-site.js`, `Organization.js`, `site.js` | Funcionalidade descontinuada em 2026-04-18 |

---

## PERFORMANCE — PADROES ESTABELECIDOS (2026-04-19)

> Otimizacoes aplicadas apos diagnostico de lentidao. Nao reverter.

### Frontend (admin)
- **Login paralelo:** `postLoginSetup()` usa `await Promise.all([loadOrgSlug(), loadSidebarStorage()])` — nunca serializar chamadas independentes.
- **Polling com delay:** `setTimeout(startNotificationPolling, 5000)` — nao iniciar imediatamente no login.
- **Scripts do site publico:** todos os templates usam `<script src="shared-site.js" defer>` — obrigatorio em novos templates.
- **Fonte Material Symbols:** parametros fixos `opsz,wght,FILL,GRAD@24,400,0..1,0&display=swap` — nao usar ranges amplos.

### Backend
- **I/O de disco:** sempre `fs.promises.*` (async) — nunca `fs.readdirSync`, `fs.statSync`, `fs.existsSync` em rotas.
- **Queries MongoDB em rotas publicas:** resolver tenant e `siteTheme` em uma unica query com `.select('_id siteTheme').lean()`.
- **Limit do express.json:** `5mb` global — uploads usam multer (multipart), nao sao afetados por esse limit.
- **`.lean()`:** usar em todas as queries de leitura que nao precisam de metodos Mongoose (`save`, `markModified`).

---

## DELETAR CODIGO ANTIGO

Antes de implementar feature, verificar se existe codigo legado a remover.

---

## REGRA DE EXPERIENCIA

Antes de alterar codigo, leia o modulo correspondente e valide a alteracao contra o Roadmap e a UX. Se a alteracao afetar o fluxo de dados entre componentes, explicar o impacto antes de gerar codigo. Tres passos antes de subir/rodar:

1. **Analise:** o que este botao/funcao faz hoje?
2. **Impacto:** o que muda no estado global?
3. **Rastreabilidade:** para onde esse comando vai e quem consome?


---

## AJUSTES PENDENTES — Consistencia entre modulos admin

> Auditoria realizada em 2026-04-17. Corrigir modulo por modulo antes de novas features.

### 3 padroes canonicos (referencia: `portfolio.js`)

| Padrao | Correto | Errado |
|---|---|---|
| Estado isolado | `let _modulo = null` (carrega na primeira render) | `appState.appData.X` |
| Save de dados do site | `apiPut('/api/site/admin/config', { siteContent: {...} })` | `saveAppData('X', data)` |
| CSS | `var(--bg-surface)`, `var(--text-primary)` | `#hexcodes` hardcoded |
| Preview sync | `window._meuSitePostPreview?.()` apos cada save | ausente |

### Status por modulo

| Arquivo | Estado isolado | Save correto | CSS variables | Preview sync |
|---|---|---|---|---|
| `portfolio.js` | ✅ | ✅ | ✅ | ✅ |
| `sobre.js` | ✅ | ✅ | ✅ | ✅ |
| `perfil.js` | ✅ | ✅ | ✅ | — (nao precisa) |
| `faq.js` | ✅ | ✅ | ✅ | ✅ |
| `albuns.js` | ✅ | ✅ | ✅ | ✅ |
| `integracoes.js` | ✅ | ✅ (usa /api/organization/profile — correto) | ✅ | — (nao precisa; nao e visual no site) |
| `estudio.js` | ✅ | ✅ | ✅ | ✅ |
| `logo.js` | ✅ deletado — código morto. Logo via `Organization.logo` (Perfil) → `shared-site.js` exibe na navbar/footer | | | |
| `footer.js` | ✅ | ✅ | ✅ | ✅ |
| `hero.js` | ✅ | ✅ siteConfig (nao siteContent) | ✅ | ✅ |

*hero.js salva em `siteConfig` (nao `siteContent`) pois `shared-site.js` le de `data.siteConfig`. Backend `PUT /api/site/admin/config` atualizado para fazer merge de siteConfig por sub-chave (igual ao siteContent), evitando sobrescrever campos como `title` e `description`.*

### Escopo da refatoracao

Esta mesma auditoria de consistencia (3 padroes canonicos) sera feita para **todos os modulos** nas 3 camadas:

| Camada | Skill de referencia | Status |
|---|---|---|
| Frontend (`admin/js/tabs/`) | `skills/1_2_frontend.md` | 🔄 Em andamento |
| Backend (`src/routes/`) | `skills/1_1_backend.md` | ✅ Concluido |
| Banco de dados (`src/models/`) | `skills/1_3_banco-de-dados.md` | ✅ Concluido |

### Ordem de correcao — Frontend (atual)

1. `estudio.js` — ✅ concluido
2. `logo.js` — ✅ deletado (codigo morto); logo via `Organization.logo` → `shared-site.js`
3. `albuns.js` — ✅ concluido
4. `footer.js` — ✅ concluido (migrado para siteContent.footer; shared-site.js atualizado para redes sociais, copyright e quickLinks; newsletter removida completamente do app)
5. `hero.js` — ✅ concluido (migrado para siteConfig; backend atualizado com merge por sub-chave; 35 cores → CSS variables; preview sync adicionado)
6. `faq.js`, `integracoes.js` — ✅ concluido (CSS variables + preview sync no faq; integracoes sem preview sync pois nao e secao visual)


# Regra Geral sobre Commit e push

sempre que alterar algum feature que precise de build (css novo, arquivo na pasta assets, etc), ou que o usuário peça para subir uma alteração para o site publico, você deve:
1. fazer o build do css
2. fazer o commit com a mensagem "feat: add feature name"
3. fazer o push para o repositório
4. avisar o usuário que o site foi atualizado

