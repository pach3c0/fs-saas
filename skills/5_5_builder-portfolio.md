# Módulo: Portfólio

Grade de fotos do site público com suporte a Grid Padrão e Grid Misto, upload múltiplo, edição avançada de imagem (Zoom, Posição e Formato) via Modal, e seleção em massa.

---

## 1. Elementos DOM (Admin)

| ID / Classe | Tipo | Propósito |
|---|---|---|
| `#styleStandardBtn` / `#styleMixedBtn` | `<button>` | Alterna globalmente o estilo do grid do portfólio |
| `#pUploadInput` | `<input type="file" multiple>` | Seleciona múltiplas imagens |
| `#pPhotoGrid` | `<div class="p-grid">` | Grid de 2 colunas com todas as fotos e miniaturas redimensionadas |
| `.p-item[data-index]` | `<div draggable>` | Card individual mostrando o preview e controles inline |
| `.p-btn-edit` | `<button>` | Abre Modal de Edição Avançada da foto específica |
| `#pPhotoModal` | `<div>` fixed | Modal contendo Preview e Ferramentas (criado dinamicamente) |
| `#pModalPreviewWrapper` | `<div>` | Container com aspect-ratio flexível onde a imagem sofre transformações |
| `#pSliderZoom`, `#pSliderX`, `#pSliderY` | `<input type="range">` | Sliders de propriedades de transformação `scale` e `object-position` |

---

## 2. Estado local

```javascript
let _portfolioPhotos = [];          // array de { url, caption, format, transform }
let _gridStyle = 'standard';        // 'standard' (uniforme) ou 'mixed' (denso)
container._selectedIndices = new Set(); 
let draggedIdx = null;
```

Carregado em `renderPortfolio()` via `apiGet('/api/site/admin/config')` → `siteContent.portfolio`.

---

## 3. Fluxo do usuário

### 3a. Escolha de Estilo do Grid
1. Usuário clica em **Padrão** ou **Misto**.
2. Atualiza `_gridStyle`.
3. Chama `updateAndSave()` → Renderiza grid + Grava em `appState.configData.siteContent` + postMessage Live Preview + salva no Mongoose.

### 3b. Edição Avançada na Modal
1. Usuário clica em `p-btn-edit`.
2. Função `openPhotoEditor(idx)` cria modal isolada na tela.
3. Conforme mexe nos sliders de Zoom (1-3x) e Posições (0-100%):
   - Atualiza `_portfolioPhotos[idx].transform`.
   - Modifica o CSS da imagem na própria modal (`object-position`, `transform: scale()`).
   - Sincroniza via `updateVisuals()` para o `appState.configData` e envia para o iframe em Tempo Real!
4. Edita a Legenda (SEO) ou escolhe o Formato da foto (16/9, 9/16, 1/1).
5. Ao fechar a modal, faz o persist no banco via `savePortfolio(true)` e remonta o Grid.

### 3c. Reordenação Drag & Drop
1. Reordenação clássica HTML5 drag and drop.
2. Ao soltar (`drop`), reposiciona o array `_portfolioPhotos`.
3. Sincroniza em Tempo Real para o iframe (pois atualizamos `appState.configData.siteContent` antes do postPreview).

---

## 4. Estrutura de dados persistida

```javascript
// Organization.siteContent.portfolio
{
  gridStyle: "mixed", // ou "standard"
  photos: [
    { 
      url: "/uploads/{orgId}/site/resized-foto.jpg", 
      caption: "Casamento na praia",
      format: "16/9", // 16/9, 9/16 ou 1/1
      transform: { scale: 1.5, x: 50, y: 30 } 
    }
  ]
}
```

*Importante*: O schema do Mongoose (`models/Organization.js`) possui todos esses campos definidos em sua estrutura `photos: [{ ... }]` e `gridStyle` na raiz, impedindo que o modo restrito (`strict: true`) apague os dados.

---

## 5. Renderização no site público (shared-site.js)

Fonte: `data.siteContent.portfolio`

A renderização do Grid é definida no Javascript público:
```javascript
portfolioGrid.setAttribute('data-style', portfolioData.gridStyle || 'standard');

portfolioGrid.innerHTML = photos.map((p, i) => {
  const transform = p.transform || { scale: 1, x: 50, y: 50 };
  const formatClass = p.format ? `format-${p.format.replace('/', '-')}` : 'format-16-9';
  
  return `<div class="portfolio-item ${formatClass}" onclick="...">
    <img style="object-position:${transform.x}% ${transform.y}%; transform:scale(${transform.scale});" ...>
  </div>`;
}).join('');
```

O `shared.css` lida com as regras usando `:scope[data-style="mixed"]` para aplicar `grid-auto-flow: dense` e acomodar tamanhos variados sem lacunas, enquanto `[data-style="standard"]` ignora as classes de formato para manter consistência uniforme de grade.