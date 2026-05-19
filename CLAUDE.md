# CliqueZoom — Guia para Assistente

## ORGANIZAÇÃO DO PROJETO
- **Pastas:** PWA (`cliente/`), Admin Vanilla JS (`admin/`), Site Público (`site/templates/`), Backend Express+MongoDB (`src/`).
- **Produção real:** A plataforma já tem uma fotógrafa ativa — **Flávia Cristina Pacheco** (`flavia.cristthina@gmail.com`). Máxima cautela em alterações que afetam dados existentes ou fluxos ativos.
- **Código genérico:** Nunca hardcodar nomes de orgs. Usar variáveis de ambiente (`OWNER_SLUG`, `BASE_DOMAIN`).
- **Superadmin da plataforma:** `admin@cliquezoom.com.br` — `role: superadmin` no MongoDB. Tem acesso ao painel SaaS em `/saas-admin` e à aba "Padrão" no Meu Site.

## DEPLOY (VPS Contabo)
- **Servidor:** `root@vmi3069803` (IP: `5.189.174.18`)
- **Localização:** `/var/www/cz-saas`, PM2 app: `cliquezoom-saas` (IDs 8 e 9), porta 3051.
- **Comando deploy:**
  ```bash
  cd /var/www/cz-saas && git pull && pm2 reload ecosystem.config.js --env production --update-env
  ```
- **Ver logs após deploy:** `pm2 logs cliquezoom-saas --lines 20`
- **Tailwind:** Se mudou CSS, execute `npm run build:css` ANTES de commit.
- **Proibido:** Não altere Nginx/porta, não mexer em `crm-backend` ou `vps-hub` sem autorização.
- **Sem commit/push automático:** Aguarde pedido explícito do usuário.

## CÓDIGO BACKEND (src/)
- **Módulos:** CommonJS (`require`). Sempre no topo do arquivo.
- **I/O:** Nunca síncrono. Usar `fs.promises` e `src/services/storage.js` (uploads em `/uploads/`, sem S3).
- **Banco:** MongoDB. Consultas de leitura com `.lean()`. Configs centralizadas em `Organization` (`siteContent`, `siteConfig`, `watermark`, `plan`).
- **Logs:** Via `req.logger.info()` / `req.logger.error()` (não console.log).
- **Idioma:** Código e comentários sempre PT-BR.

## CÓDIGO ADMIN (admin/)
- **Módulos:** ES Modules (`import/export`).
- **Estilos:** SEMPRE inline com variáveis CSS (`var(--ad-bg-base)`). Nunca Tailwind em tabs (invisível no dark mode).
- **Dialogs:** `window.showToast(msg, type)` e `window.showConfirm(msg, opts)`. Proibido `alert/confirm`.
- **Tema:** Dual (light/dark) via `[data-theme]` no html. Default: light. Toggle salva em `localStorage`.
- **Tokens Light:** `--ad-bg-base:#e8e8eb`, `--ad-bg-surface:#f1f1f3`, `--ad-text:#1a1a1a`, `--ad-accent:#1a1a1a`
- **Tokens Dark:** `--ad-bg-base:#2a2a2c`, `--ad-bg-surface:#323234`, `--ad-text:#f2f2f2`, `--ad-accent:#f2f2f2`
- **Status Colors:** `--ad-green:#3fb950`, `--ad-red:#f85149`, `--ad-yellow:#d29922`, `--ad-orange:#ffa657`
- **Tipografia:** Playfair (logo/marketing), Inter (ui/body).

## ESTRUTURA DE TABS (admin/js/tabs/)
- **Pequeno (< 600 linhas):** Um arquivo só (ex: `faq.js`).
- **Grande (> 600 linhas):** Pasta `tabs/X/` com: `index.js` (entry), `state.js` (estado global), `list.js`, `modal-form.js`, `actions.js`.

## SITE PÚBLICO (site/templates/)
- **Builder Iframe:** Renderiza com TEMA DO FOTÓGRAFO — não herda `[data-theme]` do admin.
- **Cuidado redobrado:** Mudanças aqui podem quebrar a experiência pública.

## QUALIDADE
- **Auditoria:** Front → Back → DB → Testes Playwright (`--workers=1`).
- **Validação:** Leia front (sem alert/hexcodes/CSS hardcoded). Leia back (require no topo, I/O async, .lean()).

---

## ARQUITETURA DO APP

### BACKEND (src/)
**Express + MongoDB, CommonJS**
- `server.js` — entrypoint, middleware (CORS, logging, rate-limit, auth tenant)
- **routes/** — 16 arquivos de rotas (~126 endpoints no total)
  - `auth.js` — login, registro, recuperação de senha
  - `sessions.js` — CRUD de sessões, upload de fotos, modos de entrega
  - `clients.js` — CRM de clientes
  - `albums.js` — álbuns de prova (código preservado, funcionalidade V2)
  - `organization.js` — perfil, integrações, marca d'água
  - `billing.js` — planos e assinaturas
  - `domains.js` — domínios customizados
  - `site.js` — templates do site público, template padrão
  - `siteData.js` — dados públicos (hero, faq, marketing overview)
  - `notifications.js`, `upload.js`, `sales.js`, `payments.js`, `landing.js`, `saasAdmin.js`, `tutorials.js`
- **middleware/** — auth.js (JWT), tenant.js (multi-tenant), security.js (honey pot), planLimits.js, stripe.js, mercadopago.js
- **models/** — Organization (central), User, Session, Album, Client, Subscription, SiteData, LandingData, Notification, SecurityLog, Tutorial, DefaultSiteTemplate, plans
- **utils/** — logger (Winston), email.js, multerConfig, deadlineChecker, offboardingChecker, salesAutomator, anniversaryAutomator, dnsVerifier, cleanupStorage (script standalone)
- **services/** — storage.js (operações de arquivo)

**Data Flow:** Client → Route → Middleware (auth/tenant) → Controller logic → Model query (`.lean()` em reads) → Response

**Modos de Sessão (V1 — ativos):**
- `gallery`: Galeria pública, cliente visualiza e baixa (sem seleção)
- `selection`: Galeria com seleção de fotos pelo cliente (com deadline)
- `multi_selection`: Múltiplos participantes, cada um com sua seleção (deadline compartilhado)

**Modos de Sessão (V2 — ocultos no front, código preservado no back):**
- `multi_instant`: Entrega real-time sem deadline. Aguarda implementação de reconhecimento facial (face search) para ter valor real. Código no backend intacto.

---

### ADMIN (admin/)
**Vanilla JS ES Modules, Dual-theme**
- `index.html` — SPA, theme script (localStorage), CSS tokens
- **js/tabs/** — tabs ativas no menu:

  **PRINCIPAL**
  - `dashboard.js` — KPIs, sessões recentes, ações rápidas
  - `sessoes/` — CRUD de sessões (3 modos V1), upload de fotos, comentários, participantes
  - `clientes.js` — CRM básico de clientes
  - `mensagens.js` — contatos do site + depoimentos pendentes de aprovação
  - `crm.js` — automação de vendas (gatilhos de escassez, cupons)

  **SITE**
  - `meu-site.js` — builder visual do site (hero, sobre, portfólio, estúdio, álbuns, FAQ, área do cliente). Aba "Padrão" visível SOMENTE se `role === 'superadmin'`
  - `dominio.js` — domínio customizado + verificação DNS
  - `integracoes.js` — GA4, Meta Pixel, Google Ads, TikTok, Zapier, Make, Webhook
  - `marketing.js` — dashboard de KPIs e funil de conversão

  **CONTA**
  - `perfil.js` — identidade visual, marca d'água
  - `plano.js` — assinatura, barras de uso, billing
  - `ajuda.js` — tutoriais em vídeo (YouTube) + **Manual do Usuário** (sub-navegação interna)

  **TABS OCULTAS (V2 — código preservado, comentado no index.html):**
  - `albuns-prova.js` — proofing de álbuns. Aguarda redesign completo do fluxo.

- **js/utils/** — api.js, helpers.js, upload.js, photoEditor.js, richtext.js, notifications.js (polling), toast.js, client-modal.js
- **js/components/** — upload-panel.js

**Theme:** `[data-theme]` attribute on `<html>`. Light (default) / Dark. Inline styles ONLY nas tabs.

**Dialogs:** `window.showToast()` e `window.showConfirm()` — nunca `alert/confirm`.

**Sessões — Fluxo de Modos V1:**
- Na criação (`modal-form.js`), o usuário seleciona: Seleção, Galeria ou Multi-Seleção
- `multi_selection` exige deadline compartilhado entre participantes
- `selection` exige deadline individual
- `gallery` não tem seleção — cliente visualiza e baixa direto

---

### CLIENTE (cliente/)
**PWA, Vanilla JS**
- `index.html` — SPA da galeria, login com tenant
- `sw.js` — Service Worker (offline, caching)
- **js/gallery.js** — lógica da galeria (seleção, download, entrega)

**Nota:** Cliente renderiza com tema do fotógrafo, não herda do admin.

---

### SITE PÚBLICO (site/templates/)
**HTML renderizado dinamicamente pelo backend**
- `master/index.html` — template único com `data-theme` injetado pelo server.js
- Temas disponíveis: `elegante`, `minimalista`, `moderno`, `escuro`, `galeria`
- Preview: `?_preview_theme=<tema>` (sem alterar o banco)
- Tenant resolvido por: subdomínio → header `x-tenant` → query `_tenant` → fallback `OWNER_SLUG`

---

### TESTES (tests/)
**Playwright, E2E**
- `1_0_landing-page.spec.js` — site público
- `2_0_login.spec.js` — login admin + cliente
- `3_0_sessoes.spec.js` — fluxo de sessões (modos V1: gallery, selection, multi_selection)
- `3_1_cliente-galeria.spec.js` — galeria cliente
- `4_0_clientes.spec.js` — CRUD clientes

**Executar:** `npx playwright test --workers=1`

---

## PADRÕES & ANTI-PADRÕES

✅ **Fazer:**
- Backend: `const X = require('./...')` no topo. `fs.promises`. `.lean()` em reads. `req.logger.info/error`.
- Admin: `import/export`. Inline styles + tokens CSS. Sem `alert/confirm`.
- Código PT-BR.

❌ **Não fazer:**
- `console.log` (use logger)
- `fs.readFileSync` (use promises)
- `alert`, `confirm` (use showToast/showConfirm)
- Tailwind em tabs (invisível no dark)
- Hexcodes hardcoded em CSS (use tokens)

---

## FUNCIONALIDADES IMPLEMENTADAS

### E-mails (src/utils/email.js)
- Boas-vindas ao fotógrafo: `sendWelcomeEmail(email, name, slug)`
- Notificação ao dono no novo cadastro: `sendNewPhotographerNotificationEmail(name, email, slug)` → `process.env.OWNER_EMAIL`
- SMTP: `smtp.hostinger.com` porta 465. Credenciais em `.env` com `dotenv({ override: true })` — garante que o .env sempre vence vars do PM2.
- Transporter singleton com pool (maxConnections: 3) — evita reconexão a cada envio.
- **Schedulers rodam apenas no worker 0 do PM2** (via `NODE_APP_INSTANCE`) para evitar envios duplicados em cluster.

### Integrações (admin/js/tabs/integracoes.js + src/routes/organization.js)
- Salva via `PUT /api/organization/integrations`
- Campos: `googleAnalytics`, `metaPixel`, `googleAds`, `tiktokPixel`, `zapier`, `make`, `customWebhook`
- Meta Pixel lido de `Organization.integrations.metaPixel` (não SiteData)

### Marketing (admin/js/tabs/marketing.js + src/routes/siteData.js)
- `GET /api/marketing/overview` — dados reais do MongoDB
- Retorna: KPIs 30d, funil (codeSent→accessed→submitted→delivered), statusCount, byEventType, byMode, crm (triggers/coupons), rates, ga

### Plano (admin/js/tabs/plano.js + src/routes/billing.js)
- Barras de uso reais (sessions, photos, armazenamento em MB calculado em disco)
- Barra muda cor: verde → amarelo (70%) → vermelho (90%)
- Botões Stripe mostram "Em Breve" quando `stripeConfigured: false`

### Template Padrão para Novos Fotógrafos (src/routes/site.js)
- `applyDefaultTemplate(orgId)` chamado fire-and-forget no registro de novo fotógrafo
- `GET/PUT /api/site/default-template` — lê e salva o template (PUT exige `X-Admin-Key`)
- Aba **Padrão** no Meu Site visível apenas para superadmin
- Fallback hardcoded em `site.js` se não houver template no banco
- **Chave:** `PLATFORM_ADMIN_KEY=cz-admin-2025-542a04deba81b574`

### Segurança Anti-Bot (src/middleware/security.js + src/models/SecurityLog.js)
- Honey pot: campo invisível `_hp_trap` nos formulários públicos — bloqueia e loga bots
- Aba "Segurança" no SaaS Admin exibe IPs detectados
- TTL index: logs expiram em 30 dias

### CRM — Automação de Vendas (src/utils/salesAutomator.js)
- Gatilhos de escassez: 15d (sem cupom), 7d, 3d, 1d (com cupom)
- Idempotência via `session.salesAutomation.sentTriggers`
- Roda a cada 6h no worker 0

---

## ESTADO ATUAL DO PROJETO (V1 — pré-lançamento)

### Concluído ✅
- Backend completo: 16 rotas, 126 endpoints, todos ativos
- Admin completo: 19 tabs funcionais (1 oculta para V2)
- Site público: 5 temas, builder visual, domínio customizado
- Email: SMTP Hostinger funcionando, fix do bug de credenciais do PM2
- Segurança: honey pot, rate limiting, logs anti-bot
- CRM: automação de vendas, gatilhos de escassez, reativação anual
- Limpeza estrutural: removidos 7 arquivos de código morto
- **Auditoria Dia 2** — todos os 126 endpoints auditados. Fix de bug deployado (commit `93631af`)
- **Dashboard auditado e refatorado** — fixes de qualidade + sessões recentes clicáveis
- **Manual do Usuário** — seção na tab Ajuda com sub-nav, accordion por módulo e mini-previews visuais. Dashboard e Sessões documentados. Ver `skills/00_manual-usuario.md`
- **Auditoria Sessões** — 7 fixes de tokens CSS aplicados (hexcodes, RGBA, prefixo `--ad-*`, tokens inexistentes). Ver `skills/02_sessoes.md`

### Em andamento — Auditoria de 7 dias 🔄
**Dia 1 ✅ — Limpeza estrutural** (concluído)
**Dia 2 ✅ — Auditoria backend** (concluído — ver achados abaixo)
**Dia 3 🔄 — Auditoria frontend** (em andamento — Dashboard ✅, Sessões ✅, próximo: Clientes/Mensagens)
**Dia 4** — Auditoria site builder: hero, sobre, portfólio, estúdio, FAQ
**Dia 5** — Funcionalidades avançadas: CRM, marketing, integrações, plano
**Dia 6** — Domínio, segurança, testes Playwright E2E
**Dia 7** — Correções, polimento, deploy final

### Achados do Dia 2 — Notas para manutenção futura
- **Route names não óbvios:** `GET /api/organization/profile` (não `/api/organization`), `GET /api/billing/subscription` (não `/api/billing/plan`), login em `POST /api/login` (não `/api/auth/login`)
- **resolveTenant em produção:** Lê tenant SOMENTE por subdomínio ou campo `customDomain`. O header `x-tenant` é ignorado pelo middleware. O parâmetro `_tenant` só funciona em localhost/preview. Rotas de cliente precisam de subdomínio válido em produção (ex: `audit-cz-2025.cliquezoom.com.br`)
- **DELETE idempotente:** `DELETE /api/sessions/:id` retorna `{success:true}` mesmo se a sessão não existe — comportamento intencional
- **Inconsistência de campo:** `POST /site/contact` usa campos PT-BR (`nome`, `mensagem`); `POST /site/depoimento` usa campos EN (`name`, `text`) — menor, mas deve ser uniformizado no futuro
- **Limite de upload:** Express JSON capped em 5MB. Multer (multipart) permite até 10MB por arquivo — são middlewares diferentes

### Pendências antes do lançamento ⚠️
- [ ] **Template Padrão — fix 403:** Confirmar `PLATFORM_ADMIN_KEY` no runtime do PM2. Testar: `curl -X PUT https://app.cliquezoom.com.br/api/site/default-template -H "X-Admin-Key: cz-admin-2025-542a04deba81b574" -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{}'`
- [ ] **Mongoose deprecation:** `findOneAndUpdate` com `new: true` — trocar para `returnDocument: 'after'` (warnings nos logs, não é erro crítico)
- [ ] **Inconsistência de campos:** Uniformizar `nome`/`mensagem` (contato) vs `name`/`text` (depoimento) — não crítico
- [ ] Completar auditoria dos dias 3–7

### V2 — Funcionalidades ocultas aguardando desenvolvimento
- **Prova de Álbuns:** fluxo completo de proofing (páginas, layouts, revisões, aprovação)
- **Multi-Imediata + Face Search:** reconhecimento facial para entregar fotos por participante em eventos em tempo real
- **Marca D'água Híbrida:** modo `both` (texto + imagem), posições tile/sequência/repetição
- **Monetização Direta:** payment gateway para liberar download pós-upsell
- **Slideshow Viral:** geração de vídeo com ffmpeg + Bull queue
