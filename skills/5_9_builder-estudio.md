# Módulo: Estúdio (`estudio.js`)

Gerencia as informações institucionais, fotos em canvas e vídeo do estúdio exibidos no site público.

---

## Fonte de dados

- **Carrega:** `GET /api/site/admin/config` → `siteContent.studio`
- **Salva:** `PUT /api/site/admin/config` → `{ siteContent: { studio: _studio } }`
- **Estado isolado:** `let _studio = null` — carregado uma vez na primeira render, reaproveitado nas renders seguintes

Estrutura de `_studio`:
```js
{
  title: '',
  description: '',
  address: '',
  whatsapp: '',        // com DDI: 5511999999999
  hours: '',
  whatsappMessages: [ { text: '', delay: 5 } ],
  studioLayers: [      // canvas de composição livre (máx 4)
    {
      id: 'st_1234567890',
      type: 'image',
      url: '/uploads/...',
      name: 'Foto 1',
      x: 50, y: 50,          // posição central em %
      width: 70, height: 70, // tamanho em % do container
      rotation: 0,           // graus
      scale: 100,            // zoom em %
      opacity: 100,          // 0-100
      borderRadius: 0,       // px
      shadow: false,
      shadowBlur: 10,
      shadowColor: 'rgba(0,0,0,0.5)',
      flipH: false,
      flipV: false
    }
  ],
  videoUrl: '',
  videoEnabled: false   // toggle: exibir ou não o vídeo no site público
}
```

> **Retrocompatibilidade:** dados antigos com `photos[]` continuam sendo exibidos no site público como grade legada.

---

## IDs e seletores relevantes

| ID | Tipo | Descrição |
|---|---|---|
| `#studioTitle` | `<input>` | Título do estúdio |
| `#studioDesc` | `<textarea>` | Descrição |
| `#studioAddress` | `<input>` | Endereço |
| `#studioWhatsapp` | `<input>` | WhatsApp (com DDI) |
| `#studioHours` | `<textarea>` | Horário de atendimento |
| `#whatsappList` | container | Lista de mensagens da bolha WhatsApp |
| `[data-whatsapp-text="N"]` | `<textarea>` | Texto da mensagem N |
| `[data-whatsapp-delay="N"]` | `<input number>` | Delay em segundos da mensagem N |
| `#addWhatsappMsgBtn` | `<button>` | Adiciona nova mensagem WhatsApp |
| `#studioVideoInput` | `<input file>` | Upload de vídeo (`.mp4`, `.mov`, `.webm`, max 300MB) |
| `#removeVideoBtn` | `<button>` | Remove vídeo atual (só renderizado se `videoUrl` existe) |
| `#studioVideoProgress` | container | Progresso do upload de vídeo |
| `#studioUploadInput` | `<input file>` | Upload de foto (única por vez; máx 4) |
| `#studioUploadProgress` | container | Progresso do upload de foto |
| `#studioAddPhotoWrapper` | container | Wrapper do botão de upload (oculto quando ≥ 4 layers) |
| `#studio-layer-list` | container | Lista de camadas (clicável, drag & drop) |
| `#studio-layer-props` | container | Painel de sliders da camada selecionada |
| `#studio-layer-props-content` | container | Conteúdo dos sliders |
| `#videoEnabledToggle` | `<input checkbox>` | Toggle: exibir vídeo no site (só renderizado se `videoUrl` existe) |
| `#videoToggleTrack` | `<span>` | Visual do toggle (background + bolinha animada) |
| `#saveStudioBtn` | `<button>` | Salva todos os campos de texto |

---

## Padrão de edição de fotos

Igual ao módulo **Sobre** (`sobre.js`):
- Lista de camadas (`studioLayers[]`) na sidebar com drag & drop para reordenar z-index
- Clicar numa camada → seleciona e renderiza painel de sliders em `#studio-layer-props`
- Sliders disponíveis: posX, posY, escala, largura, altura, rotação, opacidade, bordas, sombra, flipH, flipV
- Cada slider dispara `window._meuSitePostPreview?.()` imediatamente (live preview)
- Highlight no iframe via postMessage `cz_highlight_layer` com `layerId`
- Limite: máximo 4 fotos; botão de upload oculto ao atingir o limite

---

## Renderização no site público (`shared-site.js`)

O container `#studioPhotosGrid` é substituído por:
- **`studioLayers`**: canvas `position:relative; aspect-ratio:3/4` com `<img>` empilhadas via `position:absolute; transform:translate(-50%,-50%) rotate() scaleX() scaleY()`. Cada img tem `id="layer-{id}"` para highlight.
- **Fallback `photos[]`**: grade legada com `object-position` (retrocompatibilidade).

---

## Fluxo do usuário

### Upload de foto
1. Usuário seleciona arquivo em `#studioUploadInput` (1 por vez, bloqueado se ≥ 4)
2. `uploadImage()` → comprime 1200px/85% → `POST /api/admin/upload`
3. Nova layer é adicionada a `_studio.studioLayers[]` com defaults
4. `saveEstudio(silent=true)` persiste; `_renderLayerList()` e `_renderPropsForLayer()` atualizam a UI

### Edição de posição/composição
1. Clicar numa camada na lista → `_studioSelectedLayerId` atualizado
2. `_renderPropsForLayer(layer)` exibe sliders
3. Cada slider atualiza a layer diretamente em memória + `liveNotify()`
4. "Salvar Tudo" persiste junto com campos de texto

### WhatsApp
1. Clique "+ Nova Mensagem" → push `{ text:'', delay:5 }`, `renderEstudio()` (sem save)
2. Edita campos; "Salvar Tudo" persiste
3. 🗑️ → `removeWhatsappMessage(idx)` → confirm, splice, `saveEstudio(true)`, `renderEstudio()`

### Upload/Remoção de vídeo
- Upload: valida ≤ 300MB → XHR com progresso → atualiza `_studio.videoUrl` → salva → re-render
- Remoção: confirm → `videoUrl = ''` → salva → re-render

---

## Armadilhas

- `getCurrentStudio(container)` deve ser chamado antes de qualquer mutação de `_studio` para não perder campos editados no DOM.
- O botão `#removeVideoBtn` e o toggle `#videoEnabledToggle` só são renderizados quando `_studio.videoUrl` existe.
- Upload de foto é individual (não múltiplo) para controle do limite de 4.
- Dados antigos com `photos[]` são exibidos no site como grade (fallback), mas o admin não os edita mais.
- O canvas de fotos (`studio-canvas-wrap`) tem `max-width:360px; margin:0 auto` para evitar espaço em branco excessivo abaixo quando exibido em colunas largas.

## Comportamento do WhatsApp flutuante

- Mensagens filtradas: apenas `text.trim()` não-vazio são exibidas.
- Sequência: aguarda 1.5s → exibe msg 1 → após `delay` segundos: some com fade (400ms) → exibe msg 2 → … → ao fim fica só o ícone do WhatsApp.
- Bolha anterior removida antes de criar nova (evita duplicação quando `renderSite()` é chamado mais de uma vez).
- `pointer-events:none` na bolha para não bloquear cliques na página.

## Vídeo no site público

- Só exibido quando `studio.videoEnabled === true` **e** `studio.videoUrl` existe.
- Container `#studioVideoWrap` (presente em todos os 5 templates) recebe o `<video>` via `shared-site.js`.
- Sem parâmetros adicionais de edição — vídeo é reproduzido como enviado, em `aspect-ratio:16/9` com `object-fit:contain`.