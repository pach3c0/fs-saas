# 5_6 — Builder: Sub-tab Serviços

> Cobre: lista de serviços com emoji/preço em `siteContent.servicos`.

---

## Arquivos relevantes

| Arquivo | Função |
|---|---|
| `admin/js/tabs/meu-site.js` | UI e lógica (~linhas 1107-1198) |
| `src/routes/site.js` | `PUT /api/site/admin/config` |
| `src/models/Organization.js` | Schema `siteContent.servicos[]` |
| `site/templates/shared-site.js` | Renderização no site público |

---

## Estrutura de dados

```js
// Organization.siteContent.servicos
[{
  title: String,        // nome do serviço
  description: String,  // texto descritivo
  icon: String,         // emoji (padrão '📸')
  price: String         // texto livre, ex: "500" ou "R$ 500"
}]
```

Sem campo `id`. Ordem do array = ordem de exibição.

---

## Fluxo do usuário

1. Usuário clica em "Serviços" no menu lateral → `renderServicos()` monta lista em `#config-servicos`
2. Cada serviço exibe inputs: título, descrição (textarea 2 linhas), ícone (emoji), preço
3. **Adicionar:** botão "Adicionar Serviço" faz `servicos.push({ title:'Novo Serviço', icon:'📸', ... })` + re-render
4. **Remover:** ícone 🗑️ chama `deleteServico(idx)` → `showConfirm` → `splice` + re-render
5. **Salvar:** coleta todos os inputs via `[data-srv-title="${idx}"]` etc. → `apiPut('/api/site/admin/config', { siteContent: { servicos: updated } })`
6. Backend faz `$set` em `Organization.siteContent.servicos` (merge inteligente, não sobrescreve outros campos)
7. `liveRefresh({ siteContent: { servicos: updated } })` → `postPreviewData()` → iframe atualiza via postMessage

---

## Site público (`shared-site.js`)

- Lê `data.siteContent.servicos`
- Renderiza em `#servicosGrid` dentro de `#section-servicos`
- Template: `.servico-card` com `.servico-icon`, `.servico-info` (h3 + p), `.servico-price`
- Grid 3 colunas desktop / 1 coluna mobile
- Usa `esc()` para prevenir XSS no título e descrição; ícone emoji renderizado direto

---

## Padrões e armadilhas

- **Ícones são emojis**, não FontAwesome. O campo `icon` é texto livre.
- **Sem drag-and-drop.** Reordenar requer deletar e recriar na ordem desejada.
- **Dirty tracking** ativo: `captureOriginalValues` + `setupDirtyTracking` evitam perda de dados ao navegar.
- **Preview sync:** `liveRefresh()` chama `postPreviewData()` após salvar — não usar `window._meuSitePostPreview?.()` diretamente aqui (já encapsulado no liveRefresh).
- **Preço é texto** — o site público exibe exatamente o que foi digitado, sem formatação automática.
