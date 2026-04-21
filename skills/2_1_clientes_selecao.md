# Grupo 2.1: Galeria do Cliente (cliente/)

> Documentação do módulo público de galeria — `cliente/index.html` + `cliente/js/gallery.js`.
> Diferente de `clientes.js` (CRM do admin). Este módulo é acessado pelo cliente final via link/código.

---

## Visão Geral

PWA acessível em `[slug].cliquezoom.com.br/cliente/?code=XXXX`.

- Exibe **somente a logo e identidade do fotógrafo do tenant atual** (sem branding do CliqueZoom)
- Login por código de acesso (digitado ou via query string `?code=`)
- Modos: seleção de fotos, galeria (visualização/download), multi-seleção
- Funciona offline como PWA após primeiro acesso

---

## Resolução de Tenant

O middleware `src/middleware/tenant.js` extrai o slug do subdomínio:

```
joao.cliquezoom.com.br → slug = 'joao' → req.organizationId = ObjectId da org
```

Em desenvolvimento: usar `?_tenant=slug` ou header `X-Tenant`.

O `req.organizationId` é injetado automaticamente em todas as rotas `/api/client/*`.

---

## Fluxo de Login

```
Cliente recebe link: https://joao.cliquezoom.com.br/cliente/?code=ABCD1234

1. gallery.js lê ?code= da URL
2. Preenche o input automaticamente
3. Dispara POST /api/client/verify-code com { accessCode }
4. history.replaceState() limpa o ?code= da barra de endereço
5. Session + dados da org são armazenados em state.session
6. renderHeader() exibe logo do fotógrafo
7. renderPhotos() carrega a galeria
```

Sessão é salva em `sessionStorage` para re-login sem digitar o código.

---

## Dados da Organização Retornados ao Cliente

`POST /api/client/verify-code` e `GET /api/client/photos/:sessionId` retornam:

```json
{
  "organization": {
    "id": "...",
    "name": "Nome do Fotógrafo",
    "logo": "/uploads/{orgId}/logo.jpg",
    "watermark": {
      "watermarkType": "text|logo",
      "watermarkText": "Texto",
      "watermarkOpacity": 15,
      "watermarkPosition": "center|tiled|bottom-right|...",
      "watermarkSize": "small|medium|large"
    }
  }
}
```

Esses campos vêm de `Organization` via `.populate('organizationId')` na rota.

---

## Branding: Regra Crítica

> **Somente a logo/nome do fotógrafo do tenant deve aparecer.** Nenhum texto hardcoded de outra marca.

### Renderização na Nav (`renderHeader`)

```js
const orgName = (state.session.organization?.name) || '';
const orgLogo = (state.session.organization?.logo) || null;

// Nav bar (div#navLogo):
if (orgLogo)      → <img src="{orgLogo}" alt="{orgName}">
else if (orgName) → <span class="nav-logo">{orgName}</span>
else              → vazio (sem branding)

// Cabeçalho da galeria (galleryHeader):
if (orgLogo)      → <img src="{orgLogo}">
else if (orgName) → <h1>{orgName}</h1>
else              → vazio
```

**Fallback nunca deve ser string hardcoded** — se org não vier, omitir silenciosamente.

---

## Watermark

Configurado em `Organization.watermarkType/Text/Opacity/Position/Size`.

| Tipo | Comportamento |
|---|---|
| `text` | Exibe `watermarkText` (ou `orgName` se vazio) sobre as fotos |
| `logo` | Exibe `organization.logo` como imagem sobre as fotos |
| `tiled` (posição) | Repete o watermark em grid sobre toda a foto |

**Quando ocultar:** `selectionStatus === 'delivered'` → watermark removido automaticamente.

### `getWatermarkOverlay(watermark)`

```js
// Fallback correto — nunca hardcode de outra marca:
const orgName = (state.session.organization?.name) || '';
const logoUrl  = (state.session.organization?.logo) || '';
```

---

## PWA

- **Manifest dinâmico:** `GET /api/client/manifest/:sessionId` retorna JSON com `name` = org.name e `theme_color` = org.primaryColor
- **Meta theme-color:** atualizado em JS após login via `document.getElementById('themeColorMeta')`
- **Service Worker:** `cliente/sw.js` — cacheia assets estáticos, estratégia network-first para API
- **Ícones PWA:** `cliente/icons/icon-192.png` e `icon-512.png` (genéricos do app)

---

## Rotas Usadas pelo Frontend

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/client/verify-code` | Login com código → retorna session + org |
| GET | `/api/client/manifest/:sessionId` | PWA manifest dinâmico |
| GET | `/api/client/photos/:sessionId` | Fotos + seleção atual |
| PUT | `/api/client/select/:sessionId` | Toggle de foto selecionada |
| POST | `/api/client/submit-selection/:sessionId` | Finalizar seleção |
| POST | `/api/client/request-reopen/:sessionId` | Pedir reabertura |
| POST | `/api/client/comments/:sessionId` | Comentar foto |
| GET | `/api/client/download/:sessionId/:photoId` | Download individual |
| GET | `/api/client/download-all/:sessionId` | Download ZIP |

Todas filtradas por `req.organizationId` (tenant middleware).

---

## Correções de Branding Aplicadas (2026-04-21)

| Arquivo | Problema | Correção |
|---|---|---|
| `cliente/index.html` linha 6 | `<title>Sua Galeria \| FS FOTOGRAFIAS</title>` | `<title>Sua Galeria</title>` |
| `cliente/index.html` linha ~143 | `<a>FS<span>.</span>FOTOGRAFIAS</a>` hardcoded na nav | `<div id="navLogo"></div>` preenchido dinamicamente pelo JS |
| `gallery.js` `renderHeader()` | Fallback `'FS FOTOGRAFIAS'` | Fallback `''` (omite silenciosamente) |
| `gallery.js` `getWatermarkOverlay()` | Fallback `'FS FOTOGRAFIAS'` | Fallback `''` (sem texto se org ausente) |

**`renderHeader()` agora também preenche `#navLogo` na nav bar** com logo ou nome do fotógrafo após o login.

---

## Checklist para Novos Recursos neste Módulo

- [ ] Nunca hardcodar nome/logo de marca — sempre usar `state.session.organization`
- [ ] Fallback quando `organization` ausente: omitir elemento, não exibir string de outra marca
- [ ] Toda chamada de API usa `fetch` com header `{ 'Content-Type': 'application/json' }` e o código/sessionId no body ou URL
- [ ] `organizationId` vem do middleware tenant — nunca do frontend
- [ ] Novos campos da org necessários no cliente: adicionar no retorno de `verify-code` e `photos` em `src/routes/sessions.js`
- [ ] Testar sempre em `[slug].cliquezoom.com.br` (não em localhost sem `?_tenant=slug`)
