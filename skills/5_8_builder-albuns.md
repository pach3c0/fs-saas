# Skill 5_8 — Builder: Álbuns do Site Público

> Cobre a sub-tab **Álbuns** dentro do módulo Meu Site (builder).
> Para arquitetura global do builder, ver `5_1_builder-geral-site.md`.
> Para álbuns internos de prova (clientes), ver rotas `/api/albums` — são um sistema separado.

---

## Visão geral

A sub-tab Álbuns permite ao fotógrafo publicar galerias no seu site público. Cada álbum tem título, subtítulo, capa e um array de fotos com suporte a formatação avançada. No site público, os álbuns aparecem como um grid de cards; ao clicar, um modal abre mostrando as fotos do catálogo (com suporte a Grid Padrão ou Misto) e um lightbox de navegação.

**Arquivo admin:** `admin/js/tabs/albuns.js`
**Renderização pública:** `site/templates/shared-site.js` (seção `section-albuns` e `openAlbumModal`)

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
  gridStyle: String, // 'standard' ou 'mixed' (Estilo de visualização do catálogo)
  photos: [{         // array de objetos com as fotos
    url: String,
    caption: String,
    format: String,  // 16/9, 9/16, 1/1
    transform: { scale: 1, x: 50, y: 50 }
  }],
  createdAt: String  // ISO timestamp
}
```

Estado isolado no módulo admin: `let _albums = null`. Quando carregado pela primeira vez, o sistema converte arrays antigos baseados apenas em URLs para a nova estrutura de objetos via Mapeamento em Memória, garantindo compatibilidade com álbuns antigos.

---

## Fluxo do usuário

### Criar álbum
1. Usuário clica "+ Criar Álbum" → novo objeto é inserido no início de `_albums` com `gridStyle: 'standard'` e `photos: []`.
2. `renderAlbuns(container)` re-renderiza a lista

### Editor Avançado no Catálogo
O comportamento do catálogo interno agora possui a exata mesma engine visual introduzida no Portfólio.
1. Usuário clica no botão (✏️) sobre a miniatura da foto.
2. `window.openAlbumPhotoEditor(albumIdx, photoIdx)` abre o Modal Avançado.
3. Ajustes nos sliders de Zoom e Eixos atualizam o CSS inline e repassam o estado via `appState.configData` para o Live Preview.
4. Escolha do `gridStyle` também reflete instantaneamente.

### Fazer upload de fotos
1. Usuário clica no input de arquivo → seleciona múltiplas imagens.
2. `uploadImage(file)` envia para `POST /api/admin/upload`.
3. Adiciona o objeto estruturado em `album.photos[]` com `format` padrão `16/9`.
4. Atualiza o banco silenciosamente e chama o PostMessage do Preview.

### Restante do Fluxo
Reordenação e Remoções seguem o fluxo padrão utilizando persistência em `apiPut('/api/site/admin/config', { siteContent: { albums: _albums } })`.

---

## Renderização no site público (`shared-site.js`)

Seção: `#section-albuns`

1. **Grid de cards** — um card por álbum com imagem de capa (aspect-ratio 3:4). Clique abre modal.
2. **Modal do álbum** — header com título/subtítulo. Utiliza o `<div class="portfolio-grid" data-style="mixed|standard">` para exibir as fotos do catálogo reaproveitando todo o motor responsivo do Portfólio! Fotos recebem as classes `format-16-9` etc, junto com transformações de scale e object-position via style inline.
3. **Lightbox** — O array interno foi modificado para suportar leitura de objeto via `p.url`.

---

## Armadilhas

| Sintoma | Causa | Como evitar |
|---|---|---|
| Mongoose removendo fields | Modo `strict` do MongoDB | As propriedades avançadas (`gridStyle`, `format`, `transform`) foram estritas no `Organization.js`. Se adicionar novo campo, lembre de adicionar no Schema. |
| Álbuns salvos mas não aparecem | `saveAppData` salva em `SiteData` legado | Sempre usar `apiPut('/api/site/admin/config', { siteContent: { albums } })` |
| Preview do catálogo quebrado | CSS de transform ausente | O `shared-site.js` renderiza `portfolio-item`, certifique-se de não mudar o classname. |
