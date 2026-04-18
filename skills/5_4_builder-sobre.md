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

## 2. Fluxo do usuário

1. Usuário edita Título/Bio ou Sliders → sobreData é atualizado no estado local.
2. Cada alteração chama liveNotify() → window._meuSitePostPreview?.() → postPreviewData()
3. postPreviewData() usa getSobreCanvasState() para capturar camadas e envia via PostMessage.
4. shared-site.js recebe mensagem e re-renderiza a seção #section-sobre com as novas camadas.
5. Clique em "Salvar Sobre" → apiPut('/api/site/admin/config', { siteContent: { sobre: ... } })
6. Backend faz $set em Organization.siteContent.sobre (preservando outros campos).

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

---

## 6. Armadilhas e Resolução de Problemas

### Bug do Preview que para de atualizar
**Causa**: O `shared-site.js` utilizava `replaceWith()` para trocar a `<img>` original por uma `<div>` (container das camadas). Como a nova `<div>` não recebia o ID `#sobreImage`, as chamadas subsequentes do preview (ao mover sliders) falhavam por não encontrar o elemento no DOM.
**Solução**: O elemento substituto deve **preservar o ID** (`wrap.id = 'sobreImage'`). Caso o usuário remova todas as camadas, o script deve converter a `<div>` de volta para uma `<img>` para manter a compatibilidade com o modo legado.


# Melhorias Implementadas

- [x] **Drag & Drop nas Camadas**: É possível arrastar os itens na lista de camadas (ícone ⠿) para reordenar o `z-index` das imagens (frente/fundo).
- [x] **Highlight no Preview**: Ao clicar em uma camada na sidebar, a respectiva imagem no iframe pisca com uma borda azul (`cz_highlight_layer`) para fácil identificação visual.
- [x] **Limite de Fotos**: O módulo agora limita a no máximo 4 fotos, ocultando o botão de upload e bloqueando novas inserções quando o limite é atingido.