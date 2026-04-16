# Módulo: Portfólio

Gerenciamento da galeria principal de trabalhos do fotógrafo.

---

## 1. Upload e Gestão
- **Input:** `#pUploadInput` (Suporta múltiplos arquivos).
- **Processamento:** 
    1. Validação (JPG/PNG).
    2. Compressão via Canvas (integrada no `uploadImage`).
    3. Upload XHR com progresso em `#pUploadProgress`.
- **Grid de Fotos:** `#pPhotoGrid`.

---

## 2. Interações
- **Remover:** Cada foto possui um botão de exclusão que a remove do Snapshot e do Cloudinary/Filesystem.
- **Reordenar:** Miniaturas podem ser arrastadas para mudar a ordem de exibição no site.
- **Auto-Save:** O salvamento é disparado após o término de todos os uploads pendentes.


