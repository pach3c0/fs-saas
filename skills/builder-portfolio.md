# Módulo: Portfólio

Gerenciamento da galeria principal de trabalhos do fotógrafo.

---

## 1. Upload e Gestão

- **Input:** `#pUploadInput` (suporta múltiplos arquivos).
- **Processamento:** Validação (imagem/*) → Compressão via Canvas → Upload paralelo com `Promise.allSettled`.
- **Progresso:** `showUploadProgress('pUploadProgress', percent)` exibido durante uploads.
- **Grid de Fotos:** `#pPhotoGrid` (3 colunas, aspect-ratio 1:1).

---

## 2. Interações

- **Remover individual:** Botão `.p-del` em cada miniatura — remove do array e salva.
- **Limpar tudo:** Botão `#pClearBtn` com confirmação via `window.showConfirm`.
- **Reordenar:** Drag and Drop nativo (HTML5) nas miniaturas — reordena o array e salva.

---

## 3. Dados

- **Fonte:** `appState.appData.portfolio.photos` — array de objetos `{ url: string }`.
- **Persistência:** `saveAppData('portfolio', appState.appData.portfolio)` após cada ação (com toast de sucesso).

---

## 4. Preview em Tempo Real

- Cada alteração (upload, remoção, reordenação) chama `window._meuSitePostPreview?.()`.
- Isso dispara `postPreviewData()` em `meu-site.js`, que envia snapshot via `postMessage` ao iframe.

---

## 5. Integração com meu-site.js

- **Import:** `import { renderPortfolio } from './portfolio.js'`
- **Renderização:** Chamada em `doSwitchSubTab` quando `btn.dataset.target === 'config-portfolio'`.
- **postPreviewData:** Injeta `appState.appData.portfolio.photos` em `snap.siteContent.portfolio.photos` antes de enviar ao iframe.
