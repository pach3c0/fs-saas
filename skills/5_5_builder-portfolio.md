# Módulo: Portfólio

Grade de fotos do site público com upload múltiplo, reordenação drag & drop, legendas e seleção em massa. Não usa HeroCanvasEditor — é um grid simples de imagens.

---

## 1. Elementos DOM

| ID / Classe | Tipo | Propósito |
|---|---|---|
| `#pUploadInput` | `<input type="file" multiple>` | Seleciona múltiplas imagens |
| `#pUploadProgress` | `<div>` | Barra de progresso durante upload |
| `#pPhotoGrid` | `<div class="p-grid">` | Grid 3 colunas com todas as fotos |
| `.p-item[data-index]` | `<div draggable>` | Card individual (aspect-ratio 16/9) |
| `.p-btn-check` | `<button>` | Checkbox de seleção múltipla (visível no hover) |
| `.p-btn-edit` | `<button>` | Abre overlay de edição de legenda |
| `.p-btn-del` | `<button>` | Deleta foto individual |
| `.p-edit-input[data-index]` | `<input>` | Campo de legenda (caption) |
| `.p-edit-overlay` | `<div>` | Overlay de edição que sobe do bottom |
| `#pBulkActions` | `<div>` sticky | Barra de ações em massa (aparece ao selecionar) |
| `#pBulkCount` | `<span>` | Contador de fotos selecionadas |
| `#pBulkCancelBtn` | `<button>` | Limpa seleção |
| `#pBulkDelBtn` | `<button>` | Deleta fotos selecionadas |
| `#pClearBtn` | `<button>` | Remove todas as fotos do portfólio |
| `.p-empty` | `<div>` | Mensagem quando portfólio vazio |

---

## 2. Estado local

```javascript
let _portfolioPhotos = [];          // array de { url, caption }
container._selectedIndices = new Set(); // índices selecionados para bulk
let draggedIdx = null;              // índice sendo arrastado
```

Carregado em `renderPortfolio()` via `apiGet('/api/site/admin/config')` → `siteContent.portfolio.photos`.

---

## 3. Fluxo do usuário

### 3a. Upload de foto

1. Usuário seleciona arquivo(s) em `#pUploadInput`
2. Para cada arquivo: `uploadImage(file, authToken, onProgress)` → comprime para máx 1200px/85% → `POST /api/admin/upload`
3. Resposta: `{ url: '/uploads/{orgId}/site/resized-{filename}' }`
4. `_portfolioPhotos.push({ url, caption: '' })`
5. `updateAndSave()` → re-renderiza grid + `apiPut('/api/site/admin/config', { siteContent: { portfolio: { photos: _portfolioPhotos } } })` + toast "Portfólio salvo!" + `window._meuSitePostPreview?.()`

### 3b. Edição de legenda (auto-save)

1. Usuário edita `.p-edit-input`
2. `oninput` → atualiza `_portfolioPhotos[idx].caption` + `window._meuSitePostPreview?.()` (sem salvar)
3. `onchange` (ao sair do campo) → `savePortfolio(silent=true)` (salva sem toast)

### 3c. Reordenação drag & drop

1. `dragstart` → salva `draggedIdx`, opacidade 0.5 no item
2. `drop` → `photos.splice(draggedIdx, 1)` + `photos.splice(dropIdx, 0, moved)`
3. `updateAndSave()`

Bloqueado se `container._selectedIndices.size > 0` ou se item está em modo edição.

### 3d. Deleção individual

1. `window.showConfirm('Deseja remover esta foto?', { danger: true })`
2. `_portfolioPhotos.splice(idx, 1)` → `updateAndSave()`

### 3e. Deleção em massa

1. Seleciona fotos via `.p-btn-check` → `container._selectedIndices.add(idx)`
2. Barra `#pBulkActions` aparece com contagem
3. `#pBulkDelBtn` → confirm → `_portfolioPhotos.filter((_, i) => !_selectedIndices.has(i))` → `updateAndSave()`

### 3f. Limpar tudo

1. `#pClearBtn` → confirm ("Remover TODAS as fotos?") → `_portfolioPhotos = []` → `updateAndSave()`

---

## 4. Função de salvamento

```javascript
// savePortfolio(silent = false)
apiPut('/api/site/admin/config', {
  siteContent: { portfolio: { photos: _portfolioPhotos } }
})
// Backend faz $set em Organization.siteContent.portfolio (objeto inteiro, não dot notation)
// Evita erro "Cannot create field in element" do MongoDB
```

---

## 5. Estrutura de dados persistida

```javascript
// Organization.siteContent.portfolio
{
  photos: [
    { url: "/uploads/{orgId}/site/resized-foto.jpg", caption: "Casamento na praia" },
    { url: "/uploads/{orgId}/site/resized-foto2.jpg", caption: "" },
    // ...
  ]
}
```

Cada objeto foto: apenas `url` e `caption`. Ordem do array = ordem exibida no site.

---

## 6. Funções-chave

| Função | Propósito |
|---|---|
| `renderPortfolio(container)` | Entry point exportado; carrega dados e monta tudo |
| `renderPhotos(container)` | Re-renderiza grid com estado atual |
| `setupEvents(container)` | Configura todos os listeners (upload, drag, edit, bulk) |
| `savePortfolio(silent)` | `apiPut` para persistir; `silent=true` suprime toast |
| `updateAndSave()` | `renderPhotos` + `_meuSitePostPreview` + `savePortfolio` |
| `ensurePortfolio()` | Garante que `_portfolioPhotos` é array |

---

## 7. Renderização no site público (shared-site.js)

Fonte: `data.siteContent.portfolio.photos`

```javascript
// Modo legado (usado pelo portfólio)
portfolioGrid.innerHTML = photos.map((p, i) => `
  <div class="portfolio-item" onclick="openLightbox(${i})">
    <img src="${resolvePath(p.url)}" alt="${esc(p.caption || 'Portfolio ' + (i+1))}"
         loading="lazy" style="width:100%;height:100%;object-fit:cover;">
  </div>
`).join('');
```

- Se `photos` vazio → `#section-portfolio` recebe `display:none`
- Lightbox: `openLightbox(i)` → `#portfolioLightbox` + `#lbImage` com navegação por seta/teclado
- `window.lightboxPhotos` = array de fotos (populado ao renderizar)
