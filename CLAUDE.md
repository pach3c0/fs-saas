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

### Privacidade e Acesso de Suporte (SaaS Admin)
- Superadmin **NÃO PODE** acessar contas de fotógrafos ("Entrar como") sem autorização explícita, devido à sensibilidade dos dados (fotos de clientes).
- O fotógrafo deve ativar a flag em **Configurações › Privacidade** (`supportAccess.enabled = true`).
- Acesso negado retorna **403** (`consent_required`) no `POST /api/admin/organizations/:id/impersonate` e envia notificação `support_request` ao fotógrafo.
- O `apiRequest` do SaaS Admin (`saas-admin/js/core.js`) deve propagar o erro 403 com `code` (não tratar como sessão expirada).
- Acessos autorizados geram logs na auditoria e uma notificação de transparência (`support_access`) para o fotógrafo.

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

Ver `skills/8_0_handoff-sessoes-ondas.md` para o plano executado e os caminhos pendentes.

### Achados do Dia 2 — Notas para manutenção futura
- **Route names não óbvios:** `GET /api/organization/profile` (não `/api/organization`), `GET /api/billing/subscription` (não `/api/billing/plan`), login em `POST /api/login` (não `/api/auth/login`)
- **resolveTenant em produção:** Lê tenant SOMENTE por subdomínio ou campo `customDomain`. O header `x-tenant` é ignorado pelo middleware. O parâmetro `_tenant` só funciona em localhost/preview. Rotas de cliente precisam de subdomínio válido em produção (ex: `audit-cz-2025.cliquezoom.com.br`).
- **Resolução de Domínios Customizados na Raiz (`/`):** 
  - *Problema:* Originalmente, requisições à raiz de domínios customizados (ex: `https://www.fsfotografias.com.br/`) serviam a landing page da plataforma CliqueZoom (`/home/index.html`), pois o redirecionamento para `/site` em `app.get('/')` só cobria subdomínios de `cliquezoom.com.br`.
  - *Correção:* A rota raiz `/` em `src/server.js` foi corrigida para detectar se a requisição é originada de um domínio customizado registrado no MongoDB (`Organization.findOne({ customDomain: host, isActive: true })`) e, em caso positivo, redirecionar com HTTP 301 para `/site`.
  - *Nginx:* Configurações de backup `.bak` não devem ficar dentro de `/etc/nginx/sites-enabled/`, pois o Nginx lê todos os arquivos desse diretório e gera conflitos de portas/server names. Sempre mova os backups para `/etc/nginx/sites-available/`.
- **DELETE idempotente:** `DELETE /api/sessions/:id` retorna `{success:true}` mesmo se a sessão não existe — comportamento intencional
- **Inconsistência de campo:** `POST /site/contact` usa campos PT-BR (`nome`, `mensagem`); `POST /site/depoimento` usa campos EN (`name`, `text`) — menor, mas deve ser uniformizado no futuro
- **Limite de upload:** Express JSON capped em 5MB. Multer (multipart) permite até 10MB por arquivo — são middlewares diferentes

### Pendências antes do lançamento ⚠️
- [ ] **Validar Onda 4 em produção/local** — usuário ainda não confirmou o teste do WhatsApp na entrega (passo 6) — ver `skills/8_0_handoff-sessoes-ondas.md` para o checklist.
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

### Serviços Extras (Ajuda) + Criador de Implantação Guiada
**Atual (implementado):** aba **Serviços Extras** em `admin/js/tabs/ajuda.js` (`ajudaView === 'servicos'`), no padrão Bling. Catálogo **orientado a dados** (`SERVICOS_EXTRAS`) com duas telas: grid de cards (`renderServicosGridHTML`) e tela de detalhe rica (`renderServicoDetalheHTML` — hero verde + descrição + 3 benefícios). CTA = **lead via WhatsApp** (humano fecha), link montado em `buildServicoWaLink` a partir da constante `SUPPORT_WHATSAPP` (número da plataforma; vazio → cai no Fala Conosco). Hoje há **1 serviço hardcodado** no array: *Implantação Guiada* (R$ 300, pagamento único). Identidade aprovada pelo usuário (pill verde, botão verde, ícones Lucide) — preservar.

**PRÓXIMO PASSO (planejado — NÃO implementar até o usuário pedir):** **Criador de Implantação Guiada no SaaS Admin**, espelhando o **Criador de Manual** (model `ManualModule` + editor visual no `saas-admin`). Objetivo: o superadmin cria **vários** serviços de implantação manualmente — ex.: *só Sessões*, *só Meu Site*, *só CRM*, *Completa* — cada um com **valor**, **WhatsApp próprio** e **texto/descrição/benefícios** configuráveis. O front do fotógrafo (`ajuda.js`) deixa de ter o array hardcodado e passa a **consumir uma API** (ex.: `GET /api/servicos-extras`), renderizando o mesmo grid + tela de detalhe atuais (mantendo a identidade visual). Fallback total para o estático se o banco estiver vazio (mesmo padrão do Manual). Sugestão de model: `ServicoExtra { titulo, resumo, preco, precoNota, icon, descricao, beneficios[], whatsapp, ativo, ordem }`.

### Venda de Domínios — Concierge (Fase 1, implementado)
Painel **"Registrar um domínio"** no topo da aba **Domínio** (`admin/js/tabs/dominio.js`), acima da seção "Domínio Personalizado" (conectar domínio existente, que segue intacta).
- **Busca de disponibilidade roda dentro do app**, gratuita, via **RDAP** (substituto moderno do WHOIS, HTTP/JSON, sem conta de reseller) — `src/utils/domainAvailability.js`. `.br` → `rdap.registro.br`; demais TLDs → `rdap.org` (bootstrap IANA). Mapeia **200 = registrado/indisponível**, **404 = disponível**, resto/timeout = **não verificado**. Usa `fetch` nativo + `AbortController` (~4s), `Promise.allSettled`. TLDs default: `.com.br`, `.com`, `.fot.br`, `.photography` (com estimativa de preço display-only).
- **Endpoint:** `GET /api/domains/check?name=<base>` (`authenticateToken`, **sem gating de plano** — busca aberta a todos como funil de venda). Normaliza o nome (lowercase, só o SLD se vier domínio completo, regex `[a-z0-9-]`); inválido → 400. Responde `{ success, results: [{domain, tld, status, priceEstimate}] }`.
- **Fechamento manual (Concierge):** botão **"Quero este domínio"** nos disponíveis cria um chamado no **Fala Conosco** (`POST /api/tickets`, `subject: "Registrar domínio: <dominio>"`, `category: 'duvida'`) e redireciona pra aba Ajuda. **Não usa WhatsApp** (número da equipe ainda vazio).
- **Ressalva honesta:** RDAP diz "registrado ou não", não garante a compra naquele preço (premium/pendentes). A UI mostra "disponibilidade aproximada — confirmamos no atendimento" + nota de que apontar ao site requer plano **Pro**. Identidade visual verde reaproveitada dos Serviços Extras (pill/botão `var(--green)`, ícones Lucide).
- **Fase 2 (fora de escopo — NÃO implementar até o usuário pedir):** integração reseller (ResellerClub), registro + DNS automáticos, cobrança recorrente Mercado Pago, coleta de CPF/CNPJ.

### V2 — Funcionalidades ocultas aguardando desenvolvimento
- **Prova de Álbuns:** fluxo completo de proofing (páginas, layouts, revisões, aprovação)
- **Multi-Imediata + Face Search:** reconhecimento facial para entregar fotos por participante em eventos em tempo real
- **Marca D'água Híbrida:** modo `both` (texto + imagem), posições tile/sequência/repetição
- **Monetização Direta:** payment gateway para liberar download pós-upsell
- **Slideshow Viral:** geração de vídeo com ffmpeg + Bull queue
- **Limites de e-mail por plano:** definir se SMTP é da plataforma ou do fotógrafo; avaliar quotas por plano

---

## INTEGRAÇÃO COM O RHYNO SYSTEM (ERP/CRM) — ✅ LIVE EM PRODUÇÃO (deploy 2026-06-15)

O ERP **Rhyno System** (pasta `/Users/macbook/Documents/ERP1`, repo `pach3c0/ERP1`, FastAPI+Postgres+React) é o **CRM/financeiro principal**, integrado ao CliqueZoom via **iframe + SSO**. **Roda no MESMO servidor** (VPS Contabo `5.189.174.18`), vizinho do CliqueZoom: PM2 `erp-backend` (uvicorn `:8000`) + `erp-frontend` (vite preview `:4173`), público e HTTPS em **`https://erp.cliquezoom.com.br`** (nginx + Certbot). Pasta de prod do ERP: **`/var/www/rhyno-erp`**. A integração está **no ar e funcional** (SSO login único + seletor de cliente da sessão buscando no Rhyno + aba Gestão em iframe embed com identidade CliqueZoom).
- Aba **Gestão** (`admin/js/tabs/gestao.js`) — iframe do Rhyno em modo embed, com login único (SSO).
- `src/routes/gestao.js` — `GET /api/gestao/sso-url` (gera URL de SSO), `GET/POST /api/gestao/customers` (busca/cria customer no Rhyno, server-to-server via asserção assinada com `SSO_SHARED_SECRET`).
- `Session.rhynoCustomerId` + snapshot `clientName`/`clientPhone` — a sessão referencia cliente do **Rhyno**; o seletor de cliente da sessão (`modal-form.js`) busca no Rhyno; o "+ Novo cliente" grava no Rhyno (`client-modal.js` com `options.target='rhyno'`).
- Aba **Clientes** oculta no menu (transição, reversível); `Client.rhynoCustomerId` mapeia a migração; `src/utils/migrateClientsToRhyno.js` migra Mongo→Rhyno (dry-run/--apply).
- Config no `.env`: `SSO_SHARED_SECRET` (= ao do Rhyno), `RHYNO_BASE_URL`, `RHYNO_API_URL`, `RHYNO_POC_EMAIL`.
### ⚠️ PONTOS DE ATENÇÃO (estado em 2026-06-15 — LER ANTES DE MEXER)
- **Commits sincronizados (local = origin = produção):** CliqueZoom (`pach3c0/fs-saas`) em **`8d872b0`**; ERP1 (`pach3c0/ERP1`) em **`3b7ff3f`**.
- **🚨 O working tree LOCAL do ERP1 tem trabalho NÃO commitado e NÃO deployado** (de propósito): `models.py`, `schemas.py`, `crm.py`, `crm_service.py`, `service_order_service.py`, `CRMCentral.tsx`, `Dashboard.tsx`, `ServiceOrderForm.tsx` + a migração Alembic `add_catalog_fk_to_serviceorderitem.py` (mudanças de **catálogo/CRM inacabadas**). **NUNCA dar `git add -A` / commitar o working tree inteiro do ERP1 às cegas** — só o que for intencional. Deployar a parte de catálogo exige **rodar a migração Alembic no Postgres de prod** e **re-selecionar itens em OS antigas** (quebra edição de OS legadas). Foi deliberadamente deixado de fora.
- **SSO (montado e funcional):** `SSO_SHARED_SECRET` IGUAL nos dois `.env` (`/var/www/cz-saas/.env` e `/var/www/rhyno-erp/backend/.env`) — **gitignored, fora do git, sobrevive a `git pull`**. Mapeamento: a org da Flávia ("Fs Fotografias") tem `Organization.rhynoUserEmail=flavia.cristthina@gmail.com` → **tenant 2** do Rhyno; fallback `RHYNO_POC_EMAIL=pacheco@rhynosystem.com.br`. O front `gestao.js` aponta `RHYNO_BASE='https://erp.cliquezoom.com.br'` (era localhost no POC).
- **Clientes:** os clientes reais da Flávia **já estão no tenant 2 do Rhyno** (compartilhado com o pacheco). **NÃO foi feita migração** Mongo→Rhyno (criaria duplicatas). Os `Client` do Mongo ficam de **legado** (sessões antigas usam o snapshot `clientName`/`clientPhone`). `migrateClientsToRhyno.js` existe mas **não rodar** sem necessidade.
- **Deploy do ERP (≠ CliqueZoom):** o frontend é servido de um `dist/` buildado → **precisa `cd /var/www/rhyno-erp/frontend && npm run build` no servidor** após mudar o front (o `npm run start`/vite preview NÃO builda). `dist/` e `.env` são **gitignored** (reset/pull não os tocam). O git de prod do ERP está **limpo** (alinhado ao origin). Código SSO já commitado: `backend/routers/auth.py` (`POST /auth/sso-login`), `frontend/src/components/SSOLogin.tsx`, `utils/embedMode.ts`.
- **Identidade do embed (white-label + tema CliqueZoom):** feita **centralizada**, sem tocar nos componentes do ERP — em `frontend/src/utils/embedMode.ts` (classe `cz-embed` no `<html>`, observer que remove "Rhyno-System" do texto, e **recolor** dos azuis inline/SVG do ERP `#0055A4`/`#3b82f6` → `#1a1a1a`) + `frontend/src/embed-theme.css` (overrides por classe). **Para ajustar a cara do iframe, mexer NESSES dois arquivos** (não nos componentes). Cores de status (verde/vermelho/etc.) são preservadas de propósito.
- **🚨 SSH na VPS:** muitas conexões rápidas em sequência causam **throttling** (erro `255` no handshake) — vá devagar, poucas conexões. O **build do frontend do ERP leva ~1m30s** — usar timeout alto e **NÃO rodar em background nem interromper** (gera builds órfãos que travam o servidor).
- **Backups deixados na prod:** ERP `auth.py.bak.*`, `backend/.env.bak.*`, `frontend/dist_backup_*`; CliqueZoom `.env.bak.rhyno.*`. Rollback rápido se preciso.
- **Handoff completo: `skills/9_0_handoff-rhyno-integracao.md`.** Memórias: `project_rhyno_integration`, `reference_rhyno_local_poc`.

> ⚠️ **REGRA — Subir o ambiente LOCAL completo (CliqueZoom + Rhyno) para dev.** NÃO é produção (CliqueZoom prod = PM2 `cliquezoom-saas` em `/var/www/cz-saas`; Rhyno prod = PM2 em `/var/www/rhyno-erp`). O `.env` local é gitignored → rodar isto **não toca** em nada da produção. A aba **Gestão** (iframe do Rhyno) só funciona em dev se os DOIS estiverem no ar.
>
> **🚨 STACK CERTO × STACK ERRADO (a confusão clássica — leia antes de subir):** o stack da integração é **`rhyno-pg`** (Postgres) **+ `rhyno-api`** (uvicorn :8000) + frontend do Rhyno via `npm run dev` no host (Vite :5173). **NÃO confundir com o docker-compose `erp_backend` / `erp_frontend` / `erp_db`** (imagens `erp1-*`) — esse é um build SEPARADO do ERP1, **não tem o SSO/tenant da integração** e ainda **rouba as portas 8000/5173**. Se ele subir, o iframe da Gestão fica em branco / SSO falha. (Há também um `rhynoia-*` antigo parado — lixo, ignore.)
>
> **Sequência completa (copia e cola — sobe tudo do zero, após reboot/`docker restart`):**
> ```bash
> # 1) garantir que o compose ERRADO está parado (evita conflito de porta 8000/5173)
> docker stop erp_backend erp_frontend erp_db 2>/dev/null
>
> # 2) Rhyno backend — stack CORRETO (rhyno-pg + rhyno-api)
> docker start rhyno-pg rhyno-api
> docker exec -d rhyno-api sh -c "cd /app && uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/uvicorn.log 2>&1"
>
> # 3) Rhyno frontend — NO HOST (não em container)
> cd /Users/macbook/Documents/ERP1/frontend && npm run dev    # Vite :5173
>
> # 4) CliqueZoom — na raiz do FsSaaS (npm install só na 1ª vez; build:css se mudou Tailwind)
> cd /Users/macbook/Documents/ProjetoEstudio/FsSaaS && npm run dev   # porta 3051
> ```
> **Verificar:** `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/docs` deve dar **200**. Logs do Rhyno: `docker exec rhyno-api tail -n 30 /tmp/uvicorn.log`.
> **URLs:** CliqueZoom `http://localhost:3051` (login de teste `teste@teste.com.br`, DB local `cliquezoom-dev`) · Rhyno API `http://localhost:8000/docs` · Rhyno front `http://localhost:5173`.
> **Gotchas:** o `rhyno-api` roda `Cmd: ["sleep","infinity"]` → **o uvicorn NÃO sobe sozinho** (container sai com status 255 / "Connection reset"), precisa do `docker exec -d` do passo 2. O Vite escuta só em `[::1]:5173` (IPv6) → use `localhost`, **não** `127.0.0.1`. O `SSO_SHARED_SECRET` precisa ser IGUAL nos dois `.env` (`FsSaaS/.env` e `ERP1/backend/.env`). Rodar o CliqueZoom **sempre** da raiz do FsSaaS (cwd errado dá `MODULE_NOT_FOUND`). Detalhes: `reference_rhyno_local_poc`, `reference_local_e2e_setup`.
