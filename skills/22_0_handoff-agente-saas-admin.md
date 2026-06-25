# Handoff — Agente IA de Operação do SaaS Admin (2026-06-25)

> ✅ **LIVE em produção** (`origin/main = be0f92a`). Chat IA somente-leitura na aba
> 🤖 Agente do `/saas-admin`, multi-provider, com gerenciamento de IAs/chaves pelo
> painel, **digest proativo** (briefing de saúde) e **custo/uso por conversa**.
> Plano original: `~/.claude/plans/crispy-riding-spindle.md`.

## Objetivo
Dar ao **superadmin** (dono da plataforma) uma camada de conversa em PT-BR sobre o
substrato do [Toolkit de Operação](15_0_handoff-toolkit-operacao.md), em vez de cruzar
15 abas na mão. Perguntas como *"quais orgs estão em risco?"*, *"por que o fotógrafo X
tomou 500 hoje?"*, *"resumo da semana"* → análise cruzada com números e nomes reais.

**Postura V1: SOMENTE LEITURA.** O agente nunca escreve (não aprova org, não muda
plano, não envia e-mail por conta própria, não impersona). Se pedirem ação, ele
explica que sua função é análise e indica a aba/botão manual.

---

## Arquitetura

```
saas-admin (browser)                   src/ (Express, superadmin-gated)
 aba 🤖 Agente ──POST /api/admin/saas/agent/chat──▶ routes/saasAgent.js
  (chat, stream NDJSON) ◀──── {t:text|tool|usage|error} ──   │ streamText() + tools (Vercel AI SDK)
                                                              │ resolveAgentModel() ← AgentConfig (banco) | .env
                                                              ▼
                                              services/agentTools.js (8 tools read-only)
                                                              ▼
                                     models Mongo (.lean()) — MESMAS queries dos endpoints superadmin
```

**Multi-provider via Vercel AI SDK** (`ai` v6 + `@ai-sdk/anthropic|openai|google`, `zod`):
o loop agêntico e as tools são definidos **uma vez** (formato neutro), válidos em
qualquer provedor. Trocar de IA = trocar a config ativa no painel (ou o `.env` de
fallback). **Sem self-call HTTP** — as tools chamam funções in-process. Funciona em
**CommonJS** (`require`, sem `import()` dinâmico).

> Por que Node e não Pydantic? O usuário ancorou em "Pydantic" (do [Rhyno](9_0_handoff-rhyno-integracao.md),
> que é Python). Aqui o runtime é Node/Express — Pydantic AI é só **referência de padrão**.

---

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/services/aiProvider.js` | `buildModel({provider,model,apiKey,baseURL})` (switch por provedor; anthropic default `claude-opus-4-8`; openai-compatible exige baseURL) + `getModelFromEnv()`/`describeEnv()` (fallback .env) + `AgentConfigError` (rota → 503) |
| `src/services/agentModel.js` | `resolveAgentModel(providerId?)` compartilhado por chat e digest (config do banco por id/ativa → fallback .env; devolve `{model, descriptor, priceInput, priceOutput}`) + `computeCost(usage, $in, $out)` |
| `src/services/agentTools.js` | As **8 tools read-only** (`tool()` + `zod`), com whitelist de campos. `resolveOrg(input)` aceita slug/id/nome |
| `src/routes/saasAgent.js` | Rota superadmin: CRUD de IAs, chat (stream), digest e settings |
| `src/utils/agentDigest.js` | `gather()` (reusa os tools) → `generateText` → grava `AgentDigest` → e-mail opcional; `run()` com guarda de frequência |
| `src/models/AgentConfig.js` | 1 doc por IA: `provider/label/model/baseURL/apiKeyEnc/apiKeyLast4/priceInput/priceOutput/isActive` |
| `src/models/AgentDigest.js` | Resumos gerados (`period/trigger/text/emailedTo/createdAt`, TTL 180d) |
| `src/models/AgentSettings.js` | Singleton de config do digest (`digestEnabled` default **false**, `digestFrequency`, `digestEmail`, `lastDigestAt`) com `getSingleton()` |
| `src/utils/secretBox.js` | `encrypt()/decrypt()` AES-256-GCM (chave derivada de `CONFIG_SECRET`\|\|`JWT_SECRET`) |
| `saas-admin/js/tabs/agente.js` | UI: 3 painéis (chat / ⚙️ IAs / 📊 Resumos), seletor de IA por conversa, linha de tokens+custo |
| **Editados** | `src/server.js` (monta a rota L~411 + scheduler `agentDigest`), `saas-admin/index.html` (botão no dropdown "Sistema & Infra" + `<div id=tabAgente>`), `saas-admin/js/app.js` (import + branch), `package.json` (deps de IA) |

> `.env` e `package-lock.json` são **gitignored**. As deps de IA (`ai`/`@ai-sdk/*`/`zod`)
> entraram no `package.json` mas **exigem `npm install` no deploy** (ver Gotchas).

---

## As 8 ferramentas read-only

| Tool | Devolve | Fonte espelhada |
|---|---|---|
| `getPlatformOverview` | totais (orgs/users/sessions/photos/byPlan) + saúde (orgs em risco por `idleDays`, chamados abertos, sessões 7d, cadastros recentes) | `saasAdmin.js` metrics + health |
| `listErrors` | `PlatformLog` por janela/nível/origem/org + contadores 24h | `saasSystem.js` errors |
| `listEmails` | `EmailLog` (falhas primeiro) por janela/template | `saasSystem.js` emails |
| `findOrgs` | busca org por nome/slug + stats (sessões/fotos) | `saasAdmin.js` orgs |
| `getOrgDiagnostics` | raio-x de uma org: erros, e-mails, último login, auditoria, contadores 7d | diagnostics |
| `getOrgJourney` | timeline `ActivityEvent` da org | activity |
| `getAuditLog` | ações do superadmin (opcionalmente por org) | audit |
| `getSystemStatus` | Mongo, schedulers (última execução/erro), processo | system |

**Blindagem (crítico):** whitelist explícita de campos no retorno. **Nunca** devolve
conteúdo/URL de fotos de cliente, `accessCode` nem comentário privado (lição do
[isolamento multi_selection](../CLAUDE.md)). Não existe tool de escrita.

---

## Endpoints (todos `requireSuperadmin`)

```
# Gerenciamento de IAs (chaves criptografadas, mascaradas só com last4, write-only)
GET    /api/admin/saas/agent/providers
POST   /api/admin/saas/agent/providers
PUT    /api/admin/saas/agent/providers/:id
PUT    /api/admin/saas/agent/providers/:id/activate
DELETE /api/admin/saas/agent/providers/:id
GET    /api/admin/saas/agent/info          # descritor da IA ativa

# Chat
POST   /api/admin/saas/agent/chat          # stream NDJSON; body { messages, providerId? }

# Digest proativo + configurações
GET    /api/admin/saas/agent/settings
PUT    /api/admin/saas/agent/settings      # { digestEnabled, digestFrequency, digestEmail }
GET    /api/admin/saas/agent/digests
POST   /api/admin/saas/agent/digest/run    # gera agora; body { sendMail? }
```

**Protocolo do stream (NDJSON, 1 JSON por linha):**
`{t:'text',v}` (delta de texto) · `{t:'tool',name}` (chamou ferramenta) ·
`{t:'usage',input,output,total,cost}` (no fim; `cost` só se a IA tiver tarifa) ·
`{t:'error',v}`.

---

## Gerenciamento de IAs (painel ⚙️ IAs)

As chaves **NÃO ficam no `.env`** (decisão do usuário) — vão num painel dentro da aba.
Cada IA tem provedor (`anthropic` | `openai` | `google` | `openai-compatible`), rótulo,
**id de modelo**, chave (criptografada AES-256-GCM, exibida só como `····last4`,
write-only), `baseURL` (só openai-compatible → OpenRouter/DeepSeek/etc.) e **tarifas
opcionais** (US$/milhão de tokens, entrada/saída) para estimar custo. A primeira IA
cadastrada vira a ativa; o seletor no topo do chat escolhe a IA por conversa.

---

## #5 — Custo/uso por conversa

Ao final de cada resposta, o chat emite `{t:'usage', input, output, total, cost}`
(via `await result.totalUsage`, somatório de todos os steps). A UI mostra uma linha
discreta sob a bolha: `↑ 1234  ↓ 567 tokens · ≈ US$ 0.0042`. O **custo só aparece** se
a IA tiver `priceInput`/`priceOutput` cadastrados; senão mostra só os tokens.
`computeCost = inputTokens/1e6*$in + outputTokens/1e6*$out` (4 casas).

## #1 — Digest proativo (briefing de saúde)

Um resumo periódico da plataforma, gerado pela IA ativa a partir dos **mesmos tools
read-only** do chat (`agentDigest.gather()` → `generateText`). Estrutura: saúde geral,
orgs em risco, erros 24h/7d, falhas de e-mail, sistema, e até 3 ações sugeridas.

- **Default DESLIGADO** (`digestEnabled=false`) — nada roda em prod até habilitar no
  painel 📊 Resumos. O scheduler `agentDigest` (`safeInterval`, checa a cada 6h) faz
  **no-op** quando desligado.
- Frequência **diária** ou **semanal** (guarda por `lastDigestAt`; máx. 1 por janela).
- **E-mail opcional** ao `OWNER_EMAIL` (assunto "🤖 Resumo diário/semanal").
- **⚡ Gerar agora** cria sob demanda (`trigger:'manual'`), com opção de e-mail no ato.
- Histórico fica em `AgentDigest` (TTL 180d).

---

## Como usar
`/saas-admin` → **Sistema & Infra** → **🤖 Agente**:
1. **⚙️ IAs** → adicione uma IA (provedor + id de modelo exato + chave; tarifas se quiser).
2. **Chat** → pergunte; escolha a IA no seletor; veja tokens/custo sob a resposta.
3. **📊 Resumos** → ligue a automação (diária/semanal, e-mail on/off) ou **⚡ Gerar agora**.

---

## Gotchas (aprendidos na marra)

1. **Stream usa `part.text`, não `part.delta`.** No `fullStream` v6 (tipo público
   `TextStreamPart`) o delta de texto vem em `.text`; `.delta` é o tipo interno.
   Usar `.delta` imprimia `undefinedundefined…` na prod (fix `3c08429`). Lição:
   sempre exercitar o **caminho de sucesso**, não só o de erro (chave fake).
2. **Campo *Modelo* = id de API literal, não rótulo.** Cadastrar `GPT-5.4 mini` no
   campo modelo → OpenAI responde `model_not_found`. Use o id exato da doc do provedor
   (minúsculo, com hífens). O *Rótulo* é livre; o *Modelo* não.
3. **Deploy exige `npm install`:** `cd /var/www/cz-saas && git pull && npm install &&
   pm2 reload ecosystem.config.js --env production --update-env`. Sem o install,
   `require('ai')` derruba a prod (deps de IA não estão no node_modules; lock gitignored).
4. **Digest nasce desligado** — garantia de que nenhum LLM é chamado em prod sem o
   superadmin habilitar. `run()` checa `digestEnabled` antes de qualquer coisa.

---

## Histórico
- Fase 1 (chat + 8 tools + painel de IAs/chaves): `0bb049f` → `ad7d738` → `3c08429`.
- Fase 2 (digest #1 + custo/uso #5): `be0f92a` (2026-06-25, FF de 3c08429).

Relaciona: [Toolkit de Operação](15_0_handoff-toolkit-operacao.md) (substrato),
[Plano Fala Conosco + SaaS Admin v2](14_0_plano-suporte-e-saas-admin.md),
[Integração Rhyno](9_0_handoff-rhyno-integracao.md) (padrão multi-provider de IA).
