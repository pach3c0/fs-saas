# Módulo: Sobre Mim (Sub-tab Capa → Sobre)

Editor visual de biografia e fotos de apresentação. Diferente de versões anteriores, este módulo é editado **diretamente no preview real do site**, sem canvas isolado, garantindo fidelidade total ao layout final.

---

## 1. Elementos DOM (Barra Lateral)

| ID | Tipo | Propósito |
|---|---|---|
| `#scTitle` | `<input>` | Título da seção (H2 no site) |
| `#scText` | `<textarea>` | Bio/descrição longa |
| `#scAddPhoto` | `<input type="file">` | Upload de nova foto |
| `#scSaveBtn` | `<button>` | Salva texto + camadas no banco |
| `#sc-layer-list` | `<div>` | Lista de camadas adicionadas |
| `#sc-layer-props` | `<div>` | Painel de ajustes da foto selecionada |
| `#lpX` / `#lpY` | ranges | Posição horizontal/vertical (0–100%) |
| `#lpW` / `#lpH` | ranges | Largura/Altura (5–150%) |
| `#lpRot` | range | Rotação (-180° a 180°) |
| `#lpOp` | range | Opacidade (0–100%) |
| `#lpRad` | range | Arredondamento de bordas (0–200px) |
| `#lpShadow` | checkbox | Ativa/desativa sombra |
| `#lpShadowBlur` | range | Intensidade da sombra |
| `#lpFlipH` / `#lpFlipV` | `<button>` | Espelhar horizontal / vertical |

---

## 2. Fluxo de Edição

1. **Seleção**: Ao abrir a aba, o preview rola automaticamente para a seção `#section-sobre`.
2. **Edição de Texto**: Alterações em `#scTitle` e `#scText` disparam `window._meuSitePostPreview?.()` instantaneamente.
3. **Fotos (Camadas)**:
   - As fotos são renderizadas no site público como elementos de `position: absolute` dentro de um container de proporção 3:4.
   - Os controles na barra lateral (sliders) alteram as propriedades da camada em `siteContent.sobre.canvasLayers`.
   - Cada movimento de slider sincroniza o estado e atualiza o iframe.
4. **Persistência**: O botão **Salvar Sobre** envia o objeto completo via `apiPut('/api/site/admin/config')`.

---

## 3. Propriedades de cada layer

```javascript
{
  id: "sb_1234567890",
  type: "image",
  url: "/uploads/orgId/foto.jpg",
  name: "Foto 1",
  x: 50, y: 50,          // posição central em %
  width: 70, height: 70, // tamanho em % em relação ao container
  rotation: 0,           // graus
  opacity: 100,          // 0-100
  borderRadius: 0,       // px
  shadow: false,
  shadowBlur: 10,
  shadowColor: "rgba(0,0,0,0.5)",
  flipH: false,
  flipV: false
}
```

---

## 4. Renderização no site público (shared-site.js)

O template utiliza `content.sobre.canvasLayers` para compor a visualização:
- O container wrapper tem `aspect-ratio: 3/4`.
- Camadas são empilhadas seguindo a ordem da array (reversa na UI para o topo ficar em cima).
- Usa-se `transform: translate(-50%, -50%)` para que `x` e `y` representem o centro da foto.

---

## 5. Funções-chave (`sobre.js`)

| Função | Propósito |
|---|---|
| `renderSobre(container)` | Monta a sidebar e inicializa eventos |
| `_renderLayerList()` | Atualiza a lista de fotos e gerencia seleção/remoção |
| `_renderPropsForLayer(layer)` | Renderiza os sliders de ajuste para a foto ativa |
| `liveNotify()` | Atalho para disparar o postMessage de preview |
