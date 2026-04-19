# 5_12 — Builder: Sub-tab Personalizar

> Cobre: estilo visual global do site (`siteStyle`) e seções extras customizadas (`siteContent.customSections`).
> Para arquitetura geral do builder (postMessage, dirty tracking, preview), ver `5_1_builder-geral-site.md`.

---

## Arquivos relevantes

| Arquivo | Função |
|---|---|
| `admin/js/tabs/meu-site.js` | Função `renderPersonalizar()` (~linhas 1406–1694) |
| `src/routes/site.js` | `PUT /api/site/admin/config` |
| `src/models/Organization.js` | Schema `siteStyle` e `siteContent.customSections` |
| `site/templates/shared-site.js` | Aplica `siteStyle` ao DOM e renderiza `customSections` |

---

## Estrutura de dados

### `Organization.siteStyle`
```js
{
  accentColor: String,   // cor principal (padrão: '#c9a96e')
  bgColor:     String,   // cor de fundo (padrão: '#fafafa')
  textColor:   String,   // cor do texto (padrão: '#111827')
  fontFamily:  String,   // família de fonte (vazio = padrão do tema)
}
```
Salvo via `PUT /api/site/admin/config` com chave `siteStyle` (não dentro de `siteContent`).

### `Organization.siteContent.customSections` (Array)
```js
[{
  id:        String,   // gerado: Date.now().toString(36) + random
  type:      String,   // 'texto' | 'texto-imagem' | 'galeria' | 'chamada' | 'lista'
  title:     String,
  content:   String,   // texto livre ou itens da lista (um por linha)
  imageUrl:  String,   // só para tipo 'texto-imagem'
  items:     Array,    // [{ text }] — derivado de content.split('\n') para tipo 'lista'
  bgColor:   String,   // cor de fundo da seção (opcional)
  textColor: String,   // cor do texto da seção (opcional)
  order:     Number,
}]
```

---

## IDs do DOM (admin)

### Estilo Visual
| ID | Tipo | Descrição |
|---|---|---|
| `#styleAccentColor` | `<input type="color">` | Cor principal |
| `#styleAccentColorText` | `<span>` | Preview hex da cor principal |
| `#styleBgColor` | `<input type="color">` | Cor de fundo |
| `#styleBgColorText` | `<span>` | Preview hex |
| `#styleTextColor` | `<input type="color">` | Cor do texto |
| `#styleTextColorText` | `<span>` | Preview hex |
| `#styleFontFamily` | `<select>` | Família de fonte |
| `#stylePalettePreview` | `<div>` | Preview visual da paleta em tempo real |
| `#saveStyleBtn` | `<button>` | Salva `siteStyle` |
| `#resetStyleBtn` | `<button>` | Reseta `siteStyle` para `{}` |

### Seções Extras
| Seletor | Tipo | Descrição |
|---|---|---|
| `#addCustomSecBtn` | `<button>` | Abre dropdown para escolher tipo |
| `#addCustomSecDropdown` | `<div>` | Menu suspenso com os 5 tipos |
| `#customSectionsList` | `<div>` | Container das seções existentes |
| `#saveCustomSectionsBtn` | `<button>` | Salva array `customSections` |
| `[data-cs-title="${idx}"]` | `<input>` | Título da seção |
| `[data-cs-content="${idx}"]` | `<textarea>` | Conteúdo/texto |
| `[data-cs-img="${idx}"]` | `<input hidden>` | URL da imagem (tipo texto-imagem) |
| `[data-cs-img-upload="${idx}"]` | `<input file>` | Upload da imagem |
| `[data-cs-bg="${idx}"]` | `<input color>` | Cor de fundo da seção |
| `[data-cs-text="${idx}"]` | `<input color>` | Cor de texto da seção |

---

## Tipos de seção customizada

| Tipo | Label | Campos extras |
|---|---|---|
| `texto` | 📄 Texto Simples | `content` (textarea) |
| `texto-imagem` | 🖼️ Texto + Imagem | `content` + `imageUrl` (upload) |
| `galeria` | 📷 Mini Galeria | só `title` (galeria gerida separadamente) |
| `chamada` | 🎯 Chamada para Ação | `content` (textarea) |
| `lista` | 📋 Lista de Itens | `content` (um item por linha → `items[]`) |

---

## Fontes disponíveis

| Valor | Label exibido |
|---|---|
| `''` (vazio) | Padrão do Tema |
| `'Inter', sans-serif` | Inter (Moderno) |
| `'Poppins', sans-serif` | Poppins (Elegante) |
| `'Playfair Display', serif` | Playfair Display (Clássico) |
| `'Lato', sans-serif` | Lato (Clean) |
| `'Montserrat', sans-serif` | Montserrat (Bold) |
| `'Raleway', sans-serif` | Raleway (Sofisticado) |
| `Georgia, serif` | Georgia (Serif) |

---

## Fluxo do usuário

### Estilo Visual
```
1. Usuário abre sub-tab "Personalizar"
   → renderPersonalizar() lê configData.siteStyle
   → preenche color pickers e select de fonte

2. Usuário altera qualquer cor (oninput)
   → updatePalettePreview() atualiza #stylePalettePreview em tempo real
   → window._meuSitePostPreview?.() → iframe atualiza

3. Usuário clica "Salvar Estilo"
   → apiPut('/api/site/admin/config', { siteStyle: newStyle })
   → clearDirty() + captureOriginalValues()
   → liveRefresh({ siteStyle }) → iframe atualiza

4. Usuário clica "Resetar Padrão"
   → confirm() nativo (⚠️ ver armadilha 1)
   → apiPut('/api/site/admin/config', { siteStyle: {} })
   → liveRefresh({ siteStyle: {} })
```

### Seções Extras
```
1. Usuário clica "+ Nova Seção" → dropdown abre
2. Seleciona tipo → addCustomSection(type) → push no array local → renderCustomList()
3. Usuário preenche campos (título, conteúdo, cores)
   → tipo 'texto-imagem': upload de imagem via uploadImage() → armazena URL em data-cs-img
   → tipo 'lista': um item por linha no textarea
4. Usuário clica "Salvar Seções Extras"
   → coleta todos os inputs por índice
   → apiPut('/api/site/admin/config', { siteContent: { customSections: updated } })
   → liveRefresh({ siteContent: { customSections: updated } })
```

---

## Rotas backend

| Rota | Body | Efeito |
|---|---|---|
| `PUT /api/site/admin/config` | `{ siteStyle: {...} }` | Salva estilo visual |
| `PUT /api/site/admin/config` | `{ siteContent: { customSections: [...] } }` | Salva seções extras |

---

## Armadilhas

### 1. `confirm()` nativo no reset
O botão "Resetar Padrão" usa `confirm()` nativo (violação da regra do CLAUDE.md que exige `window.showConfirm`). Ao refatorar, substituir por `await window.showConfirm(...)`.

### 2. `deleteCustomSection` usa `confirm()` nativo
Mesma violação. Corrigir com `window.showConfirm` quando refatorar.

### 3. Hexcodes hardcoded na UI do módulo
O módulo Personalizar usa hexcodes hardcoded no HTML gerado (`#1f2937`, `#374151`, `#9ca3af`, etc.) em vez de CSS variables — inconsistente com o padrão canônico. Está na lista de refatoração futura.

### 4. `siteStyle` salvo na raiz, não em `siteContent`
Diferente de outras sub-tabs, o estilo visual usa `{ siteStyle: {...} }` diretamente, não `{ siteContent: { siteStyle: {...} } }`. O backend trata isso corretamente.

### 5. Seções Extras não têm dirty tracking completo
O dirty tracking é configurado (`setupDirtyTracking`) mas o save de seções customizadas não chama `clearDirty()` ou `captureOriginalValues()` explicitamente — apenas o save do estilo faz isso.
