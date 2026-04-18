# Módulo: Sobre Mim (Sub-tab Capa → Sobre)

Editor visual de biografia e fotos de apresentação. Usa o mesmo motor `HeroCanvasEditor` do Hero, com canvas fixo em proporção retrato (3:4).

---

## 1. Elementos DOM

| ID | Tipo | Propósito |
|---|---|---|
| `#scTitle` | `<input>` | Título da seção |
| `#scText` | `<textarea>` | Bio/descrição longa |
| `#scAddPhoto` | `<input type="file">` (hidden) | Upload de nova foto para o canvas |
| `#scSaveBtn` | `<button>` | Salva texto + layers no banco |
| `#sc-layer-list` | `<div>` | Lista de camadas adicionadas |
| `#sc-layer-props` | `<div>` | Painel de propriedades da layer selecionada |
| `#sc-layer-props-content` | `<div>` | Conteúdo dinâmico das props (renderizado ao selecionar) |
| `#scLayerImgReplace` | `<input type="file">` (hidden) | Troca a foto da layer selecionada |
| `#scImgOpacity` / `#scImgOpacityVal` | range + span | Opacidade 0–100% |
| `#scBorderRadius` / `#scBorderRadiusVal` | range + span | Arredondamento 0–200px |
| `#scShadowEnabled` | checkbox | Ativa/desativa sombra |
| `#scShadowBlur` / `#scShadowBlurVal` | range + span | Intensidade da sombra 0–60px (visível só com shadow ativo) |
| `#scFlipH` / `#scFlipV` | `<button>` | Espelhar horizontal / vertical |
| `#sobre-canvas-container` | `<div>` | Container onde o `HeroCanvasEditor` é montado |

---

## 2. HeroCanvasEditor no Sobre

```javascript
// admin/js/tabs/sobre.js
const canvasEditor = new HeroCanvasEditor(canvasContainer, {
  onSelect: (layer) => _renderPropsForLayer(sidebar, layer, canvasEditor),
  onChange: () => window._meuSitePostPreview?.(),
  resolveImagePath,
  deviceSizes: sobreSizes,  // fixo 600×800 em todos os devices
});

const sobreSizes = {
  desktop: { w: 600, h: 800 },
  tablet:  { w: 600, h: 800 },
  mobile:  { w: 600, h: 800 },
};
```

**Diferença do Hero:** não usa presets por device (mesmo tamanho em todos); não há fundo de cor/gradiente — apenas layers de imagem sobre fundo transparente.

---

## 3. Propriedades de cada layer

```javascript
{
  id: "sb_1234567890",   // prefixo "sb_" + timestamp
  type: "image",
  url: "/uploads/orgId/foto.jpg",
  name: "Foto",

  // posição e tamanho (% do container)
  x: 50, y: 50,          // centro do elemento, default: centro do canvas
  width: 70, height: 70, // % da largura/altura do container
  rotation: 0,           // graus

  // visual
  opacity: 100,          // 0–100
  borderRadius: 0,       // px
  flipH: false,
  flipV: false,

  // sombra (aplicada via CSS filter: drop-shadow)
  shadow: false,
  shadowBlur: 10,
  shadowColor: "rgba(0,0,0,0.5)",

  presets: {}            // não usado ativamente no Sobre
}
```

---

## 4. Fluxo do usuário

1. Usuário entra na sub-tab **Sobre** → `renderSobre(container)` monta o canvas e carrega layers de `appState.configData.siteContent.sobre.canvasLayers`
2. Adiciona/edita foto → `#scAddPhoto` dispara upload via `uploadImage()` → `canvasEditor.addLayer({ type:'image', url, ... })`
3. Seleciona layer → `onSelect` renderiza painel `#sc-layer-props-content` com sliders de opacidade, borderRadius, sombra e botões flip
4. Altera qualquer propriedade → `canvasEditor.updateLayer(layerId, { ... })` + `window._meuSitePostPreview?.()` atualiza preview em tempo real
5. Edita `#scTitle` ou `#scText` → onChange dispara `window._meuSitePostPreview?.()` imediatamente
6. Clica **Salvar** (`#scSaveBtn`) → `syncSobreToSite(layers, title, text)`:
   ```javascript
   apiPut('/api/site/admin/config', {
     siteContent: { sobre: { title, text, image: layers[0]?.url, canvasLayers: layers } }
   })
   ```
7. Backend (`PUT /api/site/admin/config`) faz `$set` em `Organization.siteContent.sobre` (merge por sub-chave — não apaga outros campos de `siteContent`)
8. Após resposta OK → atualiza `appState.configData`, exibe toast "Sobre salvo!", chama `window._meuSitePostPreview?.()` novamente

---

## 5. Estrutura de dados persistida

```javascript
// Organization.siteContent.sobre
{
  title: String,          // texto do h2 no site público
  text: String,           // bio/parágrafo
  image: String,          // URL da primeira layer (fallback legado)
  canvasLayers: [ /* ver seção 3 */ ]
}
```

---

## 6. Funções-chave

| Função | Arquivo | Propósito |
|---|---|---|
| `renderSobre(container)` | `sobre.js` | Entry point: monta canvas + sidebar |
| `_renderSobreSidebar(container)` | `sobre.js` | Renderiza inputs de texto e lista de layers |
| `_renderLayerList(container, canvasEditor)` | `sobre.js` | Atualiza `#sc-layer-list` |
| `_renderPropsForLayer(container, layer, canvasEditor)` | `sobre.js` | Renderiza painel de propriedades dinâmico |
| `_applyShadowToLayer(canvasEditor, layerId)` | `sobre.js` | Aplica `filter: drop-shadow(...)` no DOM |
| `syncSobreToSite(layers, title, text)` | `sobre.js` | Faz `apiPut` para salvar no banco |
| `getSobreCanvasState()` | `sobre.js` | Retorna estado atual para o postMessage de preview |
| `destroySobreCanvas()` | `sobre.js` | Cleanup ao sair do builder mode |

---

## 7. Renderização no site público (shared-site.js)

Fonte: `data.siteContent.sobre`

- `#sobreTitle` → `content.sobre?.title`
- `#sobreText` → `content.sobre?.text`
- `#sobreImage` (img) → substituído por div com layers posicionadas via `position:absolute` + `%` (quando `canvasLayers.length > 0`); fallback: `content.sobre?.image` direto na `<img>`

Cada layer é renderizada como:
```html
<div style="position:absolute; left:X%; top:Y%; width:W%; height:H%;
            transform:translate(-50%,-50%) rotate(Rdeg) scaleX(-1)?;
            opacity:O; filter:drop-shadow(...);">
  <img src="..." style="width:100%;height:100%;object-fit:cover;border-radius:Rpx;">
</div>
```

O container wrapper usa `aspect-ratio:3/4` e substitui o `<img id="sobreImage">` original.
