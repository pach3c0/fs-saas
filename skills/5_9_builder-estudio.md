# Módulo: Estúdio (`estudio.js`)

Gerencia as informações institucionais, fotos e vídeo do estúdio exibidos no site público.

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
  photos: [ { image: '/uploads/...', posX: 50, posY: 50, scale: 1 } ],
  videoUrl: ''
}
```

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
| `#studioUploadInput` | `<input file multiple>` | Upload múltiplo de fotos (`.jpg`, `.jpeg`, `.png`) |
| `#studioUploadProgress` | container | Progresso do upload de fotos |
| `#studioPhotosGrid` | container | Grade de fotos do estúdio |
| `#saveStudioBtn` | `<button>` | Salva todos os campos de texto |
| `#studioEditorModal` | modal | Editor de posição/escala de foto (16/9) |

---

## Funções globais expostas no `window`

| Função | Descrição |
|---|---|
| `window.deleteStudioPhoto(idx)` | Confirma e remove foto pelo índice |
| `window.openStudioEditor(idx)` | Abre `photoEditor` para ajustar posição/escala da foto |
| `window.removeWhatsappMessage(idx)` | Confirma e remove mensagem WhatsApp pelo índice |

---

## Fluxo do usuário

### Informações textuais (título, descrição, endereço, WhatsApp, horário)
1. Usuário edita campos → valores ficam no DOM
2. Clica "Salvar Tudo" → `getCurrentStudio(container)` lê todos os campos e atualiza `_studio`
3. `apiPut('/api/site/admin/config', { siteContent: { studio: _studio } })`
4. Backend faz `$set` em `Organization.siteContent.studio`
5. `window._meuSitePostPreview?.()` → iframe atualiza em tempo real

### Upload de fotos
1. Usuário seleciona arquivos em `#studioUploadInput`
2. Cada arquivo passa por `uploadImage()` → comprime 1200px/85% → `POST /api/admin/upload`
3. URL retornada é adicionada a `_studio.photos[]` com `{ posX:50, posY:50, scale:1 }`
4. `saveEstudio(silent=true)` persiste; `renderEstudio()` rerenderiza a grade

### Edição de posição/escala de foto
1. Hover sobre foto revela botões; clique em ✏️ → `window.openStudioEditor(idx)`
2. `setupPhotoEditor()` abre `#studioEditorModal` (aspect 16/9)
3. Ao confirmar, callback atualiza `_studio.photos[idx]` com `{ posX, posY, scale }`
4. `saveEstudio(silent=true)` + `renderEstudio()`

### Upload de vídeo
1. Usuário seleciona arquivo em `#studioVideoInput`
2. Valida tamanho ≤ 300MB localmente
3. `uploadVideo(file, progressCallback)` → XHR com progresso visual em `#studioVideoProgress`
4. URL retornada atualiza `_studio.videoUrl`; `saveEstudio(silent=true)` + `renderEstudio()`

### Remoção de vídeo
1. Clique em "Remover Vídeo" → `showConfirm` (danger)
2. `_studio.videoUrl = ''`; `saveEstudio(silent=true)` + `renderEstudio()`

### Mensagens WhatsApp
1. Clique em "+ Nova Mensagem" → `getCurrentStudio()` preserva estado DOM, push `{ text:'', delay:5 }`, `renderEstudio()` (sem save)
2. Usuário edita texto/delay nos campos; clique "Salvar Tudo" persiste junto com o restante
3. Clique 🗑️ → `removeWhatsappMessage(idx)` → `showConfirm`, splice, `saveEstudio(true)`, `renderEstudio()`

---

## Armadilhas

- `getCurrentStudio(container)` deve ser chamado antes de qualquer mutação de `_studio` para não perder campos editados pelo usuário no DOM mas ainda não salvos.
- O botão `#removeVideoBtn` só é renderizado quando `_studio.videoUrl` existe; checar antes de `.onclick`.
- Fotos usam `photoEditor` com aspect `16/9`; não confundir com hero/sobre que usam `HeroCanvasEditor`.
- Upload múltiplo: as fotos são enviadas em série (loop `for...of`), não em paralelo — preserva a ordem de seleção.