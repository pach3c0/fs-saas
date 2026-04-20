# Builder — Sub-tab FAQ (`5_11`)

> Leia `5_1_builder-geral-site.md` para contexto global (builder mode, postMessage, dirty tracking).
> Padrões gerais de frontend: `1_2_frontend.md`.

---

## Responsável

`admin/js/tabs/faq.js` · `data-target="config-faq"`

---

## Estrutura de dados

| Campo | Modelo | Rota |
|---|---|---|
| `siteContent.faq` | `Organization.siteContent.faq` (array) | `PUT /api/site/admin/config` |

Cada item:
```js
{ id: string, question: string, answer: string }
```

Estado isolado: `let _faqItems = null` — carregado uma única vez na primeira render via `apiGet('/api/site/admin/config')`.

---

## Fluxo do usuário

1. Usuário abre sub-tab FAQ → `renderFaq(container)` carrega `_faqItems` de `config.siteContent.faq`
2. Se lista vazia, preenche com `DEFAULT_FAQS` (6 perguntas padrão com `generateId()`)
3. Usuário edita pergunta/resposta nos inputs ou clica **+ Adicionar** → novo item empurrado em `_faqItems` e re-renderizado
4. Clica **Salvar FAQ** → lê todos `[data-faq-question]` / `[data-faq-answer]` do DOM, reconstrói `_faqItems`
5. `apiPut('/api/site/admin/config', { siteContent: { faq: _faqItems } })`
6. Backend faz `$set` em `Organization.siteContent.faq`
7. `window._meuSitePostPreview?.()` → iframe atualiza em tempo real
8. Usuário clica 🗑️ → `showConfirm` → `splice` do item → `saveFaq(silent=true)` → re-render

---

## Funções exportadas

| Função | Descrição |
|---|---|
| `renderFaq(container)` | Renderiza o painel completo; re-entrante (re-render após add/delete) |

Função interna:
- `saveFaq(silent?)` — persiste `_faqItems` via `apiPut` + dispara preview sync

---

## Armadilhas conhecidas

| Sintoma | Causa | Fix |
|---|---|---|
| IDs regenerados a cada save | `saveFaq` usa `generateId()` no rebuild do array | Comportamento esperado — IDs são só para keying interno, não persistidos com semântica |
| FAQ vazio ao abrir pela primeira vez | `siteContent.faq` ausente no banco | `DEFAULT_FAQS` é aplicado automaticamente se array vazio |
| Preview não atualiza após deletar | `saveFaq(silent=true)` ainda chama `_meuSitePostPreview` | Correto — não confundir `silent` (sem toast) com sem preview |
| Barra de rolagem horizontal + botão 🗑️ sumindo atrás do preview | `input[data-faq-question]` com `flex:1` sem `min-width:0` causa overflow do flex item | Sempre incluir `min-width:0` em inputs dentro de flex row: `style="flex:1; min-width:0; ..."` |
