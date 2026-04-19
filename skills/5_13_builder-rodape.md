# 5_13 — Builder: Sub-tab Rodapé

> Cobre: rodapé do site público — copyright, redes sociais e links úteis em `siteContent.footer`.
> Para arquitetura geral do builder (postMessage, dirty tracking, preview), ver `5_1_builder-geral-site.md`.

---

## Nota de arquitetura

O Rodapé **era uma tab separada** na sidebar do admin (`footer.js`), mas passou a fazer parte do grupo **Meu Site** como sub-tab do builder. O arquivo `admin/js/tabs/footer.js` ainda existe e é a implementação atual — ele é carregado via `switchTab('footer')` mas está conceitualmente dentro do módulo de site.

---

## Arquivos relevantes

| Arquivo | Função |
|---|---|
| `admin/js/tabs/footer.js` | Implementação completa da sub-tab |
| `src/routes/site.js` | `PUT /api/site/admin/config` |
| `src/models/Organization.js` | Schema `siteContent.footer` |
| `site/templates/shared-site.js` | Renderiza rodapé com redes sociais, copyright e links |

---

## Estrutura de dados

### `Organization.siteContent.footer`
```js
{
  copyright:   String,  // ex: "© 2026 CliqueZoom. Todos os direitos reservados."
  socialMedia: {
    instagram: String,  // URL completa
    facebook:  String,
    linkedin:  String,
    tiktok:    String,
    youtube:   String,
    email:     String,  // endereço de email (não URL)
  },
  quickLinks: [
    { label: String, url: String }  // ex: { label: 'Portfolio', url: '#portfolio' }
  ]
}
```

---

## IDs do DOM (admin)

| ID | Tipo | Descrição |
|---|---|---|
| `#footerCopyright` | `<input>` | Texto de copyright |
| `#socialInstagram` | `<input>` | URL Instagram |
| `#socialFacebook` | `<input>` | URL Facebook |
| `#socialLinkedin` | `<input>` | URL LinkedIn |
| `#socialTiktok` | `<input>` | URL TikTok |
| `#socialYoutube` | `<input>` | URL YouTube |
| `#socialEmail` | `<input type="email">` | Endereço de e-mail |
| `#addLinkBtn` | `<button>` | Adiciona novo link útil ao array |
| `#linksList` | `<div>` | Container dos links com inputs |
| `#saveFooterBtn` | `<button>` | Salva tudo via API |

### Campos por link (`idx`)
| Seletor | Tipo | Descrição |
|---|---|---|
| `[data-link-label="${idx}"]` | `<input>` | Texto do link |
| `[data-link-url="${idx}"]` | `<input>` | URL do link |
| `onclick="removeFooterLink(${idx})"` | `<button>` | Remove o link (com confirmação) |

---

## Padrões de código

| Padrão | Status |
|---|---|
| Estado isolado (`let _footer = null`) | ✅ |
| Save via `apiPut('/api/site/admin/config', { siteContent: { footer } })` | ✅ |
| CSS variables (sem hexcodes) | ✅ |
| Preview sync via `window._meuSitePostPreview?.()` | ✅ (chamado dentro de `saveFooter()`) |

---

## Fluxo do usuário

```
1. Usuário abre tab "Rodapé" (ou sub-tab dentro de Meu Site)
   → renderFooter() — se _footer === null, carrega via apiGet('/api/site/admin/config')
   → inicializa _footer = { copyright, socialMedia, quickLinks }
   → monta UI com inputs preenchidos

2. Usuário edita campos e clica "+ Adicionar" para links
   → push em _footer.quickLinks + re-render (renderFooter chamado novamente)

3. Usuário remove um link
   → removeFooterLink(idx) → showConfirm → splice + saveFooter(true) + re-render

4. Usuário clica "Salvar"
   → coleta todos os campos do DOM
   → _footer atualizado com valores finais
   → saveFooter() → apiPut('/api/site/admin/config', { siteContent: { footer: _footer } })
   → showToast('Rodapé salvo!')
   → window._meuSitePostPreview?.() → iframe atualiza
```

---

## Rota backend

```js
// Body
{ siteContent: { footer: { copyright, socialMedia, quickLinks } } }

// Backend executa
$set: { 'siteContent.footer': body.siteContent.footer }
```

---

## Renderização no site público (`shared-site.js`)

- `copyright` → exibido no rodapé como texto
- `socialMedia` → ícones SVG linkados (Instagram, Facebook, LinkedIn, TikTok, YouTube, Email)
- `quickLinks` → links âncora ou externos em coluna lateral do rodapé
- Newsletter foi **removida completamente** — não recriar

---

## Armadilhas

### 1. Rodapé em duas localizações conceituais
`footer.js` é carregado via `switchTab('footer')` (tab normal da sidebar), mas deveria conceitualmente ser uma sub-tab de Meu Site. Enquanto isso não for refatorado, o botão na sidebar e a sub-tab no builder coexistem apontando para a mesma lógica.

### 2. Newsletter removida — não recriar
O rodapé tinha campo de newsletter que foi removido completamente. Não está em `footer.js`, não está em `shared-site.js`. Qualquer referência a newsletter no rodapé é legado a ignorar.

### 3. `email` em socialMedia é endereço, não URL
O campo `socialMedia.email` armazena o endereço de e-mail diretamente (ex: `contato@foto.com`), não uma URL `mailto:`. O `shared-site.js` gera o `href="mailto:..."` ao renderizar.
