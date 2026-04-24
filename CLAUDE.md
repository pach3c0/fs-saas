# CliqueZoom — Instrucoes para o Assistente

## PROJETO

SaaS de gestao fotografica. Frontends: `home/` (cadastro), `admin/` (painel fotografo), `cliente/` (galeria), `album/` (prova), `saas-admin/` (super-admin), `site/templates/` (5 templates publicos). Backend: `src/` (Express + MongoDB local: mongodb://localhost:27017/cliquezoom).

Deploy: VPS Contabo, dominio `cliquezoom.com.br`, path `/var/www/cz-saas`, processo PM2 `cliquezoom-saas` (ids 8/9, porta 3051, cluster).

---

## REGRAS CRITICAS

1. **Admin JS = ES Modules** (`import/export`). Nunca `require()` em `admin/`.
2. **Backend JS = CommonJS** (`require/module.exports`) em `src/`. `package.json` tem `"type":"commonjs"`.
3. **Tabs do admin: INLINE STYLES com CSS variables.** Nunca classes Tailwind (ficam invisiveis no tema dark).
4. **Upload SO local** em `/uploads/`. Sem Cloudinary/S3/Atlas.
5. **`npm run build:css` antes de deploy** se mudou HTML com classes Tailwind novas.
6. **Admin:** `window.showToast(msg, type)` e `window.showConfirm(msg, opts)`. Nunca `alert/confirm`.
10. **Logging:** usar `req.logger` (Winston) para logs estruturados com `orgId/userId/requestId`.
11. **Storage:** usar `src/services/storage.js` para qualquer operação de arquivo (save/delete/url).
12. **Fale em portugues** em tudo (mensagens, labels, comentarios).

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
  routes/       # auth, sessions, clients, albums, organization, site, siteData, upload, notifications, domains, billing, landing, saasAdmin
  utils/        # multerConfig, notifications, deadlineChecker, logger
  services/     # storage (abstração de arquivos)
  logs/         # logs diários (winston)
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

`name, slug, ownerId, plan, isActive, logo, phone, whatsapp, email, website, bio, address, city, state, primaryColor, watermarkType, watermarkText, watermarkOpacity, siteEnabled, siteTheme, siteConfig{hero*,overlayOpacity,topBarHeight,bottomBarHeight}, siteStyle{accentColor,bgColor,textColor,fontFamily}, siteSections[], siteContent{sobre,servicos,depoimentos,portfolio,contato,faq,customSections}, integrations{whatsappMessage,googleAnalytics,facebookPixel,metaPixel,seo,deadlineAutomation{enabled,daysWarning,sendEmail}}`

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

Logs: `pm2 logs cliquezoom-saas --lines 30 --nostream`. **Nunca** `pm2 restart all`.
**AVISO CRÍTICO DE BANCO:** O banco deste projeto é `cliquezoom`. **Nunca** use o banco `fsfotografias` (pertence a outro sistema legado no mesmo servidor).
**Nunca** mexer em `crm-backend`, `vps-hub`. **Nunca** alterar Nginx/porta sem autorizacao.

---

## PADROES DE CODIGO

| Tarefa | Como |
|---|---|
| Novo tab admin | `admin/js/tabs/X.js` exportando `renderX(container)` + botao `.nav-item[data-tab="x"]` em `admin/index.html` + entrada em `TAB_TITLES` em `app.js` |
| Nova rota backend | `src/routes/X.js` (CommonJS) + filtrar `organizationId` + `app.use('/api', require('./routes/X'))` em `server.js` |
| Novo modelo | Incluir `organizationId: { type: ObjectId, ref: 'Organization', required: true }` + `{ timestamps: true }` |
| Logging | Usar `req.logger.info/error('msg', { metadata })`. Contexto de tenant/user já injetado via `auth.js`. |
| Storage | `import storage from '../services/storage.js'`. Usar `storage.deleteFile(url)`, `storage.getUrl(path)`, `storage.getDirSize(path)`. |
| Super-Admin | Rotas em `src/routes/saasAdmin.js`. Métricas em `/api/admin/saas/metrics`. |
| Upload imagem | `import { uploadImage, showUploadProgress, UploadQueue } from '../utils/upload.js'` → `UploadQueue` para massa, `uploadImage` para solo. |
| PWA Offline | `cliente/sw.js` (Sync + IDB) + `gallery.js` (Queue IDB) | Suporte a seleções e comentários offline. |
| Onboarding | `Organization.onboarding` + `dashboard.js` checklist | Guia de boas-vindas para novos fotógrafos. |
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
| Site publico lento (TTFB alto) | Multiplas queries MongoDB na rota `GET /site` | Usar uma unica `Organization.find({ slug: { $in: candidates } })` e reordenar por prioridade em JS |
| I/O sincrono trava todo o servidor | `fs.readdirSync`/`fs.statSync`/`fs.existsSync` no event loop | Sempre `fs.promises.readdir`/`fs.promises.stat`/`fs.promises.access` em rotas async |
| `require()` dentro de handler | Lookup desnecessaria a cada requisicao | Mover todos os `require()` para o topo do arquivo |
| Branding de outra marca aparece na galeria do cliente | Fallback hardcoded `'FS FOTOGRAFIAS'` em `gallery.js` ou `index.html` | Fallback sempre `''` ou omitir — nunca string de marca; ver `skills/2_1_clientes_selecao.md` |
| Fotógrafo com conta suspensa consegue usar o sistema | `isActive=false` não era verificado no middleware | `authenticateToken` em `src/middleware/auth.js` já verifica — retorna 403 com mensagem clara |
| API lenta para todos os fotógrafos (Neighbor Noise) | Um tenant em loop abusava da API sem limite | `express-rate-limit` em `src/server.js`: 300 req/min por `organizationId`; superadmins e `/site` são isentos |
| Arquivos órfãos em `/uploads/` após delete de sessão/foto | (1) `storage.deleteFile()` sem `await` em `forEach` no delete; (2) Erro durante upload não limpava arquivos do multer; (3) `urlEditada` não era deletado | Usar `await Promise.all(deletions)` ao remover arquivos; em catch de upload, sempre limpar `req.files` |
| Limite de plano não respeita valor `-1` (infinito) após editar no saas-admin | `planLimits.json` é atualizado mas `Subscription.limits` no banco não — o middleware `checkPhotoLimit` lê do banco | Ao salvar limites de planos, fazer `Subscription.updateMany({ plan }, { $set: { limits: limits[plan] } })` para sincronizar |


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
`skills/2_1_clientes_selecao.md` — galeria PWA do cliente (`cliente/`): tenant resolution por subdomínio, login automático via `?code=`, branding dinâmico (somente logo do fotógrafo), watermark, PWA manifest, rotas `/api/client/*`

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
- **Queries MongoDB na rota `GET /site`:** uma unica `Organization.find({ slug: { $in: candidates } })` cobrindo tenant/subdominio/ownerSlug; prioridade resolvida em JS por reordenacao de array.
- **Limit do express.json:** `5mb` global — uploads usam multer (multipart), nao sao afetados por esse limit.
- **`.lean()`:** usar em todas as queries de leitura que nao precisam de metodos Mongoose (`save`, `markModified`).
- **`require()` no topo:** nunca usar `require()` dentro de handlers de rota — mover para o topo do arquivo.

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
7. `app.js` (Login/Landing) — ✅ concluido em 2026-04-24 (hexcodes → CSS variables; fetch manual → apiGet; import apiGet adicionado; landing.js console.error → req.logger; testes Playwright melhorados: email dinamico, +2 casos de erro no login)

### Modulos pendentes de auditoria 360 (proxima sequencia)

| Modulo | Frontend | Backend | Testes Playwright | Skill atualizada |
|---|---|---|---|---|
| `sessoes.js` | ✅ hexcodes → CSS variables (2026-04-24) | — | `tests/2_0_login.spec.js` ✅ | `skills/2_0_sessoes-clientes.md` ✅ |
| `clientes.js` | 🔄 pendente (`escapeHtml` duplicado, importar de helpers.js) | — | pendente | pendente |
| `dashboard.js` | 🔄 pendente (auditoria nao feita) | — | pendente | pendente |
| `perfil.js` | ✅ (ja auditado) | — | pendente | pendente |
| `plano.js` | 🔄 pendente | — | pendente | pendente |
| `dominio.js` | 🔄 pendente | — | pendente | pendente |
| `marketing.js` | 🔄 pendente | — | pendente | pendente |

---

## PROTOCOLO DE INÍCIO DE CONVERSA

> Toda IA que iniciar uma sessão neste projeto deve seguir este protocolo antes de qualquer outra ação.

### 1. Leia o estado atual

Antes de responder qualquer pergunta sobre "o que fazer", leia:
- A tabela **"Módulos pendentes de auditoria 360"** na seção `AJUSTES PENDENTES` deste arquivo
- O primeiro módulo marcado com 🔄 é o próximo a ser auditado
- Pergunte ao usuário se deseja continuar por esse módulo ou tem outra prioridade

### 2. Sequência canônica de auditoria por módulo

Para cada módulo na tabela de pendências, siga esta ordem:

| Passo | Ação |
|---|---|
| 1 | Ler a skill correspondente (`skills/X.md`) e verificar se está atualizada |
| 2 | Ler o arquivo frontend (`admin/js/tabs/X.js`) completo |
| 3 | Identificar: `confirm()`/`alert()` nativos, hexcodes hardcoded, código morto, `escapeHtml` duplicado |
| 4 | Aplicar correções (CSS variables, `window.showConfirm`, importar de helpers.js) |
| 5 | Ler o arquivo backend correspondente em `src/routes/` |
| 6 | Verificar: `require()` dentro de handlers, I/O síncrono, queries sem `.lean()` |
| 7 | Criar teste Playwright em `tests/N_0_modulo.spec.js` cobrindo o caminho crítico |
| 8 | Rodar: `npx playwright test tests/N_0_modulo.spec.js --workers=1 --headed` |
| 9 | Atualizar a skill do módulo com o que foi alterado |
| 10 | Marcar o módulo como ✅ na tabela de pendências |

### 3. Credenciais de teste (produção)

```
Email:  ricardopacheco.nunes59@gmail.com
Senha:  qUzsov-zetkek-wokwo3
URL admin: https://www.cliquezoom.com.br/admin
Galeria cliente: https://fsfotografias.cliquezoom.com.br/cliente/
```

### 4. Regras operacionais de teste (aprendidas na prática)

- **`--workers=1` obrigatório** em testes admin — testes paralelos causam race condition no `switchTab`
- **Dados de teste com prefixo `test-auto-`** — permite limpeza fácil no banco
- **`switchTab` é async** — após login, aguardar `.dashboard-stats` + `waitForTimeout(1500)` antes de navegar para outra tab
- **Login correto:** `POST /api/login` (não `/api/auth/login`)
- **Modal de confirmação customizado:** botão `#confirmOk` (nunca `window.confirm` nativo)
- **Subdomínio ativo com SSL:** apenas `fsfotografias.cliquezoom.com.br` — usar este para testes de UI de galeria
- **Não fazer commit/push sem pedido explícito do usuário**

---

# Regra Geral sobre Commit e push

sempre que alterar algum feature que precise de build (css novo, arquivo na pasta assets, etc), ou que o usuário peça para subir uma alteração para o site publico, você deve:
1. fazer o build do css
2. fazer o commit com a mensagem "feat: add feature name"
3. fazer o push para o repositório
4. avisar o usuário que o site foi atualizado


---

## ARQUITETURA DE SOFTWARE — O QUE APLICAMOS E O QUE VEM DEPOIS

> Baseado no estudo de arquitetura realizado em 2026-04-22. Referência completa em `skills/estudoarquitetura.md`.

### JÁ APLICADO (não alterar sem consciência)

| Padrão | Onde está no código | Por que importa |
|---|---|---|
| **Arquitetura 3-Tier** | `cliente/` + `admin/` → `src/` → MongoDB | Separação de responsabilidades correta desde o início |
| **Stateless (JWT)** | `src/middleware/auth.js` — token em cada requisição | Permite PM2 cluster sem Sticky Sessions; qualquer instância responde |
| **PWA Offline & Sync** | `cliente/sw.js` + `IndexedDB` | Resiliência de rede para o cliente final; ações enfileiradas |
| **Escalabilidade horizontal (base)** | `ecosystem.config.js` — `instances: 2, exec_mode: 'cluster'` | Para dobrar capacidade: mudar para `instances: 4`, sem alterar código |
| **Feature Flag (primitiva)** | `Organization.siteEnabled`, `?_preview=1` na URL | Liga/desliga funcionalidade sem deploy |
| **Rolling deploy sem downtime** | `pm2 reload` reinicia uma instância por vez | Usuários não percebem o deploy; já funciona hoje |

### A APLICAR — RESILIÊNCIA (baixo esforço, alto impacto)

| Padrão | O que fazer | Quando |
|---|---|---|
| **SLI/SLO — monitoramento** | ✅ UptimeRobot configurado — monitor `https://cliquezoom.com.br/health` a cada 5 min | Concluído 2026-04-22 |
| **RPO/RTO — backup automático** | ✅ rclone + Google Drive (2 TB). Cron diário às 3h faz `mongodump` + sync de `/uploads/`. Script em `scripts/backup.sh`. | Concluído 2026-04-22 |

**Detalhes do backup (configurado no VPS em 2026-04-22):**
- Script: `/root/scripts/backup.sh`
- Cron: `0 3 * * * /root/scripts/backup.sh >> /var/log/cz-backup.log 2>&1`
- Destino: Google Drive → pasta `CliqueZoom-Backups/mongodb/` e `CliqueZoom-Backups/uploads/`
- MongoDB: backup diário comprimido (RPO = 24h)
- Uploads (fotos): sync incremental diário (primeira sync: 493 arquivos)
- Dumps locais: apagados após 7 dias automaticamente
- Verificar log: `tail -f /var/log/cz-backup.log`
- Se o token do rclone expirar: `rclone config reconnect gdrive:` no VPS

| **Observabilidade (Winston)** | ✅ Logs estruturados com rotação diária e tenant-aware (via `req.logger`). | Concluído 2026-04-23 |
| **Abstração de Storage** | ✅ `src/services/storage.js` implementado e integrado em sessions/upload/saas-admin. | Concluído 2026-04-23 |
| **Métricas Super-Admin** | ✅ Dashboard `saas-admin` exibe uso de disco e estatísticas globais em tempo real. | Concluído 2026-04-23 |
| **Strangler Fig (Cloud Migration)** | Migrar uploads para Cloudflare R2 ($0,015/GB/mês, egress gratuito) usando a abstração `StorageService`. Script batch migra arquivos antigos sem downtime. | Quando Storage VPS > 70% |

### NÃO APLICAR AGORA (excesso de engenharia para o estágio atual)

| Padrão | Motivo para adiar |
|---|---|
| **BFF (Back-end For Front-end)** | O mesmo Express serve todos os frontends e está correto assim. BFF só faz sentido com equipes grandes e payloads muito divergentes. |
| **Fault Tolerance total** | Requer 2 VPS + load balancer externo. O PM2 com `instances: 2` já oferece Alta Disponibilidade suficiente para esta fase. |
| **Blue-Green completo** | Requer infraestrutura duplicada. O `pm2 reload` (Rolling) já resolve deploy sem downtime. |
| **Microsserviços** | O monolito atual é saudável e produtivo. Separar serviços antes da hora gera complexidade sem retorno. |

---

## ROADMAP ESTRATÉGICO (Visão 2026)

O CliqueZoom está evoluindo de uma ferramenta de entrega para um **Gerente de Vendas Automático**.

### Pilares de Evolução:
1.  **✅ Fluxo Pro (Lightroom):** `Session.workflowType` (`ready`|`post_edit`) + `Session.photoResolution` (960–1600px). Fluxo `post_edit` descarta original no upload; re-upload das editadas via `POST /sessions/:id/photos/upload-edited` (casa por filename). Implementado 2026-04-21.
2.  **✅ Automação de Prazos (Escassez):** `Organization.integrations.deadlineAutomation`. Scheduler `setInterval` 6h no `server.js`; e-mails `sendDeadlineWarningEmail`/`sendDeadlineExpiredEmail`. Implementado 2026-04-21.
3.  **✅ Melhoria na Experiência Principal (Sprint 2):** Bulk Upload com Fila Concorrente, Onboarding Checklist e PWA Offline Sync. Implementado 2026-04-23.
4.  **Vendedor Automático (Upselling):** E-mail automático após submissão da seleção oferecendo fotos extras com desconto. Próximo passo da automação de marketing.
4.  **Monetização Direta:** Integração com gateways de pagamento para liberação automática de downloads após quitação de extras.
5.  **Backup Democrático:** Portabilidade de dados permitindo que o fotógrafo mova sessões antigas para seu próprio Google Drive/Dropbox.
6.  **Viralização (Slideshow):** Geração automática de vídeos com trilha sonora. Requer `fluent-ffmpeg` + fila de jobs (Bull/BeeQueue).

> Detalhes técnicos e fluxos documentados em `skills/2_1_clientes_selecao.md`.

---

## VAZAMENTO DE STORAGE — INVESTIGAÇÃO EM ANDAMENTO (2026-04-24)

> **Status:** Parcialmente resolvido. Ainda há vazamento não identificado — usuário relata que apenas ~5 MB foram liberados após correções, sintoma persiste. Próxima IA deve continuar daqui.

### Sintoma reportado

- Org `Estudio Star` (slug: soraia, ID: `69927bbb80b8c2d033f9ffa5`) com **0 sessões no banco** mas mostra **51.67 MB** em "Espaço Usado" no dashboard do admin.
- Após deletar todas as fotos pelo painel admin (clicando no X), arquivos físicos ficavam em `/var/www/cz-saas/uploads/<orgId>/sessions/`.
- Usuário deletou várias vezes via mongosh e ainda há vazamento.
- Org `Fs Fotografias` (ID: `69c6a1b912ec3dec57684d42`) — **NÃO MEXER**, é a esposa, único cliente real.

### Correções aplicadas (commits no branch main)

| Commit | O que faz |
|---|---|
| `c5eecd3` | Sync `Subscription.limits` no banco quando saas-admin edita limites de plano (problema do `-1` infinito) |
| `b823b12` | Adiciona `req.logger.error` com stack trace nos catches de delete sessão/foto |
| `68be0af` | Substitui `forEach(p => storage.deleteFile(...))` por `await Promise.all(deletions)` em `DELETE /sessions/:id` e `DELETE /sessions/:sessionId/photos/:photoId`. Inclui `urlEditada` nas deleções. Remove `existsSync` síncrono de `storage.deleteFile`, ignora `ENOENT` silenciosamente |
| `fe88190` | Em catch de `POST /sessions/:id/photos` e `POST /sessions/:id/photos/upload-edited`, limpa `req.files` para evitar órfãos quando upload falha no meio |

### O que ainda NÃO foi investigado (pistas para próxima IA)

1. **Outras rotas que fazem upload e podem vazar em erro:**
   - `src/routes/upload.js` — endpoints genéricos (logo, hero, portfolio, etc)
   - `src/routes/sessions.js` linha ~21 (`uploadSession`) tem outros consumidores?
   - `src/routes/site.js`, `siteData.js` — uploads de hero/portfolio
   - Verificar todos os `multer.array(...)` e `multer.single(...)` no projeto

2. **Sharp falhando após salvar arquivo original:**
   - Em `POST /sessions/:id/photos`, multer salva o original e depois `sharp().toFile(thumbPath)` cria a thumb. Se sharp falhar (formato, OOM, etc), o catch agora limpa `req.files` mas NÃO limpa thumbs já geradas em iterações anteriores do `for`.
   - Solução: rastrear arquivos gerados (thumbs) dentro do try e limpar ambos no catch.

3. **Dashboard do admin mostra storage do disco real:**
   - `GET /api/billing/subscription` em `src/routes/billing.js` calcula via `storage.getDirSize()` — então o número 51.67 MB é o disco real, não cache.

4. **Verificar se há job/rotina que escreve em `/uploads/` sem registrar no banco:**
   - `src/utils/deadlineChecker.js` (scheduler 6h)
   - `scripts/backup.sh` na VPS — só lê, não escreve em uploads

5. **Possível causa não testada:** o frontend admin pode estar fazendo upload duplicado (chamando `POST /sessions/:id/photos` duas vezes em sequência por bug de listener), ou retentativa após timeout sem cancelar a primeira.

### Script de limpeza disponível (USAR COM CUIDADO)

`src/utils/cleanupStorage.js` — script standalone que lê todas as referências do banco (Organization, Session, SiteData) e deleta do disco qualquer arquivo de `/uploads/<orgId>/` não referenciado.

```bash
node src/utils/cleanupStorage.js <orgId>
```

**NÃO RODAR PARA `69c6a1b912ec3dec57684d42` (Fs Fotografias).**

### Estado atual do disco na VPS (último check)

```
/var/www/cz-saas/uploads/
├── 69927bbb80b8c2d033f9ffa5/sessions/   # Estudio Star — vazamento aqui (~46MB órfãos)
└── 69c6a1b912ec3dec57684d42/             # Fs Fotografias — NÃO MEXER
```

### Próximos passos sugeridos

1. Auditar **todas** as rotas com multer (`grep -rn "multer\.\(single\|array\)" src/`) e adicionar try/catch+cleanup como em `sessions.js`.
2. No `POST /sessions/:id/photos`, rastrear thumbs criadas pelo sharp em variável dentro do try e limpá-las no catch (atualmente só limpa originals do multer).
3. Adicionar logs no início de `storage.deleteFile` para traçar quais arquivos NÃO estão sendo deletados quando deveriam (verificar logs do PM2 após reproduzir o bug).
4. Investigar se `Promise.all` está realmente esperando — adicionar `req.logger.info('files deleted', { count })` antes do `Session.findByIdAndDelete`.
5. Considerar mover toda a operação para uma transação MongoDB + cleanup atômico, mas é overhead grande.



# Ajustes, limnpezas, organizacao e refatoracao

- inicialmente estou organizando por modulos, por exemplo 

primeiro vamos revisar o modulo, suas skills de documentacao, e dentro do modulo vamos revisar os arquivos de front e back e banco de dados para ver se esta tudo ok com o codigo, se precisa de refatoracao, se tem muito codigo comentado, codigo morto, colunas que nao sao usadas, no banco de dados e que estao sendo legadas, como ainda estamos em preocesso de desenvolvimento entao temos que ter um cuidado especial para nao quebrar nada, hoje tenho somente o cliente fsfotografias Flavia Cristina Pacheco da Silva que é minha esposa defato funcionando, no momento ela esta usando somente o site do app, entao se alguma informacao da fsfottografia estiver em dados legado, precisamos verificar a melhor forma de deixar no padrao do app, se tem arquivo desnecessario, etc, depois da tudo verificado preciso criar teste Playwright /skills/1_6_testes.md sem documentar na skills do modulo todas as alteracoes e como o modulo funciona e criar tambem na skills do modulo os fluxo /skills/fluxo.md Edited 1_6_testes.md


Aqui está o resumo da sua metodologia de trabalho descrita no **`CLAUDE.md`**:

### 🎯 Objetivo: Ciclo de Qualidade por Módulo
A estratégia consiste em uma revisão 360º de cada parte do sistema, seguindo esta ordem:

1.  **Análise de Documentação:** Revisar as `skills` do módulo para garantir que explicam bem o funcionamento, atencao se a skill esta errada com o que o modulo de fato é, se esta desatualizada, atualize a skiil
2.  **Auditoria de Código (Tríade):**
    *   **Frontend/Backend:** Limpar códigos comentados, mortos e aplicar refatoração onde necessário.
    *   **Banco de Dados:** Identificar e remover colunas/tabelas legadas ou inúteis.
3.  **Segurança da Produção (Caso FS Fotografia):** Cuidado redobrado para não quebrar o site da única cliente real ativa (sua esposa). Se houver dados legados dela, eles devem ser migrados com segurança para o novo padrão do App.
4.  **Validação Final:**
    *   Criar testes automatizados com **Playwright** (`skills/1_6_testes.md`).
    *   Documentar todos os novos fluxos e alterações em diagramas (`skills/fluxo.md`).

