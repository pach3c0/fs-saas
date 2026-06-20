# CliqueZoom — Guia para Assistente

> **Leia este arquivo ANTES de qualquer tarefa.** Para detalhes de cada módulo, consulte `skills/`.

## ORGANIZAÇÃO DO PROJETO
- **Pastas:** PWA (`cliente/`), Admin Vanilla JS (`admin/`), Site Público (`site/templates/`), Backend Express+MongoDB (`src/`).
- **Produção real:** A fotógrafa **Flávia Cristina Pacheco** (`flavia.cristthina@gmail.com`) está ativa. Máxima cautela em alterações que afetam dados existentes ou fluxos ativos.
- **Código genérico:** Nunca hardcodar nomes de orgs. Usar variáveis de ambiente (`OWNER_SLUG`, `BASE_DOMAIN`).
- **Superadmin:** `admin@cliquezoom.com.br` (`role: superadmin`) — acesso ao painel `/saas-admin` e à aba "Padrão" do Meu Site.
- 🚫 **Nunca commitar, dar push ou deployar sem pedido explícito do usuário.**

---

## DEPLOY (VPS Contabo)
- **Servidor:** `root@vmi3069803` (IP: `5.189.174.18`) — app PM2 `cliquezoom-saas`, porta `3051`, pasta `/var/www/cz-saas`.
- **Comando:**
  ```bash
  cd /var/www/cz-saas && git pull && pm2 reload ecosystem.config.js --env production --update-env
  ```
- **Logs:** `pm2 logs cliquezoom-saas --lines 20`
- **CSS Tailwind:** execute `npm run build:css` ANTES de commitar se mudou classes.
- **Proibido:** Não altere Nginx/porta; não mexa em `crm-backend` ou `vps-hub` sem autorização.

---

## CÓDIGO BACKEND (`src/`)
- **Módulos:** CommonJS (`require`). Imports sempre no topo do arquivo.
- **I/O:** Apenas `fs.promises` (async). Nunca versões `Sync`.
- **Storage:** sempre via `src/services/storage.js`; uploads em `/uploads/`. Sem S3/Cloudinary.
- **Banco:** MongoDB. Queries de leitura com `.lean()`. Banco dev local: `cliquezoom-dev`; prod: `cliquezoom`. Nunca `fsfotografias`.
- **Logs:** `req.logger.info()` / `req.logger.error()`. Nunca `console.log`.
- **Multi-tenant:** sempre filtre por `organizationId`. Campos centralizados no model `Organization`.

## CÓDIGO ADMIN (`admin/`)
- **Módulos:** ES Modules (`import/export`).
- **Estilos:** SEMPRE inline com variáveis CSS. Nunca Tailwind nas tabs (invisível no dark mode). Nunca hexcodes hardcoded.
- **Tokens Light:** `--ad-bg-base:#e8e8eb` · `--ad-bg-surface:#f1f1f3` · `--ad-text:#1a1a1a` · `--ad-accent:#1a1a1a`
- **Tokens Dark:** `--ad-bg-base:#2a2a2c` · `--ad-bg-surface:#323234` · `--ad-text:#f2f2f2` · `--ad-accent:#f2f2f2`
- **Status:** `--ad-green:#3fb950` · `--ad-red:#f85149` · `--ad-yellow:#d29922` · `--ad-orange:#ffa657`
- **Aliases curtos** (`--bg-base`, `--bg-surface`, `--text`, `--accent`) são válidos — mapeados no `index.html`.
- **Dialogs:** `window.showToast(msg, type)` e `window.showConfirm(msg, opts)`. Proibido `alert/confirm`.
- **Tema:** `[data-theme]` no `<html>` (light default / dark). Toggle salva em `localStorage`.

---

## ARQUITETURA

### Backend (`src/`)
**Express + MongoDB + CommonJS**
- `server.js` — entrypoint, CORS, logging, rate-limit, auth/tenant middleware
- **routes/** (16 arquivos): `auth`, `sessions`, `clients`, `albums`, `organization`, `billing`, `domains`, `site`, `siteData`, `notifications`, `upload`, `sales`, `payments`, `landing`, `saasAdmin`, `tutorials`
- **middleware/**: `auth.js` (JWT), `tenant.js` (multi-tenant), `security.js` (honey pot), `planLimits.js`
- **models/**: `Organization` (central), `User`, `Session`, `Album`, `Client`, `Subscription`, `SiteData`, `LandingData`, `Notification`, `SecurityLog`, `Tutorial`, `DefaultSiteTemplate`, `ManualModule`
- **services/**: `storage.js`
- **utils/**: logger (Winston), `email.js`, `multerConfig`, schedulers (deadline, offboarding, sales, anniversary, dnsVerifier), `cleanupStorage`

**Modos de Sessão:**
- V1 ativo: `gallery` (galeria pública), `selection` (seleção c/ deadline), `multi_selection` (múltiplos participantes)
- V2 oculto: `multi_instant` (aguarda face search) — código no back preservado, oculto no front

### Admin (`admin/`)
**Vanilla JS ES Modules + dual-theme**
- Tabs ativas: `dashboard`, `sessoes/`, `clientes`, `mensagens`, `crm`, `meu-site`, `dominio`, `integracoes`, `marketing`, `perfil`, `plano`, `ajuda`, `configuracoes`
- Tab oculta V2: `albuns-prova.js`
- Utils: `api.js`, `helpers.js`, `upload.js`, `photoEditor.js`, `richtext.js`, `notifications.js`, `toast.js`, `client-modal.js`
- **Estrutura de tab grande (> 600 linhas):** pasta `tabs/X/` com `index.js`, `state.js`, `list.js`, `modal-form.js`, `actions.js`

### Site Público (`site/templates/`)
- Template único `master/index.html` com `data-theme` injetado pelo server
- Temas: `elegante`, `minimalista`, `moderno`, `escuro`, `galeria`
- Preview: `?_preview_theme=<tema>` (sem alterar banco)
- **Builder em iframe:** renderiza com tema do fotógrafo — não herda `[data-theme]` do admin

### PWA Cliente (`cliente/`)
- SPA com `sw.js` (offline), renderiza com tema do fotógrafo

---

## PADRÕES & ANTI-PADRÕES

✅ **Fazer:**
- Backend: `require()` no topo · `fs.promises` · `.lean()` em leituras · `req.logger`
- Admin: `import/export` · inline styles + tokens CSS · sem `alert/confirm`
- Código e comentários em PT-BR

❌ **Não fazer:**
- `console.log` → usar logger
- `fs.readFileSync` → usar promises
- `alert/confirm` → usar `showToast/showConfirm`
- Tailwind em tabs do admin
- Hexcodes hardcoded em CSS

---

## 🔴 HANDOFF ATIVO (2026-06-19) — Paridade multi_selection

> **Working tree não commitado.** Não dar `git add -A` às cegas. Validado por `node --check`; testes manuais parciais.

**Já implementado e (parcialmente) testado:**
1. Obrigatoriedades no passo Compartilhar (selection): `send-code` exige cliente vinculado + `fotosVisíveis >= packageLimit` (0 = sem mínimo). Banner amarelo esconde canais até cumprir.
2. Fix `userId is not defined` em `POST /client/submit-selection` (rota pública, sem `req.user`).
3. Galeria: "Entregar e notificar" sempre visível; campo "Resolução do preview" escondido no modo `gallery`.
4. `multi_selection` virou página única (`wizard/multi-single-page.js`). `SINGLE_PAGE_MODES = ['selection','gallery','multi_selection']`.
5. Sidebar (config-panel) do multi: Resolução + Fotos do pacote (padrão) + Preço foto extra (padrão).
6. Participantes: busca em `data.clients`; `+ Cadastrar` abre modal Rhyno; pacote e preço individuais por participante; botão Editar (overlay).
7. Comentários privados por participante (`comment.participantId`) — ✅ testado com 2 usuários.
8. Reabertura por participante (`participant.reopenRequested`) — ⏳ reteste pendente.
9. Fix identidade cliente no boot (`gallery.js`): código da URL tem PRIORIDADE sobre `localStorage`.
10. **Fotos extras por participante** (último item da paridade) — ⏳ teste pendente:
   - Schema: `participant.extraRequest` (espelha `session.extraRequest`: status/photos/requestedAt/respondedAt/rejectReason/upsellingSent) em `Session.js`.
   - Backend (`sessions.js`): `verify-code` + `/client/photos` devolvem o `extraRequest` do participante; `/client/request-extra-photos` aceita `participantId` (valida `participant.accessCode`); `/extra-request/accept` e `/reject` aceitam `participantId` (adicionam às `participant.selectedPhotos` / e-mail de recusa usa `participant.email`); upsell no submit-selection grava `upsellingSent` e usa `accessCode` por participante.
   - Cliente (`gallery.js`): as 2 chamadas de `request-extra-photos` enviam `participantId`.
   - Admin: aceitar/recusar por participante em `4-tracking.js` (`renderParticipantsProgress` — badge "📸 pediu N extra(s)" + botões) e em `6-deliver.js` (`buildParticipantExtraRequest`, usado pelo fluxo stepper/`multi_instant`); badge da lista (`list.js`) soma extras de participantes.
   - Recusa por participante abre modal com **motivo obrigatório** (espelha `actions.js` da seleção individual) → `reject` recebe `{ participantId, reason }` e o motivo vai no e-mail ao participante.

**Pendências de validação:** reteste reabertura (item 8); testar fotos extras por participante ponta-a-ponta (item 10); validar Ondas 1–4 + WhatsApp entrega em modo `gallery`.

> ✅ Paridade `multi_selection` completa no código (itens 1–10). Falta só validação manual.

> Histórico completo: `skills/historico_entregas.md` · Detalhes das ondas: `skills/8_0_handoff-sessoes-ondas.md`

---

## INTEGRAÇÃO COM RHYNO SYSTEM (ERP/CRM)

**Status:** ✅ Live em produção (deploy 2026-06-15)

- **Rhyno ERP:** React+FastAPI+Postgres em `ERP1/` (`pach3c0/ERP1`). Prod: PM2 `erp-backend` (:8000) + `erp-frontend` (:4173) em `https://erp.cliquezoom.com.br`.
- **Aba Gestão:** iframe do Rhyno com SSO. `src/routes/gestao.js` → `GET /api/gestao/sso-url`.
- **Session:** `rhynoCustomerId` + snapshot `clientName`/`clientPhone`. Modal de sessão busca clientes no Rhyno.
- **Config .env:** `SSO_SHARED_SECRET`, `RHYNO_BASE_URL`, `RHYNO_API_URL`, `RHYNO_POC_EMAIL`.
- **Identidade embed:** `ERP1/frontend/src/utils/embedMode.ts` + `embed-theme.css` — mexer **só nesses dois** para ajustar a cara do iframe.
- **Detalhes completos:** `skills/9_0_handoff-rhyno-integracao.md`

### ⚠️ Dev local — Sequência de startup (copiar e colar)
```bash
# 1) Parar o compose ERRADO (evita conflito de porta 8000/5173)
docker stop erp_backend erp_frontend erp_db 2>/dev/null

# 2) Rhyno backend — stack CORRETO
docker start rhyno-pg rhyno-api
docker exec -d rhyno-api sh -c "cd /app && uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/uvicorn.log 2>&1"

# 3) Rhyno frontend — NO HOST (não em container)
cd /Users/macbook/Documents/ERP1/frontend && npm run dev    # Vite :5173

# 4) CliqueZoom
cd /Users/macbook/Documents/ProjetoEstudio/FsSaaS && npm run dev   # porta 3051
```
**Verificar:** `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/docs` → `200`

**URLs dev:** CliqueZoom `http://localhost:3051` (login `teste@teste.com.br`, DB `cliquezoom-dev`) · Rhyno API `http://localhost:8000/docs` · Rhyno front `http://localhost:5173`

**Gotchas críticos:**
- `rhyno-api` roda `sleep infinity` → uvicorn NÃO sobe sozinho, precisa do `docker exec -d` acima.
- Vite escuta só em `[::1]:5173` (IPv6) → use `localhost`, **não** `127.0.0.1`.
- `SSO_SHARED_SECRET` precisa ser IGUAL em `FsSaaS/.env` e `ERP1/backend/.env`.
- 🚫 **Não** usar o compose `erp_backend/erp_frontend/erp_db` (não tem SSO e rouba as portas).
- Deploy ERP: precisa de `npm run build` no servidor (`dist/` é gitignored). SSH na VPS: conexões rápidas causam throttling (erro 255) — vá devagar.
- Working tree local do ERP1 tem mudanças **inacabadas** (`models.py`, `crm.py`, etc.) — **NÃO commitar o working tree inteiro do ERP1**.

---

## TESTES
```bash
npx playwright test --workers=1
```
- `tests/1_0_landing-page.spec.js`, `2_0_login.spec.js`, `3_0_sessoes.spec.js`, `3_1_cliente-galeria.spec.js`, `4_0_clientes.spec.js`
