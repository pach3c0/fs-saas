# 5_13 — Builder: Sub-tab Rodapé

> Cobre: rodapé do site público — copyright, redes sociais e links úteis em `siteContent.footer`.
> Para arquitetura geral do builder (postMessage, dirty tracking, preview), ver `5_1_builder-geral-site.md`.

---

## Localização

O Rodapé é uma **sub-tab dentro do builder Meu Site** (`admin/js/tabs/meu-site.js`), função local `renderRodape()`. O arquivo `footer.js` foi deletado — era código morto após a migração.

---

## Arquivos relevantes

| Arquivo | Função |
|---|---|
| `admin/js/tabs/meu-site.js` | Função local `renderRodape()` (sub-tab Rodapé) |
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
| `#rodapeCopyright` | `<input>` | Texto de copyright |
| `#socialInstagram` | `<input>` | URL Instagram |
| `#socialFacebook` | `<input>` | URL Facebook |
| `#socialLinkedin` | `<input>` | URL LinkedIn |
| `#socialTiktok` | `<input>` | URL TikTok |
| `#socialYoutube` | `<input>` | URL YouTube |
| `#socialEmail` | `<input type="email">` | Endereço de e-mail |
| `#addRodapeLinkBtn` | `<button>` | Adiciona novo link útil ao array |
| `#rodapeLinksList` | `<div>` | Container dos links com inputs |
| `#saveRodapeBtn` | `<button>` | Salva tudo via API |

### Campos por link (`idx`)
| Seletor | Tipo | Descrição |
|---|---|---|
| `[data-link-label="${idx}"]` | `<input>` | Texto do link |
| `[data-link-url="${idx}"]` | `<input>` | URL do link |
| `[data-remove-link="${idx}"]` | `<button>` | Remove o link (com confirmação) |

---

## Padrões de código

| Padrão | Status |
|---|---|
| Estado local (`let _rodape` dentro de `renderRodape()`) | ✅ |
| Save via `apiPut('/api/site/admin/config', { siteContent: { footer } })` | ✅ |
| CSS variables (sem hexcodes) | ✅ |
| Preview sync via `liveRefresh({ siteContent: { footer } })` | ✅ |

---

## Fluxo do usuário

```
1. Usuário clica sub-tab "Rodapé" dentro de Meu Site
   → renderRodape() — lê configData.siteContent.footer (já carregado pelo meu-site.js)
   → inicializa _rodape = { copyright, socialMedia, quickLinks }
   → monta UI com inputs preenchidos

2. Usuário edita campos e clica "+ Adicionar" para links
   → push em _rodape.quickLinks + re-render (renderRodape chamado novamente)

3. Usuário remove um link
   → showConfirm → splice + saveRodape(true) + re-render

4. Usuário clica "Salvar Rodapé"
   → coleta todos os campos do DOM
   → _rodape atualizado com valores finais
   → saveRodape() → apiPut('/api/site/admin/config', { siteContent: { footer: _rodape } })
   → showToast('Rodapé salvo!')
   → liveRefresh({ siteContent: { footer } }) → iframe atualiza
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

### 1. Dados carregados uma vez (configData)
`renderRodape()` usa `configData.siteContent.footer` carregado pelo `meu-site.js` na entrada da tab. Após um save, atualiza `configData.siteContent.footer` localmente para que re-renders usem o valor correto sem nova requisição.

### 2. Newsletter removida — não recriar
O rodapé tinha campo de newsletter que foi removido completamente. Não está em `footer.js`, não está em `shared-site.js`. Qualquer referência a newsletter no rodapé é legado a ignorar.

### 3. `email` em socialMedia é endereço, não URL
O campo `socialMedia.email` armazena o endereço de e-mail diretamente (ex: `contato@foto.com`), não uma URL `mailto:`. O `shared-site.js` gera o `href="mailto:..."` ao renderizar.
