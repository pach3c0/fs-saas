# Guia — Criar um módulo do Manual do Usuário e publicar (beta → produção)

> **Para quem:** IA assistente (Gemini) que vai escrever novos módulos do **Manual do Usuário**
> do CliqueZoom e inseri-los na plataforma. Este é exatamente o processo usado no módulo
> **Dashboard** (commit `2fb46a9` + `src/utils/seedManualDashboard.js`). **Repita esse padrão.**
>
> **Leia antes:** `CLAUDE.md` (regras gerais) e a doc da aba que você vai documentar
> (`skills/0X_<aba>.md`). 🚫 **Nunca** commitar, dar push ou rodar deploy/seed em servidor
> sem o usuário pedir explicitamente.

---

## 0. O que você entrega

1. Um **script de seed** novo em `src/utils/seedManual<Aba>.js` (espelhando `seedManualDashboard.js`).
2. O conteúdo do módulo escrito **a partir do código real da aba**, em blocos.
3. O módulo **nasce como RASCUNHO** (`isPublished: false`) — invisível pro fotógrafo até o
   superadmin publicar.

Você **não** publica nem deploya. Você prepara o script, valida local e entrega o comando de
seed/deploy pro usuário rodar (ver §4).

---

## 1. Como o Manual funciona (modelo + rotas)

**Modelo:** `src/models/ManualModule.js` — um documento por aba/módulo. É **global** (sem
`organizationId`; o mesmo manual vale pra todos os fotógrafos).

| Campo | Tipo | Observação |
|---|---|---|
| `id` | String, **único** | slug, ex.: `dashboard`, `sessoes`, `clientes` |
| `label` | String | nome exibido, ex.: `Dashboard` |
| `icon` | String | **path** de um ícone Lucide (o `d=` do `<path>`). Use o mesmo ícone da aba no admin |
| `order` | Number | ordem de exibição (crescente) |
| `isPublished` | Boolean | `false` = rascunho (default). Só `true` aparece pro fotógrafo |
| `blocks[]` | Array | o conteúdo (ver §2) |

**Rotas:**
- `GET /api/manual` (pública, `src/routes/manual.js`) → devolve **só `isPublished: true`**,
  ordenado por `order`. É o que o admin do fotógrafo consome em
  `admin/js/tabs/ajuda.js` → aba **"Manual do Usuário"**.
- `/api/saas-admin/admin/manual` (CRUD, **superadmin**, `src/routes/saasAdmin.js`) → lista
  **todos** (incl. rascunhos), cria, atualiza (inclusive togglar `isPublished`), reordena e
  exclui. É aqui que o superadmin revisa e **publica** em **Ajuda & Treinamentos**.

---

## 2. Escrever o conteúdo (a partir do código real)

**Fonte da verdade (nesta ordem):**
1. O código real da aba: `admin/js/tabs/<aba>.js` (ou a pasta `tabs/<aba>/` se for grande).
   Documente **o que existe de verdade na tela**, não o que deveria existir.
2. A doc técnica do módulo: `skills/0X_<aba>.md`.

**Voz e copy:**
- Português do Brasil, **na voz do fotógrafo** (o usuário do painel), linguagem simples, sem jargão técnico.
- Regra de marca: **nunca** use a palavra "estúdio" na copy do fotógrafo → use **"negócio"**
  (exceção: a seção "Estúdio" do site público). Ver `feedback_linguagem_estudio`.
- Não invente botões/campos que não existem no código.

### Tipos de bloco (`blocks[]`)

| `type` | Campos | Para quê |
|---|---|---|
| `intro` | `content` | parágrafo de abertura do módulo |
| `callout` | `content`, `color` | destaque colorido (dica, aviso, atenção) |
| `steps` | `steps[]` | passo a passo numerado |
| `image` | `url`, `caption?` | captura de tela real em `/uploads` (opcional) |

`callout.color` ∈ `accent` | `green` | `yellow` | `red` (qualquer outro vira `accent`).

Cada item de `steps[]`: `{ n, who, title, desc }`
- `n`: número do passo (1, 2, 3…).
- `who`: `fotógrafo` | `cliente` | `sistema` (quem faz/origem da ação).
- `title`: título curto do passo.
- `desc`: descrição.
- (`color` existe no schema mas na prática é sempre `accent` — pode omitir.)

**Limites** (validação defensiva em `src/services/agentActions.js → sanitizeBlocks`):
`intro`/`callout` `content` ≤ 4000 · step `title` ≤ 200 · step `desc` ≤ 1000 · ≤ 30 blocos por módulo.

> Modelo de qualidade a seguir: leia os `BLOCKS` de `src/utils/seedManualDashboard.js`. É o
> padrão de tom, granularidade e uso de `callout`/`steps`. Copie esse nível.

---

## 3. Criar o script de seed (template)

Crie `src/utils/seedManual<Aba>.js` copiando a estrutura abaixo (idêntica à do Dashboard).
Características obrigatórias: **standalone**, **idempotente**, **nasce como rascunho**, e ao
re-rodar **atualiza o conteúdo mas preserva `isPublished` e `order`**.

```js
/**
 * Script standalone — cria/atualiza o módulo de manual "<Aba>" a partir da
 * varredura do código real (admin/js/tabs/<aba>.js). Nasce como RASCUNHO
 * (isPublished:false) para o superadmin revisar e publicar em Ajuda & Treinamentos.
 * Uso: node src/utils/seedManual<Aba>.js
 * Idempotente: re-executar atualiza o conteúdo, preserva isPublished e order.
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true });

const mongoose = require('mongoose');
const ManualModule = require('../models/ManualModule');

const ID = '<aba>';                 // slug único, ex.: 'sessoes'
const LABEL = '<Aba>';              // ex.: 'Sessões'
const ICON = 'M...';                // path do ícone Lucide igual ao da aba no admin

const BLOCKS = [
  { type: 'intro', content: '...' },
  { type: 'callout', color: 'accent', content: '...' },
  {
    type: 'steps',
    steps: [
      { n: 1, who: 'fotógrafo', title: '...', desc: '...' },
      // ...
    ]
  }
];

async function run() {
  if (!process.env.MONGODB_URI) console.log('Aviso: MONGODB_URI não definido — usando localhost.');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cliquezoom');
  console.log('Conectado ao MongoDB');

  const existing = await ManualModule.findOne({ id: ID });
  if (existing) {
    existing.label = LABEL;
    existing.icon = ICON;
    existing.blocks = BLOCKS;
    await existing.save(); // preserva isPublished e order
    console.log(`Módulo "${ID}" atualizado (isPublished=${existing.isPublished}, order=${existing.order}).`);
  } else {
    const last = await ManualModule.findOne().sort({ order: -1 }).select('order').lean();
    const order = (last?.order || 0) + 1;
    await ManualModule.create({ id: ID, label: LABEL, icon: ICON, order, isPublished: false, blocks: BLOCKS });
    console.log(`Módulo "${ID}" criado como RASCUNHO (isPublished=false, order=${order}). Revise e publique em Ajuda & Treinamentos.`);
  }

  await mongoose.disconnect();
  console.log('Concluído.');
}

run().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
```

**Observações:**
- Este é um **script CLI standalone**, fora do ciclo de request do Express → aqui `console.log`
  é aceitável (a regra "use `req.logger`, nunca `console.log`" vale pro código de runtime, não
  pra um seed de linha de comando).
- Conecta via `process.env.MONGODB_URI` do `.env` → **o banco depende do `.env` do ambiente**
  onde você roda (ver §4). Local = `cliquezoom-dev`.
- Valide a sintaxe antes de qualquer coisa: `node --check src/utils/seedManual<Aba>.js`.
- **Ícone:** pegue o `d=` do `<path>` Lucide que a própria aba usa na sidebar do admin (procure
  no código do admin) ou copie de lucide.dev. Ex. (Dashboard): `M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z`.

---

## 4. Pipeline "primeiro beta, depois produção"

### ⚠️ A pegadinha que você PRECISA entender: beta e prod compartilham o MESMO banco

- **Local (dev):** `.env` → `cliquezoom-dev` (banco isolado, seu playground).
- **Beta (servidor `cliquezoom-beta`, porta 3052, `/var/www/cz-saas-beta`):** `.env` →
  **mesmo MongoDB de produção** (`cliquezoom`).
- **Produção (`cliquezoom-saas`, porta 3051, `/var/www/cz-saas`):** `cliquezoom`.

Consequências (leia com atenção):
1. Rodar o seed **no servidor beta JÁ grava no banco que a produção lê**. A segurança **não**
   vem de banco separado — vem do **`isPublished: false`**: a rota pública `/api/manual` só
   devolve publicados, então o fotógrafo (a Flávia está ativa em prod) **não vê o rascunho**.
2. 🔴 **Publicar (`isPublished: true`) torna o módulo público IMEDIATAMENTE para a produção
   também**, porque o banco é o mesmo. **Não publique durante a validação no beta.** A publicação
   é o último passo, deliberado, feito pelo superadmin quando estiver pronto pra todos.

### Onde validar a aparência publicada SEM expor pra ninguém

Faça isso **no local** (`cliquezoom-dev`, banco isolado): rode o seed, publique **só no dev**
(togglar pelo painel SaaS Admin local ou um update pontual no dev) e veja como fica em
**Ajuda → "Manual do Usuário"** no admin local. Depois **volte pra rascunho** antes de mexer em
beta/prod. Assim você confere o render publicado sem risco.

### As etapas (entregue os comandos pro usuário rodar — você não deploya)

**Etapa 0 — Local (`cliquezoom-dev`)**
```bash
node --check src/utils/seedManual<Aba>.js          # sintaxe
node src/utils/seedManual<Aba>.js                  # cria o rascunho no banco dev
```
Valide o conteúdo (preview publicado isolado, conforme acima). Ajuste os blocos e re-rode
(idempotente) até ficar bom.

**Etapa 1 — Beta (branch `beta`)** — *só com o usuário pedindo*
- Commitar o novo script na branch **`beta`** e dar push.
- Deploy do beta + rodar o seed lá (escreve o rascunho no banco compartilhado):
  ```bash
  cd /var/www/cz-saas-beta && git pull && pm2 reload cliquezoom-beta --update-env
  node src/utils/seedManual<Aba>.js
  ```
- Superadmin revisa o rascunho no **SaaS Admin → Ajuda & Treinamentos** (lá aparecem os
  rascunhos). **Mantém como rascunho.**

**Etapa 2 — Produção (merge `beta` → `main`)** — *só com o usuário pedindo*
- Depois de validado, `git checkout main && git merge beta` + push, e deploy de prod:
  ```bash
  cd /var/www/cz-saas && git pull && pm2 reload ecosystem.config.js --env production --update-env
  ```
- O rascunho **já está no banco** (compartilhado desde a Etapa 1). Rodar o seed em prod é
  **opcional** (idempotente) — não muda nada se já rodou no beta.

**Etapa 3 — Publicar (o "ir pra produção" de verdade)**
- O **superadmin** liga `isPublished: true` pelo **SaaS Admin → Ajuda & Treinamentos**.
- Nesse instante o módulo aparece pra **todos os fotógrafos**. É a única ação que torna público.

> Resumo: o **código** do seed segue o trilho `beta → main`; o **rascunho** é a rede de
> segurança (invisível até publicar); "produção" = o superadmin clicar em publicar, por último.

---

## 5. Checklist final

- [ ] Conteúdo escrito a partir do **código real** da aba (`admin/js/tabs/<aba>.js`), na voz do fotógrafo.
- [ ] Sem a palavra "estúdio" na copy → "negócio".
- [ ] Blocos dentro dos limites (§2); `callout.color` e `step.who` com valores válidos.
- [ ] `id` único (não colide com módulo existente); `label` e `icon` corretos.
- [ ] Script segue o template (§3): standalone, idempotente, nasce **rascunho**, preserva `isPublished`/`order`.
- [ ] `node --check` OK.
- [ ] Rodado e validado no **local** (`cliquezoom-dev`).
- [ ] **Não** publicou (`isPublished` segue `false`) — publicação é decisão do superadmin, no fim.
- [ ] **Não** commitou/pushou/deployou/rodou seed em servidor sem o usuário pedir.

---

## 6. Regras do projeto que se aplicam

- **Backend:** CommonJS (`require` no topo), `fs.promises` (nunca `Sync`), `.lean()` em leituras.
  (O seed é CLI standalone → `console.log` ok aqui; runtime continua usando `req.logger`.)
- **Multi-tenant não se aplica:** `ManualModule` é global, sem `organizationId`.
- Código e copy em **PT-BR**.
- 🚫 **Nunca** commitar/push/deploy/rodar seed em servidor sem pedido explícito do usuário.
- Detalhes do ambiente beta: `deploy/BETA-CANARY-RUNBOOK.md`.
