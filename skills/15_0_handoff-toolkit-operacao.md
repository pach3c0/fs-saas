# Handoff — Toolkit de Operação do SaaS Admin (2026-06-12)

> Sessão interrompida por crédito baixo. **Fases 0–5 de 6 implementadas, validadas e
> commitadas** (tudo local, NADA deployado). Plano original aprovado em
> `~/.claude/plans/nao-posso-fazer-deploy-curried-cupcake.md` (cópia das fases abaixo).

## Objetivo
Ferramentas para o dono operar a plataforma sozinho: ver tudo que acontece no app,
investigar quando um fotógrafo reclama, e rodar testes com facilidade.

## O QUE ESTÁ PRONTO ✅ (commits desta sessão, em ordem)

| Fase | Commit | O quê |
|---|---|---|
| 0 | `feat(testes)` | Reporter HTML local (`playwright-report-local/`), smoke test read-only (`tests/smoke/`, rodável contra produção), npm scripts `test:local`, `test:local:report`, `test:smoke` |
| 1 | `feat(saas-admin): central de erros` | Model `PlatformLog` (TTL 30d) + `MongoLogTransport` no Winston (espelha error/warn no Mongo com orgId/requestId; denylist 401/404; circuit breaker) + rota `src/routes/saasSystem.js` (`GET /admin/saas/errors`) + **aba "Eventos"** no saas-admin com filtros e stack expansível + card "Erros 24h" no dashboard |
| 2 | `feat(observabilidade): captura de erros JS` | `assets/js/error-reporter.js` (onerror + unhandledrejection, dedupe, sendBeacon) incluído em `admin/index.html` e `cliente/index.html` + `POST /api/client-error` público (rate limit 20/min/IP, responde 204 sempre) |
| 3 | `feat(observabilidade): EmailLog` | Model `EmailLog` (TTL 90d); `sendEmail()` grava nos 3 desfechos (ok/falha/SMTP off); 26 wrappers com `{ template, orgSlug }`; `GET /admin/saas/emails`; toggle **"Erros \| E-mails"** na aba Eventos |
| 4 | `feat(saas-admin): auditoria + impersonação` | Model `AuditLog` (sem TTL) + `audit()` em 9 ações do superadmin; `POST /admin/organizations/:id/impersonate` (JWT 30min com `impersonatedBy`); botão "🛠️ Entrar como" no painel da org; admin do fotógrafo consome `?impersonate=` e mostra **banner laranja de modo suporte** com Encerrar; `GET /admin/saas/audit`. **Fix:** `#saasConfirmModal` z-index 300 (ficava atrás do painel lateral) |
| 5 | `feat(saas-admin): aba Diagnóstico` | `GET /admin/organizations/:id/diagnostics` + aba "🩺 Diagnóstico" no painel da org (último login, erros 7d, e-mails falhados 7d, listas, auditoria, Entrar como). **Validada só via API — falta teste visual da UI (5 min)** |

Antes do toolkit, na mesma sessão: Fala Conosco completo (+fix modal não fechava,
`c033ef9`), fundação ActivityEvent, SaaS Admin v2 Ondas A (split em módulos) e B
(dashboard saúde + aba Jornada), recuperação de stash de outra IA (`e45d758`).

## O QUE FALTA ⏳

### Fase 6 — Aba "Sistema" + SchedulerRun (não iniciada)
1. **Criar `src/models/SchedulerRun.js`**: `{ name unique, lastStartAt, lastEndAt, lastStatus enum['ok','error'], lastError, lastDurationMs, runCount }` — 1 doc/scheduler via upsert, sem TTL.
2. **Criar `src/utils/schedulerRunner.js`**: extrair o `safeInterval` de `src/server.js` (~linha 215) → `safeInterval(name, fn, ms)` com lock anti-sobreposição + upsert no `finally` (fire-and-forget, guard readyState); exportar também `recordRun(name, fn)` para o anniversaryAutomator (setTimeout recursivo, ~linha 250).
3. **`src/server.js`**: importar e nomear as 4 chamadas de safeInterval + embrulhar anniversary.
4. **`GET /api/admin/saas/system` em `src/routes/saasSystem.js`**: mongo (readyState + ping cronometrado via `mongoose.connection.db.admin().ping()`), smtp (novo export `verifySmtp()` em email.js com `getTransporter().verify()` + cache 5min; `?verifySmtp=1` força), disco (`fs.promises.statfs` + `storage.getDirSize()` com cache 10min), processo (uptime, versões, RSS, NODE_APP_INSTANCE), schedulers (`SchedulerRun.find().lean()`).
5. **Criar `saas-admin/js/tabs/sistema.js`** + botão/div/case em `index.html`/`app.js` (padrão: copiar a aba eventos.js): cards de estado + tabela de schedulers + seção auditoria recente (consome `/admin/saas/audit`).

### Validações pendentes
- **Fase 5 UI**: abrir painel da org → aba Diagnóstico → conferir cards/listas (endpoint já validado).
- **Regressão final**: `npm run test:local` (suíte inteira, workers 1) — não rodada ainda.
- Rate limit do `/api/client-error` (>20 POSTs/min → 204 sem gravar) — não testado.

## COMO RETOMAR
1. Servidor: `node src/server.js` (porta 3051; não usar nodemon nos testes Playwright avulsos — ele vigia `*.*` e reinicia ao escrever qualquer arquivo; scripts de teste avulsos ficam em `/tmp`).
2. Logins de teste: fotógrafo `teste@teste.com.br/055360`, superadmin `admin@cliquezoom.com.br/055360`.
3. Padrão de validação usado: script Playwright em `/tmp` com `import { chromium } from '<repo>/node_modules/playwright/index.mjs'`, checar `pageerror` vazio.
4. Implementar Fase 6 (passos acima) → commit → regressão → atualizar este handoff.

## DECISÕES DE ARQUITETURA (não rediscutir)
- Toda instrumentação é **fire-and-forget** com guard `mongoose.connection.readyState !== 1` e catch via `console.error` (nunca `logger` — risco de loop; nunca `throw`). Padrão: `src/utils/activityTracker.js`.
- Endpoints novos do toolkit vivem em `src/routes/saasSystem.js` (não inflar saasAdmin.js).
- Fora de escopo decidido: viewer de logs Winston no browser, runner E2E pela UI, live tail, Sentry, tracking de abertura de e-mail, impersonação read-only.
- TTLs: PlatformLog 30d, EmailLog 90d, AuditLog permanente, SecurityLog 30d (pré-existente), ActivityEvent 180d.

## DEPOIS DO TOOLKIT (backlog da sessão anterior)
- Deploy de TUDO (são ~14 commits locais) + testar e-mail real na VPS (SMTP Hostinger).
- Onda C do SaaS Admin v2: design system `--ad-*` dual-theme nas tabs (hoje hexcodes).
- Telemetria por módulo (tabela 2.1 de `skills/14_0_plano-suporte-e-saas-admin.md`).
- Testes E2E do painel novo em `tests/local/`.
