# Skill 5_8 — Builder: Álbuns do Site Público

> Cobre a sub-tab **Álbuns** dentro do módulo Meu Site (builder).
> Para arquitetura global do builder, ver `5_1_builder-geral-site.md`.
> Para álbuns internos de prova (clientes), ver rotas `/api/albums` — são um sistema separado.

---

## Visão geral

A sub-tab Álbuns permite ao fotógrafo publicar galerias no seu site público. Cada álbum tem título, subtítulo, capa e um array de fotos. No site público, os álbuns aparecem como um grid de cards; ao clicar, um modal abre com todas as fotos e um lightbox de navegação.

**Arquivo admin:** `admin/js/tabs/albuns.js`
**Renderização pública:** `site/templates/shared-site.js` (seção `section-albuns`)

---

## Estrutura de dados

Campo no banco: `Organization.siteContent.albums` (array)

```js
// Cada item do array
{
  id: String,        // gerado com generateId()
  title: String,     // título exibido no card e no modal
  subtitle: String,  // subtítulo exibido abaixo do título
  cover: String,     // URL da imagem de capa (primeira foto por padrão)
  photos: [String],  // array de URLs de todas as fotos do álbum
  createdAt: String  // ISO timestamp
}
```

Estado isolado no módulo admin: `let _albums = null` (carregado na primeira renderização via `apiGet('/api/site/admin/config')`).

---

## Fluxo do usuário

### Criar álbum
1. Usuário clica "+ Criar Álbum" → novo objeto `{ id, title:'', subtitle:'', cover:'', photos:[], createdAt }` é inserido no início de `_albums`
2. `renderAlbuns(container)` re-renderiza a lista
3. Não salva automaticamente — usuário edita campos antes de salvar

### Fazer upload de fotos
1. Usuário clica no input de arquivo → seleciona uma ou mais imagens
2. `uploadImage(file)` envia para `POST /api/admin/upload` → retorna `{ url: '/uploads/orgId/file.jpg' }`
3. URL é adicionada a `album.photos[]`; se for a primeira foto, também define `album.cover`
4. `saveAlbuns(true)` → `apiPut('/api/site/admin/config', { siteContent: { albums: _albums } })` (save silencioso, sem toast)
5. `window._meuSitePostPreview?.()` → iframe atualiza preview em tempo real

### Editar título / subtítulo
1. Usuário edita input `data-album-title` ou `data-album-subtitle`
2. Ao perder foco (blur) → `saveAlbumFields(true)` → `apiPut('/api/site/admin/config', { siteContent: { albums: _albums } })` (silencioso)
3. `window._meuSitePostPreview?.()` → preview atualiza

### Definir capa
1. Usuário clica ícone 📷 sobre uma foto
2. `album.cover` é atualizado para aquela URL
3. `saveAlbuns(true)` + `window._meuSitePostPreview?.()`

### Remover foto
1. Usuário clica ícone 🗑️ sobre uma foto
2. URL é removida de `album.photos[]`
3. Se era a capa, `album.cover` passa a ser `photos[0]` (ou `''` se array vazio)
4. `saveAlbuns(true)` + `window._meuSitePostPreview?.()`

### Remover álbum
1. Usuário clica 🗑️ no cabeçalho do álbum → `window.showConfirm()` pede confirmação
2. Álbum é removido de `_albums`
3. `saveAlbuns(false)` → save com toast de sucesso
4. `window._meuSitePostPreview?.()`

### Salvar manualmente
1. Usuário clica "Salvar Alterações"
2. `saveAlbumFields(false)` → `apiPut('/api/site/admin/config', { siteContent: { albums: _albums } })`
3. Backend: `Organization.findByIdAndUpdate` com `$set { 'siteContent.albums': value }`
4. Toast "Álbuns salvos"
5. `window._meuSitePostPreview?.()` → preview atualiza

---

## Renderização no site público (`shared-site.js`)

Seção: `#section-albuns`

1. **Grid de cards** — um card por álbum com imagem de capa (aspect-ratio 3:4), título e subtítulo. Clique abre modal.
2. **Modal do álbum** — header com título/subtítulo, grid de fotos (`auto-fill minmax(200px)`), hover scale 1.05. Clique em foto abre lightbox.
3. **Lightbox** — fullscreen `rgba(0,0,0,0.98)`, navegação anterior/próxima, fechamento com ESC ou botão ✕.

A seção só é renderizada se `siteSections` incluir `'albuns'` como ativa.

---

## Diferença: álbuns do site × álbuns internos (provas)

| | Álbuns do Site (`siteContent.albums`) | Álbuns Internos / Provas |
|---|---|---|
| Gerenciado em | Meu Site → sub-tab Álbuns | Aba Álbuns-Prova |
| Modelo | `Organization.siteContent.albums` | `Album` (modelo separado) |
| Acesso | Público, sem senha | Access code por cliente |
| Função | Portfólio público | Revisão e aprovação de fotos |
| Rota de save | `PUT /api/site/admin/config` | `PUT /api/albums/:id` |

---

## Armadilhas

| Sintoma | Causa | Como evitar |
|---|---|---|
| Álbuns salvos mas não aparecem no site | `saveAppData` salva em `SiteData` (legado) | Sempre usar `apiPut('/api/site/admin/config', { siteContent: { albums } })` |
| Erro 500 "Cannot create field" no MongoDB | Dot notation aninhada: `siteContent.albums.photos` conflita com campo pai `Mixed` | Fazer `$set` no objeto pai: `updateData['siteContent.albums'] = value` |
| Preview não atualiza após save | Falta chamada ao postMessage | Sempre chamar `window._meuSitePostPreview?.()` após persistir |
| Seção não aparece no site | `siteSections` não inclui `'albuns'` | Verificar sub-tab Seções (ver `5_2_builder-sessoes.md`) |
| Upload falha silenciosamente | `album.photos` não é inicializado como array | Garantir `album.photos = album.photos || []` antes de push |
