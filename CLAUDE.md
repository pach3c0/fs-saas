# CliqueZoom — Instrucoes para o Assistente
## PROJETO
SaaS de gestao fotografica. Frontends: `home/` (cadastro), `admin/` (painel fotografo), `cliente/` (galeria PWA), `album/` (prova), `saas-admin/` (super-admin), `site/templates/` (5 templates publicos). Backend: `src/` (Express + MongoDB local `mongodb://localhost:27017/cliquezoom`).
Deploy: VPS Contabo, dominio `cliquezoom.com.br`, path `/var/www/cz-saas`, PM2 `cliquezoom-saas` (ids 8/9, porta 3051, cluster `instances:2`).
Cliente real unico em producao: **Fs Fotografias** (Flavia, ID `69c6a1b912ec3dec57684d42`, slug `fsfotografias`) — usa apenas o site publico. Cuidado redobrado para nao quebrar.
---
## REGRAS CRITICAS
1. Admin JS = ES Modules (`import/export`). Nunca `require()` em `admin/`.
2. Backend JS = CommonJS em `src/` (`package.json: "type":"commonjs"`).
3. Tabs do admin: INLINE STYLES com CSS variables. Nunca classes Tailwind (invisiveis no dark).
4. Upload SO local em `/uploads/`. Sem Cloudinary/S3/Atlas.
5. `npm run build:css` antes de deploy se mudou HTML com classes Tailwind novas.
6. Admin: `window.showToast(msg,type)` e `window.showConfirm(msg,opts)`. Nunca `alert/confirm`.
7. Logging: `req.logger.info/error('msg',{meta})` (Winston, tenant-aware via `auth.js`).
8. Storage: `src/services/storage.js` para qualquer save/delete/url de arquivo.
9. Fale em portugues em tudo (mensagens, labels, comentarios).
10. Banco e `cliquezoom`. NUNCA `fsfotografias` (sistema legado no mesmo servidor).
11. Nao mexer em `crm-backend`, `vps-hub`. Nao alterar Nginx/porta sem autorizacao.
12. Nao fazer commit/push sem pedido explicito do usuario.
---
## ARQUITETURA
```
admin/   index.html (shell+login+sidebar+builder)  js/{app.js,state.js,tabs/{*.js ou X/index.js},utils/*}
saas-admin/  home/  cliente/(PWA: sw.js+IDB)  album/
site/templates/{elegante,minimalista,moderno,escuro,galeria}+shared-site.js+shared.css
assets/css/{tailwind-input.css,tailwind.css,shared.css}
uploads/{<orgId>/sessions,videos}
src/  routes/(auth,sessions,clients,albums,organization,site,siteData,upload,
       notifications,domains,billing,landing,saasAdmin)
      utils/(multerConfig,notifications,deadlineChecker,logger,cleanupStorage)
      services/storage.js  middleware/auth.js  models/  logs/
ecosystem.config.js (PM2 cluster)
```
---
## DESIGN SYSTEM
Antes de qualquer trabalho visual: LER `design-system/SKILL.md` + arquivos em `design-system/`.
3 superficies separadas: Marketing (`home/`), Admin (`admin/`+`saas-admin/`), Temas (`site/templates/*`). Nunca misturar.

**Paleta CliqueZoom (minimalista):** preto/cinza/branco. Sem azul, sem roxo. Status (success/danger/warning) sao funcionais — nunca usar como cor de marca.

**Logo:** wordmark "CliqueZoom" em Playfair Display 700 (sem letra "C" estilizada, sem gradientes). Aplicada em landing, admin/login, admin/sidebar, saas-admin/login, saas-admin/topbar.

**Tokens:** fonte unica em `assets/css/tokens.css` (servida pelo Nginx via `/assets/css/tokens.css`). Symlink em `design-system/tokens.css` para os docs locais. NUNCA inventar cores/fontes — sempre consumir tokens.

**Tipografia:** Marketing usa Playfair (display) + Inter (body). Admin usa Inter only — exceto a wordmark do logo que e Playfair.

**Voz PT-BR**, "voce", sem exclamacoes em CTAs. Icones: Lucide outline 1.5px (filled so em selected). Imagens: placeholder xadrez ou foto real (nunca stock).

**Admin (admin/ + saas-admin/) — tema dual via `[data-theme]` em `<html>`:**
- Default = **light** (decisao de UX: novo fotografo descobre que existe a opcao dark)
- Persiste em `localStorage['cz-admin-theme']`. Script anti-FOUC no `<head>` aplica antes do render
- Toggle sol/lua no topbar. Funcao global `window.toggleAdminTheme()`

Tokens admin (em `assets/css/tokens.css`, namespace `--ad-*`):
```
LIGHT (cinza escala, branco so para tinta):
--ad-bg-base:#e8e8eb --ad-bg-surface:#f1f1f3 --ad-bg-elevated:#f7f7f8 --ad-bg-hover:#dcdce0
--ad-border:#c8c8cd --ad-text:#1a1a1a --ad-text-muted:#555 --ad-text-dim:#888
--ad-accent:#1a1a1a (preto)  --ad-accent-on:#fff  --ad-input-bg:#f7f7f8

DARK (cinzas neutros, sem azulado):
--ad-bg-base:#2a2a2c --ad-bg-surface:#323234 --ad-bg-elevated:#3a3a3c --ad-bg-hover:#444446
--ad-border:#4a4a4c --ad-text:#f2f2f2 --ad-text-muted:#b5b5b7 --ad-text-dim:#8a8a8c
--ad-accent:#f2f2f2 (tinta clara)  --ad-accent-on:#2a2a2c  --ad-input-bg:#2a2a2c

STATUS (compartilhado entre temas):
--ad-green:#3fb950 --ad-red:#f85149 --ad-yellow:#d29922 --ad-orange:#ffa657
```

`admin/index.html` mantem aliases legados (`--bg-base`, `--accent`, etc) apontando para os `--ad-*` para nao quebrar centenas de refs em `admin/js/tabs/*.js`. `--purple` e shim apontando para cinza ate limpeza dessas refs.

Layout admin: `#sidebar(220px)` + `#main-area(#topbar 56px + #workspace + #builder-props 360px + #builder-preview)`.

**Iframe do builder Meu Site (zona sensivel):** o iframe renderiza Surface C (tema do fotografo). NUNCA pode herdar `data-theme` do admin. Mexer com cuidado redobrado em qualquer coisa que toque `admin/js/tabs/*meusite*`, `site/templates/`, ou o preview do builder.
---
## MODELO Organization (campos chave)
`name, slug, ownerId, plan, isActive, logo, phone, whatsapp, email, website, bio, address, city, state, primaryColor, watermarkType, watermarkText, watermarkOpacity, siteEnabled, siteTheme, siteConfig{hero*,overlayOpacity,topBarHeight,bottomBarHeight}, siteStyle{accentColor,bgColor,textColor,fontFamily}, siteSections[], siteContent{sobre,servicos,depoimentos,portfolio,contato,faq}, integrations{whatsappMessage,googleAnalytics,facebookPixel,metaPixel,seo,deadlineAutomation{enabled,daysWarning,sendEmail}}, onboarding`
`SiteData` (legado): hero, faq, portfolio.photos[]. Acesso `GET/PUT /api/site-data`.
---
## DEPLOY
Pre-deploy local: `git status` limpo → `git log origin/main..HEAD` vazio (se nao, `git push` ANTES da VPS).
VPS: `cd /var/www/cz-saas && git pull && [npm install se package.json mudou] && pm2 reload ecosystem.config.js --env production`.
| Mudou | Acao |
|---|---|
| Backend (`src/`) | git pull + npm install + pm2 reload |
| Frontend sem Tailwind novo | git pull (Nginx static) |
| Tailwind novo | `npm run build:css` local + commit + git pull VPS |
Logs: `pm2 logs cliquezoom-saas --lines 30 --nostream`. Nunca `pm2 restart all`.
Backup automatico: cron 3h via `/root/scripts/backup.sh` → Google Drive (`CliqueZoom-Backups/{mongodb,uploads}`); dumps locais 7 dias; log `/var/log/cz-backup.log`; reconectar token: `rclone config reconnect gdrive:`.
Monitor: UptimeRobot em `https://cliquezoom.com.br/health` a cada 5min.
---
## PADROES DE CODIGO
| Tarefa | Como |
|---|---|
| Novo tab admin | `admin/js/tabs/X.js` exporta `renderX(container)` + `.nav-item[data-tab="x"]` em `index.html` + `TAB_TITLES` em `app.js` |
| Tab grande (>600 linhas) | Dividir em `admin/js/tabs/X/index.js` + sub-modulos por responsabilidade (ver secao PADRAO DE MODULARIZACAO DE TABS) |
| Nova rota backend | `src/routes/X.js` (CommonJS) + filtrar `organizationId` + `app.use('/api', require('./routes/X'))` |
| Novo modelo | `organizationId:{type:ObjectId,ref:'Organization',required:true}` + `{timestamps:true}` |
| Storage | `import storage from '../services/storage.js'` → `deleteFile(url)`, `getUrl(path)`, `getDirSize(path)` |
| Upload | `import {uploadImage,showUploadProgress,UploadQueue} from '../utils/upload.js'` |
| Dados site publico | `apiPut('/api/site/admin/config',{siteContent:{chave:valor}})`. Carregar com `apiGet('/api/site/admin/config').siteContent.chave`. NUNCA `saveAppData` para isso |
| Hero | salva em `siteConfig` (nao `siteContent`); backend faz merge por sub-chave |
| Layout secao templates | estrutura em `site/templates/shared.css`, visual em `style.css` de cada template |
Comandos: `npm run dev` (nodemon), `npm run build:css`, `npm start`.
---
## PADRAO DE MODULARIZACAO DE TABS (admin/js/tabs/)

Tabs com mais de ~600 linhas devem ser divididas em pasta `admin/js/tabs/X/`:

```
admin/js/tabs/X/
├── index.js               # entry point — exporta renderX(container), monta HTML, conecta modulos
├── state.js               # variaveis compartilhadas (xData, currentId, timers)
├── list.js                # renderizar lista + filtros + busca
├── modal-form.js          # criar/editar registro
├── modal-detail.js        # modal principal de detalhe/visualizacao
└── actions.js             # funcoes window.* de acao (delete, deliver, reopen, etc.)
```

Adicionar sub-modulos conforme necessidade (ex: `modal-participantes.js`, `comments.js`, `upload.js`).

**Regras:**
- `index.js` e o unico arquivo importado por `app.js` — nao muda a interface publica
- `state.js` exporta objeto mutavel compartilhado por todos os sub-modulos
- Cada sub-modulo recebe `(container, state)` como parametros — sem globals alem de `window.*`
- Nenhum arquivo deve passar de ~400 linhas
- Tabs pequenas (<600 linhas) permanecem como arquivo unico
---
## ERROS COMUNS — NAO REINTRODUZIR
| Sintoma | Evitar |
|---|---|
| Rota `/bulk` interceptada por `/:photoId` | Registrar rotas com segmento literal ANTES de rotas com parametro dinamico no mesmo prefixo |
| Conteudo invisivel admin | Sempre CSS variables, nunca Tailwind em tabs |
| `@apply` runtime nao funciona | So em `tailwind-input.css` |
| Portfolio sumido | `style="aspect-ratio:3/4"`, nao `aspect-[3/4]` |
| Secao salva mas nao aparece no site | Usar `siteContent` (Organization), nao `SiteData` |
| Erro 500 "Cannot create field X" | `$set` no objeto pai inteiro, nao em dot notation aninhada de Mixed |
| Upload 413 | `client_max_body_size` Nginx |
| `slug.cliquezoom.com.br` → landing | Ver `skills/6_0_dominio.md` (cert wildcard + redirect subdominio) |
| Preview branco Meu Site | `await loadOrgSlug()` antes de `builderLoadPreview` |
| Preview "Site em construcao" | iframe builder com `?_preview=1` |
| Secoes fora de ordem | `insertBefore(el,siteFooter)`, nao `appendChild` |
| Rota admin 404 prod | Faltou `authenticateToken` |
| Erro 500 cadastro | `ownerId` nao deve ser required no schema |
| 502 Bad Gateway | Node caiu → `pm2 reload` + logs |
| Login admin lento | `Promise.all([loadOrgSlug(),loadSidebarStorage()])` paralelo |
| Site publico TTFB alto | Uma `Organization.find({slug:{$in:candidates}})` + reordenar JS |
| I/O sync trava server | Sempre `fs.promises.*` (readdir/stat/access) |
| `require()` em handler | Mover para topo do arquivo |
| Branding errado galeria cliente | Fallback `''`, nunca string de marca hardcoded |
| Conta suspensa funcionando | `isActive=false` ja bloqueado em `auth.js` (403) |
| Neighbor Noise | `express-rate-limit` 300req/min por orgId; superadmin+`/site` isentos |
| Arquivos orfaos uploads | `await Promise.all(deletions)` no delete; em catch upload limpar `req.files`+`generatedThumbs` |
| Limite plano `-1` ignorado | `Subscription.updateMany({plan},{$set:{limits:limits[plan]}})` ao salvar planLimits |
| Caminho duplicado em delete | `resolvePath` retorna absoluto se ja comeca com `baseDir` (corrigido 2026-04-24) |
---
## PERFORMANCE — PADROES (nao reverter)
Frontend: `Promise.all` em login; `setTimeout(startNotificationPolling,5000)`; `<script src="shared-site.js" defer>`; Material Symbols `opsz,wght,FILL,GRAD@24,400,0..1,0&display=swap`.
Backend: `fs.promises.*`; uma query em `GET /site`; `express.json({limit:'5mb'})`; `.lean()` em reads; `require()` no topo.
---
## FUNCIONALIDADES REMOVIDAS — NAO RECRIAR
| Item | Motivo |
|---|---|
| Newsletter | Nao existe mais |
| Tab Logo (`logo.js`) | Codigo morto; logo via `Organization.logo` (Perfil) |
| Secoes Extras (customSections) | Descontinuada 2026-04-18 |
| `Session.workflowType`, `Session.highResDelivery` | Fluxo unificado 2026-04-25 (so `post_edit`); `urlOriginal` (editada re-subida) sempre servido se existe |
---
## ROADMAP
1. ✅ Fluxo Pro Lightroom (`Session.photoResolution` 960-1600px; thumb-only + `POST /sessions/:id/photos/upload-edited`).
2. ✅ Automacao Prazos (`integrations.deadlineAutomation`, scheduler 6h, emails warning/expired).
3. ✅ Sprint 2: Bulk Upload+Fila, Onboarding Checklist, PWA Offline Sync.
4. Vendedor Automatico (upselling email pos-selecao).
5. Monetizacao Direta (gateway pagamento → libera download).
6. Backup Democratico (export sessoes p/ Drive/Dropbox do fotografo).
7. Slideshow viral (`fluent-ffmpeg` + Bull queue).
Strangler Fig (Cloud R2): aplicar quando Storage VPS > 70%, usando `StorageService`.
NAO aplicar agora: BFF, Fault Tolerance multi-VPS, Blue-Green, Microsservicos.
---
## SKILLS (ler sob demanda)
Core: `1_1_backend.md` `1_2_frontend.md` `1_3_banco-de-dados.md` `1_4_builder-componentes.md` `1_6_testes.md` `6_0_dominio.md` `estudoarquitetura.md`
CRM: `2_0_sessoes-clientes.md` `2_1_clientes_selecao.md`
Builder: `5_0_meu-site.md` `5_1_builder-geral-site.md` `5_15_default-meusite.md` `5_2_builder-sessoes.md` `5_3_builder-hero.md` `5_4_builder-sobre.md` `5_5_builder-portfolio.md` `5_6_builder-servicos.md` `5_7_builder-depoiments.md` `5_8_builder-albuns.md` `5_9_builder-estudio.md` `5_10_builder-contato.md` `5_11_builder-faq.md` `5_12_builder_personalizar.md` `5_13_builder-rodape.md`
Fluxos: `skills/fluxo.md`.
Regra: ao alterar area coberta por skill, atualizar a skill. Apos pasta/rota/modelo/padrao novo, atualizar este CLAUDE.md.
---
## AUDITORIA 360 POR MODULO — METODOLOGIA
Ciclo de qualidade por modulo (ordem):
1. Ler skill correspondente; corrigir/atualizar se desatualizada.
2. Ler frontend `admin/js/tabs/X.js` completo. Identificar: `confirm/alert` nativos, hexcodes, codigo morto, `escapeHtml` duplicado.
3. Aplicar correcoes (CSS variables, `window.showConfirm`, importar de `helpers.js`).
4. Ler backend `src/routes/`. Verificar: `require()` em handlers, I/O sync, queries sem `.lean()`.
5. Verificar BD: colunas/modelos legados; migrar dados de Fs Fotografias com seguranca para o padrao novo.
6. Criar Playwright `tests/N_0_modulo.spec.js`. Rodar `npx playwright test ... --workers=1 --headed`.
7. Atualizar skill do modulo + `skills/fluxo.md`. Marcar ✅ na tabela.
3 padroes canonicos (ref: `portfolio.js`): estado isolado `let _modulo=null`; save via `apiPut('/api/site/admin/config',{siteContent:{...}})`; CSS variables; `window._meuSitePostPreview?.()` apos save.
### Status camadas
| Camada | Status |
|---|---|
| Backend (`src/routes/`) | ✅ |
| Banco (`src/models/`) | ✅ |
| Frontend (`admin/js/tabs/`) | 🔄 |
### Frontend concluidos
`portfolio.js` `sobre.js` `perfil.js` `faq.js` `albuns.js` `integracoes.js` `estudio.js` `footer.js` `hero.js` `app.js`(Login/Landing) — todos ✅.
`logo.js` deletado (codigo morto).
Fase 5 Design System (Inputs/Selects/Buttons/Badges/Checkboxes) — ✅ todas as abas (2026-04-25).
### Pendentes auditoria 360
| Modulo | Frontend | Backend | Playwright | Skill |
|---|---|---|---|---|
| `sessoes.js` | ✅ | — | `tests/2_0_login.spec.js` ✅ | `2_0_sessoes-clientes.md` ✅ |
| `clientes.js` | ✅ | ✅ | `tests/4_0_clientes.spec.js` ✅ | `2_0_sessoes-clientes.md` ✅ |
| `dashboard.js` | ✅ | ✅ | `tests/2_0_login.spec.js` ✅ | `1_2_frontend.md` ✅ |
| `perfil.js` | ✅ | — | pendente | pendente |
| `plano.js` | 🔄 | — | pendente | pendente |
| `dominio.js` | 🔄 | — | pendente | pendente |
| `marketing.js` | 🔄 | — | pendente | pendente |
---
## PROTOCOLO DE INICIO DE CONVERSA
1. Ler tabela "Pendentes auditoria 360"; o primeiro 🔄 e o proximo. Perguntar ao usuario se segue ou tem outra prioridade.
2. Seguir os 7 passos da metodologia acima.
### Credenciais teste (producao)
```
Email: ricardopacheco.nunes59@gmail.com
Senha: qUzsov-zetkek-wokwo3
Admin: https://www.cliquezoom.com.br/admin
Galeria: https://fsfotografias.cliquezoom.com.br/cliente/
```
### Regras testes
`--workers=1` obrigatorio (race em `switchTab`); prefixo `test-auto-` em dados; apos login aguardar `.dashboard-stats` + `waitForTimeout(1500)`; login `POST /api/login`; modal confirm botao `#confirmOk`; subdominio com SSL ativo apenas `fsfotografias.cliquezoom.com.br`.
---
## REGRA EXPERIENCIA
Antes de alterar codigo: 1) Analise (o que faz hoje?); 2) Impacto (estado global?); 3) Rastreabilidade (quem consome?). Se afetar fluxo de dados entre componentes, explicar antes de gerar codigo.
---
## REGRA COMMIT/PUSH
Nao commitar/empurrar sem pedido explicito. Quando pedido, ou quando alterar feature que precisa build (CSS novo, assets): 1) `npm run build:css`; 2) commit `feat: <nome>`; 3) push; 4) avisar usuario.
---
## ARQUITETURA APLICADA (nao alterar sem consciencia)
3-Tier (frontends → `src/` → MongoDB); Stateless JWT (`auth.js`); PWA Offline+Sync (`cliente/sw.js`+IDB); Escala horizontal base (PM2 `instances:2,cluster`); Feature Flag primitiva (`siteEnabled`,`?_preview=1`); Rolling deploy (`pm2 reload`); Observabilidade Winston tenant-aware; Storage abstraction (`services/storage.js`); Metricas Super-Admin em `/api/admin/saas/metrics`.
---
## BACKLOG DE AJUSTES — PENDENTES DE IMPLEMENTACAO
Itens levantados pelo usuario que ainda nao foram implementados. Ao iniciar implementacao, mover para a secao correta (ERROS COMUNS, FUNCIONALIDADES REMOVIDAS, etc.) e marcar ✅.

### Modulo: Sessoes (`admin/js/tabs/sessoes.js`)
| # | Item | Status | Regra de negocio |
|---|---|---|---|
| S6 | Campo cliente obrigatorio em nova sessao | ✅ | Bloqueia submit sem `clientId` com toast de aviso (linha ~803) |
| S7 | Autocomplete cliente no modal: ao nao encontrar, exibir `+ Cadastrar "X" como novo cliente` | ✅ | Implementado via `abrirModalClienteNovo` com foco automatico no campo nome |
| S8 | Botao `hidden` ao lado de `openComments` em cada foto da galeria geral | ✅ | Botao existe; **REGRA CRITICA implementada:** se `qtd fotos visiveis <= pacote` em modo Selecao, bloqueia com toast explicativo |
| S9 | Galeria geral: checkbox selecionar todas + acao deletar selecionadas | ✅ | Implementado via `bulkActionsBar` + `selectAllPhotos` + `bulkDeleteBtn` |

### Modulo: Storage Widget (`id="sidebar-storage"`)
| # | Item | Status | Detalhes |
|---|---|---|---|
| W1 | Atualizacao dinamica do widget ao deletar arquivo | ✅ | Chamadas a `window.loadSidebarStorage?.()` apos delete de foto, sessao e bulk delete |
| W2 | Exibir armazenamento por divisao | ✅ | Breakdown em `loadSidebarStorage`: Sistema, Sessoes/Albums, Site Publico |

### Modulo: Clientes (`admin/js/tabs/clientes.js`)
| # | Item | Status | Regra de negocio |
|---|---|---|---|
| C1 | Campos email, telefone e CPF obrigatorios no cadastro de cliente | ✅ | Frontend: `client-modal.js` linha 65. Backend: `POST/PUT /api/clients` agora valida e rejeita sem os tres campos |

### Modulo: Pagina de Selecao do Cliente (`cliente/`)
| # | Item | Status | Regra de negocio |
|---|---|---|---|
| P1 | Remover saudacao `"Ola " + Nome do cliente` | ✅ | `h1#clientName` e `p#galleryMeta` removidos do HTML; `renderHeader()` em gallery.js ja nao exibia saudacao |
| P2 | Config: opcao para habilitar venda de fotos extras pos-entrega | ✅ | Campo `allowExtraPurchasePostSubmit` existe no modal criar/editar sessao e no backend |
| P3 | Config: opcao para permitir reabertura de sessao pelo cliente | ✅ | Campo `allowReopen` existe no modal criar/editar sessao e validado no backend |

# pendente

No perfil temos como criar marca d'água pra texto e pra imagem eu quero implementar um botão que faça a função dos dois imagem e texto que o texto apareça no meio da imagem nessa fusão aí eu consegui editar por exemplo cópia não autorizada ou que tenha também as funções que tem a marca d'água principal que é ladrilho sequência duplicar várias vezes tem que ver uma forma boa pra fazer a fusão dos dois eu já tenho somente texto tenho somente imagem eu quero um que tenha os dois juntos.