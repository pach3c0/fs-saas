# CliqueZoom — Guia para Assistente

## ORGANIZAÇÃO DO PROJETO
- **Pastas:** PWA (`cliente/`), Admin Vanilla JS (`admin/`), Site Público (`site/templates/`), Backend Express+MongoDB (`src/`).
- **Clientes:** `fsfotografias` está em PRODUÇÃO REAL — máxima cautela. Código deve ser genérico (`cliquezoom` não `fsfotografias`).

## DEPLOY (VPS Contabo)
- **Localização:** `/var/www/cz-saas`, PM2 app: `cliquezoom-saas`, porta 3051.
- **Comando deploy:** `git pull && npm install && pm2 reload cliquezoom-saas`
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
- **models/** — Mongoose schemas: Organization (central), User, Session, Album, Client, Subscription, LandingData
- **middleware/** — Auth (JWT, tenant validation), logging, error handling
- **services/** — storage.js (file ops), utils genéricos
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

## BACKLOG ATIVO
- [ ] **Marca D'água Híbrida:** Perfil/`both` mode — texto + imagem robustos. Mesmas posições (tile, sequência, repetição).
- [ ] **Monetização Direta:** Payment gateway → libera download pós-upsell. (Ver [4_0_estrategia-vendas-crm.md](file:///Users/macbook/Documents/ProjetoEstudio/FsSaaS/skills/4_0_estrategia-vendas-crm.md))
- [ ] **CRM Automático:** Implementar `salesAutomator.js` e aba de métricas de vendas.
- [ ] **Slideshow Viral:** Video gen (ffmpeg + Bull queue) para sessões.