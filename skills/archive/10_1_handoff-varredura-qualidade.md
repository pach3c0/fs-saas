# Handoff — Varredura de Qualidade Final (pré-deploy)

## Contexto do projeto

**CliqueZoom** — plataforma SaaS para fotógrafos. Stack:
- **Backend:** Express + MongoDB, CommonJS (`require` no topo)
- **Admin:** Vanilla JS ES Modules (`import/export`), dual-theme (light/dark via `[data-theme]`)
- **PWA Cliente:** Vanilla JS
- **Site público:** HTML renderizado dinamicamente

**Pasta raiz:** `/Users/macbook/Documents/ProjetoEstudio/FsSaaS`  
**Produção real ativa:** uma fotógrafa (Flávia) com clientes reais — nenhuma alteração que quebre dados ou fluxos ativos.

---

## O que já foi feito (não re-auditar)

As tarefas abaixo foram concluídas em sessões anteriores. Não é necessário revisitá-las:

- `require()` inline movidos para o topo em todos os arquivos de rotas ✅
- `console.error` nas rotas trocados por `req.logger.error` ✅
- `.lean()` adicionado em leituras puras de rotas críticas ✅
- `alert/confirm/prompt` substituídos por `showToast/showConfirm` nas tabs ativas ✅
- Hexcodes nas tabs `sessoes/`, `clientes.js`, `dashboard.js`, `mensagens.js`, `plano.js`, `marketing.js`, `integracoes.js`, `dominio.js`, `perfil.js`, `configuracoes.js` ✅ (auditados — restam só falsos positivos nesses arquivos)
- Campos do formulário de depoimento uniformizados para PT-BR (nome/texto) ✅
- Testes Playwright `3_0_sessoes.spec.js` reescritos para o wizard ✅

---

## Tarefa desta IA

Realizar uma **varredura de qualidade focada** nos pontos abaixo. Para cada achado: ler o arquivo, aplicar a correção mínima e registrar o que foi feito. Ao final, atualizar `CLAUDE.md` com um resumo dos fixes.

**Prioridade:** Alta → Média → Baixa (na ordem da seção abaixo).

---

## 1. ALTA — Hexcodes hardcoded quebram dark mode

Regra: todo estilo inline em tabs do admin deve usar tokens CSS (`var(--token)`), nunca `#hex` soltos.

**Tokens disponíveis:**
```
var(--text-primary)    → #1a1a1a / #f2f2f2
var(--text-secondary)  → #4b5563 / #a0a0a0  (aproximado)
var(--text-muted)      → #9ca3af / #6b6b6b
var(--bg-base)         → #e8e8eb / #2a2a2c
var(--bg-surface)      → #f1f1f3 / #323234
var(--border)          → borda padrão
var(--green)           → #3fb950
var(--red)             → #f85149
var(--yellow)          → #d29922
var(--orange)          → #ffa657
var(--purple)          → purple
var(--accent)          → #1a1a1a / #f2f2f2
```

Para `rgba(R,G,B,alpha)` de status, usar:
```
color-mix(in srgb, var(--red) 15%, transparent)
color-mix(in srgb, var(--green) 10%, transparent)
```

### 1a. `admin/js/tabs/estudio.js` — 7 ocorrências reais

Grep de confirmação:
```bash
grep -n "style.*#[0-9a-fA-F]\{3,6\}" admin/js/tabs/estudio.js | grep -v "var(--"
```

Correções a aplicar (replace_all onde aplicável):
| Linha aprox. | Hex | Substituir por |
|---|---|---|
| 126 | `color:#9ca3af` | `color:var(--text-muted)` |
| 134, 139, 150, 154, 159 | `color:#6b7280` | `color:var(--text-muted)` |
| 241 | `background:rgba(248,81,73,0.15)` | `background:color-mix(in srgb, var(--red) 15%, transparent)` |
| 241 | `border:1px solid rgba(248,81,73,0.3)` | `border:1px solid color-mix(in srgb, var(--red) 30%, transparent)` |
| 241 | `color:#f85149` | `color:var(--red)` |

### 1b. `admin/js/tabs/meu-site.js` — avaliar e corrigir seletivamente

O `meu-site.js` tem 81 ocorrências `style.*#hex`, mas a maioria está em:
- Blocos `var(--token, #fallback)` — **legítimos, manter**
- Iframe builder com tema dark fixo (sidebar de edição) — elementos com `color:#f3f4f6`, `color:#9ca3af`, `color:#6b7280`, `color:#4b5563` — **esses quebram no light mode, corrigir**

Grep de confirmação (exclui fallbacks `var(--`):
```bash
grep -n "style.*#[0-9a-fA-F]\{3,6\}" admin/js/tabs/meu-site.js | grep -v "var(--\|color-mix"
```

Padrão a substituir (`replace_all: true` em cada):
- `color:#f3f4f6` → `color:var(--text-primary)` (**NÃO** substituir onde o contexto for o iframe do site público renderizado — verificar se está dentro de uma string template que injeta no iframe externo)
- `color:#9ca3af` → `color:var(--text-muted)`
- `color:#6b7280` → `color:var(--text-muted)`
- `color:#4b5563` → `color:var(--text-secondary)`
- `border-top: 2px solid #3b82f6` (linha dragover) → `border-top: 2px solid var(--accent)`

**⚠️ Atenção:** as linhas que estão dentro de `innerHTML` que é injetado no **iframe do preview do site** (não no painel admin) podem ter cores fixas intencionais para representar a aparência do site do cliente. Antes de substituir, verificar se o template string é destinado ao painel admin ou ao iframe.

### 1c. Outros arquivos com 1–10 ocorrências

Executar grep nos arquivos abaixo e aplicar as mesmas substituições de token:

```bash
grep -n "style.*#[0-9a-fA-F]\{3,6\}" \
  admin/js/tabs/albuns.js \
  admin/js/tabs/albuns-prova.js \
  admin/js/tabs/sobre.js \
  admin/js/tabs/hero.js \
  admin/js/tabs/faq.js \
  admin/js/tabs/portfolio.js \
  admin/js/tabs/cliente.js \
  | grep -v "var(--\|color-mix"
```

Para cada ocorrência: substituir `#9ca3af`/`#6b7280`/`#4b5563` → `var(--text-muted)` ou `var(--text-secondary)`. Hexcodes `#000`, `#fff` em contextos de preview visual (thumbnails, ícones) podem ser mantidos — são neutros absolutos.

### 1d. `admin/js/tabs/ajuda.js` — 27 ocorrências

Atenção: `ajuda.js` tem mini-previews visuais (mock de wizard, mock de site). Algumas cores fixas são **intencionais** para o aspecto de "screenshot" — ex: `#000000` em fundos de vídeo, `var(--accent-on, #ffffff)` como fallback.

Grep:
```bash
grep -n "style.*#[0-9a-fA-F]\{3,6\}" admin/js/tabs/ajuda.js | grep -v "var(--\|color-mix"
```

Corrigir apenas os que são cores de texto/UI (grays como `#9ca3af`, `#6b7280`). Deixar os que são backgrounds de preview visual (`#000`, `rgba(0,0,0,...)` em mini-previews de vídeo/hero).

---

## 2. MÉDIA — `fs.readFileSync` em rota de produção

**Arquivo:** `src/routes/platformUpdates.js`, linha ~12

```js
const pkgData = fs.readFileSync(pkgPath, 'utf8');
```

Este `readFileSync` está num bloco `try/catch` no **nível de módulo** (executa uma vez na inicialização do processo, não dentro de request handlers). É aceitável, mas viola a regra do projeto ("nunca I/O síncrono"). 

**Correção:** mover para leitura assíncrona com `fs.promises.readFile` em uma função `init()` que popula `platformVersion` antes do servidor iniciar, ou simplesmente trocar por leitura do `package.json` via `require()` (que já faz cache):

```js
// Alternativa mais simples — require() faz cache, não é I/O repetido:
let platformVersion = '1.0.0';
try {
  const pkg = require('../../package.json');
  platformVersion = pkg.version || '1.0.0';
} catch (err) { /* fallback seguro */ }
```

---

## 3. BAIXA — `console.log` em server.js

**Arquivo:** `src/server.js`, linha ~443:
```js
console.log(`Servidor rodando na porta ${PORT}`);
```

O logger Winston já está configurado em `src/utils/logger.js`. Substituir por:
```js
logger.info(`Servidor rodando na porta ${PORT}`);
```

Verificar se `logger` está importado no topo de `server.js`. Se não, importar:
```js
const logger = require('./utils/logger');
```

**Nota:** Os outros `console.log` encontrados são em scripts standalone (`src/utils/updateLandingCortesia.js`, `src/scripts/create-mock-tutorial.js`, `src/scripts/create-superadmin.js`) — esses são corretos (scripts de linha de comando, sem acesso ao logger de requisição).

---

## 4. BAIXA — Verificar `.lean()` em rotas não auditadas

As rotas a seguir NÃO passaram pela auditoria completa de `.lean()` na sessão anterior. Verificar `findById`/`findOne`/`find()` em **leituras puras** (sem update subsequente no mesmo documento):

```
src/routes/announcements.js
src/routes/partnerBanners.js
src/routes/platformUpdates.js
src/routes/sessionCardBackgrounds.js
src/routes/tutorials.js
src/routes/manual.js
src/routes/tickets.js
src/routes/gestao.js
```

**Regra:** se o resultado de `findOne/findById/find` é usado **somente para leitura** (sem `doc.save()` ou `doc.set()` depois), adicionar `.lean()` ao final da query.

Grep de partida:
```bash
grep -n "\.findOne\|\.findById\|\.find(" src/routes/announcements.js src/routes/partnerBanners.js src/routes/platformUpdates.js src/routes/sessionCardBackgrounds.js src/routes/tutorials.js src/routes/manual.js src/routes/tickets.js src/routes/gestao.js | grep -v "\.lean()\|update\|Update\|findOneAndUpdate\|findByIdAndUpdate\|findOneAndDelete"
```

---

## 5. BAIXA — Verificar `findOneAndUpdate` com `new:true` (deprecation)

Em algumas rotas pode ainda existir o padrão antigo:
```js
{ new: true }  // deprecated no Mongoose 7+
```

Deve ser:
```js
{ returnDocument: 'after' }
```

Grep:
```bash
grep -rn "new: true\|new:true" src/routes/ src/utils/ | grep -v node_modules
```

Se houver ocorrências, substituir por `returnDocument: 'after'`.

---

## Arquivos a NÃO mexer

- `site/templates/` — qualquer mudança pode quebrar o site público da Flávia
- `cliente/` — PWA ativo com clientes reais
- `src/models/` — sem alterações de schema (podem quebrar dados existentes)
- `saas-admin/` — painel superadmin, mudanças só com contexto completo
- `nginx/`, configurações de servidor — proibido
- Scripts em `src/scripts/` e `src/utils/update*.js` — são standalone, console.log é esperado

---

## Padrões de código do projeto

### Backend (`src/`)
```js
// ✅ Correto
const X = require('./path');           // require no topo
const doc = await Model.findById(id).lean();  // .lean() em leituras
req.logger.info('msg');               // logger via req

// ❌ Errado
if (cond) const Y = require('./y');   // require inline
const doc = await Model.findById(id); // sem .lean() em leitura pura
console.log('debug');                 // console.log na rota
```

### Admin (`admin/js/tabs/`)
```js
// ✅ Correto
import { fn } from '../utils/api.js';             // ES Module
el.style.color = 'var(--text-muted)';             // token CSS
window.showToast('msg', 'success');               // sem alert
window.showConfirm('pergunta', opts);             // sem confirm

// ❌ Errado
el.style.color = '#9ca3af';   // hexcode hardcoded — quebra dark mode
alert('msg');                 // nativo proibido
confirm('?');                 // nativo proibido
```

---

## Entrega esperada

1. Aplicar os fixes das seções 1–5 diretamente nos arquivos
2. Após cada arquivo corrigido, verificar com grep que não sobraram ocorrências do padrão
3. Atualizar `CLAUDE.md` no final — adicionar uma seção "✅ Varredura de Qualidade (pré-deploy)" em "Concluído" com a data e lista de fixes aplicados
4. **Não fazer commit/push** — aguardar pedido explícito do usuário

---

## Como iniciar

```bash
# 1. Confirmar estado atual do repo
cd /Users/macbook/Documents/ProjetoEstudio/FsSaaS
git status

# 2. Começar pelos hexcodes em estudio.js (menor risco, impacto direto no dark mode)
# 3. Avançar para meu-site.js (maior volume, requer atenção ao contexto iframe)
# 4. Rotas menores
# 5. server.js console.log + platformUpdates.js readFileSync
# 6. .lean() nas rotas não auditadas
# 7. findOneAndUpdate new:true residual
```
