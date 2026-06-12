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
- **models/** — Organization (central), User, Session, Album, Client, Subscription, SiteData, LandingData, Notification, SecurityLog, Tutorial, DefaultSiteTemplate, ManualModule, plans
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
- **Chave:** `PLATFORM_ADMIN_KEY` — definida apenas no `.env` da VPS (nunca commitar o valor). Rotacionada em 2026-06-08; valor antigo invalidado.

### Segurança Anti-Bot (src/middleware/security.js + src/models/SecurityLog.js)
- Honey pot: campo invisível `_hp_trap` nos formulários públicos — bloqueia e loga bots
- Aba "Segurança" no SaaS Admin exibe IPs detectados
- TTL index: logs expiram em 30 dias

### CRM — Automação de Vendas (src/utils/salesAutomator.js)
- Gatilhos de escassez: 15d (sem cupom), 7d, 3d, 1d (com cupom)
- Idempotência via `session.salesAutomation.sentTriggers`
- Roda a cada 6h no worker 0

### Sessões — Wizard Guiado (admin/js/tabs/sessoes/wizard/)
Refatorado em 2026-05-23 e consolidado em **5 passos** após a fusão dos antigos Código (2) + Enviar (3) num único passo **Compartilhar** (2). Cards da lista são clicáveis inteiros e abrem um modal fullscreen:

| # | Passo | Pré-requisito | Conclusão |
|---|-------|---------------|-----------|
| 1 | Upload | sessão criada | `uploadsCompletedAt`. Em **selection**, "Concluí upload" só libera com `photos.length >= packageLimit` (front + back) |
| 2 | Compartilhar | passo 1 | `codeSentAt` (ou ≥ 1 participante em multi). Ao abrir, marca `codeViewedAt` automaticamente |
| 4 | Acompanhar | passo 2 | `selectionSubmittedAt` — pulado em gallery |
| 5 | Editadas | passo 4 | todas as selecionadas têm `urlOriginal` — pulado em gallery |
| 6 | Entregar | passo 5 | `deliveredAt` (ou todos participantes em multi) |

> IDs 1, 2, 4, 5, 6 preservados (não existe mais passo 3).

**Adaptação por modo:** `gallery` → `[1, 2, 6]`; `selection` / `multi_selection` → `[1, 2, 4, 5, 6]`.

**Arquivos:**
- `wizard/index.js` — entry `openSessionWizard(id)`, modal fullscreen, header com 🔔/⚙️/🗑️/✕
- `wizard/stepper.js` — sidebar vertical, `computeWizardSteps`, `stepIdsForMode`, `nextStepIdAfter`
- `wizard/state.js` — `wizardState` global + `stopWizardPolling()` (limpa timer e listener `visibilitychange`)
- `wizard/utils.js` — `buildGalleryUrl`, `buildWhatsAppLink` (envio), `buildWhatsAppDeliveryLink` (entrega), `openOverlayModal`
- `wizard/notifications-bell.js` — sininho próprio do wizard (o global do topbar fica atrás do modal fullscreen)
- `wizard/steps/1-upload.js`, `2-share.js`, `4-tracking.js`, `5-edited.js`, `6-deliver.js`

**Compatibilidade com modais antigos:** ⚙️ Editar (editSessionModal), 🗑️ Deletar (showConfirm), 💬 Chat por foto (commentsModal), Gerenciar participantes (participantsModal) usam `openOverlayModal` — esconde o wizard (display:none), abre o modal antigo, polling detecta fechamento e restaura o wizard. Evita problema de stacking context.

**Novos campos no Session model:**
- `uploadsCompletedAt: Date` — fotógrafo marcou "concluí upload"
- `codeViewedAt: Date` — fotógrafo abriu o passo Compartilhar
- `showDeliveryQueuePosition: Boolean` (default false) — multi-seleção: cliente vê posição na fila

**Endpoints (src/routes/sessions.js):**
- `PUT /api/sessions/:id/complete-uploads` body `{completed: bool}`. Em `mode === 'selection'`, retorna 400 se `visiblePhotos < packageLimit`.
- `PUT /api/sessions/:id/view-code` (idempotente)
- `POST /api/sessions/:id/send-code` aceita `{channel: 'email'|'whatsapp'|'both'}` — WhatsApp não envia, retorna `{whatsappUrl}` pro front abrir
- `GET /api/sessions/:id/export?token=<JWT>` — exporta `.txt` para Lightroom (JWT em query porque `window.open` não envia headers)

**Polling adaptativo (passo Acompanhar — 4-tracking.js):**
- `30s` default → `10s` por 2 min após mudança → `8s` com modal de comentário aberto
- Pausa quando aba sem foco (Page Visibility API), refresh imediato ao voltar
- Botão "🔄 Atualizar" manual no header do passo

**WhatsApp templates (wizard/utils.js):**
- `WA_OPENINGS` (envio de código): "Olá X! As fotos do seu casamento já estão prontas para você visualizar e escolher…"
- `WA_DELIVERY_OPENINGS` (entrega): "Olá X! As fotos editadas do seu casamento estão prontas para download em alta resolução…"
- 11 tipos de evento cobertos: casamento, aniversario, formatura, corporativo, show, ensaio, gestante, newborn, debutante, batizado, outro

**Utilitário backend:** `buildWhatsAppGalleryLink(phone, name, code, orgName, slug, eventType)` em `src/utils/email.js`. A versão de entrega vive só no front (cliente abre `wa.me` direto).

**Modais de comentários (admin e cliente) com thumb da foto:** ambos exibem thumbnail + filename da foto referenciada — o fotógrafo e o cliente sabem imediatamente sobre qual foto a conversa é. `comments.js` busca a sessão por fallback (`wizardState.session` → `state.sessionsData` → `apiGet`).

**Cortesia:** foto sem `selectedPhotos` mas com `urlOriginal` é tratada como agrado do fotógrafo. Admin (passo 5): badge roxa `★ Cortesia`. Cliente (PWA `renderDeliveredScreen`): entra no grid principal com badge "Cortesia" e sai do upsell em `renderSubmittedScreen`.

**Lista de sessões (cards):** zero botões. Card inteiro tem `onclick → openSessionWizard`. **Código de acesso não aparece mais no card** — só dentro do wizard, passo Compartilhar. Toast pós-criação também não exibe código (só "Sessão criada!").

### CRM — Reativação de Clientes (src/utils/anniversaryAutomator.js)
- Data de próximo contato vive em `Client.nextContactDate` (não na Session)
- `run(organizationId, options)`: disparo manual ignora flag `salesAutomator.enabled`; cron respeita
- Envia `sendManualReactivationEmail` com até 3 fotos da última sessão entregue (capa + 2 fotos)
- Após envio: limpa `nextContactDate`, registra em `Client.contactHistory`
- Frontend: badge `📅 DD/MM/AAAA` na lista de clientes; date picker no modal de edição
- Botão "📧 Disparar Reativações" pergunta se inclui fotos (toggle por disparo, não por padrão)
- Datas salvas como `T12:00:00Z` (UTC noon) para evitar shift de fuso horário BRT (UTC-3)

---

## ESTADO ATUAL DO PROJETO (V1 — pré-lançamento)

### Concluído ✅
- Backend completo: 16 rotas, 126 endpoints, todos ativos
- Admin completo: 19 tabs funcionais (1 oculta para V2)
- Site público: 5 temas, builder visual, domínio customizado
- Email: SMTP Hostinger funcionando, fix do bug de credenciais do PM2
- Segurança: honey pot, rate limiting, logs anti-bot
- CRM: automação de vendas (escassez por prazo), reativação de clientes por `nextContactDate` com e-mail + fotos do último evento
- Limpeza estrutural: removidos 7 arquivos de código morto
- **Auditoria Dia 2** — todos os 126 endpoints auditados. Fix de bug deployado (commit `93631af`)
- **Dashboard auditado e refatorado** — fixes de qualidade + sessões recentes clicáveis
- **Manual do Usuário** — seção na tab Ajuda com sub-nav, accordion por módulo e mini-previews visuais. Dashboard e Sessões documentados. Ver `skills/00_manual-usuario.md`
- **Criador de Manual (SaaS Admin)** — Ferramenta completa para o Superadmin gerenciar o conteúdo do Manual. Painel em `saas-admin` com lista e editor visual de blocos (Intro, Callout, Passo a Passo), salvos no banco (`ManualModule`). O front do estúdio fotográfico (`ajuda.js`) consome o `/api/manual` e renderiza os blocos em HTML nativo, com fallback de segurança total para a versão estática atual caso o banco esteja vazio.
- **Manual — terminologia PT-BR** — palavra "Walkthrough" substituída por "Passo a passo" em todas as 7 seções do manual (`admin/js/tabs/ajuda.js`): Dashboard, Mensagens, Gestão, Meu Site, Domínio, Integrações e Marketing. Alteração apenas de texto visível — lógica e estrutura intactas.
- **Auditoria Sessões** — 7 fixes de tokens CSS aplicados (hexcodes, RGBA, prefixo `--ad-*`, tokens inexistentes). Ver `skills/02_sessoes.md`
- **Manual Sessões — formulário de criação** — Seção "Criando uma Nova Sessão — Modo Seleção" documentada com 9 blocos e mini-previews (modo, cliente, nome, datas, capa, resolução, pacote, extras/reabertura, CRM). Fix: validação de data de criação removida de `modal-form.js` — apenas prazo ≥ evento é obrigatório. Commit `0a72be8`
- **Dimensões reais pós-resize** — Após upload, cada foto exibe badge `1200×800px` no grid admin (lido do Sharp metadata). Modal de fotos exibe badge de resolução configurada com tooltip explicativo no cabeçalho. Schema `Session.photos` atualizado com `width`/`height`. Commits `ed49553`, `814b6f9`
- **Filtro de tipo de arquivo** — Input de capa (modal de edição) corrigido para `accept=".jpg,.jpeg,.png"`. Manual atualizado (remoção de "10 MB", adição de nota sobre badge de dimensões).
- **CRM — Reativação por cliente** — `nextContactDate` migrado para o model `Client`. `anniversaryAutomator` reescrito para consultar clientes (não sessões). Fix de timezone: datas salvas como `T12:00:00Z`. E-mail suporta grid de até 3 fotos do último evento (toggle por disparo). Commits `fe644e2`, `d4e0ee1`.
- **Manual Clientes** — Seção de Clientes no Manual do Usuário documentada: cadastro, reativação automática (Próximo Contato), badge 📅, disparo manual com toggle de fotos. Commit `b27d9e5`.
- **UX da lista de sessões** — (1) fix crítico: `photoResolution` nunca era enviado no payload de criação — sessões com 1600px ficavam salvas como 1200px; (2) badge de tipo de evento (roxo) nos cards + filtro `#filterEventType`; (3) nome do cliente clicável navega direto ao cadastro; (4) timeline de progresso visual em cada card (5 passos: Criada→Fotos→Link→Seleção→Entregue) com chip de próximo passo colorido. Commits `e76e931`, `5df4e0d`
- **Pedido de reabertura no card** — campo `session.reopenRequested` registra o pedido no documento. Card exibe badge ⚠ laranja, passo "Reabertura" (laranja) no stepper, botões "✓ Reabrir" / "✗ Recusar pedido", botão Entregar bloqueado até decisão. Novo endpoint `PUT /sessions/:id/dismiss-reopen`. Commit `55b8321`
- **Testes manuais Sessões (modo seleção)** — ciclo completo testado em 2026-05-20: criação, edição, upload, resolução, pacote, preço extra, comentários, tipo de evento, fluxo do cliente (seleção, finalização, reabertura). Automação de escassez pendente de teste (leva dias para disparar).
- **Sessões — Wizard Guiado (Ondas 1+2+3 em 2026-05-23)** — Refatoração UX completa. Cards sem botões, clique abre wizard fullscreen com 6 passos guiados. Adaptação por modo (gallery=4 passos, multi=5 sem código geral). Backend: 2 campos novos (`uploadsCompletedAt`, `codeViewedAt`), 1 toggle multi (`showDeliveryQueuePosition`), 2 endpoints (`/complete-uploads`, `/view-code`), `send-code` aceita `channel`. WhatsApp via `wa.me` com templates por tipo de evento. Modais antigos preservados — wizard usa `openOverlayModal` (hide+show) pra evitar stacking context. Ver `skills/02_sessoes.md`.
- **Sessões — Polimento e consolidação (2026-05-23)** — Bloco de melhorias dividido em 4 ondas, foco em **modo seleção** (gallery e multi ficaram para validação posterior):
  - **Pré-ondas:** removido código do card e do toast pós-criação (só aparece no passo Compartilhar); regra do mínimo no upload em `selection` (front + back validam `photos.length >= packageLimit`); **fusão dos passos 2 (Código) + 3 (Enviar) num único passo "Compartilhar"** — wizard agora tem 5 passos (IDs 1,2,4,5,6 preservados).
  - **Onda 1 — Bugs:** (1) "Enviar Seleção"/"Salvo" no PWA persistia após submit (`isSelectionMode` não considerava `submitted`, bottomBar vive fora da gallerySection); (2) Download `.txt` Lightroom não disparava (faltava `?token=` na query — `window.open` não envia headers); (3) Foto cortesia (não selecionada + `urlOriginal`) sumia após upload — agora aparece com badge `★ Cortesia` no admin (passo 5) e cliente (`renderDeliveredScreen`), saindo do upsell em `renderSubmittedScreen`.
  - **Onda 2 — Polling adaptativo:** passo Acompanhar com `setTimeout` recursivo: 30s default → 10s por 2 min após mudança → 8s com modal de comentário aberto. Pausa via Page Visibility API quando aba sem foco, refresh imediato ao voltar. Botão "🔄 Atualizar" manual. `stopWizardPolling()` limpa timer + listener em `switchStep` e `closeWizard`.
  - **Sub-bugs entre Onda 2 e 3:** (a) clique no 💬 não abria modal — `comments.js` agora resolve sessão por fallback `wizardState.session → state.sessionsData → apiGet`; (b) sininho dentro do wizard (novo `wizard/notifications-bell.js`) — antes o sininho global do topbar ficava atrás do modal fullscreen.
  - **Onda 3 — Modal de comentário "sabe" a foto:** admin e cliente exibem thumb 64-84px + filename + meta (✓ Selecionada / Não selecionada). Cliente vê a thumb ao clicar no sininho.
  - **Onda 4 — WhatsApp na entrega:** `buildWhatsAppDeliveryLink` no `wizard/utils.js` com `WA_DELIVERY_OPENINGS` (11 templates por `eventType`, tom de "fotos editadas prontas pra download"). Card "Compartilhar entrega" no passo 6 com botões 💬 WhatsApp + 🔗 Copiar link, visível antes e depois da entrega. Em multi: cada participante na tabela ganha 💬 WhatsApp + 🔗 Link individual com seu `accessCode`.

### Em andamento — Auditoria de 7 dias 🔄
**Dia 1 ✅ — Limpeza estrutural** (concluído)
**Dia 2 ✅ — Auditoria backend** (concluído — ver achados abaixo)
**Dia 3 🔄 — Auditoria frontend** (em andamento — Dashboard ✅, Sessões ✅ wizard + Ondas 1-4, próximo: Clientes/Mensagens)
**Dia 4** — Auditoria site builder: hero, sobre, portfólio, estúdio, FAQ
**Dia 5** — Funcionalidades avançadas: CRM, marketing, integrações, plano
**Dia 6** — Domínio, segurança, testes Playwright E2E
**Dia 7** — Correções, polimento, deploy final

### Foco imediato (Onda 5 — próxima sessão)
**Retenção de storage** — feature grande, planejada com o usuário em 2026-05-23:
- Campo "Guardar fotos no storage até DD/MM/AAAA" na criação/edição da sessão (default vazio = sem expiração).
- Notificação no sininho ao chegar a data — **nunca deletar automaticamente sem ação do fotógrafo**.
- Checkbox "Deletar automaticamente nesta data" (opt-in).
- Checkbox "Exportar metadados + baixar imagens para backup" (gera ZIP).
- Modo backup: manter só a capa local + campo `externalStorageUrl` (Drive/Dropbox) — sessão continua no painel, imagens vivem fora.
- Drive externo como storage dinâmico (substituir uploads/): **usuário ainda em decisão** (provável V2 — OAuth, quotas, custo de banda).

Ver `skills/8_0_handoff-2026-05-23.md` para o plano executado e os caminhos pendentes.

### Achados do Dia 2 — Notas para manutenção futura
- **Route names não óbvios:** `GET /api/organization/profile` (não `/api/organization`), `GET /api/billing/subscription` (não `/api/billing/plan`), login em `POST /api/login` (não `/api/auth/login`)
- **resolveTenant em produção:** Lê tenant SOMENTE por subdomínio ou campo `customDomain`. O header `x-tenant` é ignorado pelo middleware. O parâmetro `_tenant` só funciona em localhost/preview. Rotas de cliente precisam de subdomínio válido em produção (ex: `audit-cz-2025.cliquezoom.com.br`)
- **DELETE idempotente:** `DELETE /api/sessions/:id` retorna `{success:true}` mesmo se a sessão não existe — comportamento intencional
- **Inconsistência de campo:** `POST /site/contact` usa campos PT-BR (`nome`, `mensagem`); `POST /site/depoimento` usa campos EN (`name`, `text`) — menor, mas deve ser uniformizado no futuro
- **Limite de upload:** Express JSON capped em 5MB. Multer (multipart) permite até 10MB por arquivo — são middlewares diferentes

### Pendências antes do lançamento ⚠️
- [ ] **Validar Onda 4 em produção/local** — usuário ainda não confirmou o teste do WhatsApp na entrega (passo 6) — ver `skills/8_0_handoff-2026-05-23.md` para o checklist.
- [ ] **Validar Onda 1–4 em modo `gallery`** — todas as ondas foram focadas em `selection`. Confirmar fluxo da galeria após a fusão (Upload → Compartilhar → Entregar, 3 passos).
- [ ] **Regra do mínimo de upload em multi-seleção** — modelar como tratar o `packageLimit` por participante. Hoje a validação só vale para `selection`.
- [ ] **Template Padrão — fix 403:** Confirmar `PLATFORM_ADMIN_KEY` no runtime do PM2. Testar: `curl -X PUT https://app.cliquezoom.com.br/api/site/default-template -H "X-Admin-Key: <chave do .env da VPS>" -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{}'`
- [x] **Mongoose deprecation:** `findOneAndUpdate` com `new: true` — trocar para `returnDocument: 'after'` (warnings nos logs, não é erro crítico)
- [ ] **Inconsistência de campos:** Uniformizar `nome`/`mensagem` (contato) vs `name`/`text` (depoimento) — não crítico
- [ ] Completar auditoria dos dias 3–7
- [ ] **Notificações globais clicáveis:** o sininho do wizard já roteia corretamente (`comment_added` abre o modal certo); o global do topbar ainda precisa do mesmo polish. `admin/js/utils/notifications.js`
- [ ] **Sininho do cliente sem dropdown:** se há múltiplas respostas de fotos diferentes, ele só abre a primeira. Tratar caso surja demanda.
- [ ] **Arquivamento de fotos com link externo:** parte da Onda 5 (retenção de storage). Campo `externalStorageUrl` + `archivedAt` no model Session.
- [x] **Ícone robô:** substituir 🤖 na seção Automação do `modal-form.js` por ícone Lucide.
- [x] **Manual do Usuário desatualizado para Sessões** — `MANUAL_MODULES[1]` em `admin/js/tabs/ajuda.js` ainda descreve fluxo antigo de botões (precisa refletir wizard de 5 passos).
- [ ] **Testes Playwright** (`tests/3_0_sessoes.spec.js`) — clicam nos botões antigos, precisam ser reescritos para o wizard.
- [x] **modal-detail.js standalone** — pode ser removido, o wizard já tem o grid embutido nos passos 1/4/5.
- [ ] **Cortesia como diferencial de marketing** — incluir como bullet em "Por que CliqueZoom" quando auditar a landing (Dia 4).

### Escassês & Vendas (modelo corrigido em 2026-06-04)
**Conceito (modo seleção):** o cliente já **pagou** o pacote, então a fase de seleção **não vende nem dá desconto** — só **lembra** ele de escolher. A venda com desconto só acontece **pós-entrega**, e **só sobre a sobra** (`fotos subidas − compradas`); se sobra = 0, nada é oferecido.
- **Lembrete de seleção (pré-entrega):** `deadlineChecker` envia 1 aviso `daysWarning` dias antes do prazo (sem desconto). Mensagem editável via `integrations.deadlineAutomation.messageTemplate` (vars `{nome} {negocio} {evento} {dias} {link}`). Configurado em **Configurações › Escassês & Vendas**.
- **Escassês de vendas (pós-entrega):** `postDeliveryAutomator` — dispara em `postDelivery.daysSchedule` (15/7/1) dias antes de `storageRetentionUntil`, só se `restantes > 0`. Desconto por etapa + mensagem editável (`postDelivery.messageTemplate`). Cupom = só código (sem pagamento na plataforma — ver memória `project_sem_pagamentos`).
- **Removido:** o `salesAutomator` (escassez pré-entrega COM cupom) era conceitualmente errado (dava desconto antes da entrega) — apagado, junto dos `sendScarcity*` e do bloco `salesAutomator.scarcity`.
- [ ] **UI dos dias do pós-entrega:** `postDelivery.daysSchedule` é configurável no backend, mas a UI em `configuracoes.js` só edita o **desconto** de cada dia (15/7/1), não os dias em si.

### V2 — Funcionalidades ocultas aguardando desenvolvimento
- **Prova de Álbuns:** fluxo completo de proofing (páginas, layouts, revisões, aprovação)
- **Multi-Imediata + Face Search:** reconhecimento facial para entregar fotos por participante em eventos em tempo real
- **Marca D'água Híbrida:** modo `both` (texto + imagem), posições tile/sequência/repetição
- **Monetização Direta:** payment gateway para liberar download pós-upsell
- **Slideshow Viral:** geração de vídeo com ffmpeg + Bull queue
- **Limites de e-mail por plano:** definir se SMTP é da plataforma ou do fotógrafo; avaliar quotas por plano

---

## INTEGRAÇÃO COM O RHYNO SYSTEM (ERP/CRM) — 2026-06 (POC local, NADA deployado)

O ERP **Rhyno System** (pasta `/Users/macbook/Documents/ERP1`, repo `pach3c0/ERP1`, prod `erp.cliquezoom.com.br`, FastAPI+Postgres+React) está sendo integrado como **CRM/financeiro principal**, via **iframe + SSO**. Tudo local, não commitado.
- Aba **Gestão** (`admin/js/tabs/gestao.js`) — iframe do Rhyno em modo embed, com login único (SSO).
- `src/routes/gestao.js` — `GET /api/gestao/sso-url` (gera URL de SSO), `GET/POST /api/gestao/customers` (busca/cria customer no Rhyno, server-to-server via asserção assinada com `SSO_SHARED_SECRET`).
- `Session.rhynoCustomerId` + snapshot `clientName`/`clientPhone` — a sessão referencia cliente do **Rhyno**; o seletor de cliente da sessão (`modal-form.js`) busca no Rhyno; o "+ Novo cliente" grava no Rhyno (`client-modal.js` com `options.target='rhyno'`).
- Aba **Clientes** oculta no menu (transição, reversível); `Client.rhynoCustomerId` mapeia a migração; `src/utils/migrateClientsToRhyno.js` migra Mongo→Rhyno (dry-run/--apply).
- Config no `.env`: `SSO_SHARED_SECRET` (= ao do Rhyno), `RHYNO_BASE_URL`, `RHYNO_API_URL`, `RHYNO_POC_EMAIL`.
- ⏸️ **PAUSADO** (sem créditos + ajustes locais pendentes). **Handoff completo: `skills/9_0_handoff-rhyno-integracao.md`.** Memória: `project_rhyno_integration`, `reference_rhyno_local_poc`.
