# Handoff 19_0 — Auto-inscrição via QR Code + Tabela de preços (Seleção em Grupo)

> **Data:** 2026-06-20 · **Modo afetado:** `multi_selection` ("Seleção em Grupo")
> **Estado:** implementado no **working tree, NÃO commitado**. Validado por `node --check` + prova de monotonicidade via node. **Sem teste E2E no navegador.**
> **Origem:** funcionalidade ~90% escrita por outra IA (Gemini); auditada e corrigida nesta passagem (4 bugs) + cálculo de preços reescrito para o modelo cumulativo.

---

## 1. O que a funcionalidade faz

Permite que convidados de um evento (ex.: formatura infantil) **se auto-inscrevam** numa sessão `multi_selection`, sem o fotógrafo cadastrar cada um à mão:

1. Fotógrafo ativa a auto-inscrição na sessão e divulga um **QR Code / link** (`/inscrever/:accessCode`).
2. Convidado abre o link → preenche **Nome + WhatsApp + Grau de parentesco** → vira **participante** da sessão (recebe um `accessCode` próprio).
3. Quando o fotógrafo sobe as fotos, o participante acessa sua galeria e seleciona.
4. Uma **tabela de preços por faixa de quantidade** mostra ao cliente o **total correndo** conforme ele seleciona.

> ⚠️ **A plataforma NÃO cobra nada** (V1 sem pagamentos). A tabela é **só exibição** — o fotógrafo faz a cobrança por fora. Não propor gateway/checkout.

---

## 2. Modelo de dados

### `src/models/Session.js`
```js
// Auto-inscrição pública
selfRegEnabled:  { type: Boolean, default: false },
selfRegDeadline: { type: Date, default: null },   // null = usa selectionDeadline

// Tabela de preços CUMULATIVA por faixa (limiar) — ver §4
pricingTable: [{
  from:  { type: Number, required: true },  // a partir de quantas fotos extras vale a faixa
  to:    { type: Number, default: null },   // OPCIONAL/LEGADO — não usado no cálculo
  price: { type: Number, required: true }   // preço de cada foto extra nesta faixa
}],

// No subdocumento participants[]:
relationship: { type: String, default: '' }  // grau de parentesco informado na inscrição
```

### `src/models/Organization.js`
```js
// Dentro de preferences (NÃO settings):
membershipRoles: {
  type: [String],
  default: ['Pai/Mãe', 'Parente', 'Professor', 'Convidado']
}
```

---

## 3. Rotas (em `src/routes/sessions.js`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `GET`  | `/api/sessions/register/:code` | pública (resolveTenant) | dados da sessão p/ a página de inscrição (nome, capa, prazo, `membershipRoles`) |
| `POST` | `/api/sessions/register/:code` | pública (resolveTenant) | auto-inscreve participante; **`selfRegLimiter` + `checkHoneyPot` + dedupe por WhatsApp** |
| `GET`  | `/api/sessions/:id/register-link` | token | URL pública de inscrição (subdomínio do fotógrafo) |
| `PUT`  | `/api/sessions/:id/self-reg` | token | liga/desliga auto-inscrição + prazo |
| `PUT`  | `/api/sessions/:id/pricing-table` | token | salva a tabela de preços |
| `GET`  | `/api/sessions/:id/participants/:pid/to-client` | token | dados do participante p/ pré-preencher modal Rhyno |

- `resolveTenant` é montado em `src/server.js` para `/api/sessions/register`.
- Página pública servida por `app.get('/inscrever/:code', …)` em `src/server.js` → `site/inscrever/index.html`.

---

## 4. Cálculo de preços — modelo CUMULATIVO (limiar)

**Decisão de produto (2026-06-20):** o requisito do usuário foi *"um cálculo que passe confiança e sem conflito de valores"*. Escolhido o modelo **cumulativo / progressivo (estilo faixas de imposto)**:

- O eixo é o **nº de fotos EXTRAS** (além do `packageLimit` incluído no pacote).
- Cada foto extra é cobrada pelo preço da **faixa em que ELA cai**.
- As faixas são **limiares**: o editor do admin só tem **"De" + "Preço"** (sem "Até"). Cada faixa vale do `from` até o início da próxima. O campo `to` é legado e **não entra no cálculo**.
- Como cada foto soma um valor ≥ 0, o **total é sempre monotônico** — escolher mais fotos NUNCA reduz o total. É isso que elimina o "conflito de valores" (o modelo flat-by-bracket anterior fazia 11 fotos custarem menos que 10).
- **Tabela vazia → fallback** no preço fixo `extraPhotoPrice` (comportamento original preservado).

### Função canônica
```js
function calcExtraCost(qty, pricingTable, flatPrice) {
  qty = Math.max(0, Math.floor(Number(qty) || 0));
  const flat = Number(flatPrice) || 0;
  if (qty === 0) return 0;

  const tiers = (Array.isArray(pricingTable) ? pricingTable : [])
    .filter(t => t && Number.isFinite(t.from) && Number.isFinite(t.price))
    .map(t => ({ from: Math.max(1, Math.floor(t.from)), price: Math.max(0, Number(t.price)) }))
    .sort((a, b) => a.from - b.from);
  if (tiers.length === 0) return qty * flat;

  let total = 0;
  for (let n = 1; n <= qty; n++) {
    let price = flat;                      // antes da 1ª faixa: preço fixo
    for (const t of tiers) {
      if (t.from <= n) price = t.price;    // sobe p/ a faixa mais alta que já começou
      else break;
    }
    total += price;
  }
  return total;
}
```

> 🔁 **A função está DUPLICADA, idêntica, em dois lugares** — `cliente/js/gallery.js` (galeria do cliente) e `admin/js/tabs/sessoes/wizard/config-panel.js` (prévia do admin). Os dois arquivos não compartilham módulo (cliente = IIFE browser; admin = ES module). **Qualquer mudança na regra deve ser replicada nos dois**, senão o painel mostra um valor e a galeria outro (= novo conflito). Ambos têm comentário "manter em sincronia".

### Exemplo (faixas: a partir de 1→R$10 · 11→R$8 · 16→R$7)
| Extras | Total | Conta |
|-------:|------:|-------|
| 5  | R$ 50,00  | 5×10 |
| 10 | R$ 100,00 | 10×10 |
| 11 | R$ 108,00 | 10×10 + 1×8 |
| 16 | R$ 147,00 | 10×10 + 5×8 + 1×7 |
| 20 | R$ 175,00 | 10×10 + 5×8 + 5×7 |

Monotônico ✅ (provado de 0 a 20 fotos).

---

## 5. Arquivos alterados (working tree, não commitado)

| Arquivo | Mudança |
|---------|---------|
| `src/models/Session.js` | campos `selfRegEnabled`, `selfRegDeadline`, `pricingTable[]`, `participant.relationship` + comentário do modelo cumulativo |
| `src/models/Organization.js` | `preferences.membershipRoles` |
| `src/server.js` | rota `GET /inscrever/:code` + `resolveTenant` em `/api/sessions/register` |
| `src/routes/sessions.js` | rotas do §3; `pricingTable` agora devolvida em `client/verify-code` e `client/photos`; `selfRegLimiter` (30/min/IP) + `checkHoneyPot` + dedupe por WhatsApp no POST; link de inscrição via subdomínio; guard do prazo no `PUT /self-reg` |
| `cliente/js/gallery.js` | `calcExtraCost` cumulativo nos 3 totais (barra de seleção + 2 upsells) + `extrasHelpText` |
| `admin/js/tabs/sessoes/wizard/config-panel.js` | `calcExtraCost` (cópia) + **prévia ao vivo** dos totais ao editar a tabela |
| `site/inscrever/index.html` | página pública de inscrição (form + countdown) + campo honeypot `_hp_trap` |

---

## 6. Bugs corrigidos nesta passagem (vs. a versão original do Gemini)

1. **`pricingTable` era dado morto** — salva no admin mas nunca enviada ao cliente nem usada em nenhum cálculo. Corrigido: backend devolve em `verify-code`/`client/photos`; cliente calcula.
2. **Link de inscrição quebrava multi-tenant** — era path-based (`base/slug/inscrever`); `resolveTenant` resolve por **subdomínio**. Corrigido p/ `https://<slug>.<BASE_DOMAIN>/inscrever/<code>` (espelha o padrão canônico ~`sessions.js` da geração de link de cliente).
3. **POST público sem proteção** — escrita não autenticada com `participants.push` ilimitado. Adicionado rate-limit (30/min/IP, tolera multidão de evento no mesmo Wi-Fi), honeypot e **dedupe por WhatsApp** (reescaneou → devolve código existente com `alreadyRegistered:true`).
4. **`PUT /self-reg` zerava o prazo** ao togglar o "ativar". Corrigido com `if ('selfRegDeadline' in req.body)`.

---

## 7. Pendências / como testar

### Pendências conhecidas (não-bloqueantes)
- **Notificação "fotos prontas via WhatsApp"** é **manual** — não há API de WhatsApp no projeto (só links `wa.me`). O participante tem `phone` mas pode não ter `email`; conferir se o fluxo de entrega não quebra ao notificar participante sem e-mail.
- **Página de sucesso** mostra o código de acesso em vez de redirecionar pro PWA (`/cliente/...`). Divergência do plano original, **não é bug** — exibir o código é UX válida.

### Teste E2E manual (pendente — fazer no canary/beta)
1. Criar sessão `multi_selection`, definir pacote + tabela de preços (ex.: 1→10, 11→8, 16→7). Conferir a **prévia ao vivo** no painel.
2. Ativar auto-inscrição; pegar o link/QR (`/inscrever/:code`).
3. Abrir o link sem login → formulário aparece (capa, nome, countdown, dropdown de parentesco).
4. Inscrever → participante aparece no admin; **reenviar mesmos dados → não duplica** (dedupe por WhatsApp).
5. Upload de fotos → participante acessa a galeria → ao selecionar **além do pacote**, conferir que o **total bate com a prévia do admin** e **só cresce** ao adicionar fotos.
6. Conferir multi-tenant: testar com fotógrafo que **não** é o dono (o link de subdomínio deve resolver o tenant certo).

### Comandos de validação
```bash
node --check src/routes/sessions.js src/models/Session.js cliente/js/gallery.js
node --check --input-type=module < admin/js/tabs/sessoes/wizard/config-panel.js
```

---

## 8. Gotchas para a próxima IA
- **Não commitar às cegas** — working tree compartilhado; rodar `git status`/`git diff` antes.
- `membershipRoles` vive em `Organization.preferences`, **não** em `settings`.
- A regra de preço está **duplicada** em cliente e admin — manter as duas cópias idênticas.
- `BASE_DOMAIN` no `.env` **não** inclui esquema (`beta.cliquezoom.com.br`); a montagem do link já adiciona `https://`.
- Página pública (`site/inscrever/`) usa `alert()` — é permitido (a regra "sem alert/confirm" vale só para `admin/`).
