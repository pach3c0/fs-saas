# CliqueZoom — Guia para Assistente

## ORGANIZAÇÃO DO PROJETO
- **Pastas:** PWA (`cliente/`), Admin Vanilla JS (`admin/`), Site Público (`site/templates/`), Backend Express+MongoDB (`src/`).
- **Clientes:** `fsfotografias` está em PRODUÇÃO REAL — máxima cautela. Código deve ser genérico (`cliquezoom` não `fsfotografias`).
- **Superadmin da plataforma:** `admin@cliquezoom.com.br` — `role: superadmin` no MongoDB. Tem acesso ao painel SaaS em `/saas-admin` e à aba "Padrão" no Meu Site.

## DEPLOY (VPS Contabo)
- **Servidor:** `root@vmi3069803` (IP: `5.189.174.18`)
- **Localização:** `/var/www/cz-saas`, PM2 app: `cliquezoom-saas` (IDs 8 e 9), porta 3051.
- **Comando deploy:**
  ```bash
  cd /var/www/cz-saas && git pull && pm2 reload ecosystem.config.js --env production
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

## ARQUITETURA DO APP

### BACKEND (src/)
**Express + MongoDB, CommonJS**
- `server.js` — entrypoint, middleware (CORS, logging, rate-limit, auth tenant)
- **routes/** — 14 endpoints (auth, clients, sessions, albums, organization, billing, domains, site, etc)
  - **sessions.js** — Modos: `gallery` (upload público), `selection` (com seleção), `multi_selection` (múltiplos participantes com seleção), `multi_instant` (múltiplos participantes com entrega real-time)
- **middleware/** — Auth (JWT, tenant validation), logging, security (honey pot), error handling
- **services/** — storage.js (file ops), utils genéricos
- **models/** — Organization (central), User, Session, Album, Client, Subscription, LandingData, SecurityLog (logs de bot), DefaultSiteTemplate (singleton)
- **utils/** — logger (Winston), validators, helpers

**Data Flow:** Client → Route → Middleware (auth/tenant) → Controller logic → Model query (`.lean()` on reads) → Response

**Modos de Sessão:**
- `gallery`: Galeria pública com upload (sem seleção)
- `selection`: Galeria com seleção de fotos (deadline)
- `multi_selection`: Múltiplos participantes, cada um com sua seleção (deadline compartilhado)
- `multi_instant`: Múltiplos participantes, fotos entregues em real-time conforme upload (sem deadline, modo imediata)

### ADMIN (admin/)
**Vanilla JS ES Modules, Dual-theme**
- `index.html` — SPA, theme script (localStorage), CSS tokens
- **js/tabs/** — 17 tabs (albuns, clientes, dashboard, estudio, faq, hero, integracoes, marketing, mensagens, meu-site, perfil, plano, portfolio, sessoes, sobre, dominio)
  - Pequenos (< 600 linhas): arquivo único (`faq.js`, `plano.js`)
  - Grandes (> 600 linhas): pasta com `index.js`, `state.js`, `list.js`, `modal-form.js`, `actions.js`
  - **sessoes/** — Gerenciamento de sessões (criar, editar, detalhes, fotos). Suporta 4 modos: `gallery`, `selection`, `multi_selection`, `multi_instant`
  - **meu-site.js** — Builder do site do fotógrafo. Aba "Padrão" visível SOMENTE se `role === 'superadmin'` (lido do JWT via `atob(token.split('.')[1])`)
- **js/components/** — Reusable UI components
- **js/utils/** — Helpers, API calls, formatters
- CSS tokens via `:root` → `var(--ad-bg-base)`, etc

**Theme:** `[data-theme]` attribute on `<html>`. Light (default) / Dark. Inline styles ONLY nas tabs.

**Dialogs:** `window.showToast()` e `window.showConfirm()` — nunca `alert/confirm`.

**Sessões - Fluxo de Modos:**
- Na criação (`modal-form.js`), o usuário seleciona o modo como primeiro campo
- `multi_instant` não permite deadline (entrega real-time conforme fotos são feitas)
- `multi_selection` exige deadline compartilhado entre participantes
- Cada modo tem validações específicas no front (checks de cliente, participantes, campos condicionais)

### CLIENTE (cliente/)
**PWA, Vanilla JS**
- `index.html` — SPA da galeria, login com tenant
- `sw.js` — Service Worker (offline, caching)
- **js/** — Lógica da galeria pública (seleção, upload de fotos, entrega)

**Nota:** Cliente renderiza com tema do fotógrafo, não herda do admin. Isolado via iframe.

### SITE PÚBLICO (site/templates/)
**HTML estático renderizado pelo backend**
- Landing page, hero, integração com builder iframe
- Templates para cada fotógrafo (customização via Organization)

### TESTES (tests/)
**Playwright, E2E**
- `1_0_landing-page.spec.js` — site público
- `2_0_login.spec.js` — login admin + cliente
- `3_0_sessoes.spec.js` — fluxo de sessões (todos os modos: gallery, selection, multi_selection, multi_instant)
- `3_1_cliente-galeria.spec.js` — galeria cliente (modo multi_instant com entrega real-time)
- `4_0_clientes.spec.js` — CRUD clientes

**Executar:** `npx playwright test --workers=1`

**Nota Sessões:** Testar que `multi_instant` não exibe campo de deadline, e que fotos são entregues sem prazo limit.

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

## FUNCIONALIDADES IMPLEMENTADAS (histórico recente)

### E-mails (src/utils/email.js + src/routes/auth.js)
- Boas-vindas ao fotógrafo: `sendWelcomeEmail(email, name, slug)`
- Notificação ao dono da plataforma no novo cadastro: `sendNewPhotographerNotificationEmail(name, email, slug)` → envia para `process.env.OWNER_EMAIL`
- SMTP: `smtp.hostinger.com` porta 465, credenciais em `.env`

### Integrações (admin/js/tabs/integracoes.js + src/routes/organization.js)
- Salva via `PUT /api/organization/integrations` (não `/profile`)
- Campos: `googleAnalytics` (enabled, measurementId), `metaPixel` (enabled, pixelId), `deadlineAutomation` (enabled, daysWarning, sendEmail)
- Meta Pixel lido de `Organization.integrations.metaPixel` (não SiteData)

### Marketing (admin/js/tabs/marketing.js + src/routes/siteData.js)
- `GET /api/marketing/overview` — dados 100% reais do MongoDB
- Retorna: KPIs 30d, funil (codeSent→accessed→submitted→delivered), statusCount, byEventType, byMode, crm (triggers/coupons), rates, ga
- Módulo do admin mostra delta % com cores, barras de funil proporcionais, bloco GA pronto para quando configurado

### Plano (admin/js/tabs/plano.js + src/routes/billing.js)
- Barras de uso reais (sessions, photos, armazenamento em MB calculado em disco)
- Barra muda cor: verde → amarelo (70%) → vermelho (90%)
- Backend retorna `stripeConfigured: true/false` → botões "Em Breve" quando Stripe não configurado
- Cancelamento com `showConfirm` (sem `confirm()` nativo)

### Template Padrão para Novos Fotógrafos
**Objetivo:** Todo novo fotógrafo recebe conteúdo de exemplo (mocap) no site ao se cadastrar.

**Arquivos:**
- `src/models/DefaultSiteTemplate.js` — modelo singleton MongoDB (`siteConfig`, `siteContent`, `siteStyle`, `siteSections`, `updatedBy`)
- `src/routes/site.js` — 3 novas rotas + função exportada `applyDefaultTemplate(orgId)`:
  - `GET /api/site/default-template` — lê template atual (autenticado)
  - `PUT /api/site/default-template` — salva template, requer header `X-Admin-Key: <PLATFORM_ADMIN_KEY>`
  - `POST /api/site/default-template/apply` — aplica template na org do usuário logado
- `src/routes/auth.js` — `applyDefaultTemplate(org._id)` chamado fire-and-forget após criar novo org no registro
- `admin/js/tabs/meu-site.js`:
  - Card "Restaurar conteúdo de exemplo" na aba Geral — qualquer fotógrafo pode usar
  - Aba **Padrão** visível somente para `role === 'superadmin'` (lido do JWT), com formulário completo e campo de chave

**Chave na VPS:** `PLATFORM_ADMIN_KEY=cz-admin-2025-542a04deba81b574` (em `/var/www/cz-saas/.env`)

**Fallback:** Se não houver template salvo no banco, usa `FALLBACK_TEMPLATE` hardcoded em `site.js` com textos genéricos de fotógrafo.

**Como usar (superadmin):**
1. Login com `admin@cliquezoom.com.br` no painel fotógrafo (app.cliquezoom.com.br/admin)
2. Meu Site → aba **Padrão**
3. Editar textos → campo "Chave de Administrador" → digitar `cz-admin-2025-542a04deba81b574` → Salvar

**Problema em aberto:** A rota `PUT /api/site/default-template` retorna 403 mesmo com a chave correta. Suspeita: o campo `PLATFORM_ADMIN_KEY` pode não estar sendo lido pelo processo PM2 (variável adicionada manualmente ao `.env` após o deploy). Verificar com `pm2 reload --update-env` e conferir se `process.env.PLATFORM_ADMIN_KEY` está definido no runtime.

### Segurança Anti-Bot (src/middleware/security.js + src/models/SecurityLog.js)
- **Nível 1 (Honey Pot):** Campo invisível `_hp_trap` adicionado aos formulários públicos (registro, contato, depoimentos).
- **Funcionamento:** Se preenchido (comportamento de bot), a requisição é bloqueada e logada.
- **Auditoria:** Nova aba **"Segurança"** no Painel SaaS (`/saas-admin`) permite visualizar IPs e User Agents detectados.
- **Auto-limpeza:** Logs de segurança expiram automaticamente após 30 dias (TTL index no MongoDB).

## BACKLOG ATIVO
- [ ] **Template Padrão — fix 403:** Confirmar que `PLATFORM_ADMIN_KEY` está no runtime do PM2. Testar: `curl -X PUT https://app.cliquezoom.com.br/api/site/default-template -H "X-Admin-Key: cz-admin-2025-542a04deba81b574" -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{}'`
- [ ] **Marca D'água Híbrida:** Perfil/`both` mode — texto + imagem robustos. Mesmas posições (tile, sequência, repetição).
- [ ] **Monetização Direta:** Payment gateway → libera download pós-upsell. (Ver [4_0_estrategia-vendas-crm.md](file:///Users/macbook/Documents/ProjetoEstudio/FsSaaS/skills/4_0_estrategia-vendas-crm.md))
- [ ] **CRM Automático:** Implementar `salesAutomator.js` e aba de métricas de vendas (inclui disparo de re-engajamento 11 meses pós-sessão).
- [ ] **Slideshow Viral:** Video gen (ffmpeg + Bull queue) para sessões.