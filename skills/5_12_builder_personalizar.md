# 5_12 — Builder: Sub-tab Personalizar

> Cobre: estilo visual global do site (`siteStyle`).
> Para arquitetura geral do builder (postMessage, dirty tracking, preview), ver `5_1_builder-geral-site.md`.

---

## Arquivos relevantes

| Arquivo | Função |
|---|---|
| `admin/js/tabs/meu-site.js` | Função `renderPersonalizar()` |
| `src/routes/site.js` | `PUT /api/site/admin/config` |
| `src/models/Organization.js` | Schema `siteStyle` |
| `site/templates/shared-site.js` | Aplica `siteStyle` ao DOM |

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

---

## IDs do DOM (admin)

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
   → window.showConfirm (modal customizado)
   → apiPut('/api/site/admin/config', { siteStyle: {} })
   → configData.siteStyle = {} → renderPersonalizar() re-renderiza
   → liveRefresh({ siteStyle: {} })
```

---

## Rotas backend

| Rota | Body | Efeito |
|---|---|---|
| `PUT /api/site/admin/config` | `{ siteStyle: {...} }` | Salva estilo visual |

---

## Padrões canônicos aplicados

| Padrão | Status |
|---|---|
| Estado isolado (`configData.siteStyle`) | ✅ |
| Save correto (`apiPut /api/site/admin/config`) | ✅ |
| CSS variables (`var(--bg-elevated)`, `var(--border)`, etc.) | ✅ |
| Preview sync (`window._meuSitePostPreview?.()`) | ✅ |
| `window.showConfirm` no reset (sem `confirm()` nativo) | ✅ |

---

## Funcionalidades removidas — não recriar

| Funcionalidade | Motivo |
|---|---|
| Seções Extras (`customSections`) | Removida em 2026-04-18 — não oferecemos mais |
