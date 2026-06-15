# Handoff — Integração CliqueZoom ↔ Rhyno System (ERP/CRM)

> 🛑 **DESATUALIZADO / HISTÓRICO (este doc é de 2026-06-10, fase POC).**
> A integração **JÁ FOI DEPLOYADA e está LIVE em produção desde 2026-06-15.**
> **Para o estado atual e os pontos de atenção, leia o `CLAUDE.md` (raiz) → seção
> "INTEGRAÇÃO COM O RHYNO SYSTEM" → bloco "⚠️ PONTOS DE ATENÇÃO".**
> O texto abaixo descreve o plano original do POC e serve só de referência histórica.

> Estado em 2026-06-10. POC local funcionando. **NADA foi para o Git nem para a VPS.**
> Objetivo: tornar o **Rhyno System** (ERP SaaS do usuário, pasta `/Users/macbook/Documents/ERP1`,
> repo `pach3c0/ERP1`, prod `erp.cliquezoom.com.br`) o **CRM/financeiro principal** dentro do CliqueZoom.

---

## 1. Decisões já tomadas (pelo usuário)

| Tema | Decisão |
|------|---------|
| Abordagem de integração | **Iframe + SSO** (não reconstruir UI, não usar proxy Nginx) |
| Papel do Rhyno | **CRM principal**; abas `clientes.js`/`crm.js` do CliqueZoom em rota de aposentadoria |
| Mecanismo de SSO | **Segredo dedicado** (`SSO_SHARED_SECRET`), não compartilhar o SECRET_KEY mestre |
| Criar cliente novo | **Inline na sessão, gravando no Rhyno** via API |
| Migração clientes reais | **Big bang** (script), mas só depois de provisionamento |
| CPF no Rhyno | **Obrigatório** (real tem CPF; os 94 locais eram lixo de teste E2E com `00000000000`) |
| Aba Clientes (CliqueZoom) | **Escondida** (reversível), código/schedulers intactos |
| Deploy | **NÃO subir ainda** — usuário tem ajustes locais a fazer antes |

---

## 2. O que está PRONTO (POC local, validado)

1. **Embed** — Rhyno renderiza dentro do CliqueZoom sem a sidebar dele (`?embed=1`).
2. **SSO** — login único: clicar na aba Gestão entra direto, sem tela de login do Rhyno.
3. **Aba "Gestão"** no admin — iframe + sub-navegação (Dashboard/Clientes/OS/Contas/CRM).
4. **Seletor de cliente da sessão** busca no Rhyno (`/api/gestao/customers`, server-to-server).
5. **Cadastro inline ("+ Novo cliente")** grava no Rhyno (não mais no Mongo).
6. **Sessão referencia customer do Rhyno** (`rhynoCustomerId` + snapshot `clientName`/`clientPhone`/`clientEmail`); card/wizard/WhatsApp exibem com fallback.
7. **Script de migração** clientes Mongo→Rhyno (dry-run/--apply, idempotente, pula CPF inválido, trata duplicado). Validado local: 1 migrado, 92 sem CPF, 1 duplicado.
8. **Aba Clientes escondida** no menu (reversível).

---

## 3. Como funciona (arquitetura)

**SSO (login único):**
1. CliqueZoom (`/api/gestao/sso-url`) cunha uma **asserção JWT curta** (120s) assinada com `SSO_SHARED_SECRET`, payload `{email, iss:'cliquezoom'}`.
2. iframe abre `RHYNO/sso?assertion=...&embed=1&redirect=/dashboard`.
3. Página `/sso` do Rhyno chama `POST /auth/sso-login` → Rhyno valida a asserção com o mesmo segredo, acha o user por email, devolve um JWT Rhyno real → `setAuthSession` → reload pro `/dashboard`.
- O `email` do user Rhyno é resolvido por `org.rhynoUserEmail` (CliqueZoom) com fallback `RHYNO_POC_EMAIL`. **Hoje é fixo no tenant de teste** (falta provisionamento).

**Dados de cliente (server-to-server):** CliqueZoom cunha asserção → troca por token Rhyno (`/auth/sso-login`) → chama a API do Rhyno (`/customers/`). Usado em `GET /api/gestao/customers` (busca) e `POST /api/gestao/customers` (cria).

---

## 4. Arquivos alterados

### Rhyno (ERP1) — tudo aditivo
- `frontend/src/utils/embedMode.ts` (novo) — detecta `?embed=1`, persiste em sessionStorage
- `frontend/src/components/Layout.tsx` — esconde sidebar/header se `isEmbedded()`
- `frontend/src/main.tsx` — `import './utils/embedMode'` (init cedo)
- `frontend/src/components/SSOLogin.tsx` (novo) — página `/sso`
- `frontend/src/App.tsx` — rota `/sso` + import
- `backend/routers/auth.py` — `POST /auth/sso-login` + `SSOLoginRequest` + import `from jose import jwt, JWTError`
- `backend/.env` e `frontend/.env` (novos, gitignored) — config local; `SSO_SHARED_SECRET` no backend

### CliqueZoom (FsSaaS)
- `admin/js/tabs/gestao.js` (novo) — aba Gestão (iframe + SSO + sub-nav)
- `admin/index.html` — botão "Gestão" adicionado; botão "Clientes" comentado (oculto)
- `admin/js/app.js` — `TAB_TITLES.gestao`
- `src/routes/gestao.js` (novo) — `/api/gestao/sso-url`, `GET/POST /api/gestao/customers`
- `src/server.js` — monta `./routes/gestao`
- `.env` (gitignored) — `SSO_SHARED_SECRET`, `RHYNO_BASE_URL`, `RHYNO_API_URL`, `RHYNO_POC_EMAIL`
- `src/models/Session.js` — `rhynoCustomerId`, `clientName`, `clientPhone`
- `src/routes/sessions.js` — POST aceita `rhynoCustomerId` na validação
- `admin/js/tabs/sessoes/modal-form.js` — seletor busca no Rhyno, payload com `rhynoCustomerId`/snapshot, inline create `target:'rhyno'`
- `admin/js/utils/client-modal.js` — parâmetro `options.target` ('rhyno' grava via `/api/gestao/customers`)
- `admin/js/tabs/sessoes/list.js`, `wizard/index.js`, `wizard/steps/2-share.js` — fallback de nome/telefone para `clientName`/`clientPhone`
- `src/models/Client.js` — `rhynoCustomerId` (mapeamento/idempotência)
- `src/utils/migrateClientsToRhyno.js` (novo) — script de migração

---

## 5. Como retomar o ambiente local (após reboot)

**Rhyno (Docker):**
```
docker start rhyno-pg rhyno-api
docker exec -d rhyno-api sh -c "uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/uvicorn.log 2>&1"
cd /Users/macbook/Documents/ERP1/frontend && npm run dev   # Vite :5173
```
**CliqueZoom** (⚠️ rodar SEMPRE de dentro de `FsSaaS`, senão `MODULE_NOT_FOUND`):
```
cd /Users/macbook/Documents/ProjetoEstudio/FsSaaS && node src/server.js   # :3051
```
**URLs:** CliqueZoom admin `localhost:3051` · Rhyno `localhost:5173` · API Rhyno `localhost:8000/docs`
**Logins:** CliqueZoom `teste@teste.com.br`/`055360` · Rhyno `teste@cliquezoom.local`/`teste123` (tenant_id=2)
**Detalhes/gotchas:** ver memória `reference_rhyno_local_poc`.

---

## 6. Como testar
- Aba **Gestão** → entra direto no ERP (SSO), sem landing/login, sem sidebar do Rhyno.
- **Nova Sessão** → buscar cliente (digite "ricardo"/"maria"/"ana") → vem do Rhyno; "+ Novo cliente" → grava no Rhyno (exige CPF válido).
- Migração: `node src/utils/migrateClientsToRhyno.js` (dry-run) e `--apply`.

---

## 7. Pendências / próximos passos (em ordem)

1. **[usuário] Ajustes locais diversos** antes de qualquer deploy.
2. **Provisionamento** (o gargalo): auto-criar tenant Rhyno no cadastro de novo fotógrafo + gravar `org.rhynoUserEmail`; mapear a Flávia (one-off). Tira tudo do `RHYNO_POC_EMAIL` fixo.
3. **Revinculação de sessões** existentes: `clientId` (Mongo) → `rhynoCustomerId` via o mapa do script.
4. **Migração real** da Flávia na VPS (`--org=<id> --apply`) — só após 2 e 3.
5. **CRM de reativação** (`anniversaryAutomator`) e `offboardingChecker` → mover/repensar no Rhyno antes de aposentar o `Client`.
6. **Multi-seleção** (`modal-participantes.js`) ainda usa `/clients/search` legado — migrar pro Rhyno.
7. **Aposentar o módulo Clientes** (model/rotas) — ÚLTIMO passo.
8. **Deploy:** `frame-ancestors https://app.cliquezoom.com.br` no Nginx do `erp` (hoje provável `X-Frame-Options: SAMEORIGIN` bloqueia o iframe); `SSO_SHARED_SECRET` nos `.env` de produção dos dois; tratar redirect 401 do `api.ts` do Rhyno dentro do iframe (renovar via postMessage).

---

## 8. Riscos / cuidados
- **Produção tem a Flávia (cliente real).** Não deletar `Client` nem mexer nos schedulers até a sequência acima estar completa e verificada.
- Migração com **CPF obrigatório**: o(s) raro(s) cliente(s) reais sem CPF aparecem nomeados no relatório — completar na mão.
- **Duplicado** na migração hoje é reportado como falha (não vincula ao existente) — refinar se necessário (no 1º migração de tenant vazio não acontece).
- Script roda contra o `MONGODB_URI` e o tenant resolvido por `rhynoUserEmail`/`RHYNO_POC_EMAIL` — conferir antes de `--apply` em produção.
